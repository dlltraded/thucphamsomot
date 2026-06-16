import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../utils/i18n';
import useCartStore from '../stores/cart';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const cartCount = useCartStore((state) => state.items.reduce((sum, i) => sum + i.qty, 0));

  const NAV_ITEMS = [
    { path: '/', icon: '🏠', label: t('nav.home') },
    { path: '/san-pham', icon: '📦', label: t('nav.products') },
    { path: '/bao-gia', icon: '📋', label: t('nav.quote'), badge: cartCount },
    { path: '/gioi-thieu', icon: '🏢', label: t('nav.about') },
  ];

  return (
    <nav className="bottom-nav" id="bottom-navigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.path}
          className={`bottom-nav__item ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
          id={`nav-${item.path.replace('/', '') || 'home'}`}
        >
          <span className="bottom-nav__icon" style={{ position: 'relative', display: 'inline-block' }}>
            {item.icon}
            {item.badge > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-8px',
                background: '#e53935',
                color: '#fff',
                borderRadius: '50%',
                fontSize: '10px',
                fontWeight: '700',
                minWidth: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                padding: '0 3px',
              }}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </span>
          <span className="bottom-nav__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
