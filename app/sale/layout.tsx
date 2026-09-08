import { ReactNode } from "react";
import { getAdminSession } from "@/lib/admin-session";
import { redirect } from "next/navigation";
import { Users, ShoppingCart, LayoutDashboard, LogOut, PackageOpen } from "lucide-react";
import Link from "next/link";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "TPS1 Hệ Thống Quản Lý",
  description: "Dành cho nhân viên TPS1",
  path: "/sale",
  robots: { index: false, follow: false },
});

export default async function SaleLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/sale/dang-nhap");
  }

  const isAdmin = session.role === "admin";

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
            <p className="text-xs text-slate-500">{isAdmin ? "Quản trị viên" : "Nhân viên Sale"}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link href="/sale" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-green-50 hover:text-green-700 font-medium transition-colors">
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link href="/sale/don-hang" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-green-50 hover:text-green-700 font-medium transition-colors">
            <ShoppingCart size={20} /> Quản lý Đơn hàng
          </Link>
          <Link href="/sale/khach-hang" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-green-50 hover:text-green-700 font-medium transition-colors">
            <Users size={20} /> Quản lý Khách hàng
          </Link>
          <Link href="/sale/soan-hang" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-green-50 hover:text-green-700 font-medium transition-colors">
            <PackageOpen size={20} /> Xuất Excel Soạn hàng
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
              {session.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-semibold truncate">{session.name}</p>
            </div>
          </div>
          <form action="/api/sale-auth/logout" method="POST">
            <button className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-medium transition-colors">
              <LogOut size={18} /> Đăng xuất
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-y-auto bg-slate-50/50">
        {/* Background Image / Decoration */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-green-600/10 to-transparent -z-10 pointer-events-none"></div>
        
        <div className="p-4 md:p-8 flex-1 w-full max-w-7xl mx-auto">
          {children}
        </div>

        {/* Mobile Bottom Navigation padding */}
        <div className="h-20 md:hidden w-full"></div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around items-center h-16 z-30 px-2 pb-safe">
        <Link href="/sale" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-green-600">
          <LayoutDashboard size={22} className="mb-1" />
          <span className="text-[10px] font-medium">Trang chủ</span>
        </Link>
        <Link href="/sale/don-hang" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-green-600">
          <ShoppingCart size={22} className="mb-1" />
          <span className="text-[10px] font-medium">Đơn hàng</span>
        </Link>
        <Link href="/sale/khach-hang" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-green-600">
          <Users size={22} className="mb-1" />
          <span className="text-[10px] font-medium">Khách hàng</span>
        </Link>
        <Link href="/sale/soan-hang" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-green-600">
          <PackageOpen size={22} className="mb-1" />
          <span className="text-[10px] font-medium">Soạn hàng</span>
        </Link>
      </nav>
    </div>
  );
}
