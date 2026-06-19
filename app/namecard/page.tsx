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

  // Render on server, pass to client via data attributes
  const data = {
    name: p.name ?? "",
    titleVi: p.title ?? "",
    titleEn: p.titleEn ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
  };

  // Redirect to client component
  const { DynamicNamecard } = await import("./dynamic-namecard");
  return <DynamicNamecard data={data} />;
}
