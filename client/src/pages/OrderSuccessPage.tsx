import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Spinner } from '../components/Spinner';
import { shopApi } from '../api/shopApi';
import { ApiError } from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

const SESSION_KEY = 'shop_last_order';

interface StoredResult {
  order: { orderNumber: string; createdAt: string; total: number };
}

type VerifyState = 'idle' | 'verifying' | 'success' | 'failed' | 'cancelled';

export function OrderSuccessPage() {
  const { orderNumber = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<StoredResult | null>(null);
  const [orderData, setOrderData] = useState<{ receipt: string; total: number; paymentStatus?: string } | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  // Paystack verification state
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');
  const verifiedRef = useRef(false);

  useEffect(() => {
    // Load stored order data from sessionStorage
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) setResult(JSON.parse(raw) as StoredResult);
    } catch { /* ignore */ }

    const email = (() => {
      try { return sessionStorage.getItem('shop_last_email') || undefined; }
      catch { return undefined; }
    })();

    shopApi.ordersLookup(orderNumber, email)
      .then(setOrderData)
      .catch(() => setOrderData(null));

    // -----------------------------------------------------------------------
    // Paystack callback handling
    // When Paystack redirects back it appends:
    //   ?trxref=<reference>&reference=<reference>
    // We pick up the reference, verify with the backend, and show the result.
    // -----------------------------------------------------------------------
    const paystackRef =
      searchParams.get('reference') ||
      searchParams.get('trxref') ||
      (() => {
        try { return sessionStorage.getItem('shop_paystack_ref'); }
        catch { return null; }
      })() ||
      (() => {
        try { return sessionStorage.getItem(`paystack_ref_${orderNumber}`); }
        catch { return null; }
      })();

    const paymentMethod = (() => {
      try { return sessionStorage.getItem('shop_payment_method'); }
      catch { return null; }
    })();

    // Only auto-verify if we have a Paystack reference
    if (paystackRef && !verifiedRef.current) {
      verifiedRef.current = true;
      setVerifyState('verifying');
      verifyPaystackPayment(paystackRef);
    } else if (paymentMethod === 'paystack' && !paystackRef) {
      // Paystack was selected but no reference — might be cancelled
      setVerifyState('cancelled');
      setVerifyMessage('Payment was not completed. You can try again or contact support.');
    }
  }, [orderNumber, searchParams]);

  async function verifyPaystackPayment(reference: string) {
    try {
      // First check local status (webhook may have already processed it)
      try {
        const statusData = await shopApi.paystackStatus(reference);
        if (statusData.status === 'success') {
          setVerifyState('success');
          setVerifyMessage('Payment verified successfully. Your order is confirmed!');
          // Refresh order data
          const email = (() => {
            try { return sessionStorage.getItem('shop_last_email') || undefined; }
            catch { return undefined; }
          })();
          shopApi.ordersLookup(orderNumber, email).then(setOrderData).catch(() => { });
          cleanupPaystackSession();
          return;
        }
        if (statusData.status === 'failed') {
          setVerifyState('failed');
          setVerifyMessage('Payment failed. Please try again or use a different payment method.');
          cleanupPaystackSession();
          return;
        }
      } catch {
        // Status endpoint failed — fall through to live verify
      }

      // Live verification via backend → Paystack API
      const data = await shopApi.paystackVerify(reference);

      if (data.success && data.status === 'success') {
        setVerifyState('success');
        setVerifyMessage('Payment verified successfully. Your order is confirmed!');
        // Refresh order data to show updated payment status
        const email = (() => {
          try { return sessionStorage.getItem('shop_last_email') || undefined; }
          catch { return undefined; }
        })();
        shopApi.ordersLookup(orderNumber, email).then(setOrderData).catch(() => { });
        cleanupPaystackSession();
      } else if (data.status === 'failed') {
        setVerifyState('failed');
        setVerifyMessage('Payment failed. Please try again or use a different payment method.');
        cleanupPaystackSession();
      } else if (data.status === 'abandoned') {
        setVerifyState('cancelled');
        setVerifyMessage('Payment was cancelled. You can try again below.');
        cleanupPaystackSession();
      } else {
        setVerifyState('failed');
        setVerifyMessage(data.message || 'Payment verification failed. Please contact support.');
        cleanupPaystackSession();
      }
    } catch {
      setVerifyState('failed');
      setVerifyMessage('Could not verify payment. Please contact support with your order number.');
    }
  }

  function cleanupPaystackSession() {
    try {
      sessionStorage.removeItem('shop_paystack_ref');
      sessionStorage.removeItem('shop_payment_method');
      sessionStorage.removeItem(`paystack_ref_${orderNumber}`);
    } catch { /* non-fatal */ }
  }

  function goToDelivery() {
    setRedirecting(true);
    navigate(`/delivery-method/${orderNumber}`);
  }

  async function retryPaystackPayment() {
    if (retrying) return;
    setRetrying(true);
    setRetryError(null);

    const email = (() => {
      try { return sessionStorage.getItem('shop_last_email') || ''; }
      catch { return ''; }
    })();

    if (!email) {
      setRetryError('Could not determine your email. Please go back to checkout.');
      setRetrying(false);
      return;
    }

    try {
      const init = await shopApi.paystackInitialize(orderNumber, email);
      if (!init.success || !init.authorizationUrl) {
        throw new Error('Payment could not be initialized. Please try again.');
      }
      // Update stored reference
      try {
        sessionStorage.setItem(`paystack_ref_${orderNumber}`, init.reference);
        sessionStorage.setItem('shop_paystack_ref', init.reference);
        sessionStorage.setItem('shop_payment_method', 'paystack');
      } catch { /* non-fatal */ }
      window.location.href = init.authorizationUrl;
    } catch (err) {
      setRetryError(
        err instanceof ApiError ? err.message :
          err instanceof Error ? err.message :
            'Payment could not be retried. Please contact support.'
      );
      setRetrying(false);
    }
  }

  const isPaystackFlow = verifyState !== 'idle';
  const isVerifying = verifyState === 'verifying';
  const isPaymentSuccess = verifyState === 'success' || orderData?.paymentStatus === 'VERIFIED';
  const isPaymentFailed = verifyState === 'failed';
  const isPaymentCancelled = verifyState === 'cancelled';

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="card overflow-hidden">
          {/* Success header */}
          <div className="bg-emerald-50 px-6 py-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Order Placed!</h1>
            <p className="mt-1 text-sm text-slate-600">
              Your order has been received. We'll process it after verifying your payment.
            </p>
          </div>

          <div className="space-y-5 px-6 py-6">
            {/* Order summary */}
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order Number</dt>
                <dd className="text-lg font-bold text-brand-800">{result?.order.orderNumber ?? orderNumber}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</dt>
                <dd className="text-lg font-bold text-brand-800">
                  {formatMoney(orderData?.total ?? result?.order.total ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date</dt>
                <dd className="text-lg font-medium text-slate-700">
                  {formatDate(result?.order.createdAt) || 'Just now'}
                </dd>
              </div>
            </dl>

            {/* Paystack verification status banner */}
            {isPaystackFlow && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${isVerifying
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : isPaymentSuccess
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : isPaymentFailed
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : isPaymentCancelled
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : ''
                  }`}
                role="status"
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Verifying your payment with Paystack…
                  </span>
                ) : (
                  <span className="flex items-start gap-2">
                    <span className="shrink-0 text-base">
                      {isPaymentSuccess ? '✅' : isPaymentFailed ? '❌' : '⚠️'}
                    </span>
                    {verifyMessage}
                  </span>
                )}
              </div>
            )}

            {/* Bank transfer receipt confirmation */}
            {!isPaystackFlow && orderData?.receipt && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                ✅ Your payment receipt was saved and will be reviewed by our team.
              </div>
            )}

            {/* Failed payment — retry CTA */}
            {(isPaymentFailed || isPaymentCancelled) && (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 space-y-3">
                <h2 className="font-bold text-red-900">Payment Not Completed</h2>
                <p className="text-sm text-red-700">
                  Your order has been saved. You can retry payment below.
                </p>
                {retryError && (
                  <p className="rounded-md bg-red-100 px-3 py-2 text-xs text-red-700">{retryError}</p>
                )}
                <button
                  type="button"
                  onClick={retryPaystackPayment}
                  disabled={retrying}
                  className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-60"
                >
                  {retrying ? (
                    <><Spinner className="h-4 w-4" /> Redirecting to Paystack…</>
                  ) : (
                    <>
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Retry Payment with Paystack
                    </>
                  )}
                </button>
                <Link to="/" className="block text-center text-xs text-slate-500 underline">
                  Continue shopping instead
                </Link>
              </div>
            )}

            {/* Delivery method CTA — only show after successful / bank-transfer orders */}
            {(!isPaystackFlow || isPaymentSuccess) && !isPaymentFailed && !isPaymentCancelled && !isVerifying && (
              <div className="rounded-xl border-2 border-brand-200 bg-brand-50 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚚</span>
                  <div>
                    <h2 className="font-bold text-brand-900">Next Step: Select Delivery Method</h2>
                    <p className="text-sm text-brand-700">Tell us how you'd like to receive your order.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={goToDelivery}
                  disabled={redirecting}
                  className="btn-primary w-full py-3 text-base"
                >
                  {redirecting ? 'Loading…' : 'Choose Delivery Method →'}
                </button>
              </div>
            )}

            {/* What happens next */}
            {(!isPaymentFailed && !isPaymentCancelled) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <h2 className="font-bold text-slate-800">What happens next?</h2>
                <ol className="space-y-2 text-sm text-slate-600">
                  {isPaymentSuccess ? (
                    <>
                      <li className="flex gap-2"><span className="font-bold text-brand-800">1.</span> ✅ Payment confirmed via Paystack.</li>
                      <li className="flex gap-2"><span className="font-bold text-brand-800">2.</span> Your order is now being processed.</li>
                      <li className="flex gap-2"><span className="font-bold text-brand-800">3.</span> We'll prepare your order for delivery.</li>
                      <li className="flex gap-2"><span className="font-bold text-brand-800">4.</span> You'll receive your items at the delivery address provided.</li>
                    </>
                  ) : (
                    <>
                      <li className="flex gap-2"><span className="font-bold text-brand-800">1.</span> Our team will verify your payment proof.</li>
                      <li className="flex gap-2"><span className="font-bold text-brand-800">2.</span> Once verified, your order will move to processing.</li>
                      <li className="flex gap-2"><span className="font-bold text-brand-800">3.</span> We'll prepare your order for delivery.</li>
                      <li className="flex gap-2"><span className="font-bold text-brand-800">4.</span> You'll receive your items at the delivery address provided.</li>
                    </>
                  )}
                </ol>
                <p className="text-xs text-slate-400">
                  Save your order number <strong>{result?.order.orderNumber ?? orderNumber}</strong> for future reference.
                </p>
              </div>
            )}

            <Link to="/" className="btn-outline block w-full py-2.5 text-center text-sm">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
