import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, MapPin, ShieldCheck, Truck } from "lucide-react";
import { categories } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";
import { brandAssets, customerHighlights } from "@/lib/brand";
import { HeroSlider } from "@/components/ui/hero-slider";
import { FadeInUp, StaggerContainer, StaggerItem, ScaleIn } from "@/components/ui/motion-wrapper";

export const metadata = makeMetadata({
  title: "Thực Phẩm Số Một | Cung cấp thực phẩm B2B tại Đồng Nai",
  description:
    "TPS1 cung cấp thực phẩm cho bếp ăn tập thể, nhà máy, trường học, bệnh viện. Danh mục rõ ràng, giao định kỳ, báo giá theo nhu cầu thực tế.",
  path: "/",
});

const servicePillars = [
  {
    icon: ShieldCheck,
    title: "Nguồn hàng rõ ràng",
    text: "Danh mục theo nhóm hàng bếp dùng hằng ngày, dễ so sánh và dễ ra quyết định.",
  },
  {
    icon: Truck,
    title: "Giao đúng lịch",
    text: "Linh hoạt theo ca, theo ngày hoặc theo tuần, phù hợp vận hành bếp công nghiệp.",
  },
  {
    icon: ClipboardList,
    title: "Báo giá theo nhu cầu",
    text: "Mỗi khách có nhu cầu riêng, đội ngũ TPS1 phản hồi phương án phù hợp để chốt đơn nhanh.",
  },
  {
    icon: Building2,
    title: "Kinh nghiệm B2B",
    text: "Phục vụ thực tế cho nhà máy, bếp ăn, bệnh viện và trường học tại Đồng Nai.",
  },
];

const processSteps = [
  {
    title: "1. Chọn nhóm sản phẩm",
    text: "Chọn nhanh theo danh mục: rau củ, thịt cá, đông lạnh, gia vị, thực phẩm chay.",
  },
  {
    title: "2. Gửi yêu cầu",
    text: "Nhập số lượng, khu vực giao, thời gian cần hàng và ghi chú quy cách.",
  },
  {
    title: "3. Nhận phương án",
    text: "Đội kinh doanh phản hồi báo giá và lịch giao phù hợp để khách chốt đơn.",
  },
];

const heroStats = [
  { value: "109+", label: "Khách hàng B2B" },
  { value: "24h", label: "Phản hồi báo giá" },
  { value: "100%", label: "Giao đúng hẹn" },
];

const partnerLogoPanels = [{ src: "/images/partners/tps1-partner-logos-all.png", alt: "Logo đối tác và khách hàng tiêu biểu TPS1" }];

