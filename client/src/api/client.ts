const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE) return `${API_BASE}${clean}`;
  return clean; // dev: relative, proxied by Vite to the API server
}

/** Base origin of the API, used to build absolute media URLs. */
export function apiBase(): string {
  return API_BASE;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

async function parseError(res: Response): Promise<ApiError> {
  let message = 'Something went wrong. Please try again.';
  let details: unknown;
  try {
    const data = await res.json();
    if (data && data.message) message = data.message;
    details = data?.details;
  } catch {
    // Non-JSON error body: keep the generic message.
  }
  return new ApiError(message, res.status, details);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers } = options;
  const init: RequestInit = {
    method,
    headers: { Accept: 'application/json', ...headers },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(path), init);
  } catch {
    throw new ApiError('Network error. Please check your connection and try again.', 0);
  }

  if (!res.ok) throw await parseError(res);

  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError('The server returned an invalid response.', 500);
  }
}

/** Multipart upload helper (used for the payment receipt). */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { method: 'POST', body: formData });
  } catch {
    throw new ApiError('Network error. Please check your connection and try again.', 0);
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}