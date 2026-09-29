import type { Request, Response } from 'express';
import { Order } from '../models/Order';
import { PaystackTransaction } from '../models/PaystackTransaction';
import { asyncHandler, HttpError } from '../middleware/error';
import {
  initialisePaystackPayment,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
  generatePaystackReference,
  type PaystackWebhookEvent,
} from '../config/paystack';
import { deductOrderInventory } from '../utils/inventory';
import { env } from '../config/env';

// ---------------------------------------------------------------------------
// POST /api/paystack/initialize
//
// Body: { orderNumber: string, email: string }
//
// The frontend provides the orderNumber and customer email.
// The backend looks up the order to determine the CORRECT amount server-side.
// We NEVER trust an amount from the frontend.
// ---------------------------------------------------------------------------
export const initializePayment = asyncHandler(async (req: Request, res: Response) => {
  if (!env.paystackSecretKey) {
    throw new HttpError('Payment gateway is not configured. Please contact support.', 503);
  }

  const { orderNumber, email } = req.body as { orderNumber?: string; email?: string };

  if (!orderNumber || typeof orderNumber !== 'string' || !orderNumber.trim()) {
    throw new HttpError('Order number is required.', 400);
  }
  if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
    throw new HttpError('A valid email address is required.', 400);
  }

  const cleanOrderNumber = orderNumber.trim();

  // Load the order — we determine the amount from the database, not from the request
  const order = await Order.findOne({ orderNumber: cleanOrderNumber });
  if (!order) {
    throw new HttpError('Order not found.', 404);
  }

  // Only allow initialising payment for orders that haven't been paid yet
  if (!order.payment) {
    throw new HttpError('Order payment information is missing.', 400);
  }

  const alreadyPaid = order.payment.status === 'VERIFIED';
  if (alreadyPaid) {
    throw new HttpError('This order has already been paid.', 409);
  }

  // Determine transaction email for Paystack:
  // 1. If order already has an email, use it.
  // 2. If email was passed in request body, use it.
  // 3. Fallback: use an order-associated transaction email for guest checkout.
  let cleanEmail = '';
  if (order.customer?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customer.email.trim())) {
    cleanEmail = order.customer.email.trim().toLowerCase();
  } else if (email && typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    cleanEmail = email.trim().toLowerCase();
    if (!order.customer) {
      order.customer = { fullName: '', phone: '', email: cleanEmail, address: '', state: '', city: '', note: '' };
    } else {
      order.customer.email = cleanEmail;
    }
    await order.save();
  } else {
    cleanEmail = `order-${cleanOrderNumber.toLowerCase().replace(/[^a-z0-9_-]/g, '')}@ycccishop.com`;
    if (!order.customer) {
      order.customer = { fullName: '', phone: '', email: cleanEmail, address: '', state: '', city: '', note: '' };
    } else {
      order.customer.email = cleanEmail;
    }
    await order.save();
  }

  // Server-side amount — always from the database
  const amountNaira = order.total;
  if (!amountNaira || amountNaira <= 0) {
    throw new HttpError('Order total is invalid.', 400);
  }
  const amountKobo = Math.round(amountNaira * 100); // Paystack requires kobo

  // If there's already an active (processing) transaction for this order,
  // re-use its reference rather than creating duplicate transactions.
  const existingTx = await PaystackTransaction.findOne({
    orderId: order._id,
    status: 'processing',
  }).sort({ createdAt: -1 }).lean();

  if (existingTx) {
    // Re-initialize with Paystack using the same reference
    let paystackResponse;
    const callbackBase = env.clientUrl.split(',')[0].trim().replace(/\/$/, '');
    const callbackUrl = `${callbackBase}/order-success/${cleanOrderNumber}`;
    try {
      paystackResponse = await initialisePaystackPayment({
        email: cleanEmail,
        amountKobo,
        reference: existingTx.reference,
        callbackUrl,
        metadata: {
          orderNumber: cleanOrderNumber,
          orderId: order._id.toString(),
          internalTxId: existingTx._id.toString(),
        },
      });
    } catch (err) {
      console.error('[paystack] re-initialization error:', err instanceof Error ? err.message : err);
      throw new HttpError('Payment could not be initialized. Please try again.', 502);
    }
    if (!paystackResponse.status || !paystackResponse.data?.authorization_url) {
      throw new HttpError('Payment gateway returned an unexpected response. Please try again.', 502);
    }
    return res.status(200).json({
      success: true,
      authorizationUrl: paystackResponse.data.authorization_url,
      accessCode: paystackResponse.data.access_code,
      reference: paystackResponse.data.reference,
    });
  }

  // Generate a unique reference for this transaction attempt
  const reference = generatePaystackReference(cleanOrderNumber);

  // Persist the pending transaction record BEFORE calling Paystack
  // (so we have a record even if Paystack redirects but we never get a callback)
  const txDoc = await PaystackTransaction.create({
    orderId: order._id,
    orderNumber: cleanOrderNumber,
    customerEmail: cleanEmail,
    reference,
    amountKobo,
    amountNaira,
    currency: 'NGN',
    status: 'pending',
    webhookProcessed: false,
  });

  // Initialise the transaction with Paystack
  let paystackResponse;
  try {
    // Callback URL: Paystack redirects here after payment.
    // We use the order-success page so the customer lands there naturally.
    // The page reads ?reference= from the URL and verifies server-side.
    const callbackBase = env.clientUrl.split(',')[0].trim().replace(/\/$/, '');
    const callbackUrl = `${callbackBase}/order-success/${cleanOrderNumber}`;

    paystackResponse = await initialisePaystackPayment({
      email: cleanEmail,
      amountKobo,
      reference,
      callbackUrl,
      metadata: {
        orderNumber: cleanOrderNumber,
        orderId: order._id.toString(),
        internalTxId: txDoc._id.toString(),
      },
    });
  } catch (err) {
    // Clean up the pending record so it doesn't orphan
    await PaystackTransaction.deleteOne({ _id: txDoc._id });
    console.error('[paystack] initialization error:', err instanceof Error ? err.message : err);
    throw new HttpError('Payment could not be initialized. Please try again.', 502);
  }

  if (!paystackResponse.status || !paystackResponse.data?.authorization_url) {
    await PaystackTransaction.deleteOne({ _id: txDoc._id });
    throw new HttpError('Payment gateway returned an unexpected response. Please try again.', 502);
  }

  // Mark transaction as processing (checkout URL was issued to customer)
  await PaystackTransaction.updateOne({ _id: txDoc._id }, { status: 'processing' });

  res.status(201).json({
    success: true,
    authorizationUrl: paystackResponse.data.authorization_url,
    accessCode: paystackResponse.data.access_code,
    reference: paystackResponse.data.reference,
  });
});

