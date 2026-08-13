import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { MutableRefObject, useLayoutEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { UIMatch, useMatches, useNavigate } from "react-router-dom";
import {
  cartState,
  cartTotalState,
  ordersState,
  userInfoKeyState,
  userInfoState,
  deliveryModeState,
  shippingAddressState,
  selectedStationState,
  localOrdersState,
  customerAuthState
} from "@/state";
import { Product } from "@/types";
import { getConfig } from "@/utils/template";
import { authorize, openChat } from "zmp-sdk/apis";
import { useAtomCallback } from "jotai/utils";
import CONFIG from "@/config";

export function useRealHeight(
  element: MutableRefObject<HTMLDivElement | null>,
  defaultValue?: number
) {
  const [height, setHeight] = useState(defaultValue ?? 0);
  useLayoutEffect(() => {
    if (element.current && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        const [{ contentRect }] = entries;
        setHeight(contentRect.height);
      });
      ro.observe(element.current);
      return () => ro.disconnect();
    }
    return () => {};
  }, [element.current]);

  if (typeof ResizeObserver === "undefined") {
    return -1;
  }
  return height;
}

export function useRequestInformation() {
  const getStoredUserInfo = useAtomCallback(async (get) => {
    const userInfo = await get(userInfoState);
    return userInfo;
  });
  const setInfoKey = useSetAtom(userInfoKeyState);
  const refreshPermissions = () => setInfoKey((key) => key + 1);

  return async () => {
    const userInfo = await getStoredUserInfo();
    if (!userInfo) {
      await authorize({
        scopes: ["scope.userInfo", "scope.userPhonenumber"],
      }).then(refreshPermissions);
      return await getStoredUserInfo();
    }
    return userInfo;
  };
}

export function useAddToCart(product: Product) {
  const [cart, setCart] = useAtom(cartState);

  const currentCartItem = useMemo(
    () => cart.find((item) => item.product.id === product.id),
    [cart, product.id]
  );

  const addToCart = (
    quantity: number | ((oldQuantity: number) => number),
    options?: { toast: boolean }
  ) => {
    setCart((cart) => {
      const newQuantity =
        typeof quantity === "function"
          ? quantity(currentCartItem?.quantity ?? 0)
          : quantity;
      if (newQuantity <= 0) {
        cart.splice(cart.indexOf(currentCartItem!), 1);
      } else {
        if (currentCartItem) {
          currentCartItem.quantity = newQuantity;
        } else {
          cart.push({
            product,
            quantity: newQuantity,
          });
        }
      }
      return [...cart];
    });
    if (options?.toast) {
      toast.success("Đã thêm vào giỏ hàng");
    }
  };

  return { addToCart, cartQuantity: currentCartItem?.quantity ?? 0 };
}

export function useCustomerSupport() {
  return () =>
    openChat({
      type: "oa",
      id: getConfig((config) => config.template.oaIDtoOpenChat),
    });
}

export function useToBeImplemented() {
  return () =>
    toast("Chức năng dành cho các bên tích hợp phát triển...", {
      icon: "🛠️",
    });
}

