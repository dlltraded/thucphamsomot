import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, ShieldCheck, MapPin } from "lucide-react";
import { findBySlug, industries } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { siteConfig } from "@/lib/site";
import { FadeInUp, StaggerContainer, StaggerItem, ScaleIn } from "@/components/ui/motion-wrapper";

export function generateStaticParams() {
  return industries.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = findBySlug(industries, slug);
  if (!item) return makeMetadata({ title: "Ngành hàng", path: `/nganh-hang/${slug}` });
  return makeMetadata({
    title: item.title,
    description: item.description,
    path: `/nganh-hang/${item.slug}`,
  });
}

export default async function IndustryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findBySlug(industries, slug);
  if (!item) return notFound();
  
  const description = item.description ?? item.title;
  const heroImage = `/images/industries/${slug}.png`;
  
  return (
    <main className="industry-detail-page bg-gray-50 pb-20">
      {/* 1. Hero Banner */}
      <section className="relative w-full h-[60vh] md:h-[70vh] flex items-end pb-16 md:pb-24">
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImage}
            alt={item.title}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent" />
        </div>
        
        <div className="container-shell relative z-10 w-full">
          <FadeInUp className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-sm font-bold tracking-wide mb-6 backdrop-blur-md">
              <ShieldCheck size={16} /> Ngành Hàng
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              {item.title}
            </h1>
            <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-8 max-w-2xl">
              {description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/bao-gia" className="btn-primary !px-8 !py-4 shadow-xl shadow-emerald-900/20">
                Nhận Báo Giá <ArrowRight size={18} />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* 2. Trust Signals */}
      <section className="relative z-20 -mt-8 mb-16 container-shell">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 border border-gray-100">
          <div className="flex-1">
            <span className="text-3xl font-black text-emerald-600 block mb-1">99.8%</span>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tỷ lệ đúng hẹn (SLA)</span>
          </div>
          <div className="hidden md:block w-px h-12 bg-gray-200" />
          <div className="flex-1">
            <span className="text-3xl font-black text-emerald-600 block mb-1">5.000+</span>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Suất ăn phục vụ mỗi ngày</span>
          </div>
          <div className="hidden md:block w-px h-12 bg-gray-200" />
          <div className="flex-1 flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <span className="font-bold text-gray-900 block">Khu vực phục vụ</span>
              <span className="text-sm text-gray-500">Đồng Nai & lân cận</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3 & 4. Content Sections (Bento / Cards) */}
      <section className="container-shell mb-20">
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {item.sections?.map((section, idx) => {
            // Make the first section take full width for impact
            const isFullWidth = idx === 0 && item.sections!.length > 1;
            return (
              <StaggerItem 
                key={idx} 
                className={`bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow ${
                  isFullWidth ? 'md:col-span-2' : ''
                }`}
              >
                <div className="flex gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black shrink-0">
                    0{idx + 1}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 self-center">{section.heading}</h2>
                </div>
                <div className={`text-gray-600 leading-relaxed ${isFullWidth ? 'md:text-lg max-w-4xl mb-8' : 'mb-6'}`}>
                  {section.body}
                </div>
                {section.items && section.items.length > 0 && (
                  <ul className={`grid gap-4 ${isFullWidth ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                    {section.items.map((listItem, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-500 mt-1 shrink-0" size={20} />
                        <span className="text-gray-700">{listItem}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* 5. FAQs */}
      {item.faqs && item.faqs.length > 0 && (
        <section className="container-shell mb-20">
          <FadeInUp className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Câu hỏi thường gặp</h2>
              <p className="text-gray-500">Những thắc mắc phổ biến khi hợp tác cung ứng thực phẩm B2B.</p>
            </div>
            <div className="space-y-4">
              {item.faqs.map((faq, i) => (
                <details key={i} className="group bg-white rounded-2xl border border-gray-200 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-1.5 p-6 text-gray-900">
                    <h3 className="font-bold text-lg">{faq.question}</h3>
                    <span className="relative size-5 shrink-0">
                      <ChevronDown className="absolute inset-0 size-5 transition-transform group-open:-rotate-180" />
                    </span>
                  </summary>
                  <p className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-4 mt-2">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </FadeInUp>
        </section>
      )}

      {/* CTA Box */}
      <section className="container-shell">
        <ScaleIn className="bg-emerald-900 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Bạn đang cần báo giá cho {item.title.toLowerCase()}?
            </h2>
            <p className="text-emerald-100 text-lg mb-8">
              Gửi danh mục thực tế của bạn, đội ngũ TPS1 sẽ gửi lại bảng giá chi tiết kèm tư vấn định lượng để tối ưu chi phí nhất.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/bao-gia" className="btn-primary !px-8 !py-4 shadow-lg shadow-emerald-950/50">
                Gửi yêu cầu ngay
              </Link>
              <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`} className="btn-secondary !bg-white/10 !border-white/20 !text-white hover:!bg-white/20 !px-8 !py-4">
                Gọi {siteConfig.phone}
              </a>
            </div>
          </div>
        </ScaleIn>
      </section>

    </main>
  );
}
