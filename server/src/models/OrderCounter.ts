import { Schema, model, type InferSchemaType } from 'mongoose';

/** Monotonic counter used to mint unique order numbers per year. */
const OrderCounterSchema = new Schema(
  {
    key: { type: Number, required: true, unique: true }, // e.g. 2026
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type OrderCounter = InferSchemaType<typeof OrderCounterSchema>;
export const OrderCounter = model('OrderCounter', OrderCounterSchema);