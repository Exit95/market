import { api } from '@/lib/api';

export const aiAppService = {
  async getListingSuggestions(title: string, description?: string, categorySlug?: string) {
    try {
      const { data } = await api.post('/ai/suggest-listing', { title, description, categorySlug });
      return data;
    } catch {
      return null; // AI is optional
    }
  },

  async getPriceSuggestion(title: string, description: string, condition: string, categorySlug: string) {
    try {
      const { data } = await api.post('/ai/suggest-price', { title, description, condition, categorySlug });
      return data;
    } catch {
      return null;
    }
  },

  async isAiEnabled() {
    try {
      const { data } = await api.get('/ai/status');
      return data.enabled;
    } catch {
      return false;
    }
  },
};
