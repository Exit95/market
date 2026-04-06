import { api } from '@/lib/api';

export const categoryService = {
  async getCategories() {
    const { data } = await api.get('/categories');
    return data;
  },
};
