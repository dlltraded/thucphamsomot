import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { AccountCard } from "./account-card";
import { loadCustomerSessionByToken } from "@/lib/customer-session-server";

export const metadata = makeMetadata({
  title: "Cổng đối tác VIP",
  description:
    "Đăng nhập tài khoản khách hàng VIP để xem giá chiết khấu, đặt hàng và quản lý đơn hàng đã đặt.",
  path: "/portal",
});

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const cookieStore = await cookies();
  const cookieSession = parseSessionCookieValue(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
  const session = cookieSession?.orderSessionToken
    ? await loadCustomerSessionByToken(cookieSession.orderSessionToken)
    : cookieSession;

  if (!session) {
    redirect("/portal/dang-nhap");
  }
  if (session.mustChangePassword) {
    redirect("/portal/doi-mat-khau");
  }

  return (
    <PageShell eyebrow="Portal báo giá" title="Tài khoản của tôi" compact>
      <AccountCard session={session} />
    </PageShell>
  );
}
