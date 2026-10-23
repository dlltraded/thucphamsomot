import type { ContentSection, FaqItem } from "@/lib/content";

export type SegmentLandingConfig = {
  path: string;
  metaTitle: string;
  metaDescription: string;
  breadcrumbName: string;
  eyebrow: string;
  title: string;
  intro: string;
  heroImage: string;
  heroImageAlt: string;
  serviceType: string;
  audience: string;
  trust: { title: string; text: string }[];
  targetsHeading: string;
  targets: string[];
  sections: ContentSection[];
  productsHeading: string;
  productsIntro: string;
  stepsHeading: string;
  steps: string[];
  customers?: { heading: string; intro: string; names: string[] };
  areasHeading: string;
  areasIntro: string;
  faqs: FaqItem[];
  relatedLinks: { href: string; label: string }[];
  ctaTitle: string;
  ctaText: string;
};

export const productGroups = [
  {
    href: "/danh-muc/rau-cu-qua",
    label: "Rau củ quả",
    text: "Rau ăn lá, củ quả theo mùa từ Đà Lạt, miền Tây; có nhóm hàng VietGAP.",
  },
  {
    href: "/danh-muc/thit-heo",
    label: "Thịt heo, bò, gia cầm",
    text: "Thịt heo, bò, gà, vịt; cắt thái theo yêu cầu của bếp.",
  },
  {
    href: "/danh-muc/hai-san",
    label: "Hải sản",
    text: "Cá, tôm, mực và hải sản tươi; phi lê theo yêu cầu của bếp.",
  },
  {
    href: "/danh-muc/hang-dong-lanh",
    label: "Hàng đông lạnh",
    text: "Thịt, cá, hải sản cấp đông để bếp chủ động nguồn hàng khi giá tươi biến động.",
  },
  {
    href: "/danh-muc/gia-vi",
    label: "Gia vị",
    text: "Gia vị món Việt, Hoa, Hàn, Âu và gia vị chay mặn để bếp giữ hương vị ổn định.",
  },
  {
    href: "/danh-muc/thuc-pham-chay",
    label: "Thực phẩm chay",
    text: "Thực phẩm chay và gia vị chay cho ngày rằm hoặc thực đơn chay định kỳ.",
  },
];

export const serviceAreas = [
  { href: "/cung-cap-thuc-pham-bien-hoa", label: "Biên Hòa" },
  { href: "/cung-cap-thuc-pham-ho-nai", label: "Hố Nai" },
  { href: "/cung-cap-thuc-pham-tam-phuoc", label: "Tam Phước" },
  { href: "/cung-cap-thuc-pham-kcn-amata", label: "KCN Amata" },
  { href: "/cung-cap-thuc-pham-long-thanh", label: "Long Thành" },
  { href: "/cung-cap-thuc-pham-nhon-trach", label: "Nhơn Trạch" },
  { href: "/cung-cap-thuc-pham-trang-bom", label: "Trảng Bom" },
  { href: "/cung-cap-thuc-pham-vinh-cuu", label: "Vĩnh Cửu" },
  { href: "/cung-cap-thuc-pham-binh-duong", label: "Bình Dương" },
  { href: "/cung-cap-thuc-pham-tp-hcm", label: "TP.HCM" },
];

const verifiedTrust = {
  iso: { title: "ISO 22000 & HACCP", text: "Quy trình an toàn thực phẩm đã được chứng nhận." },
  insurance: { title: "Bảo hiểm 5 tỷ đồng", text: "Bảo hiểm trách nhiệm sản phẩm 5.000.000.000 VNĐ." },
  onTime: { title: "99,8% giao đúng hẹn", text: "Đúng giờ, đúng quy cách theo lịch đã thống nhất." },
  customers: { title: "109+ khách hàng", text: "Doanh nghiệp và bếp ăn tập thể đang lấy hàng thường xuyên." },
  vat: { title: "Hóa đơn VAT đầy đủ", text: "Xuất hóa đơn cho từng đợt mua hàng." },
};

