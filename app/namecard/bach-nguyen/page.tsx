"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Download,
  MessageCircle,
  FileText,
  ShieldCheck,
  Award,
  TrendingDown,
  QrCode,
} from "lucide-react";

// ─── Cấu hình nhân sự – chỉnh tại đây để tạo namecard khác ───────────────────
const PERSON = {
  name: "NGUYỄN TIẾN BÁCH",
  titleVi: "Giám Đốc Điều Hành",
  titleEn: "Executive Director",
  phone: "0908583999",
  phoneDisplay: "090 858 3999",
  email: "ceo@thucphamsomot.vn",
  website: "https://thucphamsomot.vn",
  zaloLink: "https://zalo.me/0908583999",
  companyVi: "CÔNG TY TNHH THỰC PHẨM SỐ MỘT ĐỒNG NAI",
  companyEn: "NO.1 DONG NAI FOOD SUPPLY CO., LTD",
  addressVi: "B19 KP15, Phường Tam Hiệp, TP. Biên Hòa, Đồng Nai",
  addressEn: "B19, Quarter 15, Tam Hiep Ward, Bien Hoa City, Dong Nai",
  mapQuery:
    "Công+ty+TNHH+Thực+Phẩm+Số+Một+B19+KP15+Tam+Hiệp+Đồng+Nai",
  vcfFile: "/bach-nguyen.vcf",
  profileUrl: "https://thucphamsomot.vn/ho-so-nang-luc",
  taglineVi: "Giải pháp thực phẩm toàn diện cho mọi bếp ăn",
  taglineEn: "Comprehensive Food Solutions for Every Kitchen",
};
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_BUTTONS = [
  {
    id: "save-contact",
    icon: Download,
    label: "Lưu liên hệ",
    sublabel: "Save Contact",
    href: PERSON.vcfFile,
    download: "bach-nguyen.vcf",
    color: "bg-[#0B8F3A] hover:bg-[#097a32] text-white",
    featured: true,
  },
  {
    id: "call",
    icon: Phone,
    label: "Gọi ngay",
    sublabel: "Call Now",
    href: `tel:${PERSON.phone}`,
    color: "bg-[#F37021] hover:bg-[#d9611a] text-white",
    featured: true,
  },
  {
    id: "zalo",
    icon: MessageCircle,
    label: "Nhắn Zalo",
    sublabel: "Chat Zalo",
    href: PERSON.zaloLink,
    color: "bg-[#0068FF] hover:bg-[#0055d4] text-white",
  },
  {
    id: "email",
    icon: Mail,
    label: "Gửi Email",
    sublabel: "Send Email",
    href: `mailto:${PERSON.email}`,
    color: "bg-white hover:bg-gray-50 text-[#133127] border border-[#0B8F3A]/30",
  },
  {
    id: "website",
    icon: Globe,
    label: "Truy cập Website",
    sublabel: "Visit Website",
    href: PERSON.website,
    color: "bg-white hover:bg-gray-50 text-[#133127] border border-[#0B8F3A]/30",
  },
  {
    id: "map",
    icon: MapPin,
    label: "Mở Bản Đồ",
    sublabel: "Open Maps",
    href: `https://www.google.com/maps/search/?api=1&query=${PERSON.mapQuery}`,
    color: "bg-white hover:bg-gray-50 text-[#133127] border border-[#0B8F3A]/30",
  },
  {
    id: "profile",
    icon: FileText,
    label: "Xem Hồ Sơ Công Ty",
    sublabel: "Company Profile",
    href: PERSON.profileUrl,
    color: "bg-white hover:bg-gray-50 text-[#133127] border border-[#0B8F3A]/30",
  },
];

