import { api } from '@/lib/api';

export interface AiListingSuggestion {
  improvedTitle?: string;
  improvedDescription?: string;
  suggestedCategory?: string;
  suggestedCondition?: string;
  qualityHints?: string[];
}

export interface AiPriceSuggestion {
  min: number;
  max: number;
  confidence: number;
}

export const aiAppService = {
  async getListingSuggestions(
    title: string,
    description: string,
    categorySlug?: string
  ): Promise<AiListingSuggestion | null> {
    try {
      const { data } = await api.post('/ai/suggest-listing', {
        title,
        description,
        categorySlug,
      });
      return data;
    } catch {
      return null;
    }
  },

  async getPriceSuggestion(
    title: string,
    description: string,
    condition: string,
    categorySlug: string
  ): Promise<AiPriceSuggestion | null> {
    try {
      const { data } = await api.post('/ai/suggest-price', {
        title,
        description,
        condition,
        categorySlug,
      });
      return data;
    } catch {
      return null;
    }
  },

  async isAiEnabled(): Promise<boolean> {
    try {
      const { data } = await api.get('/ai/status');
      return data.enabled;
    } catch {
      return false;
    }
  },
};
