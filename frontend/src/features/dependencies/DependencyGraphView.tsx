import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
  Node,
  Edge,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Flame, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import { TaskNode } from './TaskNode';
import { useProjectGraph, useAddDependency } from './dependencies.queries';
import type { GraphNode, GraphEdge } from '@teamos/shared';

const nodeTypes: NodeTypes = {
  taskNode: TaskNode as any,
};

interface DependencyGraphViewProps {
  projectId: string;
  onSelectTask?: (taskId: string) => void;
}

/**
 * Computes topological layered layout for DAG nodes.
 * Assigns depth layers based on prerequisite dependencies (longest predecessor chain)
 * so that prerequisites sit to the left of their dependents.
 */
function layoutGraph(
  rawNodes: GraphNode[],
  rawEdges: GraphEdge[],
  onSelectTask?: (id: string) => void
) {
  // Map prerequisites for each node
  const inDegree = new Map<string, number>();
  const predecessors = new Map<string, string[]>();

  for (const n of rawNodes) {
    inDegree.set(n.id, 0);
    predecessors.set(n.id, []);
  }

  for (const e of rawEdges) {
    predecessors.get(e.target)?.push(e.source);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  // Calculate layer/depth for each node
  const layers = new Map<string, number>();
  const visited = new Set<string>();

  function getDepth(nodeId: string): number {
    if (layers.has(nodeId)) return layers.get(nodeId)!;
    if (visited.has(nodeId)) return 0; // prevent cycle recursion during layout
    visited.add(nodeId);

    const preds = predecessors.get(nodeId) ?? [];
    if (preds.length === 0) {
      layers.set(nodeId, 0);
      return 0;
    }

    let maxPredDepth = 0;
    for (const p of preds) {
      maxPredDepth = Math.max(maxPredDepth, getDepth(p) + 1);
    }
    layers.set(nodeId, maxPredDepth);
    return maxPredDepth;
  }

  for (const n of rawNodes) {
    getDepth(n.id);
  }

  // Group nodes by layer
  const layerGroups = new Map<number, GraphNode[]>();
  for (const n of rawNodes) {
    const layer = layers.get(n.id) ?? 0;
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(n);
  }

  // Layout positions
  const NODE_WIDTH = 270;
  const NODE_HEIGHT = 120;
  const HORIZONTAL_GAP = 90;
  const VERTICAL_GAP = 35;

  const nodes: Node[] = [];
  for (const [layer, group] of layerGroups.entries()) {
    group.forEach((gn, indexInLayer) => {
      nodes.push({
        id: gn.id,
        type: 'taskNode',
        position: {
          x: layer * (NODE_WIDTH + HORIZONTAL_GAP) + 60,
          y: indexInLayer * (NODE_HEIGHT + VERTICAL_GAP) + 60,
        },
        data: {
          ...gn,
          onSelectTask,
        },
      });
    });
  }

  const edges: Edge[] = rawEdges.map((e) => {
    const isCritical = e.isCriticalPath;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: isCritical,
      style: {
        stroke: isCritical ? '#f59e0b' : '#6366f1',
        strokeWidth: isCritical ? 2.5 : 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isCritical ? '#f59e0b' : '#6366f1',
        width: 14,
        height: 14,
      },
    };
  });

  return { nodes, edges };
}

export function DependencyGraphView({ projectId, onSelectTask }: DependencyGraphViewProps) {
  const { data: graphData, isLoading, error, refetch } = useProjectGraph(projectId);
  const addDependency = useAddDependency(projectId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Update layout when graph data changes
  useEffect(() => {
    if (graphData) {
      const layout = layoutGraph(graphData.nodes, graphData.edges, onSelectTask);
      setNodes(layout.nodes);
      setEdges(layout.edges);
    }
  }, [graphData, onSelectTask, setNodes, setEdges]);

  // Handle new dependency connection drag & drop
  const onConnect = useCallback(
    async (connection: Connection) => {
      setErrorMessage(null);
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        setErrorMessage('A task cannot depend on itself.');
        return;
      }

      try {
        await addDependency.mutateAsync({
          taskId: connection.target, // target is blocked by source
          data: { dependsOnTaskId: connection.source, type: 'BLOCKS' },
        });
      } catch (err: any) {
        const errorDetail =
          err.response?.data?.error?.message ||
          'Failed to add dependency. Adding this connection would create a circular loop.';
        setErrorMessage(errorDetail);
      }
    },
    [addDependency]
  );

  const criticalPathCount = graphData?.criticalPath?.taskIds?.length ?? 0;
  const criticalPathDuration = graphData?.criticalPath?.totalDuration ?? 0;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
          Computing dependency graph & critical path...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md rounded-xl border border-rose-900/50 bg-rose-950/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
          <h3 className="text-base font-semibold text-rose-300">Failed to load graph</h3>
          <p className="mt-1 text-xs text-rose-400/80">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 select-none">
      {/* Top Banner: Critical Path & Graph Statistics */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-3">
        {criticalPathCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-slate-900/90 px-3.5 py-2 text-xs backdrop-blur-md shadow-lg shadow-black/40">
            <Flame className="h-4 w-4 text-amber-400 animate-pulse" />
            <div>
              <span className="font-semibold text-amber-300">Critical Path: </span>
              <span className="text-slate-200">
                {criticalPathDuration}h total duration ({criticalPathCount} bottleneck{' '}
                {criticalPathCount === 1 ? 'task' : 'tasks'})
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-300 backdrop-blur-md shadow-lg shadow-black/40">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[11px] text-amber-300 font-medium">Critical Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-[11px] text-rose-300 font-medium">Blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <span className="text-[11px] text-indigo-300 font-medium">Dependency Edge</span>
          </div>
        </div>
      </div>

      {/* Error alert toast */}
      {errorMessage && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 max-w-md rounded-xl border border-rose-500/50 bg-rose-950/90 px-4 py-3 text-xs text-rose-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="rounded p-1 text-rose-400 hover:bg-rose-900/50 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur-sm">
        <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
        <span>Drag from right handle of blocker to left handle of dependent task to link.</span>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls className="!border-slate-800 !bg-slate-900 !shadow-lg [&>button]:!border-slate-800 [&>button]:!bg-slate-900 [&>button]:!text-slate-300 hover:[&>button]:!bg-slate-800" />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as any;
            if (data?.isCriticalPath) return '#f59e0b';
            if (data?.isBlocked || data?.status === 'BLOCKED') return '#e11d48';
            if (data?.status === 'DONE') return '#10b981';
            return '#6366f1';
          }}
          className="!border-slate-800 !bg-slate-950/90 !rounded-xl !shadow-lg"
          maskColor="rgba(2, 6, 23, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
