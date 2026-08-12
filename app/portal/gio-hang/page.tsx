import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { CartReview } from "./cart-review";

export const metadata = makeMetadata({
  title: "Giỏ hàng của tôi",
  description: "Giỏ hàng có giá chiết khấu theo tài khoản khách hàng VIP TPS1.",
  path: "/portal/gio-hang",
});

export const dynamic = "force-dynamic";

export default async function CustomerCartPage() {
  const cookieStore = await cookies();
  const session = parseSessionCookieValue(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!session) {
    redirect("/portal/dang-nhap");
  }
  if (session.mustChangePassword) {
    redirect("/portal/doi-mat-khau");
  }

  return (
    <PageShell eyebrow="Portal báo giá" title="Giỏ hàng của tôi" compact>
      <CartReview
        discountPercent={session.discountPercent}
        tier={session.tier}
        defaultShippingAddress={session.defaultShippingAddress}
      />
    </PageShell>
  );
}
