import { useState } from 'react';
import type { PaymentSettings } from '../types';

interface Props {
  settings: PaymentSettings | null;
  loading: boolean;
}

/**
 * Manual bank-transfer payment info. Rendered from the configurable
 * payment-settings document served by the API — never hardcoded.
 */
export function PaymentInfo({ settings, loading }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyAccountNumber() {
    if (!settings) return;
    try {
      await navigator.clipboard.writeText(settings.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fall back to select.
      setCopied(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-brand-50 px-5 py-4">
        <h3 className="text-base font-bold text-brand-900">Bank Transfer Payment</h3>
        <p className="mt-0.5 text-sm text-slate-600">
          Transfer the total amount to the account below, then upload your proof of payment.
        </p>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-10 animate-pulse rounded bg-slate-200" />
          </div>
        ) : settings ? (
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bank Name</dt>
              <dd className="text-sm font-medium text-slate-800">{settings.bankName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account Name</dt>
              <dd className="text-sm font-medium text-slate-800">{settings.accountName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account Number</dt>
              <dd className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-lg font-bold tracking-widest text-brand-800">
                  {settings.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={copyAccountNumber}
                  className="btn-outline px-3 py-1.5 text-xs"
                >
                  {copied ? '✓ Copied!' : 'Copy Account Number'}
                </button>
              </dd>
            </div>
            {settings.instructions && (
              <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                {settings.instructions}
              </p>
            )}
          </dl>
        ) : (
          <p className="text-sm text-amber-700">
            Payment details are temporarily unavailable. Please try again shortly.
          </p>
        )}
      </div>
    </div>
  );
}