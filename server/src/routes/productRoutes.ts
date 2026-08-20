import { Router } from 'express';
import {
  listProducts, getProduct,
  adminListProducts, createProduct, updateProduct,
  deleteProduct, hardDeleteProduct,
  uploadProductImages, deleteProductImage, setMainImage,
} from '../controllers/productController';
import { protect, authorize } from '../middleware/auth';
import { productImageUpload } from '../config/upload';

const router = Router();

// Public
router.get('/', listProducts);
router.get('/admin/list', protect, adminListProducts);
router.get('/:id', getProduct);

// Admin — CRUD
router.post('/admin', protect, productImageUpload.array('images', 10), createProduct);
router.put('/admin/:id', protect, productImageUpload.array('images', 10), updateProduct);
router.delete('/admin/:id', protect, deleteProduct);
router.delete('/admin/:id/hard', protect, authorize('superadmin'), hardDeleteProduct);

// Admin — image management
router.post('/admin/:id/images', protect, productImageUpload.array('images', 10), uploadProductImages);
router.delete('/admin/:id/images/:imageIndex', protect, deleteProductImage);
router.put('/admin/:id/main-image', protect, setMainImage);

export default router;
