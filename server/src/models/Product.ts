import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export type ProductStatus = 'AVAILABLE' | 'SOLD_OUT' | 'COMING_SOON';

export const PRODUCT_STATUSES: ProductStatus[] = ['AVAILABLE', 'SOLD_OUT', 'COMING_SOON'];

export interface ColourOption {
  /** Colour name, e.g. "Navy Blue" */
  name: string;
  /** Hex code used for the colour swatch, e.g. "#1a237e" */
  hex?: string;
}

const ColourSchema = new Schema<ColourOption>(
  { name: { type: String, required: true }, hex: { type: String, default: '' } },
  { _id: false }
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    shortDescription: { type: String, default: '', maxlength: 300 },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    mainImage: { type: String, default: '' },
    images: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    colours: { type: [ColourSchema], default: [] },
    /** Quantity in stock. 0 forces SOLD_OUT at the API layer unless status = COMING_SOON. */
    stock: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'AVAILABLE', index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text', shortDescription: 'text', description: 'text' });

export type Product = InferSchemaType<typeof ProductSchema>;
export type ProductDoc = HydratedDocument<Product>;

export const Product = model('Product', ProductSchema);