import crypto from 'crypto';
import { Document } from '../models/document.model.js';
import { parseDocument } from '../rag/parsers/index.js';
import { chunkText } from '../rag/chunker.js';
import { generateEmbedding } from '../rag/embeddings.js';
import { qdrant, deletePointsByDocumentId } from '../rag/qdrant.js';
import { getObjectStream } from '../storage/r2.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Helper to convert a readable stream into a buffer
 */
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Ingestion pipeline worker function.
 * Can be called directly or from a job runner.
 */
export async function processDocumentIngest({ documentId, buffer }) {
  const doc = await Document.findById(documentId);
  if (!doc) {
    logger.warn('Document not found for ingestion', { documentId });
    return;
  }

  try {
    // 1. Mark status as processing
    doc.status = 'processing';
    doc.error = undefined;
    await doc.save();

    // 2. Obtain file buffer (either passed in or read from R2)
    let fileBuffer = buffer;
    if (!fileBuffer) {
      const stream = await getObjectStream(doc.storageKey);
      if (!stream) {
        throw new Error(`File stream not found in R2 for key "${doc.storageKey}"`);
      }
      fileBuffer = await streamToBuffer(stream);
    }

    // 3. Delete existing points first for idempotency
    await deletePointsByDocumentId(documentId);

    // 4. Parse document
    const { pages, fullText, pageCount } = await parseDocument(
      fileBuffer,
      doc.originalName
    );

    // 5. Clean and chunk with page numbers
    const allChunks = [];
    let globalChunkIndex = 0;

    if (pages && pages.length > 0) {
      for (const page of pages) {
        const pageChunks = chunkText(page.text, {
          chunkSize: env.CHUNK_TOKENS,
          overlap: env.CHUNK_OVERLAP,
          page: page.pageNumber,
        });

        for (const ch of pageChunks) {
          allChunks.push({
            ...ch,
            chunkIndex: globalChunkIndex++,
          });
        }
      }
    } else {
      const textChunks = chunkText(fullText, {
        chunkSize: env.CHUNK_TOKENS,
        overlap: env.CHUNK_OVERLAP,
        page: 1,
      });
      allChunks.push(...textChunks);
    }

    if (allChunks.length === 0) {
      throw new Error('No content chunks could be generated from document');
    }

    // 6. Embed and upsert in batches of 16 to Qdrant
    const batchSize = 16;
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const points = [];

      for (const chunk of batch) {
        const vector = await generateEmbedding(chunk.text);
        const pointId = crypto.randomUUID();

        points.push({
          id: pointId,
          vector,
          payload: {
            userId: doc.userId.toString(),
            chatId: doc.chatId.toString(),
            documentId: doc._id.toString(),
            filename: doc.originalName,
            page: chunk.page,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text,
            createdAt: new Date().toISOString(),
          },
        });
      }

      await qdrant.upsert(env.QDRANT_COLLECTION, { points });
    }

    // 7. Update document status to ready
    doc.status = 'ready';
    doc.pageCount = pageCount || 1;
    doc.chunkCount = allChunks.length;
    doc.error = undefined;
    await doc.save();

    logger.info('Document ingestion completed successfully', {
      documentId,
      pageCount: doc.pageCount,
      chunkCount: doc.chunkCount,
    });
  } catch (error) {
    logger.error('Document ingestion failed', {
      documentId,
      error: String(error),
    });

    doc.status = 'failed';
    doc.error = error.message || 'Processing failed';
    await doc.save();
  }
}