// ---------------------------------------------------------------------------
// GET /api/paystack/verify/:reference
//
// Called by the frontend after the customer returns from Paystack checkout.
// Verifies the transaction directly with Paystack's API, then updates the
// order and transaction records if successful.
//
// IMPORTANT: membership/order activation ONLY happens here or in the webhook.
// The frontend CANNOT activate the order by itself.
// ---------------------------------------------------------------------------
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { reference } = req.params;

  if (!reference || typeof reference !== 'string' || !reference.trim()) {
    throw new HttpError('Transaction reference is required.', 400);
  }

  const cleanRef = reference.trim();

  // Load our local transaction record first
  const txDoc = await PaystackTransaction.findOne({ reference: cleanRef });
  if (!txDoc) {
    throw new HttpError('Transaction not found.', 404);
  }

  // If already successfully processed, return current status (idempotent)
  if (txDoc.status === 'success') {
    return res.json({
      success: true,
      status: 'success',
      orderNumber: txDoc.orderNumber,
      message: 'Payment already verified.',
    });
  }

  // Verify with Paystack directly — never trust the frontend's claim of success
  let verifyResponse;
  try {
    verifyResponse = await verifyPaystackTransaction(cleanRef);
  } catch (err) {
    console.error('[paystack] verify error:', err instanceof Error ? err.message : err);
    throw new HttpError('Could not verify payment with the payment gateway. Please try again.', 502);
  }

  const data = verifyResponse.data;

  // --- Security checks ---

  // 1. Transaction must be reported as 'success' by Paystack
  if (data.status !== 'success') {
    await PaystackTransaction.updateOne({ _id: txDoc._id }, { status: 'failed', paystackMeta: data });
    return res.json({
      success: false,
      status: data.status,
      orderNumber: txDoc.orderNumber,
      message: 'Payment was not successful.',
    });
  }

  // 2. Currency must be NGN
  if (data.currency !== 'NGN') {
    console.warn('[paystack] unexpected currency:', data.currency, 'ref:', cleanRef);
    throw new HttpError('Payment currency mismatch.', 400);
  }

  // 3. Amount must match what we stored (within 1 kobo tolerance for rounding)
  if (Math.abs(data.amount - txDoc.amountKobo) > 1) {
    console.warn('[paystack] amount mismatch — expected:', txDoc.amountKobo, 'got:', data.amount, 'ref:', cleanRef);
    throw new HttpError('Payment amount mismatch. Please contact support.', 400);
  }

  // 4. Reference must match
  if (data.reference !== cleanRef) {
    throw new HttpError('Transaction reference mismatch.', 400);
  }

  // All checks passed — activate the order
  await activateOrder(txDoc.orderId.toString(), txDoc.orderNumber, cleanRef);

  // Update the transaction record
  await PaystackTransaction.updateOne(
    { _id: txDoc._id },
    {
      status: 'success',
      webhookProcessed: true,
      paystackTransactionId: data.id,
      channel: data.channel || '',
      paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
      paystackMeta: data,
    }
  );

  return res.json({
    success: true,
    status: 'success',
    orderNumber: txDoc.orderNumber,
    message: 'Payment verified successfully.',
  });
});

