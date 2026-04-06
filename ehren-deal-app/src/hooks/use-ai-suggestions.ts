import { useState, useCallback } from 'react';
import { aiAppService, type AiListingSuggestion, type AiPriceSuggestion } from '@/services/ai-app-service';

export function useAiSuggestions() {
  const [listingSuggestion, setListingSuggestion] = useState<AiListingSuggestion | null>(null);
  const [priceSuggestion, setPriceSuggestion] = useState<AiPriceSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  const checkEnabled = useCallback(async () => {
    const enabled = await aiAppService.isAiEnabled();
    setIsEnabled(enabled);
    return enabled;
  }, []);

  const fetchListingSuggestions = useCallback(
    async (title: string, description: string, categorySlug?: string) => {
      if (!title || title.length < 3) return null;

      setIsLoading(true);
      try {
        const result = await aiAppService.getListingSuggestions(title, description, categorySlug);
        setListingSuggestion(result);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchPriceSuggestion = useCallback(
    async (title: string, description: string, condition: string, categorySlug: string) => {
      if (!title || !condition || !categorySlug) return null;

      setIsLoading(true);
      try {
        const result = await aiAppService.getPriceSuggestion(title, description, condition, categorySlug);
        setPriceSuggestion(result);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearSuggestions = useCallback(() => {
    setListingSuggestion(null);
    setPriceSuggestion(null);
  }, []);

  return {
    listingSuggestion,
    priceSuggestion,
    isLoading,
    isEnabled,
    checkEnabled,
    fetchListingSuggestions,
    fetchPriceSuggestion,
    clearSuggestions,
  };
}
