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

  async function handleSubmit(e: FormEvent) {
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

            <PaymentInfo settings={paymentSettings} loading={settingsLoading} />
            <ReceiptUpload file={receipt} onFileChange={setReceipt} paymentRef={paymentRef} onPaymentRefChange={setPaymentRef} />
          </div>

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

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5">
              {submitting ? (
                <><Spinner className="h-5 w-5" /> Submitting Order…</>
              ) : 'Place Order'}
            </button>
            <p className="text-center text-xs text-slate-500">
              By placing this order you agree to our terms and delivery policy.
            </p>
          </aside>
        </form>
      </main>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}
