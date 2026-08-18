import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { CartLineItem } from '../components/CartLineItem';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../utils/format';

export function CartPage() {
  const { lines, subtotal, itemCount, isEmpty, increase, decrease, removeItem, clear } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="mb-5 text-2xl font-extrabold text-slate-900">Your Cart</h1>

        {isEmpty ? (
          <div className="card flex flex-col items-center gap-4 p-12 text-center">
            <p className="text-5xl">🛒</p>
            <h2 className="text-lg font-semibold text-slate-800">Your cart is empty</h2>
            <p className="text-sm text-slate-500">Browse the shop and add some products.</p>
            <Link to="/" className="btn-primary px-6 py-2.5">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <div className="card px-5 py-2">
              <ul>
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
              <div className="flex justify-end border-t border-slate-200 py-3">
                <button type="button" onClick={clear} className="btn-ghost text-sm text-red-600 hover:bg-red-50">
                  Clear Cart
                </button>
              </div>
            </div>

            <aside className="card h-fit p-5">
              <h2 className="text-base font-bold text-slate-800">Order Summary</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <dt>Items ({itemCount})</dt>
                  <dd>{formatMoney(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>Delivery</dt>
                  <dd className="text-slate-400">Calculated at confirmation</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                  <dt>Subtotal</dt>
                  <dd className="text-brand-800">{formatMoney(subtotal)}</dd>
                </div>
              </dl>
              <button type="button" onClick={() => navigate('/checkout')} className="btn-primary mt-4 w-full py-3">
                Proceed to Checkout
              </button>
              <Link to="/" className="btn-ghost mt-2 w-full py-2.5">
                Continue Shopping
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}