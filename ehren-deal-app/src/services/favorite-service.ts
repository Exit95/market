import { api } from '@/lib/api';

export const favoriteService = {
  async getFavorites() {
    const { data } = await api.get('/favorites');
    return data;
  },

  async addFavorite(listingId: string) {
    const { data } = await api.post('/favorites', { listingId });
    return data;
  },

  async removeFavorite(listingId: string) {
    const { data } = await api.delete(`/favorites/${listingId}`);
    return data;
  },
};
