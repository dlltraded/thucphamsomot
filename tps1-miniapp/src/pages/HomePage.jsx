import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG, CATEGORIES } from '../utils/constants';
import useCartStore from '../stores/cart';
import { useTranslation } from '../utils/i18n';

export default function HomePage() {
  const navigate = useNavigate();
  const cartCount = useCartStore((s) => s.items.length);
  const { t, language } = useTranslation();

  return (
    <div className="page" id="page-home">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-logo">
          <img src="./logo.png" alt="TPS1 Logo" style={{ width: '100px', height: 'auto', objectFit: 'contain' }} />
        </div>
        <h1 className="hero-title">{t('home.hero_title')}</h1>
        <p className="hero-subtitle">
          {t('home.hero_subtitle')}
        </p>
        <div className="hero-badge">
          📞 {t('home.hotline')}: {APP_CONFIG.hotline}
        </div>
      </div>

      {/* Main CTA */}
      <div className="cta-section">
        <h2 className="cta-section-title">{t('home.cta_title')}</h2>
        <div className="cta-grid">
          {/* Primary CTA - Báo giá */}
          <div
            className="cta-card cta-card--primary"
            onClick={() => navigate('/bao-gia')}
            id="cta-quote"
          >
            <div className="cta-card__icon">📋</div>
            <div>
              <div className="cta-card__title">{t('home.cta_quote')}</div>
              <div className="cta-card__desc">
                {t('home.cta_quote_desc')}
              </div>
            </div>
          </div>

          {/* Xem sản phẩm */}
          <div
            className="cta-card"
            onClick={() => navigate('/san-pham')}
            id="cta-products"
          >
            <div className="cta-card__icon">📦</div>
            <div className="cta-card__title">{t('home.cta_products')}</div>
            <div className="cta-card__desc">{t('home.cta_products_desc')}</div>
          </div>

          {/* TPS1 Highlights */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '12px',
            padding: '12px',
            background: 'var(--color-bg-glass)',
            backdropFilter: 'blur(12px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-light)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', fontSize: '14px', background: 'var(--color-primary-lighter)', borderRadius: '50%' }}>⚡</span> 
              Giao hàng tốc hành
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', fontSize: '14px', background: 'var(--color-primary-lighter)', borderRadius: '50%' }}>🛡️</span> 
              Cam kết nguồn gốc
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', fontSize: '14px', background: 'var(--color-primary-lighter)', borderRadius: '50%' }}>💰</span> 
              Giá sỉ cực tốt
            </div>
          </div>
        </div>
      </div>

      {/* Category Scroll */}
      <div className="category-section">
        <h2 className="cta-section-title">{t('home.cat_title')}</h2>
        <div className="category-scroll">
          {CATEGORIES.map((cat) => (
            <button
              type="button"
              key={cat.id}
              className="category-chip"
              onClick={() => navigate(`/san-pham?category=${cat.id}`)}
              id={`category-${cat.id}`}
            >
              <span className="category-chip__icon">{cat.emoji}</span>
              <span className="category-chip__label">{t(`cat.${cat.id}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="info-banner" id="info-commitment">
        <span className="info-banner__icon">🛡️</span>
        <div className="info-banner__text">
          <strong>{t('home.commitment')}</strong> {t('home.commitment_desc')}
        </div>
      </div>

      {/* Why TPS1 */}
      <div className="cta-section">
        <h2 className="cta-section-title">{t('home.why_title')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { icon: '✅', text: t('home.why.1') },
            { icon: '🚛', text: t('home.why.2') },
            { icon: '👨‍🍳', text: t('home.why.3') },
            { icon: '🏭', text: t('home.why.4') },
            { icon: '📦', text: t('home.why.5') },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: '16px',
                background: 'var(--color-bg-glass)',
                backdropFilter: 'blur(12px)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-light)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'var(--transition-base)'
              }}
            >
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
              <span
                style={{
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.5',
                }}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Footer */}
      <div className="contact-footer" id="contact-footer">
        <div className="contact-footer__label">
          {t('home.contact_label')}
        </div>
        <div className="contact-footer__phone">
          📞 {APP_CONFIG.hotline}
        </div>
        <div className="contact-footer__label">
          {APP_CONFIG.companyFull}
        </div>
      </div>

      {/* Cart Badge */}
      {cartCount > 0 && (
        <div
          className="cart-badge"
          onClick={() => navigate('/bao-gia')}
          id="cart-badge"
        >
          🛒 {t('home.cart_badge')}
          <span className="cart-badge__count">{cartCount}</span>
        </div>
      )}
    </div>
  );
}
