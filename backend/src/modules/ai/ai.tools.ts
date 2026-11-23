import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { searchService } from '../search/search.service';
import { calendarService } from '../calendar/calendar.service';
import { riskEngine } from './risk.engine';
import { taskRepository } from '../tasks/task.repository';
import { commentRepository } from '../comments/comment.repository';
import { meetingRepository } from '../meetings/meeting.repository';
import { createAuditLog } from '../audit/audit.service';
import { AgentActionStatus, TaskStatus, TaskPriority } from '@teamos/shared';

export interface ToolContext {
  workspaceId: string;
  userId: string;
  projectId?: string;
}

export class AiTools {
  /**
   * Execute read-only tools automatically without human intervention
   */
  async executeReadTool(tool: string, input: any, ctx: ToolContext): Promise<any> {
    logger.info({ tool, input, workspaceId: ctx.workspaceId }, 'Executing AI Read Tool');

    switch (tool) {
      case 'searchWorkspace':
        return searchService.hybridSearch({
          workspaceId: ctx.workspaceId,
          query: input.query || input.q || '',
          entityTypes: input.entityTypes,
          limit: input.limit || 10,
        });

      case 'getMyAgenda':
        return calendarService.getUnifiedCalendar(ctx.workspaceId, {
          userIds: [ctx.userId],
          from: new Date().toISOString(),
          to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      case 'getProjectStatus': {
        let projectId = input.projectId || ctx.projectId;
        if (!projectId) {
          const firstProj = await prisma.project.findFirst({
            where: { workspaceId: ctx.workspaceId, deletedAt: null },
          });
          projectId = firstProj?.id;
        }
        if (!projectId) {
          return {
            totalTasks: 0,
            completedTasks: 0,
            blockedTasks: 0,
            inProgressTasks: 0,
            completionPercentage: 0,
          };
        }

        const tasks = await prisma.task.findMany({
          where: { projectId, deletedAt: null },
          select: { id: true, status: true, priority: true },
        });

        const total = tasks.length;
        const done = tasks.filter((t) => t.status === 'DONE').length;
        const blocked = tasks.filter((t) => t.status === 'BLOCKED').length;
        const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;

        return {
          totalTasks: total,
          completedTasks: done,
          blockedTasks: blocked,
          inProgressTasks: inProgress,
          completionPercentage: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      }

      case 'summarizeMeeting': {
        const meetingId = input.meetingId;
        const meeting = await meetingRepository.findById(meetingId);
        if (!meeting) throw new Error('Meeting not found');
        return {
          title: meeting.title,
          summary: meeting.transcript?.summary || 'No summary available',
          actionItems: meeting.transcript?.actionItems || [],
        };
      }

      case 'detectRisks':
        return riskEngine.detectRisks(ctx.workspaceId, input.projectId || ctx.projectId);

      default:
        throw new Error(`Unknown read tool: ${tool}`);
    }
  }

  /**
   * Propose a write action requiring explicit human confirmation
   */
  async proposeWriteTool(agentRunId: string, tool: string, input: any, ctx: ToolContext) {
    logger.info({ tool, input, agentRunId }, 'Proposing AI Write Tool for human approval');

    let before: any = null;
    let after: any = { ...input };

    // Inspect existing state for diff display
    if ((tool === 'updateTask' || tool === 'assignTask') && input.taskId) {
      const taskId = input.taskId;
      const current = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          assigneeId: true,
          dueDate: true,
        },
      });
      before = current;
    }

    const action = await prisma.agentAction.create({
      data: {
        agentRunId,
        tool,
        input,
        status: 'PROPOSED',
      },
    });

    return {
      id: action.id,
      tool: action.tool,
      input: (action.input as Record<string, unknown>) || {},
      status: action.status,
      before,
      after,
      createdAt: action.createdAt.toISOString(),
    };
  }

  /**
   * Execute an approved action after user clicks Approve
   */
  async executeApprovedAction(actionId: string, approvedBy: string) {
    const action = await prisma.agentAction.findUnique({
      where: { id: actionId },
      include: { agentRun: true },
    });

    if (!action) throw new Error('Action not found');
    if (action.status !== 'PROPOSED') {
      throw new Error(`Action is already ${action.status}`);
    }

    const input = action.input as any;
    const workspaceId = action.agentRun.workspaceId;
    let result: any = null;

    try {
      switch (action.tool) {
        case 'createTask': {
          result = await taskRepository.create(input.projectId, workspaceId, approvedBy, {
            title: input.title,
            description: input.description,
            priority: (input.priority as TaskPriority) || 'MEDIUM',
            status: (input.status as TaskStatus) || 'TODO',
            assigneeId: input.assigneeId,
            dueDate: input.dueDate,
            position: 0,
          });
          break;
        }

        case 'updateTask': {
          result = await taskRepository.update(input.taskId, {
            ...(input.title && { title: input.title }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.status && { status: input.status }),
            ...(input.priority && { priority: input.priority }),
            ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
            ...(input.dueDate && { dueDate: input.dueDate }),
          });
          break;
        }

        case 'assignTask': {
          result = await taskRepository.update(input.taskId, {
            assigneeId: input.assigneeId,
          });
          break;
        }

        case 'addComment': {
          result = await commentRepository.create(input.taskId, approvedBy, {
            body: input.body,
            mentions: [],
          });
          break;
        }

        case 'scheduleMeeting': {
          result = await meetingRepository.create({
            workspaceId,
            organizerId: approvedBy,
            title: input.title,
            description: input.description,
            startsAt: new Date(input.startsAt),
            endsAt: new Date(input.endsAt),
            projectId: input.projectId,
            meetingUrl: input.meetingUrl,
            participantIds: input.participantIds || [],
          });
          break;
        }

        default:
          throw new Error(`Unknown write tool: ${action.tool}`);
      }

      // Mark action as EXECUTED
      const updated = await prisma.agentAction.update({
        where: { id: actionId },
        data: {
          status: 'EXECUTED',
          approvedBy,
          executedAt: new Date(),
          result: result as any,
        },
      });

      // Audit log entry with actorType AI_AGENT
      await createAuditLog({
        workspaceId,
        actorType: 'AI_AGENT',
        actorId: approvedBy,
        action: `AI_TOOL_${action.tool.toUpperCase()}`,
        entityType: 'AGENT_ACTION',
        entityId: actionId,
        after: result,
      });

      return updated;
    } catch (err: any) {
      await prisma.agentAction.update({
        where: { id: actionId },
        data: {
          status: 'FAILED',
          result: { error: err.message },
        },
      });
      throw err;
    }
  }

  /**
   * Reject proposed action
   */
  async rejectAction(actionId: string, rejectedBy: string) {
    return prisma.agentAction.update({
      where: { id: actionId },
      data: {
        status: 'REJECTED',
        approvedBy: rejectedBy,
      },
    });
  }
}

export const aiTools = new AiTools();
