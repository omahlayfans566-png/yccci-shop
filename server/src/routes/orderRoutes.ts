import { Router } from 'express';
import {
  createOrder, parseOrderBody, getOrderByNumber,
  adminListOrders, adminGetOrder, adminUpdateOrder,
  adminGetReceiptUrl, adminOrderStats,
} from '../controllers/orderController';
import { receiptUpload } from '../config/upload';
import { protect } from '../middleware/auth';
import { validateResult, orderRules } from '../middleware/validate';

const router = Router();

// Public — place an order (multipart with optional receipt)
router.post('/', receiptUpload.single('receipt'), parseOrderBody, orderRules, validateResult, createOrder);
router.get('/number/:orderNumber', getOrderByNumber);

// Admin
router.get('/admin/stats', protect, adminOrderStats);
router.get('/admin', protect, adminListOrders);
router.get('/admin/:id', protect, adminGetOrder);
router.patch('/admin/:id', protect, adminUpdateOrder);
router.get('/admin/:id/receipt', protect, adminGetReceiptUrl);

export default router;
