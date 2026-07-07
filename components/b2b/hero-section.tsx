"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Award,
  FileText,
  ArrowRight,
  Phone,
  Truck,
  Upload,
  CheckCircle,
  Building2,
  Send,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";
import { siteConfig } from "@/lib/site";
import { ThreeBackground } from "@/components/b2b/three-background";

const texts = {
  vi: {
    heroStats: [
      { value: "109+", label: "Khách hàng B2B" },
      { value: "24h", label: "Phản hồi báo giá" },
      { value: "100%", label: "Giao đúng hẹn" },
      { value: "10+", label: "Năm kinh nghiệm" },
    ],
    trustBadges: [
      { icon: ShieldCheck, label: "Chuẩn ISO 22000" },
      { icon: ShieldCheck, label: "Chuẩn HACCP" },
      { icon: Award, label: "Bảo hiểm SP 5 Tỷ" },
    ],
    certText: "Uy tín · ISO 22000 · HACCP · Bảo hiểm SP 5 tỷ VNĐ",
    title: (
      <>
        Đối tác cung ứng<br />
        thực phẩm B2B <span>chuyên nghiệp</span><br />
        tại Đồng Nai
      </>
    ),
    sub: "Phục vụ bếp ăn tập thể, nhà máy, trường học và bệnh viện. Báo giá trong 24h · Giao định kỳ · Hóa đơn VAT đầy đủ.",
    formRibbon: "PHẢN HỒI TRONG 30 PHÚT",
    formSuccessTitle: "Đã nhận yêu cầu!",
    formSuccessDesc: (name: string) => (
      <>
        Hệ thống đã ghi nhận yêu cầu của <strong>{name || "anh/chị"}</strong>.<br/>
        Đội kinh doanh TPS1 sẽ phản hồi báo giá chi tiết <strong>trong vòng 15-30 phút</strong>.
      </>
    ),
    formCommitmentTitle: "Cam kết dịch vụ TPS1",
    formCommitment1: "Báo giá minh bạch: Cạnh tranh theo số lượng, không phí ẩn.",
    formCommitment2: "Kiểm định khắt khe: 100% đạt chuẩn ISO 22000 & HACCP.",
    formNewRequest: "← Gửi yêu cầu khác",
    formTitle: "Gửi nhu cầu nhận báo giá ngay",
    formDesc: "Tải lên danh sách cần mua hoặc điền nhanh thông tin bên dưới.",
    uploadPlaceholder: "Kéo thả hoặc Tải lên File danh mục (Excel/PDF)",
    uploadSub: "Chúng tôi tính toán chiết khấu và gửi lại báo giá trong 2 giờ",
    companyLabel: "Tên công ty hoặc cơ sở bếp *",
    companyPlaceholder: "Ví dụ: Công ty TNHH ABC",
    phoneLabel: "SĐT hoặc Zalo liên hệ *",
    phonePlaceholder: "Nhập số điện thoại",
    categoryLabel: "Nhóm hàng quan tâm",
    catOptions: ["Rau củ quả tươi sạch", "Thịt cá hải sản", "Đồ khô & gia vị", "Tất cả các nhóm"],
    notesLabel: "Ghi chú nhanh yêu cầu *",
    notesPlaceholder: "Ví dụ: Cần gà dai 500kg/tuần, hỗ trợ 2 bếp khè...",
    submitBtn: "GỬI YÊU CẦU BÁO GIÁ",
    submitSubmitting: "Đang gửi yêu cầu...",
    disclaimer: "* TPS1 dùng thông tin này để liên hệ tư vấn và báo giá. Không dùng cho mục đích khác.",
  },
  en: {
    heroStats: [
      { value: "109+", label: "B2B Customers" },
      { value: "24h", label: "Quote Response" },
      { value: "100%", label: "On-time Delivery" },
      { value: "10+", label: "Years Experience" },
    ],
    trustBadges: [
      { icon: ShieldCheck, label: "ISO 22000 Standard" },
      { icon: ShieldCheck, label: "HACCP Certified" },
      { icon: Award, label: "Product Liability" },
    ],
    certText: "Trusted · ISO 22000 · HACCP · 5B VND Liability Ins.",
    title: (
      <>
        Your professional<br />
        B2B food supply <span>partner</span><br />
        in Dong Nai
      </>
    ),
    sub: "Serving canteens, factories, schools, and hospitals. 24h quote · Scheduled delivery · VAT invoices included.",
    formRibbon: "30-MINUTE RESPONSE",
    formSuccessTitle: "Request Received!",
    formSuccessDesc: (name: string) => (
      <>
        We have received the request from <strong>{name || "you"}</strong>.<br/>
        TPS1 sales team will send a detailed quote <strong>within 15-30 minutes</strong>.
      </>
    ),
    formCommitmentTitle: "TPS1 Service Commitment",
    formCommitment1: "Transparent quotes: Competitive volume pricing, no hidden fees.",
    formCommitment2: "Strict quality control: 100% ISO 22000 & HACCP certified.",
    formNewRequest: "← Send another request",
    formTitle: "Get your quote today",
    formDesc: "Upload your buying list or quickly fill out the info below.",
    uploadPlaceholder: "Drag & drop or Upload your list (Excel/PDF)",
    uploadSub: "We calculate the discounts and send the quote in 2 hours",
    companyLabel: "Company or Facility Name *",
    companyPlaceholder: "Ex: ABC Company",
    phoneLabel: "Phone or Zalo *",
    phonePlaceholder: "Enter your phone number",
    categoryLabel: "Product Category",
    catOptions: ["Fresh vegetables & fruits", "Meat & Seafood", "Dry goods & Seasonings", "All categories"],
    notesLabel: "Quick notes *",
    notesPlaceholder: "Ex: Need 500kg of chicken/week, require kitchen support...",
    submitBtn: "REQUEST A QUOTE",
    submitSubmitting: "Sending request...",
    disclaimer: "* TPS1 uses this information to provide consultation and quotes. We do not use it for any other purpose.",
  },
};