const BRAND_VALUES = [
  {
    icon: ShieldCheck,
    titleVi: "AN TOÀN",
    titleEn: "Safe",
    desc: "Nguồn gốc kiểm định rõ ràng",
    color: "bg-[#0B8F3A]/10 text-[#0B8F3A]",
    ring: "ring-[#0B8F3A]/20",
  },
  {
    icon: Award,
    titleVi: "CHẤT LƯỢNG",
    titleEn: "Quality",
    desc: "Đạt chuẩn vệ sinh thực phẩm",
    color: "bg-[#F37021]/10 text-[#F37021]",
    ring: "ring-[#F37021]/20",
  },
  {
    icon: TrendingDown,
    titleVi: "TỐI ƯU CHI PHÍ",
    titleEn: "Cost-efficient",
    desc: "Giá tốt nhất thị trường Đồng Nai",
    color: "bg-sky-50 text-sky-600",
    ring: "ring-sky-200/50",
  },
];

export default function NameCardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f0faf4] via-white to-[#fff8f2]">
      {/* ── HERO CARD ── */}
      <section className="relative overflow-hidden pb-6">
        {/* Background food image */}
        <div className="relative h-52 w-full sm:h-64">
          <Image
            src="/images/tps1-cover-food.jpg"
            alt="Thực Phẩm Số Một"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B8F3A]/60 via-[#0B8F3A]/30 to-white" />
          {/* Decorative arc bottom */}
          <div className="absolute -bottom-1 left-0 right-0">
            <svg viewBox="0 0 390 40" className="w-full" preserveAspectRatio="none">
              <path d="M0,40 Q195,0 390,40 L390,40 L0,40 Z" fill="white" />
            </svg>
          </div>
        </div>

        {/* Card content */}
        <div className="relative -mt-8 px-4">
          <div className="mx-auto max-w-sm rounded-3xl bg-white p-6 shadow-xl shadow-[#0B8F3A]/10 ring-1 ring-[#0B8F3A]/10">
            {/* Logo */}
            <div className="mb-5 flex justify-center">
              <div className="relative h-14 w-40">
                <Image
                  src="/images/tps1-logo-horizontal.png"
                  alt="Logo Thực Phẩm Số Một"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Divider accent */}
            <div className="mb-5 flex items-center gap-2">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-[#0B8F3A]/30" />
              <div className="h-1.5 w-1.5 rounded-full bg-[#F37021]" />
              <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-[#0B8F3A]/30" />
            </div>

            {/* Person info */}
            <div className="text-center">
              <h1 className="text-2xl font-black tracking-wide text-[#133127]">
                {PERSON.name}
              </h1>
              <p className="mt-1 text-base font-semibold text-[#0B8F3A]">
                {PERSON.titleVi}
              </p>
              <p className="text-sm font-medium text-[#5e6d64]">
                {PERSON.titleEn}
              </p>

              <div className="mt-4 rounded-xl bg-[#f0faf4] px-4 py-3">
                <p className="text-sm font-bold text-[#133127]">{PERSON.companyVi}</p>
                <p className="mt-0.5 text-xs text-[#5e6d64]">{PERSON.companyEn}</p>
              </div>

              {/* Tagline */}
              <div className="mt-4 border-t border-dashed border-[#0B8F3A]/20 pt-4">
                <p className="text-sm font-semibold italic text-[#0B8F3A]">
                  "{PERSON.taglineVi}"
                </p>
                <p className="mt-0.5 text-xs italic text-[#5e6d64]">
                  "{PERSON.taglineEn}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ACTION BUTTONS ── */}
      <section className="px-4 pb-6">
        <div className="mx-auto max-w-sm space-y-3">
          {/* Featured buttons */}
          <div className="grid grid-cols-2 gap-3">
            {ACTION_BUTTONS.filter((b) => b.featured).map((btn) => (
              <a
                key={btn.id}
                href={btn.href}
                download={btn.download}
                target={btn.download ? undefined : "_blank"}
                rel="noopener noreferrer"
                className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-4 py-3.5 text-center font-semibold shadow-md transition-all duration-200 active:scale-95 ${btn.color}`}
              >
                <btn.icon size={22} strokeWidth={2.2} />
                <span className="text-sm font-bold leading-tight">{btn.label}</span>
                <span className="text-[10px] font-medium opacity-80">{btn.sublabel}</span>
              </a>
            ))}
          </div>

          {/* Other buttons */}
          {ACTION_BUTTONS.filter((b) => !b.featured).map((btn) => (
            <a
              key={btn.id}
              href={btn.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex min-h-[52px] w-full items-center gap-3.5 rounded-2xl px-5 py-3.5 font-semibold shadow-sm transition-all duration-200 active:scale-95 ${btn.color}`}
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B8F3A]/10">
                <btn.icon size={18} className="text-[#0B8F3A]" />
              </span>
              <div className="text-left">
                <p className="text-sm font-bold leading-tight">{btn.label}</p>
                <p className="text-xs text-[#5e6d64]">{btn.sublabel}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── CONTACT INFO ── */}
      <section className="px-4 pb-6">
        <div className="mx-auto max-w-sm rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0B8F3A]/10">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#5e6d64]">
            <span className="h-1 w-6 rounded-full bg-[#0B8F3A]" />
            Thông tin liên hệ
          </h2>
          <ul className="space-y-3.5">
            {[
              { icon: Phone, text: PERSON.phoneDisplay, href: `tel:${PERSON.phone}` },
              { icon: Mail, text: PERSON.email, href: `mailto:${PERSON.email}` },
              { icon: Globe, text: PERSON.website, href: PERSON.website },
              { icon: MapPin, text: PERSON.addressVi, href: `https://www.google.com/maps/search/?api=1&query=${PERSON.mapQuery}` },
            ].map(({ icon: Icon, text, href }, i) => (
              <li key={i}>
                <a
                  href={href}
                  target={href.startsWith("tel") || href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#f0faf4]"
                >
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#0B8F3A]/10">
                    <Icon size={15} className="text-[#0B8F3A]" />
                  </span>
                  <span className="text-sm text-[#133127]">{text}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── BRAND VALUES ── */}
      <section className="px-4 pb-6">
        <div className="mx-auto max-w-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#5e6d64]">
            <span className="h-1 w-6 rounded-full bg-[#F37021]" />
            Cam kết của chúng tôi
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {BRAND_VALUES.map((val) => (
              <div
                key={val.titleVi}
                className={`flex flex-col items-center rounded-2xl p-4 ring-2 ${val.ring} bg-white text-center shadow-sm`}
              >
                <span className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${val.color}`}>
                  <val.icon size={22} strokeWidth={1.8} />
                </span>
                <p className="text-xs font-black leading-tight text-[#133127]">{val.titleVi}</p>
                <p className="text-[10px] font-medium text-[#5e6d64]">{val.titleEn}</p>
                <p className="mt-1.5 text-[10px] text-[#5e6d64] leading-tight">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QR SHORTCUT ── */}
      <section className="px-4 pb-6">
        <div className="mx-auto max-w-sm">
          <Link
            href="/namecard/bach-nguyen/qr"
            className="flex items-center gap-3 rounded-2xl bg-[#133127] px-5 py-4 text-white shadow-md transition-all active:scale-95"
          >
            <QrCode size={24} className="text-[#F37021]" />
            <div>
              <p className="text-sm font-bold">Xem mã QR của tôi</p>
              <p className="text-xs text-white/60">Chia sẻ namecard qua QR Code</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#0B8F3A]/10 bg-white px-4 py-8">
        <div className="mx-auto max-w-sm text-center">
          <div className="mb-3 flex justify-center">
            <div className="relative h-8 w-28">
              <Image
                src="/images/tps1-logo-horizontal.png"
                alt="TPS1 Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <p className="text-xs font-semibold text-[#133127]">{PERSON.companyVi}</p>
          <a href={PERSON.website} className="mt-1 block text-xs text-[#0B8F3A] hover:underline">
            {PERSON.website}
          </a>
          <p className="mt-3 text-[10px] text-[#5e6d64]">
            © {new Date().getFullYear()} Thực Phẩm Số Một. All rights reserved.
          </p>
          <p className="mt-1 text-[10px] text-[#5e6d64]">
            Powered by <span className="font-semibold text-[#0B8F3A]">THỰC PHẨM SỐ MỘT</span>
          </p>
        </div>
      </footer>
    </main>
  );
}
