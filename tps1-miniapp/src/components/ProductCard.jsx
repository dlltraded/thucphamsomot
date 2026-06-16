import React from 'react';
import useCartStore from '../stores/cart';
import { formatCurrency } from '../utils/format';
import { useTranslation } from '../utils/i18n';

export default function ProductCard({ product }) {
  const { items, addItem, removeItem, updateQty } = useCartStore();
  const cartItem = items.find((i) => i.id === product.id);
  const isInCart = !!cartItem;
  const { t, language } = useTranslation();

  const displayName = language === 'en' && product.nameEn ? product.nameEn : product.name;

  return (
    <div className="product-list-card" id={`product-${product.id}`}>
      <div className="product-list-card__image-container">
        {product.image ? (
          <img src={product.image} alt={displayName} className="product-list-card__image" />
        ) : (
          <div className="product-list-card__image-placeholder">📦</div>
        )}
      </div>
      <div className="product-list-card__body">
        <h3 className="product-list-card__name">{displayName}</h3>
        
        <div className="product-list-card__stats">
          <span className="stat-item"><i className="icon-bag"></i> {product.sold || 0}</span>
          <span className="stat-item"><i className="icon-eye"></i> {product.views || 0}</span>
        </div>
        
        <div className="product-list-card__status">
          <span className="status-text in-stock">{t('product.in_stock')}</span>
        </div>

        <div className="product-list-card__price-row">
          <div className="product-list-card__price">
            {formatCurrency(product.price || 0)}
          </div>
          
          <div className="product-list-card__actions">
            <button className="action-btn action-chat">💬</button>
            {isInCart ? (
              <div className="action-qty-control">
                <button 
                  className="qty-btn" 
                  onClick={() => cartItem.qty > 1 ? updateQty(product.id, cartItem.qty - 1) : removeItem(product.id)}
                >-</button>
                <span className="qty-value">{cartItem.qty}</span>
                <button 
                  className="qty-btn" 
                  onClick={() => updateQty(product.id, cartItem.qty + 1)}
                >+</button>
              </div>
            ) : (
              <button className="action-btn action-add" onClick={() => addItem(product)}>
                🛒 {t('product.add')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
