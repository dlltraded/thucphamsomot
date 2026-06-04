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
    description: "Hướng dẫn bếp ăn xây menu theo ngân sách, khẩu phần và độ ổn định của nguồn hàng.",
    sections: [
      {
        heading: "Một menu tốt phải đi cùng kế hoạch mua hàng",
        body:
          "Một menu tốt bắt đầu từ việc xác định đối tượng ăn, định mức nguyên liệu, nhóm món chính, rau, canh, trái cây và lịch giao. Khi menu không tách khỏi kế hoạch mua hàng, bếp dễ tính chi phí thật hơn và giảm phát sinh ở khâu nhập hàng.",
        items: ["Xác định ngân sách theo suất", "Chọn nhóm nguyên liệu ổn định", "Dự phòng hàng thay thế khi mùa vụ thay đổi"],
      },
      {
        heading: "Cách chia menu để dễ báo giá",
        body:
          "Nên chia menu theo nhóm nguyên liệu có khả năng thay thế, theo nhịp giao và theo mức độ ưu tiên của từng món. Làm như vậy giúp đội mua hàng báo giá nhanh hơn và giảm nhầm lẫn giữa các ca bếp.",
        items: ["Nhóm món cố định", "Nhóm nguyên liệu linh hoạt", "Nhóm hàng cần báo trước nhiều ngày"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "cach-chon-nha-cung-cap-thuc-pham",
    title: "Cách chọn nhà cung cấp thực phẩm cho suất ăn công nghiệp",
    description: "Checklist đánh giá nguồn hàng, lịch giao, vệ sinh và năng lực xử lý đơn hàng lớn.",
    sections: [
      {
        heading: "Những tiêu chí cần kiểm tra",
        body:
          "Khách có thể đánh giá nhà cung cấp qua nguồn hàng, chứng từ, khả năng giao đúng giờ, quy trình xử lý phát sinh và năng lực tư vấn menu. Với đơn hàng lặp lại, sự ổn định quan trọng hơn cảm giác rẻ ban đầu.",
        items: ["Nguồn hàng rõ", "Lịch giao ổn định", "Có quy trình đổi trả", "Phản hồi nhanh khi thiếu hàng"],
      },
      {
        heading: "Cách kiểm tra thực tế trước khi ký dài hạn",
        body:
          "Nên nhìn vào quy trình báo giá, cách phản hồi đơn phát sinh và chất lượng hàng ở lần giao đầu. Nếu ba điểm này đã mượt, khả năng vận hành dài hạn thường cao hơn.",
        items: ["Kiểm tra thời gian phản hồi", "Quan sát cách đóng gói và kiểm hàng", "Xem họ xử lý thay đổi menu như thế nào"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "tieu-chuan-chon-rau-cu-qua",
    title: "Tiêu chuẩn chọn rau củ quả cho bếp quy mô lớn",
    description: "Các tiêu chí nhận hàng, bảo quản và truy xuất nguồn gốc cho bếp quy mô lớn.",
    sections: [
      {
        heading: "Từ độ tươi đến tỷ lệ hao hụt",
        body:
          "Bếp quy mô lớn cần kiểm tra màu sắc, độ giòn, quy cách đóng gói, nhiệt độ bảo quản, thời gian giao và cách giảm hao hụt khi sơ chế. Chỉ cần đầu vào lệch nhẹ, tỷ lệ thất thoát đã tăng rõ ở khâu chuẩn bị.",
        items: ["Kiểm tra cảm quan", "Nhận hàng đúng giờ", "Sơ chế và lưu kho hợp lý"],
      },
      {
        heading: "Tiêu chuẩn nhận hàng nên ghi thành checklist",
        body:
          "Checklist giúp bếp không phụ thuộc vào cảm tính người nhận hàng. Khi từng tiêu chí được viết rõ, việc đối chiếu giữa các ca làm việc cũng minh bạch hơn.",
        items: ["Quy cách theo nhóm hàng", "Tình trạng bao bì", "Hạn dùng và nhiệt độ giao"],
      },
    ],
    faqs: sharedFaqs,
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
          "Cấp đông giúp thực phẩm đi vào trạng thái đông nhanh, sau đó bảo quản trong kho lạnh để giữ chất lượng trước khi dùng. Nếu quy trình chuẩn, bếp có thể chủ động tồn kho mà không làm giảm chất lượng cảm quan quá nhiều.",
        items: ["Giữ độ tươi và cấu trúc thực phẩm", "Hạn chế vi khuẩn phát triển", "Chủ động tồn kho cho đơn hàng lớn"],
      },
      {
        heading: "Khi nào bếp nên ưu tiên hàng đông lạnh",
        body:
          "Nhóm hàng đông lạnh phù hợp khi bếp cần kế hoạch mua theo tuần hoặc theo tháng, hoặc khi menu cần độ ổn định cao hơn độ linh hoạt của hàng tươi.",
        items: ["Hợp với vận hành theo kế hoạch", "Giảm rủi ro đứt nguồn hàng", "Dễ chuẩn hóa định lượng"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "checklist-gui-yeu-cau-bao-gia-nhanh",
    title: "Checklist gửi yêu cầu báo giá nhanh cho canteen và suất ăn công nghiệp",
    description: "Danh sách thông tin cần chuẩn bị để nhận báo giá nhanh và không bị hỏi lại nhiều lần.",
    sections: [
      {
        heading: "Muốn báo giá nhanh thì phải phân cấp thông tin ngay từ đầu",
        body:
          "Khách hàng càng viết rõ nhóm hàng, số lượng, địa điểm giao và tần suất giao thì đội bán hàng càng dễ ra phương án sát nhu cầu. Form càng ít câu hỏi phụ thì tốc độ phản hồi càng cao.",
        items: ["Nhóm hàng cần mua", "Số lượng dự kiến", "Địa điểm giao", "Thời gian cần hàng"],
      },
      {
        heading: "Thông tin nên thêm nếu mua định kỳ",
        body:
          "Nếu khách mua lặp lại, nên ghi thêm mức độ thay đổi được chấp nhận, thời gian nhận hàng, đầu mối phụ trách và các mặt hàng cần báo trước nhiều ngày.",
        items: ["Mức độ linh hoạt về quy cách", "Khung giờ nhận hàng", "Người liên hệ phụ trách đơn"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "cach-chon-thuc-pham-cho-bep-an-tap-the",
    title: "Cách chọn thực phẩm cho bếp ăn tập thể để giảm hao hụt",
    description: "Cách chọn nhóm hàng, tỉ lệ hao hụt và tiêu chí nhận hàng phù hợp với bếp quy mô lớn.",
    sections: [
      {
        heading: "Hao hụt tế nhị là vấn đề vận hành, không chỉ là vấn đề mua hàng",
        body:
          "Bếp ăn tập thể cần đo lường tỷ lệ hao hụt từ khâu cân nhận hàng, sơ chế, lưu kho cho đến quản lý menu hằng ngày. Nếu không kiểm soát ngay từ đầu, hao hụt sẽ lan sang cả chi phí nhân công và chi phí tồn kho.",
        items: ["Chọn đầu vào đồng đều", "Lệnh giao ổn định", "Kiểm tra theo cảm quan và quy cách"],
      },
      {
        heading: "Cách giảm hao hụt bằng cách mua đúng nhóm hàng",
        body:
          "Không phải mặt hàng nào cũng cần mua theo kiểu giống nhau. Có nhóm nên mua tươi hàng ngày, có nhóm nên mua theo kế hoạch và có nhóm phù hợp để tồn kho ngắn ngày.",
        items: ["Tách nhóm hàng theo tốc độ sử dụng", "Giao đúng khung giờ sơ chế", "Giảm mua dư chỉ để phòng thiếu"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "quy-trinh-nhan-hang-thuc-pham-tai-bep-cong-nghiep",
    title: "Quy trình nhận hàng thực phẩm tại bếp công nghiệp",
    description: "Một quy trình nhận hàng rõ ràng giúp bếp giảm sai sót, giảm trả hàng và dễ kiểm soát chất lượng đầu vào.",
    sections: [
      {
        heading: "Nhận hàng phải đi cùng chứng từ và tiêu chí đánh giá",
        body:
          "Nhóm nhận hàng cần biết quy cách, số lượng, nhiệt độ, tình trạng bao bì và hạn dùng để xử lý nhanh ngay từ lúc xe vào cổng. Khi một checklist rõ ràng đã tồn tại, bếp giảm được rất nhiều tranh cãi sau giao nhận.",
        items: ["Kiểm tra bao bì", "Đối chiếu phiếu giao", "Chấp nhận hoặc từ chối theo nguyên tắc"],
      },
      {
        heading: "Sau khi nhận hàng cần làm gì",
        body:
          "Hàng đã nhận cần được phân luồng nhanh vào sơ chế, kho mát, kho lạnh hoặc khu sử dụng ngay. Cách xử lý sau nhận hàng quyết định trực tiếp chất lượng đầu bếp nhìn thấy.",
        items: ["Phân loại ngay theo nhóm", "Ghi nhận sai lệch nếu có", "Báo cho đầu mối cung ứng trong ngày"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "cach-lua-chon-nha-cung-cap-thuc-pham-dong-nai",
    title: "Cách chọn nhà cung cấp thực phẩm tại Đồng Nai",
    description: "Những tiêu chí phải có khi so sánh nhà cung cấp thực phẩm tại Đồng Nai và khu vực lân cận.",
    sections: [
      {
        heading: "Đừng chỉ chọn theo giá",
        body:
          "Giá thấp chưa chắc rẻ. Cần đánh giá cùng lúc nguồn hàng, lịch giao, kế hoạch tồn kho và năng lực xử lý khi có trục trặc. Với khách mua định kỳ, mức độ ổn định thường là yếu tố quyết định cuối cùng.",
        items: ["Năng lực giao", "Hồ sơ và truy xuất", "Khả năng tư vấn danh mục"],
      },
      {
        heading: "Đồng Nai là thị trường cần giao đúng tuyến",
        body:
          "Khi chọn nhà cung cấp ở Đồng Nai, khách nên nhìn cả tuyến giao, khu công nghiệp và khả năng hỗ trợ các khu lân cận như Biên Hòa, Nhơn Trạch, Long Thành và Trảng Bom.",
        items: ["Có khả năng giao theo tuyến", "Phản hồi nhanh khi thay đổi địa điểm", "Tối ưu được lịch giao lặp lại"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "bao-gia-thuc-pham-cho-bep-an-tap-the-o-bien-hoa",
    title: "Báo giá thực phẩm cho bếp ăn tập thể ở Biên Hòa",
    description: "Cách chuẩn bị thông tin báo giá để bếp ăn tập thể tại Biên Hòa nhận phản hồi nhanh và đúng quy cách.",
    sections: [
      {
        heading: "Biên Hòa cần form báo giá ngắn nhưng đủ dữ liệu",
        body:
          "Khách ở Biên Hòa thường muốn biết giá nhanh nhưng vẫn cần thông tin rõ về nhóm hàng, số lượng, lịch giao và yêu cầu sơ chế. Một form tốt phải gom được hết các dữ liệu này ngay từ đầu để giảm trao đổi ngược.",
        items: ["Tên đơn vị và đầu mối nhận báo giá", "Nhóm hàng cần mua", "Số lượng dự kiến và lịch giao"],
      },
      {
        heading: "Những lỗi làm chậm báo giá",
        body:
          "Báo giá thường chậm khi khách ghi quá chung chung, không tách nhóm hàng, không nêu địa điểm giao hoặc không ghi rõ mức độ linh hoạt về quy cách. Với bếp ăn tập thể, mỗi chi tiết thiếu sẽ kéo thêm một vòng hỏi lại.",
        items: ["Thiếu quy cách nhận hàng", "Thiếu khu vực giao", "Thiếu lịch giao hoặc đầu mối duyệt"],
      },
      {
        heading: "Cách dẫn khách từ trang địa phương sang form",
        body:
          "Trang địa phương của Biên Hòa nên có CTA báo giá nổi bật, sau đó dẫn sang form và bài viết hỗ trợ như checklist báo giá nhanh. Khi đường đi rõ, khách dễ chốt hơn và đội kinh doanh cũng phản hồi nhanh hơn.",
        items: ["CTA nổi bật", "Link sang trang báo giá", "Liên kết sang bài hỗ trợ cùng cụm"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "cach-chon-nha-cung-cap-thuc-pham-cho-nha-may-o-dong-nai",
    title: "Cách chọn nhà cung cấp thực phẩm cho nhà máy ở Đồng Nai",
    description: "Checklist để nhà máy tại Đồng Nai chọn được nhà cung cấp ổn định, giao đúng tuyến và xử lý phát sinh rõ ràng.",
    sections: [
      {
        heading: "Nhà máy cần nhà cung cấp giao đúng nhịp",
        body:
          "Nhà máy ở Đồng Nai thường vận hành theo ca nên nhà cung cấp thực phẩm phải giao đúng giờ, đúng tuyến và đủ quy cách. Nếu chậm một nhịp là cả ca bếp hoặc cả tuyến vận hành có thể bị ảnh hưởng.",
        items: ["Giao theo ca hoặc theo ngày", "Có đầu mối phản hồi rõ ràng", "Lịch giao phù hợp với nhịp vận hành nhà máy"],
      },
      {
        heading: "Tiêu chí nên kiểm tra trước khi ký",
        body:
          "Ngoài giá, nhà máy cần kiểm tra nguồn hàng, quy cách đóng gói, khả năng cung ứng lặp lại và cách xử lý khi có phát sinh thiếu hàng hoặc đổi menu. Đây là các điểm quyết định độ ổn định dài hạn.",
        items: ["Nguồn hàng rõ", "Quy cách thống nhất", "Khả năng cung ứng lặp lại", "Quy trình đổi trả/thiếu hàng"],
      },
      {
        heading: "Nối bài này về landing page Đồng Nai",
        body:
          "Bài hỗ trợ này nên trỏ về landing page Đồng Nai và trang sản phẩm để khách có thể đi từ bài đọc sang báo giá chỉ trong một đến hai cú click.",
        items: ["Link về Đồng Nai", "Link về sản phẩm", "Link về form báo giá"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "bao-gia-thuc-pham-cho-bep-an-tap-the-o-binh-duong",
    title: "Báo giá thực phẩm cho bếp ăn tập thể ở Bình Dương",
    description:
      "Checklist thông tin giúp đơn vị ở Bình Dương gửi yêu cầu báo giá gọn hơn, rõ hơn và nhận phản hồi nhanh hơn.",
    sections: [
      {
        heading: "Bình Dương cần form báo giá ngắn nhưng đủ dữ liệu",
        body:
          "Khách ở Bình Dương thường muốn báo giá nhanh cho bếp ăn, nhà máy hoặc suất ăn cố định. Vì vậy form cần gom sẵn nhóm hàng, số lượng dự kiến, lịch giao, khu vực giao và đầu mối duyệt để giảm vòng hỏi lại.",
        items: ["Tên đơn vị và người liên hệ", "Nhóm hàng cần mua", "Số lượng dự kiến và lịch giao"],
      },
      {
        heading: "Những lỗi làm chậm phản hồi báo giá",
        body:
          "Báo giá thường chậm khi khách mô tả quá chung chung, không nêu quy cách nhận hàng, không tách khu giao hoặc không cho biết mức độ linh hoạt của menu. Với bếp ăn tập thể, mỗi chi tiết thiếu sẽ kéo thêm một vòng xác nhận.",
        items: ["Thiếu quy cách nhận hàng", "Thiếu tuyến giao", "Thiếu đầu mối duyệt đơn"],
      },
      {
        heading: "Cách dẫn khách từ trang Bình Dương sang form",
        body:
          "Trang địa phương nên có CTA báo giá nổi bật, sau đó dẫn sang form và các bài hỗ trợ liên quan để người đọc đi tiếp mà không bị đứt mạch. Khi đường đi ngắn, tỷ lệ chốt thường tốt hơn.",
        items: ["CTA rõ ở đầu và cuối trang", "Link sang form báo giá", "Link sang bài hỗ trợ cùng cụm"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "cach-chon-nha-cung-cap-thuc-pham-cho-nha-may-o-tp-hcm",
    title: "Cách chọn nhà cung cấp thực phẩm cho nhà máy ở TP.HCM",
    description:
      "Checklist để nhà máy tại TP.HCM đánh giá tuyến giao, khả năng phản hồi và mức độ ổn định trước khi ký nhà cung cấp.",
    sections: [
      {
        heading: "TP.HCM cần nhà cung cấp giao đúng tuyến",
        body:
          "Nhà máy ở TP.HCM thường vận hành theo ca nên nhà cung cấp phải giao đúng giờ, đúng tuyến và đúng quy cách. Nếu chậm một nhịp, cả ca bếp hoặc cả tuyến vận hành đều có thể bị ảnh hưởng.",
        items: ["Giao theo ca hoặc theo ngày", "Có đầu mối phản hồi rõ", "Lịch giao phù hợp với nhịp vận hành nhà máy"],
      },
      {
        heading: "Tiêu chí nên kiểm tra trước khi ký",
        body:
          "Ngoài giá, nhà máy cần kiểm tra nguồn hàng, quy cách đóng gói, khả năng cung ứng lặp lại và cách xử lý khi phát sinh thiếu hàng hoặc đổi menu. Đây là các điểm quyết định độ ổn định dài hạn.",
        items: ["Nguồn hàng rõ", "Quy cách thống nhất", "Khả năng cung ứng lặp lại", "Quy trình đổi trả/thiếu hàng"],
      },
      {
        heading: "Nối bài này về landing page TP.HCM",
        body:
          "Bài hỗ trợ này nên trỏ về landing page TP.HCM và trang sản phẩm để khách có thể đi từ bài đọc sang báo giá chỉ trong một đến hai cú click. Cấu trúc đó giúp truy vấn địa phương mạnh hơn và giữ người đọc lâu hơn trong cụm nội dung.",
        items: ["Link về TP.HCM", "Link về sản phẩm", "Link về form báo giá"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "cach-chon-nha-cung-cap-thuc-pham-cho-khu-cong-nghiep-nhon-trach",
    title: "Cách chọn nhà cung cấp thực phẩm cho khu công nghiệp Nhơn Trạch",
    description:
      "Checklist để đơn vị ở Nhơn Trạch đánh giá khả năng giao theo ca, theo tuyến và theo hợp đồng dài hạn trước khi ký nhà cung cấp.",
    sections: [
      {
        heading: "Nhơn Trạch cần nhà cung cấp bám đúng nhịp vận hành",
        body:
          "Khu công nghiệp Nhơn Trạch thường vận hành theo ca nên nhà cung cấp phải giao đúng giờ, đúng quy cách và phản hồi rõ khi phát sinh. Chỉ cần lệch một khung giao là cả kế hoạch bếp hoặc tuyến phục vụ có thể bị ảnh hưởng.",
        items: ["Giao theo ca hoặc theo ngày", "Có đầu mối phản hồi rõ", "Lịch giao ăn khớp với nhịp vận hành"],
      },
      {
        heading: "Những tiêu chí nên kiểm tra trước khi ký",
        body:
          "Ngoài giá, khách hàng cần kiểm tra nguồn hàng, quy cách đóng gói, khả năng giao lặp lại và cách xử lý khi có thiếu hàng hoặc đổi menu. Đây là những điểm quyết định sự ổn định lâu dài của hợp đồng.",
        items: ["Nguồn hàng rõ", "Quy cách thống nhất", "Khả năng cung ứng lặp lại", "Quy trình đổi trả/thiếu hàng"],
      },
      {
        heading: "Nối bài này về landing page Nhơn Trạch",
        body:
          "Bài hỗ trợ nên trỏ về landing page Nhơn Trạch và trang sản phẩm để khách đi từ bài đọc sang báo giá chỉ trong một đến hai cú click. Cấu trúc đó giúp cụm truy vấn địa phương mạnh hơn và giữ người đọc ở lại lâu hơn.",
        items: ["Link về Nhơn Trạch", "Link về sản phẩm", "Link về form báo giá"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "bao-gia-thuc-pham-cho-bep-an-tap-the-o-ba-ria-vung-tau",
    title: "Báo giá thực phẩm cho bếp ăn tập thể ở Bà Rịa - Vũng Tàu",
    description:
      "Checklist thông tin giúp đơn vị ở Bà Rịa - Vũng Tàu gửi yêu cầu báo giá gọn hơn, rõ hơn và nhận phản hồi nhanh hơn.",
    sections: [
      {
        heading: "Bà Rịa - Vũng Tàu cần form báo giá ngắn nhưng đủ dữ liệu",
        body:
          "Khách ở Bà Rịa - Vũng Tàu thường muốn báo giá nhanh cho bếp ăn, nhà máy hoặc suất ăn cố định. Vì vậy form cần gom sẵn nhóm hàng, số lượng dự kiến, lịch giao, khu vực giao và đầu mối duyệt để giảm vòng hỏi lại.",
        items: ["Tên đơn vị và người liên hệ", "Nhóm hàng cần mua", "Số lượng dự kiến và lịch giao"],
      },
      {
        heading: "Những lỗi làm chậm phản hồi báo giá",
        body:
          "Báo giá thường chậm khi khách mô tả quá chung chung, không nêu quy cách nhận hàng, không tách khu giao hoặc không cho biết mức độ linh hoạt của menu. Với bếp ăn tập thể, mỗi chi tiết thiếu sẽ kéo thêm một vòng xác nhận.",
        items: ["Thiếu quy cách nhận hàng", "Thiếu tuyến giao", "Thiếu đầu mối duyệt đơn"],
      },
      {
        heading: "Cách dẫn khách từ bài đọc sang form",
        body:
          "Trang hoặc bài địa phương nên có CTA báo giá nổi bật, sau đó dẫn sang form và các bài hỗ trợ liên quan để người đọc đi tiếp mà không bị đứt mạch. Khi đường đi ngắn, tỷ lệ chốt thường tốt hơn.",
        items: ["CTA rõ ở đầu và cuối", "Link sang form báo giá", "Link sang bài hỗ trợ cùng cụm"],
      },
    ],
    faqs: sharedFaqs,
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
  "rau-cu-qua-tuoi-song": "/images/tps1-vegetables.jpg",
  "thit-ca-hai-san-tuoi-song": "/images/tps1-meat-seafood.png",
  "hang-dong-lanh": "/images/tps1-frozen.png",
  "gia-vi-nha-bep": "/images/tps1-spices.png",
  "thuc-pham-chay": "/images/tps1-vegan.png",
};
