"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import {
  User,
  Briefcase,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Copy,
  Download,
  Check,
  ExternalLink,
  QrCode,
  Plus,
  Lock,
  LogOut,
  KeyRound,
} from "lucide-react";

// ─── Mật khẩu admin ───────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "19871988";
const STORAGE_KEY = "tps1_namecard_admin_unlocked";

// ── Lock Screen Component ──────────────────────────────────────────────────────
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 2000);
      setValue("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f0faf4] via-white to-[#fff8f2] p-4">
      <div
        className={`w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl shadow-[#0B8F3A]/10 ring-1 ring-[#0B8F3A]/15 transition-all ${
          shake ? "animate-[wiggle_0.4s_ease-in-out]" : ""
        }`}
        style={shake ? { animation: "wiggle 0.4s ease-in-out" } : {}}
      >
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="relative h-10 w-36">
            <Image src="/images/tps1-logo-horizontal.png" alt="Logo" fill className="object-contain" />
          </div>
        </div>

        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0B8F3A]/10">
            <KeyRound size={32} className="text-[#0B8F3A]" />
          </div>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-xl font-black text-[#133127]">Admin Namecard</h1>
          <p className="mt-1 text-sm text-[#5e6d64]">Nhập mã để tạo e-namecard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Nhập mật khẩu..."
              autoFocus
              className={`w-full rounded-xl border px-4 py-3.5 pr-12 text-center text-lg font-bold tracking-widest outline-none transition ${
                error
                  ? "border-red-400 bg-red-50 text-red-600 placeholder:text-red-300"
                  : "border-[#0B8F3A]/25 bg-[#f8fffe] text-[#133127] focus:border-[#0B8F3A] focus:ring-2 focus:ring-[#0B8F3A]/10"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5e6d64] hover:text-[#133127]"
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-center text-xs font-semibold text-red-500">
              Mật khẩu không đúng, vui lòng thử lại
            </p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B8F3A] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#097a32] active:scale-95"
          >
            <Lock size={16} />
            Mở khóa
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-[#5e6d64]">
          Chỉ dành cho nhân sự nội bộ được phân quyền
        </p>
      </div>
    </div>
  );
}

// ─── Thông tin công ty cố định ────────────────────────────────────────────────
const COMPANY = {
  vi: "CÔNG TY TNHH THỰC PHẨM SỐ MỘT ĐỒNG NAI",
  en: "NO.1 DONG NAI FOOD SUPPLY CO., LTD",
  website: "https://thucphamsomot.vn",
  base: "https://thucphamsomot.vn/namecard",
};

// Danh sách nhân sự hiện có (thêm vào đây sau mỗi lần tạo mới)
const EXISTING_CARDS = [
  {
    name: "NGUYỄN TIẾN BÁCH",
    title: "Giám Đốc Điều Hành",
    phone: "090 858 3999",
    email: "ceo@thucphamsomot.vn",
    url: "https://thucphamsomot.vn/namecard/bach-nguyen",
    static: true,
  },
];

interface FormData {
  name: string;
  titleVi: string;
  titleEn: string;
  phone: string;
  email: string;
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function buildUrl(data: FormData) {
  if (!data.name && !data.phone) return "";
  const params = new URLSearchParams();
  if (data.name) params.set("name", data.name);
  if (data.titleVi) params.set("title", data.titleVi);
  if (data.titleEn) params.set("titleEn", data.titleEn);
  if (data.phone) params.set("phone", data.phone.replace(/\s/g, ""));
  if (data.email) params.set("email", data.email);
  return `${COMPANY.base}?${params.toString()}`;
}

// ── Mini preview card ──────────────────────────────────────────────────────────
function MiniPreview({ data }: { data: FormData }) {
  const phoneRaw = data.phone.replace(/\s/g, "");
  return (
    <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-[#0B8F3A]/15">
      {/* Logo */}
      <div className="mb-4 flex justify-center">
        <div className="relative h-8 w-28">
          <Image src="/images/tps1-logo-horizontal.png" alt="Logo" fill className="object-contain" />
        </div>
      </div>
      {/* Divider */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#0B8F3A]/30" />
        <div className="h-1.5 w-1.5 rounded-full bg-[#F37021]" />
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#0B8F3A]/30" />
      </div>
      {/* Person */}
      <div className="text-center">
        <p className="text-lg font-black text-[#133127]">
          {data.name || <span className="text-gray-300">TÊN NHÂN VIÊN</span>}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-[#0B8F3A]">
          {data.titleVi || <span className="text-gray-300">Chức danh</span>}
        </p>
        {data.titleEn && <p className="text-xs text-[#5e6d64]">{data.titleEn}</p>}
        <div className="mt-3 rounded-xl bg-[#f0faf4] px-3 py-2">
          <p className="text-xs font-bold text-[#133127]">{COMPANY.vi}</p>
          <p className="mt-0.5 text-[10px] text-[#5e6d64]">{COMPANY.en}</p>
        </div>
      </div>
      {/* Contacts */}
      <div className="mt-4 space-y-1.5">
        {data.phone && (
          <div className="flex items-center gap-2 text-xs text-[#133127]">
            <Phone size={12} className="text-[#0B8F3A]" />
            <span>{data.phone}</span>
          </div>
        )}
        {data.email && (
          <div className="flex items-center gap-2 text-xs text-[#133127]">
            <Mail size={12} className="text-[#0B8F3A]" />
            <span>{data.email}</span>
          </div>
        )}
      </div>
      {/* Action buttons preview */}
      {phoneRaw && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#0B8F3A] py-2 text-center text-[10px] font-bold text-white">
            📥 Lưu liên hệ
          </div>
          <div className="rounded-xl bg-[#F37021] py-2 text-center text-[10px] font-bold text-white">
            📞 Gọi ngay
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function NamecardAdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: "",
    titleVi: "",
    titleEn: "",
    phone: "",
    email: "",
  });
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [cards, setCards] = useState(EXISTING_CARDS);
  const svgRef = useRef<SVGSVGElement>(null);

  // Kiểm tra session đã đăng nhập chưa
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setUnlocked(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
  };

  // Hiển thị lock screen nếu chưa đăng nhập
  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  const generatedUrl = useMemo(() => buildUrl(form), [form]);
  const isReady = !!(form.name && form.phone);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCopyUrl = useCallback(async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedUrl]);

  const handleDownloadQR = useCallback(() => {
    if (!svgRef.current) return;
    const canvas = document.createElement("canvas");
    const size = 600;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const svg = new XMLSerializer().serializeToString(svgRef.current);
    const img = new window.Image();
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      const slug = toSlug(form.name) || "namecard";
      link.download = `qr-${slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  }, [form.name]);

  const handleSaveToList = () => {
    if (!isReady) return;
    setCards((prev) => [
      ...prev,
      {
        name: form.name,
        title: form.titleVi,
        phone: form.phone,
        email: form.email,
        url: generatedUrl,
        static: false,
      },
    ]);
    alert(`Đã lưu vào danh sách! Hãy mở link để xem namecard.`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f0faf4] via-white to-[#fff8f2] p-4">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="relative h-8 w-28">
            <Image src="/images/tps1-logo-horizontal.png" alt="Logo" fill className="object-contain" />
          </div>
          <div className="h-6 w-px bg-[#0B8F3A]/20" />
          <div className="flex-1">
            <h1 className="text-lg font-black text-[#133127]">Tạo E-Namecard</h1>
            <p className="text-xs text-[#5e6d64]">Hệ thống nội bộ — Thực Phẩm Số Một</p>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-100"
          >
            <LogOut size={13} />
            Đăng xuất
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── LEFT: FORM ── */}
          <div className="space-y-4">
            {/* Form card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#0B8F3A]/10">
              <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#5e6d64]">
                <span className="h-1 w-5 rounded-full bg-[#0B8F3A]" />
                Thông tin nhân sự
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#133127]">
                    <User size={12} className="mr-1 inline" />
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: NGUYỄN VĂN AN"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-[#0B8F3A]/20 bg-[#fafffe] px-4 py-3 text-sm font-semibold text-[#133127] outline-none transition focus:border-[#0B8F3A] focus:ring-2 focus:ring-[#0B8F3A]/10"
                  />
                </div>

                {/* Title VI + EN */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#133127]">
                      <Briefcase size={12} className="mr-1 inline" />
                      Chức danh (Tiếng Việt) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Giám Đốc Kinh Doanh"
                      value={form.titleVi}
                      onChange={(e) => handleChange("titleVi", e.target.value)}
                      className="w-full rounded-xl border border-[#0B8F3A]/20 bg-[#fafffe] px-4 py-3 text-sm text-[#133127] outline-none transition focus:border-[#0B8F3A] focus:ring-2 focus:ring-[#0B8F3A]/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#133127]">
                      <Briefcase size={12} className="mr-1 inline" />
                      Chức danh (Tiếng Anh)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Sales Director"
                      value={form.titleEn}
                      onChange={(e) => handleChange("titleEn", e.target.value)}
                      className="w-full rounded-xl border border-[#0B8F3A]/20 bg-[#fafffe] px-4 py-3 text-sm text-[#133127] outline-none transition focus:border-[#0B8F3A] focus:ring-2 focus:ring-[#0B8F3A]/10"
                    />
                  </div>
                </div>

                {/* Phone + Email */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#133127]">
                      <Phone size={12} className="mr-1 inline" />
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="VD: 090 858 3999"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="w-full rounded-xl border border-[#0B8F3A]/20 bg-[#fafffe] px-4 py-3 text-sm text-[#133127] outline-none transition focus:border-[#0B8F3A] focus:ring-2 focus:ring-[#0B8F3A]/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#133127]">
                      <Mail size={12} className="mr-1 inline" />
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="VD: an.nguyen@thucphamsomot.vn"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="w-full rounded-xl border border-[#0B8F3A]/20 bg-[#fafffe] px-4 py-3 text-sm text-[#133127] outline-none transition focus:border-[#0B8F3A] focus:ring-2 focus:ring-[#0B8F3A]/10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Generated URL */}
            {generatedUrl && (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0B8F3A]/10">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#5e6d64]">
                  <span className="h-1 w-5 rounded-full bg-[#F37021]" />
                  Link E-Namecard
                </h2>
                <div className="flex gap-2">
                  <div className="flex-1 overflow-hidden rounded-xl bg-[#f0faf4] px-4 py-3">
                    <p className="break-all text-xs font-mono text-[#133127]">{generatedUrl}</p>
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-[#0B8F3A] px-4 py-3 text-xs font-bold text-white transition active:scale-95 hover:bg-[#097a32]"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Đã sao chép!" : "Copy"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#133127] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    <ExternalLink size={13} />
                    Mở namecard
                  </a>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F37021] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    <QrCode size={13} />
                    {showQR ? "Ẩn QR" : "Xem QR"}
                  </button>
                  {isReady && (
                    <button
                      onClick={handleSaveToList}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B8F3A]/10 px-3 py-2 text-xs font-semibold text-[#0B8F3A] transition hover:bg-[#0B8F3A]/20"
                    >
                      <Plus size={13} />
                      Lưu vào danh sách
                    </button>
                  )}
                </div>

                {/* QR Popup */}
                {showQR && (
                  <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-[#f8fffe] p-5 ring-1 ring-[#0B8F3A]/15">
                    <QRCodeSVG
                      ref={svgRef}
                      value={generatedUrl}
                      size={200}
                      bgColor="#ffffff"
                      fgColor="#0B3D1E"
                      level="H"
                      imageSettings={{
                        src: "/images/tps1-logo-transparent.png",
                        height: 40,
                        width: 40,
                        excavate: true,
                      }}
                    />
                    <p className="text-xs text-[#5e6d64]">Quét mã để mở namecard</p>
                    <button
                      onClick={handleDownloadQR}
                      className="flex items-center gap-2 rounded-xl bg-[#133127] px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
                    >
                      <Download size={14} />
                      Tải QR PNG (để in name card)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Danh sách đã tạo */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0B8F3A]/10">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#5e6d64]">
                <span className="h-1 w-5 rounded-full bg-[#133127]" />
                Danh sách E-Namecard ({cards.length})
              </h2>
              <div className="space-y-2">
                {cards.map((card, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl bg-[#f8fffe] px-4 py-3 ring-1 ring-[#0B8F3A]/10"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#0B8F3A]/10">
                      <User size={16} className="text-[#0B8F3A]" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-bold text-[#133127]">{card.name}</p>
                      <p className="text-xs text-[#5e6d64]">
                        {card.title} • {card.phone}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {card.static && (
                        <span className="rounded-md bg-[#0B8F3A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0B8F3A]">
                          Static
                        </span>
                      )}
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#133127]/10 text-[#133127] transition hover:bg-[#133127]/20"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: LIVE PREVIEW ── */}
          <div className="space-y-4">
            <div className="sticky top-4">
              <div className="mb-3 flex items-center gap-2">
                <Eye size={14} className="text-[#5e6d64]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5e6d64]">
                  Preview (cập nhật tức thì)
                </span>
              </div>
              <MiniPreview data={form} />

              {/* Instructions */}
              <div className="mt-4 rounded-xl bg-[#133127]/5 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#133127]">
                  📋 Quy trình
                </p>
                <ol className="space-y-1.5 text-xs text-[#5e6d64]">
                  <li>1. Điền tên, chức vụ, SĐT, email</li>
                  <li>2. Copy link → gửi cho nhân viên</li>
                  <li>3. Bấm "Xem QR" → Tải PNG → in lên name card</li>
                  <li>4. Khách quét QR → mở namecard → lưu danh bạ</li>
                </ol>
              </div>

              <div className="mt-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                <p className="text-xs font-bold text-amber-800">⚠️ Lưu ý</p>
                <p className="mt-1 text-xs text-amber-700">
                  Link tạo ra hoạt động ngay, không cần deploy lại. Mọi thông tin nằm trong URL — link dài hơn nhưng hoàn toàn tự động.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
