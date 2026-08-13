const CONFIG = {
  API_BASE: import.meta.env.VITE_WEBSITE_API_URL || "https://thucphamsomot.vn",
  STORAGE_KEYS: {
    USER_INFO: "userInfo",
    DELIVERY: "delivery",
    SHIPPING_ADDRESS: "shippingAddress",
    LOCAL_ORDERS: "localOrders",
    CUSTOMER_AUTH: "customerAuth",
    CART: "guestCart",
  },
};

export default CONFIG;
