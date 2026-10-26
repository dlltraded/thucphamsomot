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
    question: "Cần gửi những thông tin gì để nhận báo giá?",
    answer:
      "Quý khách vui lòng gửi danh sách hàng cần mua, số lượng dự kiến mỗi ngày hoặc mỗi tuần, địa điểm giao và khung giờ bếp nhận hàng. TPS1 xác nhận yêu cầu trong 30 phút làm việc và gửi báo giá trong 24 giờ.",
  },
  {
    question: "TPS1 có xuất hóa đơn VAT và hồ sơ an toàn thực phẩm không?",
    answer:
      "Có. TPS1 xuất hóa đơn VAT cho từng đợt mua hàng. Quy trình của TPS1 đạt chứng nhận ISO 22000 và HACCP, có bảo hiểm trách nhiệm sản phẩm 5 tỷ đồng; hồ sơ nguồn gốc theo từng nhóm hàng được cung cấp khi quý khách yêu cầu.",
  },
];

const smallKitchenFaq: FaqItem = {
  question: "Nhà hàng, quán ăn nhỏ có đặt hàng được không?",
  answer:
    "Được. TPS1 sẽ cùng quý khách trao đổi về lượng hàng, lịch giao và hình thức thanh toán, sao cho phù hợp với nhịp bán của từng nơi.",
};

const quoteSection = (area: string): ContentSection => ({
  heading: "Báo giá trong 24 giờ, rõ ràng từ dòng đầu tiên",
  body: `Quý khách tại ${area} gửi danh sách hàng qua form báo giá, Zalo hoặc hotline. TPS1 xác nhận yêu cầu trong 30 phút làm việc, gửi báo giá trong 24 giờ và thống nhất lịch giao trước khi chuyến hàng đầu tiên lên đường.`,
  items: [
    "Báo giá theo đúng danh mục quý khách gửi",
    "Hóa đơn VAT cho từng đợt mua",
    "Hồ sơ năng lực và an toàn thực phẩm khi cần",
  ],
});

const foodGroups = [
  "Rau củ quả tươi",
  "Thịt heo, thịt bò, gia cầm",
  "Cá và hải sản",
  "Hàng đông lạnh",
  "Đồ khô, gia vị và thực phẩm chay",
];

