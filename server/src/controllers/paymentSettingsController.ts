import type { Request, Response } from 'express';
import { PaymentSettings, ensurePaymentSettings } from '../models/PaymentSettings';
import { asyncHandler, HttpError } from '../middleware/error';

/**
 * Public payment details. This is intentionally what the customer needs to
 * transfer to — account details live in ONE configurable document (managed by
 * admins), never hardcoded across the frontend.
 */
export const getPublicPaymentSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await ensurePaymentSettings();

  res.json({
    success: true,
    paymentSettings: {
      bankName: settings.bankName,
      accountName: settings.accountName,
      accountNumber: settings.accountNumber,
      instructions: settings.instructions,
    },
  });
});

/** Admin: update the single payment settings document. */
export const adminUpdatePaymentSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await PaymentSettings.findOneAndUpdate({ key: 'default' }, req.body, {
    new: true,
    runValidators: true,
    upsert: true,
  });

  res.json({
    success: true,
    paymentSettings: {
      bankName: settings.bankName,
      accountName: settings.accountName,
      accountNumber: settings.accountNumber,
      instructions: settings.instructions,
    },
  });
});