export function fmtMoney(value: number | string | null | undefined): string {
  if (value == null) return "0 đ";
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
}

export function fmtDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
