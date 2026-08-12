import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { LoginForm } from "./login-form";

export const metadata = makeMetadata({
  title: "Đăng nhập tài khoản khách hàng",
  description: "Đăng nhập bằng Mã khách hàng và Mật khẩu do sale TPS1 cung cấp.",
  path: "/portal/dang-nhap",
});

export const dynamic = "force-dynamic";

export default async function PortalLoginPage() {
  const cookieStore = await cookies();
  const session = parseSessionCookieValue(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (session) {
    redirect(session.mustChangePassword ? "/portal/doi-mat-khau" : "/portal");
  }

  return (
    <PageShell eyebrow="Portal báo giá" title="Đăng nhập tài khoản khách hàng" compact>
      <LoginForm />
    </PageShell>
  );
}
