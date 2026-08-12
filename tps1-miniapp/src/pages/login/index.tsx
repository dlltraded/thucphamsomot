import { useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input } from "zmp-ui";
import toast from "react-hot-toast";
import { customerAuthState, shippingAddressState } from "@/state";
import { supabase } from "@/utils/supabase";

interface LoginRpcRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  company: string;
  email: string;
  tax_code: string;
  address: string;
  default_shipping_alias: string;
  default_shipping_address: string;
  default_shipping_name: string;
  default_shipping_phone: string;
  tier: string;
  discount_percent: number;
  must_change_password: boolean;
  order_session_token: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";
  const setCustomerAuth = useSetAtom(customerAuthState);
  const [shippingAddress, setShippingAddress] = useAtom(shippingAddressState);

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !password) {
      toast.error("Vui lòng nhập đầy đủ Mã khách hàng và Mật khẩu");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("verify_customer_login", {
        p_code: code.trim(),
        p_password: password,
      });

      if (error) throw error;

      const row: LoginRpcRow | undefined = Array.isArray(data) ? data[0] : data;
      if (!row) {
        toast.error("Mã khách hàng hoặc mật khẩu không đúng");
        return;
      }

      const customer = {
        id: row.id,
        code: row.code,
        name: row.name,
        phone: row.phone,
        company: row.company,
        email: row.email || "",
        taxCode: row.tax_code || "",
        address: row.address || "",
        defaultShippingAddress: {
          alias: row.default_shipping_alias || "Địa chỉ mặc định",
          address: row.default_shipping_address || row.address || "",
          name: row.default_shipping_name || row.name || "",
          phone: row.default_shipping_phone || row.phone || "",
          customerId: row.id,
          isDefault: true,
        },
        tier: row.tier,
        discountPercent: Number(row.discount_percent) || 0,
        orderSessionToken: row.order_session_token || "",
      };

      if (row.must_change_password) {
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
      toast.success(
        `Đăng nhập thành công — Nhóm ${customer.tier}, chiết khấu ${customer.discountPercent}%`
      );
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
          Nhập Mã khách hàng và Mật khẩu do sale TPS1 cung cấp để xem giá
          chiết khấu riêng và đặt hàng.
        </p>
        <Input
          name="code"
          label="Mã khách hàng"
          placeholder="TPS1-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
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
        <Button htmlType="submit" fullWidth loading={submitting}>
          Đăng nhập
        </Button>
      </div>
    </form>
  );
}
