import { useCallback, useEffect, useRef, useState } from 'react';
import { shopApi } from '../api/shopApi';
import type { Category, Product } from '../types';

interface ShopData {
  categories: Category[];
  products: Product[];
  loading: boolean;
  error: string | null;
  loadingCategories: boolean;
  refresh: () => void;
}

/**
 * Loads categories once and products (re-runs whenever search/category change),
 * or immediately when `refresh` is invoked (e.g. after a stock change).
 */
export function useShopData(search: string, category: string): ShopData {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Categories load once.
  useEffect(() => {
    let cancelled = false;
    setLoadingCategories(true);
    shopApi
      .categories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {
        // Categories are non-critical: keep the "All" fallback.
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Products re-load on search/category change or manual refresh.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProducts([]);

    const timeout = window.setTimeout(() => {
      shopApi
        .products({ search: search.trim() || undefined, category })
        .then((list) => {
          if (!cancelled) setProducts(list);
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message || 'Could not load products.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, search ? 250 : 0); // debounce the search input

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search, category, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { categories, products, loading, error, loadingCategories, refresh };
}