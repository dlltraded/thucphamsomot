import { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Input } from "zmp-ui";
import toast from "react-hot-toast";
import {
  customerAuthState,
  shippingAddressState,
  type CustomerAuth,
} from "@/state";
import { supabase } from "@/utils/supabase";

interface ForcedChangeState {
  customer: CustomerAuth;
  oldPassword: string;
  redirect: string;
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setCustomerAuth = useSetAtom(customerAuthState);
  const setShippingAddress = useSetAtom(shippingAddressState);
  const loggedInCustomer = useAtomValue(customerAuthState);
  const forcedState = location.state as ForcedChangeState | null;

  // Chế độ bắt buộc (ngay sau lần đăng nhập đầu, đã có sẵn mật khẩu tạm vừa nhập)
  // Chế độ chủ động (khách đã đăng nhập, tự vào đổi mật khẩu từ Profile)
  const customer = forcedState?.customer || loggedInCustomer;
  const isForced = !!forcedState;

  const [oldPassword, setOldPassword] = useState(forcedState?.oldPassword || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!customer) {
      navigate("/login", { replace: true });
    }
  }, [customer, navigate]);

  if (!customer) return null;

  const redirect = forcedState?.redirect || "/profile";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      toast.error("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải từ 6 ký tự trở lên");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Xác nhận mật khẩu không khớp");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("customer_change_password", {
        p_code: customer.code,
        p_old_password: oldPassword,
        p_new_password: newPassword,
      });

      if (error) throw error;

      setCustomerAuth(customer);
      if (customer.defaultShippingAddress?.address) {
        setShippingAddress(customer.defaultShippingAddress);
      }
      toast.success(
        isForced
          ? `Đổi mật khẩu thành công — Nhóm ${customer.tier}, chiết khấu ${customer.discountPercent}%`
          : "Đổi mật khẩu thành công"
      );
      navigate(redirect, { replace: true });
    } catch (err: any) {
      console.error("Lỗi đổi mật khẩu:", err);
      toast.error(err?.message || "Không đổi được mật khẩu, vui lòng thử lại");
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
          {isForced ? (
            <>
              Đây là lần đăng nhập đầu tiên của mã khách hàng{" "}
              <strong>{customer.code}</strong>. Vui lòng đặt mật khẩu mới theo
              ý bạn để tiếp tục.
            </>
          ) : (
            <>
              Đổi mật khẩu cho mã khách hàng <strong>{customer.code}</strong>.
            </>
          )}
        </p>
        {!isForced && (
          <Input
            name="oldPassword"
            type="password"
            label="Mật khẩu hiện tại"
            placeholder="Nhập mật khẩu hiện tại"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        )}
        <Input
          name="newPassword"
          type="password"
          label="Mật khẩu mới"
          placeholder="Ít nhất 6 ký tự"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          name="confirmPassword"
          type="password"
          label="Xác nhận mật khẩu mới"
          placeholder="Nhập lại mật khẩu mới"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <div className="p-6 pt-4 bg-section">
        <Button htmlType="submit" fullWidth loading={submitting}>
          Đặt mật khẩu mới
        </Button>
      </div>
    </form>
  );
}
