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
      {/* Image */}
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
            <svg className="h-10 w-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="m3 9 4-4 4 4 4-6 6 9" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
          </div>
        )}
        <span className="absolute left-2 top-2">
          <AvailabilityBadge status={availability} />
        </span>
        {disabled && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/40">
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 shadow">
              {availability === 'SOLD_OUT' ? 'Sold Out' : 'Coming Soon'}
            </span>
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {categoryName && (
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 truncate">
            {categoryName}
          </p>
        )}
        <Link
          to={`/product/${product._id}`}
          className="line-clamp-2 text-xs font-semibold leading-tight text-slate-800 hover:text-brand-700 sm:text-sm"
        >
          {product.name}
        </Link>
        {product.shortDescription && (
          <p className="line-clamp-1 text-xs text-slate-400 hidden sm:block">
            {product.shortDescription}
          </p>
        )}
        <div className="mt-auto pt-2 flex flex-col gap-1.5">
          <span className="text-sm font-bold text-brand-800 sm:text-base">
            {formatMoney(product.price)}
          </span>
          <button
            type="button"
            className={`w-full rounded-lg py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5 sm:text-sm ${disabled
                ? 'bg-slate-100 text-slate-500'
                : 'bg-brand-800 text-white hover:bg-brand-900'
              }`}
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
