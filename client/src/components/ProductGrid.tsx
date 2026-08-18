import type { Product } from '../types';
import { ProductCard } from './ProductCard';

interface Props {
  products: Product[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAdd: (product: Product) => void;
}

export function ProductGrid({ products, loading, error, onRetry, onAdd }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-square animate-pulse bg-slate-200" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-8 w-full animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-4xl">😕</p>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Couldn't load products</h3>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
        <button type="button" className="btn-primary px-5 py-2.5" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🛍️</p>
        <h3 className="text-lg font-semibold text-slate-800">No products found</h3>
        <p className="max-w-sm text-sm text-slate-500">
          We couldn't find anything matching your search. Try a different keyword or category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} onAdd={onAdd} />
      ))}
    </div>
  );
}