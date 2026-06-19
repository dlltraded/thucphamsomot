// Zustand store - User info (Zalo SDK data)
import { create } from 'zustand';
import { getUserInfo, getPhoneNumber, getAccessToken } from 'zmp-sdk/apis';

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
      // KHÔNG dùng autoRequestPermission: true — sẽ hiện popup xin quyền ngay khi mở app,
      // vi phạm chính sách Zalo điều 6.1 (Ngữ cảnh xin quyền).
      // Chỉ lấy thông tin nếu user đã cấp quyền trước đó.
      const { userInfo } = await getUserInfo({ autoRequestPermission: false });
      if (userInfo) {
        get().setUserInfo(userInfo);
      }
    } catch (e) {
      // User chưa cấp quyền hoặc từ chối — bỏ qua, không yêu cầu lại
      console.log('Chưa có quyền lấy thông tin Zalo user (bình thường):', e);
    }
  },

  fetchZaloPhone: async () => {
    try {
      const { token } = await getPhoneNumber();
      console.log('Phone token obtained:', token);
      
      const userAccessToken = await getAccessToken();
      console.log('User access token obtained');

      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8080' 
        : 'https://thucphamsomot.vn';

      const response = await fetch(`${backendUrl}/api/zalo/decrypt-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          userAccessToken,
        }),
      });

      const resData = await response.json();
      if (resData.error === 0 && resData.data && resData.data.phone) {
        let realPhone = resData.data.phone;
        // Chuẩn hóa định dạng số điện thoại Việt Nam (84 -> 0)
        if (realPhone.startsWith('84')) {
          realPhone = '0' + realPhone.substring(2);
        }
        set({ phone: realPhone });
        console.log('Decrypted phone number set in store:', realPhone);
      } else {
        console.error('Failed to decrypt phone number from backend:', resData.message);
      }
    } catch (e) {
      console.error('Error fetching/decrypting Zalo phone:', e);
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
