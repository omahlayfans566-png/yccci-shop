import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import type { AdminProduct } from '../types';

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
    AVAILABLE: { bg: 'bg-emerald-100 text-emerald-700', label: 'Available' },
    SOLD_OUT: { bg: 'bg-red-100 text-red-700', label: 'Sold Out' },
    COMING_SOON: { bg: 'bg-amber-100 text-amber-700', label: 'Coming Soon' },
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_STYLES[status] ?? { bg: 'bg-slate-100 text-slate-700', label: status };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg}`}>
            {s.label}
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

    function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

    function load() {
        setLoading(true); setError('');
        adminApi.listProducts()
            .then((res) => setProducts(res.products))
            .catch((e: { message?: string }) => setError(e.message || 'Failed to load products'))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    async function handleDelete(product: AdminProduct) {
        if (!confirm(`Deactivate "${product.name}"?\n\nIt will be hidden from the shop but not permanently deleted.`)) return;
        setDeleting(product._id);
        try {
            await adminApi.deleteProduct(product._id);
            showToast(`"${product.name}" deactivated.`);
            load();
        } catch (e: { message?: string } | unknown) {
            showToast((e as { message?: string }).message || 'Failed to deactivate product');
        } finally {
            setDeleting(null);
        }
    }

    const filtered = products.filter((p) =>
        !search.trim() || p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Products</h1>
                    <p className="text-sm text-slate-500">
                        {loading ? 'Loading…' : `${products.length} product${products.length !== 1 ? 's' : ''} total`}
                    </p>
                </div>
                <Link to="/admin/products/new"
                    className="btn-primary px-5 py-2.5 text-sm font-semibold">
                    + Add Product
                </Link>
            </div>

            {/* Search */}
            <div className="card p-4">
                <div className="relative">
                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
                    </svg>
                    <input type="search" placeholder="Search products by name…"
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="input pl-9" />
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-16">
                    <svg className="h-8 w-8 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error} — <button type="button" onClick={load} className="underline">Retry</button>
                </div>
            )}

            {/* Empty */}
            {!loading && !error && filtered.length === 0 && (
                <div className="card flex flex-col items-center gap-4 p-14 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">📦</div>
                    <div>
                        <p className="font-bold text-slate-800">
                            {search ? 'No products match your search' : 'No products yet'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            {search ? 'Try a different search term.' : 'Add your first product to get started.'}
                        </p>
                    </div>
                    {!search && <Link to="/admin/products/new" className="btn-primary px-6 py-2.5">Add First Product</Link>}
                </div>
            )}

            {/* Desktop table */}
            {!loading && filtered.length > 0 && (
                <>
                    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['Product', 'Category', 'Price', 'Stock', 'Sizes', 'Status', 'Active', 'Actions'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((p) => (
                                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                                    {p.mainImage ? (
                                                        <img src={p.mainImage} alt={p.name}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                                                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                <circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="max-w-[200px] truncate text-sm font-semibold text-slate-900">{p.name}</p>
                                                    <p className="text-xs text-slate-400">{p.images.length} image{p.images.length !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {typeof p.category === 'object' && p.category ? p.category.name : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-brand-800">
                                            ₦{p.price.toLocaleString('en-NG')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{p.stock}</td>
                                        <td className="px-4 py-3">
                                            {p.sizes.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {p.sizes.slice(0, 3).map((s) => (
                                                        <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{s}</span>
                                                    ))}
                                                    {p.sizes.length > 3 && (
                                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400">+{p.sizes.length - 3}</span>
                                                    )}
                                                </div>
                                            ) : <span className="text-xs text-slate-400">None</span>}
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold ${p.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {p.isActive ? '● Active' : '● Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <Link to={`/admin/products/${p._id}/edit`}
                                                    className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors">
                                                    Edit
                                                </Link>
                                                <button type="button" onClick={() => handleDelete(p)} disabled={deleting === p._id}
                                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors">
                                                    {deleting === p._id ? '…' : 'Deactivate'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="grid gap-3 md:hidden">
                        {filtered.map((p) => (
                            <div key={p._id} className="card p-4">
                                <div className="flex gap-3">
                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                        {p.mainImage ? (
                                            <img src={p.mainImage} alt={p.name} className="h-full w-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                                                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                                                    <path d="m21 15-5-5L5 21" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-900 truncate">{p.name}</p>
                                        <p className="text-sm text-slate-500">₦{p.price.toLocaleString('en-NG')} · Stock: {p.stock}</p>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            <StatusBadge status={p.status} />
                                            {!p.isActive && (
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Inactive</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <Link to={`/admin/products/${p._id}/edit`}
                                        className="flex-1 rounded-lg border border-brand-200 bg-brand-50 py-2.5 text-center text-sm font-semibold text-brand-700">
                                        Edit
                                    </Link>
                                    <button type="button" onClick={() => handleDelete(p)} disabled={deleting === p._id}
                                        className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50">
                                        {deleting === p._id ? '…' : 'Deactivate'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-brand-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
                    {toast}
                </div>
            )}
        </div>
    );
}
