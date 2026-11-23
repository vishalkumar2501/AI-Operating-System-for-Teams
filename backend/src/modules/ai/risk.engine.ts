import { prisma } from '../../lib/prisma';
import { ProjectRisk, TaskStatus } from '@teamos/shared';
import { dependencyService } from '../dependencies/dependency.service';

export class RiskEngine {
  /**
   * Scans a workspace or project for active risks:
   * 1. OVERDUE_CHAIN: Tasks overdue where other tasks are blocked waiting on them.
   * 2. BLOCKED_CRITICAL_PATH: Tasks on critical path that are blocked or impeded.
   * 3. OVERLOADED_ASSIGNEE: Assignees with high workload due soon.
   * 4. STALE_TASK: In-progress tasks untouched for over 7 days.
   */
  async detectRisks(workspaceId: string, projectId?: string): Promise<ProjectRisk[]> {
    const risks: ProjectRisk[] = [];
    const now = new Date();

    const whereTask: any = {
      workspaceId,
      deletedAt: null,
      status: { not: 'DONE' },
    };
    if (projectId) {
      whereTask.projectId = projectId;
    }

    const tasks = await prisma.task.findMany({
      where: whereTask,
      include: {
        project: { select: { id: true, key: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        dependencies: { select: { dependsOnTaskId: true } },
        blocking: {
          select: {
            task: {
              select: {
                id: true,
                number: true,
                title: true,
                status: true,
                project: { select: { key: true } },
              },
            },
          },
        },
      },
    });

    // -------------------------------------------------------------------------
    // 1. OVERDUE_CHAIN Detection
    // -------------------------------------------------------------------------
    for (const t of tasks) {
      if (t.dueDate && new Date(t.dueDate) < now && t.blocking.length > 0) {
        const blockedNames = t.blocking
          .map((b) => `[${b.task.project.key}-${b.task.number}]`)
          .join(', ');

        risks.push({
          id: `risk-overdue-chain-${t.id}`,
          type: 'OVERDUE_CHAIN',
          severity: 'HIGH',
          title: `Overdue task blocking downstream tasks: [${t.project.key}-${t.number}]`,
          description: `Task "${t.title}" is overdue since ${new Date(t.dueDate).toLocaleDateString()} and is actively blocking: ${blockedNames}.`,
          affectedTaskIds: [t.id, ...t.blocking.map((b) => b.task.id)],
          suggestedAction: {
            tool: 'updateTask',
            description: `Extend due date or reassign [${t.project.key}-${t.number}] to unblock downstream work.`,
            payload: {
              taskId: t.id,
              priority: 'URGENT',
            },
          },
        });
      }
    }

    // -------------------------------------------------------------------------
    // 2. BLOCKED_CRITICAL_PATH Detection
    // -------------------------------------------------------------------------
    if (projectId) {
      try {
        const graphData = await dependencyService.getProjectGraph(projectId);
        const criticalTaskIds = new Set(graphData.criticalPath.taskIds);

        for (const t of tasks) {
          if (criticalTaskIds.has(t.id) && t.status === 'BLOCKED') {
            risks.push({
              id: `risk-cpm-${t.id}`,
              type: 'BLOCKED_CRITICAL_PATH',
              severity: 'HIGH',
              title: `Critical Path Blocked: [${t.project.key}-${t.number}]`,
              description: `Task "${t.title}" lies directly on the critical path (${graphData.criticalPath.totalDuration} days duration) but is marked BLOCKED.`,
              affectedTaskIds: [t.id],
              suggestedAction: {
                tool: 'updateTask',
                description: `Resolve prerequisites or expedite blockers for critical task [${t.project.key}-${t.number}].`,
                payload: {
                  taskId: t.id,
                  priority: 'URGENT',
                },
              },
            });
          }
        }
      } catch {
        // Continue if graph not available
      }
    }

    // -------------------------------------------------------------------------
    // 3. OVERLOADED_ASSIGNEE Detection
    // -------------------------------------------------------------------------
    const workloadMap = new Map<
      string,
      { assigneeName: string; taskIds: string[]; count: number }
    >();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const t of tasks) {
      if (t.assigneeId && t.dueDate && new Date(t.dueDate) <= in7Days) {
        const current = workloadMap.get(t.assigneeId) || {
          assigneeName: t.assignee?.name || 'Assignee',
          taskIds: [],
          count: 0,
        };
        current.taskIds.push(t.id);
        current.count += 1;
        workloadMap.set(t.assigneeId, current);
      }
    }

    for (const [assigneeId, data] of workloadMap.entries()) {
      if (data.count >= 4) {
        risks.push({
          id: `risk-overload-${assigneeId}`,
          type: 'OVERLOADED_ASSIGNEE',
          severity: 'MEDIUM',
          title: `Assignee Overloaded: ${data.assigneeName}`,
          description: `${data.assigneeName} has ${data.count} urgent or high-priority tasks due within the next 7 days.`,
          affectedTaskIds: data.taskIds,
          suggestedAction: {
            tool: 'assignTask',
            description: `Rebalance workload by reassigning some of ${data.assigneeName}'s tasks to other team members.`,
            payload: {
              assigneeId,
            },
          },
        });
      }
    }

    // -------------------------------------------------------------------------
    // 4. STALE_TASK Detection
    // -------------------------------------------------------------------------
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    for (const t of tasks) {
      if (
        (t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW') &&
        new Date(t.updatedAt) < sevenDaysAgo
      ) {
        risks.push({
          id: `risk-stale-${t.id}`,
          type: 'STALE_TASK',
          severity: 'LOW',
          title: `Stale in-progress task: [${t.project.key}-${t.number}]`,
          description: `Task "${t.title}" has been in ${t.status} with no updates for over 7 days.`,
          affectedTaskIds: [t.id],
          suggestedAction: {
            tool: 'addComment',
            description: `Ask ${t.assignee?.name || 'assignee'} for a status check on [${t.project.key}-${t.number}].`,
            payload: {
              taskId: t.id,
              body: 'Checking in on the status of this task. Are there any blockers preventing progress?',
            },
          },
        });
      }
    }

    return risks;
  }
}

export const riskEngine = new RiskEngine();
