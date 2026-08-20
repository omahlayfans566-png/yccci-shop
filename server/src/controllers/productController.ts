import type { Request, Response } from 'express';
import { Product } from '../models/Product';
import { asyncHandler, HttpError } from '../middleware/error';
import {
  uploadProductImage,
  deleteFromCloudinary,
  isCloudinaryConfigured,
} from '../config/cloudinary';

/* ─── helper ──────────────────────────────────────────────── */
async function uploadImage(
  file: Express.Multer.File,
  productId: string
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new HttpError(
      'Image storage (Cloudinary) is not configured on the server. ' +
      'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      500
    );
  }
  const result = await uploadProductImage(file.buffer, productId);
  return { url: result.secureUrl, publicId: result.publicId };
}

/* ─── public ──────────────────────────────────────────────── */

export const listProducts = asyncHandler(async (req, res) => {
  const search = (req.query.search as string | undefined)?.trim() ?? '';
  const category = (req.query.category as string | undefined)?.trim() ?? '';

  const filter: Record<string, unknown> = { isActive: true };
  if (category && category !== 'all') filter.category = category;

  let query = Product.find(filter);
  if (search) {
    query = Product.find({
      ...filter,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ],
    });
  }

  const products = await query
    .sort({ sortOrder: 1, createdAt: -1 })
    .populate('category')
    .lean();

  res.json({ success: true, products });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true })
    .populate('category')
    .lean();
  if (!product) throw new HttpError('Product not found', 404);
  res.json({ success: true, product });
});

/* ─── admin ───────────────────────────────────────────────── */

export const adminListProducts = asyncHandler(async (_req, res) => {
  const products = await Product.find()
    .populate('category')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, products });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = parseProductBody(req.body);
  const files = req.files as Express.Multer.File[] | undefined;

  // Upload all images to Cloudinary BEFORE creating the document.
  // If any upload fails, we abort and return an error — no broken product is saved.
  const imageUrls: string[] = [];
  const imagePublicIds: string[] = [];

  if (files && files.length > 0) {
    const tempId = `new-${Date.now()}`;
    for (const file of files) {
      const { url, publicId } = await uploadImage(file, tempId);
      imageUrls.push(url);
      imagePublicIds.push(publicId);
    }
  }

  const product = await Product.create({
    ...body,
    images: imageUrls,
    mainImage: imageUrls[0] ?? '',
    imagePublicIds,
  });

  const populated = await product.populate('category');
  res.status(201).json({ success: true, product: populated });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = parseProductBody(req.body);
  const product = await Product.findById(req.params.id) as any;
  if (!product) throw new HttpError('Product not found', 404);

  Object.assign(product, body);

  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    const newUrls: string[] = [];
    const newPids: string[] = [];
    for (const file of files) {
      const { url, publicId } = await uploadImage(file, product._id.toString());
      newUrls.push(url);
      newPids.push(publicId);
    }
    product.images = [...(product.images ?? []), ...newUrls];
    if (!product.mainImage) product.mainImage = newUrls[0];
    product.imagePublicIds = [...(product.imagePublicIds ?? []), ...newPids];
  }

  await product.save();
  const populated = await product.populate('category');
  res.json({ success: true, product: populated });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id, { isActive: false }, { new: true }
  );
  if (!product) throw new HttpError('Product not found', 404);
  res.json({ success: true, message: 'Product deactivated' });
});

export const hardDeleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id) as any;
  if (!product) throw new HttpError('Product not found', 404);

  // Remove all Cloudinary assets
  const pids: string[] = product.imagePublicIds ?? [];
  for (const pid of pids) {
    await deleteFromCloudinary(pid, 'image', 'upload').catch(() => { });
  }

  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Product permanently deleted' });
});

export const uploadProductImages = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id) as any;
  if (!product) throw new HttpError('Product not found', 404);

  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) throw new HttpError('No images uploaded', 400);

  const newUrls: string[] = [];
  const newPids: string[] = [];
  for (const file of files) {
    const { url, publicId } = await uploadImage(file, product._id.toString());
    newUrls.push(url);
    newPids.push(publicId);
  }

  product.images = [...(product.images ?? []), ...newUrls];
  if (!product.mainImage) product.mainImage = newUrls[0];
  product.imagePublicIds = [...(product.imagePublicIds ?? []), ...newPids];
  await product.save();

  res.json({ success: true, images: product.images, mainImage: product.mainImage });
});

export const deleteProductImage = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id) as any;
  if (!product) throw new HttpError('Product not found', 404);

  const idx = parseInt(req.params.imageIndex, 10);
  if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
    throw new HttpError('Invalid image index', 400);
  }

  const removedUrl = product.images[idx];
  product.images.splice(idx, 1);

  // Delete from Cloudinary
  const pids: string[] = product.imagePublicIds ?? [];
  if (pids[idx]) {
    await deleteFromCloudinary(pids[idx], 'image', 'upload').catch(() => { });
    pids.splice(idx, 1);
    product.imagePublicIds = pids;
  }

  if (product.mainImage === removedUrl) product.mainImage = product.images[0] ?? '';
  await product.save();

  res.json({ success: true, images: product.images, mainImage: product.mainImage });
});

export const setMainImage = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError('Product not found', 404);

  const idx = parseInt(String(req.body.imageIndex), 10);
  if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
    throw new HttpError('Invalid image index', 400);
  }
  product.mainImage = product.images[idx];
  await product.save();
  res.json({ success: true, mainImage: product.mainImage });
});

/* ─── internal ────────────────────────────────────────────── */
function parseProductBody(raw: Record<string, unknown>): Record<string, unknown> {
  const body = { ...raw };
  if (typeof body.sizes === 'string') { try { body.sizes = JSON.parse(body.sizes as string); } catch { body.sizes = []; } }
  if (typeof body.colours === 'string') { try { body.colours = JSON.parse(body.colours as string); } catch { body.colours = []; } }
  if (typeof body.stock === 'string') body.stock = Number(body.stock);
  if (typeof body.price === 'string') body.price = Number(body.price);
  if (typeof body.sortOrder === 'string') body.sortOrder = Number(body.sortOrder);
  return body;
}
