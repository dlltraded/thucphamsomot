import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search } from 'lucide-react';
import {
  api,
  type Product,
  type ProductCatalogResponse,
  type Order,
  type FrequentItem,
  ApiError,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

import OrderTabsBar, { type OrderTab } from '../components/products/OrderTabsBar';
import ProductSearchBar from '../components/products/ProductSearchBar';
import ProductGrid from '../components/products/ProductGrid';
import CartSummarySidebar from '../components/products/CartSummarySidebar';
import CartFloatingBar from '../components/products/CartFloatingBar';
import CartCheckoutDrawer from '../components/products/CartCheckoutDrawer';
import OrderSuccessModal from '../components/products/OrderSuccessModal';

const storageKeyFor = (customerId: string) => `tps1_b2b_pos_tabs_v2_${customerId}`;
const PRODUCT_CACHE_TTL_MS = 2 * 60 * 1000;
const productSearchCache = new Map<string, { expiresAt: number; products: Product[] }>();
const PRODUCT_CATALOG_TTL_MS = 5 * 60 * 1000;
const productCatalogMemoryCache = new Map<string, { expiresAt: number; products: Product[] }>();
const productSearchKeys = new Map<string, string>();

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function decodeCatalog(catalog: ProductCatalogResponse): Product[] {
  const imageBaseUrl = catalog.imageBaseUrl.replace(/\/$/, '');
  return catalog.items.map(([id, sku, name, category, unit, price, priceOnRequest, hasImage]) => {
    const imageUrl = hasImage && imageBaseUrl ? `${imageBaseUrl}/${id}.webp` : null;
    const product: Product = {
      id,
      sku,
      name,
      category,
      unit,
      price: Number(price) || 0,
      priceOnRequest,
      imageUrl,
      thumbUrl: imageUrl,
      available: true,
    };
    productSearchKeys.set(id, normalizeSearch(`${sku} ${name} ${category || ''}`));
    return product;
  });
}

function searchLocalCatalog(products: Product[], rawQuery: string, productName: (name: string) => string): Product[] {
  const query = normalizeSearch(rawQuery);
  if (!query) return products.slice(0, 48);
  const words = query.split(' ').filter(Boolean);
  const ranked: Array<{ product: Product; score: number }> = [];

  for (const product of products) {
    const key = normalizeSearch(`${productSearchKeys.get(product.id) || `${product.sku} ${product.name} ${product.category || ''}`} ${productName(product.name)} ${product.category ? productName(product.category) : ''}`);
    if (!words.every((word) => key.includes(word))) continue;
    const sku = normalizeSearch(product.sku || '');
    const name = normalizeSearch(productName(product.name));
    const score =
      sku === query ? 0 : sku.startsWith(query) ? 1 : name === query ? 2 : name.startsWith(query) ? 3 : 4;
    ranked.push({ product, score });
  }

  return ranked
    .sort(
      (a, b) =>
        a.score - b.score ||
        Number(Boolean(b.product.thumbUrl || b.product.imageUrl)) -
          Number(Boolean(a.product.thumbUrl || a.product.imageUrl)) ||
        a.product.name.localeCompare(b.product.name, 'vi')
    )
    .slice(0, 60)
    .map(({ product }) => product);
}

function getTomorrowDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDelivery(session: any) {
  const shipping = session?.defaultShippingAddress;
  const address = String(shipping?.address || '').trim();
  if (!address) {
    return { deliveryName: '', deliveryPhone: '', deliveryAddress: '' };
  }
  return {
    deliveryName: String(shipping?.name || '').trim(),
    deliveryPhone: String(shipping?.phone || '').trim(),
    deliveryAddress: address,
  };
}

function createDefaultTab(index: number, session: any): OrderTab {
  const defaultDelivery = getDefaultDelivery(session);
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    idempotencyKey: crypto.randomUUID(),
    title: `Đặt hàng ${index}`,
    items: [],
    note: '',
    deliveryDate: getTomorrowDateStr(),
    deliveryShift: 'Ca sáng sớm (05:00 - 07:00)',
    ...defaultDelivery,
    mode: 'delivery',
  };
}

