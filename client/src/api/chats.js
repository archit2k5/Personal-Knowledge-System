import { apiClient } from './client.js';

export const chatsApi = {
  async listChats(params = {}) {
    const query = new URLSearchParams();
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.q) query.set('q', params.q);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiClient(`/chats${queryString}`);
  },

  async createChat(title) {
    return apiClient('/chats', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  async getChat(chatId) {
    return apiClient(`/chats/${chatId}`);
  },

  async updateChat(chatId, { title, settings }) {
    return apiClient(`/chats/${chatId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, settings }),
    });
  },

  async deleteChat(chatId) {
    return apiClient(`/chats/${chatId}`, {
      method: 'DELETE',
    });
  },
};

