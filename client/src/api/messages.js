import { apiClient } from './client.js';

export const messagesApi = {
  async listMessages(chatId, params = {}) {
    const query = new URLSearchParams();
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', String(params.limit));

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiClient(`/chats/${chatId}/messages${queryString}`);
  },

  async clearMessages(chatId) {
    return apiClient(`/chats/${chatId}/messages`, {
      method: 'DELETE',
    });
  },
};

