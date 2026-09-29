import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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
  const [result, setResult] = useState<StoredResult | null>(null);
  const [orderData, setOrderData] = useState<{ total: number; paymentStatus?: string } | null>(null);
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
    } catch {
      /* ignore */
    }

    shopApi
      .ordersLookup(orderNumber)
      .then((data) => {
        setOrderData(data);
        if (data?.paymentStatus === 'VERIFIED') {
          setVerifyState('success');
          setVerifyMessage('Your payment has been successfully confirmed.');
        }
      })
      .catch(() => setOrderData(null));

    // Paystack callback reference
    const paystackRef =
      searchParams.get('reference') ||
      searchParams.get('trxref') ||
      (() => {
        try {
          return sessionStorage.getItem('shop_paystack_ref');
        } catch {
          return null;
        }
      })() ||
      (() => {
        try {
          return sessionStorage.getItem(`paystack_ref_${orderNumber}`);
        } catch {
          return null;
        }
      })();

    if (paystackRef && !verifiedRef.current) {
      verifiedRef.current = true;
      setVerifyState('verifying');
      verifyPaystackPayment(paystackRef);
    } else if (!paystackRef && orderData?.paymentStatus !== 'VERIFIED') {
      // If direct navigation without reference and order not verified
      setVerifyState('failed');
      setVerifyMessage('No verified payment was found for this order.');
    }
  }, [orderNumber, searchParams]);

  async function verifyPaystackPayment(reference: string) {
    try {
      // 1. Check local status first (in case webhook already verified it)
      try {
        const statusData = await shopApi.paystackStatus(reference);
        if (statusData.status === 'success') {
          setVerifyState('success');
          setVerifyMessage('Your payment has been successfully confirmed.');
          refreshOrder();
          cleanupPaystackSession();
          return;
        }
        if (statusData.status === 'failed') {
          setVerifyState('failed');
          setVerifyMessage('Your payment was not completed. Please try again.');
          cleanupPaystackSession();
          return;
        }
      } catch {
        // Status check fallback to live verify
      }

      // 2. Server-side live verification with Paystack
      const data = await shopApi.paystackVerify(reference);

      if (data.success && data.status === 'success') {
        setVerifyState('success');
        setVerifyMessage('Your payment has been successfully confirmed.');
        refreshOrder();
        cleanupPaystackSession();
      } else if (data.status === 'failed') {
        setVerifyState('failed');
        setVerifyMessage('Your payment was not completed. Please try again.');
        cleanupPaystackSession();
      } else if (data.status === 'abandoned' || data.status === 'cancelled') {
        setVerifyState('cancelled');
        setVerifyMessage('Payment was cancelled. You can try again below.');
        cleanupPaystackSession();
      } else {
        setVerifyState('failed');
        setVerifyMessage(data.message || 'Payment verification failed. Please try again.');
        cleanupPaystackSession();
      }
    } catch {
      setVerifyState('failed');
      setVerifyMessage('Could not verify payment. Please contact support or try again.');
    }
  }

  function refreshOrder() {
    shopApi
      .ordersLookup(orderNumber)
      .then(setOrderData)
      .catch(() => {});
  }

  function cleanupPaystackSession() {
    try {
      sessionStorage.removeItem('shop_paystack_ref');
      sessionStorage.removeItem('shop_payment_method');
      sessionStorage.removeItem(`paystack_ref_${orderNumber}`);
    } catch {
      /* non-fatal */
    }
  }

  async function retryPaystackPayment() {
    if (retrying) return;
    setRetrying(true);
    setRetryError(null);

    try {
      const init = await shopApi.paystackInitialize(orderNumber);
      if (!init.success || !init.authorizationUrl) {
        throw new Error('Payment could not be initialized. Please try again.');
      }
      try {
        sessionStorage.setItem(`paystack_ref_${orderNumber}`, init.reference);
        sessionStorage.setItem('shop_paystack_ref', init.reference);
        sessionStorage.setItem('shop_payment_method', 'paystack');
      } catch {
        /* non-fatal */
      }
      window.location.href = init.authorizationUrl;
    } catch (err) {
      setRetryError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Payment could not be retried. Please try again or contact support.'
      );
      setRetrying(false);
    }
  }

  const isVerifying = verifyState === 'verifying';
  const isSuccess = verifyState === 'success' || orderData?.paymentStatus === 'VERIFIED';
  const isFailed = verifyState === 'failed';
  const isCancelled = verifyState === 'cancelled';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="card overflow-hidden bg-white shadow-md border border-slate-200">
          {/* ── 1. LOADING / VERIFYING STATE ────────────────── */}
          {isVerifying && (
            <div className="p-10 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <Spinner className="h-8 w-8 text-brand-700" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Verifying Your Payment</h1>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Please wait while our server securely confirms your transaction with Paystack. Do not close this window.
              </p>
            </div>
          )}

          {/* ── 2. FAILED OR CANCELLED STATE ────────────────── */}
          {(isFailed || isCancelled) && !isVerifying && !isSuccess && (
            <div className="p-8 space-y-6">
              <div className="text-center space-y-3">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
                  {isCancelled ? '⚠️' : '❌'}
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {isCancelled ? 'Payment Cancelled' : 'Payment Failed'}
                </h1>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {verifyMessage || 'Your payment was not completed. Please try again.'}
                </p>
              </div>

              {retryError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 text-center">
                  {retryError}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={retryPaystackPayment}
                  disabled={retrying}
                  className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base font-bold shadow-sm disabled:opacity-60"
                >
                  {retrying ? (
                    <>
                      <Spinner className="h-5 w-5" />
                      <span>Connecting to Paystack…</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Retry Payment with Paystack</span>
                    </>
                  )}
                </button>

                <Link to="/" className="btn-outline block w-full py-2.5 text-center text-sm">
                  Return to Shop
                </Link>
              </div>
            </div>
          )}

          {/* ── 3. SUCCESS STATE ────────────────────────────── */}
          {isSuccess && !isVerifying && (
            <>
              {/* Header */}
              <div className="bg-emerald-50 px-6 py-8 text-center border-b border-emerald-100">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 shadow-sm">
                  <svg
                    className="h-9 w-9 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </span>
                <h1 className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">
                  Payment Successful 🎉
                </h1>
                <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                  Your payment has been successfully confirmed.
                </p>
              </div>

              <div className="space-y-6 px-6 py-6 sm:px-8">
                {/* Order Information Details */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Order Details
                  </h2>
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-slate-500">Order Number</dt>
                      <dd className="text-base font-bold text-brand-900 font-mono">
                        {result?.order.orderNumber || orderNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Total Paid</dt>
                      <dd className="text-base font-bold text-emerald-700">
                        {formatMoney(orderData?.total ?? result?.order.total ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Payment Status</dt>
                      <dd className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Confirmed
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-500">
                    Date: {formatDate(result?.order.createdAt) || 'Today'}
                  </div>
                </div>

                {/* Delivery & Waybill Notice & Contact Section */}
                <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50/80 to-amber-50/50 p-6 sm:p-7 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-white shadow-sm">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="3" width="15" height="13" rx="1" />
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                        <circle cx="5.5" cy="18.5" r="2.5" />
                        <circle cx="18.5" cy="18.5" r="2.5" />
                      </svg>
                    </span>
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-brand-950 sm:text-lg">
                        Delivery &amp; Waybill Arrangements
                      </h2>
                      <p className="text-sm leading-relaxed text-slate-700">
                        If you have a location where you would like your goods delivered, or you would like your order waybilled to a specific location, please contact us using WhatsApp or email.
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp & Email Action Buttons */}
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {/* WhatsApp Button */}
                    <a
                      href="https://wa.me/393333534560"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#20ba5a] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
                    >
                      <svg className="h-5 w-5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.41 5.82a8.18 8.18 0 0 1-5.83 2.42c-1.48 0-2.93-.39-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.188 8.188 0 0 1-1.25-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.3z" />
                      </svg>
                      <span>Contact us on WhatsApp</span>
                    </a>

                    {/* Email Button */}
                    <a
                      href="mailto:youngchosenforchrist@gmail.com"
                      className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                    >
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <span>Contact us by Email</span>
                    </a>
                  </div>

                  <p className="mt-4 text-center text-xs text-slate-500">
                    WhatsApp: <span className="font-semibold text-slate-700">+39 333 353 4560</span> &bull; Email: <span className="font-semibold text-slate-700">youngchosenforchrist@gmail.com</span>
                  </p>
                </div>

                <div className="pt-2">
                  <Link to="/" className="btn-outline block w-full py-3 text-center text-sm font-semibold">
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
