import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Admin, type AdminDoc } from '../models/Admin';
import { asyncHandler, HttpError } from '../middleware/error';
import { signToken } from '../middleware/auth';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const admin = (await Admin.findOne({ email: (email || '').toLowerCase() })) as AdminDoc | null;
  if (!admin || !(admin.isActive ?? true)) {
    throw new HttpError('Invalid email or password', 401);
  }
  const ok = await admin.comparePassword(password || '');
  if (!ok) throw new HttpError('Invalid email or password', 401);
  const token = signToken({ _id: admin._id.toString(), email: admin.email, role: admin.role });
  res.json({
    success: true,
    token,
    admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const admin = await Admin.findById(req.user?._id).select('-passwordHash -__v').lean();
  if (!admin) throw new HttpError('Account not found', 404);
  res.json({ success: true, admin });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || String(newPassword).length < 8) {
    throw new HttpError('New password must be at least 8 characters', 400);
  }
  const admin = await Admin.findById(req.user?._id);
  if (!admin) throw new HttpError('Account not found', 404);
  const ok = await (admin as AdminDoc).comparePassword(currentPassword);
  if (!ok) throw new HttpError('Current password is incorrect', 401);
  admin.passwordHash = await bcrypt.hash(String(newPassword), 10);
  await admin.save();
  res.json({ success: true, message: 'Password updated' });
});

export const listAdmins = asyncHandler(async (_req: Request, res: Response) => {
  const admins = await Admin.find().select('-passwordHash -__v').lean();
  res.json({ success: true, admins });
});

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  if (!name?.trim()) throw new HttpError('Name is required', 400);
  if (!email?.trim()) throw new HttpError('Email is required', 400);
  if (!password || String(password).length < 8) {
    throw new HttpError('Password must be at least 8 characters', 400);
  }
  const allowedRoles = ['admin', 'superadmin'];
  const assignedRole = allowedRoles.includes(role) ? role : 'admin';
  const existing = await Admin.findOne({ email: (email || '').toLowerCase() });
  if (existing) throw new HttpError('An admin with that email already exists', 409);
  const passwordHash = await bcrypt.hash(String(password), 10);
  const admin = await Admin.create({ name, email, passwordHash, role: assignedRole });
  res.status(201).json({
    success: true,
    admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role, isActive: admin.isActive },
  });
});

export const updateAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // Superadmin cannot downgrade themselves
  if (id === req.user?._id && req.body.role && req.body.role !== 'superadmin') {
    throw new HttpError('You cannot change your own role', 400);
  }
  const allowed: Record<string, unknown> = {};
  if (req.body.name !== undefined) allowed.name = req.body.name;
  if (req.body.role !== undefined) allowed.role = req.body.role;
  if (req.body.isActive !== undefined) allowed.isActive = req.body.isActive;
  if (req.body.email !== undefined) {
    const dup = await Admin.findOne({ email: req.body.email.toLowerCase(), _id: { $ne: id } });
    if (dup) throw new HttpError('That email is already in use', 409);
    allowed.email = req.body.email;
  }
  const admin = await Admin.findByIdAndUpdate(id, allowed, { new: true, runValidators: true })
    .select('-passwordHash -__v');
  if (!admin) throw new HttpError('Admin not found', 404);
  res.json({ success: true, admin });
});

export const deleteAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (id === req.user?._id) throw new HttpError('You cannot delete your own account', 400);
  const admin = await Admin.findByIdAndDelete(id);
  if (!admin) throw new HttpError('Admin not found', 404);
  res.json({ success: true, message: 'Admin deleted' });
});

export const resetAdminPassword = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 8) {
    throw new HttpError('Password must be at least 8 characters', 400);
  }
  const admin = await Admin.findById(id);
  if (!admin) throw new HttpError('Admin not found', 404);
  admin.passwordHash = await bcrypt.hash(String(newPassword), 10);
  await admin.save();
  res.json({ success: true, message: 'Password reset successfully' });
});
