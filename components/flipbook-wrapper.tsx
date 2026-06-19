"use client";

import dynamic from "next/dynamic";
import React from "react";

const PdfFlipbook = dynamic(
  () => import("./pdf-flipbook").then((mod) => mod.PdfFlipbook),
  { ssr: false, loading: () => <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Đang tải hồ sơ...</div> }
);

export function FlipbookWrapper({ file }: { file: string }) {
  return <PdfFlipbook file={file} />;
}
