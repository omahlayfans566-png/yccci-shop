import { Router } from 'express';
import {
  getPublicPaymentSettings,
  adminUpdatePaymentSettings,
} from '../controllers/paymentSettingsController';
import { protect } from '../middleware/auth';
import { validateResult, paymentSettingsRules } from '../middleware/validate';

const router = Router();

// Public — what the customer needs to make a transfer.
router.get('/public', getPublicPaymentSettings);

// Admin (protected) — update the single payment settings document.
router.put('/admin', protect, paymentSettingsRules, validateResult, adminUpdatePaymentSettings);

export default router;