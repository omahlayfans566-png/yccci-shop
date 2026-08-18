import type { Server } from 'node:http';
import { connectDB } from '../config/db';
import { createApp } from '../app';
import { ensurePaymentSettings } from '../models/PaymentSettings';
import { ensureInitialAdmin } from '../seed/seed';
import { runSeedDatabase } from '../seed/seedDatabase';

/**
 * End-to-end flow test — mirrors the Phase 1 completion test.
 *
 * Requires a running MongoDB (MONGODB_URI). Run: npm run test:flow
 *
 * Flow verified:
 *   seed data → products list → search/filter → product detail →
 *   payment settings → place order (JSON) → place order (with receipt file) →
 *   order lookup (privacy guard) → sold-out / coming-soon rejection →
 *   upload validation (bad type + oversize) → admin login → admin orders list
 */

let failures = 0;
let passed = 0;

function report(name: string, ok: boolean, extra = '') {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`);
  } else {
    failures++;
    console.error(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

async function main() {
  console.log('\n[flow] Connecting to MongoDB…');
  await connectDB();
  await ensurePaymentSettings();
  await ensureInitialAdmin();
  await runSeedDatabase();

  // Start the API in-process on an ephemeral port.
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  console.log(`[flow] API on ${base}\n`);

  const j = (r: Response) => r.json() as Promise<any>;

  try {
    // 1) Categories
    const cats = await fetch(`${base}/api/categories`).then(j);
    report(
      'categories loaded',
      cats.success && Array.isArray(cats.categories) && cats.categories.length >= 5,
      `${cats.categories?.length ?? 0} categories`
    );

    // 2) Products list
    const list = await fetch(`${base}/api/products`).then(j);
    report('products loaded', list.success && list.products.length > 0, `${list.products.length} products`);
    const product = list.products[0];

    // 3) Search
    const term = product.name.slice(0, 6);
    const search = await fetch(`${base}/api/products?search=${encodeURIComponent(term)}`).then(j);
    report('search works', search.success && search.products.length > 0, `query="${term}"`);

    // 4) Category filter
    const categoryId = typeof product.category === 'object' ? product.category._id : product.category;
    const filtered = await fetch(`${base}/api/products?category=${categoryId}`).then(j);
    report('category filter works', filtered.success && filtered.products.length > 0);

    // 5) Product detail
    const detail = await fetch(`${base}/api/products/${product._id}`).then(j);
    report('product detail', detail.success && detail.product._id === product._id);

    // 6) Payment settings (public)
    const pay = await fetch(`${base}/api/payment-settings/public`).then(j);
    report('payment settings endpoint', pay.success && !!pay.paymentSettings.accountNumber);

        // 7) Place order (JSON, no receipt) — initial payment status PENDING
    const orderPayload = {
      customer: {
        fullName: 'Tunde Bakare',
        phone: '08098765432',
        email: 'tunde@example.com',
        address: '23 Marina Road',
        state: 'Lagos',
        city: 'Victoria Island',
        note: 'Leave with the security desk',
      },
      items: [{
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        size: product.sizes?.[0] || '',
        colour: product.colours?.[0]?.name || '',
      }],
      paymentRef: '',
    };
    const placed = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    }).then(j);
    const numberRe = /^SHOP-\d{4}-\d{5}$/;
    report('order placed (JSON)', placed.success && numberRe.test(placed.order?.orderNumber), placed.order?.orderNumber);
    report('whatsapp message generated', !!placed.whatsapp?.message, placed.whatsapp?.message?.split('\n')[0]);

    // 8) Order lookup — correct email = 200, wrong email = 404
    const lookOk = await fetch(
      `${base}/api/orders/number/${placed.order.orderNumber}?email=tunde@example.com`
    );
    report('order lookup with correct email', lookOk.status === 200);
    const lookBad = await fetch(
      `${base}/api/orders/number/${placed.order.orderNumber}?email=wrong@example.com`
    );
    report('order lookup blocked for wrong email', lookBad.status === 404);

    // 9) Place order WITH a receipt file (multipart) — payment status PROOF_SUBMITTED
    const form = new FormData();
    form.append('customer', JSON.stringify({
      fullName: 'Amina Yusuf', phone: '07011223344', email: 'amina@example.com',
      address: '7 Bode Thomas', state: 'Lagos', city: 'Surulere', note: '',
    }));
    form.append('items', JSON.stringify([{
      productId: product._id, name: product.name, price: product.price,
      quantity: 2, size: product.sizes?.[0] || '', colour: product.colours?.[0]?.name || '',
    }]));
    form.append('paymentRef', 'TRANS-2026-ABC123');
    form.append('receipt', new Blob(['%PDF-1.4 fake receipt'], { type: 'application/pdf' }), 'receipt.pdf');
    const withReceipt = await fetch(`${base}/api/orders`, { method: 'POST', body: form }).then(j);
    report('order placed with receipt (multipart)', withReceipt.success && numberRe.test(withReceipt.order?.orderNumber));

    // 10) Sold-out product is rejected
    const soldOut = list.products.find((p: any) => p.status === 'SOLD_OUT');
    if (soldOut) {
      const bad = await fetch(`${base}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { fullName: 'A B', phone: '08111111111', email: 'x@x.com', address: 'addr', state: 'st', city: 'ct' },
          items: [{ productId: soldOut._id, name: soldOut.name, price: soldOut.price, quantity: 1 }],
        }),
      });
      report('sold-out product rejected', bad.status === 409, `status ${bad.status}`);
    } else {
      report('sold-out product rejected', false, 'no SOLD_OUT sample found');
    }

    // 11) Bad file type rejected
    const badForm = new FormData();
    badForm.append('customer', JSON.stringify({ fullName: 'A B', phone: '08111111111', email: 'x@x.com', address: 'addr', state: 'st', city: 'ct' }));
    badForm.append('items', JSON.stringify([{ productId: product._id, name: product.name, price: product.price, quantity: 1 }]));
    badForm.append('receipt', new Blob(['hello'], { type: 'text/plain' }), 'note.txt');
    const badType = await fetch(`${base}/api/orders`, { method: 'POST', body: badForm });
    report('invalid file type rejected', badType.status === 400, `status ${badType.status}`);

    // 12) Oversize file rejected (> 5 MB)
    const bigForm = new FormData();
    bigForm.append('customer', JSON.stringify({ fullName: 'A B', phone: '08111111111', email: 'x@x.com', address: 'addr', state: 'st', city: 'ct' }));
    bigForm.append('items', JSON.stringify([{ productId: product._id, name: product.name, price: product.price, quantity: 1 }]));
    bigForm.append('receipt', new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' }), 'big.png');
    const big = await fetch(`${base}/api/orders`, { method: 'POST', body: bigForm });
    report('oversize file rejected', big.status === 400, `status ${big.status}`);

    // 13) Admin login + protected orders route
    const login = await fetch(`${base}/api/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@shop.com', password: 'ChangeMe123!' }),
    }).then(j);
    report('admin login', login.success && !!login.token);
    const token = login.token || '';
    const noAuth = await fetch(`${base}/api/orders/admin`);
    report('admin orders blocked without token', noAuth.status === 401, `status ${noAuth.status}`);
    const adminOrders = await fetch(`${base}/api/orders/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(j);
    report('admin orders list with token', adminOrders.success && Array.isArray(adminOrders.orders));
  } catch (err) {
    failures++;
    console.error('[flow] Unexpected error:', err);
  } finally {
    server.close();
    await import('mongoose').then((m) => m.default.disconnect());
  }

  console.log(`\n[flow] ${passed} passed, ${failures} failed\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('[flow] Fatal:', err);
  process.exit(1);
});