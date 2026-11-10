import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const qdrant = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY || undefined,
});

export async function ensureCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === env.QDRANT_COLLECTION
    );

    if (!exists) {
      await qdrant.createCollection(env.QDRANT_COLLECTION, {
        vectors: {
          size: env.EMBEDDING_DIM,
          distance: 'Cosine',
        },
      });

      await qdrant.createPayloadIndex(env.QDRANT_COLLECTION, {
        field_name: 'userId',
        field_schema: 'keyword',
      });
      await qdrant.createPayloadIndex(env.QDRANT_COLLECTION, {
        field_name: 'chatId',
        field_schema: 'keyword',
      });
      await qdrant.createPayloadIndex(env.QDRANT_COLLECTION, {
        field_name: 'documentId',
        field_schema: 'keyword',
      });

      logger.info('Created Qdrant collection and payload indexes', {
        collection: env.QDRANT_COLLECTION,
      });
    }
  } catch (error) {
    logger.warn('Could not initialize Qdrant collection', { error: String(error) });
  }
}

export async function deletePointsByChatId(chatId) {
  try {
    await qdrant.delete(env.QDRANT_COLLECTION, {
      filter: {
        must: [{ key: 'chatId', match: { value: chatId } }],
      },
    });
    logger.info('Deleted Qdrant points for chat', { chatId });
  } catch (error) {
    logger.error('Failed to delete Qdrant points for chat', { chatId, error: String(error) });
  }
}

export async function deletePointsByDocumentId(documentId) {
  try {
    await qdrant.delete(env.QDRANT_COLLECTION, {
      filter: {
        must: [{ key: 'documentId', match: { value: documentId } }],
      },
    });
    logger.info('Deleted Qdrant points for document', { documentId });
  } catch (error) {
    logger.error('Failed to delete Qdrant points for document', { documentId, error: String(error) });
  }
}

