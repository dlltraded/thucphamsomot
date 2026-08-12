import { redirect } from "next/navigation";

// Cổng khách hàng VIP hiện chỉ có bản tiếng Việt.
export default function EnglishPortalPage() {
  redirect("/portal");
}
