// TPS1 Zalo Mini App - Constants & Configuration

export const APP_CONFIG = {
  name: 'Thực Phẩm Số Một Đồng Nai',
  shortName: 'TPS1',
  slogan: 'Best Food - Best Service',
  tagline: 'Nhà cung cấp thực phẩm B2B hàng đầu Đồng Nai',
  hotline: '089 890 2222',
  hotlineRaw: '0898902222',
  website: 'https://thucphamsomot.vn',
  address: 'Đồng Nai, Việt Nam',
  companyFull: 'Công Ty TNHH Thực Phẩm Số Một Đồng Nai',
  ceo: 'Nguyễn Tiến Bách',
};

// Google Apps Script endpoint (same as website)
export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwzSzAxX6tgXtVDt_U7PQFnXq5eupYTgBSEJ9VV7WOjY_I2tazX3wv-gYFOVLkxNSrW/exec';

// Product categories matching TPS1 Supabase data (8 real categories)
export const CATEGORIES = [
  { id: 'rau-cu',    name: 'Rau Củ Quả',            icon: '🥬', emoji: '🥬' },
  { id: 'thit-heo',  name: 'Thịt Heo',              icon: '🥩', emoji: '🥩' },
  { id: 'thit-bo',   name: 'Thịt Bò Nhập Khẩu',     icon: '🐄', emoji: '🐄' },
  { id: 'ga-vit',    name: 'Thịt Gia Cầm',           icon: '🍗', emoji: '🍗' },
  { id: 'hai-san',   name: 'Thuỷ Hải Sản',           icon: '🦐', emoji: '🦐' },
  { id: 'dong-lanh', name: 'Đông Lạnh - Chế Biến',  icon: '🧊', emoji: '🧊' },
  { id: 'gia-vi',    name: 'Gia Vị - Nước Chấm',     icon: '🧂', emoji: '🧂' },
  { id: 'gao-mi',    name: 'Gạo, Mì, Đồ Khô',       icon: '🍜', emoji: '🍜' },
];

// Facility types (matching website form)
export const FACILITY_TYPES = [
  'Bếp ăn tập thể',
  'Nhà máy / KCN',
  'Trường học',
  'Bệnh viện',
  'Nhà hàng / Khách sạn',
  'Đại lý / Nhà phân phối',
  'Công ty suất ăn công nghiệp',
  'Khác',
];

// Purchase scale options
export const PURCHASE_SCALES = [
  'Dưới 50 suất/ngày',
  '50 - 100 suất/ngày',
  '100 - 300 suất/ngày',
  '300 - 500 suất/ngày',
  'Trên 500 suất/ngày',
];

// Delivery frequency options
export const DELIVERY_FREQUENCIES = [
  'Hàng ngày',
  '2 - 3 lần/tuần',
  'Theo tuần',
  'Theo tháng',
  'Theo nhu cầu',
];

// Role options
export const ROLES = [
  { value: 'buyer', label: 'Người mua' },
  { value: 'supplier', label: 'Nhà cung cấp' },
];

// Interest groups (matching website form)
export const INTEREST_GROUPS = [
  'Rau củ quả',
  'Thịt cá hải sản',
  'Hàng đông lạnh',
  'Gia vị / Khô / Gia dụng',
  'Thực phẩm chay',
  'Tất cả nhóm hàng',
];

import { GENERATED_PRODUCTS } from '../data/products';

// Sample product catalog (grouped by category for Mini App)
export const SAMPLE_PRODUCTS = GENERATED_PRODUCTS;

// Lead status for display
export const LEAD_STATUSES = {
  submitted: { label: 'Đã gửi', color: '#3B82F6' },
  contacting: { label: 'Đang liên hệ', color: '#E8920C' },
  quoted: { label: 'Đã báo giá', color: '#8B5CF6' },
  won: { label: 'Đã chốt đơn', color: '#22A55B' },
};
