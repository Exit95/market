import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';

// User-ID -> Set von WebSocket-Verbindungen
const connections = new Map<string, Set<WebSocket>>();

export function getConnections() {
  return connections;
}

export function sendToUser(userId: string, event: string, data: any) {
  const userConns = connections.get(userId);
  if (!userConns) return;

  const message = JSON.stringify({ event, data });
  for (const ws of userConns) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(message);
    }
  }
}

export async function websocketRoutes(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (socket, request) => {
    let userId: string | null = null;

    socket.on('message', async (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString());

        // Authentifizierung per Token
        if (msg.event === 'auth') {
          try {
            const decoded = app.jwt.verify<{ id: string }>(msg.token);
            userId = decoded.id;

            if (!connections.has(userId)) {
              connections.set(userId, new Set());
            }
            connections.get(userId)!.add(socket);

            socket.send(JSON.stringify({ event: 'auth_ok' }));
          } catch {
            socket.send(JSON.stringify({ event: 'auth_error', data: { error: 'Ungueltiger Token' } }));
          }
          return;
        }

        // Ping/Pong fuer Keepalive
        if (msg.event === 'ping') {
          socket.send(JSON.stringify({ event: 'pong' }));
          return;
        }

        // Typing-Indikator
        if (msg.event === 'typing' && userId && msg.conversationId && msg.recipientId) {
          sendToUser(msg.recipientId, 'typing', {
            conversationId: msg.conversationId,
            userId,
          });
          return;
        }
      } catch {
        // Ignoriere ungueltige Nachrichten
      }
    });

    socket.on('close', () => {
      if (userId) {
        const userConns = connections.get(userId);
        if (userConns) {
          userConns.delete(socket);
          if (userConns.size === 0) {
            connections.delete(userId);
          }
        }
      }
    });

    socket.on('error', () => {
      if (userId) {
        const userConns = connections.get(userId);
        if (userConns) {
          userConns.delete(socket);
          if (userConns.size === 0) {
            connections.delete(userId);
          }
        }
      }
    });
  });
}
