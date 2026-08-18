# SHOP — Full-Stack E-Commerce Application

A complete, independent shopping application with a customer-facing store and a private admin panel.

---

## Project Structure

```
shop/
├── client/          # React + TypeScript + Vite + Tailwind CSS
└── server/          # Node.js + Express + TypeScript + MongoDB
```

---

## Features

### Customer Shop
- Browse products with search and category filters
- Product detail pages with image gallery, size/colour selection
- Shopping cart (persisted in localStorage)
- Checkout with delivery details form
- Bank transfer payment with receipt upload
- Order confirmation page

### Private Admin Panel (`/admin`)
- **Login** — JWT-secured, role-based access
- **Dashboard** — live order stats and quick links
- **Products** — add, edit, delete, manage images via Backblaze B2
- **Categories** — create and manage product categories
- **Orders** — view all orders, filter by status, update order/payment status
- **Order Detail** — full customer info, items, receipt viewer, status management
- **Payment Settings** — configure bank transfer details (live in shop instantly)
- **Admin Users** — create/disable/delete admin accounts (Super Admin only)
- **Profile** — change own password

---

## Setup

### 1. Server

```bash
cd server
cp .env.example .env
# Fill in your real values in .env
npm install
npm run dev
```

### 2. Client

```bash
cd client
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Long random string for JWT signing |
| `B2_KEY_ID` | ✅ | Backblaze B2 Key ID |
| `B2_APPLICATION_KEY` | ✅ | Backblaze B2 Application Key |
| `B2_BUCKET_NAME` | ✅ | Backblaze B2 bucket name |
| `B2_ENDPOINT` | ✅ | e.g. `s3.us-east-005.backblazeb2.com` |
| `CLIENT_URL` | ✅ | Frontend URL for CORS |
| `PORT` | — | Default: 5000 |
| `ADMIN_INITIAL_EMAIL` | — | First superadmin email |
| `ADMIN_INITIAL_PASSWORD` | — | First superadmin password |

### Client (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL e.g. `http://localhost:5000` |

---

## Admin Panel Access

Navigate to `/admin` or `/admin/login`.

Default credentials (created on first boot from env vars):
- Email: `ADMIN_INITIAL_EMAIL`
- Password: `ADMIN_INITIAL_PASSWORD`

**Change the password immediately after first login.**

---

## API Endpoints

### Public
- `GET /api/health` — Health check
- `GET /api/products` — List products
- `GET /api/products/:id` — Single product
- `GET /api/categories` — List categories
- `GET /api/payment-settings/public` — Payment details
- `POST /api/orders` — Place order (with optional receipt upload)
- `GET /api/orders/number/:orderNumber` — Order lookup

### Admin (requires Bearer JWT)
- `POST /api/admin/login` — Login
- `GET /api/admin/me` — Current admin
- `GET /api/admin/admins` — List admins (superadmin)
- `POST /api/admin/admins` — Create admin (superadmin)
- `GET /api/products/admin/list` — All products including inactive
- `POST /api/products/admin` — Create product with images
- `PUT /api/products/admin/:id` — Update product
- `DELETE /api/products/admin/:id` — Deactivate product
- `POST /api/products/admin/:id/images` — Upload images
- `DELETE /api/products/admin/:id/images/:index` — Delete image
- `GET /api/orders/admin` — List orders (filterable)
- `GET /api/orders/admin/:id` — Order detail
- `PATCH /api/orders/admin/:id` — Update order status
- `GET /api/orders/admin/:id/receipt` — Signed receipt URL
- `GET /api/orders/admin/stats` — Dashboard stats
- `PUT /api/payment-settings/admin` — Update bank details

---

## Deployment (Render)

1. Create a **Web Service** for the server with:
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Add all environment variables from `server/.env.example`

2. Create a **Static Site** for the client with:
   - Build: `npm install && npm run build`
   - Publish: `dist`
   - Add `VITE_API_URL` pointing to the server URL

---

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT authentication on all admin routes
- Role-based authorization (admin / superadmin)
- CORS restricted to frontend origin
- No secrets in frontend code
- Payment receipts served via signed B2 URLs (private)
- Customers cannot access admin endpoints
