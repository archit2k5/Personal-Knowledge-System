import { apiClient, setAccessToken } from './client.js';

export const authApi = {
  async register({ email, password, name }) {
    return apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  async verifyEmail(token) {
    return apiClient('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  async resendVerification(email) {
    return apiClient('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async forgotPassword(email) {
    return apiClient('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token, newPassword) {
    return apiClient('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  async login(email, password) {
    const data = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(data.accessToken);
    return data;
  },

  async refresh() {
    const data = await apiClient('/auth/refresh', {
      method: 'POST',
    });
    setAccessToken(data.accessToken);
    return data;
  },

  async logout() {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },

  async getMe() {
    return apiClient('/auth/me');
  },

  async updateMe(name) {
    return apiClient('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async changePassword(currentPassword, newPassword) {
    return apiClient('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

