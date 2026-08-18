import type { RequestHandler, Request } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Admin } from '../models/Admin';
import { HttpError, asyncHandler } from './error';

export interface AuthUser {
  _id: string;
  email: string;
  name: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      userDoc?: ReturnType<typeof Admin.prototype.$toObject>;
    }
  }
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export function signToken(user: { _id: string; email: string; role: string }): string {
  const payload: TokenPayload = { id: user._id.toString(), email: user.email, role: user.role };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

/** Protects routes: requires valid Bearer JWT and an active admin. */
export const protect: RequestHandler = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new HttpError('Not authorized — missing token', 401);
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(header.slice(7), env.jwtSecret) as TokenPayload;
  } catch {
    throw new HttpError('Not authorized — invalid or expired token', 401);
  }

  const admin = await Admin.findById(payload.id)
    .select('-passwordHash -__v')
    .lean();

  if (!admin || !(admin as { isActive?: boolean }).isActive) {
    throw new HttpError('Not authorized — account not found or disabled', 401);
  }

  req.user = {
    _id: payload.id,
    email: payload.email,
    name: (admin as { name?: string }).name || '',
    role: payload.role,
  };
  next();
});

/** Restricts a handler to a set of roles. Use after protect. */
export function authorize(...roles: string[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return next(new HttpError('Not authorized', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new HttpError('Forbidden — insufficient privileges', 403));
    }
    next();
  };
}