// ---------------------------------------------------------------------------
// GET /api/paystack/status/:reference
//
// Lightweight status check — frontend polls this to know if the webhook
// has already processed the payment (without making a live Paystack API call).
// ---------------------------------------------------------------------------
export const paymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { reference } = req.params;

  if (!reference || typeof reference !== 'string') {
    throw new HttpError('Reference is required.', 400);
  }

  const txDoc = await PaystackTransaction.findOne({ reference: reference.trim() }).lean();
  if (!txDoc) {
    throw new HttpError('Transaction not found.', 404);
  }

  res.json({
    success: true,
    status: txDoc.status,
    orderNumber: txDoc.orderNumber,
    webhookProcessed: txDoc.webhookProcessed,
    paidAt: txDoc.paidAt,
  });
});

// ---------------------------------------------------------------------------
// POST /api/paystack/webhook
//
// Paystack calls this server-to-server after a payment event.
// Raw body MUST be preserved for HMAC-SHA512 signature verification.
// express.json() must NOT have processed this route's body before we verify.
// ---------------------------------------------------------------------------
export const paystackWebhook = asyncHandler(async (req: Request, res: Response) => {
  // 1. Verify the webhook signature FIRST — reject anything unsigned
  const signature = req.headers['x-paystack-signature'];
  const rawBody: Buffer = (req as Request & { rawBody?: Buffer }).rawBody as Buffer;

  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    console.warn('[paystack] webhook received without raw body buffer');
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }

  if (!signature || typeof signature !== 'string') {
    console.warn('[paystack] webhook missing x-paystack-signature header');
    return res.status(400).json({ success: false, message: 'Missing signature' });
  }

  const isValid = verifyPaystackWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn('[paystack] webhook signature verification FAILED');
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  // 2. Parse the event
  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookEvent;
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }

  // 3. Acknowledge receipt immediately so Paystack doesn't retry unnecessarily
  //    (we process below — any errors are logged but we still return 200)
  res.status(200).json({ success: true });

  // 4. Only handle charge.success
  if (event.event !== 'charge.success') {
    // Other events (transfer, refund, etc.) are acknowledged but not processed
    return;
  }

  const data = event.data;
  const reference = data?.reference;

  if (!reference) {
    console.warn('[paystack] webhook charge.success missing reference');
    return;
  }

  // 5. Load the local transaction record
  const txDoc = await PaystackTransaction.findOne({ reference });
  if (!txDoc) {
    console.warn('[paystack] webhook: no transaction found for reference', reference);
    return;
  }

  // 6. Idempotency — if already processed, do nothing
  if (txDoc.webhookProcessed || txDoc.status === 'success') {
    console.info('[paystack] webhook: already processed, skipping', reference);
    return;
  }

  // 7. Security checks
  if (data.status !== 'success') {
    console.info('[paystack] webhook: non-success status', data.status, reference);
    await PaystackTransaction.updateOne({ _id: txDoc._id }, { status: 'failed', paystackMeta: data });
    return;
  }

  if (data.currency !== 'NGN') {
    console.warn('[paystack] webhook: currency mismatch', data.currency, reference);
    return;
  }

  if (Math.abs(data.amount - txDoc.amountKobo) > 1) {
    console.warn('[paystack] webhook: amount mismatch', data.amount, 'vs', txDoc.amountKobo, reference);
    return;
  }

  // 8. All checks passed — activate the order
  try {
    await activateOrder(txDoc.orderId.toString(), txDoc.orderNumber, reference);

    await PaystackTransaction.updateOne(
      { _id: txDoc._id },
      {
        status: 'success',
        webhookProcessed: true,
        paystackTransactionId: data.id,
        channel: data.channel || '',
        paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
        paystackMeta: data,
      }
    );

    console.info('[paystack] webhook: order activated', txDoc.orderNumber, reference);
  } catch (err) {
    // Log the error — Paystack will retry the webhook
    console.error('[paystack] webhook: failed to activate order', txDoc.orderNumber, err instanceof Error ? err.message : err);
  }
});

