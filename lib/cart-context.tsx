"use client";

import { createContext, useCallback, useContext, useEffect, useReducer } from "react";
import {
  loadQuoteBasket,
  saveQuoteBasket,
  type QuoteBasketItem,
} from "@/lib/quote-basket";

// ─── State & Actions ──────────────────────────────────────────────────────────

type CartState = {
  items: QuoteBasketItem[];
};

type CartAction =
  | { type: "ADD"; item: Omit<QuoteBasketItem, "quantity">; qty?: number }
  | { type: "REMOVE"; slug: string }
  | { type: "UPDATE_QTY"; slug: string; qty: number }
  | { type: "CLEAR" }
  | { type: "INIT"; items: QuoteBasketItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "INIT":
      return { items: action.items };
    case "ADD": {
      const qty = action.qty ?? 1;
      const existing = state.items.find((i) => i.slug === action.item.slug);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.slug === action.item.slug ? { ...i, quantity: i.quantity + qty } : i
          ),
        };
      }
      return { items: [...state.items, { ...action.item, quantity: qty }] };
    }
    case "REMOVE":
      return { items: state.items.filter((i) => i.slug !== action.slug) };
    case "UPDATE_QTY":
      return {
        items: state.items
          .map((i) =>
            i.slug === action.slug ? { ...i, quantity: action.qty } : i
          )
          .filter((i) => i.quantity > 0),
      };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type CartContextValue = {
  items: QuoteBasketItem[];
  count: number;
  addItem: (item: Omit<QuoteBasketItem, "quantity">, qty?: number) => void;
  removeItem: (slug: string) => void;
  updateQty: (slug: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadQuoteBasket();
    if (saved.length > 0) {
      dispatch({ type: "INIT", items: saved });
    }
  }, []);

  // Sync to localStorage whenever items change
  useEffect(() => {
    saveQuoteBasket(state.items);
  }, [state.items]);

  const addItem = useCallback(
    (item: Omit<QuoteBasketItem, "quantity">, qty = 1) =>
      dispatch({ type: "ADD", item, qty }),
    []
  );
  const removeItem = useCallback(
    (slug: string) => dispatch({ type: "REMOVE", slug }),
    []
  );
  const updateQty = useCallback(
    (slug: string, qty: number) => dispatch({ type: "UPDATE_QTY", slug, qty }),
    []
  );
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const count = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items: state.items, count, addItem, removeItem, updateQty, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
