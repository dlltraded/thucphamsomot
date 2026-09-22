import { atom } from "jotai";
import {
  atomFamily,
  atomWithRefresh,
  atomWithStorage,
  loadable,
  unwrap,
} from "jotai/utils";
import {
  Cart,
  Delivery,
  Location,
  Order,
  OrderStatus,
  PaymentStatus,
  ShippingAddress,
  Station,
  UserInfo,
} from "@/types";
import { requestWithFallback } from "@/utils/request";
import {
  getLocation,
  getPhoneNumber,
  getSetting,
  getUserInfo,
} from "zmp-sdk/apis";
import toast from "react-hot-toast";
import { calculateDistance } from "./utils/location";
import { formatDistant } from "./utils/format";
import CONFIG from "./config";
import {
  fetchCatalogCategories,
  fetchProductPage,
  type CatalogCategory,
} from "./utils/catalog";

export const userInfoKeyState = atom(0);

export const userInfoState = atom<Promise<UserInfo>>(async (get) => {
  get(userInfoKeyState);

  // Nếu người dùng đã chỉnh sửa thông tin tài khoản trước đó, sử dụng thông tin đã lưu trữ
  const savedUserInfo = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_INFO);
  // Phía tích hợp có thể thay đổi logic này thành fetch từ server
  // const savedUserInfo = await fetchUserInfo({ token: await getAccessToken() });
  if (savedUserInfo) {
    return JSON.parse(savedUserInfo);
  }

  const {
    authSetting: {
      "scope.userInfo": grantedUserInfo,
      "scope.userPhonenumber": grantedPhoneNumber,
    },
  } = await getSetting({});
  const isDev = !window.ZJSBridge;
  if (grantedUserInfo || isDev) {
    // Người dùng cho phép truy cập tên và ảnh đại diện
    const { userInfo } = await getUserInfo({});
    const phone =
      grantedPhoneNumber || isDev // Người dùng cho phép truy cập số điện thoại
        ? await get(phoneState)
        : "";
    return {
      id: userInfo.id,
      name: userInfo.name,
      avatar: userInfo.avatar,
      phone,
      email: "",
      address: "",
    };
  }
});

export const loadableUserInfoState = loadable(userInfoState);

// Không còn cố lấy/hiện SĐT từ tài khoản Zalo gốc — danh tính hiển thị trong
// app giờ dựa hoàn toàn vào tài khoản khách hàng VIP (customerAuthState), do
// sale tạo và cập nhật thông tin. Trước khi đăng nhập VIP, người dùng chỉ
// hiện là "Khách" (xem src/pages/profile/user-info.tsx).
export const phoneState = atom(async () => {
  try {
    await getPhoneNumber({});
  } catch (error) {
    console.warn(error);
  }
  return "";
});

export const bannersState = atom(() =>
  requestWithFallback<string[]>("/banners", [])
);

export const tabsState = atom(["Tất cả", "Nam", "Nữ", "Trẻ em"]);

export const selectedTabIndexState = atom(0);

export const categoriesState = atom(async () => {
  try {
    return await fetchCatalogCategories();
  } catch (error) {
    console.error("Không tải được danh mục sản phẩm", error);
    return [];
  }
});

export const categoriesStateUpwrapped = unwrap(
  categoriesState,
  (prev) => prev ?? []
);

export const productsState = atom(async (get) => {
  const customer = get(customerAuthState);
  try {
    const page = await fetchProductPage({ sessionToken: customer?.orderSessionToken });
    return page.products;
  } catch (error) {
    console.error("Không tải được sản phẩm", error);
    return [];
  }
});

export const flashSaleProductsState = atom((get) => get(productsState));

export const recommendedProductsState = atom((get) => get(productsState));

export const productState = atomFamily((id: string | number) =>
  atom(async (get) => {
    const products = await get(productsState);
    const cached = products.find((product) => String(product.id) === String(id));
    if (cached) return cached;
    const customer = get(customerAuthState);
    const page = await fetchProductPage({ id, sessionToken: customer?.orderSessionToken });
    return page.products[0];
  })
);

export const cartState = atomWithStorage<Cart>(CONFIG.STORAGE_KEYS.CART, []);

export const selectedCartItemIdsState = atom<number[]>([]);

