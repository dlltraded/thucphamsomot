import { create } from 'zustand';

// Mặc định tiếng Việt, không hiển thị màn hình chào mừng chặn trước app.
// Việc hiển thị màn hình xin thông tin/chọn ngữ ngữ khi mở app vi phạm
// chính sách Zalo điều 6.1 (Ngữ cảnh xin quyền).
export const useAppStore = create((set) => ({
  language: localStorage.getItem('tps1_language') || 'vi', // mặc định tiếng Việt

  setLanguage: (lang) => {
    localStorage.setItem('tps1_language', lang);
    set({ language: lang });
  },
}));