// ---------------------------------------------------------------------------
// Shared helper — activate an order after verified payment
// ---------------------------------------------------------------------------

async function activateOrder(orderId: string, orderNumber: string, paystackReference?: string): Promise<void> {
  const updateFields: Record<string, unknown> = {
    'payment.status': 'VERIFIED',
    orderStatus: 'PAYMENT_VERIFIED',
  };
  // Store the Paystack reference in the order's payment.reference field
  // so the admin panel can see it alongside the order
  if (paystackReference) {
    updateFields['payment.reference'] = paystackReference;
  }

  const result = await Order.updateOne(
    {
      _id: orderId,
      // Only update if not already verified — double-safety against race conditions
      'payment.status': { $ne: 'VERIFIED' },
    },
    { $set: updateFields }
  );

  if (result.modifiedCount === 0) {
    // Already verified (race condition between webhook + verify endpoint) — safe to ignore
    console.info('[paystack] activateOrder: order already verified, skipping', orderNumber);
  } else {
    console.info('[paystack] activateOrder: order', orderNumber, 'payment verified');
  }

  // Atomically deduct inventory for this order upon confirmed payment.
  // deductOrderInventory is fully idempotent and will ONLY deduct stock once across multiple calls.
  const invResult = await deductOrderInventory(orderId);
  if (!invResult.success) {
    console.warn(`[paystack] activateOrder: stock deduction had unavailable items for order ${orderNumber}`);
  } else if (!invResult.alreadyDeducted) {
    console.info(`[paystack] activateOrder: stock deducted successfully for order ${orderNumber}`);
  }
}
