import { api } from '@/lib/api';

export const reportService = {
  async createReport(targetType: string, targetId: string, reason: string, description?: string) {
    const { data } = await api.post('/reports', { targetType, targetId, reason, description });
    return data;
  },

  async getMyReports() {
    const { data } = await api.get('/reports');
    return data;
  },
};
