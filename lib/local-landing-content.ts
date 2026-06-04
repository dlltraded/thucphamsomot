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
    question: "Trang local này dùng để làm gì?",
    answer:
      "Trang được viết cho nhu cầu tìm kiếm địa phương, giúp người mua thấy rõ khu vực phục vụ, nhóm hàng phù hợp và cách gửi yêu cầu báo giá nhanh.",
  },
  {
    question: "Khách nên làm gì sau khi đọc trang?",
    answer:
      "Nên chuyển sang form báo giá hoặc xem danh mục sản phẩm liên quan để chốt nhóm hàng, số lượng và lịch giao thay vì chỉ dừng ở mức đọc thông tin.",
  },
];

export const localLandingPages: Record<string, LocalLandingPageConfig> = {
  dongNai: {
    eyebrow: "Đồng Nai",
    title: "Cung cấp thực phẩm Đồng Nai cho bếp ăn, nhà máy và trường học",
    description:
      "Trang đích local cho nhóm khách cần nguồn hàng định kỳ, báo giá nhanh và danh mục phù hợp bếp ăn, nhà máy, trường học và bệnh viện.",
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
      "Trang đích local cho khách cần nguồn hàng định kỳ tại Biên Hòa, ưu tiên khách hỏi mua thật và quy trình báo giá ngắn cho bếp ăn, nhà máy và đơn vị suất ăn.",
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
      "Trang đích local cho khách cần nguồn hàng định kỳ tại Bình Dương, ưu tiên giao đều và phản hồi báo giá nhanh cho bếp ăn, nhà máy và đơn vị suất ăn.",
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
    title: "Cung cấp thực phẩm Nhơn Trạch cho khu công nghiệp và bếp ăn",
    description:
      "Trang đích local cho nhóm khách ở Nhơn Trạch cần nguồn hàng định kỳ, phản hồi báo giá ngắn gọn và giao phù hợp khu công nghiệp.",
    intro:
      "Phục vụ khu công nghiệp Nhơn Trạch với nhu cầu mua theo ca, theo ngày và theo tuần.",
    chips: ["Khu công nghiệp", "Hợp đồng định kỳ", "Khách B2B"],
    sections: [
      {
        heading: "Nhơn Trạch là nơi khách mua theo ca và theo chuyến",
        body:
          "Đây là khu vực có nhiều nhu cầu lặp lại, nên trang khu vực phải gắn chặt vào bài toán giao theo lịch, theo số lượng và theo đầu mối duyệt hàng.",
        items: ["Giao đúng khung giờ", "Có thể mua định kỳ", "Hỗ trợ báo giá theo nhu cầu"],
      },
      {
        heading: "Nhu cầu tìm kiếm chính của khách",
        body:
          "Người mua tại Nhơn Trạch thường tìm nhà cung cấp thực phẩm gần khu công nghiệp, có thể giao định kỳ và báo giá theo danh mục hàng thực tế của bếp.",
        items: ["KCN Nhơn Trạch", "Bếp ăn tập thể", "Nhà máy, văn phòng, trường học"],
      },
      {
        heading: "Gửi báo giá đúng nhu cầu",
        body:
          "Mục tiêu là giúp khách đi nhanh sang form báo giá, hồ sơ năng lực và những trang hàng hóa đúng nhóm cần mua.",
        items: ["Dẫn về báo giá", "Tăng tin cậy", "Giảm việc khách phải tìm lại"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có thể dùng trang này cho tìm kiếm tự nhiên và quảng cáo không?",
        answer:
          "Có. Đây là một trang local đủ rõ nhu cầu để dùng cho cả tìm kiếm tự nhiên và quảng cáo nếu cần test chuyển đổi.",
      },
      {
        question: "Trang này có nên nói nhiều về suất ăn công nghiệp không?",
        answer:
          "Không nên. Nên giữ trọng tâm là nguồn thực phẩm, còn suất ăn công nghiệp chỉ là bối cảnh sử dụng.",
      },
    ],
    ctaLabel: "BÁO GIÁ",
    quoteSlug: "thuc-pham-nhon-trach",
    quoteTitle: "Cung cấp thực phẩm Nhơn Trạch",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Nhơn Trạch.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai" },
      { href: "/cung-cap-thuc-pham-bien-hoa", label: "Cung cấp thực phẩm Biên Hòa" },
      { href: "/kien-thuc/cach-chon-nha-cung-cap-thuc-pham-cho-khu-cong-nghiep-nhon-trach", label: "Chọn nhà cung cấp thực phẩm cho khu công nghiệp Nhơn Trạch" },
      { href: "/kien-thuc/cach-chon-nha-cung-cap-thuc-pham-cho-nha-may-o-dong-nai", label: "Chọn nhà cung cấp thực phẩm cho nhà máy ở Đồng Nai" },
      { href: "/san-pham", label: "Xem danh mục sản phẩm" },
      { href: "/bao-gia", label: "Mở form báo giá" },
    ],
  },
  baRiaVungTau: {
    eyebrow: "Bà Rịa - Vũng Tàu",
    title: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu cho doanh nghiệp và bếp ăn",
    description:
      "Trang đích local cho khách cần nguồn hàng định kỳ tại Bà Rịa - Vũng Tàu, ưu tiên giao đều và báo giá rõ cho doanh nghiệp, bếp ăn và đơn vị suất ăn.",
    intro:
      "Phục vụ đơn vị ở Bà Rịa - Vũng Tàu cần nguồn hàng ổn định, giao theo lịch và báo giá rõ.",
    chips: ["Giao theo lịch", "Khách B2B", "Báo giá rõ"],
    sections: [
      {
        heading: "Bà Rịa - Vũng Tàu cần nguồn hàng ổn định cho đơn vị vận hành đều",
        body:
          "Trang này phù hợp với khách cần nhà cung cấp giao đều, báo giá rõ và có thể phục vụ theo lịch nhận hàng đã thống nhất.",
        items: ["Giao đúng lịch", "Quy cách rõ", "Báo giá nhanh"],
      },
      {
        heading: "Nhóm hàng phù hợp",
        body:
          "Các nhóm hàng nên đẩy mạnh gồm rau củ quả, thịt cá, hàng đông lạnh, gia vị và thực phẩm chay cho bếp ăn và đơn vị suất ăn.",
        items: ["Rau củ quả", "Thịt cá hải sản", "Hàng đông lạnh", "Gia vị nhà bếp", "Thực phẩm chay"],
      },
      {
        heading: "Chốt nhu cầu nhanh",
        body:
          "Sau khi xem trang, khách có thể đi thẳng sang form báo giá hoặc hồ sơ năng lực để nhận phản hồi nhanh hơn.",
        items: ["CTA báo giá", "Hồ sơ năng lực", "FAQ về giao hàng và vùng phục vụ"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có thể phục vụ Bà Rịa - Vũng Tàu không?",
        answer:
          "Có, nếu lịch giao và tuyến đơn hàng phù hợp với vận hành thực tế của khách hàng.",
      },
      {
        question: "Trang này có nên tách riêng khỏi TP.HCM và Bình Dương không?",
        answer:
          "Có. Đây là cụm địa phương riêng, tách ra sẽ dễ tối ưu truy vấn và đo chuyển đổi hơn.",
      },
    ],
    ctaLabel: "BÁO GIÁ",
    quoteSlug: "thuc-pham-ba-ria-vung-tau",
    quoteTitle: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu",
    quoteSummary: "Nhu cầu mua thực phẩm định kỳ tại Bà Rịa - Vũng Tàu.",
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-tp-hcm", label: "Cung cấp thực phẩm TP.HCM" },
      { href: "/cung-cap-thuc-pham-binh-duong", label: "Cung cấp thực phẩm Bình Dương" },
      { href: "/kien-thuc/bao-gia-thuc-pham-cho-bep-an-tap-the-o-ba-ria-vung-tau", label: "Báo giá thực phẩm cho bếp ăn tập thể ở Bà Rịa - Vũng Tàu" },
      { href: "/san-pham", label: "Xem danh mục sản phẩm" },
      { href: "/bao-gia", label: "Mở form báo giá" },
    ],
  },
};
