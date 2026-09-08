"use client";

import { Download } from "lucide-react";

export default function SoanHangClient({ data, rawOrders }: { data: any[], rawOrders: any[] }) {
  
  const handleExportCSV = () => {
    if (data.length === 0) {
      alert("Không có dữ liệu để xuất.");
      return;
    }

    // Tạo nội dung CSV
    const bom = "\uFEFF"; // Để Excel đọc được UTF-8
    let csvContent = "STT,Tên Sản Phẩm,Khách Hàng (Phân Bổ),Tổng Cần Soạn\n";

    data.forEach((item, index) => {
      const customersStr = item.customers.map((c: any) => `${c.name}: ${c.qty}`).join(" | ");
      // Escaping commas and quotes
      const safeProductName = `"${item.productName.replace(/"/g, '""')}"`;
      const safeCustomersStr = `"${customersStr.replace(/"/g, '""')}"`;
      
      csvContent += `${index + 1},${safeProductName},${safeCustomersStr},${item.totalQty}\n`;
    });

    // Tạo blob và trigger download
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `TPS1_SoanHang_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={handleExportCSV}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white border border-green-700 rounded-xl font-medium hover:bg-green-700 shadow-sm transition-colors"
      >
        <Download size={18} /> Tải file Excel (CSV)
      </button>
    </div>
  );
}
