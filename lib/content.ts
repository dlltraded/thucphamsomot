export type ContentSection = {
  heading: string;
  body: string;
  items?: string[];
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type ContentItem = {
  slug: string;
  title: string;
  description?: string;
  summary?: string;
  features?: string[];
  targets?: string[];
  highlights?: string[];
  sections?: ContentSection[];
  faqs?: FaqItem[];
};

const sharedFaqs: FaqItem[] = [
  {
    question: "Có nhận giao định kỳ cho bếp ăn không?",
    answer:
      "Có. Khách có thể gửi nhu cầu theo lịch giao ngày, tuần hoặc theo ca để đội bán hàng tư vấn quy cách và báo giá phù hợp.",
  },
  {
    question: "Khách cần cung cấp thông tin gì để nhận báo giá?",
    answer:
      "Nên gửi nhóm hàng cần mua, số lượng dự kiến, địa điểm giao, tần suất giao và yêu cầu riêng về sơ chế, đóng gói hoặc bảo quản.",
  },
  {
    question: "Khu vực phục vụ chính là ở đâu?",
    answer:
      "Trọng tâm là Đồng Nai, Biên Hòa và các khu vực lân cận như Long Thành, Trảng Bom, Nhơn Trạch, Dĩ An và Thủ Đức nếu lịch giao phù hợp.",
  },
];

export const categories: ContentItem[] = [
  {
    slug: "rau-cu-qua",
    title: "Rau củ quả",
    description:
      "Rau củ quả tươi cho bếp ăn tập thể, trường học, bệnh viện, nhà hàng và đơn vị suất ăn công nghiệp.",
    highlights: ["Nguồn Đà Lạt, Miền Tây, Bảo Lộc", "Có nhóm hàng VietGAP", "Giao theo lịch bếp"],
    sections: [
      {
        heading: "Nguồn hàng phù hợp bếp quy mô lớn",
        body:
          "Nhóm rau củ quả được tổ chức theo nhu cầu của bếp quy mô lớn: nguồn cung ổn định, danh mục dễ kiểm soát và phù hợp canteen, trường học, bệnh viện, bếp ăn doanh nghiệp.",
        items: [
          "Rau củ quả theo mùa từ Đà Lạt và Miền Tây",
          "Nhóm hàng hợp tác từ nhà vườn Bảo Lộc",
          "Một số mặt hàng khó tìm như lá mè Hàn Quốc, ngồng tỏi, khoai mỡ trắng, trái cây nhập khẩu",
        ],
      },
      {
        heading: "Điểm cần kiểm soát khi nhận hàng",
        body:
          "Khách B2B thường quan tâm quy cách nhận hàng, độ tươi, tỷ lệ hao hụt và khả năng giữ lịch giao ổn định qua nhiều ca bếp.",
        items: ["Bảo quản và vận chuyển có kiểm soát", "Lịch giao theo khung giờ bếp", "Tư vấn danh mục theo menu và ngân sách"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "thit-ca-hai-san",
    title: "Thịt cá hải sản",
    description:
      "Nhóm thực phẩm giàu đạm cho nhà hàng, khách sạn, bếp ăn tập thể, bệnh viện và suất ăn công nghiệp.",
    highlights: ["Thủy hải sản về kho mỗi ngày", "Nguồn thịt từ đơn vị lớn", "Quy cách theo nhu cầu bếp"],
    sections: [
      {
        heading: "Nguồn cung thịt cá cho đơn hàng lớn",
        body:
          "Nguồn thủy hải sản và thịt cá được trình bày theo năng lực cung ứng: nhóm hàng, quy cách, tần suất giao và khả năng đáp ứng đơn hàng lặp lại.",
        items: ["Cá và hải sản tươi sống", "Thịt heo, bò, gà theo quy cách", "Phù hợp đơn hàng lặp lại cho bếp công nghiệp"],
      },
      {
        heading: "Tín hiệu tin cậy khi mua hàng",
        body:
          "Đây là nhóm hàng nhạy về an toàn thực phẩm. Khách cần quan tâm quy trình nhận hàng, bảo quản, đổi trả và phản hồi khi phát sinh sự cố.",
        items: ["Kiểm tra cảm quan khi nhận hàng", "Tư vấn lịch giao theo ngày chế biến", "Ưu tiên ổn định giá cho khách mua định kỳ"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "hang-dong-lanh",
    title: "Hàng đông lạnh",
    description:
      "Thực phẩm đông lạnh cho bếp cần tối ưu tồn kho, giữ chất lượng và chủ động kế hoạch nguyên liệu.",
    highlights: ["Kho đông lạnh", "Thịt bò, gà, cá, hải sản", "Phục vụ trường học, công ty, bếp tập thể"],
    sections: [
      {
        heading: "Nhóm hàng đặc thù",
        body:
          "Danh mục đông lạnh có thể gồm thịt bò, gà, cá và hải sản theo quy cách. Khách có thể dùng nhóm hàng này làm danh mục tham khảo khi gửi yêu cầu báo giá.",
        items: ["Thịt bò đông lạnh", "Gà đông lạnh", "Cá và hải sản đông lạnh", "Nhóm hàng theo kế hoạch menu"],
      },
      {
        heading: "Bảo quản và kế hoạch tồn kho",
        body:
          "Khách hàng mua hàng đông lạnh quan tâm kho lạnh, nhiệt độ bảo quản, tốc độ giao và kế hoạch tồn kho để chủ động nguyên liệu cho bếp.",
        items: ["Kho lạnh diện tích lớn", "Giao theo kế hoạch sử dụng", "Giảm rủi ro thiếu hàng vào giờ cao điểm"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "gia-vi",
    title: "Gia vị",
    description:
      "Gia vị chay mặn, Âu - Á và vật tư nhà bếp phục vụ chế biến chuyên nghiệp cho canteen, nhà hàng và bếp công nghiệp.",
    highlights: ["Gia vị món Hoa", "Gia vị món Hàn", "Gia vị món Âu", "Đủ danh mục bếp"],
    sections: [
      {
        heading: "Gia vị cho bếp vận hành đều",
        body:
          "Nhóm gia vị phục vụ chuỗi nhà hàng, canteen trường học, bệnh viện và suất ăn công nghiệp, giúp bếp chuẩn hóa hương vị và chi phí.",
        items: ["Gia vị món Việt, Hoa, Hàn, Âu", "Gia vị chay mặn", "Vật tư, đồ dùng và thiết bị bếp khi có nhu cầu"],
      },
      {
        heading: "Giá trị với khách B2B",
        body:
          "Gia vị là nhóm giúp giữ chất lượng món ổn định giữa nhiều ca nấu, đồng thời hỗ trợ định mức, danh mục thay thế và khả năng đáp ứng khi menu thay đổi.",
        items: ["Hỗ trợ chuẩn hóa menu", "Tư vấn danh mục theo món", "Đáp ứng đơn hàng lặp lại"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "thuc-pham-chay",
    title: "Thực phẩm chay",
    description:
      "Thực phẩm chay và gia vị chay cho nhà hàng, bếp ăn, trường học, sự kiện và đơn vị cần menu linh hoạt.",
    highlights: ["Nhà phân phối chuyên biệt", "Menu chay linh hoạt", "Phù hợp nhiều đối tượng"],
    sections: [
      {
        heading: "Nguồn hàng chay đa dạng",
        body:
          "Nhóm sản phẩm chay được trình bày theo nguồn hàng rõ, dễ bổ sung vào menu ngày rằm, sự kiện hoặc bữa ăn có nhu cầu đặc biệt.",
        items: ["Thực phẩm chế biến món chay", "Gia vị chay", "Nguyên liệu chay theo nhu cầu bếp"],
      },
      {
        heading: "Ứng dụng thực tế",
        body:
          "Nhóm này phù hợp cho ngày rằm, sự kiện, thực đơn trường học, nhà hàng chay hoặc bếp cần phục vụ nhiều khẩu vị khác nhau.",
        items: ["Menu chay định kỳ", "Menu sự kiện", "Phương án thay thế món mặn khi cần"],
      },
    ],
    faqs: sharedFaqs,
  },
];

export const industries: ContentItem[] = [
  {
    slug: "bep-an-tap-the",
    title: "Bếp ăn tập thể",
    description: "Cung ứng thực phẩm theo định mức, lịch giao và quy trình rõ ràng cho bếp vận hành hằng ngày.",
    targets: ["Khu công nghiệp", "Trường học", "Bệnh viện", "Nhà máy"],
    sections: [
      {
        heading: "Nhu cầu chính",
        body:
          "Bếp ăn tập thể cần nguồn hàng đủ số lượng, lịch giao ổn định và danh mục dễ kiểm soát để phục vụ lặp lại theo tuần hoặc theo tháng.",
        items: ["Lập danh mục hàng theo menu", "Giao theo khung giờ bếp nhận hàng", "Tư vấn thay thế khi giá hoặc mùa vụ biến động"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "suat-an-cong-nghiep",
    title: "Suất ăn công nghiệp",
    description: "Hỗ trợ nguyên liệu, menu và tối ưu chi phí cho đơn vị cung cấp suất ăn số lượng lớn.",
    targets: ["Bữa ăn số lượng lớn", "Ca sáng trưa tối", "Menu chuẩn hóa"],
    sections: [
      {
        heading: "Tối ưu chi phí trên từng suất ăn",
        body:
          "Đơn vị suất ăn công nghiệp cần phối hợp menu, định lượng nguyên liệu và cân đối chi phí cho từng suất ăn.",
        items: ["Tư vấn định lượng nguyên liệu", "Gợi ý danh mục thay thế", "Giữ nguồn cung ổn định cho hợp đồng dài hạn"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "truong-hoc",
    title: "Trường học",
    description: "Nguyên liệu an toàn, truy xuất dễ, phù hợp bữa ăn cho học sinh, mầm non và trường nội trú.",
    targets: ["Mầm non", "Tiểu học", "Trung học", "Nội trú"],
    sections: [
      {
        heading: "Ưu tiên an toàn và dinh dưỡng",
        body:
          "Nhóm trường học cần an toàn thực phẩm, độ tươi, lịch giao đúng giờ và thực đơn phù hợp học sinh.",
        items: ["Rau củ tươi", "Thịt cá theo định lượng", "Thực phẩm chay hoặc menu đặc biệt khi cần"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "benh-vien",
    title: "Bệnh viện",
    description: "Danh mục thực phẩm cần kiểm soát chất lượng và nhịp giao ổn định cho bếp bệnh viện.",
    targets: ["Suất ăn bệnh nhân", "Nhân viên y tế", "Menu dinh dưỡng"],
    sections: [
      {
        heading: "Phục vụ nhóm nhu cầu đặc thù",
        body:
          "Bếp bệnh viện thường có nhiều nhóm khẩu phần khác nhau. Danh mục hàng cần hỗ trợ phối hợp menu theo từng đối tượng ăn.",
        items: ["Người bệnh", "Nhân viên y tế", "Thực đơn mềm, thanh đạm hoặc đặc thù"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "nha-hang-khach-san",
    title: "Nhà hàng, khách sạn",
    description: "Nguồn hàng chuyên nghiệp cho bếp vận hành liên tục, menu thay đổi và yêu cầu chất lượng ổn định.",
    targets: ["Bếp khách sạn", "Nhà hàng", "Ẩm thực đa phong cách"],
    sections: [
      {
        heading: "Danh mục rộng cho bếp chuyên nghiệp",
        body:
          "Nhà hàng và khách sạn cần danh mục đa dạng, có cả hàng tươi, hàng đông lạnh, gia vị Âu - Á và khả năng xử lý phát sinh nhanh.",
        items: ["Rau củ quả", "Thịt cá hải sản", "Gia vị món Hoa, Hàn, Âu", "Hàng đặc thù theo menu"],
      },
    ],
    faqs: sharedFaqs,
  },
];

export const services: ContentItem[] = [
  {
    slug: "tu-van-menu",
    title: "Tư vấn menu",
    description: "Đề xuất danh mục món và nguyên liệu phù hợp ngân sách, định lượng và đối tượng ăn.",
    sections: [
      {
        heading: "Từ menu đến danh mục mua hàng",
        body:
          "Dịch vụ này giúp khách chuyển từ thực đơn sang danh sách nguyên liệu, định lượng và lịch giao cụ thể.",
        items: ["Ra menu cho bếp ăn tập thể", "Cân đối chi phí theo suất", "Gợi ý nhóm hàng thay thế"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "setup-bep-an",
    title: "Setup bếp ăn",
    description: "Hỗ trợ tính toán danh mục hàng, lưu kho và luồng vận hành cho bếp mới.",
    sections: [
      {
        heading: "Chuẩn bị trước khi bếp chạy thật",
        body:
          "Setup bếp cần chuẩn bị tiêu chuẩn vệ sinh an toàn thực phẩm, thiết bị, dụng cụ và quy trình nhập hàng ngay từ đầu.",
        items: ["Tư vấn danh mục thiết bị", "Lập luồng nhận hàng", "Chuẩn hóa khu sơ chế, lưu kho, chế biến"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "tinh-toan-dinh-duong",
    title: "Tính toán dinh dưỡng",
    description: "Phối hợp nguyên liệu theo nhóm đối tượng: trẻ em, người bệnh, phụ nữ mang thai, lao động nặng.",
    sections: [
      {
        heading: "Mỗi nhóm ăn có nhu cầu khác nhau",
        body:
          "Các nhóm như người bệnh, trẻ em, phụ nữ mang thai hoặc người lao động nặng cần khẩu phần và định lượng nguyên liệu khác nhau.",
        items: ["Tính định lượng khẩu phần", "Cân đối nhóm đạm, rau củ, tinh bột", "Đề xuất menu theo môi trường làm việc"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "cung-cap-dinh-ky",
    title: "Cung cấp định kỳ",
    description: "Lịch giao và quy cách ổn định để giảm rủi ro thiếu hàng, hư hao và thất thoát.",
    sections: [
      {
        heading: "Phù hợp hợp đồng dài hạn",
        body:
          "Dịch vụ này dành cho khách có nhu cầu mua lặp lại, cần ổn định chất lượng, thời gian giao và kế hoạch chi phí.",
        items: ["Lịch giao theo ngày hoặc theo tuần", "Danh mục hàng cố định", "Điều chỉnh theo mùa vụ và menu"],
      },
    ],
    faqs: sharedFaqs,
  },
];

export const products: ContentItem[] = [
  {
    slug: "rau-cu-qua-tuoi-song",
    title: "Rau củ quả tươi sống",
    summary: "Nguồn rau củ theo mùa, chọn lọc cho bếp ăn tập thể và suất ăn công nghiệp.",
    features: ["Đầu vào kiểm soát", "Có thể giao định kỳ", "Phù hợp số lượng lớn"],
    targets: ["Bếp ăn tập thể", "Trường học", "Bệnh viện"],
    sections: categories[0].sections,
    faqs: categories[0].faqs,
  },
  {
    slug: "thit-ca-hai-san-tuoi-song",
    title: "Thịt cá hải sản tươi sống",
    summary: "Danh mục đạm động vật phục vụ menu ổn định và tiêu chuẩn vệ sinh cao.",
    features: ["Tươi mới", "Quy cách rõ", "Nguồn hàng ổn định"],
    targets: ["Nhà hàng", "Khách sạn", "Suất ăn công nghiệp"],
    sections: categories[1].sections,
    faqs: categories[1].faqs,
  },
  {
    slug: "hang-dong-lanh",
    title: "Hàng đông lạnh",
    summary: "Nhóm hàng đông lạnh cho đơn vị cần tối ưu tồn kho và kế hoạch vận hành.",
    features: ["Bảo quản chuẩn", "Giao định kỳ", "Hỗ trợ số lượng lớn"],
    targets: ["Bếp ăn tập thể", "Nhà máy", "Bếp trung tâm"],
    sections: categories[2].sections,
    faqs: categories[2].faqs,
  },
  {
    slug: "gia-vi-nha-bep",
    title: "Gia vị nhà bếp",
    summary: "Gia vị chay mặn, Âu - Á và vật tư giúp chuẩn hóa hương vị món ăn.",
    features: ["Đủ chủng loại", "Tối ưu chi phí", "Dễ tiêu chuẩn hóa"],
    targets: ["Nhà hàng", "Bếp công nghiệp", "Cơ sở chế biến"],
    sections: categories[3].sections,
    faqs: categories[3].faqs,
  },
  {
    slug: "thuc-pham-chay",
    title: "Thực phẩm chay",
    summary: "Danh mục chay phù hợp menu linh hoạt, sự kiện và khẩu vị đa dạng.",
    features: ["Dễ kết hợp", "Giao theo nhu cầu", "Nguồn hàng ổn định"],
    targets: ["Nhà hàng chay", "Bếp ăn trường học", "Menu sự kiện"],
    sections: categories[4].sections,
    faqs: categories[4].faqs,
  },
];

export const posts: ContentItem[] = [
  {
    slug: "cach-lap-menu-bep-an-tap-the",
    title: "Cách lập menu cho bếp ăn tập thể",
    description: "Hướng dẫn giúp tối ưu chi phí, dinh dưỡng và tính ổn định của nguyên liệu.",
    sections: [
      {
        heading: "Một menu tốt phải đi cùng kế hoạch mua hàng",
        body:
          "Một menu tốt bắt đầu từ việc xác định đối tượng ăn, định mức nguyên liệu, nhóm món chính, rau, canh, trái cây và lịch giao.",
        items: ["Xác định ngân sách theo suất", "Chọn nhóm nguyên liệu ổn định", "Dự phòng hàng thay thế"],
      },
    ],
  },
  {
    slug: "cach-chon-nha-cung-cap-thuc-pham",
    title: "Cách chọn nhà cung cấp thực phẩm cho suất ăn công nghiệp",
    description: "Checklist đánh giá nguồn hàng, lịch giao, vệ sinh và năng lực xử lý đơn hàng lớn.",
    sections: [
      {
        heading: "Những tiêu chí cần kiểm tra",
        body:
          "Khách có thể đánh giá nhà cung cấp qua nguồn hàng, chứng từ, khả năng giao đúng giờ, quy trình xử lý phát sinh và năng lực tư vấn menu.",
        items: ["Nguồn hàng rõ", "Lịch giao ổn định", "Có quy trình đổi trả", "Phản hồi nhanh khi thiếu hàng"],
      },
    ],
  },
  {
    slug: "tieu-chuan-chon-rau-cu-qua",
    title: "Tiêu chuẩn chọn rau củ quả cho bếp quy mô lớn",
    description: "Các tiêu chí nhận hàng, bảo quản và truy xuất nguồn gốc cho bếp quy mô lớn.",
    sections: [
      {
        heading: "Từ độ tươi đến tỷ lệ hao hụt",
        body:
          "Bếp quy mô lớn cần kiểm tra màu sắc, độ giòn, quy cách đóng gói, nhiệt độ bảo quản, thời gian giao và cách giảm hao hụt khi sơ chế.",
        items: ["Kiểm tra cảm quan", "Nhận hàng đúng giờ", "Sơ chế và lưu kho hợp lý"],
      },
    ],
  },
  {
    slug: "phuong-phap-cap-dong-thuc-pham",
    title: "Phương pháp cấp đông thực phẩm và lợi ích với bếp công nghiệp",
    description:
      "Giải thích cách cấp đông giúp giữ chất lượng, giảm rủi ro vi sinh và hỗ trợ kế hoạch tồn kho cho bếp.",
    sections: [
      {
        heading: "Cấp đông không chỉ là đưa vào tủ lạnh",
        body:
          "Cấp đông giúp thực phẩm đi vào trạng thái đông nhanh, sau đó bảo quản trong kho lạnh để giữ chất lượng trước khi dùng.",
        items: ["Giữ độ tươi và cấu trúc thực phẩm", "Hạn chế vi khuẩn phát triển", "Chủ động tồn kho cho đơn hàng lớn"],
      },
    ],
  },
];

export const policies: ContentItem[] = [
  {
    slug: "bao-mat",
    title: "Chính sách bảo mật",
    description: "Cách chúng tôi xử lý dữ liệu liên hệ và thông tin yêu cầu báo giá.",
    sections: [
      {
        heading: "Thông tin được thu thập",
        body:
          "Website thu thập thông tin khách gửi qua form như họ tên, số điện thoại, công ty và nhu cầu báo giá để đội bán hàng liên hệ lại.",
      },
    ],
  },
  {
    slug: "giao-hang",
    title: "Chính sách giao hàng",
    description: "Khung thời gian, khu vực giao và cách phối hợp nhận hàng.",
    sections: [
      {
        heading: "Nguyên tắc giao hàng",
        body:
          "Lịch giao sẽ được xác nhận theo khu vực, nhóm hàng, khung giờ nhận hàng của bếp và khả năng chuẩn bị hàng trong ngày.",
      },
    ],
  },
  {
    slug: "doi-tra",
    title: "Chính sách đổi trả",
    description: "Nguyên tắc xử lý hàng lỗi, sai quy cách hoặc phát sinh trong giao nhận.",
    sections: [
      {
        heading: "Xử lý phát sinh khi nhận hàng",
        body:
          "Khách kiểm tra hàng khi nhận. Trường hợp sai quy cách, thiếu hàng hoặc hàng không đạt yêu cầu sẽ được ghi nhận để xử lý theo từng đơn.",
      },
    ],
  },
];

export function findBySlug<T extends ContentItem>(items: T[], slug: string) {
  return items.find((item) => item.slug === slug);
}

export const productImageBySlug: Record<string, string> = {
  "rau-cu-qua-tuoi-song": "/images/tps1-cover-food.jpg",
  "thit-ca-hai-san-tuoi-song": "/images/tps1-quality.jpg",
  "hang-dong-lanh": "/images/tps1-warehouse-wide.jpg",
  "gia-vi-nha-bep": "/images/tps1-kitchen.jpg",
  "thuc-pham-chay": "/images/tps1-team.jpg",
};
