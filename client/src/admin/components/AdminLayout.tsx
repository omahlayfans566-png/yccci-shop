import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/admin/products', label: 'Products', icon: '🛍️' },
    { to: '/admin/categories', label: 'Categories', icon: '📂' },
    { to: '/admin/orders', label: 'Orders', icon: '📦' },
    { to: '/admin/payment-settings', label: 'Payment Settings', icon: '🏦' },
];
const superAdminNav = [
    { to: '/admin/admins', label: 'Admin Users', icon: '👥' },
];

interface Props { children: ReactNode; }

export function AdminLayout({ children }: Props) {
    const { admin, logout, isSuperAdmin } = useAdminAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    function handleLogout() {
        logout();
        navigate('/admin/login');
    }

    const allNav = isSuperAdmin ? [...navItems, ...superAdminNav] : navItems;

    return (
        <div className="flex h-screen overflow-hidden bg-slate-100">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-brand-900 transition-transform duration-200
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                {/* Logo */}
                <div className="flex h-16 items-center gap-3 border-b border-brand-800 px-5">
                    <span className="text-2xl">🛒</span>
                    <div>
                        <p className="text-base font-extrabold tracking-tight text-white">SHOP</p>
                        <p className="text-xs text-brand-300">Admin Panel</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <ul className="space-y-1">
                        {allNav.map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                            ? 'bg-brand-700 text-white'
                                            : 'text-brand-200 hover:bg-brand-800 hover:text-white'
                                        }`
                                    }
                                >
                                    <span>{item.icon}</span>
                                    {item.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Admin info + logout */}
                <div className="border-t border-brand-800 px-4 py-4">
                    <p className="truncate text-sm font-semibold text-white">{admin?.name}</p>
                    <p className="mt-0.5 truncate text-xs text-brand-400">{admin?.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-accent-500 px-2 py-0.5 text-xs font-bold text-brand-900">
                        {admin?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </span>
                    <div className="mt-3 flex gap-2">
                        <NavLink
                            to="/admin/profile"
                            className="flex-1 rounded-lg bg-brand-800 px-2 py-1.5 text-center text-xs font-medium text-brand-200 hover:bg-brand-700"
                            onClick={() => setSidebarOpen(false)}
                        >
                            Profile
                        </NavLink>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex-1 rounded-lg bg-red-900/40 px-2 py-1.5 text-xs font-medium text-red-300 hover:bg-red-800/50"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top bar */}
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                        aria-label="Toggle sidebar"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-3 ml-auto">
                        <span className="hidden text-sm text-slate-500 sm:block">
                            Welcome, <strong className="text-slate-800">{admin?.name}</strong>
                        </span>
                        <a
                            href="/"
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                        >
                            View Shop ↗
                        </a>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
