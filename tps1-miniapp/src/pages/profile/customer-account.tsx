import { useAtom, useSetAtom } from "jotai";
import { customerAuthState, shippingAddressState } from "@/state";
import { Icon } from "zmp-ui";
import TransitionLink from "@/components/transition-link";
import toast from "react-hot-toast";

const TIER_LABEL: Record<string, string> = {
  VIP1: "Khách thân thiết",
  VIP2: "Khách hàng lớn",
  VIP3: "Đối tác chiến lược",
};

export default function CustomerAccount() {
  const [customer, setCustomer] = useAtom(customerAuthState);
  const setShippingAddress = useSetAtom(shippingAddressState);

  if (!customer) {
    return (
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d5f41] to-[#168b5d] p-4 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><Icon icon="zi-user" size={22} /></div>
          <div className="flex-1"><div className="text-base font-bold">Cổng Đối Tác VIP</div><p className="mt-1 text-xs leading-5 text-white/75">Đăng nhập để xem giá chiết khấu, đặt hàng và theo dõi đơn trên cùng hệ thống.</p></div>
        </div>
        <TransitionLink to="/login" className="mt-4 flex h-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-primary">Đăng nhập tài khoản</TransitionLink>
      </div>
    );
  }

  const shipping = customer.defaultShippingAddress;
  const handleLogout = () => {
    setCustomer(null);
    setShippingAddress(undefined);
    toast.success("Đã đăng xuất tài khoản khách hàng");
  };

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d5f41] via-[#11794f] to-[#199664] p-4 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">{customer.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase()}</div>
            <div className="min-w-0"><div className="truncate text-base font-bold">{customer.name}</div><div className="mt-0.5 truncate text-xs text-white/70">{customer.company || customer.code}</div></div>
          </div>
          <span className="shrink-0 rounded-full border border-amber-200/20 bg-amber-300/15 px-2 py-1 text-2xs font-bold text-amber-100">{customer.tier}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-black/10 p-3"><div className="text-2xs text-white/60">Mã khách hàng</div><div className="mt-1 text-sm font-bold">{customer.code}</div></div>
          <div className="rounded-xl bg-black/10 p-3"><div className="text-2xs text-white/60">Ưu đãi hiện tại</div><div className="mt-1 text-sm font-bold text-amber-200">-{customer.discountPercent}% mỗi đơn</div></div>
        </div>
        <div className="mt-3 text-2xs text-white/65">{TIER_LABEL[customer.tier] || customer.tier} · Tài khoản đã xác thực</div>
      </section>

      <section className="rounded-2xl bg-section p-4 shadow-sm border-[0.5px] border-black/10">
        <div className="flex items-center justify-between"><div className="text-sm font-bold">Thông tin đối tác</div><TransitionLink to="/profile/edit" className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary"><Icon icon="zi-edit" size={14} />Cập nhật</TransitionLink></div>
        <div className="mt-3 grid gap-2.5 text-xs">
          <Info icon="zi-call" label="Số điện thoại" value={customer.phone} />
          <Info icon="zi-mail" label="Email" value={customer.email || "Chưa cập nhật"} />
          <Info icon="zi-location" label="Giao mặc định" value={shipping?.address || "Chưa có địa chỉ mặc định"} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <TransitionLink to="/change-password" className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-section py-3 text-xs font-bold text-primary"><Icon icon="zi-lock" size={16} />Đổi mật khẩu</TransitionLink>
        <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-section py-3 text-xs font-bold text-red-600"><Icon icon="zi-lock" size={16} />Đăng xuất</button>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="flex items-start gap-2.5 rounded-xl bg-background p-3"><Icon icon={icon as never} size={17} className="mt-0.5 text-primary" /><div className="min-w-0"><div className="text-2xs text-subtitle">{label}</div><div className="mt-0.5 break-words font-medium text-foreground">{value}</div></div></div>;
}
