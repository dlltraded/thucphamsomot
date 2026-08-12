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
  Category,
  Delivery,
  Location,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
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
import { supabase } from "./utils/supabase";

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

import categoryPlaceholder from "@/static/category-placeholder.png";
import catFruits from "@/static/cat_fruits.png";
import catBakeryMilk from "@/static/cat_bakery_milk.png";
import catSpices from "@/static/cat_spices.png";
import catDriedGoods from "@/static/cat_dried_goods.png";
import catFrozen from "@/static/cat_frozen.png";
import catSeafood from "@/static/cat_seafood.png";
import catVegetables from "@/static/cat_vegetables.png";
import catTools from "@/static/cat_tools.png";

const mapToSuperCategory = (rawName: string) => {
  const upper = rawName?.toUpperCase() || "";
  if (upper.includes("RAU CỦ QUẢ") || upper.includes("RAU CỦ") || upper.includes("RAU")) return { id: "veg", name: "Rau củ quả", image: catVegetables, priority: 1 };
  if (upper.includes("TRÁI CÂY")) return { id: "fruits", name: "Trái cây", image: catFruits, priority: 2 };
  if (upper.includes("HẢI SẢN")) return { id: "seafood", name: "Hải sản", image: catSeafood, priority: 3 };
  if (upper.includes("BÁNH SỮA") || upper.includes("TRỨNG")) return { id: "bakery", name: "Bánh, Trứng & Sữa", image: catBakeryMilk, priority: 5 };
  if (upper.includes("GIA VỊ")) return { id: "spices", name: "Gia vị", image: catSpices, priority: 6 };
  if (upper.includes("ĐỒ KHÔ") || upper.includes("GẠO") || upper.includes("BÚN")) return { id: "dried", name: "Đồ khô & Gạo", image: catDriedGoods, priority: 7 };
  if (upper.includes("CHAY") || upper.includes("ĐK")) return { id: "vegan", name: "Mặt hàng chay", image: catVegetables, priority: 8 }; 
  if (upper.includes("CÔNG CỤ") || upper.includes("NONFOOD")) return { id: "tools", name: "Công cụ & Vật tư", image: catTools, priority: 9 };
  // Default for meat and frozen
  if (upper.includes("THỊT") || upper.includes("ĐÔNG LẠNH") || upper.includes("GÀ") || upper.includes("CP")) {
    return { id: "meat", name: "Thịt & Đông lạnh", image: catFrozen, priority: 4 };
  }
  return { id: "other", name: "Khác", image: categoryPlaceholder, priority: 10 };
};

export const categoriesState = atom(async () => {
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .eq('active', true);

  if (error || !data) return [];

  const rawCats = new Set(data.map(p => p.category));
  const superCatsMap = new Map<string, Category & { priority: number }>();
  
  rawCats.forEach(rawName => {
    const superCat = mapToSuperCategory(rawName);
    if (!superCatsMap.has(superCat.id)) {
      superCatsMap.set(superCat.id, superCat);
    }
  });

  return Array.from(superCatsMap.values())
    .sort((a, b) => a.priority - b.priority)
    .map(c => ({ id: c.id, name: c.name, image: c.image })) as Category[];
});

export const categoriesStateUpwrapped = unwrap(
  categoriesState,
  (prev) => prev ?? []
);

export const productsState = atom(async (get) => {
  const categories = await get(categoriesState);
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true);
    
  if (error) {
    console.error(error);
    return [];
  }

  return data.map((product) => {
    const superCatInfo = mapToSuperCategory(product.category || "");
    const categoryObj = categories.find(c => c.id === superCatInfo.id);
    const priceR = Number(product.price_retail) || 0;

    return {
      id: product.id,
      name: product.name,
      price: priceR,
      originalPrice: priceR,
      image: product.image_url || categoryObj?.image || categoryPlaceholder,
      category: categoryObj!,
      categoryId: categoryObj?.id || 'other',
      detail: product.notes || '',
    };
  }).sort((a, b) => {
    const pA = mapToSuperCategory(a.category?.name || "").priority;
    const pB = mapToSuperCategory(b.category?.name || "").priority;
    if (pA !== pB) return pA - pB;
    return a.name.localeCompare(b.name);
  });
});

export const flashSaleProductsState = atom((get) => get(productsState));

export const recommendedProductsState = atom((get) => get(productsState));

export const productState = atomFamily((id: string | number) =>
  atom(async (get) => {
    const products = await get(productsState);
    return products.find((product) => String(product.id) === String(id));
  })
);

export const cartState = atom<Cart>([]);

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

export const cartTotalState = atom((get) => {
  const items = get(cartState);
  const customer = get(customerAuthState);
  const totalAmount = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  const discountPercent = customer?.discountPercent || 0;
  const discountedTotal = Math.round(totalAmount * (1 - discountPercent / 100));
  return {
    totalItems: items.length,
    totalAmount,
    discountPercent,
    discountedTotal,
  };
});

export const keywordState = atom("");

export const searchResultState = atom(async (get) => {
  const keyword = get(keywordState);
  const products = await get(productsState);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return products.filter((product) =>
    product.name.toLowerCase().includes(keyword.toLowerCase())
  );
});

export const productsByCategoryState = atomFamily((id: string) =>
  atom(async (get) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const products = await get(productsState);
    return products.filter((product) => String(product.categoryId) === id);
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

      const { data: centralRows, error } = await supabase.rpc(
        'customer_list_orders',
        { p_session_token: customer.orderSessionToken }
      );

      if (error) {
        console.error("Lỗi lấy đơn hàng trung tâm:", error);
      }

      const allProducts = await get(productsState);
      const centralOrders: Order[] = (centralRows || []).map((row: any) => {
        const centralStatus = String(row.status || "pending");
        const mappedStatus: OrderStatus =
          centralStatus === "shipping"
            ? "shipping"
            : centralStatus === "completed" || centralStatus === "canceled"
              ? "completed"
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
          status: mappedStatus,
          paymentStatus: mappedPaymentStatus,
          createdAt: new Date(row.created_at),
          receivedAt: new Date(row.updated_at || row.created_at),
          items: Array.isArray(row.items) ? row.items.map((item: any) => {
            const matchedProduct = allProducts.find(
              product =>
                String(product.id) === String(item.productId) ||
                product.name.toLowerCase() === String(item.name || "").toLowerCase()
            );
            return {
              product: {
                id: item.productId || matchedProduct?.id || item.id || 0,
                name: item.name || matchedProduct?.name || "Sản phẩm",
                price: Number(item.price || matchedProduct?.price || 0),
                image: matchedProduct?.image || "",
                category: matchedProduct?.category || { id: 0, name: "", image: "" },
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
