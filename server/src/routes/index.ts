import { Router } from 'express';
import mongoose from 'mongoose';
import productRoutes from './productRoutes';
import categoryRoutes from './categoryRoutes';
import orderRoutes from './orderRoutes';
import paymentSettingsRoutes from './paymentSettingsRoutes';
import adminRoutes from './adminRoutes';
import { isB2Configured } from '../config/storage';

const router = Router();

router.get('/health', async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  const b2Configured = isB2Configured();

  res.json({
    success: true,
    status: 'healthy',
    service: 'SHOP API',
    time: new Date().toISOString(),
    database: dbStatus,
    storage: b2Configured ? 'configured' : 'not-configured',
  });
});

router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/payment-settings', paymentSettingsRoutes);
router.use('/admin', adminRoutes);

export default router;
