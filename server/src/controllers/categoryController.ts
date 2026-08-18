import type { Request, Response } from 'express';
import { Category } from '../models/Category';
import { asyncHandler, HttpError } from '../middleware/error';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ success: true, categories });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, sortOrder } = req.body;
  const slug = req.body.slug || slugify(name);
  const exists = await Category.findOne({ slug });
  if (exists) throw new HttpError('A category with that name already exists', 409);

  const category = await Category.create({ name, slug, description, sortOrder: sortOrder || 0 });
  res.status(201).json({ success: true, category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const update: Record<string, unknown> = { ...req.body };
  if (update.name && !update.slug) update.slug = slugify(update.name as string);

  const category = await Category.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!category) throw new HttpError('Category not found', 404);
  res.json({ success: true, category });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) throw new HttpError('Category not found', 404);
  res.json({ success: true, message: 'Category deactivated' });
});