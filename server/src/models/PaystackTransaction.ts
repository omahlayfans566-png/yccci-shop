import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * Possible lifecycle states for a Paystack-initiated transaction.
 *
 * pending        → created locally, Paystack checkout not yet opened
 * processing     → customer redirected to Paystack / popup opened
 * success        → verified by webhook AND/OR backend verification call
 * failed         → Paystack reported failure
 * cancelled      → customer abandoned / explicit cancellation
 */
export type PaystackTxStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';

export const PAYSTACK_TX_STATUSES: PaystackTxStatus[] = [
  'pending', 'processing', 'success', 'failed', 'cancelled',
];

const PaystackTransactionSchema = new Schema(
  {
    /** The Order._id this transaction belongs to. Indexed for fast lookup. */
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    /** Denormalised for quick lookups without a join. */
    orderNumber: { type: String, required: true, index: true },

    /** Customer email — must match what was sent to Paystack at initialisation. */
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /**
     * Unique reference we generate and send to Paystack at initialisation.
     * Format: SHOP-<orderNumber>-<timestamp>-<random>
     * Indexed unique so duplicate webhooks are detected instantly.
     */
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /** Amount in KOBO (Paystack always works in the smallest currency unit). */
    amountKobo: { type: Number, required: true, min: 0 },

    /** Human-readable Naira amount (amountKobo / 100). */
    amountNaira: { type: Number, required: true, min: 0 },

    currency: { type: String, default: 'NGN', uppercase: true },

    /** Current lifecycle status of this transaction. */
    status: {
      type: String,
      enum: PAYSTACK_TX_STATUSES,
      default: 'pending',
      index: true,
    },

    /** Paystack's own numeric transaction ID (set after verification). */
    paystackTransactionId: { type: Number, default: null },

    /** Payment channel reported by Paystack (card, bank, ussd, etc.). */
    channel: { type: String, default: '' },

    /**
     * Set to true once the webhook has been processed.
     * Prevents duplicate webhook events from re-activating an order.
     */
    webhookProcessed: { type: Boolean, default: false, index: true },

    /** ISO timestamp of when Paystack reports the payment was made. */
    paidAt: { type: Date, default: null },

    /**
     * Raw Paystack verification/webhook data snapshot.
     * Stored for audit trail — never exposed to the frontend.
     */
    paystackMeta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Compound index: look up by orderId + status efficiently
PaystackTransactionSchema.index({ orderId: 1, status: 1 });

export type PaystackTransaction = InferSchemaType<typeof PaystackTransactionSchema>;
export type PaystackTransactionDoc = HydratedDocument<PaystackTransaction>;

export const PaystackTransaction = model('PaystackTransaction', PaystackTransactionSchema);
