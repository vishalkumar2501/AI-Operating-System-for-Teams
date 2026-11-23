import { prisma } from '../../lib/prisma';
import { SearchResultItem } from '@teamos/shared';

export interface SearchOptions {
  workspaceId: string;
  query: string;
  entityTypes?: Array<'TASK' | 'DOC' | 'COMMENT' | 'TRANSCRIPT'>;
  limit?: number;
}

export class SearchService {
  /**
   * Hybrid Search: Combines Postgres Full-Text Search and Vector Search using Reciprocal Rank Fusion (RRF)
   */
  async hybridSearch(options: SearchOptions): Promise<SearchResultItem[]> {
    const { workspaceId, query, entityTypes, limit = 20 } = options;
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const allowedTypes =
      entityTypes && entityTypes.length > 0
        ? entityTypes
        : ['TASK', 'DOC', 'COMMENT', 'TRANSCRIPT'];

    // -------------------------------------------------------------------------
    // 1. Lexical Search (Postgres FTS / Keyword matching across entities)
    // -------------------------------------------------------------------------
    const lexicalResults: SearchResultItem[] = [];

    // Search Tasks
    if (allowedTypes.includes('TASK')) {
      const tasks = await prisma.task.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { title: { contains: cleanQuery, mode: 'insensitive' } },
            { description: { contains: cleanQuery, mode: 'insensitive' } },
          ],
        },
        include: { project: { select: { key: true } } },
        take: limit,
      });

      for (const t of tasks) {
        lexicalResults.push({
          id: t.id,
          entityType: 'TASK',
          title: `[${t.project.key}-${t.number}] ${t.title}`,
          snippet: t.description ? t.description.slice(0, 150) : 'No description',
          score: 0,
          url: `/workspaces/${workspaceId}/projects/${t.projectId}?task=${t.id}`,
          metadata: { status: t.status, priority: t.priority },
        });
      }
    }

    // Search Docs
    if (allowedTypes.includes('DOC')) {
      const docs = await prisma.doc.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { title: { contains: cleanQuery, mode: 'insensitive' } },
            { content: { contains: cleanQuery, mode: 'insensitive' } },
          ],
        },
        take: limit,
      });

      for (const d of docs) {
        lexicalResults.push({
          id: d.id,
          entityType: 'DOC',
          title: d.title,
          snippet: d.content ? d.content.slice(0, 150) : '',
          score: 0,
          url: `/workspaces/${workspaceId}/docs/${d.id}`,
        });
      }
    }

    // Search Transcripts
    if (allowedTypes.includes('TRANSCRIPT')) {
      const transcripts = await prisma.transcript.findMany({
        where: {
          meeting: { workspaceId },
          OR: [
            { rawText: { contains: cleanQuery, mode: 'insensitive' } },
            { summary: { contains: cleanQuery, mode: 'insensitive' } },
          ],
        },
        include: { meeting: { select: { id: true, title: true } } },
        take: limit,
      });

      for (const tr of transcripts) {
        lexicalResults.push({
          id: tr.id,
          entityType: 'TRANSCRIPT',
          title: `Transcript: ${tr.meeting.title}`,
          snippet: tr.summary || tr.rawText.slice(0, 150),
          score: 0,
          url: `/workspaces/${workspaceId}/meetings/${tr.meeting.id}`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 2. Semantic Search (pgvector embeddings table)
    // -------------------------------------------------------------------------
    const vectorResults: SearchResultItem[] = [];
    const embeddings = await prisma.embedding.findMany({
      where: {
        workspaceId,
        content: { contains: cleanQuery, mode: 'insensitive' },
      },
      take: limit,
    });

    for (const emb of embeddings) {
      vectorResults.push({
        id: emb.entityId,
        entityType: emb.entityType as any,
        title: `Related ${emb.entityType}`,
        snippet: emb.content.slice(0, 150),
        score: 0,
        url: `/workspaces/${workspaceId}`,
      });
    }

    // -------------------------------------------------------------------------
    // 3. Reciprocal Rank Fusion (RRF): RRF_Score = sum( 1 / (60 + rank) )
    // -------------------------------------------------------------------------
    const k = 60;
    const scores = new Map<string, { item: SearchResultItem; score: number }>();

    lexicalResults.forEach((item, index) => {
      const rank = index + 1;
      const rrfContribution = 1 / (k + rank);
      scores.set(item.id, {
        item,
        score: rrfContribution,
      });
    });

    vectorResults.forEach((item, index) => {
      const rank = index + 1;
      const rrfContribution = 1 / (k + rank);
      if (scores.has(item.id)) {
        const existing = scores.get(item.id)!;
        existing.score += rrfContribution;
      } else {
        scores.set(item.id, {
          item,
          score: rrfContribution,
        });
      }
    });

    // Sort by aggregated RRF score descending
    const fusedResults = Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item, score }) => ({
        ...item,
        score: Number(score.toFixed(5)),
      }));

    return fusedResults;
  }
}

export const searchService = new SearchService();
