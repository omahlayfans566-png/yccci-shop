import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../utils/format';
import { CartLineItem } from './CartLineItem';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: Props) {
  const { lines, subtotal, isEmpty, increase, decrease, removeItem, itemCount } = useCart();
  const navigate = useNavigate();

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl animate-slide-in-right"
        role="dialog"
        aria-label="Shopping cart"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800">
            Your Cart{' '}
            <span className="text-sm font-medium text-slate-400">({itemCount})</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close cart"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-4xl">🛒</p>
            <h3 className="text-base font-semibold text-slate-700">Your cart is empty</h3>
            <p className="text-sm text-slate-500">Add some products to get started.</p>
            <button type="button" className="btn-primary mt-2 px-5 py-2.5" onClick={onClose}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5">
              {lines.map((line) => (
                <CartLineItem
                  key={line.key}
                  line={line}
                  onIncrease={() => increase(line.key)}
                  onDecrease={() => decrease(line.key)}
                  onRemove={() => removeItem(line.key)}
                />
              ))}
            </ul>
            <footer className="border-t border-slate-200 px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Subtotal</span>
                <span className="text-lg font-bold text-brand-800">{formatMoney(subtotal)}</span>
              </div>
              <button
                type="button"
                className="btn-primary w-full py-3"
                onClick={() => {
                  onClose();
                  navigate('/checkout');
                }}
              >
                Proceed to Checkout
              </button>
              <button
                type="button"
                className="btn-ghost mt-2 w-full py-2.5"
                onClick={onClose}
              >
                Continue Shopping
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}