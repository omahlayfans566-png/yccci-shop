import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import type { AdminProduct, Category } from '../types';

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'];
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
    const [customSize, setCustomSize] = useState('');
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
        adminApi.listCategories().then((r) => setCategories(r.categories)).catch(() => { });
        if (isEdit && id) {
            setPageLoading(true);
            adminApi.getProduct(id)
                .then((r) => {
                    const p: AdminProduct = r.product;
                    setForm({
                        name: p.name, shortDescription: p.shortDescription || '',
                        description: p.description || '', price: String(p.price),
                        stock: String(p.stock),
                        category: typeof p.category === 'object' ? p.category._id : p.category,
                        status: p.status, sortOrder: String(p.sortOrder || 0),
                    });
                    setSizes(p.sizes || []);
                    setColours((p.colours || []).map((c) => ({ name: c.name, hex: c.hex || '#000000' })));
                    setExistingImages(p.images || []);
                })
                .catch((e: { message?: string }) => setError(e.message || 'Failed to load product'))
                .finally(() => setPageLoading(false));
        }
    }, [id, isEdit]);

    function set(k: keyof FormState, v: string) { setForm((f) => ({ ...f, [k]: v })); }

    function togglePresetSize(s: string) {
        setSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    }

    function addCustomSize() {
        // Support comma-separated input: "S,M,L,XL" → ['S','M','L','XL']
        const parts = customSize.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
        const toAdd = parts.filter((s) => !sizes.includes(s));
        if (toAdd.length > 0) setSizes((prev) => [...prev, ...toAdd]);
        setCustomSize('');
    }

    function removeSize(s: string) { setSizes((prev) => prev.filter((x) => x !== s)); }

    function addColour() {
        const n = colourName.trim();
        if (n && !colours.find((c) => c.name.toLowerCase() === n.toLowerCase())) {
            setColours((prev) => [...prev, { name: n, hex: colourHex }]);
        }
        setColourName(''); setColourHex('#000000');
    }
    function removeColour(n: string) { setColours((prev) => prev.filter((c) => c.name !== n)); }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []).filter((f) =>
            ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
        );
        setNewFiles((prev) => [...prev, ...files]);
        setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
        if (fileRef.current) fileRef.current.value = '';
    }

    function removeNewFile(i: number) {
        URL.revokeObjectURL(newPreviews[i]);
        setNewFiles((f) => f.filter((_, j) => j !== i));
        setNewPreviews((p) => p.filter((_, j) => j !== i));
    }

    async function deleteExistingImage(idx: number) {
        if (!id || !confirm('Delete this image?')) return;
        try {
            await adminApi.deleteProductImage(id, idx);
            setExistingImages((prev) => prev.filter((_, i) => i !== idx));
        } catch (e: unknown) {
            setError((e as { message?: string }).message || 'Failed to delete image');
        }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(''); setSuccess('');
        if (!form.name.trim()) { setError('Product name is required.'); return; }
        if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) { setError('Valid price is required.'); return; }
        if (!form.category) { setError('Please select a category.'); return; }

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
                setNewFiles([]); setNewPreviews([]);
            } else {
                await adminApi.createProduct(fd);
                setSuccess('Product created! Redirecting…');
                setTimeout(() => navigate('/admin/products'), 1500);
            }
        } catch (e: unknown) {
            setError((e as { message?: string }).message || 'Failed to save product');
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
        <div className="mx-auto max-w-4xl space-y-6 pb-12">
            <div className="flex items-center gap-4">
                <button type="button" onClick={() => navigate('/admin/products')} className="btn-ghost px-2 py-1.5 text-sm">← Back</button>
                <h1 className="text-2xl font-extrabold text-slate-900">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {error}
                </div>
            )}
            {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    ✓ {success}
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
                {/* ── Left column ── */}
                <div className="space-y-5">

                    {/* Basic info */}
                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800 text-base">Product Information</h2>
                        <div>
                            <label className="label">Product Name *</label>
                            <input type="text" className="input" value={form.name}
                                onChange={(e) => set('name', e.target.value)} placeholder="Enter product name" />
                        </div>
                        <div>
                            <label className="label">Short Description <span className="text-slate-400 font-normal">(shown on product cards)</span></label>
                            <input type="text" className="input" value={form.shortDescription}
                                onChange={(e) => set('shortDescription', e.target.value)}
                                placeholder="Brief one-line summary" />
                        </div>
                        <div>
                            <label className="label">Full Description</label>
                            <textarea rows={6} className="input resize-none" value={form.description}
                                onChange={(e) => set('description', e.target.value)}
                                placeholder="Detailed product description, material, care instructions…" />
                        </div>
                    </section>

                    {/* ── Sizes — premium grid selector ── */}
                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800 text-base">Sizes</h2>
                        <p className="text-xs text-slate-500">Click to toggle. Add custom sizes below.</p>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_SIZES.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => togglePresetSize(s)}
                                    className={`min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${sizes.includes(s)
                                        ? 'border-brand-600 bg-brand-700 text-white shadow-sm'
                                        : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Custom size input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="input flex-1"
                                value={customSize}
                                onChange={(e) => setCustomSize(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
                                placeholder="Custom size (e.g. 42, Tall, Petite)"
                            />
                            <button type="button" onClick={addCustomSize} className="btn-outline px-4 shrink-0">Add</button>
                        </div>

                        {/* Non-preset selected sizes */}
                        {sizes.filter((s) => !PRESET_SIZES.includes(s)).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {sizes.filter((s) => !PRESET_SIZES.includes(s)).map((s) => (
                                    <span key={s} className="flex items-center gap-1 rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800">
                                        {s}
                                        <button type="button" onClick={() => removeSize(s)} className="ml-1 text-brand-400 hover:text-red-500" aria-label={`Remove ${s}`}>×</button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {sizes.length === 0 && (
                            <p className="text-xs text-slate-400">No sizes selected — product will not require size selection.</p>
                        )}
                    </section>

                    {/* ── Colours — premium picker ── */}
                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800 text-base">Colours</h2>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                className="input flex-1"
                                value={colourName}
                                onChange={(e) => setColourName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColour(); } }}
                                placeholder="Colour name (e.g. Navy Blue)"
                            />
                            <div className="relative shrink-0">
                                <input
                                    type="color"
                                    value={colourHex}
                                    onChange={(e) => setColourHex(e.target.value)}
                                    className="h-10 w-12 cursor-pointer rounded-lg border border-slate-300 p-0.5"
                                    title="Pick colour"
                                />
                            </div>
                            <button type="button" onClick={addColour} className="btn-outline px-4 shrink-0">Add</button>
                        </div>

                        {colours.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {colours.map((c) => (
                                    <span key={c.name}
                                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                                        <span className="h-5 w-5 rounded-full border border-slate-200 shadow-inner shrink-0"
                                            style={{ backgroundColor: c.hex }} />
                                        {c.name}
                                        <button type="button" onClick={() => removeColour(c.name)}
                                            className="ml-1 text-slate-400 hover:text-red-500" aria-label={`Remove ${c.name}`}>×</button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {colours.length === 0 && (
                            <p className="text-xs text-slate-400">No colours added — product will not require colour selection.</p>
                        )}
                    </section>

                    {/* Images */}
                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800 text-base">Product Images</h2>

                        {existingImages.length > 0 && (
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Saved Images</p>
                                <div className="flex flex-wrap gap-3">
                                    {existingImages.map((img, i) => (
                                        <div key={`${img}-${i}`} className="group relative">
                                            <img src={img} alt={`Image ${i + 1}`}
                                                className="h-24 w-24 rounded-xl border border-slate-200 object-cover shadow-sm"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            <button type="button" onClick={() => deleteExistingImage(i)}
                                                className="absolute -right-2 -top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white shadow group-hover:flex hover:bg-red-600"
                                                aria-label="Delete image">
                                                ×
                                            </button>
                                            {i === 0 && (
                                                <span className="absolute bottom-1 left-1 rounded-md bg-brand-800/80 px-1.5 py-0.5 text-xs font-semibold text-white">
                                                    Main
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileChange} className="hidden" id="prod-img-input" />
                            <label htmlFor="prod-img-input"
                                className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-center transition-colors ${newPreviews.length > 0 || existingImages.length > 0
                                        ? 'border-emerald-300 hover:border-brand-400 hover:bg-brand-50'
                                        : 'border-amber-300 bg-amber-50 hover:border-brand-400 hover:bg-brand-50'
                                    }`}>
                                <svg className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M12 16V4m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" />
                                </svg>
                                <p className="text-sm font-medium text-slate-600">Click to upload images</p>
                                <p className="text-xs text-slate-400">JPG, PNG, WEBP · Max 10 MB each</p>
                                {newPreviews.length === 0 && existingImages.length === 0 && (
                                    <p className="text-xs font-semibold text-amber-600 mt-1">⚠ No image selected — product will display without an image</p>
                                )}
                            </label>

                            {newPreviews.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-3">
                                    {newPreviews.map((src, i) => (
                                        <div key={src} className="group relative">
                                            <img src={src} alt="preview"
                                                className="h-24 w-24 rounded-xl border border-emerald-200 object-cover shadow-sm" />
                                            <button type="button" onClick={() => removeNewFile(i)}
                                                className="absolute -right-2 -top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white shadow group-hover:flex">
                                                ×
                                            </button>
                                            <span className="absolute bottom-1 left-1 rounded-md bg-emerald-600/80 px-1.5 py-0.5 text-xs font-semibold text-white">
                                                New
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* ── Right sidebar ── */}
                <div className="space-y-5">
                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800 text-base">Pricing & Stock</h2>
                        <div>
                            <label className="label">Price (₦) *</label>
                            <input type="number" min="0" step="1" className="input" value={form.price}
                                onChange={(e) => set('price', e.target.value)} placeholder="0" />
                        </div>
                        <div>
                            <label className="label">Stock Quantity</label>
                            <input type="number" min="0" className="input" value={form.stock}
                                onChange={(e) => set('stock', e.target.value)} />
                            <p className="mt-1 text-xs text-slate-400">Set 0 if stock tracking is not needed.</p>
                        </div>
                    </section>

                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800 text-base">Category & Availability</h2>
                        <div>
                            <label className="label">Category *</label>
                            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                                <option value="">Select a category…</option>
                                {categories.map((c) => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                            {categories.length === 0 && (
                                <p className="mt-1 text-xs text-amber-600">No categories yet. Create one in Categories first.</p>
                            )}
                        </div>
                        <div>
                            <label className="label">Availability Status</label>
                            <div className="grid grid-cols-1 gap-2">
                                {STATUSES.map((s) => {
                                    const labels = { AVAILABLE: 'Available', SOLD_OUT: 'Sold Out', COMING_SOON: 'Coming Soon' };
                                    const colors = {
                                        AVAILABLE: form.status === s ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700',
                                        SOLD_OUT: form.status === s ? 'border-red-400 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-700',
                                        COMING_SOON: form.status === s ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-700',
                                    };
                                    return (
                                        <button key={s} type="button" onClick={() => set('status', s)}
                                            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold text-left transition-all ${colors[s]}`}>
                                            {form.status === s && <span className="mr-2">✓</span>}
                                            {labels[s]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label className="label">Sort Order</label>
                            <input type="number" min="0" className="input" value={form.sortOrder}
                                onChange={(e) => set('sortOrder', e.target.value)} />
                            <p className="mt-1 text-xs text-slate-400">Lower = appears first in shop.</p>
                        </div>
                    </section>

                    <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base font-bold">
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                                {isEdit ? 'Saving Changes…' : 'Creating Product…'}
                            </span>
                        ) : isEdit ? 'Save Changes' : 'Create Product'}
                    </button>

                    {isEdit && (
                        <button type="button" onClick={() => navigate('/admin/products')}
                            className="btn-outline w-full py-2.5 text-sm">
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