export const segmentLandingPages = {
  truongHoc: {
    path: "/cung-cap-thuc-pham-cho-truong-hoc",
    metaTitle: "Cung cấp thực phẩm cho trường học tại Đồng Nai",
    metaDescription:
      "TPS1 cung cấp rau củ, thịt cá, đồ khô cho bếp bán trú trường mầm non, tiểu học tại Đồng Nai; đạt ISO 22000, HACCP, có hóa đơn VAT, báo giá trong 24 giờ.",
    breadcrumbName: "Cung cấp thực phẩm cho trường học",
    eyebrow: "Bếp ăn bán trú",
    title: "Cung cấp thực phẩm cho trường học tại Đồng Nai",
    intro:
      "TPS1 giao rau củ, thịt cá, đồ khô và gia vị đến bếp bán trú của các trường mầm non, tiểu học và THCS ở Biên Hòa và Đồng Nai. Hàng đến đúng khung giờ nhà trường đã hẹn, kèm hồ sơ an toàn thực phẩm khi nhà trường cần.",
    heroImage: "/images/industries/truong-hoc-vn.png",
    heroImageAlt: "Thực phẩm tươi cho bếp ăn bán trú trường học",
    serviceType: "Cung cấp thực phẩm cho bếp ăn trường học",
    audience: "Trường mầm non, tiểu học, THCS có bán trú",
    trust: [verifiedTrust.iso, verifiedTrust.insurance, verifiedTrust.onTime, verifiedTrust.vat],
    targetsHeading: "TPS1 đang nhận cung cấp cho",
    targets: [
      "Trường mầm non, nhóm trẻ",
      "Trường tiểu học, THCS có bán trú",
      "Trường nội trú, ký túc xá",
      "Căng tin trường cao đẳng, đại học",
    ],
    sections: [
      {
        heading: "Bữa ăn bán trú cần nguồn hàng rõ gốc và đến kịp giờ",
        body:
          "Bếp trường học nấu cho trẻ nhỏ, nên lô hàng nào nhập vào cũng phải tươi, rõ nguồn gốc và đến trước giờ sơ chế. Chỉ một chuyến giao trễ là lịch nấu bữa trưa bị dồn. TPS1 thống nhất khung giờ nhận hàng với nhà trường ngay từ đầu, rồi giữ đúng lịch đó mỗi ngày.",
        items: [
          "Giao sáng sớm theo giờ bếp nhận hàng",
          "Nhân viên giao nhận tuân thủ nội quy ra vào của trường",
          "Hỗ trợ giao bổ sung khi bếp phát sinh thêm suất",
        ],
      },
      {
        heading: "Hồ sơ đầy đủ khi đoàn kiểm tra đến bếp",
        body:
          "Bếp vẫn kiểm thực ba bước và lưu mẫu thức ăn theo quy định của ngành y tế. Phần TPS1 lo là thực phẩm đầu vào có giấy tờ rõ ràng: hồ sơ an toàn thực phẩm theo từng nhóm hàng, hóa đơn VAT cho từng đợt mua, và hàng được bếp kiểm tra, ký nhận ngay khi đến nơi.",
        items: [
          "Quy trình an toàn thực phẩm đạt chứng nhận ISO 22000 và HACCP",
          "Hồ sơ nguồn gốc cung cấp khi nhà trường yêu cầu",
          "Bảo hiểm trách nhiệm sản phẩm 5 tỷ đồng",
        ],
      },
      {
        heading: "Giữ thực đơn ổn định khi giá chợ lên xuống",
        body:
          "Tiền ăn của học sinh được tính theo định mức, không thể đổi theo giá chợ từng tuần. Khi giá hoặc mùa vụ thay đổi, TPS1 báo trước cho nhà trường và đề xuất nguyên liệu thay thế tương đương, để bếp giữ được thực đơn mà không vượt định mức.",
      },
    ],
    productsHeading: "Nhóm thực phẩm cho thực đơn bán trú",
    productsIntro:
      "Thực đơn bán trú đổi theo tuần nhưng nguyên liệu chính khá ổn định. Thịt, cá có thể sơ chế sẵn theo yêu cầu như cắt thái, phi lê để bếp đỡ việc.",
    stepsHeading: "Nhà trường đặt hàng với TPS1 thế nào?",
    steps: [
      "Nhà trường gửi thực đơn tuần hoặc danh mục hàng, số suất ăn mỗi ngày và giờ bếp nhận hàng. Có sẵn file Excel thì gửi luôn file.",
      "TPS1 xác nhận yêu cầu trong 30 phút làm việc và gửi báo giá trong 24 giờ.",
      "Hai bên chốt lịch giao định kỳ. Hàng đến bếp, bếp kiểm tra và ký nhận.",
    ],
    areasHeading: "Khu vực giao hàng cho trường học",
    areasIntro:
      "TPS1 đặt tại Tam Hiệp, Biên Hòa và giao định kỳ cho các trường ở Biên Hòa cùng những khu vực lân cận:",
    faqs: [
      {
        question: "Nhà trường cần gửi những thông tin gì để nhận báo giá?",
        answer:
          "Nhà trường gửi danh mục hàng hoặc thực đơn tuần, số suất ăn mỗi ngày, địa chỉ trường và khung giờ bếp nhận hàng. Nếu đã có danh mục trong file Excel, cứ gửi nguyên file, TPS1 báo giá theo đúng file đó.",
      },
      {
        question: "TPS1 có cung cấp hồ sơ an toàn thực phẩm cho bếp ăn trường học không?",
        answer:
          "Có. Quy trình của TPS1 đạt chứng nhận ISO 22000 và HACCP. TPS1 cung cấp hồ sơ nguồn gốc của các nhóm hàng khi nhà trường yêu cầu và xuất hóa đơn VAT cho từng đợt mua hàng.",
      },
      {
        question: "TPS1 giao thực phẩm cho trường học ở những khu vực nào?",
        answer:
          "Trọng tâm là Biên Hòa và các khu vực lân cận như Long Thành, Trảng Bom, Nhơn Trạch, Vĩnh Cửu. TPS1 cũng giao tới Dĩ An, Thủ Đức, một số khu vực của TP.HCM và Bình Dương khi lịch tuyến phù hợp.",
      },
      {
        question: "Giá thực phẩm thay đổi thì TPS1 báo cho nhà trường thế nào?",
        answer:
          "TPS1 báo trước khi giá hoặc mùa vụ thay đổi, kèm phương án nguyên liệu thay thế tương đương để thực đơn không bị xáo trộn và tiền ăn vẫn nằm trong định mức.",
      },
      {
        question: "Hàng giao đến không đạt thì xử lý ra sao?",
        answer:
          "Bếp kiểm tra hàng ngay khi nhận. Hàng sai quy cách hoặc thiếu, nhân viên phụ trách của TPS1 xử lý và phản hồi nhà trường trong ngày.",
      },
    ],
    relatedLinks: [
      { href: "/cung-cap-thuc-pham-cho-nha-may", label: "Cung cấp thực phẩm cho nhà máy, xí nghiệp" },
      { href: "/cung-cap-thuc-pham-cho-co-quan", label: "Cung cấp thực phẩm cho bếp ăn cơ quan" },
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Nhà cung cấp thực phẩm tại Đồng Nai" },
      { href: "/blog/cach-xay-dung-thuc-don-suat-an-25k", label: "Cách xây thực đơn trong định mức tiền ăn" },
      { href: "/ho-so-nang-luc", label: "Xem hồ sơ năng lực TPS1" },
    ],
    ctaTitle: "Gửi thực đơn tuần, nhận báo giá trong 24 giờ",
    ctaText: "Nhà trường gửi danh mục hoặc thực đơn qua form, Zalo hoặc gọi trực tiếp. TPS1 xác nhận trong 30 phút làm việc.",
  },

  nhaMay: {
    path: "/cung-cap-thuc-pham-cho-nha-may",
    metaTitle: "Cung cấp thực phẩm cho nhà máy, KCN Đồng Nai",
    metaDescription:
      "Thực phẩm cho bếp ăn công nhân tại các KCN Đồng Nai: giao theo ca, đạt ISO 22000 và HACCP, hơn 109 doanh nghiệp và bếp ăn đang hợp tác, báo giá trong 24 giờ.",
    breadcrumbName: "Cung cấp thực phẩm cho nhà máy, xí nghiệp",
    eyebrow: "Nhà máy · Xí nghiệp · KCN",
    title: "Cung cấp thực phẩm cho nhà máy, xí nghiệp tại Đồng Nai",
    intro:
      "TPS1 cung cấp nguyên liệu cho bếp ăn công nhân của nhà máy, xí nghiệp và các đơn vị nấu suất ăn trong khu công nghiệp ở Đồng Nai. Quý doanh nghiệp gửi danh mục và số suất mỗi ca, TPS1 báo giá trong 24 giờ và giao theo đúng lịch ca của bếp.",
    heroImage: "/images/industries/suat-an-cong-nghiep-vn.png",
    heroImageAlt: "Nguyên liệu cho bếp ăn công nhân nhà máy",
    serviceType: "Cung cấp thực phẩm cho bếp ăn nhà máy, xí nghiệp",
    audience: "Nhà máy, xí nghiệp, đơn vị nấu suất ăn công nghiệp",
    trust: [verifiedTrust.customers, verifiedTrust.onTime, verifiedTrust.iso, verifiedTrust.insurance],
    targetsHeading: "Phù hợp với",
    targets: [
      "Bếp ăn tự vận hành trong nhà máy",
      "Xí nghiệp, xưởng sản xuất chạy nhiều ca",
      "Đơn vị nấu suất ăn công nghiệp cho KCN",
      "Ký túc xá công nhân",
    ],
    sections: [
      {
        heading: "Bếp ăn công nhân không được phép thiếu hàng",
        body:
          "Bếp nấu vài trăm đến vài nghìn suất mỗi ngày thì chỉ cần thiếu một mặt hàng là cả ca bị ảnh hưởng. TPS1 lập kế hoạch giao theo lịch bếp của từng nhà máy: khung giờ nhận hàng, danh mục theo thực đơn tuần, định mức từng nhóm hàng và phương án thay thế khi mùa vụ hay giá cả biến động.",
        items: [
          "Giao theo ca: sáng sớm, trưa hoặc chiều",
          "Một đầu mối phụ trách cố định cho mỗi doanh nghiệp",
          "Có phương án dự phòng khi phát sinh thêm suất",
        ],
      },
      {
        heading: "Giữ chi phí mỗi suất ăn trong định mức",
        body:
          "Với bếp công nghiệp, hàng đồng đều quy cách thì dễ chia khẩu phần và ít hao hụt. TPS1 chọn hàng theo quy cách bếp đã thống nhất, báo trước khi giá thịt, rau củ có dấu hiệu tăng và đề xuất nguyên liệu thay thế để thực đơn vẫn đa dạng mà không đội chi phí.",
      },
      {
        heading: "Chứng từ rõ ràng cho phòng mua hàng và kế toán",
        body:
          "Mỗi đợt hàng có hóa đơn VAT. Hồ sơ an toàn thực phẩm của từng nhóm hàng được cung cấp khi doanh nghiệp cần cho đợt đánh giá nhà cung cấp hoặc kiểm tra định kỳ.",
        items: [
          "Quy trình đạt chứng nhận ISO 22000 và HACCP",
          "Bảo hiểm trách nhiệm sản phẩm 5 tỷ đồng",
          "Hồ sơ năng lực công ty để làm thủ tục chọn nhà cung cấp",
        ],
      },
    ],
    productsHeading: "Nhóm hàng cho bếp ăn nhà máy",
    productsIntro:
      "Đủ các nhóm hàng một bếp công nghiệp dùng hằng ngày, đặt chung một đầu mối thay vì phải làm việc với nhiều mối lẻ.",
    stepsHeading: "Quy trình làm việc với doanh nghiệp",
    steps: [
      "Quý doanh nghiệp gửi danh mục hàng, số suất mỗi ca, địa điểm giao và khung giờ nhận hàng.",
      "TPS1 xác nhận yêu cầu trong 30 phút làm việc và gửi báo giá trong 24 giờ.",
      "Hai bên chốt lịch giao theo ca. Hàng đến bếp, bếp kiểm tra và ký nhận.",
    ],
    customers: {
      heading: "Một số doanh nghiệp đang dùng thực phẩm TPS1",
      intro: "Hơn 109 doanh nghiệp và bếp ăn tập thể đang lấy hàng thường xuyên, trong đó có:",
      names: [
        "Hưng Nghiệp Formosa",
        "Toyota Long Thành",
        "Caesar Việt Nam",
        "BCons",
        "HIEPPHATFOOD",
        "Chế Biến Thực Phẩm Đồng Nai",
      ],
    },
    areasHeading: "Giao hàng đến các khu công nghiệp",
    areasIntro:
      "TPS1 đặt tại Tam Hiệp, Biên Hòa và giao định kỳ đến các khu công nghiệp sau. Xem chi tiết từng khu vực:",
    faqs: [
      {
        question: "TPS1 có giao hàng theo ca cho bếp nhà máy không?",
        answer:
          "Có. Lịch giao được thống nhất theo khung giờ bếp nhận hàng, gồm ca sáng sớm, trưa hoặc chiều. 99,8% chuyến hàng của TPS1 đến đúng hẹn và đúng quy cách.",
      },
      {
        question: "Doanh nghiệp cần gửi gì để nhận báo giá?",
        answer:
          "Danh mục nhóm hàng cần mua, số lượng dự kiến mỗi ngày hoặc mỗi tuần, địa điểm giao và khung giờ nhận hàng. Thông tin càng rõ, TPS1 báo giá càng nhanh và sát.",
      },
      {
        question: "TPS1 có xuất hóa đơn VAT và cung cấp hồ sơ an toàn thực phẩm không?",
        answer:
          "Có. TPS1 xuất hóa đơn VAT cho từng đợt mua hàng, có chứng nhận ISO 22000 và HACCP, và cung cấp hồ sơ nguồn gốc theo nhóm hàng khi doanh nghiệp yêu cầu.",
      },
      {
        question: "TPS1 giao tới những khu công nghiệp nào ở Đồng Nai?",
        answer:
          "TPS1 giao tới KCN Amata, các khu công nghiệp ở Biên Hòa, Hố Nai, Tam Phước, Long Thành, Nhơn Trạch, Trảng Bom, Vĩnh Cửu và khu vực lân cận. Ngoài Đồng Nai, TPS1 có tuyến giao tới Bình Dương và TP.HCM.",
      },
      {
        question: "Giá thịt, rau củ tăng thì TPS1 xử lý thế nào?",
        answer:
          "TPS1 báo trước khi giá hoặc mùa vụ thay đổi và đề xuất nguyên liệu thay thế tương đương, để bếp giữ được chi phí mỗi suất ăn.",
      },
    ],
    relatedLinks: [
      { href: "/blog/giai-phap-cung-ung-thuc-pham-nha-may-3-ca", label: "Cung ứng thực phẩm cho nhà máy chạy 3 ca" },
      { href: "/blog/7-sai-lam-lang-phi-ngan-sach-suat-an", label: "7 sai lầm làm lãng phí ngân sách suất ăn" },
      { href: "/blog/tieu-chuan-vsattp-suat-an-cong-nghiep", label: "Tiêu chuẩn VSATTP cho suất ăn công nghiệp" },
      { href: "/cung-cap-thuc-pham-cho-co-quan", label: "Cung cấp thực phẩm cho bếp ăn cơ quan" },
      { href: "/cung-cap-thuc-pham-cho-truong-hoc", label: "Cung cấp thực phẩm cho trường học" },
    ],
    ctaTitle: "Gửi danh mục và số suất mỗi ca, nhận báo giá trong 24 giờ",
    ctaText: "Quý doanh nghiệp gửi danh mục qua form, Zalo hoặc gọi trực tiếp. TPS1 xác nhận yêu cầu trong 30 phút làm việc.",
  },

  coQuan: {
    path: "/cung-cap-thuc-pham-cho-co-quan",
    metaTitle: "Cung cấp thực phẩm cho bếp ăn cơ quan tại Đồng Nai",
    metaDescription:
      "Thực phẩm cho bếp ăn cơ quan, văn phòng tại Đồng Nai: báo giá theo danh mục, hóa đơn VAT và chứng từ đầy đủ cho thanh quyết toán, giao theo lịch cố định.",
    breadcrumbName: "Cung cấp thực phẩm cho cơ quan",
    eyebrow: "Cơ quan · Văn phòng · Doanh nghiệp",
    title: "Cung cấp thực phẩm cho bếp ăn cơ quan, doanh nghiệp tại Đồng Nai",
    intro:
      "TPS1 cung cấp thực phẩm cho bếp ăn của cơ quan, văn phòng doanh nghiệp, ký túc xá và các đơn vị tự nấu ăn cho nhân viên tại Đồng Nai. Quý cơ quan nhận báo giá theo từng nhóm hàng, hàng giao định kỳ và có đủ hóa đơn, chứng từ để thanh quyết toán.",
    heroImage: "/images/industries/bep-an-tap-the-vn.png",
    heroImageAlt: "Thực phẩm cho bếp ăn cơ quan và văn phòng",
    serviceType: "Cung cấp thực phẩm cho bếp ăn cơ quan, văn phòng",
    audience: "Cơ quan, văn phòng doanh nghiệp, đơn vị có bếp ăn nhân viên",
    trust: [verifiedTrust.vat, verifiedTrust.iso, verifiedTrust.insurance, verifiedTrust.onTime],
    targetsHeading: "Phù hợp với",
    targets: [
      "Bếp ăn cơ quan, đơn vị hành chính",
      "Văn phòng doanh nghiệp có bếp nấu cho nhân viên",
      "Bệnh viện, trung tâm y tế",
      "Ký túc xá, nhà khách",
    ],
    sections: [
      {
        heading: "Báo giá và chứng từ đủ để trình duyệt, quyết toán",
        body:
          "Mua thực phẩm cho cơ quan thường phải qua bước trình duyệt và quyết toán, nên báo giá cần tách rõ từng mặt hàng, đơn vị tính và đơn giá. TPS1 báo giá theo đúng danh mục quý cơ quan gửi, xuất hóa đơn VAT cho từng đợt mua và gửi hồ sơ năng lực công ty khi cần làm thủ tục chọn nhà cung cấp.",
        items: [
          "Báo giá theo danh mục, có đơn vị tính rõ ràng",
          "Hóa đơn VAT cho từng đợt mua hàng",
          "Hồ sơ năng lực và hồ sơ an toàn thực phẩm khi có yêu cầu",
        ],
      },
      {
        heading: "Đặt hàng định kỳ, theo dõi đơn trên Cổng đối tác",
        body:
          "Đơn vị lấy hàng thường xuyên được cấp tài khoản trên Cổng đối tác của TPS1 để đặt hàng, xem lại đơn và lịch sử mua hàng, không phải gọi điện đọc danh sách mỗi ngày. Lịch giao được thống nhất theo giờ bếp nhận hàng.",
      },
      {
        heading: "An toàn thực phẩm có chứng nhận",
        body:
          "Quy trình của TPS1 đạt chứng nhận ISO 22000 và HACCP, có bảo hiểm trách nhiệm sản phẩm 5 tỷ đồng. Bếp kiểm tra và ký nhận ngay khi hàng đến; hàng sai quy cách được xử lý trong ngày.",
      },
    ],
    productsHeading: "Nhóm thực phẩm cho bếp ăn cơ quan",
    productsIntro: "Đặt chung các nhóm hàng ở một đầu mối, một hóa đơn, dễ theo dõi chi phí hằng tháng.",
    stepsHeading: "Quy trình làm việc với cơ quan",
    steps: [
      "Quý cơ quan gửi danh mục hàng, số suất ăn mỗi ngày, địa chỉ bếp và giờ nhận hàng.",
      "TPS1 xác nhận trong 30 phút làm việc, gửi báo giá chi tiết trong 24 giờ.",
      "Chốt lịch giao định kỳ. Hàng đến bếp, bếp kiểm tra và ký nhận.",
    ],
    areasHeading: "Khu vực giao hàng",
    areasIntro: "TPS1 đặt tại Tam Hiệp, Biên Hòa và giao định kỳ đến các cơ quan, doanh nghiệp tại:",
    faqs: [
      {
        question: "TPS1 có hồ sơ năng lực để cơ quan làm thủ tục chọn nhà cung cấp không?",
        answer:
          "Có. Quý cơ quan xem và tải hồ sơ năng lực tại trang Hồ sơ năng lực trên website, hoặc yêu cầu TPS1 gửi kèm báo giá. Hồ sơ an toàn thực phẩm theo nhóm hàng được cung cấp khi có yêu cầu.",
      },
      {
        question: "Cơ quan cần gửi gì để nhận báo giá?",
        answer:
          "Danh mục hàng cần mua, số suất ăn mỗi ngày, địa chỉ bếp và giờ nhận hàng. Nếu danh mục nằm trong file Excel hoặc PDF, quý cơ quan gửi nguyên file qua form báo giá.",
      },
      {
        question: "TPS1 có xuất hóa đơn VAT không?",
        answer: "Có. TPS1 xuất hóa đơn VAT cho từng đợt mua hàng để quý cơ quan thanh quyết toán.",
      },
      {
        question: "Có đặt hàng trực tuyến được không?",
        answer:
          "Đơn vị lấy hàng thường xuyên được cấp tài khoản trên Cổng đối tác để đặt hàng và xem lịch sử đơn. Đơn vị mới có thể gửi yêu cầu qua form báo giá, Zalo hoặc gọi hotline.",
      },
      {
        question: "TPS1 giao hàng ở những khu vực nào?",
        answer:
          "Trọng tâm là Biên Hòa và các khu vực của Đồng Nai như Long Thành, Trảng Bom, Nhơn Trạch, Vĩnh Cửu. TPS1 cũng có tuyến giao tới Bình Dương và TP.HCM.",
      },
    ],
    relatedLinks: [
      { href: "/ho-so-nang-luc", label: "Xem hồ sơ năng lực TPS1" },
      { href: "/cung-cap-thuc-pham-cho-truong-hoc", label: "Cung cấp thực phẩm cho trường học" },
      { href: "/cung-cap-thuc-pham-cho-nha-may", label: "Cung cấp thực phẩm cho nhà máy, xí nghiệp" },
      { href: "/nganh-hang/benh-vien", label: "Thực phẩm cho bếp ăn bệnh viện" },
      { href: "/blog/tai-sao-chon-nha-cung-cap-thuc-pham-dia-phuong", label: "Vì sao nên chọn nhà cung cấp tại địa phương" },
    ],
    ctaTitle: "Gửi danh mục, nhận báo giá chi tiết trong 24 giờ",
    ctaText: "Quý cơ quan gửi danh mục qua form, Zalo hoặc gọi trực tiếp. TPS1 xác nhận trong 30 phút làm việc.",
  },
} satisfies Record<string, SegmentLandingConfig>;
