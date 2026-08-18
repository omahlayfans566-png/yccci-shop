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
  customer: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    state: string;
    city: string;
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
