import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ShopLogo } from './ShopLogo';
import { CartDrawer } from './CartDrawer';

export function Navbar() {
  const { itemCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Shop home">
            <ShopLogo className="h-9 w-9 sm:h-10 sm:w-10" />
            <span className="text-xl font-extrabold tracking-tight text-brand-900 sm:text-2xl">
              Shop
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Mobile: go to the full cart page (drawer stays available too) */}
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="relative rounded-lg p-2.5 text-slate-600 hover:bg-slate-100 sm:hidden"
              aria-label="Open cart page"
            >
              <CartIcon />
              {itemCount > 0 && <CountBadge count={itemCount} />}
            </button>
            {/* Desktop: slide-out cart drawer */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative hidden rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-slate-100 sm:inline-flex"
              aria-label="Open cart drawer"
            >
              <CartIcon />
              {itemCount > 0 && <CountBadge count={itemCount} />}
            </button>
          </div>
        </div>
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

function CartIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 7h12l1.2 12.2a1.6 1.6 0 0 1-1.6 1.8H6.4a1.6 1.6 0 0 1-1.6-1.8L6 7Z" strokeLinejoin="round" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-xs font-bold text-brand-900">
      {count > 99 ? '99+' : count}
    </span>
  );
}