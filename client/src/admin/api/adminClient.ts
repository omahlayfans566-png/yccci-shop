const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function adminApiUrl(path: string): string {
    const clean = path.startsWith('/') ? path : `/${path}`;
    return API_BASE ? `${API_BASE}${clean}` : clean;
}

export class AdminApiError extends Error {
    status: number;
    details?: unknown;
    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = 'AdminApiError';
        this.status = status;
        this.details = details;
    }
}

async function parseError(res: Response): Promise<AdminApiError> {
    let message = 'Something went wrong.';
    let details: unknown;
    try {
        const data = await res.json();
        if (data?.message) message = data.message;
        details = data?.details;
    } catch { /* ignore */ }
    return new AdminApiError(message, res.status, details);
}

function getToken(): string | null {
    try { return localStorage.getItem('admin_token'); } catch { return null; }
}

export async function adminRequest<T>(
    path: string,
    options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };
    const init: RequestInit = { method: options.method || 'GET', headers };
    if (options.body !== undefined) {
        init.body = JSON.stringify(options.body);
        headers['Content-Type'] = 'application/json';
    }
    let res: Response;
    try { res = await fetch(adminApiUrl(path), init); }
    catch { throw new AdminApiError('Network error. Check your connection.', 0); }
    if (!res.ok) throw await parseError(res);
    try { return (await res.json()) as T; }
    catch { throw new AdminApiError('Invalid server response.', 500); }
}

export async function adminUpload<T>(path: string, formData: FormData): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    let res: Response;
    try { res = await fetch(adminApiUrl(path), { method: 'POST', headers, body: formData }); }
    catch { throw new AdminApiError('Network error. Check your connection.', 0); }
    if (!res.ok) throw await parseError(res);
    return (await res.json()) as T;
}

export async function adminUploadPut<T>(path: string, formData: FormData): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    let res: Response;
    try { res = await fetch(adminApiUrl(path), { method: 'PUT', headers, body: formData }); }
    catch { throw new AdminApiError('Network error. Check your connection.', 0); }
    if (!res.ok) throw await parseError(res);
    return (await res.json()) as T;
}
