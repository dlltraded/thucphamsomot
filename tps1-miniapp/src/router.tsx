import Layout from "@/components/layout";
import { createBrowserRouter } from "react-router-dom";
import { getBasePath } from "@/utils/zma";
import { redirect } from "react-router-dom";
import CONFIG from "@/config";

const lazyPage = (load: () => Promise<{ default: React.ComponentType }>) => async () => {
  const module = await load();
  return { Component: module.default };
};

const router = createBrowserRouter(
  [
    {
      path: "/welcome",
      lazy: lazyPage(() => import("@/pages/welcome")),
    },
    {
      path: "/",
      element: <Layout />,
      children: [
        {
          path: "/",
          lazy: lazyPage(() => import("@/pages/home")),
          loader: () => {
            const seen = localStorage.getItem(CONFIG.STORAGE_KEYS.WELCOME_SEEN);
            if (!seen) {
              return redirect("/welcome");
            }
            return null;
          },
          handle: {
            logo: true,
            search: true,
          },
        },
        {
          path: "/categories",
          lazy: lazyPage(() => import("@/pages/catalog/category-list")),
          handle: {
            title: "Danh mục",
            noBack: true,
          },
        },
        {
          path: "/orders/:status?",
          lazy: lazyPage(() => import("@/pages/orders")),
          handle: {
            title: "Đơn hàng",
          },
        },
        {
          path: "/order/:id",
          lazy: lazyPage(() => import("@/pages/orders/detail")),
          handle: {
            title: "Thông tin đơn hàng",
          },
        },
        {
          path: "/cart",
          lazy: lazyPage(() => import("@/pages/cart")),
          handle: {
            title: "Giỏ hàng",
            noBack: true,
            noFloatingCart: true,
          },
        },
        {
          path: "/shipping-address",
          lazy: lazyPage(() => import("@/pages/cart/shipping-address")),
          handle: {
            title: "Địa chỉ nhận hàng",
            noFooter: true,
            noFloatingCart: true,
          },
        },
        {
          path: "/stations",
          lazy: lazyPage(() => import("@/pages/cart/stations")),
          handle: {
            title: "Điểm nhận hàng",
            noFooter: true,
          },
        },
        {
          path: "/profile",
          lazy: lazyPage(() => import("@/pages/profile")),
          handle: {
            logo: true,
          },
        },
        {
          path: "/profile/edit",
          lazy: lazyPage(() => import("@/pages/profile/editor")),
          handle: {
            title: "Thông tin tài khoản",
            noFooter: true,
            noFloatingCart: true,
          },
        },
        {
          path: "/category/:id",
          lazy: lazyPage(() => import("@/pages/catalog/category-detail")),
          handle: {
            search: true,
            title: ({ categories, params }) =>
              categories.find((c) => String(c.id) === params.id)?.name,
          },
        },
        {
          path: "/product/:id",
          lazy: lazyPage(() => import("@/pages/catalog/product-detail")),
          handle: {
            scrollRestoration: 0, // when user selects another product in related products, scroll to the top of the page
            noFloatingCart: true,
          },
        },
        {
          path: "/search",
          lazy: lazyPage(() => import("@/pages/search")),
          handle: {
            search: true,
            title: "Tìm kiếm",
            noFooter: true,
          },
        },
        {
          path: "/shop-info",
          lazy: lazyPage(() => import("@/pages/shop-info")),
          handle: {
            title: "Thông tin cửa hàng",
            noFooter: true,
            noFloatingCart: true,
          },
        },
        {
          path: "/checkout-success",
          lazy: lazyPage(() => import("@/pages/checkout-success")),
          handle: {
            title: "Đặt hàng thành công",
            noFooter: true,
            noFloatingCart: true,
            noBack: true,
          },
        },
        {
          path: "/register",
          lazy: lazyPage(() => import("@/pages/register")),
          handle: {
            title: "Đăng ký tài khoản",
            noFooter: true,
            noFloatingCart: true,
          },
        },
        {
          path: "/login",
          lazy: lazyPage(() => import("@/pages/login")),
          handle: {
            title: "Đăng nhập khách hàng",
            noFooter: true,
            noFloatingCart: true,
          },
        },
        {
          path: "/change-password",
          lazy: lazyPage(() => import("@/pages/change-password")),
          handle: {
            title: "Đặt mật khẩu mới",
            noFooter: true,
            noFloatingCart: true,
          },
        },
      ],
    },
  ],
  { basename: getBasePath() }
);

export default router;
