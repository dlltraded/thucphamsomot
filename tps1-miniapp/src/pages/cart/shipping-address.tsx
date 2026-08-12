import { customerAuthState, shippingAddressState } from "@/state";
import type { ShippingAddress } from "@/types";
import { useAtom, useAtomValue } from "jotai";
import { useResetAtom } from "jotai/utils";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button, Icon, Input } from "zmp-ui";

function ShippingAddressPage() {
  const [address, setAddress] = useAtom(shippingAddressState);
  const customer = useAtomValue(customerAuthState);
  const resetAddress = useResetAtom(shippingAddressState);
  const navigate = useNavigate();

  return (
    <form
      className="h-full flex flex-col justify-between"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const newAddress: Partial<ShippingAddress> = {};
        data.forEach((value, key) => {
          if (key === "alias" || key === "address" || key === "name" || key === "phone") {
            newAddress[key] = String(value);
          }
        });
        setAddress({
          alias: newAddress.alias || "Địa chỉ giao hàng",
          address: newAddress.address || "",
          name: newAddress.name || customer?.name || "",
          phone: newAddress.phone || customer?.phone || "",
          customerId: customer?.id,
          isDefault: false,
        });
        toast.success("Đã chọn địa chỉ cho đơn hàng này");
        navigate(-1);
      }}
    >
      <div className="py-2 space-y-2">
        <div className="bg-section p-4 grid gap-4">
          <Input
            name="alias"
            label="Tên địa chỉ"
            placeholder="Ví dụ: công ty, trường học"
            defaultValue={address?.alias}
          />
          <Input
            name="address"
            label={
              <>
                Địa chỉ <span className="text-danger">*</span>
              </>
            }
            placeholder="Nhập địa chỉ"
            required
            defaultValue={address?.address}
            onInvalid={(e) => {
              e.currentTarget.setCustomValidity("Vui lòng nhập địa chỉ");
              e.currentTarget.reportValidity();
            }}
            onInput={(e) => {
              e.currentTarget.setCustomValidity("");
            }}
          />
        </div>
        <div className="bg-section p-4 grid gap-4">
          <Input
            name="name"
            label="Tên người nhận"
            placeholder="Nhập tên người nhận"
            defaultValue={address?.name}
          />
          <Input
            name="phone"
            label="Số điện thoại"
            placeholder="0912345678"
            defaultValue={address?.phone}
          />
        </div>
        <Button
          fullWidth
          className="!bg-section !text-danger !rounded-none"
          type="danger"
          prefixIcon={<Icon icon="zi-delete" />}
          onClick={() => {
            resetAddress();
            toast.success("Đã xóa địa chỉ");
            navigate(-1);
          }}
        >
          Xóa địa chỉ này
        </Button>
        {customer && (
          <button type="button" onClick={() => navigate("/profile/edit")} className="w-full bg-section px-4 py-3 text-center text-xs font-medium text-primary">
            Cập nhật địa chỉ mặc định trên hệ thống
          </button>
        )}
      </div>
      <div className="p-6 pt-4 bg-section">
        <Button htmlType="submit" fullWidth>
          Xong
        </Button>
      </div>
    </form>
  );
}

export default ShippingAddressPage;
