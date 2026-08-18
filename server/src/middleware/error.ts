import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wrap async route handlers so rejected promises hit the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** HTTP error with an optional statusCode (default 500). */
export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFound(_req: Request, res: Response, next: NextFunction): void {
  next(new HttpError('Route not found', 404));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof HttpError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error) {
    message = err.message;
    // Some libraries (multer fileFilter) attach a status to a plain Error.
    const attachedStatus = (err as { status?: number }).status;
    if (attachedStatus) status = attachedStatus;
    // Multer errors carry an explicit error code.
    if (err.name === 'MulterError') {
      const multerErr = err as Error & { code?: string };
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        status = 400;
        message = 'File is too large. Please upload a file within the allowed size.';
      } else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
        status = 400;
        message = 'Unexpected file field. Expected a single file named "receipt".';
      }
    }
    // Mongoose validation / duplicate key
    if (err.name === 'ValidationError') {
      status = 400;
      message = 'Validation failed';
      details = (err as { errors?: Record<string, { message?: string }> }).errors;
    } else if (err.name === 'CastError' || /Cast to .* failed/.test(message)) {
      status = 400;
      message = 'Invalid id supplied';
    } else if (err.name === 'MongoServerError') {
      status = 400;
      message = 'Duplicate value — that record already exists.';
    }
  }

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({ success: false, message, details });
}