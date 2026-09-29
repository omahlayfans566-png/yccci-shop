export type ProductStatus = 'AVAILABLE' | 'SOLD_OUT' | 'COMING_SOON';

export interface ColourOption {
  name: string;
  hex?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface Product {
  _id: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  category: Category | string;
  mainImage: string;
  images: string[];
  sizes: string[];
  colours: ColourOption[];
  stock: number;
  status: ProductStatus;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type Availability = 'AVAILABLE' | 'SOLD_OUT' | 'COMING_SOON';

export interface PaymentSettings {
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
}

export interface CartLine {
  key: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  status: Availability;
  size?: string;
  colour?: string;
  qty: number;
}

export interface CreateOrderPayload {
  customer?: {
    email?: string;
    fullName?: string;
    phone?: string;
    address?: string;
    state?: string;
    city?: string;
    note?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
    colour?: string;
  }>;
  paymentRef?: string;
}

export interface OrderResult {
  orderNumber: string;
  createdAt: string;
  total: number;
}

export interface SubmitOrderResponse {
  success: boolean;
  order: OrderResult;
}

// ---------------------------------------------------------------------------
// Paystack payment types
// ---------------------------------------------------------------------------

/** Lifecycle status of a Paystack transaction (mirrors the server model). */
export type PaystackTxStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';

/** Response from POST /api/paystack/initialize */
export interface PaystackInitResponse {
  success: boolean;
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/** Response from GET /api/paystack/verify/:reference */
export interface PaystackVerifyResponse {
  success: boolean;
  status: PaystackTxStatus | string;
  orderNumber: string;
  message: string;
}

/** Response from GET /api/paystack/status/:reference */
export interface PaystackStatusResponse {
  success: boolean;
  status: PaystackTxStatus;
  orderNumber: string;
  webhookProcessed: boolean;
  paidAt: string | null;
}
