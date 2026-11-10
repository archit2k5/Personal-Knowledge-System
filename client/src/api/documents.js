import { apiClient } from './client.js';

export const documentsApi = {
  async listDocuments(chatId) {
    return apiClient(`/chats/${chatId}/documents`);
  },

  async uploadDocuments(chatId, files) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    return apiClient(`/chats/${chatId}/documents`, {
      method: 'POST',
      body: formData,
    });
  },

  async getDocument(chatId, documentId) {
    return apiClient(`/chats/${chatId}/documents/${documentId}`);
  },

  async getFileDownloadUrl(chatId, documentId) {
    return apiClient(`/chats/${chatId}/documents/${documentId}/file`);
  },

  async reprocessDocument(chatId, documentId) {
    return apiClient(`/chats/${chatId}/documents/${documentId}/reprocess`, {
      method: 'POST',
    });
  },

  async deleteDocument(chatId, documentId) {
    return apiClient(`/chats/${chatId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  },
};

