export interface AdminUser {
    _id: string;
    name: string;
    email: string;
    role: 'admin' | 'superadmin';
    isActive: boolean;
    createdAt?: string;
}

export interface Category {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface ColourOption { name: string; hex?: string; }

export interface AdminProduct {
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
    status: 'AVAILABLE' | 'SOLD_OUT' | 'COMING_SOON';
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface OrderItem {
    product?: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
    size?: string;
    colour?: string;
}

export interface AdminOrder {
    _id: string;
    orderNumber: string;
    customer: {
        fullName: string;
        phone: string;
        email: string;
        address: string;
        state: string;
        city: string;
        note?: string;
    };
    items: OrderItem[];
    subtotal: number;
    total: number;
    payment: {
        status: string;
        reference?: string;
        receipt?: string;
        receiptKey?: string;
        receiptOriginalName?: string;
        receiptUploadedAt?: string;
        rejectionReason?: string;
        bankName?: string;
        accountName?: string;
        accountNumber?: string;
    };
    orderStatus: string;
    deliveryStatus: string;
    adminNotes?: string;
    /** Customer-selected delivery method */
    deliveryMethod?: string;
    deliveryMessage?: string;
    deliverySubmittedAt?: string;
    /** Admin ↔ customer message thread */
    messages?: Array<{ from: 'admin' | 'customer'; text: string; createdAt: string }>;
    createdAt: string;
    updatedAt: string;
}

export interface OrderStats {
    total: number;
    pending: number;
    paymentSubmitted: number;
    paymentVerified: number;
    processing: number;
    delivered: number;
    cancelled: number;
    proofAwaiting: number;
}

export interface PaymentSettingsData {
    bankName: string;
    accountName: string;
    accountNumber: string;
    instructions?: string;
}

export interface CreateOrderUpdatePayload {
    orderStatus?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    adminNotes?: string;
    rejectionReason?: string;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    PAYMENT_SUBMITTED: 'Payment Submitted',
    PAYMENT_VERIFIED: 'Payment Verified',
    PROCESSING: 'Processing',
    READY_FOR_DELIVERY: 'Ready for Delivery',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    PROOF_SUBMITTED: 'Proof Submitted',
    VERIFIED: 'Verified',
    REJECTED: 'Rejected',
    REFUNDED: 'Refunded',
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS);
export const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_LABELS);

export const ORDER_STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    PAYMENT_SUBMITTED: 'bg-blue-100 text-blue-700',
    PAYMENT_VERIFIED: 'bg-emerald-100 text-emerald-700',
    PROCESSING: 'bg-purple-100 text-purple-700',
    READY_FOR_DELIVERY: 'bg-amber-100 text-amber-700',
    OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    PROOF_SUBMITTED: 'bg-blue-100 text-blue-700',
    VERIFIED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-amber-100 text-amber-700',
};
