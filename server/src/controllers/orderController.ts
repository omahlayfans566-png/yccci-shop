import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import { Order, ORDER_STATUSES, PAYMENT_STATUSES } from '../models/Order';
import { Product } from '../models/Product';
import { PaymentSettings } from '../models/PaymentSettings';
import { asyncHandler, HttpError } from '../middleware/error';
import { generateOrderNumber } from '../utils/orderNumber';
import {
  uploadReceiptToCloudinary,
  deleteFromCloudinary,
  getPrivateCloudinaryUrl,
  isCloudinaryConfigured,
} from '../config/cloudinary';

/**
 * Multipart form data delivers customer + items as JSON strings.
 * Parse them back to objects before the validator runs.
 */
export function parseOrderBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.is('multipart/form-data')) {
    const parse = (v: unknown): unknown => {
      if (v == null || v === '') return undefined;
      if (typeof v === 'string') { try { return JSON.parse(v); } catch { return v; } }
      return v;
    };
    if (req.body) {
      req.body.customer = parse(req.body.customer);
      req.body.items = parse(req.body.items);
      if (req.body.paymentRef !== undefined) req.body.paymentRef = parse(req.body.paymentRef);
    }
  }
  next();
}

/** Upload a payment receipt buffer to Cloudinary (authenticated/private). */
async function uploadReceipt(
  file: Express.Multer.File,
  orderId: string
): Promise<{ url: string; publicId: string; resourceType: string }> {
  const result = await uploadReceiptToCloudinary(file.buffer, orderId, file.mimetype);
  const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
  return { url: result.secureUrl, publicId: result.publicId, resourceType: isImage ? 'image' : 'raw' };
}

