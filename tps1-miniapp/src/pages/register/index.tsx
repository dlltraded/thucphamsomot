import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Icon, Input } from "zmp-ui";
import toast from "react-hot-toast";
import CONFIG from "@/config";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/cart";
  const [form, setForm] = useState({
    name: "",
    phone: "",
    company: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || form.password.length < 8) {
      toast.error("Vui lòng nhập họ tên, số điện thoại và mật khẩu từ 8 ký tự");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Mật khẩu xác nhận chưa khớp");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE}/api/customer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "zalo_mini_app" }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Không đăng ký được tài khoản");
      const code = String(data.account.code);
      toast.success(`Đăng ký thành công - Mã khách hàng ${code}`);
      navigate(`/login?redirect=${encodeURIComponent(redirect)}&code=${encodeURIComponent(code)}&registered=1`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không đăng ký được tài khoản");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="min-h-full bg-[#f3f8f5] pb-6" onSubmit={submit}>
      <section className="bg-gradient-to-br from-[#087348] to-[#159563] px-5 pb-7 pt-5 text-white">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <Icon icon="zi-user-circle" size={28} />
        </div>
        <h1 className="text-xl font-bold">Đăng ký tài khoản mua hàng</h1>
        <p className="mt-2 text-sm leading-6 text-white/85">
          Tài khoản mới được tạo ở hạng VIP0. Nhân viên TPS1 sẽ kiểm tra, phân loại và xác nhận đơn giá cuối cùng cho từng đơn hàng.
        </p>
      </section>

      <section className="mx-4 -mt-3 grid gap-4 rounded-3xl bg-white p-5 shadow-[0_14px_38px_rgba(15,80,52,0.12)]">
        <Input label="Họ và tên *" value={form.name} onChange={update("name")} placeholder="Nguyễn Văn A" />
        <Input label="Số điện thoại *" value={form.phone} onChange={update("phone")} placeholder="09xxxxxxxx" />
        <Input label="Công ty / đơn vị" value={form.company} onChange={update("company")} placeholder="Không bắt buộc" />
        <Input label="Email" value={form.email} onChange={update("email")} placeholder="Không bắt buộc" />
        <Input label="Mật khẩu *" type="password" value={form.password} onChange={update("password")} placeholder="Tối thiểu 8 ký tự" />
        <Input label="Xác nhận mật khẩu *" type="password" value={form.confirmPassword} onChange={update("confirmPassword")} placeholder="Nhập lại mật khẩu" />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Đăng ký không đồng nghĩa được hưởng chiết khấu. Sale TPS1 sẽ liên hệ để xác thực và áp chính sách giá phù hợp.
        </div>
        <Button htmlType="submit" fullWidth loading={submitting}>Đăng ký và tiếp tục</Button>
        <button
          type="button"
          className="py-1 text-sm font-semibold text-primary"
          onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirect)}`)}
        >
          Đã có tài khoản? Đăng nhập
        </button>
      </section>
    </form>
  );
}
