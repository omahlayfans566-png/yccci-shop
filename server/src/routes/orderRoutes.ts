import { Router } from 'express';
import {
  createOrder, parseOrderBody, getOrderByNumber,
  submitDeliveryMethod, getOrderMessages, customerSendMessage,
  adminListOrders, adminGetOrder, adminUpdateOrder,
  adminGetReceiptUrl, adminOrderStats, adminReplyToCustomer,
} from '../controllers/orderController';
import { receiptUpload } from '../config/upload';
import { protect } from '../middleware/auth';
import { validateResult, orderRules } from '../middleware/validate';

const router = Router();

// Public — place order
router.post('/', receiptUpload.single('receipt'), parseOrderBody, orderRules, validateResult, createOrder);
// Public — lookup order
router.get('/number/:orderNumber', getOrderByNumber);
// Public — delivery method (customer submits after order is placed)
router.post('/delivery', submitDeliveryMethod);
// Public — get messages for order (customer views admin replies)
router.get('/number/:orderNumber/messages', getOrderMessages);
// Public — customer sends message
router.post('/message', customerSendMessage);

// Admin
router.get('/admin/stats', protect, adminOrderStats);
router.get('/admin', protect, adminListOrders);
router.get('/admin/:id', protect, adminGetOrder);
router.patch('/admin/:id', protect, adminUpdateOrder);
router.get('/admin/:id/receipt', protect, adminGetReceiptUrl);
router.post('/admin/:id/reply', protect, adminReplyToCustomer);

export default router;