/* ── Create Order ────────────────────────────────────────── */
export const createOrder = asyncHandler(async (req, res) => {
  const uploadedFile = req.file as Express.Multer.File | undefined;
  const customer: Record<string, string> = req.body.customer || {};
  const itemsRaw: unknown[] = req.body.items || [];
  const paymentRef: string = req.body.paymentRef || '';

  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    throw new HttpError('Your cart is empty.', 400);
  }

  // Validate every item against the live catalogue
  const enriched: Array<{ product: Record<string, unknown>; qty: number; size: string; colour: string }> = [];
  for (const rawItem of itemsRaw) {
    const raw = rawItem as Record<string, unknown>;
    if (!raw?.productId) throw new HttpError('Invalid product in cart', 400);
    const product = await Product.findById(raw.productId).lean() as Record<string, unknown> | null;
    if (!product || !product.isActive) throw new HttpError(`Product "${raw.name ?? 'unknown'}" no longer exists.`, 400);

    const qty = Number(raw.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new HttpError(`Invalid quantity for "${product.name}".`, 400);

    const stock = product.stock as number;
    const status = product.status as string;
    const effectiveStatus = stock > 0 ? status : status === 'AVAILABLE' ? 'SOLD_OUT' : status;
    if (effectiveStatus === 'SOLD_OUT') throw new HttpError(`"${product.name}" is sold out.`, 409);
    if (effectiveStatus === 'COMING_SOON') throw new HttpError(`"${product.name}" is coming soon.`, 409);
    if (stock > 0 && stock < qty) throw new HttpError(`Only ${stock} of "${product.name}" available.`, 409);

    const size = String(raw.size ?? '').trim();
    const sizes = product.sizes as string[];
    if (sizes.length > 0 && !sizes.includes(size)) throw new HttpError(`Choose a valid size for "${product.name}".`, 400);

    const colour = String(raw.colour ?? '').trim();
    const colours = product.colours as Array<{ name: string }>;
    if (colours.length > 0 && !colours.some((c) => c.name.toLowerCase() === colour.toLowerCase())) {
      throw new HttpError(`Choose a valid colour for "${product.name}".`, 400);
    }
    enriched.push({ product, qty, size, colour });
  }

  const orderNumber = await generateOrderNumber();
  const paymentSettings = await PaymentSettings.findOne({ key: 'default' }).lean() as Record<string, unknown> | null;

  const items = enriched.map(({ product, qty, size, colour }) => ({
    product: product._id,
    name: product.name as string,
    image: product.mainImage as string,
    price: product.price as number,
    quantity: qty,
    size,
    colour,
  }));
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const order = await Order.create({
    orderNumber,
    customer: {
      fullName: customer.fullName ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      state: customer.state ?? '',
      city: customer.city ?? '',
      note: customer.note ?? '',
    },
    items,
    subtotal,
    total: subtotal,
    payment: {
      status: uploadedFile || paymentRef ? 'PROOF_SUBMITTED' : 'PENDING',
      reference: paymentRef,
      receipt: '',
      receiptPublicId: '',
      receiptResourceType: 'image',
      receiptOriginalName: uploadedFile?.originalname ?? '',
      receiptUploadedAt: uploadedFile ? new Date() : undefined,
      bankName: paymentSettings?.bankName ?? '',
      accountName: paymentSettings?.accountName ?? '',
      accountNumber: paymentSettings?.accountNumber ?? '',
    },
    orderStatus: uploadedFile || paymentRef ? 'PAYMENT_SUBMITTED' : 'PENDING',
  });

  // Upload receipt to Cloudinary (private) after order is created
  if (uploadedFile && isCloudinaryConfigured()) {
    try {
      const { url, publicId, resourceType } = await uploadReceipt(uploadedFile, order._id.toString());
      await Order.updateOne({ _id: order._id }, {
        'payment.receipt': url,
        'payment.receiptPublicId': publicId,
        'payment.receiptResourceType': resourceType,
      });
    } catch (err) {
      console.error('[order] receipt upload failed:', err instanceof Error ? err.message : err);
    }
  } else if (uploadedFile && !isCloudinaryConfigured()) {
    // Fallback: store locally
    try {
      const { writeFile, mkdir } = await import('node:fs/promises');
      const dir = 'uploads/receipts';
      await mkdir(dir, { recursive: true });
      const ext = path.extname(uploadedFile.originalname).toLowerCase() || '.jpg';
      const filename = `receipt-${order._id}-${Date.now()}${ext}`;
      await writeFile(`${dir}/${filename}`, uploadedFile.buffer);
      await Order.updateOne({ _id: order._id }, { 'payment.receipt': `/uploads/receipts/${filename}` });
    } catch (err) {
      console.error('[order] local receipt save failed:', err instanceof Error ? err.message : err);
    }
  }

  // Reduce stock
  for (const { product, qty } of enriched) {
    const stock = product.stock as number;
    if (stock > 0) {
      await Product.updateOne({ _id: product._id }, { $inc: { stock: -qty } });
      const updated = await Product.findById(product._id).lean() as Record<string, unknown> | null;
      if (updated && (updated.stock as number) <= 0 && updated.status === 'AVAILABLE') {
        await Product.updateOne({ _id: product._id }, { status: 'SOLD_OUT' });
      }
    }
  }

  res.status(201).json({
    success: true,
    order: { orderNumber, createdAt: order.createdAt, total: order.total },
  });
});

/* ── Public order lookup ─────────────────────────────────── */
export const getOrderByNumber = asyncHandler(async (req, res) => {
  const orderNumber = (req.params.orderNumber || '').trim();
  const email = ((req.query.email as string) || '').trim().toLowerCase();
  if (!orderNumber) throw new HttpError('Order number is required', 400);

  const filter: Record<string, unknown> = { orderNumber };
  if (email) filter['customer.email'] = email;

  const order = await Order.findOne(filter)
    .select('-payment.accountNumber -payment.accountName -payment.bankName -payment.receiptPublicId -__v')
    .lean();
  if (!order) throw new HttpError('Order not found', 404);
  res.json({ success: true, order });
});

