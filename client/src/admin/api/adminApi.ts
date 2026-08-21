import { adminRequest, adminUpload, adminUploadPut } from './adminClient';
import type {
    AdminUser, Category, AdminProduct, AdminOrder,
    OrderStats, PaymentSettingsData, CreateOrderUpdatePayload,
} from '../types';

/* ── Auth ───────────────────────────────────────── */
export const adminApi = {
    login: (email: string, password: string) =>
        adminRequest<{ success: boolean; token: string; admin: AdminUser }>('/api/admin/login', {
            method: 'POST', body: { email, password },
        }),

    me: () => adminRequest<{ success: boolean; admin: AdminUser }>('/api/admin/me'),

    changePassword: (currentPassword: string, newPassword: string) =>
        adminRequest<{ success: boolean; message: string }>('/api/admin/change-password', {
            method: 'POST', body: { currentPassword, newPassword },
        }),

    /* ── Admin Management ─── */
    listAdmins: () =>
        adminRequest<{ success: boolean; admins: AdminUser[] }>('/api/admin/admins'),

    createAdmin: (data: { name: string; email: string; password: string; role: string }) =>
        adminRequest<{ success: boolean; admin: AdminUser }>('/api/admin/admins', {
            method: 'POST', body: data,
        }),

    updateAdmin: (id: string, data: Partial<AdminUser & { isActive: boolean }>) =>
        adminRequest<{ success: boolean; admin: AdminUser }>(`/api/admin/admins/${id}`, {
            method: 'PUT', body: data,
        }),

    deleteAdmin: (id: string) =>
        adminRequest<{ success: boolean; message: string }>(`/api/admin/admins/${id}`, {
            method: 'DELETE',
        }),

    resetAdminPassword: (id: string, newPassword: string) =>
        adminRequest<{ success: boolean; message: string }>(`/api/admin/admins/${id}/reset-password`, {
            method: 'POST', body: { newPassword },
        }),

    /* ── Categories ─── */
    listCategories: () =>
        adminRequest<{ success: boolean; categories: Category[] }>('/api/categories'),

    createCategory: (data: { name: string; description?: string; sortOrder?: number }) =>
        adminRequest<{ success: boolean; category: Category }>('/api/categories', {
            method: 'POST', body: data,
        }),

    updateCategory: (id: string, data: Partial<Category>) =>
        adminRequest<{ success: boolean; category: Category }>(`/api/categories/${id}`, {
            method: 'PUT', body: data,
        }),

    deleteCategory: (id: string) =>
        adminRequest<{ success: boolean; message: string }>(`/api/categories/${id}`, {
            method: 'DELETE',
        }),

    /* ── Products ─── */
    listProducts: () =>
        adminRequest<{ success: boolean; products: AdminProduct[] }>('/api/products/admin/list'),

    getProduct: (id: string) =>
        adminRequest<{ success: boolean; product: AdminProduct }>(`/api/products/${id}`),

    createProduct: (formData: FormData) =>
        adminUpload<{ success: boolean; product: AdminProduct }>('/api/products/admin', formData),

    updateProduct: (id: string, formData: FormData) =>
        adminUploadPut<{ success: boolean; product: AdminProduct }>(`/api/products/admin/${id}`, formData),

    deleteProduct: (id: string) =>
        adminRequest<{ success: boolean; message: string }>(`/api/products/admin/${id}`, {
            method: 'DELETE',
        }),

    uploadProductImages: (id: string, formData: FormData) =>
        adminUpload<{ success: boolean; images: string[]; mainImage: string }>(
            `/api/products/admin/${id}/images`, formData
        ),

    deleteProductImage: (id: string, imageIndex: number) =>
        adminRequest<{ success: boolean; images: string[]; mainImage: string }>(
            `/api/products/admin/${id}/images/${imageIndex}`, { method: 'DELETE' }
        ),

    setMainImage: (id: string, imageIndex: number) =>
        adminRequest<{ success: boolean; mainImage: string }>(`/api/products/admin/${id}/main-image`, {
            method: 'PUT', body: { imageIndex },
        }),

    /* ── Orders ─── */
    orderStats: () =>
        adminRequest<{ success: boolean; stats: OrderStats }>('/api/orders/admin/stats'),

    listOrders: (params?: {
        page?: number; limit?: number;
        orderStatus?: string; paymentStatus?: string; search?: string;
    }) => {
        const q = new URLSearchParams();
        if (params?.page) q.set('page', String(params.page));
        if (params?.limit) q.set('limit', String(params.limit));
        if (params?.orderStatus) q.set('orderStatus', params.orderStatus);
        if (params?.paymentStatus) q.set('paymentStatus', params.paymentStatus);
        if (params?.search) q.set('search', params.search);
        const qs = q.toString();
        return adminRequest<{ success: boolean; orders: AdminOrder[]; total: number; pages: number }>(
            `/api/orders/admin${qs ? `?${qs}` : ''}`
        );
    },

    getOrder: (id: string) =>
        adminRequest<{ success: boolean; order: AdminOrder }>(`/api/orders/admin/${id}`),

    updateOrder: (id: string, data: CreateOrderUpdatePayload) =>
        adminRequest<{ success: boolean; order: AdminOrder }>(`/api/orders/admin/${id}`, {
            method: 'PATCH', body: data,
        }),

    getReceiptUrl: (id: string) =>
        adminRequest<{ success: boolean; url: string; expires: number | null }>(
            `/api/orders/admin/${id}/receipt`
        ),

    replyToCustomer: (id: string, text: string) =>
        adminRequest<{ success: boolean; messages: Array<{ from: string; text: string; createdAt: string }> }>(
            `/api/orders/admin/${id}/reply`, { method: 'POST', body: { text } }
        ),

    /* ── Payment Settings ─── */
    getPaymentSettings: () =>
        adminRequest<{ success: boolean; paymentSettings: PaymentSettingsData }>(
            '/api/payment-settings/public'
        ),

    updatePaymentSettings: (data: PaymentSettingsData) =>
        adminRequest<{ success: boolean; paymentSettings: PaymentSettingsData }>(
            '/api/payment-settings/admin', { method: 'PUT', body: data }
        ),
};
