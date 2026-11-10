import crypto from 'crypto';
import mongoose from 'mongoose';
import { Document } from '../models/document.model.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import {
  buildStorageKey,
  putObject,
  deleteObject,
  getPresignedDownloadUrl,
} from '../storage/r2.js';
import { deletePointsByDocumentId } from '../rag/qdrant.js';
import { queue } from '../jobs/queue.js';

export class DocumentService {
  async uploadDocuments(userId, chatId, files) {
    if (!files || files.length === 0) {
      throw ApiError.badRequest('No files provided');
    }

    const createdDocs = [];

    for (const file of files) {
      const contentHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Check duplicate upload within this chat
      const duplicate = await Document.findOne({ chatId, contentHash });
      if (duplicate) {
        throw ApiError.conflict(
          `Document "${file.originalname}" has already been uploaded to this chat`
        );
      }

      const documentId = new mongoose.Types.ObjectId();
      const ext = file.originalname.slice(file.originalname.lastIndexOf('.'));
      const randomId = crypto.randomBytes(8).toString('hex');
      const storageKey = buildStorageKey(
        userId,
        chatId,
        documentId.toString(),
        randomId,
        ext
      );

      // Upload to R2
      await putObject(storageKey, file.buffer, file.mimetype);

      const doc = await Document.create({
        _id: documentId,
        chatId,
        userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        bucket: env.R2_BUCKET,
        status: 'processing',
        embeddingModel: env.EMBEDDING_MODEL,
        contentHash,
      });

      createdDocs.push(doc);

      // Enqueue ingestion pipeline job
      await queue.enqueueIngest({
        documentId: doc._id.toString(),
        buffer: file.buffer,
      });
    }

    return { items: createdDocs };
  }

  async listDocuments(chatId) {
    const items = await Document.find({ chatId }).sort({ createdAt: -1 });
    return { items };
  }

  async getDocument(chatId, documentId) {
    const doc = await Document.findOne({ _id: documentId, chatId });
    if (!doc) {
      throw ApiError.notFound('Document not found');
    }
    return { document: doc };
  }

  async getPresignedFileUrl(chatId, documentId) {
    const doc = await Document.findOne({ _id: documentId, chatId });
    if (!doc) {
      throw ApiError.notFound('Document not found');
    }

    const url = await getPresignedDownloadUrl(doc.storageKey, doc.originalName);
    return { url, expiresIn: env.R2_PRESIGN_TTL };
  }

  async reprocessDocument(chatId, documentId) {
    const doc = await Document.findOne({ _id: documentId, chatId });
    if (!doc) {
      throw ApiError.notFound('Document not found');
    }

    // Delete existing points first for idempotency
    await deletePointsByDocumentId(documentId);

    doc.status = 'processing';
    doc.error = undefined;
    await doc.save();

    await queue.enqueueIngest({
      documentId: doc._id.toString(),
    });

    return { document: doc };
  }

  async deleteDocument(chatId, documentId) {
    const doc = await Document.findOne({ _id: documentId, chatId });
    if (!doc) {
      throw ApiError.notFound('Document not found');
    }

    // 1. Delete points in Qdrant
    await deletePointsByDocumentId(documentId);

    // 2. Delete file in R2
    await deleteObject(doc.storageKey);

    // 3. Delete Document record in Mongo
    await Document.deleteOne({ _id: documentId });
  }
}

export const documentService = new DocumentService();
