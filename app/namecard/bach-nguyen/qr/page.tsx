"use client";

import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download, Share2 } from "lucide-react";

const NAMECARD_URL = "https://thucphamsomot.vn/namecard/bach-nguyen";
const PERSON_NAME = "NGUYỄN TIẾN BÁCH";
const PERSON_TITLE = "Giám Đốc Điều Hành";

export default function QRPage() {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = useCallback(() => {
    if (!svgRef.current) return;

    // Convert SVG to PNG via canvas
    const svgElement = svgRef.current;
    const canvas = document.createElement("canvas");
    const size = 600;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new window.Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = "qr-bach-nguyen.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  }, []);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `E-Namecard: ${PERSON_NAME}`,
          text: `${PERSON_NAME} - ${PERSON_TITLE} | Thực Phẩm Số Một`,
          url: NAMECARD_URL,
        });
      } catch {
        // share cancelled
      }
    } else {
      await navigator.clipboard.writeText(NAMECARD_URL);
      alert("Đã sao chép link vào clipboard!");
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-br from-[#f0faf4] via-white to-[#fff8f2] px-4 py-8">
      {/* Back button */}
      <div className="mb-6 w-full max-w-sm">
        <Link
          href="/namecard/bach-nguyen"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#133127] shadow-sm ring-1 ring-[#0B8F3A]/20 transition-all hover:bg-[#f0faf4] active:scale-95"
        >
          <ArrowLeft size={16} />
          Quay lại namecard
        </Link>
      </div>

      {/* QR Card */}
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl shadow-[#0B8F3A]/10 ring-1 ring-[#0B8F3A]/10">
        {/* Logo */}
        <div className="mb-4 flex justify-center">
          <div className="relative h-10 w-32">
            <Image
              src="/images/tps1-logo-horizontal.png"
              alt="TPS1 Logo"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <div className="mb-5 text-center">
          <h1 className="text-base font-black text-[#133127]">{PERSON_NAME}</h1>
          <p className="text-sm text-[#0B8F3A]">{PERSON_TITLE}</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="rounded-2xl bg-white p-4 shadow-inner ring-1 ring-[#0B8F3A]/10">
            <QRCodeSVG
              ref={svgRef}
              value={NAMECARD_URL}
              size={220}
              bgColor="#ffffff"
              fgColor="#0B3D1E"
              level="H"
              imageSettings={{
                src: "/images/tps1-logo-transparent.png",
                height: 44,
                width: 44,
                excavate: true,
              }}
            />
          </div>
        </div>

        {/* Instruction */}
        <div className="mt-5 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0B8F3A]/10 px-4 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0B8F3A]" />
            <p className="text-xs font-semibold text-[#0B8F3A]">
              Quét mã để lưu thông tin liên hệ
            </p>
          </div>
          <p className="mt-2 text-[11px] text-[#5e6d64]">
            Scan QR code to save contact information
          </p>
        </div>

        {/* URL preview */}
        <div className="mt-4 rounded-xl bg-[#f8fffe] px-4 py-2.5 text-center ring-1 ring-[#0B8F3A]/10">
          <p className="break-all text-[11px] text-[#5e6d64]">{NAMECARD_URL}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-5 grid w-full max-w-sm grid-cols-2 gap-3">
        <button
          onClick={handleDownload}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#0B8F3A] px-4 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-95 hover:bg-[#097a32]"
        >
          <Download size={18} />
          Tải QR PNG
        </button>
        <button
          onClick={handleShare}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#F37021] px-4 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-95 hover:bg-[#d9611a]"
        >
          <Share2 size={18} />
          Chia sẻ link
        </button>
      </div>

      {/* Tips */}
      <div className="mt-6 w-full max-w-sm rounded-2xl bg-[#133127]/5 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#133127]">
          💡 Hướng dẫn in QR lên name card
        </p>
        <ol className="space-y-1.5 text-xs text-[#5e6d64]">
          <li>1. Tải QR dạng PNG bằng nút bên trên</li>
          <li>2. Đặt QR vào thiết kế name card (góc phải hoặc mặt sau)</li>
          <li>3. In với độ phân giải ít nhất 300dpi, kích thước tối thiểu 2.5cm × 2.5cm</li>
          <li>4. Khách quét bằng Zalo hoặc camera điện thoại là mở được ngay</li>
        </ol>
      </div>
    </main>
  );
}
