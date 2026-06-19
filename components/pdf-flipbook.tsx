"use client";

import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import HTMLFlipBook from "react-pageflip";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import Link from "next/link";
import { MoveLeft, Download } from "lucide-react";

// Thiết lập worker cho react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PageItem = React.forwardRef<HTMLDivElement, { pageNumber: number; scale?: number }>((props, ref) => {
  return (
    <div className="page bg-white flex items-center justify-center overflow-hidden" ref={ref}>
      <Page 
        pageNumber={props.pageNumber} 
        renderTextLayer={false} 
        renderAnnotationLayer={false} 
        scale={props.scale || 1}
        className="w-full h-full flex items-center justify-center"
      />
    </div>
  );
});
PageItem.displayName = 'PageItem';

export function PdfFlipbook({ file }: { file: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  if (windowWidth === 0) return null; // Wait for client hydration

  // Tính toán kích thước trang lật
  const isMobile = windowWidth < 768;
  const bookWidth = isMobile ? windowWidth : 600;
  const bookHeight = isMobile ? windowWidth * 1.414 : 848;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 relative p-4">
      
      {/* Thanh công cụ */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition">
          <MoveLeft size={16} />
          Trang chủ
        </Link>
      </div>
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <a href={file} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition">
          <Download size={16} />
          Tải PDF
        </a>
      </div>

      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex items-center justify-center mt-12"
        loading={<div className="text-white">Đang tải hồ sơ năng lực...</div>}
      >
        {numPages > 0 && (
          <HTMLFlipBook
            width={bookWidth}
            height={bookHeight}
            size="stretch"
            minWidth={315}
            maxWidth={1000}
            minHeight={400}
            maxHeight={1533}
            maxShadowOpacity={0.5}
            showCover={true}
            mobileScrollSupport={true}
            className="demo-book"
            style={{ margin: "0 auto", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}
          >
            {Array.from(new Array(numPages), (el, index) => (
              <PageItem key={index} pageNumber={index + 1} scale={isMobile ? (windowWidth / 600) : 1} />
            ))}
          </HTMLFlipBook>
        )}
      </Document>

      <div className="absolute bottom-4 text-white/50 text-sm animate-pulse">
        {isMobile ? "Vuốt để lật trang" : "Click hoặc kéo mép trang để lật"}
      </div>
    </div>
  );
}