export default function HomePage() {
  return (
    <main className="home-page overflow-x-hidden">
      {/* HERO SECTION - DYNAMIC & IMMERSIVE */}
      <section className="relative w-full min-h-[85vh] flex items-center">
        <HeroSlider />
        <div className="container-shell hero-content-wrapper">
          <FadeInUp className="max-w-3xl glassmorphism-dark p-8 md:p-12 rounded-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-emerald-300 text-sm font-bold tracking-wide uppercase mb-6">
              <ShieldCheck size={16} /> Cung cấp thực phẩm B2B
            </div>
            <h1 className="hero-dynamic-title">
              Giải pháp thực phẩm toàn diện cho <span className="text-emerald-400">bếp ăn công nghiệp.</span>
            </h1>
            <p className="hero-dynamic-lead">
              Đảm bảo nguồn nguyên liệu tươi sạch, đa dạng, giao hàng đúng hẹn và báo giá linh hoạt phù hợp ngân sách vận hành của doanh nghiệp bạn.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link href="/bao-gia" className="btn-primary">
                Yêu cầu báo giá <ArrowRight size={18} />
              </Link>
              <Link href="/san-pham" className="btn-secondary !bg-white/10 !border-white/20 !text-white hover:!bg-white/20">
                Xem danh mục <ArrowRight size={18} />
              </Link>
            </div>
            <div className="flex gap-8 mt-10 border-t border-white/10 pt-6">
              {heroStats.map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-3xl font-black text-white">{stat.value}</span>
                  <span className="text-sm text-emerald-200">{stat.label}</span>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* SERVICE PILLARS - STAGGERED FADE IN */}
      <section className="home-trust section-pad bg-white">
        <StaggerContainer className="container-shell grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {servicePillars.map((item, i) => {
            const Icon = item.icon;
            return (
              <StaggerItem key={item.title} className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl hover:border-emerald-100 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mb-6 group-hover:scale-110 transition-transform">
                  <Icon size={28} />
                </div>
                <h2 className="text-xl font-bold mb-3">{item.title}</h2>
                <p className="text-gray-600 leading-relaxed">{item.text}</p>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* CATALOG - BENTO GRID */}
      <section className="home-catalog section-pad bg-gray-50">
        <div className="container-shell">
          <FadeInUp className="section-split mb-12">
            <div className="section-heading">
              <div className="eyebrow">Danh mục sản phẩm</div>
              <h2 className="section-heading__title">Đáp ứng mọi nhu cầu nguyên liệu cho bếp ăn.</h2>
              <p className="section-heading__description">
                Được sắp xếp khoa học, giúp bạn dễ dàng tra cứu và lên thực đơn hằng ngày.
              </p>
            </div>
            <Link href="/san-pham" className="text-link">
              Xem toàn bộ <ArrowRight size={16} />
            </Link>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {categories.slice(0, 5).map((item, index) => {
              // Create a compact and neat bento layout:
              // Index 0: 6 cols, 2 rows (Left half)
              // Index 1, 2: 3 cols, 1 row each (Top right)
              // Index 3, 4: 3 cols, 1 row each (Bottom right)
              let itemClass = "md:col-span-3 md:row-span-1 min-h-[220px]";
              if (index === 0) itemClass = "md:col-span-6 md:row-span-2 min-h-[300px] md:min-h-[460px]";

              // Map slug to our generated images
              const imageMap: Record<string, string> = {
                "rau-cu-qua": "/images/categories/rau-cu-qua.png",
                "thit-ca-hai-san": "/images/categories/thit-ca.png",
                "hang-dong-lanh": "/images/categories/dong-lanh.png",
                "gia-vi": "/images/categories/gia-vi.png",
                "thuc-pham-chay": "/images/categories/chay.png",
              };
              const bgImage = imageMap[item.slug] || "/images/categories/rau-cu-qua.png";

              return (
                <StaggerItem key={item.slug} className={`bento-item p-6 md:p-8 flex flex-col justify-end ${itemClass}`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-900/40 to-transparent z-10" />
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={bgImage}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                  <div className="relative z-20 text-white">
                    <span className="text-emerald-400 font-bold mb-1 block text-sm">0{index + 1}</span>
                    <h3 className="text-xl md:text-2xl font-bold mb-2">{item.title}</h3>
                    {index === 0 && <p className="text-gray-200 mb-4 text-sm md:text-base max-w-sm">{item.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {(item.highlights ?? []).slice(0, index === 0 ? 3 : 2).map((highlight) => (
                        <span key={highlight} className="text-[11px] md:text-xs px-2 py-1 rounded bg-white/20 backdrop-blur-md border border-white/10">
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link href={`/danh-muc/${item.slug}`} className="absolute inset-0 z-30" aria-label={item.title} />
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* REAL GALLERY SECTION */}
      <section className="section-pad bg-white overflow-hidden">
        <div className="container-shell">
          <FadeInUp className="text-center max-w-2xl mx-auto mb-16">
            <div className="eyebrow mb-4">Hình ảnh thực tế</div>
            <h2 className="section-heading__title">Năng lực vận hành thực tiễn.</h2>
            <p className="text-gray-600 mt-4">
              Chúng tôi sở hữu đội ngũ giao nhận chuyên nghiệp và kho vận đáp ứng sản lượng lớn mỗi ngày.
            </p>
          </FadeInUp>
          
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((num) => (
              <StaggerItem key={num} className={`relative rounded-xl overflow-hidden shadow-lg ${num % 2 === 0 ? 'h-[300px] mt-8' : 'h-[300px]'}`}>
                <Image 
                  src={`/images/real-operations/op-${num}.jpg`} 
                  alt="Hoạt động TPS1" 
                  fill 
                  className="object-cover hover:scale-110 transition-transform duration-700" 
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="home-solution container-shell section-pad">
        <FadeInUp className="section-heading text-center mb-12">
          <div className="eyebrow">Quy trình làm việc</div>
          <h2 className="section-heading__title">Đơn giản, tốc độ và minh bạch.</h2>
        </FadeInUp>

        <StaggerContainer className="grid md:grid-cols-3 gap-8 relative">
          {/* Decorative connecting line */}
          <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] bg-emerald-100 z-0" />
          
          {processSteps.map((step, idx) => (
            <StaggerItem key={step.title} className="relative z-10 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-white border-2 border-emerald-500 shadow-xl flex items-center justify-center text-2xl font-black text-emerald-600 mb-6">
                {idx + 1}
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-gray-600">{step.text}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <section className="home-partners bg-gray-50 section-pad">
        <FadeInUp className="container-shell text-center">
          <div className="eyebrow mb-8">Đối tác & Khách hàng tin dùng</div>
          <div className="relative w-full max-w-7xl mx-auto h-[250px] md:h-[550px] opacity-90 grayscale hover:grayscale-0 transition-all duration-500">
            <Image
              src={partnerLogoPanels[0].src}
              alt="Logos"
              fill
              className="object-contain object-center scale-110 md:scale-100"
            />
          </div>
        </FadeInUp>
      </section>

      <section className="home-cta">
        <ScaleIn className="container-shell">
          <div className="home-cta__card bg-gradient-to-br from-emerald-900 to-green-950 p-12 md:p-20 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <div className="eyebrow eyebrow-on-dark mb-6">Sẵn sàng phục vụ</div>
                <h2 className="text-4xl font-bold text-white mb-4">Nhận báo giá thực phẩm hôm nay.</h2>
                <p className="text-emerald-100 text-lg max-w-xl">Đội ngũ chuyên viên của TPS1 sẽ phân tích nhu cầu và gửi bảng giá chi tiết phù hợp nhất với định mức của bếp bạn.</p>
              </div>
              <Link href="/bao-gia" className="btn-primary !px-8 !py-5 !text-lg !rounded-xl whitespace-nowrap shadow-emerald-900/50 hover:scale-105">
                Nhận tư vấn ngay <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </ScaleIn>
      </section>
    </main>
  );
}
