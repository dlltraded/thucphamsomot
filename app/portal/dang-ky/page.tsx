import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { RegisterForm } from "./register-form";

export const metadata = makeMetadata({
  title: "Đăng ký tài khoản khách hàng",
  description: "Tạo tài khoản khách hàng VIP TPS1 để xem giá chiết khấu và đặt hàng trực tuyến.",
  path: "/portal/dang-ky",
});

export const dynamic = "force-dynamic";

export default async function PortalRegisterPage() {
  const cookieStore = await cookies();
  const session = parseSessionCookieValue(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (session) {
    redirect(session.mustChangePassword ? "/portal/doi-mat-khau" : "/portal");
  }

  return (
    <PageShell eyebrow="Portal đối tác VIP" title="Đăng ký tài khoản" compact>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </PageShell>
  );
}
