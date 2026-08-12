import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = makeMetadata({
  title: "Đổi mật khẩu",
  description: "Đổi mật khẩu tài khoản khách hàng VIP TPS1.",
  path: "/portal/doi-mat-khau",
});

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const cookieStore = await cookies();
  const session = parseSessionCookieValue(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!session) {
    redirect("/portal/dang-nhap");
  }

  return (
    <PageShell eyebrow="Portal báo giá" title="Đổi mật khẩu" compact>
      <ChangePasswordForm
        code={session.code}
        forced={session.mustChangePassword}
      />
    </PageShell>
  );
}
