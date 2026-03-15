/**
 * src/lib/ably.ts
 * Ably server-side helper
 */
import Ably from 'ably';

let _rest: Ably.Rest | null = null;

function getAbly() {
    if (!_rest) _rest = new Ably.Rest(import.meta.env.ABLY_API_KEY);
    return _rest;
}

/** Publish a message event to a conversation channel */
export async function publishMessage(conversationId: string, message: unknown) {
    const channel = getAbly().channels.get(`conversation:${conversationId}`);
    await channel.publish('message', message);
}

/** Generate a short-lived token request for the frontend Ably client */
export async function createTokenRequest(userId: string, conversationId: string) {
    const ably = getAbly();
    return new Promise<Ably.TokenRequest>((resolve, reject) => {
        ably.auth.createTokenRequest(
            {
                clientId: userId,
                capability: { [`conversation:${conversationId}`]: ['subscribe', 'publish'] },
                ttl: 3600_000, // 1 hour
            },
            (err, req) => {
                if (err || !req) reject(err ?? new Error('Token failed'));
                else resolve(req);
            },
        );
    });
}
