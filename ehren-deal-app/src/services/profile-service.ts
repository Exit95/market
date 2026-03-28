import { api } from '@/lib/api';

export const profileService = {
  async getProfile(id: string) {
    const { data } = await api.get(`/profiles/${id}`);
    return data;
  },

  async updateMyProfile(updates: any) {
    const { data } = await api.put('/profiles/me', updates);
    return data;
  },

  async getMyStats() {
    const { data } = await api.get('/profiles/me/stats');
    return data;
  },
};
