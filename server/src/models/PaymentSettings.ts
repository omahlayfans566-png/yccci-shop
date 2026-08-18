import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const PaymentSettingsSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true },
    bankName: { type: String, required: true, default: 'Your Bank Name' },
    accountName: { type: String, required: true, default: 'SHOP Business Account' },
    accountNumber: { type: String, required: true, default: '0000000000' },
    /** Displayed in the WhatsApp order message / instructions */
    instructions: {
      type: String,
      default: 'Transfer the total amount to the account above, then upload your receipt/proof of payment below.',
    },
  },
  { timestamps: true }
);

export type PaymentSettings = InferSchemaType<typeof PaymentSettingsSchema>;
export type PaymentSettingsDoc = HydratedDocument<PaymentSettings>;

export const PaymentSettings = model('PaymentSettings', PaymentSettingsSchema);

/** Ensures a settings document exists (used at boot + seed). */
export async function ensurePaymentSettings(): Promise<PaymentSettingsDoc> {
  const existing = await PaymentSettings.findOne({ key: 'default' });
  if (existing) return existing;
  return PaymentSettings.create({
    key: 'default',
    bankName: 'Your Bank',
    accountName: 'SHOP Business Account',
    accountNumber: '0000000000',
  });
}