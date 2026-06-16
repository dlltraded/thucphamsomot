import { create } from 'zustand';

export const useAppStore = create((set) => ({
  language: localStorage.getItem('tps1_language') || null, // 'vi' or 'en'
  hasSeenWelcome: localStorage.getItem('tps1_hasSeenWelcome') === 'true',
  
  setLanguage: (lang) => {
    localStorage.setItem('tps1_language', lang);
    localStorage.setItem('tps1_hasSeenWelcome', 'true');
    set({ language: lang, hasSeenWelcome: true });
  },
  resetWelcome: () => {
    localStorage.setItem('tps1_hasSeenWelcome', 'false');
    set({ hasSeenWelcome: false });
  },
}));
