import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { SearchBar } from '../components/SearchBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { ProductGrid } from '../components/ProductGrid';
import { useShopData } from '../hooks/useShopData';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import type { Product } from '../types';

export function ShopPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const shop = useShopData(search, category);
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  function handleAdd(product: Product) {
    if (product.sizes.length > 0 || product.colours.length > 0) {
      // Let the customer pick a size/colour on the product page.
      navigate(`/product/${product._id}`);
      return;
    }
    addItem(product);
    showToast(`${product.name} added to cart`);
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 space-y-4">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Browse Products</h1>
          <SearchBar value={search} onChange={setSearch} />
          <CategoryFilter
            categories={shop.categories}
            selected={category}
            onSelect={setCategory}
          />
        </div>

        <ProductGrid
          products={shop.products}
          loading={shop.loading}
          error={shop.error}
          onRetry={shop.refresh}
          onAdd={handleAdd}
        />
      </main>
    </div>
  );
}