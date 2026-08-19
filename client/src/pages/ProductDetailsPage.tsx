import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Spinner } from '../components/Spinner';
import { QtySelector } from '../components/QtySelector';
import { AvailabilityBadge, availabilityOf } from '../components/AvailabilityBadge';
import { shopApi } from '../api/shopApi';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatMoney, resolveMediaUrl } from '../utils/format';
import type { Product } from '../types';

export function ProductDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState<string>('');
  const [colour, setColour] = useState<string>('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);

    shopApi
      .product(id)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        setActiveImage(0);
        setSize(p.sizes[0] || '');
        setColour(p.colours[0]?.name || '');
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Product not found.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const availability = product ? availabilityOf(product.status, product.stock) : 'AVAILABLE';
  const disabled = availability !== 'AVAILABLE';
  const hasSizes = (product?.sizes.length ?? 0) > 0;
  const hasColours = (product?.colours.length ?? 0) > 0;
  const maxQty = product && product.stock > 0 ? product.stock : 99;

  function handleAddToCart() {
    if (!product || disabled) return;
    if (hasSizes && !size) {
      showToast('Please select a size');
      return;
    }
    if (hasColours && !colour) {
      showToast('Please select a colour');
      return;
    }
    addItem(product, { size: hasSizes ? size : undefined, colour: hasColours ? colour : undefined, qty });
    showToast('Added to cart');
    navigate('/cart');
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Shop
        </Link>

        {loading && (
          <div className="flex justify-center py-24 text-brand-800">
            <Spinner className="h-10 w-10" />
          </div>
        )}

        {error && !loading && (
          <div className="card my-8 flex flex-col items-center gap-4 p-10 text-center">
            <p className="text-4xl">🔍</p>
            <h2 className="text-lg font-semibold text-slate-800">Product not found</h2>
            <p className="text-sm text-slate-500">{error}</p>
            <Link to="/" className="btn-primary px-5 py-2.5">
              Back to Shop
            </Link>
          </div>
        )}

        {product && !loading && (
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="card overflow-hidden">
                <img
                  src={resolveMediaUrl(product.images[activeImage] || product.mainImage)}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                />
              </div>
              {product.images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {product.images.map((img, i) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={`shrink-0 overflow-hidden rounded-lg border-2 ${i === activeImage ? 'border-brand-500' : 'border-transparent'
                        }`}
                      aria-label={`View image ${i + 1}`}
                    >
                      <img src={resolveMediaUrl(img)} alt="" loading="lazy" className="h-20 w-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <AvailabilityBadge status={availability} />
                <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">{product.name}</h1>
                <p className="mt-2 text-2xl font-bold text-brand-800">{formatMoney(product.price)}</p>
              </div>

              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {product.description}
              </p>

              {hasSizes && (
                <div>
                  <p className="label">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={`min-h-11 min-w-12 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${size === s
                          ? 'border-brand-600 bg-brand-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400'
                          }`}
                        aria-pressed={size === s}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasColours && (
                <div>
                  <p className="label">Colour {colour ? `— ${colour}` : ''}</p>
                  <div className="flex flex-wrap gap-2">
                    {product.colours.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setColour(c.name)}
                        className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${colour === c.name
                          ? 'border-brand-600 bg-brand-50 text-brand-800'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400'
                          }`}
                        aria-pressed={colour === c.name}
                      >
                        <span
                          className="inline-block h-5 w-5 rounded-full border border-slate-300"
                          style={{ backgroundColor: c.hex || '#eee' }}
                        />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="label">Quantity</p>
                <QtySelector qty={qty} max={maxQty} onChange={setQty} disabled={disabled} />
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={disabled}
                className="btn-primary w-full py-3.5 sm:w-auto sm:px-10"
              >
                {disabled
                  ? availability === 'SOLD_OUT'
                    ? 'Sold Out'
                    : 'Coming Soon'
                  : 'Add to Cart'}
              </button>

              {product.stock > 0 && product.stock <= 10 && availability === 'AVAILABLE' && (
                <p className="text-sm font-medium text-amber-700">
                  Only {product.stock} left in stock.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}