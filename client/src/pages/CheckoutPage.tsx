import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { PaymentInfo } from '../components/PaymentInfo';
import { ReceiptUpload } from '../components/ReceiptUpload';
import { Spinner } from '../components/Spinner';
import { useCart } from '../context/CartContext';
import { shopApi } from '../api/shopApi';
import { ApiError } from '../api/client';
import { formatMoney, resolveMediaUrl } from '../utils/format';
import type { PaymentSettings, SubmitOrderResponse } from '../types';

const SESSION_KEY = 'shop_last_order';

type PaymentMethod = 'paystack' | 'bank_transfer';

interface FormState {
  fullName: string; phone: string; email: string;
  address: string; state: string; city: string; note: string;
}
const EMPTY_FORM: FormState = { fullName: '', phone: '', email: '', address: '', state: '', city: '', note: '' };

export function CheckoutPage() {
  const { lines, subtotal, itemCount, isEmpty, clear } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paystack');
  const submittedForRef = useRef(false);

  useEffect(() => {
    let active = true;
    shopApi.paymentSettings()
      .then((s) => { if (active) setPaymentSettings(s); })
      .catch(() => { if (active) setPaymentSettings(null); })
      .finally(() => { if (active) setSettingsLoading(false); });
    return () => { active = false; };
  }, []);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (form.fullName.trim().length < 2) errors.fullName = 'Full name is required';
    if (!/^[+\d][\d\s-]{5,}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
    if (form.address.trim().length < 5) errors.address = 'Delivery address is required';
    if (form.state.trim().length < 2) errors.state = 'State is required';
    if (form.city.trim().length < 2) errors.city = 'City is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ---------------------------------------------------------------------------
  // Bank transfer submit (existing flow — unchanged)
  // ---------------------------------------------------------------------------
  async function handleBankTransferSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (submittedForRef.current) return;
    submittedForRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        customer: {
          fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim(),
          address: form.address.trim(), state: form.state.trim(), city: form.city.trim(), note: form.note.trim(),
        },
        items: lines.map((l) => ({
          productId: l.productId, name: l.name, price: l.price,
          quantity: l.qty, size: l.size, colour: l.colour,
        })),
        paymentRef: paymentRef.trim(),
      };
      const result: SubmitOrderResponse = await shopApi.submitOrder(payload, receipt ?? undefined);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
      sessionStorage.setItem('shop_last_email', payload.customer.email);
      clear();
      navigate(`/order-success/${result.order.orderNumber}`, { replace: true });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not submit your order. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
      window.setTimeout(() => { submittedForRef.current = false; }, 0);
    }
  }

  // ---------------------------------------------------------------------------
  // Paystack flow — Step 1: create the order, then redirect to Paystack
  // The PaystackButton calls this after the form passes validation.
  // ---------------------------------------------------------------------------
  async function handlePaystackCheckout() {
    if (!validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return false; }
    if (submittedForRef.current) return false;
    submittedForRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create the order record (payment status will be PENDING)
      const payload = {
        customer: {
          fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim(),
          address: form.address.trim(), state: form.state.trim(), city: form.city.trim(), note: form.note.trim(),
        },
        items: lines.map((l) => ({
          productId: l.productId, name: l.name, price: l.price,
          quantity: l.qty, size: l.size, colour: l.colour,
        })),
        paymentRef: '',
      };
      const result: SubmitOrderResponse = await shopApi.submitOrder(payload);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
      sessionStorage.setItem('shop_last_email', payload.customer.email);
      // Store the chosen payment method so OrderSuccessPage knows to poll/verify
      sessionStorage.setItem('shop_payment_method', 'paystack');
      clear();
      return result.order.orderNumber;
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not create your order. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      submittedForRef.current = false;
      setSubmitting(false);
      return false;
    }
  }

  // Called by PaystackButton once the authorization URL is obtained.
  // At this point the redirect is happening — nothing more to do in this component.
  function handlePaystackInitialized(reference: string) {
    // Store reference so OrderSuccessPage / callback page can verify it
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { order: { orderNumber: string } };
        sessionStorage.setItem(`paystack_ref_${parsed.order.orderNumber}`, reference);
      }
      sessionStorage.setItem('shop_paystack_ref', reference);
    } catch { /* non-fatal */ }
  }

  function handlePaystackError(message: string) {
    setSubmitError(message);
    setSubmitting(false);
    submittedForRef.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (isEmpty && !submitting) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <div className="card flex flex-col items-center gap-4 p-12 text-center">
            <p className="text-5xl">🧾</p>
            <h1 className="text-xl font-bold text-slate-800">Your cart is empty</h1>
            <p className="text-sm text-slate-500">Add products before checking out.</p>
            <Link to="/" className="btn-primary px-6 py-2.5">Browse Products</Link>
          </div>
        </main>
      </div>
    );
  }

  // Wrapper submit: route to the right handler depending on selected method
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (paymentMethod === 'bank_transfer') {
      await handleBankTransferSubmit(e);
    }
    // Paystack path is handled by PaystackCheckoutButton click, not form submit
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="mb-5 text-2xl font-extrabold text-slate-900">Checkout</h1>

        {submitError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Delivery details */}
            <section className="card p-5">
              <h2 className="text-base font-bold text-slate-800">Delivery Details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="fullName" className="label">Full Name *</label>
                  <input id="fullName" type="text" autoComplete="name" className="input" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
                  {fieldErrors.fullName && <FieldError message={fieldErrors.fullName} />}
                </div>
                <div>
                  <label htmlFor="phone" className="label">Phone Number *</label>
                  <input id="phone" type="tel" autoComplete="tel" className="input" placeholder="e.g. 08012345678" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  {fieldErrors.phone && <FieldError message={fieldErrors.phone} />}
                </div>
                <div>
                  <label htmlFor="email" className="label">Email *</label>
                  <input id="email" type="email" autoComplete="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
                  {fieldErrors.email && <FieldError message={fieldErrors.email} />}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="label">Delivery Address *</label>
                  <textarea id="address" rows={2} className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
                  {fieldErrors.address && <FieldError message={fieldErrors.address} />}
                </div>
                <div>
                  <label htmlFor="state" className="label">State *</label>
                  <input id="state" type="text" className="input" value={form.state} onChange={(e) => set('state', e.target.value)} />
                  {fieldErrors.state && <FieldError message={fieldErrors.state} />}
                </div>
                <div>
                  <label htmlFor="city" className="label">City *</label>
                  <input id="city" type="text" className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
                  {fieldErrors.city && <FieldError message={fieldErrors.city} />}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="note" className="label">Additional Note (optional)</label>
                  <textarea id="note" rows={2} className="input" value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Landmark, delivery time preference, etc." />
                </div>
              </div>
            </section>

            {/* Payment method selector */}
            <section className="card p-5">
              <h2 className="text-base font-bold text-slate-800">Payment Method</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${paymentMethod === 'paystack'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paystack"
                    checked={paymentMethod === 'paystack'}
                    onChange={() => setPaymentMethod('paystack')}
                    className="accent-brand-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Pay with Card / Bank</p>
                    <p className="text-xs text-slate-500">Secured by Paystack — card, bank transfer, USSD</p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${paymentMethod === 'bank_transfer'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="accent-brand-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Manual Bank Transfer</p>
                    <p className="text-xs text-slate-500">Transfer to our account &amp; upload receipt</p>
                  </div>
                </label>
              </div>
            </section>

            {/* Payment method details */}
            {paymentMethod === 'paystack' ? (
              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-brand-50 px-5 py-4">
                  <h3 className="text-base font-bold text-brand-900">Pay Securely with Paystack</h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    You'll be redirected to Paystack's secure checkout. Supports card, bank transfer, USSD and more.
                  </p>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Payment is verified automatically — no receipt upload needed.
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Your payment is protected by 256-bit SSL encryption.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <PaymentInfo settings={paymentSettings} loading={settingsLoading} />
                <ReceiptUpload file={receipt} onFileChange={setReceipt} paymentRef={paymentRef} onPaymentRefChange={setPaymentRef} />
              </>
            )}
          </div>

          {/* Order summary sidebar */}
          <aside className="h-fit space-y-4 lg:sticky lg:top-20">
            <div className="card p-5">
              <h2 className="text-base font-bold text-slate-800">Order Summary</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {lines.map((line) => (
                  <li key={line.key} className="flex gap-3 py-3">
                    <img src={resolveMediaUrl(line.image)} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{line.name}</p>
                      <p className="text-xs text-slate-500">
                        {[line.qty, line.size && `Size ${line.size}`, line.colour].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-brand-800">{formatMoney(line.price * line.qty)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-medium text-slate-600">
                  Subtotal ({itemCount} item{itemCount === 1 ? '' : 's'})
                </span>
                <span className="text-lg font-bold text-brand-800">{formatMoney(subtotal)}</span>
              </div>
            </div>

            {/* CTA — switches between Paystack and bank-transfer */}
            {paymentMethod === 'paystack' ? (
              <PaystackCheckoutButton
                form={form}
                lines={lines}
                onPrepare={handlePaystackCheckout}
                onInitialized={handlePaystackInitialized}
                onError={handlePaystackError}
                disabled={submitting}
              />
            ) : (
              <button type="submit" disabled={submitting} className="btn-primary flex w-full items-center justify-center gap-2 py-3.5">
                {submitting ? (
                  <><Spinner className="h-5 w-5" /> Submitting Order…</>
                ) : 'Place Order'}
              </button>
            )}

            <p className="text-center text-xs text-slate-500">
              By placing this order you agree to our terms and delivery policy.
            </p>
          </aside>
        </form>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal Paystack checkout button
// Validates the form, creates the order, then hands off to PaystackButton.
// ---------------------------------------------------------------------------
interface PaystackCheckoutButtonProps {
  form: { email: string; fullName: string };
  lines: unknown[];
  onPrepare: () => Promise<string | false>;
  onInitialized: (ref: string) => void;
  onError: (msg: string) => void;
  disabled: boolean;
}

function PaystackCheckoutButton({
  form,
  onPrepare,
  onInitialized,
  onError,
  disabled,
}: PaystackCheckoutButtonProps) {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  async function handleClick() {
    if (preparing || disabled) return;
    setPreparing(true);
    const result = await onPrepare();
    if (!result) {
      setPreparing(false);
      return;
    }
    // Order created — render PaystackButton which will auto-fire on mount
    setOrderNumber(result);
  }

  if (orderNumber) {
    return (
      // AutoPaystackButton fires handlePay immediately on mount
      <AutoPaystackButton
        orderNumber={orderNumber}
        email={form.email}
        onInitialized={onInitialized}
        onError={(msg) => {
          setOrderNumber(null);
          setPreparing(false);
          onError(msg);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || preparing}
      className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 disabled:opacity-60"
    >
      {preparing ? (
        <><Spinner className="h-5 w-5" /> Preparing order…</>
      ) : (
        <>
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Proceed to Paystack
        </>
      )}
    </button>
  );
}

/**
 * Fires the Paystack payment automatically as soon as the component mounts.
 * Used after the order has been created — no extra click needed.
 */
function AutoPaystackButton({
  orderNumber,
  email,
  onInitialized,
  onError,
}: {
  orderNumber: string;
  email: string;
  onInitialized: (ref: string) => void;
  onError: (msg: string) => void;
}) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    async function fire() {
      try {
        const result = await shopApi.paystackInitialize(orderNumber, email);
        if (!result.success || !result.authorizationUrl) {
          throw new Error('Payment could not be initialized. Please try again.');
        }
        onInitialized(result.reference);
        try { sessionStorage.setItem(`paystack_ref_${orderNumber}`, result.reference); } catch { /* non-fatal */ }
        window.location.href = result.authorizationUrl;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Payment could not be completed. Please try again.';
        onError(message);
      }
    }

    void fire();
  }, [orderNumber, email, onInitialized, onError]);

  return (
    <div className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 opacity-80">
      <Spinner className="h-5 w-5" />
      <span>Redirecting to Paystack…</span>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}
