import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import type { OrderStats } from '../types';

interface StatCardProps {
    label: string;
    value: number | string;
    icon: string;
    color: string;
    to?: string;
}
function StatCard({ label, value, icon, color, to }: StatCardProps) {
    const inner = (
        <div className={`card flex items-center gap-4 p-5 transition-shadow hover:shadow-md ${to ? 'cursor-pointer' : ''}`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${color}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-2xl font-extrabold text-slate-900">{value}</p>
                <p className="truncate text-sm text-slate-500">{label}</p>
            </div>
        </div>
    );
    return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

export function DashboardPage() {
    const [stats, setStats] = useState<OrderStats | null>(null);
    const [productCount, setProductCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        Promise.all([
            adminApi.orderStats(),
            adminApi.listProducts(),
        ])
            .then(([orderRes, prodRes]) => {
                setStats(orderRes.stats);
                setProductCount(prodRes.products.length);
            })
            .catch((e) => setError(e.message || 'Failed to load dashboard'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center py-32 text-slate-400">
            <svg className="h-10 w-10 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
        </div>
    );

    if (error) return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500">Overview of your store</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Products" value={productCount ?? 0} icon="🛍️" color="bg-brand-50" to="/admin/products" />
                <StatCard label="Total Orders" value={stats?.total ?? 0} icon="📦" color="bg-slate-100" to="/admin/orders" />
                <StatCard label="Proof Awaiting" value={stats?.proofAwaiting ?? 0} icon="⏳" color="bg-amber-50" to="/admin/orders?paymentStatus=PROOF_SUBMITTED" />
                <StatCard label="Pending Orders" value={stats?.pending ?? 0} icon="🕐" color="bg-slate-100" to="/admin/orders?orderStatus=PENDING" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Payment Submitted" value={stats?.paymentSubmitted ?? 0} icon="💳" color="bg-blue-50" to="/admin/orders?orderStatus=PAYMENT_SUBMITTED" />
                <StatCard label="Payment Verified" value={stats?.paymentVerified ?? 0} icon="✅" color="bg-emerald-50" to="/admin/orders?orderStatus=PAYMENT_VERIFIED" />
                <StatCard label="Processing" value={stats?.processing ?? 0} icon="⚙️" color="bg-purple-50" to="/admin/orders?orderStatus=PROCESSING" />
                <StatCard label="Delivered" value={stats?.delivered ?? 0} icon="🚚" color="bg-green-50" to="/admin/orders?orderStatus=DELIVERED" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard label="Cancelled Orders" value={stats?.cancelled ?? 0} icon="❌" color="bg-red-50" to="/admin/orders?orderStatus=CANCELLED" />
            </div>

            {/* Quick links */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Link to="/admin/products/new" className="card flex items-center gap-3 p-5 transition-shadow hover:shadow-md">
                    <span className="text-2xl">➕</span>
                    <div>
                        <p className="font-semibold text-slate-800">Add Product</p>
                        <p className="text-xs text-slate-500">Upload a new product</p>
                    </div>
                </Link>
                <Link to="/admin/orders" className="card flex items-center gap-3 p-5 transition-shadow hover:shadow-md">
                    <span className="text-2xl">📋</span>
                    <div>
                        <p className="font-semibold text-slate-800">View Orders</p>
                        <p className="text-xs text-slate-500">Manage all orders</p>
                    </div>
                </Link>
                <Link to="/admin/payment-settings" className="card flex items-center gap-3 p-5 transition-shadow hover:shadow-md">
                    <span className="text-2xl">🏦</span>
                    <div>
                        <p className="font-semibold text-slate-800">Payment Settings</p>
                        <p className="text-xs text-slate-500">Update bank details</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
