import { documentService } from '../services/document.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export class DocumentController {
  async uploadDocuments(req, res) {
    const files = req.files;
    const result = await documentService.uploadDocuments(
      req.user.id,
      req.params.chatId,
      files
    );
    return ApiResponse.accepted(res, result);
  }

  async listDocuments(req, res) {
    const result = await documentService.listDocuments(req.params.chatId);
    return ApiResponse.success(res, 200, result);
  }

  async getDocument(req, res) {
    const result = await documentService.getDocument(
      req.params.chatId,
      req.params.documentId
    );
    return ApiResponse.success(res, 200, result);
  }

  async getPresignedFileUrl(req, res) {
    const result = await documentService.getPresignedFileUrl(
      req.params.chatId,
      req.params.documentId
    );
    return ApiResponse.success(res, 200, result);
  }

  async reprocessDocument(req, res) {
    const result = await documentService.reprocessDocument(
      req.params.chatId,
      req.params.documentId
    );
    return ApiResponse.accepted(res, result);
  }

  async deleteDocument(req, res) {
    await documentService.deleteDocument(
      req.params.chatId,
      req.params.documentId
    );
    return ApiResponse.noContent(res);
  }
}

export const documentController = new DocumentController();

