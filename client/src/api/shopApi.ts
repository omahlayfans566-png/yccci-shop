import { apiRequest, apiUpload } from './client';
import type { Category, CreateOrderPayload, PaymentSettings, Product, SubmitOrderResponse } from '../types';

export const shopApi = {
  async products(params?: { search?: string; category?: string }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    const qs = query.toString();
    const data = await apiRequest<{ success: boolean; products: Product[] }>(
      `/api/products${qs ? `?${qs}` : ''}`
    );
    return data.products;
  },

  async product(id: string): Promise<Product> {
    const data = await apiRequest<{ success: boolean; product: Product }>(`/api/products/${id}`);
    return data.product;
  },

  async categories(): Promise<Category[]> {
    const data = await apiRequest<{ success: boolean; categories: Category[] }>('/api/categories');
    return data.categories;
  },

  async paymentSettings(): Promise<PaymentSettings> {
    const data = await apiRequest<{ success: boolean; paymentSettings: PaymentSettings }>(
      '/api/payment-settings/public'
    );
    return data.paymentSettings;
  },

  async submitOrder(payload: CreateOrderPayload, receipt?: File): Promise<SubmitOrderResponse> {
    if (!receipt) {
      return apiRequest<SubmitOrderResponse>('/api/orders', { method: 'POST', body: payload });
    }
    const form = new FormData();
    form.append('customer', JSON.stringify(payload.customer));
    form.append('items', JSON.stringify(payload.items));
    form.append('paymentRef', payload.paymentRef || '');
    form.append('receipt', receipt);
    return apiUpload<SubmitOrderResponse>('/api/orders', form);
  },

  async ordersLookup(
    orderNumber: string,
    email?: string
  ): Promise<{ receipt: string; total: number } | null> {
    const query = new URLSearchParams();
    if (email) query.set('email', email);
    const qs = query.toString();
    const data = await apiRequest<{
      success: boolean;
      order: { total: number; payment?: { receipt?: string; status?: string } };
    }>(`/api/orders/number/${encodeURIComponent(orderNumber)}${qs ? `?${qs}` : ''}`);
    return {
      receipt: data.order?.payment?.receipt || '',
      total: data.order?.total || 0,
    };
  },
};
