const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? '/api'

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

function token(): string | null {
  return localStorage.getItem('adc_token')
}

function buildHeaders(json: boolean): HeadersInit {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  if (json) headers['Accept'] = 'application/json'
  const t = token()
  if (t) headers['Authorization'] = `Bearer ${t}`
  return headers
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    from?: number
    to?: number
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(true),
      ...(options.headers ?? {}),
    },
  })

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (res.status === 401) {
    localStorage.removeItem('adc_token')
    localStorage.removeItem('adc_user')
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401)
  }

  if (!res.ok) {
    const data = (body ?? {}) as {
      message?: string
      errors?: Record<string, string[]>
    }
    throw new ApiError(data.message ?? 'Une erreur est survenue.', res.status, data.errors)
  }

  return body as T
}

export const api = {
  get<T>(path: string): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path, { method: 'GET' })
  },
  post<T>(path: string, payload?: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path, {
      method: 'POST',
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    })
  },
  put<T>(path: string, payload?: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path, {
      method: 'PUT',
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    })
  },
  delete<T>(path: string): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path, { method: 'DELETE' })
  },
  upload<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {}
    const t = token()
    if (t) headers['Authorization'] = `Bearer ${t}`
    return request<ApiResponse<T>>(path, {
      method: 'POST',
      headers,
      body: formData,
    })
  },
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
