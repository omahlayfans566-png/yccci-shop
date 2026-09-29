import { useState, useRef, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Spinner } from '../components/Spinner';
import { useCart } from '../context/CartContext';
import { shopApi } from '../api/shopApi';
import { ApiError } from '../api/client';
import { formatMoney, resolveMediaUrl } from '../utils/format';
import type { SubmitOrderResponse } from '../types';

const SESSION_KEY = 'shop_last_order';

export function CheckoutPage() {
  const { lines, subtotal, itemCount, isEmpty, clear } = useCart();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittedForRef = useRef(false);

  function validateEmail(): boolean {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email address is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  }

  async function handlePaystackCheckout(e: FormEvent) {
    e.preventDefault();
    if (!validateEmail()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (submittedForRef.current || submitting) return;
    submittedForRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const customerEmail = email.trim().toLowerCase();

    try {
      // 1. Create order record (initial payment status is PENDING)
      const payload = {
        customer: {
          email: customerEmail,
        },
        items: lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          price: l.price,
          quantity: l.qty,
          size: l.size,
          colour: l.colour,
        })),
        paymentRef: '',
      };

      const result: SubmitOrderResponse = await shopApi.submitOrder(payload);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
      sessionStorage.setItem('shop_last_email', customerEmail);
      sessionStorage.setItem('shop_payment_method', 'paystack');

      // 2. Initialize Paystack payment
      const paystackResult = await shopApi.paystackInitialize(result.order.orderNumber, customerEmail);
      if (!paystackResult.success || !paystackResult.authorizationUrl) {
        throw new Error('Payment could not be initialized. Please try again.');
      }

      // 3. Store reference for verification upon return
      try {
        sessionStorage.setItem(`paystack_ref_${result.order.orderNumber}`, paystackResult.reference);
        sessionStorage.setItem('shop_paystack_ref', paystackResult.reference);
      } catch {
        /* non-fatal */
      }

      // 4. Clear the cart
      clear();

      // 5. Redirect directly to Paystack's secure payment gateway
      window.location.href = paystackResult.authorizationUrl;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not complete Paystack checkout. Please try again.';
      setSubmitError(message);
      setSubmitting(false);
      submittedForRef.current = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (isEmpty && !submitting) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <div className="card flex flex-col items-center gap-4 p-12 text-center">
            <p className="text-5xl">🧾</p>
            <h1 className="text-xl font-bold text-slate-800">Your cart is empty</h1>
            <p className="text-sm text-slate-500">Add products before checking out.</p>
            <Link to="/" className="btn-primary px-6 py-2.5">
              Browse Products
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Checkout</h1>
          <p className="text-sm text-slate-500">Complete your payment securely with Paystack.</p>
        </div>

        {submitError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {submitError}
          </div>
        )}

        <form onSubmit={handlePaystackCheckout} noValidate className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {/* Customer Contact Information */}
            <section className="card p-6 bg-white shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-800">Contact Information</h2>
              </div>

              <div>
                <label htmlFor="customerEmail" className="label text-sm font-semibold text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="customerEmail"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="your.email@example.com"
                  className={`input w-full mt-1 ${emailError ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                />
                {emailError && <p className="mt-1 text-xs font-medium text-red-600">{emailError}</p>}
                <p className="mt-1.5 text-xs text-slate-500">
                  Required for payment receipt and order confirmation.
                </p>
              </div>
            </section>

            {/* Payment Method - Paystack Only */}
            <section className="card overflow-hidden bg-white shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 p-6 border-b border-slate-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                  2
                </span>
                <h2 className="text-base font-bold text-slate-800">Payment Method</h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Paystack active card */}
                <div className="rounded-xl border-2 border-brand-500 bg-brand-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand-600 bg-brand-600">
                        <span className="h-2 w-2 rounded-full bg-white" />
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">Paystack</p>
                        <p className="text-xs text-slate-600">Debit / Credit Card, Bank Transfer, USSD, Apple Pay</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Instant &amp; Secure
                    </span>
                  </div>
                </div>

                {/* Security badges */}
                <div className="rounded-lg bg-slate-50 p-3.5 space-y-2 border border-slate-200/60">
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                    <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Automatic server-side payment confirmation
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    End-to-end 256-bit SSL encrypted &amp; PCI-DSS compliant
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Order Summary Sidebar */}
          <aside className="h-fit space-y-4 lg:sticky lg:top-20">
            <div className="card p-6 bg-white shadow-sm border border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Order Summary</h2>

              <ul className="mt-4 divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {lines.map((line) => (
                  <li key={line.key} className="flex gap-3 py-3">
                    <img
                      src={resolveMediaUrl(line.image)}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{line.name}</p>
                      <p className="text-xs text-slate-500">
                        {[line.qty > 1 && `Qty: ${line.qty}`, line.size && `Size: ${line.size}`, line.colour && `Colour: ${line.colour}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-brand-800">{formatMoney(line.price * line.qty)}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 border-t border-slate-200 pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Total Items</span>
                  <span className="font-semibold">{itemCount}</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Due</span>
                  <span className="text-xl text-brand-800">{formatMoney(subtotal)}</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Spinner className="h-5 w-5" />
                      <span>Connecting to Paystack…</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Pay with Paystack</span>
                    </>
                  )}
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-slate-500">
                You will be securely redirected to Paystack to complete your payment.
              </p>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
