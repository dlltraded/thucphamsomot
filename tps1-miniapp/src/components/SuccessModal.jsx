import React from 'react';

export default function SuccessModal({ onClose, title, message }) {
  return (
    <div className="modal-overlay" onClick={onClose} id="success-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">✅</div>
        <h2 className="modal-title">{title || 'Gửi thành công!'}</h2>
        <p className="modal-desc">
          {message ||
            'Yêu cầu của bạn đã được gửi đến TPS1. Đội ngũ sales sẽ liên hệ lại trong thời gian sớm nhất.'}
        </p>
        <button className="btn btn--primary btn--full" onClick={onClose} id="modal-close-btn">
          Đã hiểu
        </button>
      </div>
    </div>
  );
}