export function B2BHeroSection({ locale = "vi" }: { locale?: "vi" | "en" }) {
  const [file, setFile] = useState<File | null>(null);
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [lastSubmitName, setLastSubmitName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = texts[locale];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState("submitting");
    const formData = new FormData(e.currentTarget);
    const company = formData.get("company")?.toString() || "";
    setLastSubmitName(company);

    const payload = {
      inquiryType: "buyer",
      name: company, // Use company as name for quick hero form
      company: company,
      phone: formData.get("phone")?.toString() || "",
      interestedIn: formData.get("category")?.toString() || "",
      message: formData.get("notes")?.toString().trim() || "",
      pagePath: "/",
    };

    const apiFormData = new FormData();
    apiFormData.append("payload", JSON.stringify(payload));
    if (file) apiFormData.append("attachment", file);

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        body: apiFormData,
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setFormState("success");
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  };

  return (
    <section className="b2b-hero" aria-label="Hero B2B - Thực Phẩm Số Một">
      {/* Background image */}
      <div className="b2b-hero__bg">
        <Image
          src="/images/hero-warehouse.jpg"
          alt="Kho hàng Thực Phẩm Số Một - Năng lực cung ứng B2B"
          fill
          priority
          quality={88}
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      {/* Gradient overlay */}
      <div className="b2b-hero__overlay" />

      {/* Three.js 3D Background */}
      <ThreeBackground />

      {/* Content */}
      <div className="b2b-hero__content">
        <div className="container-shell">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            
            {/* LEFT COLUMN: Copy & Trust */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* ISO Badge */}
              <div className="b2b-hero__cert-badge" style={{ marginLeft: 0, marginRight: 0 }} role="img" aria-label="Chứng chỉ ISO 22000 và HACCP">
                <ShieldCheck size={14} />
                {t.certText}
              </div>

              {/* Title */}
              <h1 className="b2b-hero__title" style={{ marginLeft: 0, marginRight: 0, textAlign: "left" }}>
                {t.title}
              </h1>

              {/* Sub */}
              <p className="b2b-hero__sub" style={{ marginLeft: 0, marginRight: 0, textAlign: "left" }}>
                {t.sub}
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-3 mt-6 mb-10">
                {t.trustBadges.map((badge, idx) => {
                  const Icon = badge.icon;
                  return (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium backdrop-blur-md shadow-sm">
                      <Icon size={14} className="text-[#4ade80]" />
                      {badge.label}
                    </span>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="b2b-hero__stats w-full" style={{ justifyContent: "flex-start", paddingTop: "24px" }}>
                {t.heroStats.map((stat, idx) => (
                  <div key={idx} className="b2b-hero__stat">
                    <span className="b2b-hero__stat-value">{stat.value}</span>
                    <span className="b2b-hero__stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Lead Form */}
            <div className="lg:col-span-5 w-full max-w-md mx-auto lg:mx-0 relative z-10">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                {/* Glow effect behind form */}
                <div className="absolute -inset-2 bg-gradient-to-r from-[#14b87a]/20 to-[#0f6f4b]/20 blur-xl -z-10 rounded-3xl" />
                {/* Ribbon */}
                <div className="absolute top-0 right-0 bg-[#ea580c] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl tracking-wider z-10 uppercase">
                  {t.formRibbon}
                </div>
                
                {formState === "success" ? (
                  <div className="text-center py-8 animate-in fade-in zoom-in duration-500">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#14b87a]/20 mb-6 relative">
                      <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[#14b87a]"></div>
                      <CheckCircle className="w-12 h-12 text-[#4ade80]" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                      {t.formSuccessTitle}
                    </h3>
                    <p className="text-white/80 text-base leading-relaxed mb-6">
                      {t.formSuccessDesc(lastSubmitName)}
                    </p>
                    <div className="bg-white/5 border border-[#14b87a]/30 rounded-xl p-5 text-left">
                      <h4 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#4ade80]" />
                        {t.formCommitmentTitle}
                      </h4>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3 text-sm text-white/70">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] mt-1.5 flex-shrink-0"></div>
                          <div dangerouslySetInnerHTML={{ __html: t.formCommitment1.replace(/(Báo giá minh bạch|Transparent quotes):/, '<strong>$1:</strong>') }}></div>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-white/70">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] mt-1.5 flex-shrink-0"></div>
                          <div dangerouslySetInnerHTML={{ __html: t.formCommitment2.replace(/(Kiểm định khắt khe|Strict quality control):/, '<strong>$1:</strong>') }}></div>
                        </li>
                      </ul>
                    </div>
                    <button
                      onClick={() => {
                        setFormState("idle");
                        setFile(null);
                        setLastSubmitName("");
                      }}
                      className="mt-8 text-sm font-bold text-[#4ade80] hover:text-white transition-colors flex items-center gap-2 mx-auto"
                    >
                      {t.formNewRequest}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 pt-2 text-left">
                      <h3 className="text-[22px] font-bold text-white tracking-tight mb-2">{t.formTitle}</h3>
                      <p className="text-white/60 text-sm leading-relaxed">{t.formDesc}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 text-left">
                      {/* Big File Upload Dropzone */}
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-xl p-5 cursor-pointer transition-colors flex flex-col items-center justify-center text-center gap-3"
                      >
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-[#4ade80]">
                          {file ? <FileText size={24} /> : <FileSpreadsheet size={24} />}
                        </div>
                        <div>
                          <p className="text-sm text-white font-bold mb-1">
                            {file ? file.name : t.uploadPlaceholder}
                          </p>
                          <p className="text-xs text-white/50">
                            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : t.uploadSub}
                          </p>
                        </div>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".xls,.xlsx,.csv,.pdf,.doc,.docx,.txt,image/*"
                      />

                      {/* Company Name */}
                      <div className="pt-2">
                        <label className="block text-[10px] uppercase font-bold text-white/80 mb-1.5">{t.companyLabel}</label>
                        <input
                          type="text"
                          name="company"
                          required
                          minLength={2}
                          placeholder={t.companyPlaceholder}
                          className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent transition-all placeholder:text-white/40"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Phone */}
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-white/80 mb-1.5">{t.phoneLabel}</label>
                          <input
                            type="tel"
                            name="phone"
                            required
                            minLength={8}
                            placeholder={t.phonePlaceholder}
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent transition-all placeholder:text-white/40"
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-white/80 mb-1.5">{t.categoryLabel}</label>
                          <select
                            name="category"
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent transition-all appearance-none [&>option]:bg-[#0f172a]"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-opacity='0.4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                          >
                            {t.catOptions.map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/80 mb-1.5">{t.notesLabel}</label>
                        <textarea
                          name="notes"
                          rows={2}
                          required
                          minLength={10}
                          placeholder={t.notesPlaceholder}
                          className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent transition-all placeholder:text-white/40 resize-none"
                        />
                      </div>

                      <input type="hidden" name="_subject" value="[TPS1] Yêu cầu báo giá từ Hero Form" />
                      <input type="hidden" name="_template" value="table" />
                      
                      <button
                        type="submit"
                        disabled={formState === "submitting"}
                        className="w-full bg-[#14b87a] hover:bg-[#0f8c5c] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(20,184,122,0.3)] hover:shadow-[0_0_25px_rgba(20,184,122,0.5)] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {formState === "submitting" ? (
                          t.submitSubmitting
                        ) : (
                          <><Send size={18} className="rotate-[-45deg] -mt-1" /> {t.submitBtn}</>
                        )}
                      </button>

                      <p className="text-[10px] text-white/50 text-center mt-4 px-2">
                        {t.disclaimer}
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Inline styles overrides to fix centering issues if any from global css */}
      <style dangerouslySetInnerHTML={{__html: `
        .b2b-hero__title, .b2b-hero__sub, .b2b-hero__cert-badge {
          margin-left: 0 !important;
          margin-right: 0 !important;
          text-align: left !important;
        }
        .b2b-hero__title {
          margin-bottom: 16px !important;
        }
        @media (max-width: 1023px) {
          .b2b-hero__title, .b2b-hero__sub, .b2b-hero__cert-badge {
            margin-left: auto !important;
            margin-right: auto !important;
            text-align: center !important;
          }
          .b2b-hero__title {
            margin-bottom: 24px !important;
          }
          .lg\\:col-span-7 {
            align-items: center !important;
            text-align: center !important;
          }
          .lg\\:col-span-7 .flex-wrap {
            justify-content: center !important;
          }
          .b2b-hero__stats {
            justify-content: center !important;
          }
        }
      `}} />
    </section>
  );
}
