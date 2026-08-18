import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import type { AdminOrder } from '../types';
import {
    ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
    PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
    ORDER_STATUSES, PAYMENT_STATUSES,
} from '../types';

function fmt(n: number) { return `₦${n.toLocaleString('en-NG')}`; }
function fmtDate(d?: string) {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
}

export function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<AdminOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [saving, setSaving] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState('');
    const [receiptLoading, setReceiptLoading] = useState(false);

    // Editable fields
    const [orderStatus, setOrderStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

    function load() {
        if (!id) return;
        setLoading(true);
        adminApi.getOrder(id)
            .then((r) => {
                setOrder(r.order);
                setOrderStatus(r.order.orderStatus);
                setPaymentStatus(r.order.payment.status);
                setAdminNotes(r.order.adminNotes || '');
                setRejectionReason(r.order.payment.rejectionReason || '');
            })
            .catch((e) => setError(e.message || 'Failed to load order'))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, [id]);

    async function handleSave() {
        if (!id || !order) return;
        setSaving(true);
        try {
            const updated = await adminApi.updateOrder(id, {
                orderStatus,
                paymentStatus,
                adminNotes,
                rejectionReason: paymentStatus === 'REJECTED' ? rejectionReason : undefined,
            });
            setOrder(updated.order);
            showToast('Order updated successfully.');
        } catch (e: any) {
            showToast(e.message || 'Failed to update order');
        } finally {
            setSaving(false);
        }
    }

    async function loadReceipt() {
        if (!id) return;
        setReceiptLoading(true);
        try {
            const r = await adminApi.getReceiptUrl(id);
            setReceiptUrl(r.url);
            window.open(r.url, '_blank');
        } catch (e: any) {
            showToast(e.message || 'Could not load receipt');
        } finally {
            setReceiptLoading(false);
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <svg className="h-8 w-8 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
        </div>
    );

    if (error || !order) return (
        <div className="space-y-4">
            <button type="button" onClick={() => navigate('/admin/orders')} className="btn-ghost text-sm">← Back to Orders</button>
            <div className="card border-red-200 bg-red-50 p-6 text-red-700">{error || 'Order not found'}</div>
        </div>
    );

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center gap-4">
                <button type="button" onClick={() => navigate('/admin/orders')} className="btn-ghost px-2 py-1.5 text-sm">← Back</button>
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900">Order {order.orderNumber}</h1>
                    <p className="text-sm text-slate-500">{fmtDate(order.createdAt)}</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* Left */}
                <div className="space-y-5">
                    {/* Customer */}
                    <section className="card p-5">
                        <h2 className="mb-3 font-bold text-slate-800">Customer Details</h2>
                        <dl className="grid gap-2 sm:grid-cols-2">
                            {[
                                ['Full Name', order.customer.fullName],
                                ['Phone', order.customer.phone],
                                ['Email', order.customer.email],
                                ['State', order.customer.state],
                                ['City', order.customer.city],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                                    <dd className="text-sm text-slate-800">{value}</dd>
                                </div>
                            ))}
                            <div className="sm:col-span-2">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</dt>
                                <dd className="text-sm text-slate-800">{order.customer.address}</dd>
                            </div>
                            {order.customer.note && (
                                <div className="sm:col-span-2">
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Note</dt>
                                    <dd className="text-sm text-slate-600 italic">{order.customer.note}</dd>
                                </div>
                            )}
                        </dl>
                    </section>

                    {/* Items */}
                    <section className="card p-5">
                        <h2 className="mb-3 font-bold text-slate-800">Order Items</h2>
                        <ul className="divide-y divide-slate-100">
                            {order.items.map((item, i) => (
                                <li key={i} className="flex gap-3 py-3">
                                    <img
                                        src={item.image || 'https://placehold.co/56x56/e2e8f0/94a3b8?text=IMG'}
                                        alt={item.name}
                                        className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/56x56/e2e8f0/94a3b8?text=IMG'; }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800">{item.name}</p>
                                        <p className="text-xs text-slate-500">
                                            Qty: {item.quantity}
                                            {item.size ? ` · Size: ${item.size}` : ''}
                                            {item.colour ? ` · Colour: ${item.colour}` : ''}
                                        </p>
                                        <p className="text-sm font-semibold text-brand-800">{fmt(item.price)} each</p>
                                    </div>
                                    <p className="shrink-0 text-sm font-bold text-slate-800">{fmt(item.price * item.quantity)}</p>
                                </li>
                            ))}
                        </ul>
                        <div className="flex justify-between border-t border-slate-200 pt-3">
                            <span className="font-semibold text-slate-600">Total</span>
                            <span className="text-lg font-extrabold text-brand-800">{fmt(order.total)}</span>
                        </div>
                    </section>

                    {/* Payment */}
                    <section className="card p-5">
                        <h2 className="mb-3 font-bold text-slate-800">Payment Details</h2>
                        <dl className="grid gap-2 sm:grid-cols-2">
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment Status</dt>
                                <dd>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_COLORS[order.payment.status] || 'bg-slate-100 text-slate-700'}`}>
                                        {PAYMENT_STATUS_LABELS[order.payment.status] || order.payment.status}
                                    </span>
                                </dd>
                            </div>
                            {order.payment.reference && (
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment Reference</dt>
                                    <dd className="text-sm font-mono text-slate-800">{order.payment.reference}</dd>
                                </div>
                            )}
                            {order.payment.receiptUploadedAt && (
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Receipt Uploaded</dt>
                                    <dd className="text-sm text-slate-800">{fmtDate(order.payment.receiptUploadedAt)}</dd>
                                </div>
                            )}
                            {order.payment.rejectionReason && (
                                <div className="sm:col-span-2">
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-red-400">Rejection Reason</dt>
                                    <dd className="text-sm text-red-700">{order.payment.rejectionReason}</dd>
                                </div>
                            )}
                        </dl>

                        {/* Receipt button */}
                        {(order.payment.receipt || order.payment.receiptKey) && (
                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={loadReceipt}
                                    disabled={receiptLoading}
                                    className="btn-primary px-4 py-2 text-sm"
                                >
                                    {receiptLoading ? 'Loading…' : '📄 View Receipt'}
                                </button>
                                {receiptUrl && (
                                    <a href={receiptUrl} target="_blank" rel="noreferrer" className="btn-outline px-4 py-2 text-sm">
                                        Open in New Tab
                                    </a>
                                )}
                            </div>
                        )}
                        {!order.payment.receipt && !order.payment.receiptKey && (
                            <p className="mt-3 text-sm text-slate-400">No receipt uploaded yet.</p>
                        )}
                    </section>
                </div>

                {/* Right */}
                <div className="space-y-5">
                    {/* Status management */}
                    <section className="card p-5 space-y-4">
                        <h2 className="font-bold text-slate-800">Update Order Status</h2>
                        <div>
                            <label className="label">Order Status</label>
                            <select className="input" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                                {ORDER_STATUSES.map((s) => (
                                    <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Payment Status</label>
                            <select className="input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                                {PAYMENT_STATUSES.map((s) => (
                                    <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>

                        {paymentStatus === 'REJECTED' && (
                            <div>
                                <label className="label">Rejection Reason</label>
                                <textarea
                                    rows={3}
                                    className="input"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Explain why payment was rejected…"
                                />
                            </div>
                        )}

                        <div>
                            <label className="label">Admin Notes</label>
                            <textarea
                                rows={3}
                                className="input"
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Internal notes about this order…"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary w-full py-3"
                        >
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </section>

                    {/* Current status summary */}
                    <section className="card p-5 space-y-3">
                        <h2 className="font-bold text-slate-800">Current Status</h2>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Order</span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[order.orderStatus] || 'bg-slate-100 text-slate-700'}`}>
                                {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Payment</span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_COLORS[order.payment.status] || 'bg-slate-100 text-slate-700'}`}>
                                {PAYMENT_STATUS_LABELS[order.payment.status] || order.payment.status}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Order #</span>
                            <span className="font-mono text-sm font-bold text-brand-800">{order.orderNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Total</span>
                            <span className="text-sm font-bold text-slate-800">{fmt(order.total)}</span>
                        </div>
                    </section>
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}
