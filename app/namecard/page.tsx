import type { Metadata } from "next";
import NamecardClient from "./[id]/namecard-client";

interface Props {
  searchParams: Promise<{ name?: string; title?: string; titleEn?: string; phone?: string; email?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = await searchParams;
  const name = p.name ?? "E-Namecard";
  const title = p.title ?? "";
  return {
    title: `${name}${title ? ` | ${title}` : ""} | Thực Phẩm Số Một`,
    description: `E-namecard của ${name} - ${title}, Công Ty TNHH Thực Phẩm Số Một Đồng Nai.`,
    robots: { index: false, follow: false },
  };
}

export default async function DynamicNamecardPage({ searchParams }: Props) {
  const p = await searchParams;

  // Map from URL params to NamecardData interface used by NamecardClient
  const data = {
    id: "dynamic",
    name: p.name ?? "",
    title_vi: p.title ?? "",
    title_en: p.titleEn ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    photo_url: "",
    zalo: p.phone ?? "",
  };

  return <NamecardClient data={data} currentUrl="" />;
}
