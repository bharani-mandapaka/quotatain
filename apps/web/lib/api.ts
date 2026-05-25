const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// Set by AuthProvider when session loads; forwarded as Bearer on every request
let _token = ''
export function setApiToken(token: string) {
  _token = token
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  runs: {
    list: () => request<{ runs: any[] }>('/api/runs'),
    get: (id: string) => request<any>(`/api/runs/${id}`),
    create: (body: any) =>
      request<any>('/api/runs', { method: 'POST', body: JSON.stringify(body) }),
    exportUrl: (id: string, format: 'csv' | 'xlsx' = 'csv') =>
      `${API_BASE}/api/export/runs/${id}?format=${format}`,
  },
  products: {
    list: () => request<{ products: any[] }>('/api/products'),
    create: (body: any) =>
      request<any>('/api/products', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      request<any>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) =>
      request<any>(`/api/products/${id}`, { method: 'DELETE' }),
  },
  workspace: {
    get: () => request<any>('/api/workspace'),
    dashboard: () => request<any>('/api/workspace/dashboard'),
    users: {
      list: () => request<{ users: any[] }>('/api/workspace/users'),
      create: (body: { name: string; email: string; password: string; role: string }) =>
        request<{ user: any }>('/api/workspace/users', { method: 'POST', body: JSON.stringify(body) }),
      updateRole: (id: string, role: string) =>
        request<{ user: any }>(`/api/workspace/users/${id}`, { method: 'PUT', body: JSON.stringify({ role }) }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/api/workspace/users/${id}`, { method: 'DELETE' }),
    },
  },
}
