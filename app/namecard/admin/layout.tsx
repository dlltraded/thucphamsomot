import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Tạo E-Namecard | Thực Phẩm Số Một",
  description: "Trang tạo e-namecard nội bộ cho nhân viên Thực Phẩm Số Một",
  robots: { index: false, follow: false },
};

export default function NamecardAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
