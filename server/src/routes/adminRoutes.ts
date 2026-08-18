import { Router } from 'express';
import {
  login, me, changePassword,
  listAdmins, createAdmin, updateAdmin, deleteAdmin, resetAdminPassword,
} from '../controllers/adminController';
import { protect, authorize } from '../middleware/auth';
import { validateResult, loginRules } from '../middleware/validate';

const router = Router();

// Public
router.post('/login', loginRules, validateResult, login);

// Protected — any admin
router.get('/me', protect, me);
router.post('/change-password', protect, changePassword);

// Superadmin only
router.get('/admins', protect, authorize('superadmin'), listAdmins);
router.post('/admins', protect, authorize('superadmin'), createAdmin);
router.put('/admins/:id', protect, authorize('superadmin'), updateAdmin);
router.delete('/admins/:id', protect, authorize('superadmin'), deleteAdmin);
router.post('/admins/:id/reset-password', protect, authorize('superadmin'), resetAdminPassword);

export default router;
