import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, ShoppingCart, Users, PackageOpen, LogOut, PlusSquare, Package } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  sale: 'Nhân viên Sale',
  truong_phong: 'Trưởng phòng',
  thu_mua: 'Thu mua',
};

// GIAI ĐOẠN A: 2 bộ khung điều hướng riêng theo userType — khách hàng chỉ
// thấy "Đơn hàng của tôi" (chưa có "Đặt hàng" tự phục vụ, việc đó là Giai
// đoạn E). Đây chỉ là ẩn menu cho gọn giao diện — chặn thật sự nằm ở route
// guard trong App.tsx, không dựa vào việc ẩn nút này.
export default function SaleLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isCustomer = user?.userType === 'customer';

  const navItems = isCustomer
    ? [{ path: '/', icon: <ShoppingCart size={20} />, label: 'Đơn hàng của tôi' }]
    : [
        { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { path: '/don-hang', icon: <ShoppingCart size={20} />, label: 'Quản lý Đơn hàng' },
        { path: '/tao-don-hang', icon: <PlusSquare size={20} />, label: 'Tạo đơn (POS)' },
        { path: '/khach-hang', icon: <Users size={20} />, label: 'Quản lý Khách hàng' },
        { path: '/hang-hoa', icon: <Package size={20} />, label: 'Hàng hóa' },
        { path: '/soan-hang', icon: <PackageOpen size={20} />, label: 'Soạn hàng' },
      ];

  return (
    <div className="flex h-screen bg-[#F4F7F6] text-slate-800 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm z-20">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md">
            T1
          </div>
          <div>
            <h1 className="font-bold text-green-900 leading-tight">TPS1 System</h1>
            <p className="text-xs text-slate-500">
              {isCustomer ? `Khách hàng ${user?.tier || ''}`.trim() : ROLE_LABELS[user?.role || ''] || user?.role}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive ? 'bg-green-100 text-green-800' : 'text-slate-600 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm uppercase">
              {user?.name?.substring(0, 2) || 'AD'}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-semibold truncate">{user?.name || 'User'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-medium transition-colors"
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-y-auto bg-slate-50/50">
        {/* Background Image / Decoration */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-green-600/10 to-transparent -z-10 pointer-events-none"></div>
        
        <div className="p-4 md:p-8 flex-1 w-full max-w-7xl mx-auto pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around items-center h-16 z-30 px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-green-600' : 'text-slate-500 hover:text-green-600'
              }`}
            >
              <div className="mb-1">{item.icon}</div>
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label.replace('Quản lý ', '').replace('Xuất Excel ', '')}</span>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center w-full h-full text-red-500 hover:text-red-600 transition-colors"
        >
          <div className="mb-1"><LogOut size={20} /></div>
          <span className="text-[10px] font-medium whitespace-nowrap">Đăng xuất</span>
        </button>
      </nav>
    </div>
  );
}
