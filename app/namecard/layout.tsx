import type { Metadata } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/900.css";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://thucphamsomot.vn"),
};

// Layout riêng cho namecard — không có SiteHeader, SiteFooter, hay widget nào.
export default function NamecardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
