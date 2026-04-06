import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import storage from '@/lib/storage';
import { useAuthStore } from '@/store/auth-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const WS_URL = API_URL.replace('http', 'ws');

type EventHandler = (data: any) => void;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = await storage.getItem('access_token');
    if (!token) return;

    try {
      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        // Authentifizierung senden
        ws.send(JSON.stringify({ event: 'auth', token }));

        // Keepalive Ping alle 30s
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Event-Handler aufrufen
          const handlers = handlersRef.current.get(msg.event);
          if (handlers) {
            for (const handler of handlers) {
              handler(msg.data);
            }
          }

          // Automatische Query-Invalidierung
          if (msg.event === 'new_message') {
            queryClient.invalidateQueries({ queryKey: ['messages', msg.data?.conversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }

          if (msg.event === 'deal_update') {
            queryClient.invalidateQueries({ queryKey: ['my-deals'] });
            queryClient.invalidateQueries({ queryKey: ['deal', msg.data?.dealId] });
          }

          if (msg.event === 'notification') {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        } catch {
          // Ungueltige Nachricht ignorieren
        }
      };

      ws.onclose = () => {
        cleanup();
        // Reconnect nach 3s
        if (isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // Reconnect bei Fehler
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [isAuthenticated, queryClient]);

  function cleanup() {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = undefined;
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }

    return () => {
      cleanup();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);

  const on = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    return () => {
      handlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  const sendTyping = useCallback((conversationId: string, recipientId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'typing',
        conversationId,
        recipientId,
      }));
    }
  }, []);

  return { on, sendTyping };
}
