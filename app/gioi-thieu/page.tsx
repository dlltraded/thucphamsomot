import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = makeMetadata({
  title: "Giới thiệu",
  description: "Định vị thương hiệu, hướng phục vụ và giá trị cốt lõi của Thực Phẩm Số 1.",
  path: "/gioi-thieu",
});

export default function GioiThieuPage() {
  return (
    <PageShell
      eyebrow="Giới thiệu"
      title="Thực Phẩm Số 1 phục vụ khách hàng mua thực phẩm theo hệ thống"
      description="Thực Phẩm Số 1 tập trung cung ứng thực phẩm cho bếp ăn tập thể, suất ăn công nghiệp, trường học, bệnh viện, nhà hàng và khách sạn."
    >
      <ContentPage
        title="Nguồn hàng ổn định cho bếp ăn, nhà hàng và suất ăn công nghiệp"
        description={`Thực Phẩm Số 1 tập trung vào ${siteConfig.localities.join(", ")} và các khu vực lân cận, với định vị rõ ràng cho bếp ăn tập thể, trường học, bệnh viện, nhà hàng, khách sạn và suất ăn công nghiệp.`}
        bullets={[
          "Nguồn hàng ổn định, dễ kiểm soát",
          "Danh mục phù hợp bếp quy mô lớn",
          "Tư vấn menu và quy cách giao hàng",
          "Thông tin rõ để khách dễ gửi yêu cầu báo giá",
        ]}
        sections={[
          {
            heading: "Định vị phục vụ",
            body:
              "Thực Phẩm Số 1 không đi theo hướng bán lẻ rời rạc. Danh mục được tổ chức theo sản phẩm, ngành hàng và nhu cầu báo giá để khách B2B tìm nhanh đúng nhóm hàng cần mua.",
            items: ["Rau củ quả", "Thịt cá hải sản", "Hàng đông lạnh", "Gia vị", "Thực phẩm chay"],
          },
        ]}
      />
    </PageShell>
  );
}
