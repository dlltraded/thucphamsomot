// Service: POST lead data to Google Apps Script
import axios from 'axios';
import { APPS_SCRIPT_URL } from '../utils/constants';

/**
 * Submit a lead/quote request to Google Sheets via Apps Script
 * Same format as the website form so data goes into the same Sheets tab
 */
export async function submitLead(formData) {
  const payload = {
    submittedAt: new Date().toISOString(),
    vaiTro: (formData.role === 'supplier') ? 'Nhà cung cấp' : 'Người mua',
    loaiForm: formData.formType || 'bao_gia',
    kenh: 'Zalo Mini App',
    name: formData.name || '',
    phone: formData.phone || '',
    email: formData.email || '',
    company: formData.company || '',
    facilityType: formData.facilityType || '',
    interestedIn: Array.isArray(formData.interestedIn)
      ? formData.interestedIn.join(', ')
      : formData.interestedIn || '',
    purchaseScale: formData.purchaseScale || '',
    deliveryFrequency: formData.deliveryFrequency || '',
    deliveryArea: formData.deliveryArea || '',
    needBy: formData.needBy || '',
    message: formData.message || '',
    selectedProducts: formData.selectedProducts || '',
    selectedCount: typeof formData.selectedCount === 'number'
      ? formData.selectedCount
      : (formData.cartItems ? formData.cartItems.length : 0),
    cartItems: Array.isArray(formData.cartItems) ? formData.cartItems : [],
    source: 'Zalo Mini App',
  };

  try {
    // Google Apps Script expects POST with JSON body
    const response = await axios.post(APPS_SCRIPT_URL, payload, {
      headers: { 'Content-Type': 'text/plain' },
      // text/plain avoids CORS preflight with Apps Script
    });
    
    // Gửi ZNS xác nhận yêu cầu từ Mini App
    triggerMiniAppZns(formData);

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Submit lead error:', error);
    // Fallback: try with no-cors mode via fetch
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });

      // Gửi ZNS xác nhận yêu cầu từ Mini App (trường hợp fallback)
      triggerMiniAppZns(formData);

      return { success: true, data: { status: 'sent_no_cors' } };
    } catch (fetchErr) {
      console.error('Fetch fallback error:', fetchErr);
      return { success: false, error: fetchErr.message };
    }
  }
}

/**
 * Gọi API backend Next.js để gửi tin nhắn ZNS xác nhận yêu cầu từ Mini App
 */
function triggerMiniAppZns(formData) {
  if (!formData.phone || !formData.name) return;

  const backendUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : 'https://thucphamsomot.vn';

  fetch(`${backendUrl}/api/zalo/send-zns-lead`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: formData.phone,
      name: formData.name,
      source: 'Zalo Mini App',
    }),
  })
    .then((res) => res.json())
    .then((data) => console.log('Zalo ZNS Mini App trigger result:', data))
    .catch((err) => console.error('Zalo ZNS Mini App trigger error:', err));
}

/**
 * Save submitted request to localStorage for history
 */
export function saveRequestHistory(formData) {
  try {
    const history = JSON.parse(localStorage.getItem('tps1_requests') || '[]');
    history.unshift({
      id: Date.now().toString(36),
      ...formData,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    });
    // Keep last 50 requests
    localStorage.setItem(
      'tps1_requests',
      JSON.stringify(history.slice(0, 50))
    );
  } catch (e) {
    console.error('Save history error:', e);
  }
}

/**
 * Get request history from localStorage
 */
export function getRequestHistory() {
  try {
    return JSON.parse(localStorage.getItem('tps1_requests') || '[]');
  } catch {
    return [];
  }
}
