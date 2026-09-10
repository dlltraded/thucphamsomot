import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  name: string;
  role: string;
  email?: string;
}

interface LoginTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (user: User, tokens: LoginTokens) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// LƯU Ý BẢO MẬT (2026-09-09): trước đây file này tự tạo một phiên "admin"
// giả mặc định khi localStorage trống, nghĩa là bất kỳ ai mở app này lần đầu
// (localStorage rỗng) đều tự động thành admin toàn quyền mà không cần đăng
// nhập. Đã viết lại để nguồn sự thật duy nhất là phiên đăng nhập THẬT của
// Supabase Auth (JWT), không phải một object tự khai trong localStorage.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        let profile: User | null = null;
        try {
          const stored = localStorage.getItem('tps1_sale_user');
          profile = stored ? JSON.parse(stored) : null;
        } catch {
          profile = null;
        }

        // Chỉ tin hồ sơ (tên/role) đã lưu nếu nó khớp đúng id của phiên đăng
        // nhập thật đang có. Nếu không khớp (hoặc không có), buộc đăng nhập
        // lại thay vì đoán/gán quyền mặc định.
        if (profile && profile.id === session.user.id) {
          if (mounted) {
            setUser(profile);
            setToken(session.access_token);
          }
        } else {
          await supabase.auth.signOut();
          localStorage.removeItem('tps1_sale_user');
        }
      } else {
        localStorage.removeItem('tps1_sale_user');
      }

      if (mounted) setLoading(false);
    };

    restore();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('tps1_sale_user');
      } else {
        setToken(session.access_token);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (userData: User, tokens: LoginTokens) => {
    // Gắn token thật của Supabase Auth vào client dùng chung (sale-webapp/src/lib/supabase.ts)
    // để mọi truy vấn supabase.from(...) sau đó đều được RLS nhận đúng danh tính (auth.uid()).
    await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    setUser(userData);
    setToken(tokens.accessToken);
    localStorage.setItem('tps1_sale_user', JSON.stringify(userData));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    localStorage.removeItem('tps1_sale_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
