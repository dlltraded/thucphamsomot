import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { openChat } from 'zmp-sdk/apis';
import useCartStore from '../stores/cart';
import useUserStore from '../stores/user';
import { submitLead, saveRequestHistory } from '../services/sheets';
import { APP_CONFIG } from '../utils/constants';
import SuccessModal from '../components/SuccessModal';
import { useTranslation } from '../utils/i18n';

export default function OrderPage() {
  const navigate = useNavigate();
  const user = useUserStore();
  const { items, updateQty, removeItem, clearCart, getSummaryText } =
    useCartStore();

  const { t, language } = useTranslation();

  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [company, setCompany] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingOrderText, setPendingOrderText] = useState('');

  useEffect(() => {
    setName((prev) => prev || user.name || '');
    setPhone((prev) => prev || user.phone || '');
  }, [user.name, user.phone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert(t('order.alert_req'));
      return;
    }
    if (items.length === 0) {
      alert(t('order.alert_empty'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        formType: 'dat_hang',
        name,
        phone,
        company,
        deliveryArea,
        message: note,
        selectedProducts: getSummaryText(),
        interestedIn: [
          ...new Set(items.map((i) => i.category)),
        ].join(', '),
      };
      const result = await submitLead(payload);
      saveRequestHistory(payload);

      if (result.success) {
        let orderText = `Chào Thực Phẩm Số Một, tôi muốn đặt đơn hàng sau:\n`;
        items.forEach((item, idx) => {
          const itemName = language === 'en' && item.nameEn ? item.nameEn : item.name;
          orderText += `${idx + 1}. ${itemName} - Số lượng: ${item.qty} ${item.unit || 'kg'}\n`;
        });
        orderText += `\nThông tin giao hàng:\n- Tên: ${name}\n- SĐT: ${phone}`;
        if (company) orderText += `\n- Công ty: ${company}`;
        if (deliveryArea) orderText += `\n- Địa chỉ: ${deliveryArea}`;
        if (note) orderText += `\n- Ghi chú: ${note}`;

        setPendingOrderText(orderText);
        setShowSuccess(true);
        clearCart();
      } else {
        alert(t('order.alert_err') + APP_CONFIG.hotline);
      }
    } catch (err) {
      alert(t('order.alert_err') + APP_CONFIG.hotline);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" id="page-order" style={{ backgroundColor: '#f4f5f7', minHeight: '100vh', paddingBottom: '140px' }}>
      <div className="page-header" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
        <button className="back-btn" onClick={() => navigate(-1)} id="order-back-btn">
          ←
        </button>
        <h1>{t('order.title')}</h1>
        <button className="header-action-btn" onClick={() => navigate('/san-pham')}>
          ⋯
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state" style={{ backgroundColor: '#fff', marginTop: '12px' }}>
          <div className="empty-state__icon">🛒</div>
          <div className="empty-state__title">{t('order.empty_title')}</div>
          <div className="empty-state__desc">
            {t('order.empty_desc')}
          </div>
          <button
            className="btn btn--primary"
            onClick={() => navigate('/san-pham')}
            style={{ marginTop: '16px' }}
            id="go-catalog-btn"
          >
            {t('order.continue_btn')}
          </button>
        </div>
      ) : (
        <form className="order-form" onSubmit={handleSubmit} id="order-form">
          
          {/* Cart Items List */}
          <div className="cart-section" style={{ backgroundColor: '#fff', marginBottom: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: '600' }}>{t('order.products')}</h3>
            <div className="cart-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {items.map((item) => {
                const displayName = language === 'en' && item.nameEn ? item.nameEn : item.name;
                return (
                  <div key={item.id} className="cart-item" style={{ display: 'flex', gap: '12px' }}>
                    <img src={item.image} alt={displayName} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                    <div className="cart-item-details" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '14px', color: '#333' }}>{displayName}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price || 0)}
                        </div>
                        <div className="action-qty-control" style={{ border: 'none', background: '#f5f5f5', borderRadius: '20px', padding: '2px 8px' }}>
                          <button 
                            type="button"
                            className="qty-btn" 
                            onClick={() => item.qty > 1 ? updateQty(item.id, item.qty - 1) : removeItem(item.id)}
                            style={{ background: 'transparent', color: '#666' }}
                          >-</button>
                          <span className="qty-value" style={{ margin: '0 12px' }}>{item.qty}</span>
                          <button 
                            type="button"
                            className="qty-btn" 
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            style={{ background: 'transparent', color: '#666' }}
                          >+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div className="cart-section" style={{ backgroundColor: '#fff', marginBottom: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', width: '80px' }}>{t('order.note')}</span>
            <input 
              type="text" 
              placeholder={t('order.note_placeholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'right', fontSize: '14px', color: '#666' }}
            />
          </div>

          {/* Payment Summary */}
          <div className="cart-section" style={{ backgroundColor: '#fff', marginBottom: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: '600' }}>{t('order.payment')}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#666', fontSize: '14px' }}>
              <span>{t('order.total_items').replace('{{count}}', items.reduce((acc, item) => acc + item.qty, 0))}</span>
              <span>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                  items.reduce((acc, item) => acc + (item.price || 0) * item.qty, 0)
                )}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#666', fontSize: '14px' }}>
              <span>{t('order.shipping')}</span>
              <span>0 đ</span>
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0', margin: '12px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{t('order.total_pay')}</span>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#333' }}>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                  items.reduce((acc, item) => acc + (item.price || 0) * item.qty, 0)
                )}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="cart-section" style={{ backgroundColor: '#fff', marginBottom: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600' }}>{t('order.payment_method')}</h3>
              <span style={{ fontSize: '14px', color: '#1a73e8' }}>{t('order.change')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
              <div style={{ width: '32px', height: '32px', background: '#e6f4ea', color: '#137333', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
                <i className="icon-money"></i> 💵
              </div>
              <span style={{ flex: 1, fontSize: '14px' }}>{t('order.cod')}</span>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '5px solid #1a73e8' }}></div>
            </div>
          </div>

          {/* Delivery Form */}
          <div className="cart-section" style={{ backgroundColor: '#fff', marginBottom: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: '600' }}>{t('order.delivery_info')}</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <input
                className={`form-input ${user.name ? 'auto-filled' : ''}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('order.name_ph')}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <input
                className={`form-input ${user.phone ? 'auto-filled' : ''}`}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('order.phone_ph')}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <input
                className="form-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t('order.company_ph')}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <input
                className="form-input"
                value={deliveryArea}
                onChange={(e) => setDeliveryArea(e.target.value)}
                placeholder={t('order.address_ph')}
              />
            </div>
          </div>

          {/* Fixed Bottom Submit */}
          <div style={{ position: 'fixed', bottom: '64px', left: 0, right: 0, padding: '12px 16px', background: '#fff', borderTop: '1px solid #eee', zIndex: 10 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: '#1a73e8',
                color: '#fff',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {submitting ? t('order.submitting') : t('order.submit_btn')}
            </button>
          </div>
        </form>
      )}

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
