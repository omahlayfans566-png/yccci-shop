import path from 'node:path';
import type { Request, Response } from 'express';
import { Product } from '../models/Product';
import { asyncHandler, HttpError } from '../middleware/error';
import { uploadToB2, deleteFromB2, isB2Configured, keyFromUrl, getSignedUrl24h } from '../config/storage';

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
  if (!isB2Configured()) {
    throw new HttpError('Storage is not configured. Please set B2 environment variables.', 500);
  }
  const ext = sanitizeExt(file.originalname, file.mimetype);
  const key = `products/product-${productId}/image-${Date.now()}-${index}${ext}`;
  const url = await uploadToB2({
    key,
    buffer: file.buffer,
    contentType: file.mimetype,
    contentLength: file.size,
  });
  return { url, key };
}

/**
 * Attach fresh 24-hour signed URLs to a product's image fields.
 * Called before sending any product to the public API so images
 * display correctly even when the B2 bucket is private.
 */
async function attachSignedImageUrls(product: Record<string, unknown>): Promise<void> {
  if (!isB2Configured()) return;

  try {
    const images = (product.images as string[]) || [];
    const signedImages: string[] = [];

    for (const imgUrl of images) {
      if (!imgUrl) { signedImages.push(imgUrl); continue; }
      try {
        const key = keyFromUrl(imgUrl);
        const signed = await getSignedUrl24h(key);
        signedImages.push(signed);
      } catch {
        signedImages.push(imgUrl); // keep original on failure
      }
    }

    product.images = signedImages;

    // mainImage — sign it if it's one of the images, else sign it separately
    const mainImage = product.mainImage as string;
    if (mainImage) {
      const mainIdx = images.findIndex(u => u === mainImage);
      if (mainIdx >= 0 && signedImages[mainIdx]) {
        product.mainImage = signedImages[mainIdx];
      } else {
        try {
          product.mainImage = await getSignedUrl24h(keyFromUrl(mainImage));
        } catch {
          // keep original
        }
      }
    }
  } catch {
    // Never break the product response due to a signing failure
  }
}

/* ─── public endpoints ─────────────────────────────────────── */

export const listProducts = asyncHandler(async (req, res) => {
  const search = (req.query.search as string | undefined)?.trim() || '';
  const category = (req.query.category as string | undefined)?.trim() || '';

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

  const rawProducts = await query
    .sort({ sortOrder: 1, createdAt: -1 })
    .populate('category')
    .lean() as Record<string, unknown>[];

  // Sign all image URLs before returning
  await Promise.all(rawProducts.map(attachSignedImageUrls));

  res.json({ success: true, products: rawProducts });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true })
    .populate('category')
    .lean() as Record<string, unknown> | null;
  if (!product) throw new HttpError('Product not found', 404);

  await attachSignedImageUrls(product);

  res.json({ success: true, product });
});

/**
 * GET /api/products/:id/image-url?index=0
 * Returns a fresh signed URL for a single product image.
 */
export const getProductImageUrl = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) throw new HttpError('Product not found', 404);

  const idx = parseInt((req.query.index as string) || '0', 10);
  const images = product.images || [];
  const rawUrl = images[idx] || product.mainImage || '';
  if (!rawUrl) throw new HttpError('Image not found', 404);

  if (!isB2Configured()) return res.json({ success: true, url: rawUrl });

  const signedUrl = await getSignedUrl24h(keyFromUrl(rawUrl));
  res.json({ success: true, url: signedUrl });
});

/* ─── admin endpoints ─────────────────────────────────────── */

export const adminListProducts = asyncHandler(async (_req, res) => {
  const rawProducts = await Product.find()
    .populate('category')
    .sort({ createdAt: -1 })
    .lean() as Record<string, unknown>[];

  // Sign images for admin panel previews too
  await Promise.all(rawProducts.map(attachSignedImageUrls));

  res.json({ success: true, products: rawProducts });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = { ...req.body };
  if (typeof body.sizes === 'string') { try { body.sizes = JSON.parse(body.sizes); } catch { body.sizes = []; } }
  if (typeof body.colours === 'string') { try { body.colours = JSON.parse(body.colours); } catch { body.colours = []; } }
  if (typeof body.stock === 'string') body.stock = Number(body.stock);
  if (typeof body.price === 'string') body.price = Number(body.price);
  if (typeof body.sortOrder === 'string') body.sortOrder = Number(body.sortOrder);

  const product = await Product.create(body);

  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    const imageUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const { url } = await uploadProductImage(files[i], product._id.toString(), i);
      imageUrls.push(url);
    }
    product.images = imageUrls;
    product.mainImage = imageUrls[0];
    await product.save();
  }

  const populated = await product.populate('category');
  const productObj = populated.toObject() as Record<string, unknown>;
  await attachSignedImageUrls(productObj);
  res.status(201).json({ success: true, product: productObj });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = { ...req.body };
  if (typeof body.sizes === 'string') { try { body.sizes = JSON.parse(body.sizes); } catch { body.sizes = []; } }
  if (typeof body.colours === 'string') { try { body.colours = JSON.parse(body.colours); } catch { body.colours = []; } }
  if (typeof body.stock === 'string') body.stock = Number(body.stock);
  if (typeof body.price === 'string') body.price = Number(body.price);
  if (typeof body.sortOrder === 'string') body.sortOrder = Number(body.sortOrder);

  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError('Product not found', 404);

  Object.assign(product, body);

  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    const imageUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const { url } = await uploadProductImage(files[i], product._id.toString(), i);
      imageUrls.push(url);
    }
    product.images = [...(product.images || []), ...imageUrls];
    if (!product.mainImage) product.mainImage = imageUrls[0];
  }

  await product.save();
  const populated = await product.populate('category');
  const productObj = populated.toObject() as Record<string, unknown>;
  await attachSignedImageUrls(productObj);
  res.json({ success: true, product: productObj });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) throw new HttpError('Product not found', 404);
  res.json({ success: true, message: 'Product deactivated' });
});

export const hardDeleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError('Product not found', 404);
  if (isB2Configured()) {
    for (const imgUrl of product.images) {
      await deleteFromB2(keyFromUrl(imgUrl)).catch(() => { });
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

  const imageUrls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const { url } = await uploadProductImage(files[i], product._id.toString(), i);
    imageUrls.push(url);
  }
  product.images = [...(product.images || []), ...imageUrls];
  if (!product.mainImage) product.mainImage = imageUrls[0];
  await product.save();
  res.json({ success: true, images: product.images, mainImage: product.mainImage });
});

export const deleteProductImage = asyncHandler(async (req: Request, res: Response) => {
  const { id, imageIndex } = req.params;
  const product = await Product.findById(id);
  if (!product) throw new HttpError('Product not found', 404);

  const idx = parseInt(imageIndex, 10);
  if (isNaN(idx) || idx < 0 || idx >= product.images.length) throw new HttpError('Invalid image index', 400);

  const imgUrl = product.images[idx];
  if (isB2Configured() && imgUrl) {
    await deleteFromB2(keyFromUrl(imgUrl)).catch(() => { });
  }
  product.images.splice(idx, 1);
  if (product.mainImage === imgUrl) product.mainImage = product.images[0] || '';
  await product.save();
  res.json({ success: true, images: product.images, mainImage: product.mainImage });
});

export const setMainImage = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError('Product not found', 404);
  const idx = parseInt(String(req.body.imageIndex), 10);
  if (isNaN(idx) || idx < 0 || idx >= product.images.length) throw new HttpError('Invalid image index', 400);
  product.mainImage = product.images[idx];
  await product.save();
  res.json({ success: true, mainImage: product.mainImage });
});
