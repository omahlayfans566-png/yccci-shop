import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import type { AdminProduct } from '../types';

function statusBadge(status: string) {
    const map: Record<string, string> = {
        AVAILABLE: 'bg-emerald-100 text-emerald-700',
        SOLD_OUT: 'bg-red-100 text-red-700',
        COMING_SOON: 'bg-amber-100 text-amber-700',
    };
    const label: Record<string, string> = {
        AVAILABLE: 'Available', SOLD_OUT: 'Sold Out', COMING_SOON: 'Coming Soon',
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-700'}`}>
            {label[status] || status}
        </span>
    );
}

export function ProductsPage() {
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);
    const [toast, setToast] = useState('');

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    function load() {
        setLoading(true);
        adminApi.listProducts()
            .then((res) => setProducts(res.products))
            .catch((e) => setError(e.message || 'Failed to load products'))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    async function handleDelete(product: AdminProduct) {
        if (!confirm(`Deactivate "${product.name}"? It will be hidden from the shop.`)) return;
        setDeleting(product._id);
        try {
            await adminApi.deleteProduct(product._id);
            showToast(`"${product.name}" deactivated.`);
            load();
        } catch (e: any) {
            showToast(e.message || 'Failed to delete product');
        } finally {
            setDeleting(null);
        }
    }

    const filtered = products.filter((p) =>
        !search || p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Products</h1>
                    <p className="text-sm text-slate-500">{products.length} total products</p>
                </div>
                <Link to="/admin/products/new" className="btn-primary px-4 py-2.5 text-sm">
                    + Add Product
                </Link>
            </div>

            <div className="card p-4">
                <input
                    type="search"
                    placeholder="Search products…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input"
                />
            </div>

            {loading && (
                <div className="flex justify-center py-16">
                    <svg className="h-8 w-8 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </div>
            )}

            {error && <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {!loading && !error && filtered.length === 0 && (
                <div className="card flex flex-col items-center gap-3 p-12 text-center">
                    <p className="text-4xl">📦</p>
                    <p className="font-semibold text-slate-700">No products yet</p>
                    <Link to="/admin/products/new" className="btn-primary px-5 py-2">Add First Product</Link>
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <>
                    {/* Desktop table */}
                    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['Product', 'Category', 'Price', 'Stock', 'Status', 'Active', 'Actions'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((p) => (
                                    <tr key={p._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={p.mainImage || 'https://placehold.co/48x48/e2e8f0/94a3b8?text=IMG'}
                                                    alt={p.name}
                                                    className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/48x48/e2e8f0/94a3b8?text=IMG'; }}
                                                />
                                                <div className="min-w-0">
                                                    <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800">{p.name}</p>
                                                    <p className="text-xs text-slate-400">{p.images.length} image{p.images.length !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {typeof p.category === 'object' ? p.category.name : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold text-brand-800">
                                            ₦{p.price.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{p.stock}</td>
                                        <td className="px-4 py-3">{statusBadge(p.status)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold ${p.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {p.isActive ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <Link to={`/admin/products/${p._id}/edit`} className="btn-outline px-3 py-1.5 text-xs">Edit</Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(p)}
                                                    disabled={deleting === p._id}
                                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                                                >
                                                    {deleting === p._id ? '…' : 'Delete'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="grid gap-4 md:hidden">
                        {filtered.map((p) => (
                            <div key={p._id} className="card p-4">
                                <div className="flex gap-3">
                                    <img
                                        src={p.mainImage || 'https://placehold.co/64x64/e2e8f0/94a3b8?text=IMG'}
                                        alt={p.name}
                                        className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/64x64/e2e8f0/94a3b8?text=IMG'; }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-800">{p.name}</p>
                                        <p className="text-sm text-slate-500">₦{p.price.toLocaleString()} · Stock: {p.stock}</p>
                                        <div className="mt-1 flex gap-2">
                                            {statusBadge(p.status)}
                                            {!p.isActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Inactive</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <Link to={`/admin/products/${p._id}/edit`} className="btn-outline flex-1 py-2 text-sm">Edit</Link>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(p)}
                                        disabled={deleting === p._id}
                                        className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                                    >
                                        {deleting === p._id ? '…' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}
