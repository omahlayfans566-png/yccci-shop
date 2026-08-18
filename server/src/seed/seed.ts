import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin';
import { env } from '../config/env';

/**
 * Creates the initial superadmin from ADMIN_INITIAL_* env vars on first boot.
 * Never overwrites an existing account, never logs the password.
 */
export async function ensureInitialAdmin(): Promise<void> {
  const email = env.adminInitial.email.toLowerCase();
  const existing = await Admin.findOne({ email }).lean();
  if (existing) return;

  const passwordHash = await bcrypt.hash(env.adminInitial.password, 10);
  await Admin.create({
    name: env.adminInitial.name,
    email,
    passwordHash,
    role: 'superadmin',
    isActive: true,
  });

  console.log(`[shop] Initial superadmin created: ${email}  — change the password after first login!`);
}
