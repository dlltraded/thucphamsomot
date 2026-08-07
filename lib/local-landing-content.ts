import type { ContentSection, FaqItem } from "@/lib/content";

export type LocalLandingPageConfig = {
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  chips: string[];
  sections: ContentSection[];
  faqs: FaqItem[];
  ctaLabel: string;
  quoteSlug: string;
  quoteTitle: string;
  quoteSummary: string;
  relatedLinks: { href: string; label: string }[];
};

const baseFaqs: FaqItem[] = [
  {
    question: "Trang này dành cho ai?",
    answer:
      "Trang này phù hợp với khách cần mua thực phẩm theo khu vực, muốn xem nhanh khu vực phục vụ, nhóm hàng phù hợp và cách gửi yêu cầu báo giá.",
  },
  {
    question: "Sau khi đọc xong nên làm gì?",
    answer:
      "Có thể chuyển sang form báo giá hoặc xem danh mục sản phẩm liên quan để chốt nhóm hàng, số lượng và lịch giao.",
  },
];

export const localLandingPages: Record<string, LocalLandingPageConfig> = {
  dongNai: {
    eyebrow: "Đồng Nai",
    title: "Cung cấp thực phẩm Đồng Nai cho bếp ăn, nhà máy và trường học",
    description:
      "Phù hợp với nhóm khách cần nguồn hàng định kỳ, báo giá nhanh và danh mục phù hợp cho bếp ăn, nhà máy, trường học và bệnh viện.",
    intro:
      "Phục vụ đơn vị ở Đồng Nai cần nguồn thực phẩm ổn định, giao đều và báo giá nhanh.",
    chips: ["Giao định kỳ", "Biên Hòa, Nhơn Trạch, Long Thành", "Danh mục + báo giá"],
    sections: [
      {
        heading: "Đồng Nai cần nguồn hàng ổn định cho bếp và nhà máy",
        body:
          "Người mua tại Đồng Nai thường cần nhà cung cấp giao đúng lịch, báo giá rõ và hỗ trợ danh mục mua hàng lặp lại. Khi trang nói rõ nhóm hàng và quy trình phản hồi, khách sẽ dễ ra quyết định hơn.",
        items: ["Giao theo khung giờ của bếp", "Danh mục phù hợp mua số lượng lớn", "Phản hồi báo giá theo nhu cầu thực tế"],
      },
      {
        heading: "Nhóm hàng nên nhấn mạnh ở Đồng Nai",
        body:
          "Trên trang này, nên ưu tiên nhắc đến rau củ quả, thịt cá hải sản, hàng đông lạnh, gia vị nhà bếp và thực phẩm chay để khách thấy ngay nhóm hàng có thể chốt theo menu.",
        items: ["Rau củ quả tươi sống", "Thịt cá hải sản tươi sống", "Hàng đông lạnh cho bếp công nghiệp", "Gia vị nhà bếp và thực phẩm chay"],
      },
      {
        heading: "Gửi báo giá ngay khi cần",
        body:
          "Sau khi xem trang, khách có thể đi thẳng sang form báo giá, hồ sơ năng lực hoặc các trang nhóm hàng liên quan để chốt nhu cầu nhanh.",
        items: ["CTA báo giá ở đầu và cuối trang", "Liên kết sang sản phẩm và ngành hàng", "FAQ về vùng giao, quy cách và thời gian phản hồi"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có nhận giao định kỳ tại Đồng Nai không?",
        answer:
          "Có. Trang này phục vụ nhóm khách cần nguồn hàng đều đặn tại Biên Hòa, Nhơn Trạch, Long Thành, Trảng Bom và khu vực lân cận.",
      },
      {
        question: "Nên đo hiệu quả trang này bằng gì?",
        answer:
          "Nên đo bằng lượt hiển thị với truy vấn địa phương, lượt click sang form báo giá, số đơn hỏi thật và số cuộc gọi hoặc Zalo phát sinh từ trang.",
      },
      {
        question: "Keyword nào phù hợp nhất?",
        answer:
          "Các keyword phù hợp gồm cung cấp thực phẩm Đồng Nai, nhà cung cấp thực phẩm Đồng Nai, báo giá thực phẩm định kỳ và thực phẩm cho bếp ăn tập thể Đồng Nai.",
      },
    ],
    ctaLabel: "BÁO GIÁ",
    quoteSlug: "thuc-pham-dong-nai",
    quoteTitle: "Cung cấp thực phẩm Đồng Nai",
    quoteSummary: "Báo giá cho nhu cầu mua định kỳ tại Đồng Nai.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-bien-hoa", label: "Cung cấp thực phẩm Biên Hòa" },
      { href: "/cung-cap-thuc-pham-nhon-trach", label: "Cung cấp thực phẩm Nhơn Trạch" },
      { href: "/cung-cap-thuc-pham-binh-duong", label: "Cung cấp thực phẩm Bình Dương" },
      { href: "/cung-cap-thuc-pham-tp-hcm", label: "Cung cấp thực phẩm TP.HCM" },
      { href: "/kien-thuc/bao-gia-thuc-pham-cho-bep-an-tap-the-o-bien-hoa", label: "Báo giá thực phẩm cho bếp ăn tập thể ở Biên Hòa" },
      { href: "/san-pham", label: "Xem danh mục sản phẩm" },
      { href: "/bao-gia", label: "Mở form báo giá" },
    ],
  },
  bienHoa: {
    eyebrow: "Biên Hòa",
    title: "Cung cấp thực phẩm Biên Hòa cho bếp ăn tập thể và nhà máy",
    description:
      "Phù hợp với khách cần nguồn hàng định kỳ tại Biên Hòa, ưu tiên báo giá ngắn cho bếp ăn, nhà máy và đơn vị suất ăn.",
    intro:
      "Phục vụ khách tại Biên Hòa cần giao theo tuyến, danh mục rõ và báo giá nhanh.",
    chips: ["Biên Hòa", "Nguồn hàng rõ", "Mua hàng B2B"],
    sections: [
      {
        heading: "Biên Hòa có nhu cầu mua hàng theo lịch vận hành",
        body:
          "Khách tại Biên Hòa thường cần nguồn cung đủ ổn định để bám ca làm việc, giờ giao nhận và menu hàng tuần. Vì vậy trang này cần trả lời rõ về khu vực giao, quy cách và cách lấy báo giá.",
        items: ["Giao theo lịch bếp", "Nhóm hàng dễ so sánh", "Phản hồi nhanh theo nhu cầu thật"],
      },
      {
        heading: "Nội dung nên nhấn mạnh ở Biên Hòa",
        body:
          "Nội dung hiệu quả nên tập trung vào giao nhận, nguồn hàng rõ, quy trình báo giá ngắn và khả năng phục vụ các đơn vị có nhu cầu lặp lại.",
        items: ["Bếp ăn tập thể", "Nhà máy, khu công nghiệp", "Trường học và bệnh viện"],
      },
      {
        heading: "Gửi báo giá nhanh",
        body:
          "Sau khi xem trang, khách có thể đi thẳng sang báo giá hoặc xem thêm hồ sơ năng lực và các trang liên quan để chốt nhu cầu nhanh.",
        items: ["CTA rõ", "FAQ ngắn gọn", "Liên kết về hồ sơ năng lực"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "Trang Biên Hòa khác gì trang Đồng Nai tổng?",
        answer:
          "Trang Biên Hòa tập trung vào nhu cầu tìm kiếm hẹp hơn, dễ tối ưu cho nhóm khách ở thành phố Biên Hòa và các khu công nghiệp lân cận.",
      },
      {
        question: "Có nên lặp keyword trên nhiều trang không?",
        answer:
          "Không. Trang này nên giữ một nhu cầu chính là cung cấp thực phẩm tại Biên Hòa, còn trang Đồng Nai là cụm rộng hơn.",
      },
    ],
    ctaLabel: "BÁO GIÁ",
    quoteSlug: "thuc-pham-bien-hoa",
    quoteTitle: "Cung cấp thực phẩm Biên Hòa",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Biên Hòa.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai" },
      { href: "/cung-cap-thuc-pham-binh-duong", label: "Cung cấp thực phẩm Bình Dương" },
      { href: "/cung-cap-thuc-pham-tp-hcm", label: "Cung cấp thực phẩm TP.HCM" },
      { href: "/lien-he", label: "Liên hệ nhanh" },
      { href: "/bao-gia", label: "Mở form báo giá" },
    ],
  },
  binhDuong: {
    eyebrow: "Bình Dương",
    title: "Cung cấp thực phẩm Bình Dương cho bếp ăn và nhà máy",
    description:
      "Phù hợp với khách cần nguồn hàng định kỳ tại Bình Dương, ưu tiên giao đều và phản hồi báo giá nhanh cho bếp ăn, nhà máy và đơn vị suất ăn.",
    intro:
      "Phục vụ đơn vị ở Bình Dương cần giao định kỳ, danh mục rõ và lịch nhận hàng ổn định.",
    chips: ["Giao định kỳ", "Khách B2B", "Danh mục rõ"],
    sections: [
      {
        heading: "Bình Dương là thị trường cần giao hàng ổn định",
        body:
          "Trang này hướng tới khách ở Bình Dương thường xuyên mua hàng cho bếp ăn, nhà máy và đơn vị suất ăn. Nội dung cần làm rõ tuyến giao, số lượng và cách nhận báo giá.",
        items: ["Giao đúng lịch", "Danh mục rõ", "Báo giá nhanh"],
      },
      {
        heading: "Nhóm hàng thường được hỏi",
        body:
          "Ở Bình Dương, khách thường quan tâm đến rau củ quả, thịt cá, hàng đông lạnh, gia vị và thực phẩm chay cho các menu thay đổi theo ca và theo tuần.",
        items: ["Rau củ quả", "Thịt cá hải sản", "Hàng đông lạnh", "Gia vị", "Thực phẩm chay"],
      },
      {
        heading: "Chốt nhu cầu nhanh",
        body:
          "Sau khi xem trang, khách có thể chuyển thẳng sang form báo giá hoặc hồ sơ năng lực để nhận phản hồi nhanh hơn.",
        items: ["CTA rõ", "Hồ sơ năng lực", "FAQ ngắn về giao hàng"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có giao Bình Dương không?",
        answer: "Có, nếu tuyến và lịch giao phù hợp nhu cầu thực tế của đơn vị.",
      },
      {
        question: "Nên tách riêng Bình Dương với Đồng Nai không?",
        answer:
          "Có. Đây là hai cụm tìm kiếm khác nhau và nên có landing page riêng để tránh loãng nội dung.",
      },
    ],
    ctaLabel: "BÁO GIÁ",
    quoteSlug: "thuc-pham-binh-duong",
    quoteTitle: "Cung cấp thực phẩm Bình Dương",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Bình Dương.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai" },
      { href: "/cung-cap-thuc-pham-tp-hcm", label: "Cung cấp thực phẩm TP.HCM" },
      { href: "/kien-thuc/bao-gia-thuc-pham-cho-bep-an-tap-the-o-binh-duong", label: "Báo giá thực phẩm cho bếp ăn tập thể ở Bình Dương" },
      { href: "/san-pham", label: "Xem danh mục sản phẩm" },
      { href: "/bao-gia", label: "Mở form báo giá" },
    ],
  },
  nhonTrach: {
    eyebrow: "Nhơn Trạch",
    title: "Cung cấp thực phẩm KCN Nhơn Trạch cho bếp ăn công nghiệp",
    description:
      "Chuyên cung cấp thực phẩm B2B cho bếp ăn công nghiệp, nhà máy tại khu công nghiệp Nhơn Trạch. Nguồn hàng ổn định, báo giá rõ ràng.",
    intro:
      "Phục vụ khu công nghiệp Nhơn Trạch với nhu cầu mua thực phẩm số lượng lớn cho bếp ăn công nghiệp.",
    chips: ["Khu công nghiệp", "Bếp ăn công nghiệp", "Khách B2B"],
    sections: [
      {
        heading: "Nhơn Trạch - Nơi tập trung bếp ăn công nghiệp lớn",
        body:
          "Các nhà máy tại KCN Nhơn Trạch cần nguồn thực phẩm cực kỳ ổn định và quy trình giao nhận chuẩn xác để đảm bảo ca ăn cho hàng ngàn công nhân.",
        items: ["Giao đúng khung giờ", "Thực phẩm có xuất xứ rõ ràng", "Phù hợp ngân sách suất ăn công nghiệp"],
      },
      {
        heading: "Nhu cầu tìm kiếm chính của khách",
        body:
          "Người mua tại Nhơn Trạch ưu tiên đối tác có năng lực cung ứng lớn, hóa đơn VAT đầy đủ và chứng nhận an toàn (ISO, HACCP).",
        items: ["Thịt, cá, trứng số lượng lớn", "Rau củ tươi hàng ngày", "Gia vị công nghiệp"],
      },
      {
        heading: "Gửi báo giá đúng nhu cầu",
        body:
          "Khách có thể gửi trực tiếp danh mục cần báo giá qua Zalo hoặc Form để nhận bảng giá sát với thực tế nhất.",
        items: ["Báo giá nhanh 24h", "Hỗ trợ Zalo 24/7", "Đầy đủ hồ sơ năng lực"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có đủ năng lực cung cấp cho KCN quy mô lớn không?",
        answer:
          "Có. TPS1 đang cung ứng cho nhiều bếp ăn công nghiệp với công suất hàng ngàn suất ăn/ngày tại Nhơn Trạch và các KCN lân cận.",
      },
    ],
    ctaLabel: "NHẬN BÁO GIÁ",
    quoteSlug: "thuc-pham-nhon-trach",
    quoteTitle: "Cung cấp thực phẩm Nhơn Trạch",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Nhơn Trạch.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai" },
      { href: "/cung-cap-thuc-pham-phu-my", label: "Cung cấp thực phẩm Phú Mỹ" },
      { href: "/san-pham", label: "Xem danh mục sản phẩm" },
      { href: "/bao-gia", label: "Mở form báo giá" },
    ],
  },
  baRiaVungTau: {
    eyebrow: "Bà Rịa - Vũng Tàu",
    title: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu cho bếp ăn và nhà máy",
    description:
      "Phù hợp với khách cần nguồn hàng định kỳ tại Bà Rịa - Vũng Tàu, ưu tiên giao đều và phản hồi báo giá nhanh cho bếp ăn, nhà máy và đơn vị suất ăn.",
    intro:
      "Phục vụ đơn vị ở Bà Rịa - Vũng Tàu cần giao định kỳ, danh mục rõ và lịch nhận hàng ổn định.",
    chips: ["Giao định kỳ", "Bà Rịa - Vũng Tàu", "Danh mục + báo giá"],
    sections: [
      {
        heading: "Dịch vụ cung cấp thực phẩm tại Bà Rịa - Vũng Tàu",
        body:
          "TPS1 cung cấp thực phẩm giá sỉ cho các bếp ăn tập thể, nhà máy, bệnh viện tại khu vực Bà Rịa - Vũng Tàu. Chúng tôi cam kết nguồn hàng ổn định, đầy đủ hóa đơn VAT và chứng nhận vệ sinh an toàn thực phẩm.",
        items: ["Cung ứng số lượng lớn", "Hóa đơn VAT minh bạch", "Đạt chuẩn an toàn"],
      },
    ],
    faqs: [
      {
        question: "TPS1 có giao hàng tận nơi tại Bà Rịa - Vũng Tàu không?",
        answer: "Có, chúng tôi có đội xe tải chuyên dụng và giao hàng tận nơi cho các doanh nghiệp, nhà máy, bếp ăn tập thể tại Bà Rịa - Vũng Tàu mỗi ngày.",
      },
      {
        question: "Cần lấy hóa đơn VAT không?",
        answer: "TPS1 cung cấp hóa đơn VAT 100% hợp lệ cho mọi giao dịch, hỗ trợ khách hàng doanh nghiệp kê khai đầy đủ.",
      }
    ],
    ctaLabel: "NHẬN BÁO GIÁ",
    quoteSlug: "thuc-pham-vung-tau",
    quoteTitle: "Báo Giá Thực Phẩm Bà Rịa - Vũng Tàu",
    quoteSummary: "Báo giá nhanh cho khách hàng tại Bà Rịa - Vũng Tàu",
    relatedLinks: [
      { href: "/san-pham", label: "Danh mục sản phẩm" },
      { href: "/bao-gia", label: "Mở form báo giá" },
    ],
  },
  tpHcm: {
    eyebrow: "TP. Hồ Chí Minh",
    title: "Cung cấp thực phẩm TP. Hồ Chí Minh cho bếp ăn công nghiệp",
    description:
      "Giải pháp cung ứng thực phẩm toàn diện cho các bếp ăn công nghiệp, suất ăn nhà máy, trường học, bệnh viện tại TP. Hồ Chí Minh.",
    intro:
      "Phục vụ đơn vị ở TP. Hồ Chí Minh cần giao định kỳ, danh mục rõ và lịch nhận hàng ổn định.",
    chips: ["Giao định kỳ", "TP. Hồ Chí Minh", "Danh mục + báo giá"],
    sections: [
      {
        heading: "Dịch vụ cung cấp thực phẩm tại TP. Hồ Chí Minh",
        body:
          "TPS1 cung cấp thực phẩm giá sỉ cho các bếp ăn tập thể, nhà máy, bệnh viện tại khu vực TP. Hồ Chí Minh. Tuyến giao xuất phát từ kho Đồng Nai, đi qua Nhơn Trạch/Long Thành nên chủ động được khung giờ giao cho khu Đông và trung tâm TP.HCM. Cam kết nguồn hàng ổn định, đầy đủ hóa đơn VAT và chứng nhận vệ sinh an toàn thực phẩm.",
        items: ["Giao hàng linh hoạt theo khung giờ bếp", "Đa dạng danh mục hàng hóa", "Kiểm định định kỳ, có hồ sơ truy xuất"],
      },
      {
        heading: "Nhóm hàng khách TP.HCM hỏi nhiều nhất",
        body:
          "Với các bếp ăn quy mô lớn và bếp ăn công nghiệp tại TP.HCM, nhóm hàng được đặt mua thường xuyên nhất là rau củ quả, thịt cá hải sản, hàng đông lạnh, gia vị nhà bếp và thực phẩm chay cho menu đa dạng.",
        items: ["Rau củ quả tươi theo mùa", "Thịt cá hải sản tươi sống", "Hàng đông lạnh dự trữ", "Gia vị và thực phẩm chay"],
      },
      {
        heading: "Quy trình nhận báo giá nhanh",
        body:
          "Khách chỉ cần gửi nhóm hàng cần mua, số lượng dự kiến và địa điểm giao tại TP.HCM — đội kinh doanh phản hồi báo giá trong ngày làm việc và xác nhận lịch giao trước khi nhận đơn đầu tiên.",
        items: ["Gửi yêu cầu qua form hoặc Zalo", "Nhận báo giá trong 24h", "Thống nhất lịch giao trước khi chốt đơn"],
      },
    ],
    faqs: [
      {
        question: "TPS1 giao hàng tới những khu vực nào ở TP.HCM?",
        answer:
          "Tập trung ở TP. Thủ Đức và các khu vực giáp Đồng Nai (do tuyến giao xuất phát từ kho Biên Hòa). Các quận huyện xa hơn vẫn nhận đơn nếu số lượng và lịch giao phù hợp với tuyến vận chuyển hiện có.",
      },
      {
        question: "Đặt hàng lần đầu cần chuẩn bị gì?",
        answer:
          "Gửi danh mục hàng cần mua, số lượng dự kiến mỗi lần giao, tần suất giao (ngày/tuần) và địa chỉ nhận hàng. TPS1 sẽ tư vấn quy cách và gửi báo giá phù hợp trong ngày.",
      },
      {
        question: "Thanh toán công nợ như thế nào?",
        answer: "Hỗ trợ linh hoạt các hình thức thanh toán công nợ theo thỏa thuận riêng cho khách hàng doanh nghiệp mua định kỳ.",
      },
    ],
    ctaLabel: "NHẬN BÁO GIÁ",
    quoteSlug: "thuc-pham-tp-hcm",
    quoteTitle: "Báo Giá Thực Phẩm TP. Hồ Chí Minh",
    quoteSummary: "Báo giá nhanh cho khách hàng tại TP. Hồ Chí Minh",
    relatedLinks: [
      { href: "/kien-thuc/cach-chon-nha-cung-cap-thuc-pham-cho-nha-may-o-tp-hcm", label: "Cách chọn nhà cung cấp thực phẩm cho nhà máy ở TP.HCM" },
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai" },
      { href: "/cung-cap-thuc-pham-nhon-trach", label: "Cung cấp thực phẩm Nhơn Trạch" },
      { href: "/san-pham", label: "Danh mục sản phẩm" },
      { href: "/bao-gia", label: "Mở form báo giá" },
    ],
  },
  phuMy: {
    eyebrow: "Phú Mỹ",
    title: "Cung cấp thực phẩm KCN Phú Mỹ cho bếp ăn nhà máy",
    description:
      "Chuyên cung cấp rau củ, thịt cá, gia vị cho các bếp ăn công nghiệp, nhà máy thép, cảng biển tại thị xã Phú Mỹ. Giao hàng tận nơi, báo giá nhanh.",
    intro:
      "Nguồn cung thực phẩm uy tín cho các bếp ăn công nghiệp quy mô lớn tại KCN Phú Mỹ.",
    chips: ["Cụm cảng - KCN", "Bếp ăn công nghiệp", "Thực phẩm giá sỉ"],
    sections: [
      {
        heading: "Giải pháp thực phẩm cho nhà máy KCN Phú Mỹ",
        body:
          "KCN Phú Mỹ với đặc thù công nghiệp nặng cần suất ăn đủ chất lượng. TPS1 cam kết cung ứng thực phẩm tươi sạch, đúng giờ cho các ca ăn liên tục.",
        items: ["Giao hàng 24/7", "Năng lực cung ứng lớn", "Đầy đủ hóa đơn, chứng từ an toàn thực phẩm"],
      },
      {
        heading: "Danh mục thực phẩm phù hợp",
        body:
          "Chúng tôi cung cấp đầy đủ từ thịt cá, hải sản tươi sống đến rau củ quả, đồ khô, đồ hộp và gia vị dùng trong bếp ăn công nghiệp.",
        items: ["Gia vị công nghiệp", "Rau củ quả tươi", "Thịt cá tươi sống, đông lạnh"],
      },
      {
        heading: "Nhận báo giá nhanh",
        body:
          "Chỉ cần gửi danh sách thực phẩm cần mua, TPS1 sẽ báo giá cạnh tranh nhất cho đơn vị của bạn.",
        items: ["Giá cạnh tranh", "Phản hồi Zalo nhanh", "Báo giá theo sản lượng"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có giao hàng đến tận các nhà máy ở KCN Phú Mỹ không?",
        answer: "Có, đội xe tải lạnh của TPS1 giao hàng trực tiếp đến tận kho bếp của các nhà máy tại KCN Phú Mỹ.",
      },
    ],
    ctaLabel: "NHẬN BÁO GIÁ",
    quoteSlug: "thuc-pham-phu-my",
    quoteTitle: "Cung cấp thực phẩm Phú Mỹ",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Phú Mỹ.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-ba-ria-vung-tau", label: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu" },
      { href: "/cung-cap-thuc-pham-nhon-trach", label: "Cung cấp thực phẩm Nhơn Trạch" },
      { href: "/san-pham", label: "Xem danh mục sản phẩm" },
    ],
  },
  hoNai: {
    eyebrow: "Hố Nai",
    title: "Cung cấp thực phẩm KCN Hố Nai - Bữa ăn an toàn cho công nhân",
    description:
      "Thấu hiểu áp lực của bếp trưởng, TPS1 mang đến nguồn thực phẩm tươi ngon, giao tận bếp từ mờ sáng tại Hố Nai. Giúp bạn an tâm trong từng suất ăn.",
    intro:
      "Không chỉ giao thực phẩm, chúng tôi giao sự an tâm và cam kết đồng hành cùng bếp ăn công nghiệp tại Hố Nai.",
    chips: ["Giao từ 4h sáng", "Rau củ tươi rói", "Thấu hiểu nỗi đau bếp"],
    sections: [
      {
        heading: "Thấu hiểu nỗi vất vả của từng ca bếp",
        body:
          "Chúng tôi biết áp lực của bạn khi phải chuẩn bị hàng ngàn suất ăn mỗi ngày. Tại Hố Nai, TPS1 cam kết giao hàng tận nơi từ mờ sáng, rau củ luôn tươi rói, thịt cá cắt thái sẵn sàng để bạn tiết kiệm từng phút giây.",
        items: ["Giao chuẩn giờ bếp cần", "Sơ chế theo yêu cầu khắt khe", "Luôn có phương án dự phòng"],
      },
      {
        heading: "Bảo vệ sức khỏe hàng ngàn công nhân",
        body:
          "Một bữa ăn ngon không chỉ nạp năng lượng mà còn là sự quan tâm của doanh nghiệp. Mọi nguyên liệu từ TPS1 đều qua kiểm định nghiêm ngặt, chuẩn VietGAP, đảm bảo an toàn tuyệt đối cho người lao động.",
        items: ["Chứng nhận VSATTP 100%", "Truy xuất nguồn gốc rõ ràng", "Chất lượng không thỏa hiệp"],
      },
      {
        heading: "Bình ổn giá cả, chia sẻ gánh nặng",
        body:
          "Biến động thị trường luôn là nỗi lo lớn nhất của bộ phận thu mua. TPS1 ký kết hợp đồng bình ổn giá dài hạn, giúp doanh nghiệp tại Hố Nai dễ dàng kiểm soát định mức suất ăn.",
        items: ["Cam kết giữ giá ổn định", "Chiết khấu sát giá gốc", "Thanh toán công nợ linh hoạt"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có nhận cung cấp hàng sơ chế sẵn để kịp ca sáng không?",
        answer: "Chắc chắn rồi. Chúng tôi thấu hiểu áp lực thời gian của ca sáng, nên các mặt hàng đều được gọt rửa, cắt thái theo đúng định lượng bạn yêu cầu trước khi giao đến Hố Nai.",
      },
    ],
    ctaLabel: "NHẬN BÁO GIÁ",
    quoteSlug: "thuc-pham-ho-nai",
    quoteTitle: "Cung cấp thực phẩm Hố Nai",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Hố Nai.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-bien-hoa", label: "Cung cấp thực phẩm Biên Hòa" },
      { href: "/san-pham", label: "Xem danh mục sản phẩm" },
    ],
  },
  tamPhuoc: {
    eyebrow: "Tam Phước",
    title: "Cung cấp thực phẩm KCN Tam Phước - Trọn vẹn vị ngon, trọn niềm tin",
    description:
      "Nhà cung cấp sỉ thực phẩm tận tâm cho bếp ăn công nghiệp tại Tam Phước. Nguyên liệu dồi dào, giá cả minh bạch, giao hàng không sai một phút.",
    intro:
      "Đối tác tin cậy phía sau những bữa ăn chất lượng của hàng chục ngàn người lao động tại KCN Tam Phước.",
    chips: ["Cung ứng số lượng lớn", "Hóa đơn VAT minh bạch", "Đối tác chiến lược"],
    sections: [
      {
        heading: "Đồng hành cùng sự phát triển của Tam Phước",
        body:
          "Khối lượng công việc khổng lồ của các nhà máy tại Tam Phước đòi hỏi một hậu phương vững chắc. TPS1 tự hào là người đứng sau, đảm bảo nhà ăn luôn đỏ lửa với nguồn nguyên liệu dồi dào nhất.",
        items: ["Khả năng cung ứng vô tận", "Giải quyết nhanh phát sinh", "Lắng nghe mọi phản hồi"],
      },
      {
        heading: "Thực đơn phong phú, công nhân khỏi chán",
        body:
          "Thay đổi thực đơn là bài toán khó. Với kho hàng đa dạng từ đồ tươi sống đến gia vị, đồ khô, chúng tôi giúp bếp trưởng biến hóa món ăn mỗi ngày mà không lo thiếu hụt nguyên liệu.",
        items: ["Đầy đủ nhóm hàng thiết yếu", "Gia vị, đồ khô đa dạng", "Thực phẩm chay phong phú"],
      },
      {
        heading: "Minh bạch và chuẩn chỉnh hồ sơ",
        body:
          "Làm việc với các công ty lớn đòi hỏi sự minh bạch tuyệt đối. TPS1 cung cấp đầy đủ hóa đơn chứng từ, giấy chứng nhận kiểm dịch, giúp bộ phận kế toán và mua hàng hoàn toàn yên tâm.",
        items: ["Cung cấp VAT đầy đủ", "Lưu trữ hồ sơ chất lượng", "Quy trình làm việc chuyên nghiệp"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có hỗ trợ đổi trả hàng nếu bếp phát hiện hàng kém tươi không?",
        answer: "Có. Trách nhiệm của TPS1 là mang đến chất lượng tốt nhất. Nếu phát hiện sai sót, chúng tôi đổi trả 100% ngay lập tức để không làm gián đoạn bữa ăn của công nhân.",
      },
    ],
    ctaLabel: "GỬI YÊU CẦU",
    quoteSlug: "thuc-pham-tam-phuoc",
    quoteTitle: "Cung cấp thực phẩm Tam Phước",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Tam Phước.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-bien-hoa", label: "Cung cấp thực phẩm Biên Hòa" },
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai" },
    ],
  },
  vinhCuu: {
    eyebrow: "Vĩnh Cửu",
    title: "Cung cấp thực phẩm Vĩnh Cửu - Nguồn dưỡng chất cho người lao động",
    description:
      "Chăm lo sức khỏe công nhân bằng nguồn thực phẩm tươi sạch, an toàn. Phân phối sỉ tại Vĩnh Cửu với sự tận tâm và chuyên nghiệp cao nhất.",
    intro:
      "Mỗi bữa ăn là một nguồn động viên. TPS1 mang thực phẩm tươi ngon đến tận bếp ăn nhà máy tại Vĩnh Cửu.",
    chips: ["Thực phẩm sạch", "Giao đúng tuyến", "Chăm lo sức khỏe"],
    sections: [
      {
        heading: "Tâm huyết trong từng bó rau, thớ thịt",
        body:
          "Tại Vĩnh Cửu, chúng tôi hiểu rằng mỗi suất ăn đều quyết định năng suất làm việc của cả một xí nghiệp. TPS1 cẩn trọng lựa chọn từng nguồn hàng, loại bỏ hàng tồn, chỉ giao hàng tươi mới nhất trong ngày.",
        items: ["Chắt lọc từ nguồn gốc", "Giao hàng ngay khi thu hoạch", "Nói không với chất bảo quản độc hại"],
      },
      {
        heading: "Kho hàng thế mạnh, giá tận gốc",
        body:
          "Không qua trung gian, TPS1 kết nối trực tiếp với các vùng trồng trọt và trang trại chăn nuôi lớn, mang đến mức giá sỉ cực tốt cho các công ty tại Vĩnh Cửu.",
        items: ["Thịt heo, gà tươi mỗi ngày", "Rau xanh mướt từ nông trại", "Chi phí được tối ưu tối đa"],
      },
      {
        heading: "Quy trình hợp tác thấu tình đạt lý",
        body:
          "Chúng tôi không ép doanh số, không gò bó điều khoản. TPS1 luôn linh hoạt điều chỉnh theo tình hình thực tế của nhà ăn, sẵn sàng cung cấp hàng mẫu để khách hàng trải nghiệm trước.",
        items: ["Được thử nghiệm hàng mẫu", "Linh hoạt số lượng mỗi ngày", "Dịch vụ khách hàng tận tâm 24/7"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "Thời gian giao hàng tại Vĩnh Cửu có đảm bảo kịp ca sáng sớm không?",
        answer: "Chắc chắn. Đội xe của TPS1 luôn khởi hành từ rất sớm để có mặt tại Vĩnh Cửu đúng khung giờ 4h - 6h sáng, giúp bếp trưởng dư dả thời gian nấu nướng.",
      },
    ],
    ctaLabel: "GỬI YÊU CẦU",
    quoteSlug: "thuc-pham-vinh-cuu",
    quoteTitle: "Cung cấp thực phẩm Vĩnh Cửu",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Vĩnh Cửu.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai" },
      { href: "/cung-cap-thuc-pham-bien-hoa", label: "Cung cấp thực phẩm Biên Hòa" },
    ],
  },
  amata: {
    eyebrow: "KCN Amata",
    title: "Cung cấp thực phẩm KCN Amata - Đạt chuẩn khắt khe cho doanh nghiệp FDI",
    description:
      "Giải pháp cung ứng thực phẩm hoàn hảo cho các nhà máy FDI tại Amata. Đáp ứng mọi tiêu chuẩn HACCP, ISO khắt khe nhất với sự tận tâm.",
    intro:
      "Đẳng cấp của bữa ăn công nghiệp đến từ sự khắt khe trong việc chọn lựa nguyên liệu tại KCN Amata.",
    chips: ["Tiêu chuẩn quốc tế", "Phục vụ FDI", "Quy trình nghiêm ngặt"],
    sections: [
      {
        heading: "Đạt chuẩn khắt khe của doanh nghiệp nước ngoài",
        body:
          "Các nhà máy FDI tại Amata luôn đặt yếu tố an toàn lên hàng đầu. Thấu hiểu điều đó, TPS1 vận hành kho bãi và quy trình giao nhận theo tiêu chuẩn nghiêm ngặt nhất, sẵn sàng đón các đoàn đánh giá từ nhà máy.",
        items: ["Đạt chuẩn ISO 22000 & HACCP", "Quy trình minh bạch rõ ràng", "Kiểm định định kỳ"],
      },
      {
        heading: "Tuyệt đối an toàn, bảo vệ thương hiệu",
        body:
          "Sự cố an toàn thực phẩm là thảm họa với bất kỳ doanh nghiệp nào. Chúng tôi áp dụng quy trình kiểm soát 3 lớp, đảm bảo mỗi chuyến xe tiến vào KCN Amata đều chở theo sự an tâm tuyệt đối.",
        items: ["Sàng lọc 3 bước nghiêm ngặt", "Đóng gói theo tiêu chuẩn", "Lưu trữ mẫu lưu cẩn thận"],
      },
      {
        heading: "Chuyên nghiệp trong từng văn bản",
        body:
          "Ngoài chất lượng hàng hóa, đội ngũ TPS1 còn am hiểu thủ tục hành chính, cung cấp đầy đủ bảng phân tích chất lượng, chứng từ truy xuất nguồn gốc để hỗ trợ bộ phận Compliance (Tuân thủ) của đối tác.",
        items: ["Hồ sơ năng lực chuẩn mực", "Hỗ trợ thanh tra vệ sinh", "Hệ thống báo cáo chi tiết"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có đủ giấy tờ để cung cấp cho các tập đoàn FDI tại Amata không?",
        answer: "Hoàn toàn đủ. Chúng tôi tự hào sở hữu các chứng nhận uy tín nhất (ISO 22000, HACCP) và luôn sẵn sàng minh bạch mọi giấy tờ kiểm dịch thú y, thực vật cho từng lô hàng.",
      },
    ],
    ctaLabel: "NHẬN BÁO GIÁ",
    quoteSlug: "thuc-pham-amata",
    quoteTitle: "Cung cấp thực phẩm KCN Amata",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại KCN Amata.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-bien-hoa", label: "Cung cấp thực phẩm Biên Hòa" },
      { href: "/cung-cap-thuc-pham-long-thanh", label: "Cung cấp thực phẩm Long Thành" },
    ],
  },
  trangBom: {
    eyebrow: "Trảng Bom",
    title: "Cung cấp thực phẩm Trảng Bom - Đồng hành cùng hàng ngàn công nhân",
    description:
      "Phân phối sỉ thực phẩm tận tâm cho bếp ăn công nghiệp tại Trảng Bom (Bàu Xéo, Giang Điền). Cam kết chất lượng, sẻ chia vất vả cùng bếp trưởng.",
    intro:
      "Trảng Bom sôi động với những nhà máy lớn. Chúng tôi tiếp sức bằng những chuyến xe thực phẩm tươi ngon mỗi rạng sáng.",
    chips: ["Bàu Xéo & Giang Điền", "Năng lực mạnh mẽ", "Gắn bó dài lâu"],
    sections: [
      {
        heading: "Chia sẻ áp lực quy mô lớn",
        body:
          "Tại Trảng Bom, nhiều nhà máy có quy mô hàng chục ngàn công nhân. Để phục vụ số lượng lớn mà không sai sót là một kỳ tích. TPS1 có đủ năng lực kho bãi và đội xe hùng hậu để đảm bảo nguồn hàng luôn dồi dào, không đứt gãy.",
        items: ["Đáp ứng vài tấn hàng mỗi ngày", "Quản lý logistics chuyên nghiệp", "Cam kết không bao giờ thiếu hụt"],
      },
      {
        heading: "Chất lượng không phai nhạt theo số lượng",
        body:
          "Dù đơn hàng lên tới hàng ngàn suất, chúng tôi vẫn nâng niu từng búp rau, thớ thịt. Việc kiểm soát chất lượng đồng đều giúp bếp trưởng yên tâm chế biến mà không phải nhặt bỏ đồ hư hỏng.",
        items: ["Tươi ngon đồng đều", "Tỷ lệ hao hụt cực thấp", "Bảo quản kho lạnh tiêu chuẩn"],
      },
      {
        heading: "Đội ngũ giao hàng như những người bạn",
        body:
          "Tài xế và nhân viên giao hàng của TPS1 không chỉ bê vác, họ còn hỗ trợ sắp xếp gọn gàng vào kho bếp, thái độ luôn vui vẻ, hòa nhã để khởi đầu một ngày mới thật suôn sẻ cho các cô chú nhà bếp.",
        items: ["Giao nhận thân thiện, lễ phép", "Hỗ trợ sắp xếp kho bãi", "Tác phong nhanh nhẹn"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "Bếp ăn tại KCN Bàu Xéo và Giang Điền có được miễn phí vận chuyển không?",
        answer: "Hoàn toàn miễn phí. Tất cả các hợp đồng dài hạn tại khu vực Trảng Bom đều được TPS1 bao trọn gói vận chuyển tận nơi.",
      },
    ],
    ctaLabel: "NHẬN BÁO GIÁ",
    quoteSlug: "thuc-pham-trang-bom",
    quoteTitle: "Cung cấp thực phẩm Trảng Bom",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Trảng Bom.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai" },
      { href: "/cung-cap-thuc-pham-amata", label: "Cung cấp thực phẩm KCN Amata" },
    ],
  },
  longThanh: {
    eyebrow: "Long Thành",
    title: "Cung cấp thực phẩm Long Thành - Đón đầu sức sống mới",
    description:
      "TPS1 cung cấp thực phẩm giá sỉ cho nhà máy, xí nghiệp khu vực Long Thành. Mang sự tận tâm vào từng bữa ăn, cùng doanh nghiệp bứt phá.",
    intro:
      "Long Thành đang vươn mình mạnh mẽ, và TPS1 sẵn sàng đồng hành cung cấp nguồn dưỡng chất cho lực lượng lao động nơi đây.",
    chips: ["KCN Lộc An & Bình Sơn", "Tiềm lực cung ứng", "An tâm sản xuất"],
    sections: [
      {
        heading: "Sẵn sàng đáp ứng khu vực trọng điểm",
        body:
          "Với sự bứt phá của khu vực sân bay và các KCN lân cận (Lộc An, Bình Sơn, An Phước), nhu cầu về suất ăn công nghiệp đang tăng cao. TPS1 đã chuẩn bị sẵn sàng nguồn lực để phục vụ các bếp ăn tại Long Thành với tốc độ và sự bền bỉ.",
        items: ["Mạng lưới cung ứng vững chắc", "Đón đầu nhu cầu lớn", "Chủ động phương án giao hàng"],
      },
      {
        heading: "Đa dạng hóa, giảm tải nỗi lo nghĩ menu",
        body:
          "Làm sao để công nhân ăn ngon, đủ chất mà không vượt định mức? Bằng việc cung cấp danh mục phong phú từ bình dân đến cao cấp, TPS1 sẽ cùng bếp trưởng gỡ rối bài toán khó nhằn này.",
        items: ["Tư vấn tối ưu định mức suất ăn", "Nguồn thực phẩm giá gốc", "Nguyên liệu tươi mới theo ngày"],
      },
      {
        heading: "Một lời hứa, vạn niềm tin",
        body:
          "Chúng tôi tâm niệm, làm ngành thực phẩm phải có 'Tâm'. Mọi lời hứa về thời gian, chất lượng, và giá cả đều được TPS1 thực hiện nghiêm túc, trở thành bệ phóng vững chắc cho sự phát triển của các đối tác.",
        items: ["Giữ chữ tín làm đầu", "Giải quyết khiếu nại trong 1 giờ", "Hợp tác minh bạch, win-win"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "Đường xá khu vực Long Thành hay kẹt xe, TPS1 có đảm bảo giao đúng giờ không?",
        answer: "Đội ngũ vận hành của TPS1 luôn tính toán kỹ lưỡng lộ trình và khởi hành sớm, thậm chí có phương án xe dự phòng, đảm bảo không bao giờ để bếp ăn phải chờ đợi.",
      },
    ],
    ctaLabel: "NHẬN BÁO GIÁ",
    quoteSlug: "thuc-pham-long-thanh",
    quoteTitle: "Cung cấp thực phẩm Long Thành",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Long Thành.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai" },
      { href: "/cung-cap-thuc-pham-nhon-trach", label: "Cung cấp thực phẩm Nhơn Trạch" },
    ],
  },
};
