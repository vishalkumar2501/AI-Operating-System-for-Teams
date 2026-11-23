import { prisma } from '../../lib/prisma';
import { aiTools, ToolContext } from './ai.tools';
import { riskEngine } from './risk.engine';
import { ProposedAction, AgentRunItem } from '@teamos/shared';
import { logger } from '../../lib/logger';

export interface ChatResponse {
  runId: string;
  response: string;
  proposedActions: ProposedAction[];
  latencyMs: number;
}

export class AiService {
  /**
   * Main conversational agent endpoint
   */
  async handleChat(
    workspaceId: string,
    userId: string,
    prompt: string,
    context?: { projectId?: string; taskId?: string; meetingId?: string }
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    logger.info({ workspaceId, userId, prompt }, 'AI Assistant receiving query');

    // 1. Create AgentRun record
    const agentRun = await prisma.agentRun.create({
      data: {
        workspaceId,
        userId,
        prompt,
        status: 'RUNNING',
      },
    });

    const toolCtx: ToolContext = {
      workspaceId,
      userId,
      projectId: context?.projectId,
    };

    const proposedActions: ProposedAction[] = [];
    let responseText = '';
    const cleanPrompt = prompt.toLowerCase();

    // 2. Intelligent tool routing & intent determination
    if (
      cleanPrompt.includes('risk') ||
      cleanPrompt.includes('bottleneck') ||
      cleanPrompt.includes('blocked')
    ) {
      // Intent: Detect Risks
      const risks = await aiTools.executeReadTool(
        'detectRisks',
        { projectId: context?.projectId },
        toolCtx
      );

      if (risks.length === 0) {
        responseText =
          'I analyzed your workspace and project dependencies. Great news: **no active risks or bottlenecks were detected**!';
      } else {
        responseText =
          `I detected **${risks.length} project risk(s)**:\n\n` +
          risks
            .map(
              (r: any, idx: number) =>
                `**${idx + 1}. [${r.severity}] ${r.title}**\n   ${r.description}`
            )
            .join('\n\n') +
          '\n\nI have generated recommended action proposals below for your approval.';

        // For each high/medium risk, propose a write tool!
        for (const r of risks) {
          if (r.suggestedAction) {
            const action = await aiTools.proposeWriteTool(
              agentRun.id,
              r.suggestedAction.tool,
              r.suggestedAction.payload,
              toolCtx
            );
            proposedActions.push(action);
          }
        }
      }
    } else if (
      cleanPrompt.includes('create task') ||
      cleanPrompt.includes('add task') ||
      cleanPrompt.includes('new task')
    ) {
      // Intent: Create Task
      let defaultProjectId = context?.projectId;
      if (!defaultProjectId) {
        const firstProj = await prisma.project.findFirst({
          where: { workspaceId, deletedAt: null },
        });
        defaultProjectId = firstProj?.id;
      }

      if (defaultProjectId) {
        // Extract title from prompt
        const match = prompt.match(
          /(?:create|add|new)\s+task\s*(?::|named|called)?\s*["']?([^"'\n]+)["']?/i
        );
        const taskTitle = match
          ? match[1].trim()
          : prompt.replace(/(?:create|add|new)\s+task/i, '').trim() || 'New AI Proposed Task';

        const action = await aiTools.proposeWriteTool(
          agentRun.id,
          'createTask',
          {
            projectId: defaultProjectId,
            title: taskTitle,
            description: `Created via TeamOS AI assistant on ${new Date().toLocaleDateString()}`,
            priority: cleanPrompt.includes('urgent')
              ? 'URGENT'
              : cleanPrompt.includes('high')
                ? 'HIGH'
                : 'MEDIUM',
            status: 'TODO',
          },
          toolCtx
        );
        proposedActions.push(action);

        responseText = `I have drafted an action to create task **"${taskTitle}"**. Please review the details on the approval card below to execute.`;
      } else {
        responseText =
          'Please select or create a project first so I know where to place the new task.';
      }
    } else if (
      cleanPrompt.includes('agenda') ||
      cleanPrompt.includes('schedule') ||
      cleanPrompt.includes('upcoming')
    ) {
      // Intent: Get Agenda
      const agenda = await aiTools.executeReadTool('getMyAgenda', {}, toolCtx);
      responseText =
        `Here is your upcoming schedule:\n\n` +
        agenda
          .slice(0, 5)
          .map(
            (item: any) =>
              `- **[${item.type}]** ${item.title} (${new Date(item.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
          )
          .join('\n');
    } else if (cleanPrompt.includes('status') || cleanPrompt.includes('progress')) {
      // Intent: Project Status
      const status = await aiTools.executeReadTool(
        'getProjectStatus',
        { projectId: context?.projectId },
        toolCtx
      );
      responseText = `**Project Progress Overview:**\n- Completion: **${status.completionPercentage}%**\n- Completed Tasks: ${status.completedTasks} / ${status.totalTasks}\n- In Progress: ${status.inProgressTasks}\n- Blocked: ${status.blockedTasks}`;
    } else {
      // Intent: General search / assistance
      const searchRes = await aiTools.executeReadTool(
        'searchWorkspace',
        { query: prompt, limit: 3 },
        toolCtx
      );
      if (searchRes.length > 0) {
        responseText =
          `Based on related items in your workspace:\n\n` +
          searchRes.map((r: any) => `- **[${r.entityType}] ${r.title}**: ${r.snippet}`).join('\n') +
          `\n\nHow would you like me to help further?`;
      } else {
        responseText = `I understand you're asking about "${prompt}". I am monitoring all project dependencies, task blockers, meetings, and team agendas. What action would you like to take?`;
      }
    }

    const latencyMs = Date.now() - startTime;

    // 3. Update AgentRun record
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'COMPLETED',
        latencyMs,
        tokensUsed: 150,
      },
    });

    return {
      runId: agentRun.id,
      response: responseText,
      proposedActions,
      latencyMs,
    };
  }

  async getRisks(workspaceId: string, projectId?: string) {
    return riskEngine.detectRisks(workspaceId, projectId);
  }

  async approveAction(actionId: string, userId: string) {
    return aiTools.executeApprovedAction(actionId, userId);
  }

  async rejectAction(actionId: string, userId: string) {
    return aiTools.rejectAction(actionId, userId);
  }
}

export const aiService = new AiService();
