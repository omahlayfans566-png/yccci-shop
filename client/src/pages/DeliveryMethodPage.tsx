import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { shopApi } from '../api/shopApi';
import { ApiError } from '../api/client';

const DELIVERY_OPTIONS = [
    {
        id: 'pickup',
        icon: '🚚',
        title: 'I will send a logistics rider to pick up my order',
        description: 'You arrange a rider to collect from our location.',
    },
    {
        id: 'delivery',
        icon: '🛵',
        title: 'Please send a logistics rider to deliver my order',
        description: 'We arrange delivery to your provided address.',
    },
];

export function DeliveryMethodPage() {
    const { orderNumber = '' } = useParams();
    const [selected, setSelected] = useState<string>('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const submittedRef = useRef(false);

    const email = (() => {
        try { return sessionStorage.getItem('shop_last_email') || ''; }
        catch { return ''; }
    })();

    // Check if already submitted
    useEffect(() => {
        if (!orderNumber || !email) return;
        shopApi.ordersLookup(orderNumber, email)
            .then((d) => { if (d?.deliveryMethod) setSubmitted(true); })
            .catch(() => { });
    }, [orderNumber, email]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!selected) { setError('Please select a delivery option.'); return; }
        if (submittedRef.current) return;
        submittedRef.current = true;
        setSubmitting(true);
        setError('');
        try {
            await shopApi.submitDeliveryMethod({
                orderNumber,
                email,
                deliveryMethod: DELIVERY_OPTIONS.find((o) => o.id === selected)?.title ?? selected,
                deliveryMessage: message.trim() || undefined,
            });
            setSubmitted(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not save delivery preference. Please try again.');
            submittedRef.current = false;
        } finally {
            setSubmitting(false);
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
                    <div className="card overflow-hidden">
                        <div className="bg-emerald-50 px-6 py-8 text-center">
                            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</span>
                            <h1 className="mt-4 text-xl font-extrabold text-slate-900">Delivery Preference Saved!</h1>
                            <p className="mt-2 text-sm text-slate-600">
                                We've received your delivery instructions. Our team will be in touch.
                            </p>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                <p className="font-semibold text-slate-800 mb-1">Order Number</p>
                                <p className="font-mono text-brand-800">{orderNumber}</p>
                            </div>
                            <Link to="/" className="btn-primary w-full py-3 text-center block">
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
                <div className="card overflow-hidden">
                    {/* Header */}
                    <div className="bg-brand-900 px-6 py-6 text-center">
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-300 mb-1">Order {orderNumber}</p>
                        <h1 className="text-xl font-extrabold text-white">How would you like to receive your order?</h1>
                        <p className="mt-1 text-sm text-brand-200">Select your preferred delivery method below.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5">
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                                {error}
                            </div>
                        )}

                        {/* Delivery option cards */}
                        <div className="space-y-3">
                            {DELIVERY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => { setSelected(opt.id); setError(''); }}
                                    className={`w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${selected === opt.id
                                            ? 'border-brand-600 bg-brand-50'
                                            : 'border-slate-200 bg-white hover:border-brand-300'
                                        }`}
                                    aria-pressed={selected === opt.id}
                                >
                                    <span className="text-3xl mt-0.5 shrink-0">{opt.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-sm leading-snug ${selected === opt.id ? 'text-brand-900' : 'text-slate-800'}`}>
                                            {opt.title}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">{opt.description}</p>
                                    </div>
                                    <span className={`mt-1 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${selected === opt.id
                                            ? 'border-brand-600 bg-brand-600'
                                            : 'border-slate-300'
                                        }`}>
                                        {selected === opt.id && (
                                            <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                                                <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Optional message */}
                        <div>
                            <label htmlFor="delivery-msg" className="label">
                                Additional delivery instructions{' '}
                                <span className="font-normal text-slate-400">(optional)</span>
                            </label>
                            <textarea
                                id="delivery-msg"
                                rows={3}
                                className="input resize-none"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type any additional message or delivery instruction… (landmark, gate code, call before delivery, etc.)"
                                maxLength={1000}
                            />
                            <p className="mt-1 text-xs text-slate-400">{message.length}/1000</p>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !selected}
                            className="btn-primary w-full py-3.5 text-base font-bold"
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    Saving…
                                </span>
                            ) : 'Confirm Delivery Preference'}
                        </button>

                        <p className="text-center text-xs text-slate-400">
                            You can skip this step and come back later if needed.
                        </p>
                        <Link to="/" className="btn-ghost w-full py-2.5 text-sm text-center block">
                            Skip for now — Continue Shopping
                        </Link>
                    </form>
                </div>
            </main>
        </div>
    );
}