export interface CustomerAuth {
  id: string;
  code: string;
  name: string;
  phone: string;
  company: string;
  email: string;
  taxCode: string;
  address: string;
  defaultShippingAddress: ShippingAddress;
  tier: string;
  discountPercent: number;
  verificationStatus: "pending" | "verified" | "rejected";
  orderSessionToken: string;
}

export type CentralOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipping"
  | "completed"
  | "canceled";

export const customerAuthState = atomWithStorage<CustomerAuth | null>(
  CONFIG.STORAGE_KEYS.CUSTOMER_AUTH,
  null
);

export interface Voucher {
  code: string;
  discount_amount: number;
  discount_percent: number;
  max_discount_value: number;
  min_order_value: number;
  projectedDiscount: number;
}

export const activeVoucherState = atom<Voucher | null>(null);

export const cartTotalState = atom((get) => {
  const items = get(cartState);
  const customer = get(customerAuthState);
  const voucher = get(activeVoucherState);
  
  const totalAmount = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  
  const discountPercent = customer?.discountPercent || 0;
  let discountedTotal = Math.round(totalAmount * (1 - discountPercent / 100));
  
  let voucherDiscount = 0;
  if (voucher && discountedTotal >= voucher.min_order_value) {
    if (voucher.discount_amount > 0) {
      voucherDiscount = voucher.discount_amount;
    } else if (voucher.discount_percent > 0) {
      voucherDiscount = Math.round(discountedTotal * (voucher.discount_percent / 100));
      if (voucher.max_discount_value > 0 && voucherDiscount > voucher.max_discount_value) {
        voucherDiscount = voucher.max_discount_value;
      }
    }
  }
  
  if (voucherDiscount > discountedTotal) {
    voucherDiscount = discountedTotal;
  }
  
  discountedTotal = Math.max(0, discountedTotal - voucherDiscount);

  return {
    totalItems: items.length,
    totalAmount,
    discountPercent,
    voucherDiscount,
    discountedTotal,
  };
});

export const keywordState = atom("");

export const searchResultState = atom(async (get) => {
  const keyword = get(keywordState).trim();
  if (!keyword) return [];
  const customer = get(customerAuthState);
  const page = await fetchProductPage({ search: keyword, sessionToken: customer?.orderSessionToken });
  return page.products;
});

export const productsByCategoryState = atomFamily((id: string) =>
  atom(async (get) => {
    const categories = await get(categoriesState);
    const category = categories.find((item) => String(item.id) === id) as CatalogCategory | undefined;
    if (!category) return [];
    const customer = get(customerAuthState);
    const page = await fetchProductPage({ category, sessionToken: customer?.orderSessionToken });
    return page.products;
  })
);

export const stationsState = atom(async () => {
  let location: Location | undefined;
  try {
    const { token } = await getLocation({});
    await new Promise((resolve) => setTimeout(resolve, 500));
    location = {
      lat: 10.773756,
      lng: 106.689247,
    };
  } catch (error) {
    console.warn(error);
  }

  const stations = await requestWithFallback<Station[]>("/stations", []);
  const stationsWithDistance = stations.map((station) => ({
    ...station,
    distance: location
      ? formatDistant(
          calculateDistance(
            location.lat,
            location.lng,
            station.location.lat,
            station.location.lng
          )
        )
      : undefined,
  }));

  return stationsWithDistance;
});

export const selectedStationIndexState = atom(0);

export const selectedStationState = atom(async (get) => {
  const index = get(selectedStationIndexState);
  const stations = await get(stationsState);
  return stations[index];
});

export const shippingAddressState = atomWithStorage<
  ShippingAddress | undefined
>(CONFIG.STORAGE_KEYS.SHIPPING_ADDRESS, undefined);

export const localOrdersState = atomWithStorage<Order[]>(
  CONFIG.STORAGE_KEYS.LOCAL_ORDERS,
  []
);

