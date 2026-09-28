import crypto from 'node:crypto';
import { env } from './env';

const PAYSTACK_BASE = 'https://api.paystack.co';

// ---------------------------------------------------------------------------
// Types — mirrors the relevant subset of Paystack's JSON responses
// ---------------------------------------------------------------------------

export interface PaystackInitData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: PaystackInitData;
}

export interface PaystackCustomer {
  id: number;
  email: string;
  customer_code: string;
}

export interface PaystackVerifyData {
  id: number;
  status: string; // 'success' | 'failed' | 'abandoned' | ...
  reference: string;
  amount: number; // in kobo
  currency: string;
  channel: string;
  paid_at: string | null;
  customer: PaystackCustomer;
  metadata?: Record<string, unknown>;
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: PaystackVerifyData;
}

export interface PaystackWebhookEvent {
  event: string; // e.g. 'charge.success'
  data: PaystackVerifyData;
}

// ---------------------------------------------------------------------------
// Internal fetch helper — all Paystack API calls go through here
// ---------------------------------------------------------------------------

async function paystackFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!env.paystackSecretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const url = `${PAYSTACK_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.paystackSecretKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    throw new Error(
      `Paystack API network error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let body: T;
  try {
    body = (await res.json()) as T;
  } catch {
    throw new Error(`Paystack API returned non-JSON response (HTTP ${res.status})`);
  }

  if (!res.ok) {
    const msg =
      (body as { message?: string }).message ||
      `Paystack API error (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return body;
}

// ---------------------------------------------------------------------------
// Initialise a transaction
// ---------------------------------------------------------------------------

export interface InitialisePaymentOptions {
  email: string;
  amountKobo: number; // MUST be in kobo
  reference: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

export async function initialisePaystackPayment(
  opts: InitialisePaymentOptions
): Promise<PaystackInitResponse> {
  const body: Record<string, unknown> = {
    email: opts.email,
    amount: opts.amountKobo,
    reference: opts.reference,
    currency: 'NGN',
  };
  if (opts.metadata) body.metadata = opts.metadata;
  if (opts.callbackUrl) body.callback_url = opts.callbackUrl;

  return paystackFetch<PaystackInitResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Verify a transaction
// ---------------------------------------------------------------------------

export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  // Reference must be URL-safe — it only contains alphanumerics and hyphens
  const safeRef = encodeURIComponent(reference);
  return paystackFetch<PaystackVerifyResponse>(`/transaction/verify/${safeRef}`);
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/**
 * Validates the x-paystack-signature header against the raw request body.
 * MUST be called with the raw Buffer body — do not parse with express.json() first.
 *
 * Returns true only when the HMAC-SHA512 digest matches.
 */
export function verifyPaystackWebhookSignature(
  rawBody: Buffer,
  signature: string
): boolean {
  if (!env.paystackSecretKey) return false;
  if (!signature || typeof signature !== 'string') return false;

  const expected = crypto
    .createHmac('sha512', env.paystackSecretKey)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature.toLowerCase(), 'hex')
    );
  } catch {
    // Buffer lengths differ → invalid signature
    return false;
  }
}

// ---------------------------------------------------------------------------
// Reference generator
// ---------------------------------------------------------------------------

/**
 * Generates a unique, URL-safe Paystack transaction reference.
 * Format: SHOP-<orderNumber>-<timestamp>-<8 random hex chars>
 */
export function generatePaystackReference(orderNumber: string): string {
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  // Replace any chars that aren't alphanumeric or hyphens
  const safe = orderNumber.replace(/[^a-zA-Z0-9]/g, '-');
  return `SHOP-${safe}-${ts}-${rand}`;
}
