import CONFIG from "@/config";
import { customerAuthState, shippingAddressState, type CustomerAuth } from "@/state";
import { useAtom, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button, Icon, Input } from "zmp-ui";

type ProfileForm = {
  name: string;
  phone: string;
  company: string;
  email: string;
  taxCode: string;
  address: string;
  shippingAlias: string;
  shippingAddress: string;
  shippingName: string;
  shippingPhone: string;
};

export default function ProfileEditorPage() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useAtom(customerAuthState);
  const setShippingAddress = useSetAtom(shippingAddressState);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ProfileForm>(() => ({
    name: customer?.name || "",
    phone: customer?.phone || "",
    company: customer?.company || "",
    email: customer?.email || "",
    taxCode: customer?.taxCode || "",
    address: customer?.address || "",
    shippingAlias: customer?.defaultShippingAddress?.alias || "Địa chỉ mặc định",
    shippingAddress: customer?.defaultShippingAddress?.address || "",
    shippingName: customer?.defaultShippingAddress?.name || customer?.name || "",
    shippingPhone: customer?.defaultShippingAddress?.phone || customer?.phone || "",
  }));

  useEffect(() => {
    if (!customer) navigate("/login?redirect=/profile/edit", { replace: true });
  }, [customer, navigate]);

  if (!customer) return null;

  const update = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 2 || form.phone.trim().length < 8) {
      toast.error("Vui lòng nhập đúng tên và số điện thoại liên hệ");
      return;
    }
    if (form.shippingAddress && (!form.shippingName || form.shippingPhone.length < 8)) {
      toast.error("Vui lòng nhập đủ người nhận và số điện thoại giao hàng");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE}/api/customer/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          orderSessionToken: customer.orderSessionToken,
          ...form,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Không cập nhật được thông tin");

      const session = data.session;
      const nextCustomer: CustomerAuth = {
        id: session.id,
        code: session.code,
        name: session.name,
        phone: session.phone,
        company: session.company || "",
        email: session.email || "",
        taxCode: session.taxCode || "",
        address: session.address || "",
        defaultShippingAddress: {
          alias: session.defaultShippingAddress?.alias || "Địa chỉ mặc định",
          address: session.defaultShippingAddress?.address || "",
          name: session.defaultShippingAddress?.name || session.name,
          phone: session.defaultShippingAddress?.phone || session.phone,
          customerId: session.id,
          isDefault: true,
        },
        tier: session.tier || customer.tier,
        discountPercent: Number(session.discountPercent ?? customer.discountPercent) || 0,
        orderSessionToken: session.orderSessionToken || customer.orderSessionToken,
      };
      setCustomer(nextCustomer);
      setShippingAddress(nextCustomer.defaultShippingAddress);
      toast.success("Đã đồng bộ thông tin với hệ thống TPS1");
      navigate("/profile", { replace: true });
    } catch (error) {
      console.error("Lỗi cập nhật hồ sơ:", error);
      toast.error(error instanceof Error ? error.message : "Không cập nhật được thông tin");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="min-h-full bg-background pb-24" onSubmit={handleSubmit}>
      <div className="p-4 space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-[#0f6f4b] to-[#159260] p-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Icon icon="zi-user-circle" size={24} />
            </div>
            <div>
              <div className="text-xs text-white/70">Mã khách hàng {customer.code}</div>
              <div className="text-base font-bold">Cập nhật hồ sơ đối tác</div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-white/75">Thông tin lưu tại đây sẽ đồng bộ với Website, Admin và dùng mặc định cho đơn hàng tiếp theo.</p>
        </div>

        <section className="rounded-2xl bg-section p-4 shadow-sm border-[0.5px] border-black/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-primary"><Icon icon="zi-user" size={18} />Thông tin liên hệ</div>
          <Input label="Tên người liên hệ" required value={form.name} onChange={(event) => update("name", event.target.value)} />
          <Input label="Số điện thoại" type="text" required value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          <Input label="Công ty / đơn vị" value={form.company} onChange={(event) => update("company", event.target.value)} />
          <Input label="Email" type="text" value={form.email} onChange={(event) => update("email", event.target.value)} />
          <Input label="Mã số thuế" value={form.taxCode} onChange={(event) => update("taxCode", event.target.value)} />
          <Input.TextArea label="Địa chỉ công ty / xuất hóa đơn" value={form.address} onChange={(event) => update("address", event.target.value)} />
        </section>

        <section className="rounded-2xl bg-section p-4 shadow-sm border-[0.5px] border-black/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-primary"><Icon icon="zi-location" size={18} />Địa chỉ giao hàng mặc định</div>
          <Input label="Tên gợi nhớ" placeholder="Công ty, kho hàng..." value={form.shippingAlias} onChange={(event) => update("shippingAlias", event.target.value)} />
          <Input label="Người nhận" value={form.shippingName} onChange={(event) => update("shippingName", event.target.value)} />
          <Input label="Số điện thoại nhận hàng" type="text" value={form.shippingPhone} onChange={(event) => update("shippingPhone", event.target.value)} />
          <Input.TextArea label="Địa chỉ giao hàng" value={form.shippingAddress} onChange={(event) => update("shippingAddress", event.target.value)} />
        </section>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-section p-4 pb-sb shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <Button htmlType="submit" fullWidth loading={submitting}>Lưu và đồng bộ</Button>
      </div>
    </form>
  );
}
