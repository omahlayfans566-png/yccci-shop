import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export type PaymentStatus =
  | 'PENDING'
  | 'PROOF_SUBMITTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REFUNDED';

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_VERIFIED'
  | 'PROCESSING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type DeliveryStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PROCESSING',
  'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
];
const PAYMENT_STATUSES: PaymentStatus[] = [
  'PENDING', 'PROOF_SUBMITTED', 'VERIFIED', 'REJECTED', 'REFUNDED',
];
const DELIVERY_STATUSES: DeliveryStatus[] = [
  'PENDING', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, default: '' },
    colour: { type: String, default: '' },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: {
      fullName: { type: String, required: true, trim: true, maxlength: 120 },
      phone: { type: String, required: true, trim: true, maxlength: 30 },
      email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
      address: { type: String, required: true, trim: true, maxlength: 500 },
      state: { type: String, required: true, trim: true, maxlength: 80 },
      city: { type: String, required: true, trim: true, maxlength: 80 },
      note: { type: String, default: '', maxlength: 1000 },
    },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    payment: {
      status: {
        type: String,
        enum: PAYMENT_STATUSES,
        default: 'PENDING',
        index: true,
      },
      reference: { type: String, default: '', trim: true, maxlength: 200 },
      /** URL/key of the uploaded receipt (B2 or local). */
      receipt: { type: String, default: '' },
      receiptKey: { type: String, default: '' },        // B2 object key
      receiptBucket: { type: String, default: '' },
      receiptOriginalName: { type: String, default: '' },
      receiptUploadedAt: { type: Date },
      rejectionReason: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'PENDING',
      index: true,
    },
    deliveryStatus: {
      type: String,
      enum: DELIVERY_STATUSES,
      default: 'PENDING',
    },
    adminNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'customer.phone': 1 });
OrderSchema.index({ 'customer.email': 1 });

export { ORDER_STATUSES, PAYMENT_STATUSES, DELIVERY_STATUSES };
export type Order = InferSchemaType<typeof OrderSchema>;
export type OrderDoc = HydratedDocument<Order>;

export const Order = model('Order', OrderSchema);