import { qdrant } from './qdrant.js';
import { generateEmbedding } from './embeddings.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function retrieveRelevantChunks({ userId, chatId, query, topK, documentIds }) {
  const limit = topK || env.RAG_TOP_K;

  try {
    const queryVector = await generateEmbedding(query);

    const mustConditions = [
      { key: 'userId', match: { value: userId } },
      { key: 'chatId', match: { value: chatId } },
    ];

    if (documentIds && documentIds.length > 0) {
      mustConditions.push({
        key: 'documentId',
        match: { any: documentIds },
      });
    }

    const searchResult = await qdrant.query(env.QDRANT_COLLECTION, {
      vector: queryVector,
      limit,
      score_threshold: env.RAG_MIN_SCORE,
      filter: {
        must: mustConditions,
      },
    });

    return searchResult.map((res, i) => {
      const payload = res.payload || {};
      return {
        index: i + 1,
        documentId: String(payload.documentId || ''),
        filename: String(payload.filename || 'Untitled document'),
        page: payload.page ? Number(payload.page) : undefined,
        text: String(payload.text || ''),
        score: res.score,
      };
    });
  } catch (error) {
    logger.warn('Error during vector search in Qdrant', { error: String(error) });
    return [];
  }
}

