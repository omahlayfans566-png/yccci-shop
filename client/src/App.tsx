import { useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { DeliveryMethodPage } from './pages/DeliveryMethodPage';
import { AdminApp } from './admin/AdminApp';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<ShopPage />} />
        <Route path="/product/:id" element={<ProductDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
        <Route path="/delivery-method/:orderNumber" element={<DeliveryMethodPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ToastProvider>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl">🧭</p>
      <h1 className="text-2xl font-extrabold text-slate-900">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn-primary px-6 py-2.5">Back to Shop</Link>
    </div>
  );
}
