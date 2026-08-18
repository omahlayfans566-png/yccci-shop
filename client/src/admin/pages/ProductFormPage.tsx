import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import type { AdminProduct, Category } from '../types';

const STATUSES = ['AVAILABLE', 'SOLD_OUT', 'COMING_SOON'] as const;

interface FormState {
    name: string; shortDescription: string; description: string;
    price: string; stock: string; category: string;
    status: string; sortOrder: string;
}
const EMPTY: FormState = {
    name: '', shortDescription: '', description: '',
    price: '', stock: '0', category: '', status: 'AVAILABLE', sortOrder: '0',
};

export function ProductFormPage() {
    const { id } = useParams<{ id?: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();

    const [form, setForm] = useState<FormState>(EMPTY);
    const [sizes, setSizes] = useState<string[]>([]);
    const [sizeInput, setSizeInput] = useState('');
    const [colours, setColours] = useState<{ name: string; hex: string }[]>([]);
    const [colourName, setColourName] = useState('');
    const [colourHex, setColourHex] = useState('#000000');
    const [categories, setCategories] = useState<Category[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEdit);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        adminApi.listCategories()
            .then((r) => setCategories(r.categories))
            .catch(() => { });

        if (isEdit && id) {
            setPageLoading(true);
            adminApi.getProduct(id)
                .then((r) => {
                    const p: AdminProduct = r.product;
                    setForm({
                        name: p.name, shortDescription: p.shortDescription || '',
                        description: p.description || '', price: String(p.price),
                        stock: String(p.stock), category: typeof p.category === 'object' ? p.category._id : p.category,
                        status: p.status, sortOrder: String(p.sortOrder || 0),
                    });
                    setSizes(p.sizes || []);
                    setColours((p.colours || []).map((c) => ({ name: c.name, hex: c.hex || '#000000' })));
                    setExistingImages(p.images || []);
                })
                .catch((e) => setError(e.message || 'Failed to load product'))
                .finally(() => setPageLoading(false));
        }
    }, [id, isEdit]);

    function set(k: keyof FormState, v: string) { setForm((f) => ({ ...f, [k]: v })); }

    function addSize() {
        const s = sizeInput.trim().toUpperCase();
        if (s && !sizes.includes(s)) setSizes([...sizes, s]);
        setSizeInput('');
    }
    function removeSize(s: string) { setSizes(sizes.filter((x) => x !== s)); }

    function addColour() {
        const n = colourName.trim();
        if (n && !colours.find((c) => c.name.toLowerCase() === n.toLowerCase())) {
            setColours([...colours, { name: n, hex: colourHex }]);
        }
        setColourName('');
    }
    function removeColour(n: string) { setColours(colours.filter((c) => c.name !== n)); }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        const valid = files.filter((f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));
        setNewFiles((prev) => [...prev, ...valid]);
        setNewPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
        if (fileRef.current) fileRef.current.value = '';
    }

    function removeNewFile(i: number) {
        URL.revokeObjectURL(newPreviews[i]);
        setNewFiles((f) => f.filter((_, j) => j !== i));
        setNewPreviews((p) => p.filter((_, j) => j !== i));
    }

    async function deleteExistingImage(idx: number) {
        if (!id) return;
        if (!confirm('Delete this image?')) return;
        try {
            await adminApi.deleteProductImage(id, idx);
            setExistingImages((prev) => prev.filter((_, i) => i !== idx));
        } catch (e: any) { setError(e.message || 'Failed to delete image'); }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        if (!form.name.trim()) { setError('Product name is required.'); return; }
        if (!form.price || isNaN(Number(form.price))) { setError('Valid price is required.'); return; }
        if (!form.category) { setError('Category is required.'); return; }

        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('name', form.name.trim());
            fd.append('shortDescription', form.shortDescription.trim());
            fd.append('description', form.description.trim());
            fd.append('price', form.price);
            fd.append('stock', form.stock);
            fd.append('category', form.category);
            fd.append('status', form.status);
            fd.append('sortOrder', form.sortOrder);
            fd.append('sizes', JSON.stringify(sizes));
            fd.append('colours', JSON.stringify(colours));
            for (const file of newFiles) fd.append('images', file);

            if (isEdit && id) {
                await adminApi.updateProduct(id, fd);
                setSuccess('Product updated successfully!');
            } else {
                await adminApi.createProduct(fd);
                setSuccess('Product created successfully!');
                setTimeout(() => navigate('/admin/products'), 1200);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to save product');
        } finally {
            setLoading(false);
        }
    }

    if (pageLoading) return (
        <div className="flex items-center justify-center py-24">
            <svg className="h-8 w-8 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
        </div>
    );

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center gap-4">
                <button type="button" onClick={() => navigate('/admin/products')} className="btn-ghost px-2 py-1.5 text-sm">← Back</button>
                <h1 className="text-2xl font-extrabold text-slate-900">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

            <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px]">
                {/* Left */}
                <div className="space-y-5">
                    {/* Basic info */}
                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800">Product Information</h2>
                        <div>
                            <label className="label">Product Name *</label>
                            <input type="text" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Classic Polo Shirt" />
                        </div>
                        <div>
                            <label className="label">Short Description</label>
                            <input type="text" className="input" value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="One-line summary shown on product cards" />
                        </div>
                        <div>
                            <label className="label">Full Description</label>
                            <textarea rows={5} className="input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detailed product description…" />
                        </div>
                    </section>

                    {/* Sizes */}
                    <section className="card p-5 space-y-3">
                        <h2 className="font-bold text-slate-800">Sizes</h2>
                        <div className="flex gap-2">
                            <input type="text" className="input" value={sizeInput} onChange={(e) => setSizeInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }}
                                placeholder="e.g. S, M, L, XL, XXL" />
                            <button type="button" onClick={addSize} className="btn-outline px-4 py-2 text-sm shrink-0">Add</button>
                        </div>
                        {sizes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {sizes.map((s) => (
                                    <span key={s} className="flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                                        {s}
                                        <button type="button" onClick={() => removeSize(s)} className="ml-1 text-slate-400 hover:text-red-500">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Colours */}
                    <section className="card p-5 space-y-3">
                        <h2 className="font-bold text-slate-800">Colours</h2>
                        <div className="flex gap-2">
                            <input type="text" className="input" value={colourName} onChange={(e) => setColourName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColour(); } }}
                                placeholder="e.g. Navy Blue" />
                            <input type="color" value={colourHex} onChange={(e) => setColourHex(e.target.value)}
                                className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300" />
                            <button type="button" onClick={addColour} className="btn-outline px-4 py-2 text-sm shrink-0">Add</button>
                        </div>
                        {colours.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {colours.map((c) => (
                                    <span key={c.name} className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                                        <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: c.hex }} />
                                        {c.name}
                                        <button type="button" onClick={() => removeColour(c.name)} className="ml-1 text-slate-400 hover:text-red-500">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Images */}
                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800">Product Images</h2>
                        {existingImages.length > 0 && (
                            <div>
                                <p className="mb-2 text-xs font-medium text-slate-500">Current Images</p>
                                <div className="flex flex-wrap gap-3">
                                    {existingImages.map((img, i) => (
                                        <div key={img} className="group relative">
                                            <img src={img} alt={`Image ${i + 1}`}
                                                className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/96x96/e2e8f0/94a3b8?text=IMG'; }} />
                                            <button type="button" onClick={() => deleteExistingImage(i)}
                                                className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white group-hover:flex">
                                                ×
                                            </button>
                                            {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-brand-800/80 px-1 text-xs text-white">Main</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="mb-2 text-xs font-medium text-slate-500">Add New Images</p>
                            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" id="prod-img-input" />
                            <label htmlFor="prod-img-input"
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-6 text-sm font-medium text-slate-500 hover:border-brand-400 hover:text-brand-700">
                                📷 Click to select images (JPG, PNG, WEBP)
                            </label>
                            {newPreviews.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-3">
                                    {newPreviews.map((src, i) => (
                                        <div key={src} className="group relative">
                                            <img src={src} alt="preview" className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />
                                            <button type="button" onClick={() => removeNewFile(i)}
                                                className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white group-hover:flex">
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right sidebar */}
                <div className="space-y-5">
                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800">Pricing & Stock</h2>
                        <div>
                            <label className="label">Price (₦) *</label>
                            <input type="number" min="0" step="0.01" className="input" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00" />
                        </div>
                        <div>
                            <label className="label">Stock Quantity</label>
                            <input type="number" min="0" className="input" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
                            <p className="mt-1 text-xs text-slate-400">Set 0 if not tracking stock.</p>
                        </div>
                    </section>

                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800">Category & Status</h2>
                        <div>
                            <label className="label">Category *</label>
                            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                                <option value="">Select category…</option>
                                {categories.map((c) => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Availability</label>
                            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                                {STATUSES.map((s) => (
                                    <option key={s} value={s}>{s === 'AVAILABLE' ? 'Available' : s === 'SOLD_OUT' ? 'Sold Out' : 'Coming Soon'}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Sort Order</label>
                            <input type="number" min="0" className="input" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
                            <p className="mt-1 text-xs text-slate-400">Lower numbers appear first.</p>
                        </div>
                    </section>

                    <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                                Saving…
                            </span>
                        ) : isEdit ? 'Save Changes' : 'Create Product'}
                    </button>
                </div>
            </form>
        </div>
    );
}