/* ── Admin: list orders ──────────────────────────────────── */
export const adminListOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const orderStatus = (req.query.orderStatus as string) || '';
  const paymentStatus = (req.query.paymentStatus as string) || '';
  const search = (req.query.search as string) || '';

  const filter: Record<string, unknown> = {};
  if (orderStatus) filter.orderStatus = orderStatus;
  if (paymentStatus) filter['payment.status'] = paymentStatus;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'customer.fullName': { $regex: search, $options: 'i' } },
      { 'customer.email': { $regex: search, $options: 'i' } },
      { 'customer.phone': { $regex: search, $options: 'i' } },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  res.json({ success: true, orders, total, page, pages: Math.ceil(total / limit) });
});

/* ── Admin: single order ────────────────────────────────── */
export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw new HttpError('Order not found', 404);
  res.json({ success: true, order });
});

/* ── Admin: update order ────────────────────────────────── */
export const adminUpdateOrder = asyncHandler(async (req, res) => {
  const { orderStatus, paymentStatus, deliveryStatus, adminNotes, rejectionReason } = req.body;

  const update: Record<string, unknown> = {};
  if (orderStatus) {
    if (!ORDER_STATUSES.includes(orderStatus)) throw new HttpError('Invalid order status', 400);
    update.orderStatus = orderStatus;
  }
  if (paymentStatus) {
    if (!PAYMENT_STATUSES.includes(paymentStatus)) throw new HttpError('Invalid payment status', 400);
    update['payment.status'] = paymentStatus;
    if (rejectionReason !== undefined) update['payment.rejectionReason'] = rejectionReason;
  }
  if (deliveryStatus) update.deliveryStatus = deliveryStatus;
  if (adminNotes !== undefined) update.adminNotes = adminNotes;
  if (Object.keys(update).length === 0) throw new HttpError('Nothing to update', 400);

  const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
  if (!order) throw new HttpError('Order not found', 404);
  res.json({ success: true, order });
});

/**
 * Admin: get a secure URL to view the payment receipt.
 * For Cloudinary authenticated assets, generates a 1-hour signed URL server-side.
 * The raw Cloudinary URL is never exposed directly — only the signed URL.
 */
export const adminGetReceiptUrl = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).lean() as Record<string, unknown> | null;
  if (!order) throw new HttpError('Order not found', 404);

  const payment = order.payment as Record<string, unknown> | undefined;
  const publicId = payment?.receiptPublicId as string | undefined;
  const directUrl = payment?.receipt as string | undefined;
  const resourceType = (payment?.receiptResourceType as string | undefined) === 'raw' ? 'raw' : 'image';

  if (!publicId && !directUrl) throw new HttpError('No receipt uploaded for this order', 404);

  // Generate a short-lived signed URL for the private Cloudinary asset
  if (publicId && isCloudinaryConfigured()) {
    const signedUrl = getPrivateCloudinaryUrl(publicId, resourceType);
    return res.json({ success: true, url: signedUrl, expires: 3600 });
  }

  // Fallback: local file (dev only — not publicly accessible without the backend)
  if (directUrl) {
    return res.json({ success: true, url: directUrl, expires: null });
  }

  throw new HttpError('Receipt is not accessible', 500);
});

/* ── Admin: dashboard stats ─────────────────────────────── */
export const adminOrderStats = asyncHandler(async (_req, res) => {
  const [total, pending, paymentSubmitted, paymentVerified, processing, delivered, cancelled, proofAwaiting] =
    await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'PENDING' }),
      Order.countDocuments({ orderStatus: 'PAYMENT_SUBMITTED' }),
      Order.countDocuments({ orderStatus: 'PAYMENT_VERIFIED' }),
      Order.countDocuments({ orderStatus: 'PROCESSING' }),
      Order.countDocuments({ orderStatus: 'DELIVERED' }),
      Order.countDocuments({ orderStatus: 'CANCELLED' }),
      Order.countDocuments({ 'payment.status': 'PROOF_SUBMITTED' }),
    ]);

  res.json({
    success: true,
    stats: { total, pending, paymentSubmitted, paymentVerified, processing, delivered, cancelled, proofAwaiting },
  });
});
