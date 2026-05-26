export type Locale = "vi" | "en";

export const siteConfig = {
  name: "Thực Phẩm Số Một",
  englishName: "Thuc Pham So Mot",
  shortName: "TPS1",
  domain: "thucphamsomot.vn",
  url: "https://thucphamsomot.vn",
  description:
    "Nhà cung cấp thực phẩm cho bếp ăn tập thể, suất ăn công nghiệp, trường học, bệnh viện, nhà hàng tại Đồng Nai và khu vực lân cận.",
  englishDescription:
    "A B2B food supplier for canteens, industrial catering, schools, hospitals, restaurants, and hospitality operators in Dong Nai and nearby areas.",
  phone: "089 890 2222",
  email: "contact@thucphamsomot.vn",
  zalo: "0898902222",
  facebook: "https://www.facebook.com/thucphamsomot.vn",
  address: "Đồng Nai, Việt Nam",
  englishAddress: "Dong Nai, Vietnam",
  shareImage: "https://thucphamsomot.vercel.app/images/tps1-cover-food.jpg",
  profilePagePath: "/ho-so-nang-luc",
  profilePdfUrl: "https://drive.google.com/file/d/1uJ7gCVsCRsXMAZAZLKMcFbgv5um6--8L/view?usp=sharing",
  profilePreviewUrl: "https://drive.google.com/file/d/1uJ7gCVsCRsXMAZAZLKMcFbgv5um6--8L/preview",
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3917.0578086349!2d106.87441187476843!3d10.959005955799993!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3174dff7e03cba73%3A0x6c4cc550089d1307!2zQ8O0bmcgdHkgVE5ISCBUaOG7sWMgUGjhuqltIFPhu5EgTeG7mXQ!5e0!3m2!1svi!2s!4v1779156720834!5m2!1svi!2s",
  mapPlaceUrl:
    "https://www.google.com/maps/search/?api=1&query=C%C3%B4ng%20ty%20TNHH%20Th%E1%BB%B1c%20Ph%E1%BA%A9m%20S%E1%BB%91%20M%E1%BB%99t%2C%20%C4%90%E1%BB%93ng%20Nai",
  localities: ["Biên Hòa", "Đồng Nai", "Long Thành", "Trảng Bom", "Nhơn Trạch", "Dĩ An", "Thủ Đức"],
};

export const navItemsByLocale: Record<Locale, Array<{ label: string; href: string }>> = {
  vi: [
    { label: "Giới Thiệu", href: "/gioi-thieu" },
    { label: "Sản Phẩm", href: "/san-pham" },
    { label: "Nguyên Liệu", href: "/nganh-hang/bep-an-tap-the" },
    { label: "Công Thức", href: "/kien-thuc" },
    { label: "Tin Tức", href: "/tin-tuc" },
    { label: "Liên Hệ", href: "/lien-he" },
    { label: "Gửi Yêu Cầu", href: "/bao-gia" },
  ],
  en: [
    { label: "About", href: "/en/about" },
    { label: "Products", href: "/en/products" },
    { label: "Ingredients", href: "/en/ingredients" },
    { label: "Recipes", href: "/en/recipes" },
    { label: "News", href: "/en/news" },
    { label: "Contact", href: "/en/contact" },
    { label: "Send Request", href: "/en/bao-gia" },
  ],
};

export const navItems = navItemsByLocale.vi;
