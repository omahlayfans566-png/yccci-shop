import {
    createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from 'react';
import type { AdminUser } from '../types';
import { adminApi } from '../api/adminApi';
import { AdminApiError } from '../api/adminClient';

interface AdminAuthState {
    admin: AdminUser | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isSuperAdmin: boolean;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [admin, setAdmin] = useState<AdminUser | null>(null);
    const [token, setToken] = useState<string | null>(() => {
        try { return localStorage.getItem('admin_token'); } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        if (!token) { setLoading(false); return; }
        adminApi.me()
            .then((res) => setAdmin(res.admin))
            .catch(() => {
                localStorage.removeItem('admin_token');
                setToken(null);
            })
            .finally(() => setLoading(false));
    }, []);  // eslint-disable-line

    const login = useCallback(async (email: string, password: string) => {
        const res = await adminApi.login(email, password);
        localStorage.setItem('admin_token', res.token);
        setToken(res.token);
        setAdmin(res.admin);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('admin_token');
        setToken(null);
        setAdmin(null);
    }, []);

    return (
        <AdminAuthContext.Provider value={{
            admin, token, loading, login, logout,
            isSuperAdmin: admin?.role === 'superadmin',
        }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth(): AdminAuthState {
    const ctx = useContext(AdminAuthContext);
    if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
    return ctx;
}