export function useCheckout() {
  const { discountPercent } = useAtomValue(cartTotalState);
  const [cart, setCart] = useAtom(cartState);
  const navigate = useNavigate();
  const refreshNewOrders = useSetAtom(ordersState("pending"));
  const [localOrders, setLocalOrders] = useAtom(localOrdersState);
  const customerAuth = useAtomValue(customerAuthState);

  // Lấy thông tin giao hàng
  const deliveryMode = useAtomValue(deliveryModeState);
  const shippingAddress = useAtomValue(shippingAddressState);
  const selectedStation = useAtomValue(selectedStationState);

  return async () => {
    // Chặn đặt hàng nếu khách chưa đăng nhập bằng mã khách hàng —
    // giá bán lẻ trong app chỉ để tham khảo, phải đăng nhập mới đặt được
    // và mới áp dụng chiết khấu theo nhóm VIP1/VIP2/VIP3.
    if (!customerAuth) {
      navigate("/register?redirect=/cart");
      return;
    }
    if ((deliveryMode || "shipping") === "shipping" && !shippingAddress?.address) {
      toast.error("Vui lòng nhập địa chỉ giao hàng");
      navigate("/shipping-address");
      return;
    }

    try {
      // Áp % chiết khấu theo nhóm khách hàng ngay ở từng dòng sản phẩm để
      // tổng các item.amount luôn khớp chính xác paymentAmount (bắt buộc với Zalo Pay).
      const orderItems = cart.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: Math.round(item.product.price * (1 - discountPercent / 100)),
        quantity: item.quantity,
      }));

      // Delivery info (structured)
      let deliveryType    = deliveryMode || "shipping";
      let deliveryAddress = "";
      let deliveryAlias   = "";
      let deliveryName    = customerAuth.name || "";
      let deliveryPhone   = customerAuth.phone || "";
      let addressText     = "Trống";

      if (deliveryMode === "shipping" && shippingAddress) {
        addressText     = `Giao tận nơi: ${shippingAddress.address} (${shippingAddress.alias})`;
        deliveryType    = "shipping";
        deliveryAddress = shippingAddress.address || "";
        deliveryAlias   = shippingAddress.alias   || "";
        deliveryName    = shippingAddress.name    || deliveryName;
        deliveryPhone   = shippingAddress.phone   || deliveryPhone;
      } else if (deliveryMode === "pickup" && selectedStation) {
        addressText     = `Tự đến lấy: ${selectedStation.name} - ${selectedStation.address}`;
        deliveryType    = "pickup";
        deliveryAddress = `${selectedStation.name} - ${selectedStation.address}`;
        deliveryAlias   = "Tự đến lấy";
      }

      const apiUrl = CONFIG.API_BASE;
      const idempotencyKey = `zalo-${customerAuth.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const centralOrderResponse = await fetch(`${apiUrl}/api/customer/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "zalo_mini_app",
          orderSessionToken: customerAuth.orderSessionToken,
          idempotencyKey,
          items: cart.map((item) => ({
            productId: String(item.product.id),
            name: item.product.name,
            quantity: item.quantity,
          })),
          deliveryType,
          deliveryAddress,
          deliveryAlias,
          deliveryName,
          deliveryPhone,
          note: addressText,
        }),
      });
      const centralOrder = await centralOrderResponse.json();
      if (!centralOrderResponse.ok || !centralOrder.ok) {
        if (centralOrderResponse.status === 401) {
          navigate("/login?redirect=/cart");
        }
        throw new Error(centralOrder.error || "Không tạo được đơn hàng trung tâm");
      }

      const orderCode = String(centralOrder.orderCode);
      const discountedOrderTotal = Number(centralOrder.total || 0);
      const orderMessage = `Mã đơn: ${orderCode}\nKhách hàng: ${customerAuth.code} (${customerAuth.tier} - chiết khấu ${discountPercent}%)\nĐịa chỉ: ${addressText}\nThanh toán: Trực tiếp\nTổng tiền: ${Math.round(discountedOrderTotal)}đ`;

      // Save local order to show immediately
      const newLocalOrder = {
        id: orderCode,
        status: "pending" as any,
        paymentStatus: "pending" as any,
        createdAt: new Date(),
        receivedAt: new Date(),
        items: [...cart],
        delivery: deliveryMode === "shipping" && shippingAddress 
          ? { type: "shipping" as any, ...shippingAddress } 
          : { type: "pickup" as any, stationId: selectedStation ? Number(selectedStation.id) : 0 },
        total: discountedOrderTotal,
        note: orderMessage
      };

      setLocalOrders((prev) => [...prev, newLocalOrder]);

      // Mọi đơn đều phải được sale kiểm tra và chốt đơn giá cuối cùng.
      // Không gọi thanh toán Zalo khi đơn vẫn ở trạng thái giá tạm tính.
      setCart([]);
      refreshNewOrders();
      toast.success(`Đã gửi đơn tạm tính ${orderCode}`);
      navigate("/checkout-success", {
        viewTransition: true,
        replace: true,
        state: { orderCode, provisional: true },
      });
    } catch (error) {
      console.warn(error);
      toast.error(error instanceof Error ? error.message : "Gửi yêu cầu thất bại. Vui lòng thử lại.");
    }
  };
}

export function useRouteHandle() {
  const matches = useMatches() as UIMatch<
    undefined,
    | {
        title?: string | Function;
        logo?: boolean;
        search?: boolean;
        noFooter?: boolean;
        noBack?: boolean;
        noFloatingCart?: boolean;
        scrollRestoration?: number;
      }
    | undefined
  >[];
  const lastMatch = matches[matches.length - 1];

  return [lastMatch.handle, lastMatch, matches] as const;
}
