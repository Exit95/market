/**
 * API Client — kommuniziert mit dem Ehren-Deal Backend (Astro SSR)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

const API_BASE = __DEV__
    ? Platform.OS === 'web'
        ? 'https://ehren-deal.de'   // Browser → Live API
        : 'http://10.0.2.2:3000'    // Android Emulator → localhost
    : 'https://ehren-deal.de';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function getSessionCookie(): Promise<string | null> {
    return AsyncStorage.getItem('session_cookie');
}

export async function saveSessionCookie(cookie: string): Promise<void> {
    await AsyncStorage.setItem('session_cookie', cookie);
}

export async function clearSession(): Promise<void> {
    await AsyncStorage.removeItem('session_cookie');
}

export async function api<T = unknown>(
    path: string,
    method: Method = 'GET',
    body?: unknown,
): Promise<{ data: T; ok: boolean; status: number }> {
    const cookie = await getSessionCookie();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (cookie) {
        headers['Cookie'] = cookie;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
    });

    // Save session cookie from response
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
        await saveSessionCookie(setCookie.split(';')[0]);
    }

    const data = await res.json().catch(() => ({} as T));

    return { data: data as T, ok: res.ok, status: res.status };
}

// Convenience helpers
export const get = <T>(path: string) => api<T>(path, 'GET');
export const post = <T>(path: string, body?: unknown) => api<T>(path, 'POST', body);
export const patch = <T>(path: string, body?: unknown) => api<T>(path, 'PATCH', body);
export const del = <T>(path: string) => api<T>(path, 'DELETE');
