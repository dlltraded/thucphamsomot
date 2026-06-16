// Zustand store - User info (Zalo SDK data)
import { create } from 'zustand';
import { getUserInfo, getPhoneNumber } from 'zmp-sdk/apis';

const useUserStore = create((set, get) => ({
  name: '',
  phone: '',
  avatar: '',
  zaloId: '',
  isLoaded: false,

  setUserInfo: (info) =>
    set({
      name: info.name || '',
      avatar: info.avatar || '',
      zaloId: info.id || '',
      isLoaded: true,
    }),

  setPhone: (phone) => set({ phone }),

  fetchZaloUser: async () => {
    try {
      const { userInfo } = await getUserInfo({ autoRequestPermission: true });
      if (userInfo) {
        get().setUserInfo(userInfo);
      }
    } catch (e) {
      console.log('Không lấy được thông tin Zalo user:', e);
      // Fallback or ignore
    }
  },

  fetchZaloPhone: async () => {
    try {
      const { token } = await getPhoneNumber();
      // NOTE: In a real app, you need to send this token to your backend
      // to decode the actual phone number via Zalo Open API.
      // For now, we just log it.
      console.log('Phone token:', token);
    } catch (e) {
      console.log('User từ chối chia sẻ SĐT:', e);
    }
  },

  // For development/testing without Zalo SDK
  setMockUser: () =>
    set({
      name: 'Khách hàng test',
      phone: '0900000000',
      avatar: '',
      zaloId: 'test-user',
      isLoaded: true,
    }),
}));

export default useUserStore;