const link = {
  dongNai: { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm tại Đồng Nai" },
  bienHoa: { href: "/cung-cap-thuc-pham-bien-hoa", label: "Cung cấp thực phẩm tại Biên Hòa" },
  binhDuong: { href: "/cung-cap-thuc-pham-binh-duong", label: "Cung cấp thực phẩm tại Bình Dương" },
  binhPhuoc: { href: "/cung-cap-thuc-pham-binh-phuoc", label: "Cung cấp thực phẩm tại Bình Phước" },
  tpHcm: { href: "/cung-cap-thuc-pham-tp-hcm", label: "Cung cấp thực phẩm tại TP.HCM" },
  baRiaVungTau: { href: "/cung-cap-thuc-pham-ba-ria-vung-tau", label: "Cung cấp thực phẩm tại Bà Rịa - Vũng Tàu" },
  nhonTrach: { href: "/cung-cap-thuc-pham-nhon-trach", label: "Cung cấp thực phẩm tại Nhơn Trạch" },
  longThanh: { href: "/cung-cap-thuc-pham-long-thanh", label: "Cung cấp thực phẩm tại Long Thành" },
  trangBom: { href: "/cung-cap-thuc-pham-trang-bom", label: "Cung cấp thực phẩm tại Trảng Bom" },
  phuMy: { href: "/cung-cap-thuc-pham-phu-my", label: "Cung cấp thực phẩm tại Phú Mỹ" },
  amata: { href: "/cung-cap-thuc-pham-kcn-amata", label: "Cung cấp thực phẩm KCN Amata" },
  nhaHang: { href: "/nganh-hang/nha-hang-khach-san", label: "Thực phẩm cho nhà hàng, khách sạn" },
  quanAn: { href: "/nganh-hang/quan-an", label: "Thực phẩm cho quán ăn, chuỗi F&B" },
  nhaMay: { href: "/cung-cap-thuc-pham-cho-nha-may", label: "Thực phẩm cho bếp ăn nhà máy" },
  truongHoc: { href: "/cung-cap-thuc-pham-cho-truong-hoc", label: "Thực phẩm cho trường học" },
  sanPham: { href: "/san-pham", label: "Xem danh mục hàng hóa" },
  baoGia: { href: "/bao-gia", label: "Gửi yêu cầu báo giá" },
};

export const localLandingPages: Record<string, LocalLandingPageConfig> = {
  dongNai: {
    eyebrow: "Đồng Nai",
    title: "Cung cấp thực phẩm tại Đồng Nai cho nhà hàng, quán ăn và bếp ăn",
    description:
      "Từ kho tại Biên Hòa, TPS1 mang đa dạng thực phẩm có nguồn gốc rõ ràng đến nhà hàng, quán ăn, bếp công ty và trường học khắp Đồng Nai.",
    intro:
      "Từ kho tại Biên Hòa, những chuyến hàng của TPS1 tỏa đi khắp Đồng Nai, mang rau củ, thịt cá, hàng đông lạnh, đồ khô và gia vị có nguồn gốc rõ ràng đến từng gian bếp đúng giờ đã hẹn.",
    chips: ["Giao đúng lịch trình", "Hàng hóa đạt chuẩn", "Linh hoạt thanh toán"],
    sections: [
      {
        heading: "Một đầu mối cho mọi gian bếp tại Đồng Nai",
        body:
          "Nhà hàng cần hàng đạt chuẩn trước giờ mở cửa, quán ăn cần lượng vừa đủ cho ngày bán, bếp công ty và trường học cần đủ hàng cho từng ca. TPS1 lắng nghe nhịp riêng của mỗi gian bếp, thống nhất giờ nhận hàng, thực đơn tuần và định mức từng nhóm hàng ngay từ đầu.",
        items: [
          "Giao theo khung giờ bếp nhận hàng",
          "Danh mục ổn định cho thực đơn tuần",
          "Báo trước khi giá hoặc mùa vụ thay đổi",
        ],
      },
      {
        heading: "Phủ khắp Đồng Nai, kể cả khu vực Bình Phước cũ",
        body:
          "Tuyến giao của TPS1 đi qua Biên Hòa, Trảng Bom, Vĩnh Cửu, Long Thành, Nhơn Trạch và nối dài về khu vực Bình Phước cũ, nay thuộc tỉnh Đồng Nai. Lịch giao được sắp xếp theo tuyến để hàng đến bếp đều đặn, đúng hẹn.",
        items: ["Biên Hòa, Trảng Bom, Vĩnh Cửu", "Long Thành, Nhơn Trạch", "Khu vực Bình Phước cũ"],
      },
      quoteSection("Đồng Nai"),
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 giao hàng đến những khu vực nào tại Đồng Nai?",
        answer:
          "TPS1 giao hàng theo lịch cho nhà hàng, quán ăn, bếp công ty và trường học tại Biên Hòa, Trảng Bom, Vĩnh Cửu, Long Thành, Nhơn Trạch và khu vực Bình Phước cũ. Với những địa điểm khác, quý khách vui lòng liên hệ để TPS1 sắp xếp tuyến giao phù hợp.",
      },
      smallKitchenFaq,
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-dong-nai",
    quoteTitle: "Cung cấp thực phẩm tại Đồng Nai",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại Đồng Nai.",
    relatedLinks: [
      link.bienHoa,
      link.binhPhuoc,
      link.nhonTrach,
      link.longThanh,
      link.trangBom,
      link.tpHcm,
      link.binhDuong,
      link.nhaHang,
      link.quanAn,
      link.nhaMay,
      link.truongHoc,
      link.baoGia,
    ],
  },
  bienHoa: {
    eyebrow: "Biên Hòa",
    title: "Cung cấp thực phẩm tại Biên Hòa cho nhà hàng, quán ăn và bếp ăn",
    description:
      "Kho của TPS1 đặt ngay tại Tam Hiệp, Biên Hòa, giúp nhà hàng, quán ăn và bếp ăn trong thành phố nhận hàng nhanh, tươi và đúng giờ.",
    intro:
      "TPS1 đặt kho ngay tại Tam Hiệp, Biên Hòa. Quãng đường ngắn giúp chuyến hàng đến bếp nhanh hơn, hàng tươi giữ trọn chất lượng và mọi điều chỉnh trong ngày đều được trao đổi kịp thời.",
    chips: ["Kho tại Biên Hòa", "Giao đúng giờ mở bếp", "Hàng hóa đạt chuẩn"],
    sections: [
      {
        heading: "Gần bếp, nên chủ động từng giờ giao",
        body:
          "Với nhà hàng và quán ăn ở Biên Hòa, hàng cần có mặt trước giờ sơ chế; với bếp công ty và trường học, hàng cần kịp từng ca nấu. Nhờ kho đặt ngay trong thành phố, TPS1 chủ động được khung giờ giao cho từng gian bếp.",
        items: [
          "Giao theo giờ mở bếp hoặc theo ca",
          "Trao đổi nhanh khi bếp cần điều chỉnh đơn",
          "Một đầu mối phụ trách cố định",
        ],
      },
      {
        heading: "Những gian bếp TPS1 phục vụ tại Biên Hòa",
        body:
          "Từ nhà hàng, quán cơm, quán phở đến bếp ăn nhà máy, trường học và bệnh viện, mỗi gian bếp đều được phục vụ theo cùng một quy trình rõ ràng: báo giá theo danh mục, giao theo lịch đã thống nhất, bếp kiểm tra và ký nhận khi hàng đến.",
        items: ["Nhà hàng, quán ăn, chuỗi F&B", "Bếp ăn nhà máy, khu công nghiệp", "Trường học, bệnh viện"],
      },
      quoteSection("Biên Hòa"),
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "Kho và văn phòng của TPS1 ở đâu tại Biên Hòa?",
        answer: "TPS1 đặt tại B19 Khu phố 15, phường Tam Hiệp, Biên Hòa, Đồng Nai.",
      },
      {
        question: "Bếp ăn tại các khu công nghiệp Biên Hòa có được giao theo ca không?",
        answer:
          "Có. Lịch giao được thống nhất theo khung giờ bếp nhận hàng, có thể là ca sáng sớm, ca trưa hoặc ca chiều.",
      },
      smallKitchenFaq,
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-bien-hoa",
    quoteTitle: "Cung cấp thực phẩm tại Biên Hòa",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại Biên Hòa.",
    relatedLinks: [link.dongNai, link.trangBom, link.amata, link.nhaHang, link.quanAn, link.nhaMay, link.baoGia],
  },
  binhPhuoc: {
    eyebrow: "Bình Phước",
    title: "Cung cấp thực phẩm khu vực Bình Phước cho nhà hàng, quán ăn và bếp ăn",
    description:
      "TPS1 giao thực phẩm theo tuyến định kỳ đến nhà hàng, quán ăn và bếp ăn khu vực Bình Phước cũ, nay thuộc tỉnh Đồng Nai.",
    intro:
      "Khu vực Bình Phước cũ nay đã về chung một nhà với Đồng Nai, và những chuyến hàng của TPS1 cũng nối dài theo. Rau củ, thịt cá, hàng đông lạnh, đồ khô và gia vị được giao theo tuyến định kỳ đến nhà hàng, quán ăn và bếp ăn tại Đồng Xoài, Chơn Thành cùng các khu vực lân cận.",
    chips: ["Giao theo tuyến định kỳ", "Hàng hóa đạt chuẩn", "Linh hoạt thanh toán"],
    sections: [
      {
        heading: "Cùng một tỉnh, cùng một chuẩn phục vụ",
        body:
          "Gian bếp ở khu vực Bình Phước cũ được phục vụ theo đúng tiêu chuẩn như tại Biên Hòa: báo giá rõ ràng, lịch giao thống nhất từ đầu và hồ sơ an toàn thực phẩm đầy đủ. Quãng đường có xa hơn, nhưng sự chu đáo dành cho mỗi chuyến hàng thì vẫn vẹn nguyên.",
        items: [
          "Giao theo tuyến định kỳ",
          "Lịch giao thống nhất trước khi chốt đơn",
          "Một đầu mối phụ trách cố định",
        ],
      },
      {
        heading: "Cho bếp ăn khu công nghiệp lẫn nhà hàng, quán ăn",
        body:
          "Các khu công nghiệp ở Chơn Thành, Đồng Xoài cần nguồn hàng đều đặn cho từng ca ăn; nhà hàng và quán ăn cần hàng tươi, đạt chuẩn trước giờ mở cửa. TPS1 chuẩn bị danh mục và định mức theo đúng nhịp riêng của mỗi nơi.",
        items: foodGroups,
      },
      quoteSection("khu vực Bình Phước"),
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có giao hàng đến khu vực Bình Phước cũ không?",
        answer:
          "Có. TPS1 giao hàng theo tuyến định kỳ đến khu vực Bình Phước cũ, nay thuộc tỉnh Đồng Nai. Vì quãng đường xa hơn khu vực Biên Hòa, lịch giao sẽ được thống nhất trước với từng đơn vị; quý khách vui lòng gửi địa điểm và tần suất giao để TPS1 xác nhận.",
      },
      smallKitchenFaq,
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-binh-phuoc",
    quoteTitle: "Cung cấp thực phẩm khu vực Bình Phước",
    quoteSummary: "Nhu cầu mua thực phẩm theo tuyến định kỳ tại khu vực Bình Phước cũ.",
    relatedLinks: [link.dongNai, link.binhDuong, link.bienHoa, link.nhaMay, link.quanAn, link.sanPham, link.baoGia],
  },
  binhDuong: {
    eyebrow: "Bình Dương",
    title: "Cung cấp thực phẩm tại Bình Dương cho nhà hàng, quán ăn và bếp ăn",
    description:
      "TPS1 giao thực phẩm có nguồn gốc rõ ràng theo lịch đến nhà hàng, quán ăn và bếp ăn nhà máy tại Bình Dương.",
    intro:
      "Từ Biên Hòa, tuyến giao của TPS1 sang Bình Dương được sắp xếp theo lịch nhận hàng của từng đơn vị, để rau củ, thịt cá và hàng khô đến bếp đều đặn như nhịp làm việc mỗi ngày.",
    chips: ["Giao đúng lịch trình", "Hàng hóa đạt chuẩn", "Linh hoạt thanh toán"],
    sections: [
      {
        heading: "Đều đặn theo lịch, vững vàng theo mùa",
        body:
          "Bình Dương có nhiều nhà máy, bếp ăn công ty cùng hệ thống nhà hàng, quán ăn phục vụ người lao động. Mỗi nơi đều cần nguồn hàng ổn định để thực đơn không bị gián đoạn. TPS1 thống nhất trước lịch giao, danh mục và định mức, rồi giữ đúng nhịp ấy qua từng tuần.",
        items: [
          "Lịch giao thống nhất từ đầu",
          "Danh mục ổn định theo thực đơn",
          "Báo trước khi giá thay đổi theo mùa",
        ],
      },
      {
        heading: "Đủ nhóm hàng để thực đơn luôn phong phú",
        body:
          "Rau củ quả, thịt cá, hàng đông lạnh, đồ khô, gia vị và thực phẩm chay được đặt chung ở một đầu mối, đủ để bếp xoay vòng thực đơn theo tuần mà vẫn giữ trọn hương vị quen thuộc.",
        items: foodGroups,
      },
      quoteSection("Bình Dương"),
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có giao hàng tại Bình Dương không?",
        answer:
          "Có. TPS1 sắp xếp tuyến giao từ Biên Hòa sang Bình Dương theo lịch nhận hàng của từng đơn vị. Quý khách vui lòng gửi địa điểm và tần suất giao để TPS1 xác nhận lịch cụ thể.",
      },
      smallKitchenFaq,
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-binh-duong",
    quoteTitle: "Cung cấp thực phẩm tại Bình Dương",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại Bình Dương.",
    relatedLinks: [link.dongNai, link.tpHcm, link.binhPhuoc, link.nhaMay, link.quanAn, link.sanPham, link.baoGia],
  },
  tpHcm: {
    eyebrow: "TP.HCM",
    title: "Cung cấp thực phẩm tại TP.HCM cho nhà hàng, quán ăn và bếp ăn",
    description:
      "Tuyến giao từ kho Biên Hòa về khu Đông TP.HCM giúp TPS1 chủ động khung giờ giao cho nhà hàng, quán ăn và bếp ăn.",
    intro:
      "Tuyến giao từ kho Biên Hòa đi qua Nhơn Trạch, Long Thành về khu Đông TP.HCM, giúp TPS1 chủ động khung giờ giao cho nhà hàng, quán ăn và bếp ăn tại TP. Thủ Đức cùng các khu vực lân cận.",
    chips: ["Ưu tiên khu Đông", "Giao đúng giờ mở bếp", "Linh hoạt thanh toán"],
    sections: [
      {
        heading: "Khu Đông TP.HCM, một chặng đường ngắn đến bếp",
        body:
          "TP. Thủ Đức và các khu vực giáp Đồng Nai nằm trên tuyến giao thường xuyên của TPS1, nên hàng đến bếp đúng khung giờ đã hẹn. Các khu vực xa hơn vẫn được phục vụ khi số lượng và lịch giao phù hợp với tuyến hiện có.",
        items: [
          "Ưu tiên TP. Thủ Đức và khu vực giáp Đồng Nai",
          "Giao theo giờ mở bếp hoặc theo ca",
          "Hồ sơ nguồn gốc theo từng nhóm hàng",
        ],
      },
      {
        heading: "Một danh mục cho cả nhà hàng lẫn bếp ăn",
        body:
          "Nhà hàng cần hàng đều cỡ cho thực đơn đổi theo mùa, quán ăn cần hàng tươi mỗi sáng, bếp công ty và trường học cần đủ hàng cho từng ca. Hơn 5.000 mặt hàng của TPS1 giúp mỗi gian bếp chốt đơn ở cùng một nơi.",
        items: foodGroups,
      },
      quoteSection("TP.HCM"),
    ],
    faqs: [
      {
        question: "TPS1 giao hàng đến những khu vực nào ở TP.HCM?",
        answer:
          "TPS1 ưu tiên TP. Thủ Đức và các khu vực giáp Đồng Nai, vì tuyến giao xuất phát từ kho Biên Hòa. Các khu vực xa hơn vẫn được phục vụ khi số lượng và lịch giao phù hợp với tuyến vận chuyển hiện có.",
      },
      {
        question: "Đặt hàng lần đầu cần chuẩn bị gì?",
        answer:
          "Quý khách vui lòng gửi danh sách hàng cần mua, số lượng dự kiến mỗi lần giao, tần suất giao và địa chỉ nhận hàng. TPS1 sẽ tư vấn quy cách và gửi báo giá trong 24 giờ.",
      },
      {
        question: "Hình thức thanh toán như thế nào?",
        answer:
          "TPS1 linh hoạt hình thức thanh toán và công nợ theo thỏa thuận với từng khách hàng mua hàng định kỳ. Quý khách vui lòng liên hệ để cùng trao đổi phương án phù hợp.",
      },
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-tp-hcm",
    quoteTitle: "Cung cấp thực phẩm tại TP.HCM",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại TP.HCM.",
    relatedLinks: [link.dongNai, link.nhonTrach, link.binhDuong, link.nhaHang, link.quanAn, link.nhaMay, link.baoGia],
  },
  baRiaVungTau: {
    eyebrow: "Bà Rịa - Vũng Tàu",
    title: "Cung cấp thực phẩm tại Bà Rịa - Vũng Tàu cho nhà hàng và bếp ăn",
    description:
      "TPS1 giao thực phẩm có nguồn gốc rõ ràng theo lịch đến nhà hàng, khách sạn và bếp ăn nhà máy tại Bà Rịa - Vũng Tàu.",
    intro:
      "Từ nhà hàng, khách sạn ở thành phố biển đến bếp ăn nhà máy ở Phú Mỹ, TPS1 mang thực phẩm có nguồn gốc rõ ràng đến Bà Rịa - Vũng Tàu theo lịch giao đã thống nhất.",
    chips: ["Giao đúng lịch trình", "Hàng hóa đạt chuẩn", "Linh hoạt thanh toán"],
    sections: [
      {
        heading: "Nguồn hàng ổn định cho thành phố biển và các khu công nghiệp",
        body:
          "Nhà hàng, khách sạn ở Vũng Tàu cần hàng đạt chuẩn để đón khách mỗi mùa du lịch; bếp ăn nhà máy ở Phú Mỹ, Bà Rịa cần đủ hàng cho từng ca. TPS1 sắp xếp tuyến giao theo lịch nhận hàng của từng đơn vị, để mỗi chuyến hàng đến đúng giờ bếp cần.",
        items: ["Nhà hàng, khách sạn, resort", "Bếp ăn nhà máy, khu công nghiệp", "Trường học, bệnh viện"],
      },
      {
        heading: "Đủ nhóm hàng cho mọi thực đơn",
        body:
          "Rau củ quả, thịt cá, hàng đông lạnh, đồ khô, gia vị và thực phẩm chay được đặt chung ở một đầu mối, để bếp chủ động thực đơn cả tuần.",
        items: foodGroups,
      },
      quoteSection("Bà Rịa - Vũng Tàu"),
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có giao hàng đến Bà Rịa - Vũng Tàu không?",
        answer:
          "Có. TPS1 giao hàng theo lịch đã thống nhất với từng đơn vị. Quý khách vui lòng gửi địa điểm và tần suất giao để TPS1 sắp xếp tuyến phù hợp.",
      },
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-vung-tau",
    quoteTitle: "Cung cấp thực phẩm tại Bà Rịa - Vũng Tàu",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại Bà Rịa - Vũng Tàu.",
    relatedLinks: [link.phuMy, link.nhaHang, link.nhaMay, link.sanPham, link.baoGia],
  },
  nhonTrach: {
    eyebrow: "Nhơn Trạch",
    title: "Cung cấp thực phẩm tại Nhơn Trạch cho bếp ăn nhà máy và nhà hàng",
    description:
      "TPS1 giao thực phẩm theo ca cho bếp ăn nhà máy, đơn vị suất ăn và nhà hàng tại các khu công nghiệp Nhơn Trạch.",
    intro:
      "Các khu công nghiệp Nhơn Trạch nằm trên tuyến giao thường xuyên của TPS1 từ Biên Hòa về TP.HCM. Mỗi chuyến hàng đến bếp đúng giờ, để bữa ăn giữa ca của người lao động luôn đủ đầy và nóng hổi.",
    chips: ["Giao theo từng ca", "Hồ sơ đầy đủ", "Hàng hóa đạt chuẩn"],
    sections: [
      {
        heading: "Đúng giờ cho từng ca ăn",
        body:
          "Ở các khu công nghiệp Nhơn Trạch, bữa ăn giữa ca không thể chờ. TPS1 thống nhất khung giờ nhận hàng với từng bếp, chuẩn bị hàng theo định mức suất ăn và giữ đúng lịch đã hẹn.",
        items: [
          "Giao theo khung giờ của từng ca",
          "Định mức theo ngân sách suất ăn",
          "Thực phẩm có nguồn gốc rõ ràng",
        ],
      },
      {
        heading: "Hồ sơ đầy đủ cho bộ phận thu mua",
        body:
          "Bộ phận thu mua cần nhà cung cấp có hóa đơn VAT, chứng nhận an toàn thực phẩm và quy trình rõ ràng. TPS1 đạt ISO 22000, HACCP và có bảo hiểm trách nhiệm sản phẩm 5 tỷ đồng; hồ sơ được cung cấp đầy đủ khi đơn vị yêu cầu.",
        items: [
          "Chứng nhận ISO 22000 và HACCP",
          "Bảo hiểm trách nhiệm sản phẩm 5 tỷ đồng",
          "Hóa đơn VAT cho từng đợt mua",
        ],
      },
      quoteSection("Nhơn Trạch"),
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có cung cấp cho bếp ăn tại các khu công nghiệp Nhơn Trạch không?",
        answer:
          "Có. TPS1 cung cấp thực phẩm theo lịch cho bếp ăn nhà máy, đơn vị nấu suất ăn công nghiệp, cùng nhà hàng và quán ăn tại Nhơn Trạch. Lượng hàng và lịch giao được thống nhất theo nhu cầu thực tế của từng bếp.",
      },
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-nhon-trach",
    quoteTitle: "Cung cấp thực phẩm tại Nhơn Trạch",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại Nhơn Trạch.",
    relatedLinks: [link.dongNai, link.longThanh, link.tpHcm, link.phuMy, link.nhaMay, link.baoGia],
  },
  phuMy: {
    eyebrow: "Phú Mỹ",
    title: "Cung cấp thực phẩm tại Phú Mỹ cho bếp ăn nhà máy và khu cảng",
    description:
      "TPS1 giao thực phẩm theo lịch cho bếp ăn nhà máy, khu cảng và đơn vị suất ăn tại các khu công nghiệp Phú Mỹ.",
    intro:
      "Những ca làm việc nối tiếp nhau ở các khu công nghiệp và cụm cảng Phú Mỹ cần những bữa ăn đủ chất, đúng giờ. TPS1 mang nguồn thực phẩm có nguồn gốc rõ ràng đến bếp theo lịch đã thống nhất.",
    chips: ["Giao theo từng ca", "Hàng hóa đạt chuẩn", "Hồ sơ đầy đủ"],
    sections: [
      {
        heading: "Bữa ăn vững vàng cho những ca làm việc nặng nhọc",
        body:
          "Người lao động ở nhà máy thép, khu cảng và các khu công nghiệp Phú Mỹ cần bữa ăn đủ năng lượng cho cả ca dài. TPS1 chuẩn bị hàng theo định mức suất ăn và giao đúng khung giờ bếp nhận hàng.",
        items: [
          "Giao theo khung giờ của từng ca",
          "Định mức theo ngân sách suất ăn",
          "Hóa đơn và chứng từ an toàn thực phẩm",
        ],
      },
      {
        heading: "Đủ nhóm hàng cho bếp ăn công nghiệp",
        body:
          "Từ thịt cá tươi sống, hàng đông lạnh đến rau củ, đồ khô và gia vị, bếp đặt hàng ở một đầu mối và chủ động thực đơn cả tuần.",
        items: foodGroups,
      },
      quoteSection("Phú Mỹ"),
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có giao hàng đến các nhà máy tại khu công nghiệp Phú Mỹ không?",
        answer:
          "Có. TPS1 giao hàng đến bếp ăn của nhà máy theo lịch đã thống nhất. Quý khách vui lòng gửi địa điểm và tần suất giao để TPS1 sắp xếp tuyến phù hợp.",
      },
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-phu-my",
    quoteTitle: "Cung cấp thực phẩm tại Phú Mỹ",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại Phú Mỹ.",
    relatedLinks: [link.baRiaVungTau, link.nhonTrach, link.nhaMay, link.sanPham, link.baoGia],
  },
  hoNai: {
    eyebrow: "Hố Nai",
    title: "Cung cấp thực phẩm khu vực Hố Nai cho bếp ăn nhà máy và quán ăn",
    description:
      "Hố Nai nằm sát kho TPS1 tại Biên Hòa, nên bếp ăn nhà máy, quán ăn và nhà hàng trong khu vực nhận hàng sớm, tươi và đúng giờ.",
    intro:
      "Hố Nai chỉ cách kho TPS1 ở Tam Hiệp một chặng đường ngắn. Nhờ vậy, những chuyến hàng sớm kịp đến bếp trước giờ sơ chế, để từng suất ăn giữa ca và từng đĩa cơm ở quán quen đều được chuẩn bị chu đáo.",
    chips: ["Gần kho Biên Hòa", "Giao trước giờ sơ chế", "Hàng hóa đạt chuẩn"],
    sections: [
      {
        heading: "Thấu hiểu áp lực của mỗi ca bếp",
        body:
          "Người đứng bếp ở khu công nghiệp Hố Nai hiểu rõ áp lực khi hàng trăm suất ăn phải sẵn sàng đúng giờ. TPS1 thống nhất khung giờ nhận hàng từ đầu và hỗ trợ sơ chế theo yêu cầu, để bếp có thêm thời gian cho khâu nấu nướng.",
        items: [
          "Giao theo khung giờ của từng ca",
          "Sơ chế, cắt thái theo yêu cầu",
          "Một đầu mối phụ trách cố định",
        ],
      },
      {
        heading: "Nguồn gốc rõ ràng cho bữa ăn của người lao động",
        body:
          "Một bữa ăn ngon là sự quan tâm của doanh nghiệp dành cho người lao động. Quy trình của TPS1 đạt ISO 22000 và HACCP; hồ sơ nguồn gốc theo từng nhóm hàng luôn sẵn sàng khi bếp cần.",
        items: [
          "Chứng nhận ISO 22000 và HACCP",
          "Hồ sơ nguồn gốc theo nhóm hàng",
          "Bảo hiểm trách nhiệm sản phẩm 5 tỷ đồng",
        ],
      },
      quoteSection("Hố Nai"),
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có cung cấp hàng sơ chế sẵn để kịp ca sáng không?",
        answer:
          "Có. TPS1 hỗ trợ sơ chế, cắt thái theo yêu cầu đã thống nhất với bếp. Quý khách vui lòng ghi rõ quy cách khi gửi yêu cầu báo giá để TPS1 chuẩn bị phù hợp.",
      },
      smallKitchenFaq,
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-ho-nai",
    quoteTitle: "Cung cấp thực phẩm khu vực Hố Nai",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại khu vực Hố Nai.",
    relatedLinks: [link.bienHoa, link.trangBom, link.amata, link.nhaMay, link.quanAn, link.baoGia],
  },
  tamPhuoc: {
    eyebrow: "Tam Phước",
    title: "Cung cấp thực phẩm khu vực Tam Phước cho bếp ăn nhà máy",
    description:
      "TPS1 cung cấp thực phẩm có nguồn gốc rõ ràng, hồ sơ đầy đủ cho bếp ăn nhà máy và đơn vị suất ăn tại khu công nghiệp Tam Phước.",
    intro:
      "Phía sau mỗi ca làm việc ở khu công nghiệp Tam Phước là một gian bếp cần nguồn hàng vững vàng. TPS1 mang đến danh mục đủ đầy, giá rõ ràng và lịch giao được giữ đúng như đã hẹn.",
    chips: ["Danh mục đủ đầy", "Hồ sơ minh bạch", "Giao đúng lịch trình"],
    sections: [
      {
        heading: "Nguồn hàng vững vàng cho từng ca ăn",
        body:
          "Các nhà máy tại Tam Phước vận hành theo nhiều ca, nên bếp cần hàng về đúng giờ và đủ lượng. TPS1 thống nhất định mức, khung giờ nhận hàng và người phụ trách ngay từ đầu, để mọi điều chỉnh đều được trao đổi nhanh chóng.",
        items: [
          "Định mức theo từng ca",
          "Một đầu mối phụ trách cố định",
          "Trao đổi nhanh khi phát sinh",
        ],
      },
      {
        heading: "Thực đơn đổi mới, nguyên liệu luôn sẵn",
        body:
          "Đổi món thường xuyên là cách giữ bữa ăn giữa ca luôn hấp dẫn. Với hơn 5.000 mặt hàng từ đồ tươi sống đến đồ khô và gia vị, TPS1 giúp bếp trưởng thay đổi thực đơn mỗi ngày mà không lo thiếu nguyên liệu.",
        items: foodGroups,
      },
      {
        heading: "Hồ sơ rõ ràng cho kế toán và thu mua",
        body:
          "TPS1 cung cấp hóa đơn VAT cho từng đợt mua, chứng nhận ISO 22000, HACCP và hồ sơ nguồn gốc theo nhóm hàng, giúp bộ phận kế toán và thu mua yên tâm khi đối soát.",
        items: ["Hóa đơn VAT cho từng đợt mua", "Chứng nhận ISO 22000 và HACCP", "Hồ sơ nguồn gốc theo nhóm hàng"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "Nếu hàng giao đến chưa đạt yêu cầu thì xử lý thế nào?",
        answer:
          "Bếp kiểm tra hàng khi nhận. Nếu có sản phẩm chưa đạt yêu cầu, quý khách vui lòng báo ngay cho người phụ trách để TPS1 xử lý đổi hàng theo chính sách đã thống nhất.",
      },
    ],
    ctaLabel: "Gửi yêu cầu",
    quoteSlug: "thuc-pham-tam-phuoc",
    quoteTitle: "Cung cấp thực phẩm khu vực Tam Phước",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại khu vực Tam Phước.",
    relatedLinks: [link.bienHoa, link.longThanh, link.dongNai, link.nhaMay, link.baoGia],
  },
  vinhCuu: {
    eyebrow: "Vĩnh Cửu",
    title: "Cung cấp thực phẩm tại Vĩnh Cửu cho bếp ăn, nhà hàng và quán ăn",
    description:
      "TPS1 giao thực phẩm có nguồn gốc rõ ràng theo tuyến cho bếp ăn nhà máy, trường học, nhà hàng và quán ăn tại Vĩnh Cửu.",
    intro:
      "Mỗi bữa ăn tươm tất là một lời động viên dành cho người lao động. TPS1 mang thực phẩm có nguồn gốc rõ ràng đến bếp ăn nhà máy, trường học, nhà hàng và quán ăn tại Vĩnh Cửu theo tuyến giao định kỳ.",
    chips: ["Giao theo tuyến định kỳ", "Hàng hóa đạt chuẩn", "Linh hoạt thanh toán"],
    sections: [
      {
        heading: "Chu đáo trong từng bó rau, từng thớ thịt",
        body:
          "TPS1 hiểu rằng chất lượng mỗi suất ăn ảnh hưởng đến sức khỏe và tinh thần của cả một tập thể. Hàng được chọn lựa, phân loại theo quy cách và kiểm tra trước khi lên xe, để khi đến bếp vẫn giữ được độ tươi ngon.",
        items: [
          "Phân loại theo quy cách trước khi giao",
          "Thực phẩm có nguồn gốc rõ ràng",
          "Giữ lạnh với nhóm hàng tươi sống",
        ],
      },
      {
        heading: "Linh hoạt theo nhịp của từng gian bếp",
        body:
          "Lượng hàng mỗi ngày có thể thay đổi theo số người ăn hay thực đơn trong tuần. TPS1 cùng bếp thống nhất cách điều chỉnh đơn và hình thức thanh toán, để việc hợp tác luôn thuận lợi và lâu dài.",
        items: ["Điều chỉnh lượng hàng theo nhu cầu", "Linh hoạt thanh toán", "Một đầu mối phụ trách cố định"],
      },
      quoteSection("Vĩnh Cửu"),
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "Hàng giao đến Vĩnh Cửu có kịp ca sáng không?",
        answer:
          "TPS1 thống nhất khung giờ nhận hàng với từng bếp trước khi giao chuyến đầu tiên và sắp xếp tuyến để hàng đến đúng giờ đã hẹn.",
      },
      smallKitchenFaq,
    ],
    ctaLabel: "Gửi yêu cầu",
    quoteSlug: "thuc-pham-vinh-cuu",
    quoteTitle: "Cung cấp thực phẩm tại Vĩnh Cửu",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại Vĩnh Cửu.",
    relatedLinks: [link.dongNai, link.bienHoa, link.trangBom, link.truongHoc, link.baoGia],
  },
  amata: {
    eyebrow: "KCN Amata",
    title: "Cung cấp thực phẩm KCN Amata cho bếp ăn doanh nghiệp FDI",
    description:
      "TPS1 cung cấp thực phẩm đạt ISO 22000, HACCP, hồ sơ nguồn gốc đầy đủ cho bếp ăn doanh nghiệp FDI tại khu công nghiệp Amata, Biên Hòa.",
    intro:
      "Doanh nghiệp FDI tại khu công nghiệp Amata đặt yêu cầu rất cao về an toàn thực phẩm. TPS1 đáp ứng bằng quy trình đạt ISO 22000, HACCP và bộ hồ sơ rõ ràng cho từng nhóm hàng.",
    chips: ["Đạt ISO 22000 và HACCP", "Hồ sơ minh bạch", "Giao đúng lịch trình"],
    sections: [
      {
        heading: "Đáp ứng yêu cầu khắt khe của doanh nghiệp FDI",
        body:
          "Với các nhà máy vốn đầu tư nước ngoài, an toàn thực phẩm là điều kiện tiên quyết. TPS1 vận hành theo quy trình đạt ISO 22000 và HACCP, sẵn sàng phối hợp khi đơn vị cần đánh giá nhà cung cấp.",
        items: [
          "Chứng nhận ISO 22000 và HACCP",
          "Sẵn sàng phối hợp đánh giá nhà cung cấp",
          "Bảo hiểm trách nhiệm sản phẩm 5 tỷ đồng",
        ],
      },
      {
        heading: "Mỗi chuyến hàng là một lời cam kết",
        body:
          "Hàng được phân loại theo quy cách, đóng gói gọn gàng và giữ lạnh với nhóm hàng tươi sống, để khi vào cổng khu công nghiệp vẫn đạt đúng tiêu chuẩn bếp đã đặt ra.",
        items: ["Phân loại theo quy cách", "Đóng gói gọn gàng", "Giữ lạnh với nhóm hàng tươi sống"],
      },
      {
        heading: "Hồ sơ chuẩn mực cho bộ phận tuân thủ",
        body:
          "Bên cạnh chất lượng hàng hóa, TPS1 cung cấp hóa đơn VAT, hồ sơ năng lực và hồ sơ nguồn gốc theo nhóm hàng, hỗ trợ bộ phận thu mua và tuân thủ của đối tác.",
        items: ["Hóa đơn VAT cho từng đợt mua", "Hồ sơ năng lực công ty", "Hồ sơ nguồn gốc theo nhóm hàng"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có đủ hồ sơ để làm nhà cung cấp cho doanh nghiệp FDI tại Amata không?",
        answer:
          "TPS1 đạt chứng nhận ISO 22000, HACCP, có bảo hiểm trách nhiệm sản phẩm 5 tỷ đồng và cung cấp hồ sơ nguồn gốc theo từng nhóm hàng. Quý khách vui lòng gửi danh mục hồ sơ cần có để TPS1 chuẩn bị đầy đủ.",
      },
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-amata",
    quoteTitle: "Cung cấp thực phẩm KCN Amata",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại KCN Amata.",
    relatedLinks: [link.bienHoa, link.longThanh, link.nhaMay, link.baoGia],
  },
  trangBom: {
    eyebrow: "Trảng Bom",
    title: "Cung cấp thực phẩm tại Trảng Bom cho bếp ăn nhà máy và quán ăn",
    description:
      "TPS1 giao thực phẩm theo lịch cho bếp ăn nhà máy tại Bàu Xéo, Sông Mây, Giang Điền cùng nhà hàng, quán ăn ở Trảng Bom.",
    intro:
      "Trảng Bom nhộn nhịp với những khu công nghiệp Bàu Xéo, Sông Mây, Giang Điền. Mỗi sáng, chuyến hàng của TPS1 từ Biên Hòa lên đường, để gian bếp nhà máy và quán ăn quanh khu công nghiệp có đủ nguyên liệu cho một ngày dài.",
    chips: ["Gần kho Biên Hòa", "Giao theo từng ca", "Hàng hóa đạt chuẩn"],
    sections: [
      {
        heading: "Chia sẻ áp lực của những gian bếp quy mô lớn",
        body:
          "Nhiều nhà máy ở Trảng Bom phục vụ số lượng suất ăn lớn mỗi ngày, nên nguồn hàng cần đều đặn và đúng lượng. TPS1 thống nhất định mức theo từng ca, giữ đúng lịch giao và báo trước khi mùa vụ ảnh hưởng đến nguồn hàng.",
        items: [
          "Định mức theo từng ca",
          "Lịch giao thống nhất từ đầu",
          "Báo trước khi mùa vụ thay đổi",
        ],
      },
      {
        heading: "Chất lượng đồng đều qua từng chuyến hàng",
        body:
          "Dù đơn hàng lớn hay nhỏ, mỗi bó rau, mỗi phần thịt đều được phân loại theo quy cách trước khi giao. Hàng đồng đều giúp bếp trưởng yên tâm chế biến, giảm hao hụt khi sơ chế.",
        items: ["Phân loại theo quy cách", "Giữ lạnh với nhóm hàng tươi sống", "Bếp kiểm tra và ký nhận khi hàng đến"],
      },
      {
        heading: "Giao nhận chu đáo, khởi đầu ngày mới suôn sẻ",
        body:
          "Nhân viên giao hàng của TPS1 phối hợp cùng bếp kiểm đếm, sắp xếp hàng gọn gàng, để mỗi buổi sáng ở gian bếp bắt đầu nhẹ nhàng và đúng giờ.",
        items: ["Kiểm đếm cùng bếp khi nhận hàng", "Sắp xếp hàng gọn gàng", "Một đầu mối phụ trách cố định"],
      },
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "TPS1 có giao hàng đến các khu công nghiệp Bàu Xéo, Sông Mây, Giang Điền không?",
        answer:
          "Có. TPS1 giao hàng theo lịch đã thống nhất đến bếp ăn nhà máy tại các khu công nghiệp ở Trảng Bom. Chi phí và lịch giao được trao đổi cụ thể khi báo giá.",
      },
      smallKitchenFaq,
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-trang-bom",
    quoteTitle: "Cung cấp thực phẩm tại Trảng Bom",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại Trảng Bom.",
    relatedLinks: [link.dongNai, link.bienHoa, link.amata, link.nhaMay, link.quanAn, link.baoGia],
  },
  longThanh: {
    eyebrow: "Long Thành",
    title: "Cung cấp thực phẩm tại Long Thành cho bếp ăn, nhà hàng và quán ăn",
    description:
      "TPS1 giao thực phẩm theo lịch cho bếp ăn nhà máy tại Lộc An, Bình Sơn, An Phước cùng nhà hàng, quán ăn ở Long Thành.",
    intro:
      "Long Thành đang chuyển mình từng ngày cùng sân bay và các khu công nghiệp mới. TPS1 sẵn sàng mang nguồn thực phẩm có nguồn gốc rõ ràng đến bếp ăn nhà máy, nhà hàng và quán ăn nơi đây theo lịch giao ổn định.",
    chips: ["Lộc An, Bình Sơn, An Phước", "Giao đúng lịch trình", "Hàng hóa đạt chuẩn"],
    sections: [
      {
        heading: "Sẵn sàng cho một vùng đất đang chuyển mình",
        body:
          "Cùng với sân bay Long Thành, các khu công nghiệp Lộc An, Bình Sơn, An Phước đang thu hút thêm nhiều nhà máy, kéo theo nhu cầu bữa ăn cho người lao động. Long Thành nằm trên tuyến giao thường xuyên của TPS1 từ Biên Hòa, nên lịch giao được giữ ổn định.",
        items: [
          "Nằm trên tuyến giao thường xuyên",
          "Lịch giao thống nhất từ đầu",
          "Một đầu mối phụ trách cố định",
        ],
      },
      {
        heading: "Ngon miệng mà vẫn vừa định mức",
        body:
          "Làm sao để bữa ăn vừa ngon, đủ chất mà không vượt định mức là câu hỏi của mọi bếp trưởng. TPS1 cùng bếp chọn nhóm hàng phù hợp ngân sách và gợi ý hàng thay thế khi giá biến động.",
        items: [
          "Tư vấn nhóm hàng theo định mức suất ăn",
          "Gợi ý hàng thay thế khi giá biến động",
          "Nguyên liệu tươi theo ngày",
        ],
      },
      quoteSection("Long Thành"),
    ],
    faqs: [
      ...baseFaqs,
      {
        question: "Giao thông khu vực Long Thành đông đúc, TPS1 giữ lịch giao thế nào?",
        answer:
          "TPS1 sắp xếp tuyến và giờ xuất phát theo khung giờ bếp nhận hàng đã thống nhất, có tính trước thời gian di chuyển, để hàng đến đúng giờ đã hẹn.",
      },
      smallKitchenFaq,
    ],
    ctaLabel: "Nhận báo giá",
    quoteSlug: "thuc-pham-long-thanh",
    quoteTitle: "Cung cấp thực phẩm tại Long Thành",
    quoteSummary: "Nhu cầu mua thực phẩm theo lịch tại Long Thành.",
    relatedLinks: [link.dongNai, link.nhonTrach, link.amata, link.tpHcm, link.nhaMay, link.baoGia],
  },
};
