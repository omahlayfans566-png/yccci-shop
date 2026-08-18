import path from 'node:path';
import type { Request, Response } from 'express';
import { Product } from '../models/Product';
import { asyncHandler, HttpError } from '../middleware/error';
import { uploadToB2, deleteFromB2, isB2Configured } from '../config/storage';
import { env } from '../config/env';

/* ─── helpers ─────────────────────────────────────────────── */

function sanitizeExt(originalname: string, mime: string): string {
  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  return extMap[mime] || path.extname(originalname).toLowerCase() || '.jpg';
}

async function uploadProductImage(
  file: Express.Multer.File,
  productId: string,
  index: number
): Promise<{ url: string; key: string }> {
  const ext = sanitizeExt(file.originalname, file.mimetype);
  const key = `products/product-${productId}/image-${Date.now()}-${index}${ext}`;

  if (!isB2Configured()) {
    throw new HttpError('Storage is not configured. Please set B2 environment variables.', 500);
  }

  const url = await uploadToB2({
    key,
    buffer: file.buffer,
    contentType: file.mimetype,
    contentLength: file.size,
  });
  return { url, key };
}

/* ─── public endpoints ─────────────────────────────────────── */

export const listProducts = asyncHandler(async (req, res) => {
  const search = (req.query.search as string | undefined)?.trim() || '';
  const category = (req.query.category as string | undefined)?.trim() || '';
  const status = (req.query.status as string | undefined)?.trim() || '';

  const filter: Record<string, unknown> = { isActive: true };
  if (category && category !== 'all') filter.category = category;
  if (status && status !== 'all') filter.status = status;

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
  const products = await query.sort({ sortOrder: 1, createdAt: -1 }).populate('category').lean();
  res.json({ success: true, products });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true })
    .populate('category')
    .lean();
  if (!product) throw new HttpError('Product not found', 404);
  res.json({ success: true, product });
});

/* ─── admin endpoints ─────────────────────────────────────── */

export const adminListProducts = asyncHandler(async (_req, res) => {
  const products = await Product.find()
    .populate('category')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, products });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  // Parse JSON fields that may arrive as strings (multipart)
  const body = { ...req.body };
  if (typeof body.sizes === 'string') {
    try { body.sizes = JSON.parse(body.sizes); } catch { body.sizes = []; }
  }
  if (typeof body.colours === 'string') {
    try { body.colours = JSON.parse(body.colours); } catch { body.colours = []; }
  }
  if (typeof body.stock === 'string') body.stock = Number(body.stock);
  if (typeof body.price === 'string') body.price = Number(body.price);
  if (typeof body.sortOrder === 'string') body.sortOrder = Number(body.sortOrder);

  const product = await Product.create(body);

  // Handle uploaded images
  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    const imageData: Array<{ url: string; key: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const { url, key } = await uploadProductImage(files[i], product._id.toString(), i);
      imageData.push({ url, key });
    }
    product.images = imageData.map((d) => d.url);
    product.mainImage = imageData[0].url;
    // Store keys for future deletion
    (product as any).imageKeys = imageData.map((d) => d.key);
    await product.save();
  }

  const populated = await product.populate('category');
  res.status(201).json({ success: true, product: populated });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = { ...req.body };
  if (typeof body.sizes === 'string') {
    try { body.sizes = JSON.parse(body.sizes); } catch { body.sizes = []; }
  }
  if (typeof body.colours === 'string') {
    try { body.colours = JSON.parse(body.colours); } catch { body.colours = []; }
  }
  if (typeof body.stock === 'string') body.stock = Number(body.stock);
  if (typeof body.price === 'string') body.price = Number(body.price);
  if (typeof body.sortOrder === 'string') body.sortOrder = Number(body.sortOrder);

  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError('Product not found', 404);

  Object.assign(product, body);

  // Handle new images if uploaded
  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    const imageData: Array<{ url: string; key: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const { url, key } = await uploadProductImage(files[i], product._id.toString(), i);
      imageData.push({ url, key });
    }
    // Append to existing images
    const existingImages = product.images || [];
    product.images = [...existingImages, ...imageData.map((d) => d.url)];
    if (!product.mainImage) product.mainImage = imageData[0].url;
  }

  await product.save();
  const populated = await product.populate('category');
  res.json({ success: true, product: populated });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!product) throw new HttpError('Product not found', 404);
  res.json({ success: true, message: 'Product deactivated' });
});

export const hardDeleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError('Product not found', 404);

  // Delete images from B2
  if (isB2Configured()) {
    for (const imgUrl of product.images) {
      // Derive the key from the URL
      const key = imgUrl.replace(
        `https://${env.b2Endpoint}/${env.b2BucketName}/`,
        ''
      );
      if (key && key !== imgUrl) {
        await deleteFromB2(key).catch(() => { });
      }
    }
  }

  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Product permanently deleted' });
});

export const uploadProductImages = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError('Product not found', 404);

  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) throw new HttpError('No images uploaded', 400);

  const imageData: Array<{ url: string; key: string }> = [];
  for (let i = 0; i < files.length; i++) {
    const { url, key } = await uploadProductImage(files[i], product._id.toString(), i);
    imageData.push({ url, key });
  }

  const newUrls = imageData.map((d) => d.url);
  product.images = [...(product.images || []), ...newUrls];
  if (!product.mainImage) product.mainImage = newUrls[0];
  await product.save();

  res.json({ success: true, images: product.images, mainImage: product.mainImage });
});

export const deleteProductImage = asyncHandler(async (req: Request, res: Response) => {
  const { id, imageIndex } = req.params;
  const product = await Product.findById(id);
  if (!product) throw new HttpError('Product not found', 404);

  const idx = parseInt(imageIndex, 10);
  if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
    throw new HttpError('Invalid image index', 400);
  }

  const imgUrl = product.images[idx];
  // Try to delete from B2
  if (isB2Configured() && imgUrl) {
    const key = imgUrl.replace(
      `https://${env.b2Endpoint}/${env.b2BucketName}/`,
      ''
    );
    if (key && key !== imgUrl) {
      await deleteFromB2(key).catch(() => { });
    }
  }

  product.images.splice(idx, 1);
  if (product.mainImage === imgUrl) {
    product.mainImage = product.images[0] || '';
  }
  await product.save();

  res.json({ success: true, images: product.images, mainImage: product.mainImage });
});

export const setMainImage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { imageIndex } = req.body;
  const product = await Product.findById(id);
  if (!product) throw new HttpError('Product not found', 404);

  const idx = parseInt(String(imageIndex), 10);
  if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
    throw new HttpError('Invalid image index', 400);
  }

  product.mainImage = product.images[idx];
  await product.save();
  res.json({ success: true, mainImage: product.mainImage });
});
