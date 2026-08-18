import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { shopApi } from '../api/shopApi';
import { formatMoney, formatDate } from '../utils/format';

const SESSION_KEY = 'shop_last_order';

interface StoredResult {
  order: { orderNumber: string; createdAt: string; total: number };
}

export function OrderSuccessPage() {
  const { orderNumber = '' } = useParams();
  const [result, setResult] = useState<StoredResult | null>(null);
  const [orderData, setOrderData] = useState<{ receipt: string; total: number } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) setResult(JSON.parse(raw) as StoredResult);
    } catch { /* ignore */ }

    const email = (() => {
      try { return sessionStorage.getItem('shop_last_email') || undefined; }
      catch { return undefined; }
    })();
    shopApi.ordersLookup(orderNumber, email).then(setOrderData).catch(() => setOrderData(null));
  }, [orderNumber]);

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

          <div className="px-6 py-6 space-y-5">
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

            {/* Receipt confirmation */}
            {orderData?.receipt && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                ✅ Your payment receipt was saved with your order and will be reviewed by our team.
              </div>
            )}

            {/* What happens next */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
              <h2 className="font-bold text-slate-800">What happens next?</h2>
              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2"><span className="font-bold text-brand-800">1.</span> Our team will verify your payment proof.</li>
                <li className="flex gap-2"><span className="font-bold text-brand-800">2.</span> Once verified, your order will move to processing.</li>
                <li className="flex gap-2"><span className="font-bold text-brand-800">3.</span> We'll prepare your order for delivery.</li>
                <li className="flex gap-2"><span className="font-bold text-brand-800">4.</span> You'll receive your items at the delivery address provided.</li>
              </ol>
              <p className="text-xs text-slate-400">
                Save your order number <strong>{result?.order.orderNumber ?? orderNumber}</strong> for future reference.
              </p>
            </div>

            <Link to="/" className="btn-primary mt-2 w-full py-3 text-center block">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
