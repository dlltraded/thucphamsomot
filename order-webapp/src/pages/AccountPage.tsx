import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, KeyRound, MapPin, Phone, Mail, ClipboardList, LogOut, ChevronRight, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function AccountPage() {
  const { session, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [orderCount, setOrderCount] = useState<number | null>(null);
  useEffect(() => { let live = true; api.orders().then(({ orders }) => { if (live) setOrderCount(orders.length); }).catch(() => undefined); return () => { live = false; }; }, []);
  const rows = [
    { icon: Building2, label: t('Công ty / cửa hàng'), value: session?.company || '—' },
    { icon: Phone, label: t('Số điện thoại'), value: session?.phone || '—' },
    { icon: Mail, label: t('Email'), value: session?.email || '—' },
    { icon: MapPin, label: t('Địa chỉ giao hàng mặc định'), value: session?.defaultShippingAddress?.address || session?.address || '—' },
  ];
  return <div className="mx-auto max-w-3xl space-y-5 pb-6">
    <header><p className="text-xs font-bold uppercase tracking-widest text-[#0f7a4f]">TPS1 B2B</p><h1 className="mt-1 text-2xl font-black text-[#17382a]">{t('Tài khoản của tôi')}</h1><p className="mt-1 text-sm text-[#65796d]">{t('Thông tin hồ sơ và các thao tác tài khoản')}</p></header>
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b4f34] to-[#13875b] p-5 text-white shadow-lg sm:p-7">
      <div className="flex items-start justify-between gap-3"><div className="flex size-14 items-center justify-center rounded-2xl bg-white/15 text-xl font-black">{(session?.name || session?.company || 'K').slice(0,1).toUpperCase()}</div>
        <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">{session?.verificationStatus === 'pending' ? t('Chờ TPS1 xác minh') : t('Tài khoản đã xác minh')}</span></div>
      <h2 className="mt-4 text-xl font-extrabold">{session?.name || session?.company}</h2><p className="mt-1 text-sm text-white/75">{t('Mã khách hàng')}: <strong className="font-mono text-white">{session?.code}</strong></p>
      <div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-4 text-sm text-white/85"><ClipboardList size={17}/>{orderCount === null ? '—' : orderCount} {t('đơn hàng')}</div>
    </section>
    <section className="overflow-hidden rounded-2xl border border-[#17231d]/10 bg-white shadow-sm"><h3 className="border-b border-[#17231d]/8 px-4 py-3 text-sm font-bold text-[#17382a]">{t('Thông tin khách hàng')}</h3>
      {rows.map(({icon: Icon,label,value}) => <div key={label} className="flex gap-3 border-b border-[#17231d]/5 px-4 py-3.5 last:border-0"><span className="mt-0.5 text-[#0f7a4f]"><Icon size={18}/></span><div className="min-w-0"><p className="text-xs text-[#75857b]">{label}</p><p className="mt-0.5 break-words text-sm font-semibold text-[#263e31]">{value}</p></div></div>)}
    </section>
    <section className="overflow-hidden rounded-2xl border border-[#17231d]/10 bg-white shadow-sm">
      <Link to="/don-hang" className="flex items-center gap-3 border-b border-[#17231d]/6 px-4 py-4 text-sm font-semibold text-[#263e31]"><ClipboardList size={18} className="text-[#0f7a4f]"/>{t('Đơn hàng của tôi')}<ChevronRight size={17} className="ml-auto text-[#829087]"/></Link>
      <Link to="/doi-mat-khau" className="flex items-center gap-3 px-4 py-4 text-sm font-semibold text-[#263e31]"><KeyRound size={18} className="text-[#0f7a4f]"/>{t('Đổi mật khẩu')}<ChevronRight size={17} className="ml-auto text-[#829087]"/></Link>
    </section>
    <p className="flex items-center gap-2 px-1 text-xs text-[#718579]"><ShieldCheck size={16} className="text-[#0f7a4f]"/>{t('Thông tin tài khoản được bảo mật')}</p>
    <button onClick={() => { logout(); navigate('/dang-nhap'); }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white font-bold text-rose-700"><LogOut size={17}/>{t('Đăng xuất')}</button>
  </div>;
}
