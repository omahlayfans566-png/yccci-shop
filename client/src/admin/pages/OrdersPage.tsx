import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import type { AdminOrder } from '../types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../types';

function fmt(n: number) { return `₦${n.toLocaleString('en-NG')}`; }
function fmtDate(d: string) {
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
}

export function OrdersPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const page = Number(searchParams.get('page') || 1);
    const orderStatus = searchParams.get('orderStatus') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const search = searchParams.get('search') || '';

    function setFilter(key: string, val: string) {
        const p = new URLSearchParams(searchParams);
        if (val) p.set(key, val); else p.delete(key);
        p.set('page', '1');
        setSearchParams(p);
    }

    useEffect(() => {
        setLoading(true);
        adminApi.listOrders({ page, orderStatus: orderStatus || undefined, paymentStatus: paymentStatus || undefined, search: search || undefined })
            .then((r) => { setOrders(r.orders); setTotal(r.total); setPages(r.pages); })
            .catch((e) => setError(e.message || 'Failed to load orders'))
            .finally(() => setLoading(false));
    }, [page, orderStatus, paymentStatus, search]);

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Orders</h1>
                <p className="text-sm text-slate-500">{total} total orders</p>
            </div>

            {/* Filters */}
            <div className="card p-4 grid gap-3 sm:grid-cols-3">
                <input type="search" placeholder="Search orders, name, email…" className="input" defaultValue={search}
                    onChange={(e) => { clearTimeout((window as any).__orderSearch); (window as any).__orderSearch = setTimeout(() => setFilter('search', e.target.value), 400); }} />
                <select className="input" value={orderStatus} onChange={(e) => setFilter('orderStatus', e.target.value)}>
                    <option value="">All Order Statuses</option>
                    {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select className="input" value={paymentStatus} onChange={(e) => setFilter('paymentStatus', e.target.value)}>
                    <option value="">All Payment Statuses</option>
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {error && <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {loading ? (
                <div className="flex justify-center py-16">
                    <svg className="h-8 w-8 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </div>
            ) : orders.length === 0 ? (
                <div className="card flex flex-col items-center gap-3 p-12 text-center">
                    <p className="text-4xl">📭</p>
                    <p className="font-semibold text-slate-700">No orders found</p>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['Order #', 'Customer', 'Total', 'Order Status', 'Payment', 'Date', 'Actions'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.map((o) => (
                                    <tr key={o._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono text-sm font-semibold text-brand-800">{o.orderNumber}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-slate-800">{o.customer.fullName}</p>
                                            <p className="text-xs text-slate-500">{o.customer.phone}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{fmt(o.total)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[o.orderStatus] || 'bg-slate-100 text-slate-700'}`}>
                                                {ORDER_STATUS_LABELS[o.orderStatus] || o.orderStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_COLORS[o.payment.status] || 'bg-slate-100 text-slate-700'}`}>
                                                {PAYMENT_STATUS_LABELS[o.payment.status] || o.payment.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(o.createdAt)}</td>
                                        <td className="px-4 py-3">
                                            <Link to={`/admin/orders/${o._id}`} className="btn-outline px-3 py-1.5 text-xs">View</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="grid gap-3 lg:hidden">
                        {orders.map((o) => (
                            <Link key={o._id} to={`/admin/orders/${o._id}`} className="card block p-4 hover:shadow-md">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-mono text-sm font-bold text-brand-800">{o.orderNumber}</p>
                                        <p className="text-sm font-medium text-slate-800">{o.customer.fullName}</p>
                                        <p className="text-xs text-slate-500">{o.customer.phone} · {fmtDate(o.createdAt)}</p>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">{fmt(o.total)}</p>
                                </div>
                                <div className="mt-2 flex gap-2">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[o.orderStatus] || 'bg-slate-100 text-slate-700'}`}>
                                        {ORDER_STATUS_LABELS[o.orderStatus] || o.orderStatus}
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_COLORS[o.payment.status] || 'bg-slate-100 text-slate-700'}`}>
                                        {PAYMENT_STATUS_LABELS[o.payment.status] || o.payment.status}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pages > 1 && (
                        <div className="flex items-center justify-center gap-2">
                            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                                <button key={p} type="button"
                                    onClick={() => { const sp = new URLSearchParams(searchParams); sp.set('page', String(p)); setSearchParams(sp); }}
                                    className={`h-9 w-9 rounded-lg text-sm font-semibold ${p === page ? 'bg-brand-800 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
