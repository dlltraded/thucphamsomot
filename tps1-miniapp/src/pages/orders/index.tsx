import { Tabs } from "zmp-ui";
import OrderList from "./order-list";
import { customerAuthState, ordersState } from "@/state";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Icon } from "zmp-ui";

function OrdersPage() {
  const { status } = useParams();
  const navigate = useNavigate();
  const customer = useAtomValue(customerAuthState);

  if (!customer) {
    return (
      <div className="p-4 pt-8">
        <div className="overflow-hidden rounded-3xl border border-[#dce9e2] bg-white shadow-[0_14px_40px_rgba(10,78,49,0.10)]">
          <div className="bg-gradient-to-br from-[#087348] to-[#18a16b] px-6 py-7 text-white">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Icon icon="zi-user-circle" size={28} />
            </div>
            <div className="text-xl font-bold">Theo dõi đơn hàng VIP</div>
            <div className="mt-2 text-sm leading-6 text-white/85">
              Đăng nhập để xem trạng thái giao hàng, lịch sử mua và mức giá ưu đãi riêng của anh/chị.
            </div>
          </div>
          <div className="space-y-3 p-5">
            <Button fullWidth onClick={() => navigate("/login?redirect=/orders/pending")}>
              Đăng nhập Cổng Đối Tác VIP
            </Button>
            <a
              className="flex items-center justify-center gap-2 rounded-xl bg-[#f3f8f5] px-4 py-3 text-sm font-semibold text-[#087348]"
              href="tel:0898902222"
            >
              <Icon icon="zi-call" size={18} />
              Liên hệ/Zalo 089.890.2222 để được cấp tài khoản
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Tabs
      className="h-full flex flex-col"
      activeKey={status || "pending"}
      onChange={(status) => navigate(`/orders/${status}`)}
    >
      <Tabs.Tab key="draft" label="Chờ duyệt">
        <OrderList ordersState={ordersState("draft")} />
      </Tabs.Tab>
      <Tabs.Tab key="pending" label="Đang xử lý">
        <OrderList ordersState={ordersState("pending")} />
      </Tabs.Tab>
      <Tabs.Tab key="shipping" label="Đang giao">
        <OrderList ordersState={ordersState("shipping")} />
      </Tabs.Tab>
      <Tabs.Tab key="completed" label="Lịch sử">
        <OrderList ordersState={ordersState("completed")} />
      </Tabs.Tab>
    </Tabs>
  );
}

export default OrdersPage;
