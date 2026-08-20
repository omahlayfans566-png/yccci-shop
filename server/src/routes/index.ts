import { Router } from 'express';
import mongoose from 'mongoose';
import productRoutes from './productRoutes';
import categoryRoutes from './categoryRoutes';
import orderRoutes from './orderRoutes';
import paymentSettingsRoutes from './paymentSettingsRoutes';
import adminRoutes from './adminRoutes';
import { isCloudinaryConfigured, testCloudinaryConnection } from '../config/cloudinary';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/health', async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  res.json({
    success: true,
    status: 'healthy',
    service: 'SHOP API',
    time: new Date().toISOString(),
    database: dbStatus,
    imageStorage: isCloudinaryConfigured() ? 'cloudinary' : 'not-configured',
  });
});

// Admin-only Cloudinary connectivity test (no products created)
router.get('/test-cloudinary', protect, async (_req, res) => {
  const result = await testCloudinaryConnection();
  res.json({ success: result.ok, error: result.error ?? null });
});

router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/payment-settings', paymentSettingsRoutes);
router.use('/admin', adminRoutes);

export default router;
