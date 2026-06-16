import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '../utils/constants';
import { fetchProducts } from '../services/products';
import ProductCard from '../components/ProductCard';
import useCartStore from '../stores/cart';
import { useTranslation } from '../utils/i18n';

export default function ProductCatalog() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get('category') || '';

  const [activeCategory, setActiveCategory] = useState(initialCat);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'bestsellers' | 'discount'
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const cartItems = useCartStore((s) => s.items);
  const { t, language } = useTranslation();

  useEffect(() => {
    fetchProducts().then((data) => {
      setAllProducts(data);
      setLoading(false);
    });
  }, []);

  const filteredProducts = useMemo(() => {
    let list = allProducts;
    if (activeCategory) {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) => {
        const name = language === 'en' && p.nameEn ? p.nameEn : p.name;
        return name.toLowerCase().includes(term);
      });
    }
    // Apply filter mode
    if (filterMode === 'discount') {
      list = list.filter((p) => p.priceRetail > 0 && p.priceRetail > p.price);
    } else if (filterMode === 'bestsellers') {
      // Top 30 products (one from each category first, then fill)
      list = list.slice(0, 30);
    }
    return list;
  }, [activeCategory, searchTerm, filterMode, language, allProducts]);

  return (
    <div className="page" id="page-product-catalog">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} id="catalog-back-btn">
          ←
        </button>
        <h1>{t('product.title')}</h1>
      </div>

      {/* Search */}
      <div className="search-bar">
        <span className="search-bar__icon">🔍</span>
        <input
          className="search-bar__input"
          type="text"
          placeholder={t('product.search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          id="product-search"
        />
      </div>

      {/* Category Chips */}
      <div className="category-scroll" style={{ padding: '0 16px 8px' }}>
        <button
          type="button"
          className={`category-chip ${activeCategory === '' ? 'active' : ''}`}
          onClick={() => setActiveCategory('')}
          id="filter-all"
        >
          <span className="category-chip__icon">📋</span>
          <span className="category-chip__label">{t('product.all')}</span>
        </button>
        {CATEGORIES.map((cat) => (
          <button
            type="button"
            key={cat.id}
            className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() =>
              setActiveCategory(activeCategory === cat.id ? '' : cat.id)
            }
            id={`filter-${cat.id}`}
          >
            <span className="category-chip__icon">{cat.emoji}</span>
            <span className="category-chip__label">{t(`cat.${cat.id}`)}</span>
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs" style={{ display: 'flex', padding: '0 16px 12px', gap: '8px', overflowX: 'auto' }}>
        <button
          type="button"
          className={`filter-tab ${filterMode === 'all' ? 'active' : ''}`}
          onClick={() => setFilterMode('all')}
        >{t('product.all')}</button>
        <button
          type="button"
          className={`filter-tab ${filterMode === 'bestsellers' ? 'active' : ''}`}
          onClick={() => setFilterMode('bestsellers')}
        >{t('product.bestsellers')}</button>
        <button
          type="button"
          className={`filter-tab ${filterMode === 'discount' ? 'active' : ''}`}
          onClick={() => setFilterMode('discount')}
        >{t('product.discount')}</button>
      </div>

      {/* Product List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
          <div>Đang tải sản phẩm...</div>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="product-list" style={{ paddingBottom: cartItems.length > 0 ? '80px' : '20px' }}>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__title">{t('product.empty_title')}</div>
          <div className="empty-state__desc">
            {t('product.empty_desc')}
          </div>
        </div>
      )}

      {/* Cart Bottom Bar */}
      {cartItems.length > 0 && (
        <div
          className="cart-bottom-bar"
          onClick={() => navigate('/bao-gia')}
          id="cart-bottom-bar"
        >
          <div className="cart-bottom-bar__left">
            <div className="cart-icon-wrapper">
              🛒 <span className="cart-badge-number">{cartItems.reduce((acc, item) => acc + item.qty, 0)}</span>
            </div>
            <div className="cart-total-price">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                cartItems.reduce((acc, item) => acc + (item.price || 0) * item.qty, 0)
              )}
            </div>
          </div>
          <div className="cart-bottom-bar__right">
            {t('product.order_btn')}
          </div>
        </div>
      )}
    </div>
  );
}
