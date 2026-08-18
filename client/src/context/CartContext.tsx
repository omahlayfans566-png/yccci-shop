import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { CartLine, Product, ProductStatus } from '../types';

// ---------------------------------------------------------------------------
// Cart persistence — localStorage key
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'shop_cart_v1';

interface CartState {
  lines: CartLine[];
}

type CartAction =
  | { type: 'ADD'; line: CartLine }
  | { type: 'INCREASE'; key: string }
  | { type: 'DECREASE'; key: string }
  | { type: 'SET_QTY'; key: string; qty: number }
  | { type: 'REMOVE'; key: string }
  | { type: 'CLEAR' };

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const existing = state.lines.find((l) => l.key === action.line.key);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.key === action.line.key
              ? { ...l, qty: Math.min(l.qty + action.line.qty, Math.max(l.stock, l.qty + action.line.qty) || 99) }
              : l
          ),
        };
      }
      return { lines: [...state.lines, action.line] };
    }
    case 'INCREASE':
      return {
        lines: state.lines.map((l) =>
          l.key === action.key ? { ...l, qty: Math.min(l.qty + 1, l.stock > 0 ? l.stock : 99) } : l
        ),
      };
    case 'DECREASE':
      return {
        lines: state.lines.map((l) =>
          l.key === action.key ? { ...l, qty: Math.max(1, l.qty - 1) } : l
        ),
      };
    case 'SET_QTY':
      return {
        lines: state.lines.map((l) =>
          l.key === action.key
            ? { ...l, qty: Math.max(1, Math.min(action.qty, l.stock > 0 ? l.stock : 99)) }
            : l
        ),
      };
    case 'REMOVE':
      return { lines: state.lines.filter((l) => l.key !== action.key) };
    case 'CLEAR':
      return { lines: [] };
    default:
      return state;
  }
}

function buildCartKey(productId: string, size?: string, colour?: string): string {
  return [productId, size || '', colour || ''].join('__');
}

function loadInitialState(): CartState {
  if (typeof window === 'undefined') return { lines: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lines: [] };
    const parsed = JSON.parse(raw) as { lines: CartLine[] };
    if (!Array.isArray(parsed?.lines)) return { lines: [] };
    // Drop lines for products that became unavailable in the meantime.
    return {
      lines: parsed.lines.filter((l) => l.status === 'AVAILABLE'),
    };
  } catch {
    return { lines: [] };
  }
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  isEmpty: boolean;
  getLineKey: (productId: string, size?: string, colour?: string) => string;
  addItem: (product: Product, opts?: { size?: string; colour?: string; qty?: number }) => void;
  removeItem: (key: string) => void;
  increase: (key: string) => void;
  decrease: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  // Persist on every change; robust against refresh.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked — the cart still works for the session.
    }
  }, [state]);

  const getLineKey = useCallback(
    (productId: string, size?: string, colour?: string) => buildCartKey(productId, size, colour),
    []
  );

  const addItem = useCallback(
    (product: Product, opts?: { size?: string; colour?: string; qty?: number }) => {
      const { size, colour, qty = 1 } = opts || {};
      if (product.status !== 'AVAILABLE') return;
      const key = buildCartKey(product._id, size, colour);
      const line: CartLine = {
        key,
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.mainImage,
        stock: product.stock,
        status: product.status as ProductStatus,
        size,
        colour,
        qty,
      };
      dispatch({ type: 'ADD', line });
    },
    []
  );

  const removeItem = useCallback((key: string) => dispatch({ type: 'REMOVE', key }), []);
  const increase = useCallback((key: string) => dispatch({ type: 'INCREASE', key }), []);
  const decrease = useCallback((key: string) => dispatch({ type: 'DECREASE', key }), []);
  const setQty = useCallback(
    (key: string, qty: number) => dispatch({ type: 'SET_QTY', key, qty }),
    []
  );
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const { itemCount, subtotal, isEmpty } = useMemo(() => {
    const count = state.lines.reduce((sum, l) => sum + l.qty, 0);
    const sub = state.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    return { itemCount: count, subtotal: sub, isEmpty: count === 0 };
  }, [state.lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      itemCount,
      subtotal,
      isEmpty,
      getLineKey,
      addItem,
      removeItem,
      increase,
      decrease,
      setQty,
      clear,
    }),
    [state.lines, itemCount, subtotal, isEmpty, getLineKey, addItem, removeItem, increase, decrease, setQty, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}