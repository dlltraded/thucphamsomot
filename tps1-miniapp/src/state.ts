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

export const phoneState = atom(async () => {
  let phone = "";
  try {
    const { token } = await getPhoneNumber({});
    await new Promise((resolve) => setTimeout(resolve, 500));
    phone = "0912345678";
  } catch (error) {
    console.warn(error);
  }
  return phone;
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
  if (upper.includes("HẢI SẢN")) return { id: "seafood", name: "Hải sản", image: catSeafood, priority: 2 };
  if (upper.includes("TRÁI CÂY")) return { id: "fruits", name: "Trái cây", image: catFruits, priority: 4 };
  if (upper.includes("RAU CỦ QUẢ") || upper.includes("RAU CỦ") || upper.includes("RAU")) return { id: "veg", name: "Rau củ quả", image: catVegetables, priority: 3 };
  if (upper.includes("BÁNH SỮA") || upper.includes("TRỨNG")) return { id: "bakery", name: "Bánh, Trứng & Sữa", image: catBakeryMilk, priority: 5 };
  if (upper.includes("GIA VỊ")) return { id: "spices", name: "Gia vị", image: catSpices, priority: 6 };
  if (upper.includes("ĐỒ KHÔ") || upper.includes("GẠO") || upper.includes("BÚN")) return { id: "dried", name: "Đồ khô & Gạo", image: catDriedGoods, priority: 7 };
  if (upper.includes("CHAY") || upper.includes("ĐK")) return { id: "vegan", name: "Mặt hàng chay", image: catVegetables, priority: 8 }; 
  if (upper.includes("CÔNG CỤ") || upper.includes("NONFOOD")) return { id: "tools", name: "Công cụ & Vật tư", image: catTools, priority: 9 };
  // Default for meat and frozen
  if (upper.includes("THỊT") || upper.includes("ĐÔNG LẠNH") || upper.includes("GÀ") || upper.includes("CP")) {
    return { id: "meat", name: "Thịt & Đông lạnh", image: catFrozen, priority: 1 };
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
    const priceW = Number(product.price_wholesale) || 0;
    const priceR = Number(product.price_retail) || 0;
    const currentPrice = priceW > 0 ? priceW : priceR;
    const oldPrice = priceR > 0 ? priceR : currentPrice;

    return {
      id: product.id,
      name: product.name,
      price: currentPrice,
      originalPrice: oldPrice,
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

export const cartTotalState = atom((get) => {
  const items = get(cartState);
  return {
    totalItems: items.length,
    totalAmount: items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    ),
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

export const productsByCategoryState = atomFamily((id: String) =>
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
      const user = await get(userInfoState);
      if (!user || !user.phone) return [];

      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('lead_phone', user.phone)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Lỗi lấy đơn hàng Supabase:", error);
      }

      const supabaseOrders: Order[] = (quotes || []).map((q: any) => {
        let mappedStatus: OrderStatus = "pending"; // new, contacting, quoting, etc.
        const qStatus = String(q.status || "").toLowerCase();
        
        // Admin system uses: new, contacting, quoting, quoted, won, lost, canceled
        if (qStatus === "quoted" || qStatus === "shipping" || qStatus.includes("giao")) {
          mappedStatus = "shipping"; // Đã báo giá -> Xem như đang xử lý/giao hàng
        } else if (qStatus === "won" || qStatus === "completed" || qStatus.includes("hoàn thành") || qStatus.includes("chốt")) {
          mappedStatus = "completed"; // Đã chốt đơn -> Hoàn thành
        }

        return {
          id: q.id,
          status: mappedStatus,
          paymentStatus: "pending",
          createdAt: new Date(q.created_at),
          receivedAt: new Date(q.created_at),
          items: Array.isArray(q.items) ? q.items.map((i: any) => ({
            product: { id: i.id || 0, name: i.name || "Sản phẩm", price: i.price || 0, image: i.image || "", category: {id: 0, name: "", image: ""} },
            quantity: i.quantity || 1
          })) : [],
          delivery: { type: "shipping", address: "", name: user.name, phone: user.phone, alias: "" },
          total: Number(q.grand_total || q.subtotal || 0),
          note: q.note || ""
        };
      });

      const localOrders = get(localOrdersState);
      const activeLocalOrders = localOrders.filter(lo => {
        const hoursDiff = (new Date().getTime() - new Date(lo.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursDiff > 24) return false;
        
        const isSynced = supabaseOrders.some(so => 
          so.total === lo.total && 
          Math.abs(so.createdAt.getTime() - new Date(lo.createdAt).getTime()) < 60 * 60 * 1000
        );
        return !isSynced;
      });

      const allOrders = [...activeLocalOrders, ...supabaseOrders].map(o => ({
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
