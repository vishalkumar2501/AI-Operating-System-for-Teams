import crypto from 'crypto';
import { prisma } from '../../../lib/prisma';
import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { commentRepository } from '../../comments/comment.repository';
import { taskRepository } from '../../tasks/task.repository';
import { GitActivityType } from '@teamos/shared';

export class GithubService {
  /**
   * Verify the GitHub HMAC-SHA256 signature
   */
  verifySignature(payload: string | Buffer, signatureHeader?: string): boolean {
    if (!env.GITHUB_WEBHOOK_SECRET) {
      // If no secret configured in dev, allow with warning
      logger.warn('GITHUB_WEBHOOK_SECRET is not configured; skipping signature verification');
      return true;
    }

    if (!signatureHeader) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', env.GITHUB_WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  /**
   * Extract task keys like "WEB-42", "SYNC-1" from a commit or PR text
   */
  extractTaskKeys(text: string): string[] {
    if (!text) return [];
    const regex = /\b([A-Z0-9]+)-(\d+)\b/g;
    const matches = new Set<string>();
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.add(`${m[1]}-${m[2]}`);
    }
    const arr = Array.from(matches);
    logger.info({ text, extractedKeys: arr }, 'extractTaskKeys result');
    return arr;
  }

  /**
   * Find a task in DB given "KEY-42"
   */
  async findTaskByKeyWithNumber(keyWithNumber: string, workspaceId?: string) {
    const parts = keyWithNumber.split('-');
    if (parts.length !== 2) return null;
    const projectKey = parts[0];
    const taskNumber = parseInt(parts[1], 10);
    if (isNaN(taskNumber)) return null;

    const where: any = {
      number: taskNumber,
      project: { key: projectKey },
      deletedAt: null,
    };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const task = await prisma.task.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: true,
      },
    });

    logger.info(
      { keyWithNumber, parts, where, matchedTaskId: task?.id, taskWorkspaceId: task?.workspaceId },
      'findTaskByKeyWithNumber result'
    );
    return task;
  }

  /**
   * Handle incoming GitHub webhook event
   */
  async handleWebhookEvent(event: string, payload: any) {
    logger.info({ event, action: payload.action }, 'Processing GitHub webhook event');

    const repoName = payload.repository?.full_name || 'unknown-repo';

    // Find any workspace associated with this repo or default to first workspace
    const workspace = await prisma.workspace.findFirst({
      where: { deletedAt: null },
    });

    if (!workspace) {
      logger.warn('No active workspace found to associate GitHub activity with');
      return { processed: false, reason: 'NO_WORKSPACE' };
    }

    const workspaceId = workspace.id;

    if (event === 'push') {
      const commits = payload.commits || [];
      for (const commit of commits) {
        const message = commit.message || '';
        const taskKeys = this.extractTaskKeys(message);

        let linkedTaskId: string | null = null;
        let projectId: string | null = null;
        let targetWorkspaceId = workspaceId;

        if (taskKeys.length > 0) {
          const matchedTask = await this.findTaskByKeyWithNumber(taskKeys[0]);
          if (matchedTask) {
            linkedTaskId = matchedTask.id;
            projectId = matchedTask.projectId;
            targetWorkspaceId = matchedTask.workspaceId;
          }
        }

        logger.info(
          { targetWorkspaceId, queryWorkspaceId: workspaceId, repoName, linkedTaskId },
          'Creating GitActivity for commit'
        );

        await prisma.gitActivity.create({
          data: {
            workspaceId: targetWorkspaceId,
            projectId,
            repo: repoName,
            type: 'COMMIT',
            externalId: commit.id?.slice(0, 7) || 'commit',
            title: message.split('\n')[0] || 'Git Commit',
            author: commit.author?.username || commit.author?.name || 'git',
            url: commit.url || payload.repository?.html_url || '',
            linkedTaskId,
            state: 'pushed',
          },
        });
      }

      return { processed: true, count: commits.length };
    }

    if (event === 'pull_request') {
      const pr = payload.pull_request;
      if (!pr) return { processed: false };

      const title = pr.title || '';
      const body = pr.body || '';
      const textToScan = `${title} ${body}`;
      const taskKeys = this.extractTaskKeys(textToScan);

      let linkedTaskId: string | null = null;
      let matchedTask: any = null;
      let targetWorkspaceId = workspaceId;

      if (taskKeys.length > 0) {
        matchedTask = await this.findTaskByKeyWithNumber(taskKeys[0]);
        if (matchedTask) {
          linkedTaskId = matchedTask.id;
          targetWorkspaceId = matchedTask.workspaceId;
        }
      }

      const isMerged = payload.action === 'closed' && pr.merged === true;
      const state = isMerged ? 'merged' : pr.state || 'open';

      const activity = await prisma.gitActivity.create({
        data: {
          workspaceId: targetWorkspaceId,
          projectId: matchedTask?.projectId || null,
          repo: repoName,
          type: 'PR',
          externalId: `#${pr.number}`,
          title: pr.title,
          author: pr.user?.login || 'contributor',
          url: pr.html_url || '',
          linkedTaskId,
          state,
        },
      });

      // Auto-resolution logic: If PR is merged and closes/fixes task, mark task as DONE
      if (isMerged && matchedTask) {
        const closingPattern =
          /(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+([A-Z0-9]+-\d+)/i;
        if (closingPattern.test(textToScan)) {
          logger.info(
            { taskId: matchedTask.id, prNumber: pr.number },
            'Auto-resolving task linked to merged PR'
          );
          await taskRepository.update(matchedTask.id, {
            status: 'DONE',
            completedAt: new Date().toISOString(),
          });

          // Post automated comment on task
          const botAuthor = await prisma.user.findFirst();
          if (botAuthor) {
            await commentRepository.create(matchedTask.id, botAuthor.id, {
              body: `🎉 **Auto-resolved via GitHub**: PR [#${pr.number} - ${pr.title}](${pr.html_url}) merged into main by @${pr.user?.login}.`,
              mentions: [],
            });
          }
        }
      }

      return { processed: true, activityId: activity.id };
    }

    return { processed: true, event };
  }

  async getActivities(workspaceId: string, options?: { projectId?: string; limit?: number }) {
    const where: any = { workspaceId };
    if (options?.projectId) {
      where.projectId = options.projectId;
    }
    logger.info({ workspaceId, where, options }, 'getActivities called');

    return prisma.gitActivity.findMany({
      where,
      include: {
        linkedTask: {
          select: {
            id: true,
            number: true,
            title: true,
            project: { select: { key: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }
}

export const githubService = new GithubService();
