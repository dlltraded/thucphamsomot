import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { openChat } from 'zmp-sdk/apis';
import {
  ROLES,
  FACILITY_TYPES,
  INTEREST_GROUPS,
  PURCHASE_SCALES,
  DELIVERY_FREQUENCIES,
  APP_CONFIG,
} from '../utils/constants';
import { submitLead, saveRequestHistory } from '../services/sheets';
import useUserStore from '../stores/user';
import useCartStore from '../stores/cart';
import SuccessModal from '../components/SuccessModal';
import { useTranslation } from '../utils/i18n';

const INITIAL_FORM = {
  role: 'buyer',
  name: '',
  phone: '',
  email: '',
  company: '',
  facilityType: '',
  interestedIn: [],
  purchaseScale: '',
  deliveryFrequency: '',
  deliveryArea: '',
  needBy: '',
  message: '',
};

export default function RequestQuote() {
  const navigate = useNavigate();
  const user = useUserStore();
  const cartItems = useCartStore((s) => s.items);
  const cartSummary = useCartStore((s) => s.getSummaryText());
  const clearCart = useCartStore((s) => s.clearCart);
  const { t, language } = useTranslation();

  const [form, setForm] = useState({
    ...INITIAL_FORM,
    name: user.name || '',
    phone: user.phone || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingOrderText, setPendingOrderText] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: prev.name || user.name || '',
      phone: prev.phone || user.phone || '',
    }));
  }, [user.name, user.phone]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleInterest = (item) => {
    setForm((prev) => {
      const list = prev.interestedIn.includes(item)
        ? prev.interestedIn.filter((i) => i !== item)
        : [...prev.interestedIn, item];
      return { ...prev, interestedIn: list };
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = t('quote.err_name');
    if (!form.phone.trim()) errs.phone = t('quote.err_phone');
    else if (!/^0\d{9,10}$/.test(form.phone.replace(/[\s.-]/g, '')))
      errs.phone = t('quote.err_phone_invalid');
    if (!form.facilityType) errs.facilityType = t('quote.err_facility');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        formType: 'bao_gia',
        selectedProducts: cartSummary || '',
        selectedCount: cartItems.length,
        cartItems: cartItems.map((item) => ({
          name:  item.name  || '',
          qty:   item.qty   || 1,
          unit:  item.unit  || '',
          price: item.price || 0,
        })),
      };
      const result = await submitLead(payload);
      saveRequestHistory(payload);

      if (result.success) {
        let orderText = `Chào Thực Phẩm Số Một, tôi muốn yêu cầu báo giá/đặt hàng các sản phẩm sau:\n`;
        cartItems.forEach((item, idx) => {
          const itemName = item.name || '';
          orderText += `${idx + 1}. ${itemName} - Số lượng: ${item.qty} ${item.unit || 'kg'}\n`;
        });
        orderText += `\nThông tin liên hệ:\n- Tên: ${form.name}\n- SĐT: ${form.phone}`;
        if (form.company) orderText += `\n- Đơn vị: ${form.company}`;
        if (form.message) orderText += `\n- Ghi chú: ${form.message}`;

        setPendingOrderText(orderText);
        setShowSuccess(true);
        setForm({ ...INITIAL_FORM });
        clearCart();
      } else {
        alert(t('quote.alert_err') + APP_CONFIG.hotline);
      }
    } catch (err) {
      console.error(err);
      alert(t('quote.alert_err') + APP_CONFIG.hotline);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" id="page-request-quote">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} id="quote-back-btn">
          ←
        </button>
        <h1>{t('quote.title')}</h1>
      </div>

      {/* Selected products summary */}
      {cartItems.length > 0 && (
        <div className="cart-section" style={{ backgroundColor: '#fff', marginBottom: '12px', padding: '16px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: '600' }}>{t('quote.selected_items')} ({cartItems.length})</h3>
          <div className="cart-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cartItems.map((item) => {
              const displayName = language === 'en' && item.nameEn ? item.nameEn : item.name;
              return (
                <div key={item.id} className="cart-item" style={{ display: 'flex', gap: '12px' }}>
                  <img src={item.image} alt={displayName} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div className="cart-item-details" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#333', fontWeight: '500', marginBottom: '4px' }}>{displayName}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {t('quote.est_qty')} <strong>{item.qty} {item.unit || 'kg'}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => navigate('/san-pham')}
            style={{ marginTop: '16px', width: '100%' }}
          >
            {t('quote.add_more')}
          </button>
        </div>
      )}

      {/* Form */}
      <form className="form-section" onSubmit={handleSubmit} id="quote-form">
        {/* Vai trò */}
        <div className="form-group">
          <label className="form-label">
            {t('quote.role')} <span className="required">*</span>
          </label>
          <select
            className="form-select"
            value={form.role}
            onChange={(e) => updateField('role', e.target.value)}
            id="field-role"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Họ tên */}
        <div className="form-group">
          <label className="form-label">
            {t('quote.name')} <span className="required">*</span>
          </label>
          <input
            className={`form-input ${user.name ? 'auto-filled' : ''}`}
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder={t('quote.name_ph')}
            id="field-name"
          />
          {user.name && (
            <div className="auto-fill-badge" style={{ display: 'inline-flex' }}>
              {t('quote.auto_zalo')}
            </div>
          )}
          {errors.name && (
            <div style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>
              {errors.name}
            </div>
          )}
        </div>

        {/* SĐT */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('quote.phone')} <span className="required">*</span></span>
            {!user.phone && (
              <button
                type="button"
                onClick={async () => {
                  await user.fetchZaloPhone();
                  // The store updates user.phone, we should sync it to form or wait for useEffect.
                  // Since Zustand updates reactively, we could sync it, or just rely on the user seeing it.
                  // For better UX, we'll just alert that Zalo Phone API was called.
                }}
                style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                {t('quote.get_zalo')}
              </button>
            )}
          </label>
          <input
            className={`form-input ${user.phone ? 'auto-filled' : ''}`}
            type="tel"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder={t('quote.phone_ph')}
            id="field-phone"
          />
          {user.phone && (
            <div className="auto-fill-badge" style={{ display: 'inline-flex' }}>
              {t('quote.auto_zalo')}
            </div>
          )}
          {errors.phone && (
            <div style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>
              {errors.phone}
            </div>
          )}
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">{t('quote.email')}</label>
          <input
            className="form-input"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder={t('quote.email_ph')}
            id="field-email"
          />
        </div>

        {/* Công ty */}
        <div className="form-group">
          <label className="form-label">{t('quote.company')}</label>
          <input
            className="form-input"
            type="text"
            value={form.company}
            onChange={(e) => updateField('company', e.target.value)}
            placeholder={t('quote.company_ph')}
            id="field-company"
          />
        </div>

        {/* Loại hình đơn vị */}
        <div className="form-group">
          <label className="form-label">
            {t('quote.facility_type')} <span className="required">*</span>
          </label>
          <select
            className="form-select"
            value={form.facilityType}
            onChange={(e) => updateField('facilityType', e.target.value)}
            id="field-facility-type"
          >
            <option value="">{t('quote.facility_type_ph')}</option>
            {FACILITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.facilityType && (
            <div style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>
              {errors.facilityType}
            </div>
          )}
        </div>

        {/* Nhóm hàng quan tâm */}
        <div className="form-group">
          <label className="form-label">{t('quote.interest')}</label>
          <div className="checkbox-group">
            {INTEREST_GROUPS.map((item) => (
              <label
                key={item}
                className={`checkbox-item ${form.interestedIn.includes(item) ? 'checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={form.interestedIn.includes(item)}
                  onChange={() => toggleInterest(item)}
                />
                <span className="check-icon">
                  {form.interestedIn.includes(item) ? '✓' : ''}
                </span>
                {item}
              </label>
            ))}
          </div>
        </div>

        {/* Quy mô */}
        <div className="form-group">
          <label className="form-label">{t('quote.scale')}</label>
          <select
            className="form-select"
            value={form.purchaseScale}
            onChange={(e) => updateField('purchaseScale', e.target.value)}
            id="field-purchase-scale"
          >
            <option value="">{t('quote.scale_ph')}</option>
            {PURCHASE_SCALES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Tần suất giao */}
        <div className="form-group">
          <label className="form-label">{t('quote.freq')}</label>
          <select
            className="form-select"
            value={form.deliveryFrequency}
            onChange={(e) => updateField('deliveryFrequency', e.target.value)}
            id="field-delivery-frequency"
          >
            <option value="">{t('quote.freq_ph')}</option>
            {DELIVERY_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Khu vực giao */}
        <div className="form-group">
          <label className="form-label">{t('quote.area')}</label>
          <input
            className="form-input"
            type="text"
            value={form.deliveryArea}
            onChange={(e) => updateField('deliveryArea', e.target.value)}
            placeholder={t('quote.area_ph')}
            id="field-delivery-area"
          />
        </div>

        {/* Cần phản hồi trước */}
        <div className="form-group">
          <label className="form-label">{t('quote.need_by')}</label>
          <input
            className="form-input"
            type="date"
            value={form.needBy}
            onChange={(e) => updateField('needBy', e.target.value)}
            id="field-need-by"
          />
        </div>

        {/* Mô tả nhu cầu */}
        <div className="form-group">
          <label className="form-label">{t('quote.desc')}</label>
          <textarea
            className="form-textarea"
            value={form.message}
            onChange={(e) => updateField('message', e.target.value)}
            placeholder={t('quote.desc_ph')}
            id="field-message"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn--primary btn--full btn--lg"
          disabled={submitting}
          id="submit-quote-btn"
        >
          {submitting ? t('quote.submitting') : t('quote.submit_btn')}
        </button>

        <p
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            marginTop: '12px',
          }}
        >
          {t('quote.or_call')} <strong>{APP_CONFIG.hotline}</strong>
        </p>
      </form>

      {/* Success Modal */}
      {showSuccess && (
        <SuccessModal
          title="Đặt hàng thành công!"
          message="Đơn hàng của bạn đã được ghi nhận. Hệ thống sẽ chuyển tiếp bạn qua Zalo OA để shop hỗ trợ chốt đơn trực tiếp nhanh nhất."
          onClose={() => {
            setShowSuccess(false);
            if (pendingOrderText) {
              try {
                openChat({
                  type: 'oa',
                  id: '2465685762920854605',
                  message: pendingOrderText,
                  success: () => navigate('/'),
                  fail: () => navigate('/')
                });
              } catch(e) {
                navigate('/');
              }
            } else {
              navigate('/');
            }
          }}
        />
      )}
    </div>
  );
}
