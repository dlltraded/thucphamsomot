import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nguyễn Tiến Bách | E-Namecard | Thực Phẩm Số Một Đồng Nai",
  description:
    "E-namecard của Nguyễn Tiến Bách - Giám Đốc Điều Hành, Công Ty TNHH Thực Phẩm Số Một Đồng Nai. Lưu liên hệ, gọi điện, nhắn Zalo ngay.",
  openGraph: {
    title: "Nguyễn Tiến Bách | Giám Đốc Điều Hành | Thực Phẩm Số Một",
    description:
      "E-namecard của Nguyễn Tiến Bách - Giám Đốc Điều Hành, Công Ty TNHH Thực Phẩm Số Một Đồng Nai.",
    url: "https://thucphamsomot.vn/namecard/bach-nguyen",
    siteName: "Thực Phẩm Số Một",
    images: [
      {
        url: "/images/tps1-share-thumbnail.png",
        width: 1200,
        height: 630,
        alt: "E-Namecard Nguyễn Tiến Bách - Thực Phẩm Số Một",
      },
    ],
    locale: "vi_VN",
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nguyễn Tiến Bách | E-Namecard | Thực Phẩm Số Một",
    description: "Giám Đốc Điều Hành | CÔNG TY TNHH THỰC PHẨM SỐ MỘT ĐỒNG NAI",
    images: ["/images/tps1-share-thumbnail.png"],
  },
  icons: {
    icon: "/images/tps1-logo-transparent.png",
    apple: "/images/tps1-logo-transparent.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function NamecardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
