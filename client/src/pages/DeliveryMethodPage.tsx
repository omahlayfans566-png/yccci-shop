import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { shopApi } from '../api/shopApi';
import { ApiError } from '../api/client';

const DELIVERY_OPTIONS = [
    {
        id: 'arrange_logistics',
        icon: '🚚',
        title: 'Please arrange logistics delivery to me',
        description: 'We arrange delivery to your provided address.',
    },
    {
        id: 'send_logistics',
        icon: '🛵',
        title: 'I will send a logistics person to pick up my order',
        description: 'You arrange a rider to collect from our location.',
    },
    {
        id: 'self_pickup',
        icon: '🚶',
        title: 'I will come and pick up my order myself',
        description: 'You come to our location to collect your order in person.',
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

    // Messages thread state
    const [messages, setMessages] = useState<Array<{ from: string; text: string; createdAt: string }>>([]);
    const [msgText, setMsgText] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const [msgError, setMsgError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const email = (() => {
        try { return sessionStorage.getItem('shop_last_email') || ''; }
        catch { return ''; }
    })();

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    function loadMessages() {
        if (!orderNumber || !email) return;
        shopApi.getOrderMessages(orderNumber, email)
            .then((msgs) => { setMessages(msgs); setTimeout(scrollToBottom, 100); })
            .catch(() => { });
    }

    // Check if already submitted + load messages
    useEffect(() => {
        if (!orderNumber || !email) return;
        shopApi.ordersLookup(orderNumber, email)
            .then((d) => { if (d?.deliveryMethod) setSubmitted(true); })
            .catch(() => { });
        loadMessages();
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
            loadMessages();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not save delivery preference. Please try again.');
            submittedRef.current = false;
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSendMessage(e: FormEvent) {
        e.preventDefault();
        if (!msgText.trim() || !email) return;
        setSendingMsg(true);
        setMsgError('');
        try {
            await shopApi.sendCustomerMessage({ orderNumber, email, text: msgText.trim() });
            setMsgText('');
            loadMessages();
        } catch (err) {
            setMsgError(err instanceof ApiError ? err.message : 'Could not send message. Please try again.');
        } finally {
            setSendingMsg(false);
        }
    }

    // Message thread — shown in both submitted and pre-submission states
    const MessageThread = () => (
        <div className="card mt-6 overflow-hidden">
            <div className="bg-slate-800 px-5 py-4">
                <h2 className="font-bold text-white text-sm">💬 Messages — Order {orderNumber}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Send a message to our team or see our replies.</p>
            </div>
            <div className="px-5 py-4 space-y-4">
                {messages.length === 0 ? (
                    <p className="text-sm text-slate-400">No messages yet.</p>
                ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.from === 'admin' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${msg.from === 'admin'
                                    ? 'bg-brand-50 border border-brand-200 text-brand-900 rounded-tl-sm'
                                    : 'bg-slate-800 text-white rounded-tr-sm'
                                    }`}>
                                    <p className="font-semibold text-xs mb-1 opacity-70">
                                        {msg.from === 'admin' ? '🏪 YCCCI Shop' : 'You'}
                                    </p>
                                    <p className="leading-relaxed">{msg.text}</p>
                                    <p className="text-xs mt-1 opacity-50">
                                        {(() => {
                                            try {
                                                return new Date(msg.createdAt).toLocaleString('en-GB', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                });
                                            } catch { return msg.createdAt; }
                                        })()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
                {msgError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{msgError}</div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        className="input flex-1 text-sm"
                        value={msgText}
                        onChange={(e) => setMsgText(e.target.value)}
                        placeholder="Type a message to our team…"
                        maxLength={1000}
                        disabled={sendingMsg}
                    />
                    <button
                        type="submit"
                        disabled={sendingMsg || !msgText.trim()}
                        className="btn-primary px-4 py-2 text-sm shrink-0"
                    >
                        {sendingMsg ? '…' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );

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
                    <MessageThread />
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

                        {/* Custom message */}
                        <div>
                            <label htmlFor="delivery-msg" className="label">
                                Other delivery instructions or message{' '}
                                <span className="font-normal text-slate-400">(optional)</span>
                            </label>
                            <textarea
                                id="delivery-msg"
                                rows={3}
                                className="input resize-none"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="E.g. I have my own dispatch rider. Please contact me before the order is ready."
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

                <MessageThread />
            </main>
        </div>
    );
}
