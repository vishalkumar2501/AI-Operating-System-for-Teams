import { dependencyRepository } from './dependency.repository';
import { taskRepository } from '../tasks/task.repository';
import { notificationService } from '../notifications/notification.service';
import { createAuditLog } from '../audit/audit.service';
import { createHttpError } from '../../middleware/errorHandler';
import { prisma } from '../../lib/prisma';
import type { AddDependencyInput } from './dependency.schema';
import type { ProjectGraphData, GraphNode, GraphEdge, TaskStatus } from '@teamos/shared';

export const dependencyService = {
  /**
   * CYCLE DETECTION ALGORITHM (Depth-First Search):
   *
   * In project scheduling, dependencies form a Directed Acyclic Graph (DAG) where
   * a directed edge A -> B means task A (prerequisite) must complete before
   * task B (dependent) can proceed.
   *
   * When adding a dependency where `dependsOnTaskId` (A) blocks `taskId` (B):
   * If B can already reach A via existing dependency chains (B -> ... -> A),
   * adding A -> B would close a circular loop (A -> B -> ... -> A).
   *
   * We run a DFS starting from B following outgoing edges (tasks that depend on B).
   * If A is reachable, a cycle is detected and we reject with a 400 Bad Request error.
   */
  async detectCycle(taskId: string, dependsOnTaskId: string): Promise<boolean> {
    if (taskId === dependsOnTaskId) {
      return true; // Self-dependency is an immediate cycle
    }

    const visited = new Set<string>();
    const stack = [taskId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === dependsOnTaskId) {
        return true; // Cycle detected: A is reachable from B
      }

      if (!visited.has(current)) {
        visited.add(current);

        // Find all tasks that depend on `current`
        const dependents = await prisma.taskDependency.findMany({
          where: { dependsOnTaskId: current },
          select: { taskId: true },
        });

        for (const dep of dependents) {
          if (!visited.has(dep.taskId)) {
            stack.push(dep.taskId);
          }
        }
      }
    }

    return false;
  },

  /**
   * CRITICAL PATH METHOD (CPM) ALGORITHM:
   *
   * The critical path is the longest sequence of dependent tasks through the project DAG,
   * weighted by task duration (estimate in hours).
   *
   * Algorithm:
   * 1. Query all non-deleted tasks and dependencies for the project.
   * 2. Compute in-degrees and perform Kahn's Topological Sort.
   * 3. Apply Dynamic Programming over the topological order:
   *    dist[v] = duration(v) + max(dist[u] for u in predecessors(v))
   * 4. Identify the exit task with the maximum cumulative duration.
   * 5. Backtrack from the terminal node to reconstruct the exact critical path.
   */
  async calculateCriticalPath(projectId: string): Promise<{ taskIds: string[]; totalDuration: number }> {
    const tasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true, estimate: true },
    });

    if (tasks.length === 0) {
      return { taskIds: [], totalDuration: 0 };
    }

    const dependencies = await prisma.taskDependency.findMany({
      where: {
        task: { projectId, deletedAt: null },
        dependsOnTask: { projectId, deletedAt: null },
      },
      select: { taskId: true, dependsOnTaskId: true },
    });

    const taskMap = new Map(tasks.map((t) => [t.id, t.estimate ?? 1])); // Default 1 hour if unestimated
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>(); // dependsOnTaskId -> taskIds
    const reverseAdj = new Map<string, string[]>(); // taskId -> dependsOnTaskIds

    for (const t of tasks) {
      inDegree.set(t.id, 0);
      adj.set(t.id, []);
      reverseAdj.set(t.id, []);
    }

    for (const d of dependencies) {
      adj.get(d.dependsOnTaskId)?.push(d.taskId);
      reverseAdj.get(d.taskId)?.push(d.dependsOnTaskId);
      inDegree.set(d.taskId, (inDegree.get(d.taskId) ?? 0) + 1);
    }

    // Topological Sort (Kahn's Algorithm)
    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const topoOrder: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      topoOrder.push(u);

      for (const v of adj.get(u) ?? []) {
        const newDeg = (inDegree.get(v) ?? 1) - 1;
        inDegree.set(v, newDeg);
        if (newDeg === 0) {
          queue.push(v);
        }
      }
    }

    // Longest Path Dynamic Programming
    const dist = new Map<string, number>();
    const parent = new Map<string, string | null>();

    for (const t of tasks) {
      dist.set(t.id, taskMap.get(t.id) ?? 1);
      parent.set(t.id, null);
    }

    for (const u of topoOrder) {
      const uDist = dist.get(u) ?? 1;
      for (const v of adj.get(u) ?? []) {
        const vWeight = taskMap.get(v) ?? 1;
        if (uDist + vWeight > (dist.get(v) ?? 0)) {
          dist.set(v, uDist + vWeight);
          parent.set(v, u);
        }
      }
    }

    // Find node with max distance
    let maxDist = 0;
    let endNode: string | null = null;
    for (const [id, d] of dist.entries()) {
      if (d > maxDist) {
        maxDist = d;
        endNode = id;
      }
    }

    // Backtrack to reconstruct critical path
    const path: string[] = [];
    let curr = endNode;
    while (curr) {
      path.unshift(curr);
      curr = parent.get(curr) ?? null;
    }

    return {
      taskIds: path,
      totalDuration: maxDist,
    };
  },

  async addDependency(taskId: string, userId: string, data: AddDependencyInput) {
    const { dependsOnTaskId } = data;

    if (taskId === dependsOnTaskId) {
      throw createHttpError(400, 'INVALID_DEPENDENCY', 'A task cannot depend on itself');
    }

    const [task, blockerTask] = await Promise.all([
      taskRepository.findById(taskId),
      taskRepository.findById(dependsOnTaskId),
    ]);

    if (!task || !blockerTask) {
      throw createHttpError(404, 'NOT_FOUND', 'One or both tasks not found');
    }

    if (task.projectId !== blockerTask.projectId) {
      throw createHttpError(400, 'CROSS_PROJECT_DEPENDENCY', 'Task dependencies must belong to the same project');
    }

    // Check if dependency already exists
    const existing = await dependencyRepository.findExisting(taskId, dependsOnTaskId);
    if (existing) {
      throw createHttpError(409, 'DUPLICATE_ENTRY', 'This dependency already exists');
    }

    // Cycle detection check
    const hasCycle = await this.detectCycle(taskId, dependsOnTaskId);
    if (hasCycle) {
      throw createHttpError(
        400,
        'CYCLE_DETECTED',
        'Circular dependency detected! Adding this dependency would create a cycle in the task graph.',
      );
    }

    const dependency = await dependencyRepository.create(taskId, dependsOnTaskId);

    // AUTO-BLOCK LOGIC:
    // If the prerequisite task is not yet completed (DONE), auto-transition task to BLOCKED status
    if (blockerTask.status !== 'DONE' && task.status !== 'DONE' && task.status !== 'BLOCKED') {
      await taskRepository.update(taskId, { status: 'BLOCKED' });

      // Notify task subscribers of the blocked state
      const subscriberIds = task.subscribers.map((s) => s.userId).filter((id) => id !== userId);
      if (subscriberIds.length > 0) {
        await notificationService.notifyMultiple(subscriberIds, 'TASK_BLOCKED', {
          taskId: task.id,
          taskKey: `${task.project.key}-${task.number}`,
          taskTitle: task.title,
          blockedByTaskKey: `${blockerTask.project.key}-${blockerTask.number}`,
          blockedByTitle: blockerTask.title,
        });
      }
    }

    await createAuditLog({
      workspaceId: task.project.workspaceId,
      actorType: 'USER',
      actorId: userId,
      action: 'TASK_DEPENDENCY_ADDED',
      entityType: 'TASK',
      entityId: taskId,
      after: {
        blockedTaskId: taskId,
        dependsOnTaskId,
        blockerKey: `${blockerTask.project.key}-${blockerTask.number}`,
      },
    });

    return dependency;
  },

  async removeDependency(dependencyId: string, userId: string) {
    const dependency = await dependencyRepository.findById(dependencyId);
    if (!dependency) {
      throw createHttpError(404, 'NOT_FOUND', 'Dependency not found');
    }

    await dependencyRepository.delete(dependencyId);

    // AUTO-UNBLOCK CHECK:
    // If task was BLOCKED, check if any remaining incomplete blockers exist
    const remainingBlockers = await dependencyRepository.getIncompleteBlockers(dependency.taskId);
    if (remainingBlockers.length === 0 && dependency.task.status === 'BLOCKED') {
      await taskRepository.update(dependency.taskId, { status: 'TODO' });

      const task = await taskRepository.findById(dependency.taskId);
      if (task) {
        const subscriberIds = task.subscribers.map((s) => s.userId).filter((id) => id !== userId);
        if (subscriberIds.length > 0) {
          await notificationService.notifyMultiple(subscriberIds, 'TASK_UNBLOCKED', {
            taskId: task.id,
            taskKey: `${task.project.key}-${task.number}`,
            taskTitle: task.title,
            summary: 'all blocking dependencies resolved',
          });
        }
      }
    }

    await createAuditLog({
      workspaceId: dependency.task.workspaceId,
      actorType: 'USER',
      actorId: userId,
      action: 'TASK_DEPENDENCY_REMOVED',
      entityType: 'TASK',
      entityId: dependency.taskId,
      before: {
        dependencyId,
        dependsOnTaskId: dependency.dependsOnTaskId,
      },
    });

    return { success: true };
  },

  /**
   * AUTO-UNBLOCK DEPENDENTS:
   * Called when task blockerId transitions to 'DONE'.
   * Finds all tasks that depended on this blocker. For each dependent task,
   * checks if all other blockers are also DONE. If so, automatically sets status to TODO.
   */
  async autoUnblockDependents(completedTaskId: string, actorUserId: string): Promise<void> {
    const dependents = await dependencyRepository.getDependents(completedTaskId);

    for (const dep of dependents) {
      const remainingBlockers = await dependencyRepository.getIncompleteBlockers(dep.taskId);
      if (remainingBlockers.length === 0 && dep.task.status === 'BLOCKED') {
        await taskRepository.update(dep.taskId, { status: 'TODO' });

        const subscriberIds = dep.task.subscribers.map((s) => s.userId).filter((id) => id !== actorUserId);
        if (subscriberIds.length > 0) {
          await notificationService.notifyMultiple(subscriberIds, 'TASK_UNBLOCKED', {
            taskId: dep.task.id,
            taskKey: `${dep.task.number}`,
            taskTitle: dep.task.title,
            summary: `unblocked because prerequisite task completed`,
          });
        }
      }
    }
  },

  /**
   * Complete graph data generation for React Flow frontend.
   */
  async getProjectGraph(projectId: string): Promise<ProjectGraphData> {
    const [tasks, dependencies, criticalPath] = await Promise.all([
      prisma.task.findMany({
        where: { projectId, deletedAt: null },
        include: {
          project: { select: { key: true } },
          assignee: { select: { name: true, avatarUrl: true } },
          dependencies: {
            where: { dependsOnTask: { deletedAt: null, status: { not: 'DONE' } } },
          },
        },
      }),
      dependencyRepository.findByProjectId(projectId),
      this.calculateCriticalPath(projectId),
    ]);

    const criticalPathSet = new Set(criticalPath.taskIds);

    const nodes: GraphNode[] = tasks.map((t) => ({
      id: t.id,
      key: `${t.project.key}-${t.number}`,
      number: t.number,
      title: t.title,
      status: t.status as TaskStatus,
      priority: t.priority,
      estimate: t.estimate,
      isBlocked: t.status === 'BLOCKED' || t.dependencies.length > 0,
      isCriticalPath: criticalPathSet.has(t.id),
      assignee: t.assignee ? { name: t.assignee.name, avatarUrl: t.assignee.avatarUrl } : null,
    }));

    const edges: GraphEdge[] = dependencies.map((d) => {
      const isCritical = criticalPathSet.has(d.dependsOnTaskId) && criticalPathSet.has(d.taskId);
      return {
        id: d.id,
        source: d.dependsOnTaskId, // Blocker
        target: d.taskId,          // Blocked task
        type: 'smoothstep',
        isCriticalPath: isCritical,
      };
    });

    return {
      nodes,
      edges,
      criticalPath,
    };
  },
};
