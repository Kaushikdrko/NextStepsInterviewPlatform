import { getFirebaseIdToken } from '@/lib/firebase/client';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

async function getAuthHeaders() {
  if (typeof window === 'undefined') {
    return new Headers();
  }

  const headers = new Headers();
  const idToken = await getFirebaseIdToken();

  if (idToken) {
    headers.set('Authorization', `Bearer ${idToken}`);
  }

  return headers;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const initHeaders = new Headers(init?.headers);

  initHeaders.forEach((value, key) => {
    headers.set(key, value);
  });

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
