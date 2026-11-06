import { useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input } from "zmp-ui";
import toast from "react-hot-toast";
import { customerAuthState, shippingAddressState } from "@/state";
import CONFIG from "@/config";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";
  const setCustomerAuth = useSetAtom(customerAuthState);
  const [shippingAddress, setShippingAddress] = useAtom(shippingAddressState);

  const [code, setCode] = useState(searchParams.get("code") || "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !password) {
      toast.error("Vui lòng nhập SĐT hoặc tên đăng nhập và mật khẩu");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE}/api/customer/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: code.trim(), password }) });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        toast.error(data.error || "Thông tin đăng nhập hoặc mật khẩu không đúng");
        return;
      }
      const row = data.session;

      const customer = {
        id: row.id,
        code: row.code,
        name: row.name,
        phone: row.phone,
        company: row.company,
        email: row.email || "",
        taxCode: row.taxCode || "",
        address: row.address || "",
        defaultShippingAddress: {
          alias: row.defaultShippingAddress?.alias || "Địa chỉ mặc định",
          address: row.defaultShippingAddress?.address || row.address || "",
          name: row.defaultShippingAddress?.name || row.name || "",
          phone: row.defaultShippingAddress?.phone || row.phone || "",
          customerId: row.id,
          isDefault: true,
        },
        // Hai trường cũ được giữ rỗng trong bộ nhớ để tương thích bản app đã
        // phát hành; giá mới chỉ đến từ bảng giá do server resolve.
        tier: "",
        discountPercent: 0,
        verificationStatus: row.verificationStatus || "verified",
        orderSessionToken: row.orderSessionToken || "",
      };

      if (row.mustChangePassword) {
        navigate("/change-password", {
          replace: true,
          state: { customer, oldPassword: password, redirect },
        });
        return;
      }

      setCustomerAuth(customer);
      if (
        customer.defaultShippingAddress.address &&
        (!shippingAddress ||
          shippingAddress.customerId !== customer.id ||
          shippingAddress.isDefault)
      ) {
        setShippingAddress(customer.defaultShippingAddress);
      }
      toast.success("Đăng nhập thành công");
      navigate(redirect, { replace: true });
    } catch (err) {
      console.error("Lỗi đăng nhập khách hàng:", err);
      toast.error("Không thể đăng nhập lúc này, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="h-full flex flex-col justify-between"
      onSubmit={handleSubmit}
    >
      <div className="bg-section p-4 grid gap-4">
        <p className="text-sm text-subtitle">
          Đăng nhập để đặt hàng và theo dõi đơn.
        </p>
        <Input
          name="code"
          label="SĐT hoặc tên đăng nhập"
          placeholder="SĐT hoặc tên đăng nhập"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="none"
        />
        <Input
          name="password"
          type="password"
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="p-6 pt-4 bg-section">
        {searchParams.get("registered") === "1" && (
          <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs leading-5 text-green-800">
            Đăng ký thành công. Nhập mật khẩu vừa tạo để tiếp tục.
          </div>
        )}
        <Button htmlType="submit" fullWidth loading={submitting}>
          Đăng nhập
        </Button>
        <button
          type="button"
          className="mt-3 w-full py-2 text-sm font-semibold text-primary"
          onClick={() => navigate(`/register?redirect=${encodeURIComponent(redirect)}`)}
        >
          Chưa có tài khoản? Đăng ký ngay
        </button>
      </div>
    </form>
  );
}
