import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { formatMoney, resolveMediaUrl } from '../utils/format';
import { AvailabilityBadge, availabilityOf } from './AvailabilityBadge';

interface Props {
  product: Product;
  onAdd: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({ product, onAdd }: Props) {
  const availability = availabilityOf(product.status, product.stock);
  const disabled = availability !== 'AVAILABLE';
  const categoryName =
    typeof product.category === 'object' && product.category ? product.category.name : '';
  const imgSrc = resolveMediaUrl(product.mainImage);

  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link
        to={`/product/${product._id}`}
        className="relative block aspect-square overflow-hidden bg-slate-100"
        aria-label={`View ${product.name}`}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <svg className="h-12 w-12 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="m3 9 4-4 4 4 4-6 6 9" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
          </div>
        )}
        <span className="absolute left-3 top-3">
          <AvailabilityBadge status={availability} />
        </span>
        {disabled && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/40">
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 shadow">
              {availability === 'SOLD_OUT' ? 'Sold Out' : 'Coming Soon'}
            </span>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {categoryName && (
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{categoryName}</p>
        )}
        <Link
          to={`/product/${product._id}`}
          className="line-clamp-1 text-sm font-semibold text-slate-800 hover:text-brand-700"
        >
          {product.name}
        </Link>
        <p className="line-clamp-2 text-sm text-slate-500">
          {product.shortDescription || 'See product details.'}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-bold text-brand-800">{formatMoney(product.price)}</span>
          <button
            type="button"
            className="btn-primary min-h-10 px-3 text-sm"
            disabled={disabled}
            onClick={() => onAdd(product)}
          >
            {disabled ? 'Unavailable' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </article>
  );
});
