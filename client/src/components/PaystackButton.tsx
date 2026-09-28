import { useState } from 'react';
import { shopApi } from '../api/shopApi';
import { ApiError } from '../api/client';
import { Spinner } from './Spinner';

// ---------------------------------------------------------------------------
// PaystackButton
//
// Handles the complete Paystack payment flow:
//  1. Calls backend POST /api/paystack/initialize to get an authorization URL
//  2. Redirects the customer to Paystack's hosted checkout (most reliable)
//  3. After Paystack redirects back, the parent page calls verify/status
//
// Security:
//  - Amount is NEVER sent from here — the backend reads it from the order.
//  - The Paystack secret key is NEVER used here (backend only).
//  - The public key (VITE_PAYSTACK_PUBLIC_KEY) is only used if we switch to
//    the Paystack inline popup, which requires it for initialisation.
//    Currently we use the redirect flow, so it is not needed here.
// ---------------------------------------------------------------------------

interface Props {
  orderNumber: string;
  email: string;
  /** Called when Paystack checkout URL was obtained — parent may store reference */
  onInitialized?: (reference: string) => void;
  /** Called if initialization or any step fails */
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PaystackButton({
  orderNumber,
  email,
  onInitialized,
  onError,
  disabled = false,
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (loading || disabled) return;
    setLoading(true);

    try {
      const result = await shopApi.paystackInitialize(orderNumber, email);

      if (!result.success || !result.authorizationUrl) {
        throw new Error('Payment could not be initialized. Please try again.');
      }

      // Notify the parent of the reference BEFORE redirecting
      // so it can be persisted (e.g. in sessionStorage) for the callback page.
      onInitialized?.(result.reference);

      // Store reference in sessionStorage so the order-success page can pick it up
      try {
        sessionStorage.setItem(`paystack_ref_${orderNumber}`, result.reference);
      } catch {
        // sessionStorage may be unavailable in some browsers — non-fatal
      }

      // Redirect to Paystack's hosted checkout page
      // This is the most reliable approach: works on all devices/browsers,
      // does not require the Paystack inline popup script.
      window.location.href = result.authorizationUrl;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Payment could not be completed. Please try again.';

      onError?.(message);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={disabled || loading}
      className={`btn-primary flex w-full items-center justify-center gap-2 py-3 text-base disabled:opacity-60 ${className}`}
    >
      {loading ? (
        <>
          <Spinner className="h-5 w-5" />
          <span>Connecting to Paystack…</span>
        </>
      ) : (
        <>
          {/* Paystack lock icon */}
          <svg
            className="h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Pay with Paystack</span>
        </>
      )}
    </button>
  );
}
