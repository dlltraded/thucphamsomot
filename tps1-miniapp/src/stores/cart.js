// Zustand store - Cart / Selected Products
import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],

  addItem: (product) => {
    const existing = get().items.find((i) => i.id === product.id);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        ),
      });
    } else {
      set({ items: [...get().items, { ...product, qty: 1 }] });
    }
  },

  removeItem: (id) => {
    set({ items: get().items.filter((i) => i.id !== id) });
  },

  updateQty: (id, qty) => {
    if (qty <= 0) {
      get().removeItem(id);
      return;
    }
    set({
      items: get().items.map((i) => (i.id === id ? { ...i, qty } : i)),
    });
  },

  clearCart: () => set({ items: [] }),

  getCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),

  getSummaryText: () => {
    const items = get().items;
    if (items.length === 0) return '';
    return items.map((i) => `${i.name} x${i.qty} ${i.unit}`).join(', ');
  },
}));

export default useCartStore;
