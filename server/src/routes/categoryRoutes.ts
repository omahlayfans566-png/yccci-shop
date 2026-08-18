import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';
import { protect } from '../middleware/auth';
import { validateResult, categoryRules } from '../middleware/validate';

const router = Router();

// Public
router.get('/', listCategories);

// Admin (protected)
router.post('/', protect, categoryRules, validateResult, createCategory);
router.put('/:id', protect, categoryRules, validateResult, updateCategory);
router.delete('/:id', protect, deleteCategory);

export default router;