import { api } from '@/lib/api';

export const reviewService = {
  async getUserReviews(userId: string) {
    const { data } = await api.get(`/reviews/user/${userId}`);
    return data;
  },

  async createReview(params: { dealId: string; rating: number; text?: string }) {
    const { data } = await api.post('/reviews', params);
    return data;
  },

  async getDealReviews(dealId: string) {
    const { data } = await api.get(`/reviews/deal/${dealId}`);
    return data;
  },
};