export default function ProductsPage() {
  const { session, logout } = useAuth();
  const { t, errorText, productName } = useLanguage();
  const navigate = useNavigate();

  // 1. Quản lý hệ thống Đa tab đặt hàng
  const [tabs, setTabs] = useState<OrderTab[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyFor(session?.id || 'guest'));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaultDelivery = getDefaultDelivery(session);
          return parsed.map((tab) => ({
            ...tab,
            idempotencyKey: tab?.idempotencyKey || crypto.randomUUID(),
            ...(String(tab?.deliveryAddress || '').trim() ? {} : defaultDelivery),
          }));
        }
      }
    } catch {}
    return [createDefaultTab(1, session)];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || '');

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTabId) && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
    localStorage.setItem(storageKeyFor(session?.id || 'guest'), JSON.stringify(tabs));
  }, [tabs, activeTabId, session?.id]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // 2. Search & Catalog state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [cutoffInfo, setCutoffInfo] = useState<{ earliestDate: string; cutoffTimeStr: string } | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([]);
  const [loadingLatestOrder, setLoadingLatestOrder] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`tps1_favorite_products_v2_${session?.id || 'guest'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Mobile Checkout Drawer & Success Modal state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successOrder, setSuccessOrder] = useState<{ code: string; total: number; pendingPriceCount: number } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<any>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchRequestRef = useRef(0);
  const catalogAbortRef = useRef<AbortController | null>(null);
  const cutoffLoadedRef = useRef(false);

  // Lưu danh sách yêu thích
  useEffect(() => {
    try {
      localStorage.setItem(`tps1_favorite_products_v2_${session?.id || 'guest'}`, JSON.stringify(favoriteIds));
    } catch {}
  }, [favoriteIds, session?.id]);

  // Tìm kiếm qua Search API khi catalog cục bộ chưa sẵn sàng
  const loadProducts = useCallback(
    async (rawQuery: string, openDropdown = true) => {
      const query = rawQuery.trim();
      const cacheKey = `${session?.id || 'anonymous'}:${query.toLocaleLowerCase('vi-VN')}`;
      const cached = productSearchCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        setSearchResults(cached.products);
        return;
      }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      const requestId = ++searchRequestRef.current;
      setSearchLoading(true);
      try {
        const res = await api.products(query ? { search: query } : {}, controller.signal);
        if (requestId !== searchRequestRef.current) return;
        const products = res.products || [];
        productSearchCache.set(cacheKey, {
          expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS,
          products,
        });
        setSearchResults(products);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          navigate('/dang-nhap');
        }
      } finally {
        if (requestId === searchRequestRef.current) setSearchLoading(false);
      }
    },
    [logout, navigate, session?.id]
  );

  // Tải 20 mặt hàng thường đặt
  useEffect(() => {
    const controller = new AbortController();
    void api
      .frequentItems(controller.signal)
      .then((res) => setFrequentItems(res.items || []))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  // Hiển thị nhóm hàng đầu tiên trước. Không bắt khách chờ toàn bộ catalog
  // 5.000+ mặt hàng; tìm kiếm sẽ gọi API theo từ khóa trong lúc catalog nền
  // chưa sẵn sàng.
  useEffect(() => {
    const controller = new AbortController();
    void api.products({}, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setSearchResults(res.products || []);
        setCatalogLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    return () => controller.abort();
  }, []);

  // Tải toàn bộ Catalog vào bộ nhớ ở nền để tìm kiếm tức thì cho các lần sau.
  // Trì hoãn nhẹ để request đầu tiên và khung thao tác của khách được ưu tiên.
  useEffect(() => {
    const customerId = session?.id;
    if (!customerId) return;
    const now = Date.now();
    const memory = productCatalogMemoryCache.get(customerId);
    if (memory && memory.expiresAt > now) {
      setCatalogProducts(memory.products);
      setSearchResults(memory.products.slice(0, 48));
      setCatalogLoading(false);
      return;
    }

    const storageKey = `tps1_product_catalog_v1_${customerId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { expiresAt: number; catalog: ProductCatalogResponse };
        if ((parsed.expiresAt > now || !navigator.onLine) && Array.isArray(parsed.catalog?.items)) {
          const products = decodeCatalog(parsed.catalog);
          productCatalogMemoryCache.set(customerId, { expiresAt: parsed.expiresAt, products });
          setCatalogProducts(products);
          setSearchResults(products.slice(0, 48));
          setCatalogLoading(false);
          return;
        }
        localStorage.removeItem(storageKey);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }

    const controller = new AbortController();
    catalogAbortRef.current = controller;
    const timer = window.setTimeout(() => void api
      .productCatalog(controller.signal)
      .then((catalog) => {
        if (controller.signal.aborted) return;
        const products = decodeCatalog(catalog);
        const expiresAt = Date.now() + PRODUCT_CATALOG_TTL_MS;
        productCatalogMemoryCache.set(customerId, { expiresAt, products });
        setCatalogProducts(products);
        setSearchResults((current) => (searchQuery.trim() ? current : products.slice(0, 48)));
        setCatalogLoading(false);
        try {
          localStorage.setItem(storageKey, JSON.stringify({ expiresAt, catalog }));
        } catch {}
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.warn('Không tải được catalog nền:', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      }), 1200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [session?.id]);

  // Phím tắt F3 để focus ô tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    if (catalogProducts.length > 0) {
      searchAbortRef.current?.abort();
      setSearchLoading(false);
      setSearchResults(searchLocalCatalog(catalogProducts, q, productName));
      return;
    }

    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => void loadProducts(q), 120);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, loadProducts, catalogProducts, productName]);

  // Update tab helper
  const updateActiveTab = useCallback(
    (updater: (prev: OrderTab) => OrderTab) => {
      setTabs((prevTabs) =>
        prevTabs.map((tab) => (tab.id === activeTab.id ? updater(tab) : tab))
      );
    },
    [activeTab.id]
  );

  // Lấy ngày giao sớm nhất do server tính theo giờ Việt Nam. Không dùng giờ
  // trên máy khách để quyết định vì đồng hồ thiết bị có thể sai hoặc bị đổi múi giờ.
  useEffect(() => {
    if (cutoffLoadedRef.current) return;
    cutoffLoadedRef.current = true;
    void api.orderConfig().then((info) => {
      setCutoffInfo({ earliestDate: info.earliestDate, cutoffTimeStr: info.cutoffTimeStr });
      updateActiveTab((tab) =>
        tab.deliveryDate < info.earliestDate
          ? { ...tab, deliveryDate: info.earliestDate }
          : tab
      );
    }).catch(() => undefined);
  }, [updateActiveTab]);

  // Thao tác Thêm / Sửa số lượng / Ghi chú dòng
  const handleAddProduct = (
    product: Product,
    quantityToAdd: number = 1,
    options?: { resetSearch?: boolean; keepFocus?: boolean }
  ) => {
    const qty = Math.max(0.1, Number(quantityToAdd) || 1);
    updateActiveTab((tab) => {
      const existingIdx = tab.items.findIndex((item) => item.product.id === product.id && !item.note?.trim());
      if (existingIdx >= 0) {
        const updated = [...tab.items];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: Number((updated[existingIdx].quantity + qty).toFixed(2)),
        };
        return { ...tab, items: updated };
      } else {
        return {
          ...tab,
          items: [...tab.items, { product, quantity: qty }],
        };
      }
    });

    if (options?.resetSearch) { setSearchQuery(''); setSearchInput(''); }
    if (options?.keepFocus) {
      searchInputRef.current?.focus();
    }
  };

  const handleUpdateQty = (lineKey: string, newQty: number) => {
    const qty = Number(newQty);
    if (qty <= 0) {
      handleRemoveItem(lineKey);
      return;
    }
    updateActiveTab((tab) => ({
      ...tab,
      items: tab.items.map((item) =>
        (item.lineKey || item.product.id) === lineKey ? { ...item, quantity: qty } : item
      ),
    }));
  };

  const handleUpdateItemNote = (lineKey: string, note: string) => {
    updateActiveTab((tab) => ({
      ...tab,
      items: tab.items.map((item) =>
        (item.lineKey || item.product.id) === lineKey ? { ...item, note } : item
      ),
    }));
  };

  const handleRemoveItem = (lineKey: string) => {
    updateActiveTab((tab) => {
      const items = tab.items.filter((item) => (item.lineKey || item.product.id) !== lineKey);
      return { ...tab, items, sourceImportBatchId: items.some((item) => item.sourceImportLineId) ? tab.sourceImportBatchId : undefined };
    });
  };

  // Nhận yêu cầu "Đặt lại" từ lịch sử đơn sau khi catalog đã sẵn sàng.
  useEffect(() => {
    if (catalogProducts.length === 0) return;
    const raw = sessionStorage.getItem('tps1_reorder_request_v1');
    if (!raw) return;
    sessionStorage.removeItem('tps1_reorder_request_v1');
    try {
      const requested = JSON.parse(raw) as Array<{ productId: string; quantity: number; note?: string }>;
      const productsById = new Map(catalogProducts.map((product) => [product.id, product]));
      const items = requested
        .map((item) => {
          const product = productsById.get(item.productId);
          return product
            ? { product, quantity: Math.max(0.1, Number(item.quantity) || 1), note: item.note || '' }
            : null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      if (items.length === 0) {
        setErrorMessage('Các mặt hàng trong đơn cũ hiện không còn trong danh mục. Vui lòng tìm và chọn lại.');
        return;
      }
      updateActiveTab((tab) => ({ ...tab, items }));
      if (items.length < requested.length) {
        setErrorMessage('Một số mặt hàng cũ không còn trong danh mục và đã được bỏ qua.');
      }
    } catch {
      setErrorMessage('Không đọc được dữ liệu đơn cũ. Vui lòng thử lại.');
    }
  }, [catalogProducts, updateActiveTab]);

  const handleAddNewTab = () => {
    const nextNum = tabs.length + 1;
    const newT = createDefaultTab(nextNum, session);
    setTabs((prev) => [...prev, newT]);
    setActiveTabId(newT.id);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      updateActiveTab((t) => ({ ...t, items: [] }));
      return;
    }
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
  };

  // Danh sách gợi ý từ catalog và lịch sử
  const frequentProducts = useMemo(
    () =>
      frequentItems.slice(0, 10).map((item) => ({
        id: item.productId,
        sku: item.sku || '',
        name: item.name,
        category: item.category || null,
        unit: item.unit || 'Kg',
        price: Number(item.price) || 0,
        priceOnRequest: Boolean(item.priceOnRequest),
        imageUrl: item.imageUrl || null,
        thumbUrl: item.imageUrl || null,
        available: true,
      } satisfies Product)),
    [frequentItems]
  );

  const favoriteProducts = useMemo(
    () =>
      favoriteIds
        .map((id) => catalogProducts.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p))
        .slice(0, 10),
    [catalogProducts, favoriteIds]
  );

  const latestOrder = recentOrders[0];

  const displayedProducts = useMemo(() => {
    return searchQuery.trim() ? searchResults : [];
  }, [searchQuery, searchResults]);

  const toggleFavorite = (productId: string) => {
    setFavoriteIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  };

  const addOrderAgain = (order: Order) => {
    const productsById = new Map(catalogProducts.map((p) => [p.id, p]));
    order.items.forEach((item) => {
      const p = productsById.get(item.productId);
      if (p) handleAddProduct(p, Number(item.quantity) || 1);
    });
  };

  const loadLatestOrderAndAdd = async () => {
    if (latestOrder) {
      addOrderAgain(latestOrder);
      return;
    }
    setLoadingLatestOrder(true);
    try {
      const res = await api.orders();
      const order = (res.orders || [])[0];
      if (order) {
        setRecentOrders([order]);
        addOrderAgain(order);
      }
    } catch {
    } finally {
      setLoadingLatestOrder(false);
    }
  };

  // Gửi đơn đặt hàng (Submit Order)
  const handleSubmitOrder = async () => {
    setErrorMessage('');
    if (!navigator.onLine) { setErrorMessage(t('Không có kết nối mạng. Giỏ hàng của bạn đã được lưu.')); return; }
    if (activeTab.items.length === 0) {
      setErrorMessage(t('Vui lòng thêm ít nhất 1 mặt hàng vào đơn'));
      return;
    }
    if (cutoffInfo && activeTab.deliveryDate < cutoffInfo.earliestDate) {
      setErrorMessage(t('Đã quá giờ chốt đơn. Vui lòng chọn ngày giao mới.'));
      updateActiveTab(tab => ({ ...tab, deliveryDate: cutoffInfo.earliestDate }));
      return;
    }
    if (
      !activeTab.deliveryName.trim() ||
      !activeTab.deliveryPhone.trim() ||
      !activeTab.deliveryAddress.trim()
    ) {
      setErrorMessage(t('Vui lòng điền đầy đủ Tên, SĐT và Địa chỉ giao hàng'));
      return;
    }

    setSubmitting(true);
    try {
      const lineNotesFormatted = activeTab.items
        .filter((it) => it.note?.trim())
        .map((it) => `[${it.product.name}: ${it.note!.trim()}]`)
        .join('; ');

      const fullNote = [
        activeTab.deliveryShift ? `[Ca: ${activeTab.deliveryShift}]` : '',
        activeTab.deliveryDate ? `[Ngày giao: ${activeTab.deliveryDate}]` : '',
        lineNotesFormatted,
        activeTab.note.trim(),
      ]
        .filter(Boolean)
        .join(' - ');

      const res = await api.createOrder({
        items: activeTab.items.map((it) => ({
          productId: it.product.id,
          name: it.product.name,
          quantity: it.quantity,
          note: it.note?.trim() || undefined,
          sourceImportLineId: it.sourceImportLineId,
        })),
        deliveryName: activeTab.deliveryName.trim(),
        deliveryPhone: activeTab.deliveryPhone.trim(),
        deliveryAddress: activeTab.deliveryAddress.trim(),
        deliveryDate: activeTab.deliveryDate,
        note: fullNote,
        idempotencyKey: activeTab.idempotencyKey,
        sourceImportBatchId: activeTab.sourceImportBatchId,
      });

      const subtotal = activeTab.items.reduce(
        (sum, item) => sum + item.quantity * (item.product.price || 0),
        0
      );

      setSuccessOrder({ code: res.orderCode, total: res.total ?? subtotal, pendingPriceCount: res.pendingPriceCount || 0 });
      setIsDrawerOpen(false);

      // Reset giỏ của tab vừa gửi
      updateActiveTab((t) => ({ ...t, items: [], note: '', idempotencyKey: crypto.randomUUID(), sourceImportBatchId: undefined }));
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? errorText(err) : t('Không gửi được đơn hàng, vui lòng thử lại')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
      <div className="flex flex-col gap-3.5 sm:gap-4 pb-12 lg:pb-0">
      {/* 1. Header trang: Lời chào & Giờ chốt đơn */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-0.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#17231d] tracking-tight">
            {t('Đặt hàng cho bếp')}
          </h1>
          <p className="text-xs sm:text-sm text-[#59665f] mt-0.5">{t('Tìm sản phẩm rồi thêm vào đơn hàng')}</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-900 text-xs font-bold shadow-xs">
          <Clock size={15} className="text-[#e0742f]" />
          <span>
            {cutoffInfo
              ? `${t('Ngày giao sớm nhất')}: ${cutoffInfo.earliestDate} · ${t('Giờ chốt đơn')}: ${cutoffInfo.cutoffTimeStr}`
              : t('Vui lòng chọn ngày và ca giao hàng phù hợp')}
          </span>
        </div>
      </div>

      {/* 2. Top Bar: Tìm kiếm F3 & Hệ thống Đa Tab */}
      <div className="rounded-2xl border border-[#17231d]/10 bg-white p-3.5 shadow-sm sm:p-5">
        <ProductSearchBar value={searchInput} onChange={setSearchInput} inputRef={searchInputRef}
          onSubmit={() => { const query = searchInput.trim(); setSearchQuery(query); if (!query) setSearchResults([]); }} />
        <div className="mt-4 border-t border-[#17231d]/8 pt-3">
        <OrderTabsBar
          tabs={tabs}
          activeTabId={activeTab.id}
          onSelectTab={setActiveTabId}
          onAddTab={handleAddNewTab}
          onCloseTab={handleCloseTab}
        />
        </div>
      </div>

      {/* 4. Vùng làm việc chính: 2 Cột (Trái: Lưới sản phẩm; Phải: Sidebar Tóm tắt & Gửi đơn) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_370px] gap-4 items-start">
        {/* CỘT TRÁI: Lưới card sản phẩm */}
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-[#17231d] uppercase tracking-wider flex items-center gap-2">
              <span>
                {searchQuery.trim()
                  ? `${t('Kết quả tìm kiếm')} ("${searchQuery}")`
                  : t('Kết quả tìm kiếm')}
              </span>
              <span className="text-xs font-mono font-normal text-[#59665f]">
                ({displayedProducts.length} mặt hàng)
              </span>
            </h2>

          </div>

          <ProductGrid
            products={displayedProducts}
            itemsInCart={activeTab.items}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
            onAddProduct={handleAddProduct}
            onUpdateQty={handleUpdateQty}
            onUpdateNote={handleUpdateItemNote}
            searchQuery={searchQuery}
            loading={Boolean(searchQuery) && searchLoading}
          />
        </div>

        {/* CỘT PHẢI (Desktop): Sidebar Tóm tắt đơn & Gửi đơn */}
        <div className="hidden lg:block min-w-0">
          <CartSummarySidebar
            session={session}
            earliestDate={cutoffInfo?.earliestDate}
            cutoffTimeStr={cutoffInfo?.cutoffTimeStr}
            activeTab={activeTab}
            onUpdateTab={updateActiveTab}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onSubmitOrder={handleSubmitOrder}
            submitting={submitting}
            errorMessage={errorMessage}
          />
        </div>
      </div>

      {/* 5. Mobile Floating Cart Bar (khi có sản phẩm) */}
      <CartFloatingBar
        activeTab={activeTab}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* 6. Mobile Slide-up Checkout Drawer */}
      <CartCheckoutDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        session={session}
        earliestDate={cutoffInfo?.earliestDate}
        cutoffTimeStr={cutoffInfo?.cutoffTimeStr}
        activeTab={activeTab}
        onUpdateTab={updateActiveTab}
        onUpdateQty={handleUpdateQty}
        onUpdateNote={handleUpdateItemNote}
        onRemoveItem={handleRemoveItem}
        onSubmitOrder={handleSubmitOrder}
        submitting={submitting}
        errorMessage={errorMessage}
      />

      {/* 7. Modal thông báo đặt hàng thành công */}
      <OrderSuccessModal
        order={successOrder}
        pendingVerification={session?.verificationStatus === 'pending'}
        onClose={() => setSuccessOrder(null)}
      />
    </div>
  );
}
