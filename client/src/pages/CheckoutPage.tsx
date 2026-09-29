import { useState, useRef } from 'react';
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittedForRef = useRef(false);

  async function handlePaystackCheckout() {
    if (submittedForRef.current || submitting) return;
    submittedForRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create order record with cart items
      const payload = {
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
      sessionStorage.setItem('shop_payment_method', 'paystack');

      // 2. Initialize Paystack payment
      const paystackResult = await shopApi.paystackInitialize(result.order.orderNumber);
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
          <div className="card flex flex-col items-center gap-4 p-12 text-center bg-white shadow-sm border border-slate-200">
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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Checkout</h1>
          <p className="text-sm text-slate-500">Review your order and proceed to payment.</p>
        </div>

        {submitError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {submitError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Order Items Review */}
          <div className="space-y-6">
            <section className="card p-6 bg-white shadow-sm border border-slate-200">
              <h2 className="text-base font-bold text-slate-800 mb-4">Order Items ({itemCount})</h2>

              <ul className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <li key={line.key} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <img
                      src={resolveMediaUrl(line.image)}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-800">{line.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[line.qty > 1 && `Qty: ${line.qty}`, line.size && `Size: ${line.size}`, line.colour && `Colour: ${line.colour}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-1 text-sm font-bold text-brand-800">{formatMoney(line.price * line.qty)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Payment Provider Information */}
            <section className="card p-5 bg-white shadow-sm border border-slate-200">
              <h2 className="text-base font-bold text-slate-800 mb-3">Payment</h2>

              <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand-600 bg-brand-600">
                      <span className="h-2 w-2 rounded-full bg-white" />
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Paystack Secure Payment</p>
                      <p className="text-xs text-slate-600">Debit / Credit Card, Bank Transfer, USSD, Apple Pay</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Secured
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>256-bit SSL encrypted payment verification</span>
              </div>
            </section>
          </div>

          {/* Order Summary & Pay Button */}
          <aside className="h-fit space-y-4 lg:sticky lg:top-20">
            <div className="card p-6 bg-white shadow-sm border border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Order Summary</h2>

              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal ({itemCount} item{itemCount === 1 ? '' : 's'})</span>
                  <span className="font-semibold text-slate-800">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span className="text-xl text-brand-800">{formatMoney(subtotal)}</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handlePaystackCheckout}
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

              <p className="mt-3 text-center text-xs text-slate-400">
                You will be redirected to Paystack to complete your payment securely.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
