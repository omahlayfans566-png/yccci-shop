import nodemailer from 'nodemailer';
import { env } from '../config/env';

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: env.emailHost,
      port: env.emailPort,
      secure: env.emailPort === 465,
      auth: {
        user: env.emailUser,
        pass: env.emailPass,
      },
    });
  }
  return _transporter;
}

export function isEmailConfigured(): boolean {
  return !!(env.emailUser && env.emailPass && env.adminEmail);
}

async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('[email] Not configured — skipping notification');
    return;
  }
  try {
    await getTransporter().sendMail({
      from: `"YCCCI Shop" <${env.emailUser}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (err) {
    // Never crash the order flow if email fails
    console.error('[email] Send failed:', err instanceof Error ? err.message : err);
  }
}

/* ── Templates ──────────────────────────────────────────── */

function itemsHtml(items: Array<{ name: string; quantity: number; size?: string; colour?: string; price: number }>): string {
  return items
    .map((i) => {
      const details = [i.size && `Size: ${i.size}`, i.colour && `Colour: ${i.colour}`].filter(Boolean).join(' · ');
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${i.name}${details ? `<br><small style="color:#64748b">${details}</small>` : ''}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${i.quantity}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₦${(i.price * i.quantity).toLocaleString('en-NG')}</td>
      </tr>`;
    })
    .join('');
}

export async function sendNewOrderEmail(order: {
  orderNumber: string;
  customer: { fullName: string; phone: string; email: string; address: string; state: string; city: string; note?: string };
  items: Array<{ name: string; quantity: number; size?: string; colour?: string; price: number }>;
  total: number;
  payment: { status: string; reference?: string };
  createdAt: string | Date;
}): Promise<void> {
  const subject = `🛒 New Order — ${order.orderNumber}`;
  const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
  <div style="background:#0b1f35;padding:20px 24px;">
    <h1 style="color:#fff;margin:0;font-size:18px;">New Order Received</h1>
    <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">${order.orderNumber}</p>
  </div>
  <div style="padding:24px;">
    <h2 style="font-size:15px;color:#0f172a;margin:0 0 12px;">Customer Details</h2>
    <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
      <tr><td style="padding:4px 0;width:130px;color:#64748b">Name</td><td><strong>${order.customer.fullName}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Phone</td><td>${order.customer.phone}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Email</td><td>${order.customer.email}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Address</td><td>${order.customer.address}, ${order.customer.city}, ${order.customer.state}</td></tr>
      ${order.customer.note ? `<tr><td style="padding:4px 0;color:#64748b">Note</td><td><em>${order.customer.note}</em></td></tr>` : ''}
    </table>

    <h2 style="font-size:15px;color:#0f172a;margin:20px 0 12px;">Order Items</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden">
      <thead><tr style="background:#f1f5f9">
        <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px">Product</th>
        <th style="padding:8px 12px;text-align:center;color:#64748b;font-size:12px">Qty</th>
        <th style="padding:8px 12px;text-align:right;color:#64748b;font-size:12px">Amount</th>
      </tr></thead>
      <tbody>${itemsHtml(order.items)}</tbody>
      <tfoot><tr style="background:#f1f5f9">
        <td colspan="2" style="padding:10px 12px;font-weight:700;color:#0f172a">Total</td>
        <td style="padding:10px 12px;font-weight:700;color:#0b1f35;text-align:right">₦${order.total.toLocaleString('en-NG')}</td>
      </tr></tfoot>
    </table>

    <h2 style="font-size:15px;color:#0f172a;margin:20px 0 12px;">Payment</h2>
    <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
      <tr><td style="padding:4px 0;width:130px;color:#64748b">Status</td><td><strong>${order.payment.status}</strong></td></tr>
      ${order.payment.reference ? `<tr><td style="padding:4px 0;color:#64748b">Reference</td><td>${order.payment.reference}</td></tr>` : ''}
    </table>

    <div style="margin-top:24px;padding:12px;background:#f0fdf4;border-radius:8px;text-align:center">
      <p style="margin:0;font-size:13px;color:#166534">Log into the Admin Panel to view the full order and receipt.</p>
    </div>
  </div>
</div>`;
  await sendMail({ to: env.adminEmail, subject, html });
}

export async function sendDeliveryMethodEmail(opts: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  paymentStatus: string;
  deliveryMethod: string;
  deliveryMessage: string;
  total: number;
}): Promise<void> {
  const subject = `🚚 Delivery Instructions — ${opts.orderNumber}`;
  const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
  <div style="background:#0b1f35;padding:20px 24px;">
    <h1 style="color:#fff;margin:0;font-size:18px;">Customer Delivery Instructions</h1>
    <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">${opts.orderNumber}</p>
  </div>
  <div style="padding:24px;">
    <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
      <tr><td style="padding:4px 0;width:160px;color:#64748b">Customer</td><td><strong>${opts.customerName}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Phone</td><td>${opts.customerPhone}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Email</td><td>${opts.customerEmail}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Delivery Address</td><td>${opts.customerAddress}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Payment Status</td><td><strong>${opts.paymentStatus}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Order Total</td><td><strong>₦${opts.total.toLocaleString('en-NG')}</strong></td></tr>
    </table>

    <div style="margin:20px 0;padding:16px;background:#eff6ff;border-left:4px solid #3b82f6;border-radius:4px">
      <p style="margin:0;font-size:12px;text-transform:uppercase;color:#64748b;font-weight:600">Delivery Method Selected</p>
      <p style="margin:8px 0 0;font-size:15px;color:#1e3a5f;font-weight:700">${opts.deliveryMethod}</p>
    </div>

    ${opts.deliveryMessage ? `
    <div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px">
      <p style="margin:0;font-size:12px;text-transform:uppercase;color:#64748b;font-weight:600">Customer Message</p>
      <p style="margin:8px 0 0;font-size:14px;color:#334155;font-style:italic">"${opts.deliveryMessage}"</p>
    </div>` : ''}

    <div style="margin-top:24px;padding:12px;background:#f0fdf4;border-radius:8px;text-align:center">
      <p style="margin:0;font-size:13px;color:#166534">Log into the Admin Panel to update the order status.</p>
    </div>
  </div>
</div>`;
  await sendMail({ to: env.adminEmail, subject, html });
}

export async function sendAdminReplyEmail(opts: {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  replyText: string;
}): Promise<void> {
  const subject = `Reply from YCCCI Shop — Order ${opts.orderNumber}`;
  const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
  <div style="background:#0b1f35;padding:20px 24px;">
    <h1 style="color:#fff;margin:0;font-size:18px;">Message from YCCCI Religious Article Shop</h1>
    <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">Regarding Order ${opts.orderNumber}</p>
  </div>
  <div style="padding:24px;">
    <p style="font-size:15px;color:#334155">Dear <strong>${opts.customerName}</strong>,</p>
    <div style="padding:16px;background:#f8fafc;border-radius:8px;border-left:4px solid #c9a227;">
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.6">${opts.replyText}</p>
    </div>
    <p style="font-size:13px;color:#64748b;margin-top:20px">This message relates to your order <strong>${opts.orderNumber}</strong>. Please keep this email for your records.</p>
    <p style="font-size:13px;color:#64748b">— YCCCI Religious Article Shop Team</p>
  </div>
</div>`;
  await sendMail({ to: opts.customerEmail, subject, html });
}
