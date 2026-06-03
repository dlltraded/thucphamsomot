import { brandAssets } from "@/lib/brand";

const knowledgeCoverBySlug: Record<string, string> = {
  "cach-lap-menu-bep-an-tap-the": brandAssets.kitchen,
  "cach-chon-nha-cung-cap-thuc-pham": brandAssets.warehouseWide,
  "tieu-chuan-chon-rau-cu-qua": brandAssets.vegetables,
  "phuong-phap-cap-dong-thuc-pham": brandAssets.frozen,
  "checklist-gui-yeu-cau-bao-gia-nhanh": brandAssets.team,
  "cach-chon-thuc-pham-cho-bep-an-tap-the": brandAssets.coverFood,
  "quy-trinh-nhan-hang-thuc-pham-tai-bep-cong-nghiep": brandAssets.deliveryLoading,
  "cach-lua-chon-nha-cung-cap-thuc-pham-dong-nai": brandAssets.sourceFarm,
};

export function getKnowledgeCover(slug: string) {
  return knowledgeCoverBySlug[slug] ?? brandAssets.coverFood;
}
