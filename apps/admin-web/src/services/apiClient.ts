import { readStoredSession } from '../app/session';

type MockCall<T> = () => Promise<T>;

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

function toQuery(params?: Record<string, unknown>) {
  if (!params) return '';

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const value = query.toString();
  return value ? `?${value}` : '';
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = readStoredSession()?.token;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${path}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function requestList<T>(path: string, options: RequestOptions = {}): Promise<T[]> {
  const payload = await request<T[] | { list?: T[]; data?: T[] }>(path, options);
  if (Array.isArray(payload)) return payload;
  return payload.list || payload.data || [];
}

export function withQuery(path: string, params?: Record<string, unknown>) {
  return `${path}${toQuery(params)}`;
}

export async function callApi<T>(mockCall: MockCall<T>, realCall: MockCall<T>): Promise<T> {
  return USE_MOCK_API ? mockCall() : realCall();
}
