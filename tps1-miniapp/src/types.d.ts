export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  address: string;
}

export interface Product {
  id: string | number;
  sku?: string;
  name: string;
  unit?: string;
  price: number;
  priceOnRequest?: boolean;
  originalPrice?: number;
  image: string;
  category: Category;
  categoryId?: string | number;
  detail?: string;
  sizes?: Size[];
  colors?: Color[];
}

export interface Category {
  id: string | number;
  name: string;
  image: string;
  rawCategories?: string[];
  priority?: number;
  emoji?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
}

export type Cart = CartItem[];

export interface Location {
  lat: number;
  lng: number;
}

export interface ShippingAddress {
  id?: string;
  alias: string;
  address: string;
  name: string;
  phone: string;
  customerId?: string;
  isDefault?: boolean;
}

export interface Station {
  id: string | number;
  name: string;
  image: string;
  address: string;
  location: Location;
}

export type Delivery =
  | ({
      type: "shipping";
    } & ShippingAddress)
  | {
      type: "pickup";
      stationId: number;
      name?: string;
      address?: string;
    };

export type OrderStatus = "draft" | "pending" | "shipping" | "completed";
export type PaymentStatus = "pending" | "quoted" | "shipping" | "success" | "failed";

export interface OrderChangeRequestInfo {
  id: string;
  type: "adjust" | "cancel";
  status: "open" | "approved" | "rejected" | "done";
  message: string;
  requested_at?: string;
  handled_at?: string;
  handled_note?: string;
}

export interface Order {
  id: string | number;
  centralOrderId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  receivedAt: Date;
  items: CartItem[];
  delivery: Delivery;
  total: number;
  note: string;
  centralStatus?: "pending" | "confirmed" | "preparing" | "shipping" | "completed" | "canceled";
  subtotal?: number;
  discountAmount?: number;
  pricingStatus?: "provisional" | "finalized";
  pricingMode?: "tier" | "order_discount" | "manual_item_price";
  priceRevision?: number;
  confirmationDocumentId?: string;
  // Hóa đơn bán hàng — chỉ có giá trị khi đơn đã "completed" (hoàn thành giao
  // hàng), khác với confirmationDocumentId (phiếu tạm, có ngay khi chốt giá).
  invoiceDocumentId?: string;
  deliveryDate?: string;
  isLateOrder?: boolean;
  changeRequest?: OrderChangeRequestInfo | null;
  cancelReason?: string | null;
}
