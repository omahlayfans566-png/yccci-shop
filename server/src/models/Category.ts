import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type CategoryDoc = HydratedDocument<InferSchemaType<typeof CategorySchema>>;

export const Category = model('Category', CategorySchema);