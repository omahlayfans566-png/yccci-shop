import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '../api/adminApi';
import type { Category } from '../types';

export function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [sortOrder, setSortOrder] = useState('0');
    const [saving, setSaving] = useState(false);

    function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    function load() {
        setLoading(true);
        adminApi.listCategories()
            .then((r) => setCategories(r.categories))
            .catch((e) => setError(e.message || 'Failed to load'))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    function openCreate() {
        setEditTarget(null); setName(''); setDescription(''); setSortOrder('0');
        setShowForm(true);
    }

    function openEdit(cat: Category) {
        setEditTarget(cat); setName(cat.name); setDescription(cat.description || '');
        setSortOrder(String(cat.sortOrder || 0)); setShowForm(true);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            if (editTarget) {
                await adminApi.updateCategory(editTarget._id, { name: name.trim(), description: description.trim(), sortOrder: Number(sortOrder) });
                showToast('Category updated.');
            } else {
                await adminApi.createCategory({ name: name.trim(), description: description.trim(), sortOrder: Number(sortOrder) });
                showToast('Category created.');
            }
            setShowForm(false);
            load();
        } catch (e: any) {
            showToast(e.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(cat: Category) {
        if (!confirm(`Deactivate category "${cat.name}"?`)) return;
        try {
            await adminApi.deleteCategory(cat._id);
            showToast('Category deactivated.');
            load();
        } catch (e: any) {
            showToast(e.message || 'Failed to delete');
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Categories</h1>
                    <p className="text-sm text-slate-500">{categories.length} categories</p>
                </div>
                <button type="button" onClick={openCreate} className="btn-primary px-4 py-2.5 text-sm">+ New Category</button>
            </div>

            {error && <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {loading ? (
                <div className="flex justify-center py-16">
                    <svg className="h-8 w-8 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </div>
            ) : categories.length === 0 ? (
                <div className="card flex flex-col items-center gap-3 p-12 text-center">
                    <p className="text-4xl">📂</p>
                    <p className="font-semibold text-slate-700">No categories yet</p>
                    <button type="button" onClick={openCreate} className="btn-primary px-5 py-2">Add First Category</button>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Name', 'Slug', 'Description', 'Sort', 'Status', 'Actions'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {categories.map((cat) => (
                                <tr key={cat._id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-semibold text-slate-800">{cat.name}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{cat.slug}</td>
                                    <td className="px-4 py-3 max-w-[200px] truncate text-sm text-slate-600">{cat.description || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{cat.sortOrder ?? 0}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cat.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {cat.isActive !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => openEdit(cat)} className="btn-outline px-3 py-1.5 text-xs">Edit</button>
                                            <button type="button" onClick={() => handleDelete(cat)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="card w-full max-w-md p-6">
                        <h2 className="mb-4 text-lg font-bold text-slate-900">{editTarget ? 'Edit Category' : 'New Category'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Name *</label>
                                <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. T-Shirts" autoFocus />
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <input type="text" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                            </div>
                            <div>
                                <label className="label">Sort Order</label>
                                <input type="number" min="0" className="input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2.5">Cancel</button>
                                <button type="submit" disabled={saving || !name.trim()} className="btn-primary flex-1 py-2.5">
                                    {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}