export const ordersState = atomFamily((status: OrderStatus) =>
  atomWithRefresh(async (get) => {
    try {
      const customer = get(customerAuthState);
      if (!customer?.orderSessionToken) return [];

      const orderResponse = await fetch(`${CONFIG.API_BASE}/api/customer/orders?sessionToken=${encodeURIComponent(customer.orderSessionToken)}`);
      const orderPayload = await orderResponse.json().catch(() => ({ orders: [] }));
      if (!orderResponse.ok) console.error("Lỗi lấy đơn hàng trung tâm:", orderPayload.error);
      const centralRows = orderPayload.orders || [];

      const centralOrders: Order[] = (centralRows || []).map((row: any) => {
        const centralStatus = String(row.status || "pending");
        const mappedStatus: OrderStatus =
          centralStatus === "shipping"
            ? "shipping"
            : centralStatus === "completed" || centralStatus === "canceled"
              ? "completed"
              : centralStatus === "pending"
                ? "draft"
                : "pending";
        const mappedPaymentStatus: PaymentStatus =
          row.payment_status === "paid"
            ? "success"
            : centralStatus === "shipping"
              ? "shipping"
              : row.payment_status === "failed"
                ? "failed"
                : "pending";

        return {
          id: row.order_code || row.id,
          centralOrderId: row.id,
          status: mappedStatus,
          paymentStatus: mappedPaymentStatus,
          createdAt: new Date(row.created_at),
          receivedAt: new Date(row.updated_at || row.created_at),
          items: Array.isArray(row.items) ? row.items.map((item: any) => {
            return {
              product: {
                id: item.productId || item.id || 0,
                sku: item.sku || "",
                name: item.name || "Sản phẩm",
                unit: item.unit || "Kg",
                price: Number(item.price || 0),
                image: "",
                category: { id: 0, name: "", image: "" },
                detail: item.itemNote || "",
              },
              quantity: Number(item.quantity || 1),
            };
          }) : [],
          delivery: row.delivery_type === "pickup"
            ? {
                type: "pickup",
                stationId: 0,
                name: row.delivery_alias || "Điểm nhận hàng",
                address: row.delivery_address || "",
              }
            : {
                type: "shipping",
                alias: row.delivery_alias || "Địa chỉ giao hàng",
                address: row.delivery_address || "",
                name: row.delivery_name || customer.name,
                phone: row.delivery_phone || customer.phone,
              },
          total: Number(row.grand_total || 0),
          note: row.note || "",
          centralStatus: centralStatus as CentralOrderStatus,
          subtotal: Number(row.subtotal || 0),
          discountAmount: Number(row.discount_amount || 0),
          pricingStatus: row.pricing_status || "provisional",
          pricingMode: row.pricing_mode || "tier",
          confirmationDocumentId: row.confirmation_document_id || undefined,
          invoiceDocumentId: row.invoice_document_id || undefined,
          deliveryDate: row.delivery_date || undefined,
          isLateOrder: Boolean(row.is_late_order),
          changeRequest: row.change_request || undefined,
          cancelReason: row.cancel_reason || undefined,
        };
      });

      const localOrders = get(localOrdersState);
      const activeLocalOrders = localOrders.filter(lo => {
        const loTime = new Date(lo.createdAt).getTime();
        const minutesDiff = (new Date().getTime() - loTime) / (1000 * 60);
        if (minutesDiff > 15) return false;
        const isSynced = centralOrders.some(so => {
          if (lo.id && so.id && lo.id === so.id) return true;
          const soTime = new Date(so.createdAt).getTime();
          return Math.abs(soTime - loTime) < 10 * 60 * 1000;
        });
        return !isSynced;
      });

      const allOrders = [...activeLocalOrders, ...centralOrders].map(o => ({
        ...o,
        createdAt: new Date(o.createdAt),
        receivedAt: new Date(o.receivedAt)
      })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return allOrders.filter((order) => order.status === status);
    } catch (err) {
      console.error(err);
      return [];
    }
  })
);

export const deliveryModeState = atomWithStorage<Delivery["type"]>(
  CONFIG.STORAGE_KEYS.DELIVERY,
  "shipping"
);

export interface OrderConfigData {
  serverNow: string;
  earliestDate: string;
  deliveryDate: string;
  cutoffAt: string;
  cutoffTime: string;
  minutesLeft: number;
  isLate: boolean;
}

export interface CustomerAddressItem {
  id: string;
  label: string;
  address: string;
  contact_name?: string;
  contact_phone?: string;
  is_default?: boolean;
}

export const selectedDeliveryDateState = atom<string>("");
export const selectedAddressIdState = atom<string>("");
export const orderConfigDataState = atom<OrderConfigData | null>(null);
export const customerAddressesState = atom<CustomerAddressItem[]>([]);
export const cutoffInfoState = atom<{ isLate: boolean; cutoffTime: string; minutesLeft: number } | null>(null);
