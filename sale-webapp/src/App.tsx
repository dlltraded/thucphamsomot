import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SaleLayout from './layouts/SaleLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import PosCreatePage from './pages/PosCreatePage';
import CustomersPage from './pages/CustomersPage';
import SoanHangPage from './pages/SoanHangPage';
import MyOrdersPage from './pages/MyOrdersPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0B130E] text-white">Đang tải...</div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/dang-nhap" />;
  return <>{children}</>;
};

// GIAI ĐOẠN A: route guard chặn CỨNG ở tầng router — không chỉ ẩn menu trong
// SaleLayout. Khách hàng gõ thẳng URL nội bộ như /pos, /don-hang, /khach-hang
// phải bị redirect về "/" (Đơn hàng của tôi), không được render nội dung nhân
// viên dù chỉ trong một khoảnh khắc.
const StaffOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/dang-nhap" />;
  if (user.userType !== 'staff') return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Trang chủ ("/") khác nhau theo userType: nhân viên thấy Dashboard, khách
// hàng thấy đơn hàng của chính họ.
const HomeRoute = () => {
  const { user } = useAuth();
  return user?.userType === 'customer' ? <MyOrdersPage /> : <DashboardPage />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/dang-nhap" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><SaleLayout /></ProtectedRoute>}>
            <Route index element={<HomeRoute />} />
            <Route path="don-hang" element={<StaffOnlyRoute><OrdersPage /></StaffOnlyRoute>} />
            <Route path="don-hang/:id" element={<StaffOnlyRoute><OrderDetailPage /></StaffOnlyRoute>} />
            <Route path="tao-don-hang" element={<StaffOnlyRoute><PosCreatePage /></StaffOnlyRoute>} />
            <Route path="khach-hang" element={<StaffOnlyRoute><CustomersPage /></StaffOnlyRoute>} />
            <Route path="hang-hoa" element={<StaffOnlyRoute><ProductsPage /></StaffOnlyRoute>} />
            <Route path="hang-hoa/:id" element={<StaffOnlyRoute><ProductDetailPage /></StaffOnlyRoute>} />
            <Route path="soan-hang" element={<StaffOnlyRoute><SoanHangPage /></StaffOnlyRoute>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
