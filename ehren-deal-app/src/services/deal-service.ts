import { api } from '@/lib/api';

export const dealService = {
  async getDeals() {
    const { data } = await api.get('/deals');
    return data;
  },

  async getDeal(id: string) {
    const { data } = await api.get(`/deals/${id}`);
    return data;
  },

  async createDeal(listingId: string, dealType = 'pickup', agreedPrice?: number) {
    const { data } = await api.post('/deals', { listingId, dealType, agreedPrice });
    return data;
  },

  async updateDealStatus(id: string, status: string, note?: string) {
    const { data } = await api.put(`/deals/${id}/status`, { status, note });
    return data;
  },

  async cancelDeal(id: string, reason: string) {
    const { data } = await api.put(`/deals/${id}/cancel`, { reason });
    return data;
  },
};
