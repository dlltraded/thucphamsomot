export type QuoteBasketItem = {
  slug: string;
  title: string;
  summary?: string;
  quantity: number;
};

const STORAGE_KEY = "tps1-quote-basket-v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadQuoteBasket(): QuoteBasketItem[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuoteBasketItem[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.slug && item?.title).map((item) => ({
          ...item,
          quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
        }))
      : [];
  } catch {
    return [];
  }
}

export function saveQuoteBasket(items: QuoteBasketItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addQuoteItem(item: Omit<QuoteBasketItem, "quantity">, quantity = 1) {
  const basket = loadQuoteBasket();
  const existing = basket.find((entry) => entry.slug === item.slug);

  if (existing) {
    existing.quantity += quantity;
  } else {
    basket.push({ ...item, quantity });
  }

  saveQuoteBasket(basket);
  return basket;
}

export function updateQuoteItem(slug: string, quantity: number) {
  const basket = loadQuoteBasket()
    .map((item) => (item.slug === slug ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);
  saveQuoteBasket(basket);
  return basket;
}

export function removeQuoteItem(slug: string) {
  const basket = loadQuoteBasket().filter((item) => item.slug !== slug);
  saveQuoteBasket(basket);
  return basket;
}

export function clearQuoteBasket() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
