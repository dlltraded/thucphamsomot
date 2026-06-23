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
  localOrdersState
} from "@/state";
import { Product } from "@/types";
import { getConfig } from "@/utils/template";
import { authorize, createOrder, openChat } from "zmp-sdk/apis";
import { useAtomCallback } from "jotai/utils";

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
  const { totalAmount } = useAtomValue(cartTotalState);
  const [cart, setCart] = useAtom(cartState);
  const requestInfo = useRequestInformation();
  const navigate = useNavigate();
  const refreshNewOrders = useSetAtom(ordersState("pending"));
  const [localOrders, setLocalOrders] = useAtom(localOrdersState);
  
  // Lấy thông tin giao hàng
  const deliveryMode = useAtomValue(deliveryModeState);
  const shippingAddress = useAtomValue(shippingAddressState);
  const selectedStation = useAtomValue(selectedStationState);

  return async () => {
    try {
      const userInfo = await requestInfo();
      
      const orderItems = cart.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      let addressText = "Trống";
      if (deliveryMode === "shipping" && shippingAddress) {
        addressText = `Giao tận nơi: ${shippingAddress.address} (${shippingAddress.alias})`;
      } else if (deliveryMode === "pickup" && selectedStation) {
        addressText = `Tự đến lấy: ${selectedStation.name} - ${selectedStation.address}`;
      }

      const payload = {
        vaiTro: "Người mua", 
        loaiForm: "dat_hang",
        kenh: "Zalo Mini App",
        name: userInfo?.name || "Khách Zalo",
        phone: userInfo?.phone || "Không rõ",
        email: "",
        company: "",
        source: "Zalo Mini App",
        message: `Mã đơn: DH${Date.now().toString().slice(-6)}\nĐịa chỉ: ${addressText}\nThanh toán: Trực tiếp\nTổng tiền: ${totalAmount}đ`,
        selectedItems: orderItems.map(i => ({ title: i.name, quantity: i.quantity })),
        selectedCount: orderItems.length
      };

      const webhookUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK || "";
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(payload),
        });
      }

      // Save local order to show immediately
      const newLocalOrder = {
        id: "DH" + Date.now().toString().slice(-6),
        status: "pending" as any,
        paymentStatus: "pending" as any,
        createdAt: new Date(),
        receivedAt: new Date(),
        items: [...cart],
        delivery: deliveryMode === "shipping" && shippingAddress 
          ? { type: "shipping" as any, ...shippingAddress } 
          : { type: "pickup" as any, stationId: selectedStation ? Number(selectedStation.id) : 0 },
        total: totalAmount,
        note: payload.message
      };

      setLocalOrders((prev) => [...prev, newLocalOrder]);

      setCart([]);
      refreshNewOrders();
      navigate("/checkout-success", {
        viewTransition: true,
        replace: true
      });
    } catch (error) {
      console.warn(error);
      toast.error(
        "Gửi yêu cầu thất bại. Vui lòng thử lại."
      );
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
