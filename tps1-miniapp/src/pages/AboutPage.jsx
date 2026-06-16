import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '../utils/constants';
import { useTranslation } from '../utils/i18n';
import { useAppStore } from '../stores/appState';

export default function AboutPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const resetWelcome = useAppStore(state => state.resetWelcome);

  return (
    <div className="page" id="page-about">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} id="about-back-btn">
          ←
        </button>
        <h1>{t('about.title')}</h1>
      </div>

      {/* Company Banner */}
      <div className="hero-banner" style={{ paddingBottom: '20px' }}>
        <div className="hero-logo" style={{ background: 'transparent' }}>
          <img src="./logo.png" alt="TPS1 Logo" style={{ width: '100px', height: 'auto', objectFit: 'contain' }} />
        </div>
        <h1 className="hero-title" style={{ fontSize: '20px' }}>
          {APP_CONFIG.companyFull}
        </h1>
        <p className="hero-subtitle" style={{ maxWidth: '100%' }}>
          {APP_CONFIG.slogan}
        </p>
      </div>

      {/* Stats */}
      <div className="about-section">
        <div className="about-stats">
          <div className="about-stat">
            <div className="about-stat__number">2017</div>
            <div className="about-stat__label">Thành lập</div>
          </div>
          <div className="about-stat">
            <div className="about-stat__number">500+</div>
            <div className="about-stat__label">{t('about.products')}</div>
          </div>
          <div className="about-stat">
            <div className="about-stat__number">100+</div>
            <div className="about-stat__label">{t('about.customers')}</div>
          </div>
        </div>
      </div>

      {/* About Cards */}
      <div className="about-section" style={{ paddingTop: 0 }}>
        <div className="about-card">
          <div className="about-card__title">{t('about.intro_title')}</div>
          <div className="about-card__text">
            {t('about.intro_text')}
          </div>
        </div>

        <div className="about-card">
          <div className="about-card__title">{t('about.products_title')}</div>
          <div className="about-card__text">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {[
                { icon: '🥬', text: t('about.prod.1') },
                { icon: '🥩', text: t('about.prod.2') },
                { icon: '🦐', text: t('about.prod.3') },
                { icon: '🧊', text: t('about.prod.4') },
                { icon: '🧂', text: t('about.prod.5') },
                { icon: '🍳', text: t('about.prod.6') },
                { icon: '🧹', text: t('about.prod.7') },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="about-card">
          <div className="about-card__title">{t('about.target_title')}</div>
          <div className="about-card__text">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {[
                { icon: '🏫', text: t('about.target.1') },
                { icon: '🏥', text: t('about.target.2') },
                { icon: '🏭', text: t('about.target.3') },
                { icon: '🍽️', text: t('about.target.4') },
                { icon: '🍜', text: t('about.target.5') },
                { icon: '🏨', text: t('about.target.6') },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="about-card">
          <div className="about-card__title">{t('about.commit_title')}</div>
          <div className="about-card__text">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {[
                t('about.commit.1'),
                t('about.commit.2'),
                t('about.commit.3'),
                t('about.commit.4'),
                t('about.commit.5'),
                t('about.commit.6'),
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>✓</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="about-card">
          <div className="about-card__title">{t('about.service_title')}</div>
          <div className="about-card__text">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {[
                t('about.service.1'),
                t('about.service.2'),
                t('about.service.3'),
                t('about.service.4'),
                t('about.service.5'),
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--color-secondary)', flexShrink: 0 }}>★</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="contact-footer" id="about-contact">
        <div className="contact-footer__label">
          {t('about.ceo')} {APP_CONFIG.ceo}
        </div>
        <div className="contact-footer__phone">
          📞 {APP_CONFIG.hotline}
        </div>
        <div className="contact-footer__label">
          Phone / Zalo / WhatsApp / Viber
        </div>
      </div>

      {/* Language Switch */}
      <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
        <button
          className="btn btn--outline"
          onClick={() => resetWelcome()}
          style={{ width: '100%', maxWidth: '300px' }}
        >
          🌐 {t('about.language')}
        </button>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 16px 24px' }}>
        <button
          className="btn btn--primary btn--full btn--lg"
          onClick={() => navigate('/bao-gia')}
          id="about-cta-quote"
        >
          {t('about.cta')}
        </button>
      </div>
    </div>
  );
}
