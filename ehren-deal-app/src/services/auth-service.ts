import { api } from '@/lib/api';
import storage from '@/lib/storage';

export const authService = {
  async register(email: string, password: string, displayName?: string) {
    const { data } = await api.post('/auth/register', { email, password, displayName });
    await storage.setItem('access_token', data.accessToken);
    await storage.setItem('refresh_token', data.refreshToken);
    return data;
  },

  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    await storage.setItem('access_token', data.accessToken);
    await storage.setItem('refresh_token', data.refreshToken);
    return data;
  },

  async logout() {
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async isAuthenticated() {
    const token = await storage.getItem('access_token');
    return !!token;
  },
};
