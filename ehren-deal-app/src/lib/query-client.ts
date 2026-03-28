import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 Minuten
      gcTime: 1000 * 60 * 30, // 30 Minuten Cache
      retry: 2,
      refetchOnWindowFocus: false,
      // Offline-Verhalten: gecachte Daten anzeigen wenn offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});
