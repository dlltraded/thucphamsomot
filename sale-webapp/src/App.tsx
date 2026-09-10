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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0B130E] text-white">Đang tải...</div>;
  if (!user) return <Navigate to="/dang-nhap" />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/dang-nhap" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><SaleLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="don-hang" element={<OrdersPage />} />
            <Route path="don-hang/:id" element={<OrderDetailPage />} />
            <Route path="tao-don-hang" element={<PosCreatePage />} />
            <Route path="khach-hang" element={<CustomersPage />} />
            <Route path="soan-hang" element={<SoanHangPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
