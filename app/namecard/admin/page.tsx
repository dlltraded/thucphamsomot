"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  Save,
  Upload,
  User,
  Phone,
  Mail,
  Briefcase,
  Check,
  AlertCircle,
  ImagePlus,
  Loader2,
  ExternalLink,
  Search,
  Plus,
  Trash2,
  Edit2,
  QrCode,
  Download,
  ArrowLeft,
  RefreshCw,
  X,
  Shield,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  fetchAllNamecards,
  saveNamecard,
  deleteNamecard,
  uploadPhoto,
  checkIdUnique,
  type NamecardData,
  verifyAdminPassword,
} from "./actions";

const DEFAULT_DATA: NamecardData = {
  id: "",
  name: "",
  title_vi: "",
  title_en: "",
  phone: "",
  email: "",
  photo_url: "",
  zalo: "",
  updated_at: new Date().toISOString(),
};

// ═══════════════════════════════════════════════════════════════
// LOCK SCREEN
// ═══════════════════════════════════════════════════════════════
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await verifyAdminPassword(pass);
    setLoading(false);

    if (ok) {
      sessionStorage.setItem("tps1_nc_admin", "1");
      onUnlock();
    } else {
      setError(true);
      setPass("");
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#e8f5ee] via-[#f8fffe] to-[#fff8f4] p-4">
      <div
        className={`w-full max-w-[340px] rounded-3xl bg-white p-8 shadow-2xl shadow-[#0F8A47]/10 ring-1 ring-black/5 transition-all ${
          error ? "animate-[shake_0.35s_ease-in-out]" : ""
        }`}
      >
        <div className="mb-6 flex justify-center">
          <img src="/images/tps1-logo-horizontal.png" alt="Logo" className="h-10 object-contain" />
        </div>

        <div className="mb-5 flex justify-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
              error ? "bg-red-50" : "bg-[#0F8A47]/10"
            }`}
          >
            {error ? (
              <Shield size={28} className="text-red-400" />
            ) : (
              <KeyRound size={28} className="text-[#0F8A47]" />
            )}
          </div>
        </div>

        <h1 className="mb-1 text-center text-xl font-black text-[#133127]">Quản lý E-Namecard</h1>
        <p className="mb-7 text-center text-sm text-gray-400">Nhập mật khẩu quản trị để tiếp tục</p>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <input
              id="admin-password"
              type={show ? "text" : "password"}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Mật khẩu..."
              autoFocus
              className={`w-full rounded-2xl border px-4 py-3.5 pr-12 text-center text-lg font-bold tracking-widest outline-none transition-all ${
                error
                  ? "border-red-300 bg-red-50/70 text-red-600 ring-2 ring-red-200"
                  : "border-gray-200 bg-[#fafffe] text-[#133127] focus:border-[#0F8A47] focus:bg-white focus:ring-2 focus:ring-[#0F8A47]/15"
              }`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700"
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-500">
              <AlertCircle size={14} />
              Mật khẩu không đúng, vui lòng thử lại
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F8A47] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0F8A47]/20 transition-all hover:bg-[#0b6b38] active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
            Mở khóa quản trị
          </button>
        </form>

        <p className="mt-5 text-center text-[10px] text-gray-400">
          Chỉ dành cho nhân sự nội bộ được phân quyền
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHOTO UPLOADER
// ═══════════════════════════════════════════════════════════════
interface UploaderProps {
  id: string;
  currentUrl: string;
  onUploaded: (url: string) => void;
}

function PhotoUploader({ id, currentUrl, onUploaded }: UploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Ảnh quá lớn, tối đa 5MB");
        return;
      }
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      const url = await uploadPhoto(id || "temp", formData);
      setUploading(false);
      if (url) {
        onUploaded(url);
        URL.revokeObjectURL(localUrl);
        setPreview(url);
      } else {
        setError("Upload thất bại. Kiểm tra kết nối và thử lại.");
        setPreview(currentUrl);
      }
    },
    [id, currentUrl, onUploaded]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
        <ImagePlus size={12} className="text-gray-400" />
        Ảnh cá nhân nhân sự
      </label>

      <div
        className="flex items-center gap-5 rounded-2xl border-2 border-dashed border-[#0F8A47]/20 bg-[#f8fffe] p-4 transition-all hover:border-[#0F8A47]/40 hover:bg-[#f0faf4]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="relative flex-shrink-0">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="h-20 w-20 object-cover shadow-md ring-2 ring-[#0F8A47]/15"
              style={{ borderRadius: "50% 8px 50% 8px" }}
            />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center bg-[#0F8A47]/10"
              style={{ borderRadius: "50% 8px 50% 8px" }}
            >
              <User size={30} className="text-[#0F8A47]" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/75">
              <Loader2 size={22} className="animate-spin text-[#0F8A47]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-xl bg-[#0F8A47] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#0b6b38] active:scale-95 disabled:opacity-60"
          >
            <Upload size={12} />
            {uploading ? "Đang tải lên..." : "Chọn ảnh"}
          </button>
          <p className="mt-1.5 text-[10px] text-gray-400">
            Kéo thả hoặc bấm chọn · JPG, PNG · Tối đa 5MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-500">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QR MODAL
// ═══════════════════════════════════════════════════════════════
function QrModal({ card, onClose }: { card: NamecardData; onClose: () => void }) {
  const employeeUrl = `${window.location.origin}/namecard/${card.id}`;
  const svgRef = useRef<SVGSVGElement>(null);

  const downloadQr = () => {
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
      link.download = `qr-${card.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-[300px] rounded-[2rem] border border-gray-100 bg-white p-6 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100"
        >
          <X size={14} />
        </button>

        <div className="mb-4 flex items-center justify-center gap-2">
          {card.photo_url ? (
            <img
              src={card.photo_url}
              alt={card.name}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-[#0F8A47]/20"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F8A47]/10">
              <User size={14} className="text-[#0F8A47]" />
            </div>
          )}
          <div className="text-left">
            <p className="text-sm font-black leading-none text-gray-900">{card.name}</p>
            <p className="mt-0.5 text-[10px] font-bold leading-none text-[#0F8A47]">
              {card.title_vi}
            </p>
          </div>
        </div>

        <div className="mx-auto mb-4 flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-dashed border-[#0F8A47]/20 bg-[#f0faf4] p-3 shadow-inner">
          <QRCodeSVG
            ref={svgRef}
            value={employeeUrl}
            size={180}
            bgColor="#ffffff"
            fgColor="#0F8A47"
            level="H"
          />
        </div>

        <p className="mb-4 text-[10px] font-medium leading-relaxed text-gray-400">
          Link: <span className="font-bold text-[#0F8A47]">{employeeUrl}</span>
        </p>

        <button
          onClick={downloadQr}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#0F8A47] py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#0b6b38] active:scale-95"
        >
          <Download size={13} />
          Tải QR Code về máy
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FORM FIELD helper
// ═══════════════════════════════════════════════════════════════
interface FieldProps {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}
function Field({ label, icon, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          {icon}
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
        {hint && <span className="text-[10px] font-medium text-gray-400">{hint}</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs font-semibold text-red-500">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  );
}

const INPUT_BASE =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-300 focus:border-[#0F8A47] focus:bg-[#fafffe] focus:ring-2 focus:ring-[#0F8A47]/10";
const INPUT_DISABLED = "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50";

// ═══════════════════════════════════════════════════════════════
// MAIN ADMIN PAGE
// ═══════════════════════════════════════════════════════════════
type ViewState = "list" | "create" | "edit";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [cards, setCards] = useState<NamecardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>("list");
  const [form, setForm] = useState<NamecardData>(DEFAULT_DATA);
  const [slugError, setSlugError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [qrTarget, setQrTarget] = useState<NamecardData | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("tps1_nc_admin") === "1") setUnlocked(true);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const list = await fetchAllNamecards();
    setCards(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (unlocked) loadData();
  }, [unlocked, loadData]);

  const generateSlug = (nameStr: string) =>
    nameStr
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const handleNameChange = (val: string) => {
    const upper = val.toUpperCase();
    setForm((prev) => {
      const u: NamecardData = { ...prev, name: upper };
      if (view === "create") u.id = generateSlug(upper);
      return u;
    });
    if (view === "create") setSlugError("");
  };

  const handleSlugChange = async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setForm((prev) => ({ ...prev, id: clean }));
    setSlugError("");
    if (!clean.trim() || view !== "create") return;
    const unique = await checkIdUnique(clean);
    if (!unique) setSlugError("Đường dẫn này đã tồn tại trong hệ thống!");
  };

  const handleFormChange = (field: keyof NamecardData, val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const handleCreateNewClick = () => {
    setForm({
      id: "",
      name: "",
      title_vi: "",
      title_en: "",
      phone: "",
      email: "",
      photo_url: "",
      zalo: "",
      updated_at: new Date().toISOString(),
    });
    setSlugError("");
    setErrorMsg("");
    setView("create");
  };

  const handleEditClick = (card: NamecardData) => {
    setForm({ ...card });
    setSlugError("");
    setErrorMsg("");
    setView("edit");
  };

  const handleSave = async () => {
    if (!form.id.trim()) {
      setErrorMsg("Vui lòng nhập đường dẫn URL Slug");
      return;
    }
    if (!form.name.trim()) {
      setErrorMsg("Vui lòng nhập Họ và tên");
      return;
    }
    if (!form.phone?.trim()) {
      setErrorMsg("Vui lòng nhập Số điện thoại");
      return;
    }
    if (view === "create") {
      const unique = await checkIdUnique(form.id);
      if (!unique) {
        setSlugError("Đường dẫn này đã tồn tại!");
        return;
      }
    }
    setSaving(true);
    setErrorMsg("");
    const ok = await saveNamecard(form.id, form);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setView("list");
        loadData();
      }, 1200);
    } else {
      setErrorMsg("Lưu thất bại! Vui lòng thử lại.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh thiếp của "${name}" không?`)) return;
    setLoading(true);
    const ok = await deleteNamecard(id);
    if (ok) loadData();
    else {
      alert("Xóa thất bại! Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const filteredCards = cards.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.title_vi?.toLowerCase().includes(search.toLowerCase())
  );

  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-[#f5faf7] font-['Be_Vietnam_Pro'] text-[#133127]">
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <img
            src="/images/tps1-logo-horizontal.png"
            alt="Logo"
            className="h-8 flex-shrink-0 object-contain"
          />
          <div className="h-5 w-px flex-shrink-0 bg-gray-200" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black leading-none text-gray-900">
              Quản lý E-Namecard
            </p>
            <p className="mt-0.5 text-[10px] font-semibold leading-none text-gray-400">
              Thực Phẩm Số Một Đồng Nai
            </p>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("tps1_nc_admin");
              setUnlocked(false);
            }}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 transition-all hover:bg-red-100 active:scale-95"
          >
            <LogOut size={12} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Loading spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 size={32} className="animate-spin text-[#0F8A47]" />
            <p className="text-sm font-semibold text-gray-400">Đang tải dữ liệu...</p>
          </div>
        )}

        {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
        {!loading && view === "list" && (
          <div className="space-y-5">
            {/* Stats bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-[#0F8A47]">{cards.length}</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-400">Tổng nhân sự</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-[#F25B24]">
                  {cards.filter((c) => c.photo_url).length}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-gray-400">Có ảnh đại diện</p>
              </div>
              <div className="hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:block">
                <p className="text-2xl font-black text-sky-500">
                  {cards.filter((c) => c.email).length}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-gray-400">Có địa chỉ Email</p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Tìm tên, SĐT, chức danh..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold outline-none transition-all focus:border-[#0F8A47] focus:ring-2 focus:ring-[#0F8A47]/10"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={loadData}
                  title="Tải lại"
                  className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 transition-all hover:bg-gray-50 active:scale-95"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  id="btn-create-new"
                  onClick={handleCreateNewClick}
                  className="flex items-center gap-2 rounded-2xl bg-[#0F8A47] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#0F8A47]/20 transition-all hover:bg-[#0b6b38] active:scale-95"
                >
                  <Plus size={16} />
                  <span>Thêm nhân viên</span>
                </button>
              </div>
            </div>

            {/* Employee list */}
            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              {filteredCards.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                    <User size={28} className="text-gray-300" />
                  </div>
                  <p className="font-bold text-gray-500">Không tìm thấy nhân viên nào</p>
                  <p className="mt-1 text-xs text-gray-400">Thử đổi từ khóa hoặc thêm nhân viên mới</p>
                </div>
              ) : (
                <>
                  {/* Table — desktop */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/80">
                          <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Nhân sự
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Liên hệ
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Link E-Namecard
                          </th>
                          <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredCards.map((c) => (
                          <tr key={c.id} className="group transition-colors hover:bg-gray-50/50">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                {c.photo_url ? (
                                  <img
                                    src={c.photo_url}
                                    alt={c.name}
                                    className="h-10 w-10 flex-shrink-0 object-cover shadow-sm ring-1 ring-gray-100"
                                    style={{ borderRadius: "40% 8px 40% 8px" }}
                                  />
                                ) : (
                                  <div
                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-[#0F8A47]/10"
                                    style={{ borderRadius: "40% 8px 40% 8px" }}
                                  >
                                    <User size={16} className="text-[#0F8A47]" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-extrabold text-gray-900">
                                    {c.name}
                                  </p>
                                  <p className="truncate text-[11px] font-bold text-[#0F8A47]">
                                    {c.title_vi || (
                                      <span className="italic text-gray-300">Chưa có chức danh</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-gray-700">{c.phone}</p>
                                {c.email && (
                                  <p className="max-w-[180px] truncate text-[11px] font-medium text-gray-400">
                                    {c.email}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <a
                                href={`/namecard/${c.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F8A47] underline-offset-2 hover:underline"
                              >
                                <span>/namecard/{c.id}</span>
                                <ExternalLink size={11} />
                              </a>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setQrTarget(c)}
                                  title="Xem QR Code"
                                  className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-[#0F8A47]/10 hover:text-[#0F8A47]"
                                >
                                  <QrCode size={15} />
                                </button>
                                <button
                                  onClick={() => handleEditClick(c)}
                                  title="Sửa thông tin"
                                  className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDelete(c.id, c.name)}
                                  title="Xóa danh thiếp"
                                  className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards — mobile */}
                  <div className="divide-y divide-gray-50 md:hidden">
                    {filteredCards.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-4">
                        {c.photo_url ? (
                          <img
                            src={c.photo_url}
                            alt={c.name}
                            className="h-12 w-12 flex-shrink-0 object-cover"
                            style={{ borderRadius: "40% 8px 40% 8px" }}
                          />
                        ) : (
                          <div
                            className="flex h-12 w-12 flex-shrink-0 items-center justify-center bg-[#0F8A47]/10"
                            style={{ borderRadius: "40% 8px 40% 8px" }}
                          >
                            <User size={18} className="text-[#0F8A47]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-gray-900">{c.name}</p>
                          <p className="truncate text-[11px] font-bold text-[#0F8A47]">
                            {c.title_vi}
                          </p>
                          <p className="text-[10px] text-gray-400">{c.phone}</p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-1">
                          <button
                            onClick={() => setQrTarget(c)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[#0F8A47]/10 hover:text-[#0F8A47]"
                          >
                            <QrCode size={14} />
                          </button>
                          <button
                            onClick={() => handleEditClick(c)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── CREATE / EDIT FORM VIEW ────────────────────────────────────── */}
        {!loading && (view === "create" || view === "edit") && (
          <div className="mx-auto max-w-2xl space-y-5">
            {/* Back header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("list")}
                className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-800 active:scale-95"
              >
                <ArrowLeft size={15} />
              </button>
              <div>
                <h2 className="text-lg font-black leading-tight text-gray-900">
                  {view === "create" ? "Tạo danh thiếp mới" : `Chỉnh sửa: ${form.name}`}
                </h2>
                <p className="text-xs text-gray-400">
                  {view === "create"
                    ? "Điền đầy đủ thông tin để cấp phát URL & QR Code"
                    : "Cập nhật thông tin nhân sự"}
                </p>
              </div>
            </div>

            {/* Form card */}
            <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              {/* Photo uploader */}
              {view === "edit" || form.id.trim() !== "" ? (
                <PhotoUploader
                  id={form.id}
                  currentUrl={form.photo_url || ""}
                  onUploaded={(url) => handleFormChange("photo_url", url)}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                  <AlertCircle size={13} />
                  Nhập «Đường dẫn URL Slug» trước để có thể tải ảnh cá nhân lên
                </div>
              )}

              <div className="space-y-4 border-t border-gray-100 pt-5">
                {/* Name */}
                <Field
                  label="Họ và tên nhân sự"
                  icon={<User size={11} className="text-gray-400" />}
                  required
                >
                  <input
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="VD: NGUYỄN VĂN AN"
                    className={INPUT_BASE}
                  />
                </Field>

                {/* Slug */}
                <Field
                  label="Đường dẫn E-Namecard (URL Slug)"
                  required
                  hint="Chỉ chữ thường không dấu và dấu gạch ngang"
                  error={slugError}
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      {window.location.host}/namecard/
                    </span>
                    <input
                      value={form.id}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      disabled={view === "edit"}
                      placeholder="ten-nhan-vien"
                      className={`${INPUT_BASE} ${INPUT_DISABLED} font-black text-[#0F8A47] pl-[${Math.min(
                        window.location.host.length * 7 + 76,
                        200
                      )}px] ${slugError ? "border-red-300 ring-2 ring-red-200" : ""}`}
                      style={{ paddingLeft: `${window.location.host.length * 7 + 76}px` }}
                    />
                  </div>
                </Field>

                {/* Title */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Chức danh (Tiếng Việt)"
                    icon={<Briefcase size={11} className="text-gray-400" />}
                  >
                    <input
                      value={form.title_vi}
                      onChange={(e) => handleFormChange("title_vi", e.target.value)}
                      placeholder="VD: Giám Đốc Kinh Doanh"
                      className={INPUT_BASE}
                    />
                  </Field>
                  <Field
                    label="Chức danh (Tiếng Anh)"
                    icon={<Briefcase size={11} className="text-gray-400" />}
                  >
                    <input
                      value={form.title_en}
                      onChange={(e) => handleFormChange("title_en", e.target.value)}
                      placeholder="VD: Sales Director"
                      className={INPUT_BASE}
                    />
                  </Field>
                </div>

                {/* Phone + Zalo */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Số điện thoại"
                    icon={<Phone size={11} className="text-gray-400" />}
                    required
                  >
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleFormChange("phone", e.target.value)}
                      placeholder="0908 583 999"
                      className={INPUT_BASE}
                    />
                  </Field>
                  <Field
                    label="Số Zalo (nếu khác SĐT)"
                    icon={<Phone size={11} className="text-[#0068FF]" />}
                    hint="Để trống = dùng SĐT"
                  >
                    <input
                      type="tel"
                      value={form.zalo}
                      onChange={(e) => handleFormChange("zalo", e.target.value)}
                      placeholder="0908 583 999"
                      className={INPUT_BASE}
                    />
                  </Field>
                </div>

                {/* Email */}
                <Field label="Địa chỉ Email" icon={<Mail size={11} className="text-gray-400" />}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                    placeholder="an.nguyen@thucphamsomot.vn"
                    className={INPUT_BASE}
                  />
                </Field>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-500">
                  <AlertCircle size={14} />
                  {errorMsg}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setView("list")}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-500 transition-all hover:bg-gray-50 active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || slugError !== "" || saved}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold shadow-lg transition-all active:scale-95 ${
                    saved
                      ? "bg-emerald-500 text-white shadow-emerald-500/20"
                      : slugError !== "" || saving
                      ? "cursor-not-allowed bg-gray-100 text-gray-400 shadow-none"
                      : "bg-[#0F8A47] text-white shadow-[#0F8A47]/20 hover:bg-[#0b6b38]"
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : saved ? (
                    <>
                      <Check size={15} />
                      Đã lưu thành công!
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      Lưu danh thiếp
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR MODAL */}
      {qrTarget && <QrModal card={qrTarget} onClose={() => setQrTarget(null)} />}
    </div>
  );
}
