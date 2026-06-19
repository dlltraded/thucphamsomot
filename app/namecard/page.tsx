import type { Metadata } from "next";

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

  // Map from URL params to PersonData interface used by NamecardClient
  const data = {
    name: p.name ?? "",
    title_vi: p.title ?? "",
    title_en: p.titleEn ?? null,
    phone: p.phone ?? null,
    email: p.email ?? null,
    avatar_url: null,
    bio_vi: null,
    bio_en: null,
    zalo_link: p.phone ? `https://zalo.me/${p.phone.replace(/\s/g, "")}` : null,
    facebook_link: null,
    linkedin_link: null,
    is_active: true,
  };

  const { NamecardClient } = await import("./[id]/namecard-client");
  return <NamecardClient data={data} />;
}
