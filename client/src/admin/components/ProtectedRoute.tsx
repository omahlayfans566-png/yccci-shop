import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

interface Props {
    children: React.ReactNode;
    requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ children, requireSuperAdmin = false }: Props) {
    const { admin, loading } = useAdminAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <div className="animate-spin text-4xl">⚙️</div>
            </div>
        );
    }

    if (!admin) return <Navigate to="/admin/login" replace />;
    if (requireSuperAdmin && admin.role !== 'superadmin') {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <>{children}</>;
}
