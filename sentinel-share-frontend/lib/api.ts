import { getToken } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  isFormData?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false } = options;

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body
      ? JSON.stringify(body)
      : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    const d = data as { error?: string; errors?: { msg: string }[] };
    const message = d.error ?? d.errors?.map((e) => e.msg).join(', ') ?? 'Request failed';
    throw new Error(message);
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    signup: (email: string, password: string) =>
      request<{ token: string; user: object }>('/auth/signup', {
        method: 'POST',
        body: { email, password },
      }),

    login: (email: string, password: string) =>
      request<{ token: string; user: object }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
  },

  files: {
    list: () =>
      request<{ files: import('../types').FileRecord[] }>('/files'),

    upload: (formData: FormData) =>
      request<{ file: import('../types').FileRecord }>('/files/upload', {
        method: 'POST',
        body: formData,
        isFormData: true,
      }),

    download: (id: string) =>
      request<import('../types').DownloadResponse>(`/files/${id}/download`),

    delete: (id: string) =>
      request<{ deleted: boolean }>(`/files/${id}`, { method: 'DELETE' }),

    share: (id: string, expiresInHours: number) =>
      request<{ shareLink: import('../types').ShareLink }>(`/files/${id}/share`, {
        method: 'POST',
        body: { expiresInHours },
      }),
  },

  shared: {
    download: (token: string) =>
      request<import('../types').DownloadResponse>(`/shared/${token}/download`),
  },
};
