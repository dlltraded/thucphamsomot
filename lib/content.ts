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
  // Search-result title/description, when they should differ from the on-page text.
  metaTitle?: string;
  metaDescription?: string;
  summary?: string;
  features?: string[];
  targets?: string[];
  highlights?: string[];
  sections?: ContentSection[];
  faqs?: FaqItem[];
  relatedLinks?: {
    href: string;
    label: string;
    description: string;
  }[];
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
    metaDescription: "Rau củ quả tươi từ Đà Lạt, miền Tây và Bảo Lộc cho bếp ăn công nghiệp, trường học, bệnh viện tại Đồng Nai. Giao theo khung giờ bếp, có hóa đơn VAT.",
    title: "Rau củ quả",
    description:
      "Rau củ từ Đà Lạt, miền Tây và Bảo Lộc được chọn lựa mỗi ngày, giữ trọn độ tươi trên suốt chặng đường về bếp, để đĩa rau trên bàn nhà hàng hay khay cơm trong bếp trường học đều xanh mướt như vừa hái.",
    highlights: ["Nguồn rau từ Đà Lạt, miền Tây, Bảo Lộc", "Phân loại theo kích cỡ và độ chín", "Giao đúng giờ bếp cần"],
    sections: [
      {
        heading: "Theo mùa, theo vùng, theo đúng món",
        body:
          "Mỗi vùng trồng cho một nhóm rau củ ngon nhất theo mùa. TPS1 lấy hàng từ Đà Lạt, miền Tây và các nhà vườn hợp tác ở Bảo Lộc, để nhà hàng, quán ăn hay bếp công ty đều có đủ nguyên liệu cho thực đơn quanh năm.",
        items: ["Rau củ quả theo mùa từ Đà Lạt và miền Tây", "Nhóm hàng hợp tác từ nhà vườn Bảo Lộc", "Một số mặt hàng khó tìm như lá mè Hàn Quốc, ngồng tỏi, khoai mỡ trắng, trái cây nhập khẩu"],
      },
      {
        heading: "Giữ trọn độ tươi đến lúc vào nồi",
        body:
          "Rau củ rất nhạy cảm với thời gian và nhiệt độ. TPS1 bảo quản lạnh, giao theo khung giờ bếp đã thống nhất và tư vấn danh mục theo thực đơn, để hao hụt ở khâu sơ chế luôn ở mức thấp.",
        items: ["Bảo quản và vận chuyển lạnh", "Giao theo khung giờ bếp", "Tư vấn danh mục theo thực đơn và ngân sách"],
      },
    ],
    faqs: sharedFaqs,
    relatedLinks: [
      { href: "/blog/bi-quyet-bao-quan-rau-cu-trong-kho-lanh", label: "Bảo quản rau củ trong kho lạnh", description: "Cách setup và vận hành kho lạnh để rau củ tươi lâu, giảm hao hụt." },
      { href: "/blog/so-sanh-thuc-pham-tuoi-song-va-dong-lanh", label: "Tươi sống hay đông lạnh?", description: "So sánh chi phí và chất lượng để chọn phương án phù hợp cho bếp." },
      { href: "/danh-muc/hang-dong-lanh", label: "Xem thêm: Hàng đông lạnh", description: "Nhóm hàng đông lạnh bổ sung khi rau củ tươi trái mùa hoặc khan hàng." },
    ],
  },
  {
    slug: "thit-heo",
    metaDescription: "Thịt heo đùi, vai, ba rọi, nạc dăm, sườn cắt theo quy cách cho bếp ăn công nghiệp tại Đồng Nai. Kiểm tra khi nhập kho, giao bằng xe lạnh, hóa đơn VAT.",
    title: "Thịt heo",
    description:
      "Từ bát canh sườn của quán cơm đến khay thịt kho của bếp công ty, thịt heo có mặt trong hầu hết thực đơn. TPS1 chia phần đúng quy cách và giữ lạnh suốt đường giao, để miếng thịt về bếp vẫn tươi hồng, săn chắc.",
    highlights: ["Cắt đúng quy cách của bếp", "Kiểm tra kỹ khi nhập kho", "Giữ lạnh suốt đường giao"],
    sections: [
      {
        heading: "Chia phần đúng quy cách cho từng món",
        body:
          "Thịt heo hiện diện trong hầu hết thực đơn, từ nhà hàng, quán ăn đến bếp ăn công ty và trường học. TPS1 sơ chế và chia phần theo đúng quy cách mỗi bếp đặt ra, để từng món được định lượng chuẩn xác và đồng đều qua mọi ca.",
        items: ["Thịt đùi, vai, ba rọi, nạc dăm, sườn, xương", "Cắt khối, cắt lát hoặc xay theo yêu cầu", "Đóng gói theo ca hoặc theo bữa"],
      },
      {
        heading: "Chất lượng được giữ trọn từ kho đến bếp",
        body:
          "Mỗi lô thịt nhập kho đều được kiểm tra màu sắc, mùi và độ đàn hồi, sau đó bảo quản ở nhiệt độ tiêu chuẩn và vận chuyển bằng xe lạnh đến tận bếp. Toàn bộ quy trình vận hành theo hệ thống ISO 22000 và HACCP mà TPS1 đã được chứng nhận.",
        items: ["Kiểm tra màu sắc, mùi, độ đàn hồi khi nhận hàng", "Duy trì chuỗi lạnh suốt hành trình giao", "Hóa đơn VAT đầy đủ"],
      },
    ],
    faqs: sharedFaqs,
    relatedLinks: [
      { href: "/blog/quy-trinh-chuan-kiem-tra-thit", label: "Quy trình kiểm tra thịt khi nhận hàng", description: "Các bước kiểm soát chất lượng thịt ngay tại khâu nhận hàng." },
      { href: "/blog/du-bao-gia-thit-heo-cuoi-nam-2026", label: "Dự báo giá thịt heo cuối năm", description: "Cách ứng phó biến động giá thịt heo cho bếp ăn công nghiệp." },
      { href: "/danh-muc/thit-bo", label: "Xem thêm: Thịt bò", description: "Thịt bò theo quy cách cho thực đơn bếp ăn tập thể." },
    ],
  },
  {
    slug: "thit-bo",
    metaDescription: "Thịt bò tươi và đông lạnh, cắt theo món xào, kho, hầm, nướng cho bếp ăn công nghiệp tại Đồng Nai. Bảo quản riêng từng loại, giao bằng xe lạnh.",
    title: "Thịt bò",
    description:
      "Một đĩa bò xào mềm ngọt hay nồi bò kho đậm vị đều bắt đầu từ phần thịt được chọn đúng. TPS1 tư vấn phần thịt hợp với từng món và giữ lạnh suốt đường giao, để bữa ăn trọn vị mà chi phí vẫn trong tầm kiểm soát.",
    highlights: ["Bò tươi và bò đông lạnh", "Chọn phần thịt theo từng món", "Giữ lạnh suốt đường giao"],
    sections: [
      {
        heading: "Đúng phần thịt cho đúng món",
        body:
          "Mỗi món bò cần một phần thịt riêng: thăn cho món xào, nạm gân cho món hầm, bắp cho món luộc. TPS1 tư vấn phần thịt phù hợp với từng món và từng mức chi phí, cho nhà hàng lẫn bếp ăn tập thể.",
        items: ["Thịt bò tươi và thịt bò đông lạnh", "Phần thịt chuyên dùng cho xào, kho, hầm, nướng", "Cắt và đóng gói theo yêu cầu"],
      },
      {
        heading: "Bảo quản riêng biệt, giao bằng xe lạnh",
        body:
          "Thịt bò tươi và thịt bò đông lạnh được bảo quản tách biệt, mỗi loại theo điều kiện nhiệt độ riêng. Trước khi xuất kho, từng lô hàng được kiểm tra thêm một lần rồi mới lên xe lạnh đến bếp.",
        items: ["Kiểm tra lại trước khi xuất kho", "Giao lạnh theo tuyến cố định", "Hóa đơn VAT đầy đủ"],
      },
    ],
    faqs: sharedFaqs,
    relatedLinks: [
      { href: "/blog/quy-trinh-chuan-kiem-tra-thit", label: "Quy trình kiểm tra thịt khi nhận hàng", description: "Các bước kiểm soát chất lượng thịt ngay tại khâu nhận hàng." },
      { href: "/danh-muc/hang-dong-lanh", label: "Xem thêm: Hàng đông lạnh", description: "Thịt bò đông lạnh giúp bếp chủ động kế hoạch nguyên liệu." },
      { href: "/danh-muc/thit-heo", label: "Xem thêm: Thịt heo", description: "Thịt heo theo quy cách cho bếp ăn tập thể." },
    ],
  },
  {
    slug: "gia-cam",
    metaTitle: "Cung cấp gà, vịt cho bếp ăn công nghiệp tại Đồng Nai",
    metaDescription: "Gà, vịt nguyên con hoặc chia phần đùi, cánh, ức theo quy cách cho bếp ăn công nghiệp tại Đồng Nai. Bảo quản lạnh liên tục, giao theo tuyến cố định.",
    title: "Gia cầm",
    description:
      "Từ con gà luộc vàng da đến đĩa đùi gà chiên giòn, món ngon nào cũng cần nguyên liệu tươi và đều cỡ. TPS1 giao gà, vịt nguyên con hoặc chia sẵn theo phần, giữ lạnh liên tục từ kho đến bếp.",
    highlights: ["Nguyên con hoặc chia sẵn theo phần", "Quy cách theo từng món", "Giữ lạnh từ kho đến bếp"],
    sections: [
      {
        heading: "Gà, vịt cho thực đơn phong phú mỗi tuần",
        body:
          "Gà, vịt là nguồn đạm quen thuộc và dễ biến tấu, giúp nhà hàng làm mới thực đơn và bếp ăn xoay vòng món mà không lặp lại. TPS1 cung cấp nguyên con hoặc chia sẵn theo phần, để việc định lượng tại bếp nhanh chóng và chuẩn xác hơn.",
        items: ["Gà, vịt nguyên con", "Đùi, cánh, ức, má đùi theo quy cách", "Đóng gói theo ca hoặc theo bữa"],
      },
      {
        heading: "Giữ trọn độ tươi đến khâu sơ chế",
        body:
          "Gia cầm được kiểm tra ngay khi nhập kho, bảo quản lạnh liên tục và giao theo tuyến cố định. Nhờ vậy, khi đến tay người đầu bếp, hàng vẫn giữ được độ tươi cần có cho từng món ăn.",
        items: ["Kiểm tra cảm quan khi nhận hàng", "Duy trì chuỗi lạnh suốt hành trình giao", "Hóa đơn VAT đầy đủ"],
      },
    ],
    faqs: sharedFaqs,
    relatedLinks: [
      { href: "/blog/quy-trinh-chuan-kiem-tra-thit", label: "Quy trình kiểm tra thịt khi nhận hàng", description: "Các bước kiểm soát chất lượng thịt ngay tại khâu nhận hàng." },
      { href: "/danh-muc/hang-dong-lanh", label: "Xem thêm: Hàng đông lạnh", description: "Gia cầm đông lạnh khi bếp cần chủ động nguồn hàng." },
      { href: "/danh-muc/thit-heo", label: "Xem thêm: Thịt heo", description: "Thịt heo theo quy cách cho bếp ăn tập thể." },
    ],
  },
  {
    slug: "hai-san",
    metaDescription: "Cá, tôm, mực tươi và đông lạnh theo quy cách cho bếp ăn công nghiệp tại Đồng Nai. Hàng về kho mỗi ngày, giao theo lịch chế biến của bếp.",
    title: "Hải sản",
    description:
      "Hải sản ngon nhất khi còn giữ được vị ngọt của biển. TPS1 nhập hàng về kho mỗi ngày, phân loại theo quy cách và giữ lạnh nghiêm ngặt, để con tôm, lát cá đến bếp nhà hàng hay bếp ăn công ty vẫn tươi như lúc vừa về kho.",
    highlights: ["Hải sản về kho mỗi ngày", "Đủ hàng tươi và đông lạnh", "Phân loại theo quy cách bếp"],
    sections: [
      {
        heading: "Hải sản về đều đặn theo nhịp đặt hàng của bếp",
        body:
          "TPS1 phân loại hải sản theo nhóm hàng và quy cách, giao đúng tần suất mà bếp đã thống nhất. Nhờ vậy, những đơn hàng lặp lại mỗi tuần có nguồn cung ổn định, hạn chế tối đa việc thực đơn bị gián đoạn.",
        items: ["Cá tươi và cá phi lê", "Tôm, mực và hải sản khác", "Hàng đông lạnh theo quy cách"],
      },
      {
        heading: "Với hải sản, an toàn thực phẩm luôn đi trước",
        body:
          "Hải sản là nhóm hàng đòi hỏi sự cẩn trọng cao về an toàn thực phẩm. Vì thế, khi lựa chọn nhà cung cấp, nhà hàng và bếp ăn nên tìm hiểu kỹ quy trình nhận hàng, cách bảo quản, chính sách đổi trả và phương án xử lý khi phát sinh sự cố.",
        items: ["Kiểm tra cảm quan khi nhận hàng", "Tư vấn lịch giao theo ngày chế biến", "Ưu tiên giữ giá ổn định cho khách mua định kỳ"],
      },
    ],
    faqs: sharedFaqs,
    relatedLinks: [
      { href: "/blog/so-sanh-thuc-pham-tuoi-song-va-dong-lanh", label: "Tươi sống hay đông lạnh?", description: "So sánh chi phí và chất lượng để chọn phương án phù hợp cho bếp." },
      { href: "/danh-muc/hang-dong-lanh", label: "Xem thêm: Hàng đông lạnh", description: "Phương án dự phòng khi cần chủ động nguồn hải sản cho bếp." },
      { href: "/danh-muc/thit-heo", label: "Xem thêm: Thịt heo", description: "Thịt heo theo quy cách cho bếp ăn tập thể." },
    ],
  },
  {
    slug: "hang-dong-lanh",
    metaTitle: "Cung cấp hàng đông lạnh cho bếp ăn công nghiệp",
    metaDescription: "Thịt bò, gà, cá và hải sản đông lạnh cho bếp ăn công nghiệp tại Đồng Nai. Kho lạnh riêng, giao theo kế hoạch sử dụng để bếp chủ động nguyên liệu.",
    title: "Hàng đông lạnh",
    description:
      "Hàng đông lạnh giúp gian bếp luôn chủ động, kể cả những ngày chợ khan hàng. TPS1 bảo quản thịt bò, gà, cá và hải sản đông lạnh trong kho lạnh riêng và giao theo kế hoạch sử dụng của từng bếp.",
    highlights: ["Bảo quản trong kho lạnh riêng", "Thịt bò, gà, cá và hải sản", "Giao theo kế hoạch sử dụng"],
    sections: [
      {
        heading: "Chủ động nguyên liệu cho cả tuần",
        body:
          "Với hàng đông lạnh, bếp có thể lên kế hoạch nguyên liệu theo tuần thay vì theo ngày. Nhà hàng giữ được món chủ lực khi giá hàng tươi biến động, bếp ăn công ty và trường học yên tâm có đủ đạm cho thực đơn.",
        items: ["Thịt bò đông lạnh", "Gà đông lạnh", "Cá và hải sản đông lạnh", "Hàng theo kế hoạch thực đơn"],
      },
      {
        heading: "Giữ lạnh trọn vẹn từ kho đến bếp",
        body:
          "TPS1 bảo quản hàng đông lạnh ở nhiệt độ ổn định trong kho lạnh và vận chuyển bằng xe lạnh, giao theo kế hoạch sử dụng để bếp không phải trữ quá nhiều.",
        items: ["Kho lạnh riêng", "Xe lạnh chuyên dụng", "Giao theo kế hoạch sử dụng"],
      },
    ],
    faqs: sharedFaqs,
    relatedLinks: [
      { href: "/blog/so-sanh-thuc-pham-tuoi-song-va-dong-lanh", label: "Tươi sống hay đông lạnh?", description: "Bài toán tối ưu chi phí giữa thực phẩm tươi sống và đông lạnh." },
      { href: "/blog/giai-phap-cung-ung-thuc-pham-nha-may-3-ca", label: "Cung ứng cho nhà máy 3 ca", description: "Giải pháp logistics thực phẩm cho nhà máy hoạt động liên tục." },
      { href: "/danh-muc/hai-san", label: "Xem thêm: Hải sản", description: "Nguồn hải sản tươi hằng ngày kết hợp cùng hàng đông lạnh." },
    ],
  },
  {
    slug: "gia-vi",
    metaDescription: "Gia vị Việt, Hoa, Hàn, Âu, gia vị chay mặn và dầu ăn cho bếp ăn công nghiệp, nhà hàng tại Đồng Nai. Giá sỉ theo sản lượng, hóa đơn VAT đầy đủ.",
    title: "Gia vị",
    description:
      "Gia vị là linh hồn giữ cho món quen luôn đúng vị quen. TPS1 cung cấp gia vị Việt, Hoa, Hàn, Âu, gia vị chay mặn và dầu ăn, để mỗi gian bếp giữ hương vị đồng đều qua từng ca nấu.",
    highlights: ["Gia vị Việt, Hoa, Hàn, Âu", "Gia vị chay mặn đầy đủ", "Dầu ăn cho mọi nhu cầu bếp"],
    sections: [
      {
        heading: "Đủ gia vị cho mọi phong cách bếp",
        body:
          "Từ nhà hàng món Á, quán ăn gia đình đến bếp ăn công ty, mỗi gian bếp có một bộ gia vị riêng. TPS1 gom đủ trong một danh mục, kèm vật tư và dụng cụ bếp khi quý khách cần.",
        items: ["Gia vị món Việt, Hoa, Hàn, Âu", "Gia vị chay mặn, dầu ăn", "Vật tư, dụng cụ bếp khi có nhu cầu"],
      },
      {
        heading: "Giữ vị món đồng đều qua từng ca",
        body:
          "Cùng một loại gia vị, cùng một quy cách giúp món ăn không đổi vị dù thay ca hay thay người nấu. TPS1 hỗ trợ chuẩn hóa danh mục theo thực đơn và gợi ý mặt hàng thay thế khi một loại tạm hết.",
        items: ["Chuẩn hóa danh mục theo thực đơn", "Gợi ý mặt hàng thay thế", "Đáp ứng đơn hàng lặp lại"],
      },
    ],
    faqs: sharedFaqs,
    relatedLinks: [
      { href: "/blog/7-sai-lam-lang-phi-ngan-sach-suat-an", label: "7 sai lầm lãng phí ngân sách suất ăn", description: "Nhận diện sai lầm phổ biến khiến nhà máy tốn thêm chi phí." },
      { href: "/blog/cach-xay-dung-thuc-don-suat-an-25k", label: "Xây dựng thực đơn suất ăn 25k", description: "Cân đối gia vị và nguyên liệu để giữ định mức chi phí suất ăn." },
      { href: "/danh-muc/thuc-pham-chay", label: "Xem thêm: Thực phẩm chay", description: "Gia vị chay đi kèm khi bếp cần menu linh hoạt." },
    ],
  },
  {
    slug: "do-kho",
    metaDescription: "Gạo, mì, bún, miến, đậu, nấm khô, đồ hộp và đồ uống cho bếp ăn công nghiệp tại Đồng Nai. Đặt chung đơn với hàng tươi, giao cùng tuyến định kỳ.",
    title: "Đồ khô",
    description:
      "Hạt gạo, sợi bún, gói miến là nền móng lặng lẽ của mỗi bữa ăn. TPS1 cung cấp đủ gạo, mì, bún khô, đậu, nấm, đồ hộp và đồ uống, đặt chung đơn với hàng tươi để gian bếp chỉ cần một đầu mối.",
    highlights: ["Nhóm hàng có nhiều mã nhất", "Đặt chung đơn với hàng tươi", "Giao cùng tuyến định kỳ"],
    sections: [
      {
        heading: "Hàng khô, nền tảng của mỗi bữa ăn",
        body:
          "Trong danh mục của TPS1, đồ khô là nhóm hàng có số lượng mã nhiều nhất. Khi đặt hàng khô cùng đơn hàng tươi, gian bếp chỉ cần làm việc với một đầu mối, giảm bớt số nhà cung cấp phải theo dõi mỗi ngày.",
        items: ["Gạo, mì, bún, miến, phở khô", "Đậu, nấm, rong biển và hàng khô khác", "Đồ hộp, đồ uống và nguyên liệu chế biến"],
      },
      {
        heading: "Đặt hàng vừa đủ, tồn kho hợp lý",
        body:
          "Với thời hạn sử dụng dài, hàng khô phù hợp đặt theo tuần hoặc theo tháng. TPS1 tính toán số lượng dựa trên nhu cầu thực tế của từng bếp, để kho luôn đủ hàng mà không tồn đọng quá mức.",
        items: ["Đặt theo tuần hoặc theo tháng", "Giao chung tuyến với hàng tươi", "Hóa đơn VAT đầy đủ"],
      },
    ],
    faqs: sharedFaqs,
    relatedLinks: [
      { href: "/blog/7-sai-lam-lang-phi-ngan-sach-suat-an", label: "7 sai lầm lãng phí ngân sách suất ăn", description: "Nhận diện sai lầm phổ biến khiến bếp tốn thêm chi phí." },
      { href: "/danh-muc/gia-vi", label: "Xem thêm: Gia vị", description: "Gia vị đi kèm để hoàn thiện đơn hàng khô." },
      { href: "/danh-muc/rau-cu-qua", label: "Xem thêm: Rau củ quả", description: "Đặt hàng tươi và hàng khô trong cùng một đơn." },
    ],
  },
  {
    slug: "thuc-pham-chay",
    metaTitle: "Cung cấp thực phẩm chay cho bếp ăn công nghiệp",
    metaDescription: "Đậu hũ, chả chay và thực phẩm chay cho bếp ăn công nghiệp, trường học, nhà hàng tại Đồng Nai; phù hợp thực đơn ngày rằm, mùng một hoặc suất ăn chay.",
    title: "Thực phẩm chay",
    description:
      "Một bữa chay thanh đạm vẫn cần nguyên liệu tươi và đủ vị. TPS1 cung cấp đậu hũ, chả chay và thực phẩm chay cho thực đơn ngày rằm, mùng một, nhà hàng chay hay bếp cần phục vụ nhiều khẩu vị.",
    highlights: ["Đậu hũ và chả chay", "Gia vị chay đầy đủ", "Phù hợp thực đơn rằm, mùng một"],
    sections: [
      {
        heading: "Đủ nguyên liệu cho bữa chay tròn vị",
        body:
          "Nhóm hàng chay gồm đậu hũ, chả chay, nguyên liệu chế biến món chay và gia vị chay, giúp bếp dễ bổ sung thực đơn chay vào ngày rằm, sự kiện hoặc bữa ăn có nhu cầu riêng.",
        items: ["Đậu hũ và chả chay", "Gia vị chay", "Nguyên liệu chay theo nhu cầu bếp"],
      },
      {
        heading: "Một thực đơn, nhiều khẩu vị",
        body:
          "Nhà hàng chay, bếp trường học hay bếp công ty đều có lúc cần phục vụ người ăn chay. Với nhóm hàng này, bếp có sẵn phương án thay thế món mặn mà không phải tìm thêm nhà cung cấp.",
        items: ["Thực đơn chay định kỳ", "Thực đơn sự kiện", "Phương án thay thế món mặn"],
      },
    ],
    faqs: sharedFaqs,
    relatedLinks: [
      { href: "/blog/cach-xay-dung-thuc-don-suat-an-25k", label: "Xây dựng thực đơn suất ăn 25k", description: "Gợi ý xây thực đơn chay xen kẽ vẫn đảm bảo định lượng và chi phí." },
      { href: "/blog/tai-sao-chon-nha-cung-cap-thuc-pham-dia-phuong", label: "Vì sao nên chọn nhà cung cấp địa phương", description: "Lợi thế logistics khi hợp tác với nhà cung cấp tại Đồng Nai." },
      { href: "/danh-muc/gia-vi", label: "Xem thêm: Gia vị", description: "Gia vị chay đi kèm để hoàn thiện thực đơn." },
    ],
  },
];

export const industries: ContentItem[] = [
  {
    slug: "nha-hang-khach-san",
    metaDescription: "Thực phẩm tươi, đều cỡ, đúng quy cách cho bếp nhà hàng, khách sạn tại Đồng Nai, TP.HCM; giao theo giờ mở bếp, linh hoạt thanh toán, hóa đơn VAT.",
    title: "Nhà hàng, khách sạn",
    description:
      "Mỗi món ăn ngon bắt đầu từ nguyên liệu chuẩn. TPS1 chọn hàng tươi, đều cỡ, đúng quy cách và giao theo giờ mở bếp, để bếp trưởng yên tâm giữ trọn hương vị cho từng đĩa ăn.",
    targets: ["Nhà hàng", "Khách sạn", "Nhà hàng tiệc cưới", "Resort"],
    sections: [
      {
        heading: "Nguyên liệu chuẩn món, đều tay từ ngày này sang ngày khác",
        body:
          "Thực khách quay lại vì món quen giữ được vị quen. Điều đó chỉ có được khi nguyên liệu về bếp đồng đều mỗi ngày: cùng quy cách cắt, cùng độ tươi, cùng kích cỡ. TPS1 phân loại hàng trước khi giao, để bếp không phải mất thêm thời gian chọn lại.",
        items: [
          "Rau củ, trái cây phân loại theo kích cỡ và độ chín",
          "Thịt heo, bò, gà, hải sản cắt theo quy cách của từng món",
          "Gia vị Việt, Hoa, Hàn, Âu và dầu ăn cho bếp đa phong cách",
        ],
      },
      {
        heading: "Giao theo giờ mở bếp, kể cả ngày đông khách",
        body:
          "Bếp nhà hàng chạy theo giờ khách, không theo giờ kho. TPS1 thống nhất khung giờ nhận hàng ngay từ đầu và chuẩn bị phương án cho những ngày tiệc lớn hoặc lượng khách tăng đột ngột.",
        items: [
          "Khung giờ giao thống nhất theo giờ mở bếp",
          "Nhận đơn bổ sung khi phát sinh tiệc hoặc lượng khách tăng",
          "Xe lạnh giữ độ tươi trên suốt quãng đường giao",
        ],
      },
      {
        heading: "Một đầu mối cho cả gian bếp",
        body:
          "Thay vì làm việc với nhiều mối hàng lẻ, nhà hàng có thể đặt rau củ, thịt cá, đồ khô và gia vị trong cùng một đơn, nhận một hóa đơn VAT và một đầu mối chăm sóc riêng.",
        items: [
          "Hơn 5.000 mặt hàng trong một danh mục",
          "Linh hoạt thanh toán, công nợ theo thỏa thuận",
          "Hóa đơn VAT đầy đủ",
        ],
      },
    ],
    faqs: [
      {
        question: "Nhà hàng có cần đặt số lượng tối thiểu không?",
        answer: "Mỗi nhà hàng có nhịp đặt hàng riêng. Quý khách vui lòng liên hệ TPS1 để cùng trao đổi về lượng hàng, lịch giao và hình thức thanh toán phù hợp.",
      },
      {
        question: "Có giao vào khung giờ sáng sớm trước khi mở bếp không?",
        answer: "Có. Khung giờ nhận hàng được thống nhất khi bắt đầu hợp tác, theo đúng giờ chuẩn bị của bếp.",
      },
      {
        question: "Khu vực nào TPS1 đang giao hàng?",
        answer: "Đồng Nai (gồm cả khu vực Bình Phước cũ), TP.HCM, Bình Dương và Bà Rịa - Vũng Tàu.",
      },
    ],
  },
  {
    slug: "quan-an",
    metaTitle: "Thực phẩm cho quán ăn, chuỗi F&B",
    metaDescription: "Hàng tươi mỗi sáng cho quán cơm, quán phở, bún và chuỗi F&B tại Đồng Nai, TP.HCM: giao đúng giờ quán cần, linh hoạt thanh toán, hóa đơn VAT.",
    title: "Quán ăn, chuỗi F&B",
    description:
      "Quán ăn cần hàng tươi mỗi sáng, lượng vừa đủ cho ngày bán. TPS1 giao đúng giờ quán cần, để chủ quán dành trọn tâm sức cho nồi nước dùng và những vị khách quen.",
    targets: ["Quán cơm", "Quán phở, bún, hủ tiếu", "Quán lẩu, nướng", "Chuỗi cửa hàng ăn uống"],
    sections: [
      {
        heading: "Mỗi sáng một chuyến hàng tươi",
        body:
          "Với quán ăn, nguyên liệu tươi trong ngày quyết định gần như mọi thứ: vị nước dùng, màu rau, độ ngọt của thịt. TPS1 giao theo lịch hằng ngày hoặc theo tuần, với lượng hàng vừa đủ cho ngày bán để quán không phải tồn kho.",
        items: [
          "Rau thơm, rau ăn kèm, giá đỗ cho quán phở, bún, hủ tiếu",
          "Thịt heo, bò, gà, xương hầm cắt theo yêu cầu",
          "Đồ khô, gia vị, nước chấm cho cả thực đơn",
        ],
      },
      {
        heading: "Chuỗi nhiều điểm bán, một chuẩn nguyên liệu",
        body:
          "Chuỗi F&B cần mỗi cửa hàng nấu ra cùng một vị. TPS1 giữ cùng quy cách hàng cho mọi điểm bán và giao theo tuyến, để món ăn ở cửa hàng nào cũng đều tay như nhau.",
        items: [
          "Cùng quy cách hàng cho mọi cửa hàng trong chuỗi",
          "Giao theo tuyến đến từng điểm bán",
          "Đối chiếu đơn hàng và hóa đơn theo từng cửa hàng",
        ],
      },
      {
        heading: "Đặt hàng gọn, chứng từ rõ",
        body:
          "Chủ quán chỉ cần gửi danh sách hàng qua Zalo hoặc điện thoại. TPS1 xác nhận trong 30 phút, gửi báo giá trong vòng 24 giờ và xuất hóa đơn VAT cho từng đơn.",
        items: [
          "Linh hoạt thanh toán theo nhịp bán của quán",
          "Đặt hàng qua Zalo, điện thoại hoặc form trên website",
          "Hóa đơn VAT đầy đủ",
        ],
      },
    ],
    faqs: [
      {
        question: "Quán nhỏ có đặt được không?",
        answer: "Được. TPS1 sẽ trao đổi cùng chủ quán về lượng hàng, lịch giao và hình thức thanh toán, sao cho phù hợp với nhịp bán của quán.",
      },
      {
        question: "Quán cần chuẩn bị gì để nhận báo giá?",
        answer: "Gửi danh sách món hàng cần mua, số lượng dự kiến, địa chỉ quán và giờ nhận hàng mong muốn. TPS1 sẽ gửi báo giá trong vòng 24 giờ.",
      },
      {
        question: "Khu vực nào TPS1 đang giao hàng?",
        answer: "Đồng Nai (gồm cả khu vực Bình Phước cũ), TP.HCM, Bình Dương và Bà Rịa - Vũng Tàu.",
      },
    ],
  },
  {
    slug: "bep-an-tap-the",
    metaDescription: "TPS1 cung cấp thực phẩm theo định mức suất ăn và lịch giao cố định cho bếp ăn tập thể tại Đồng Nai; đạt ISO 22000, HACCP, có hóa đơn VAT đầy đủ.",
    title: "Bếp ăn công ty, nhà máy",
    description:
      "Bếp công ty nấu theo ca, theo định mức và không được phép trễ giờ. TPS1 lập lịch giao theo từng ca bếp, để bữa cơm của người lao động luôn nóng và đủ đầy.",
    targets: ["Khu công nghiệp", "Nhà máy", "Văn phòng", "Doanh nghiệp"],
    sections: [
      {
        heading: "Bữa cơm đúng giờ bắt đầu từ chuyến hàng đúng giờ",
        body:
          "Với bếp ăn công ty, rủi ro lớn nhất thường không nằm ở giá mà ở những chuyến hàng đến trễ, hàng sai quy cách hay không rõ ai chịu trách nhiệm khi phát sinh. Chỉ một ca giao thiếu cũng đủ khiến cả lịch nấu bị xáo trộn.",
        items: [
          "Giao trễ làm lỡ giờ phục vụ của cả ca",
          "Hàng sai quy cách khiến bếp phải sơ chế lại",
          "Thiếu đầu mối khi phát sinh thiếu hàng",
          "Giá thay đổi mà không được báo trước",
        ],
      },
      {
        heading: "TPS1 làm việc theo lịch bếp, không theo lịch kho",
        body:
          "TPS1 lập kế hoạch cung ứng theo lịch bếp của từng khách hàng: khung giờ nhận hàng, danh mục theo thực đơn tuần, định mức từng nhóm hàng và phương án thay thế khi mùa vụ hoặc giá thay đổi.",
        items: [
          "Lịch giao theo khung giờ bếp nhận hàng",
          "Danh mục hàng theo thực đơn tuần hoặc tháng",
          "Báo trước khi giá hoặc mùa vụ thay đổi",
          "Đầu mối kinh doanh cố định cho từng khách hàng",
        ],
      },
      {
        heading: "Ba bước để bắt đầu",
        body:
          "Quý doanh nghiệp chỉ cần gửi danh mục hàng, số lượng dự kiến và lịch giao. TPS1 gửi báo giá trong vòng 24 giờ và xác nhận lịch giao trước khi hàng vào bếp.",
        items: [
          "Bước 1: Gửi danh mục hàng, số lượng và lịch giao",
          "Bước 2: Nhận báo giá trong vòng 24 giờ",
          "Bước 3: Nhận hàng đúng khung giờ, kiểm tra và ký nhận",
        ],
      },
      {
        heading: "Đủ nhóm hàng cho thực đơn bếp ăn",
        body:
          "TPS1 cung cấp đủ các nhóm nguyên liệu bếp ăn công ty cần: rau củ tươi theo mùa, thịt cá hằng ngày, hàng đông lạnh theo kế hoạch và gia vị giữ hương vị đồng đều.",
        items: [
          "Rau củ quả tươi từ Đà Lạt, miền Tây, Bảo Lộc",
          "Thịt heo, bò, gà, hải sản tươi và đông lạnh",
          "Gia vị món Việt, Hoa, Hàn, Âu",
          "Hàng theo thực đơn và yêu cầu riêng",
        ],
      },
    ],
    faqs: [
      {
        question: "Bếp ăn cần cung cấp thông tin gì để nhận báo giá?",
        answer:
          "Gửi danh mục nhóm hàng cần mua, số lượng dự kiến mỗi ngày hoặc mỗi tuần, địa điểm giao và khung giờ nhận hàng. Thông tin càng rõ, báo giá càng sát nhu cầu.",
      },
      {
        question: "TPS1 có giao theo ca không?",
        answer:
          "Có. Lịch giao được thống nhất theo khung giờ bếp nhận hàng của từng ca, để không ảnh hưởng đến lịch chế biến.",
      },
      {
        question: "Nếu thiếu hàng hoặc hàng không đạt thì xử lý thế nào?",
        answer:
          "Bếp kiểm tra khi nhận hàng. Trường hợp sai quy cách hoặc thiếu hàng, đầu mối kinh doanh xử lý và phản hồi trong ngày.",
      },
      {
        question: "Khu vực nào TPS1 đang giao hàng?",
        answer:
          "Đồng Nai (gồm cả khu vực Bình Phước cũ), TP.HCM, Bình Dương và Bà Rịa - Vũng Tàu.",
      },
    ],
  },
  {
    slug: "truong-hoc",
    metaDescription: "Thực phẩm cho bếp bán trú các cấp học: nguồn gốc rõ ràng, hồ sơ an toàn thực phẩm đầy đủ, giao theo lịch của nhà trường và có hóa đơn VAT.",
    title: "Trường học",
    description:
      "Bữa ăn bán trú cần sự cẩn trọng gấp đôi. TPS1 cung cấp hàng rõ nguồn gốc, đủ hồ sơ an toàn thực phẩm và giao đúng giờ, để nhà trường an tâm trao từng phần cơm đến các em.",
    targets: ["Trường mầm non", "Trường tiểu học", "Trường nội trú", "Căng tin đại học"],
    sections: [
      {
        heading: "Rõ nguồn gốc, đủ hồ sơ cho từng chuyến hàng",
        body:
          "Bữa ăn của học sinh cần được kiểm soát chặt chẽ về chất lượng và nguồn gốc. TPS1 vận hành theo hệ thống ISO 22000 và HACCP, cung cấp hồ sơ an toàn thực phẩm và chứng từ nguồn gốc để nhà trường lưu theo quy định.",
        items: [
          "Nguyên liệu có nguồn gốc xuất xứ rõ ràng",
          "Hồ sơ, chứng từ truy xuất nguồn gốc theo yêu cầu",
          "Kiểm tra chất lượng khi nhập kho và trước khi giao",
        ],
      },
      {
        heading: "Nguyên liệu cho thực đơn đủ chất",
        body:
          "Mỗi lứa tuổi cần một thực đơn riêng. TPS1 cung cấp rau củ tươi theo mùa, thịt nạc, cá phi lê không xương và đồ khô, giúp nhà trường dễ luân phiên món mà vẫn giữ mức tiền ăn.",
        items: [
          "Rau củ quả tươi, luân phiên theo mùa",
          "Thịt, cá sơ chế theo yêu cầu (cắt, thái, phi lê)",
          "Đồ khô, gia vị cho bữa chính và bữa phụ",
        ],
      },
      {
        heading: "Đúng giờ để bữa cơm kịp nóng",
        body:
          "Giờ ăn của học sinh được quy định chặt chẽ. TPS1 giao đúng khung giờ đã thống nhất với nhà trường, để bếp có đủ thời gian sơ chế và nấu kịp bữa.",
        items: [
          "Giao theo khung giờ sáng của nhà trường",
          "Nhân viên giao nhận tuân thủ nội quy trường học",
          "Hỗ trợ đơn bổ sung khi có phát sinh",
        ],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "benh-vien",
    metaDescription: "Thực phẩm cho bếp ăn bệnh viện: đa dạng nhóm hàng, kiểm soát an toàn theo ISO 22000 và HACCP, hỗ trợ xây dựng thực đơn dinh dưỡng cho người bệnh.",
    title: "Bệnh viện",
    description:
      "Bếp bệnh viện phục vụ nhiều chế độ ăn khác nhau. TPS1 giữ nhịp giao ổn định và kiểm soát an toàn theo ISO 22000, HACCP, để mỗi khay cơm đến tay người bệnh đều được chuẩn bị chu đáo.",
    targets: ["Bếp ăn người bệnh", "Căng tin bệnh viện", "Bếp ăn nhân viên y tế", "Viện dưỡng lão"],
    sections: [
      {
        heading: "Đủ nguyên liệu cho nhiều chế độ ăn",
        body:
          "Bếp bệnh viện nấu nhiều loại khẩu phần cùng lúc: ăn lỏng, ăn mềm, ăn kiêng đường, kiêng muối. TPS1 cung cấp danh mục nguyên liệu đa dạng để chuyên viên dinh dưỡng và đầu bếp dễ phối hợp từng thực đơn.",
        items: [
          "Nguyên liệu cho các chế độ ăn bệnh lý",
          "Thịt nạc, cá phi lê, rau củ mềm dễ chế biến",
          "Hỗ trợ tính toán dinh dưỡng theo nhóm đối tượng",
        ],
      },
      {
        heading: "Kiểm soát an toàn từ kho đến bếp",
        body:
          "Môi trường y tế đòi hỏi kiểm soát chặt chẽ nguy cơ về an toàn thực phẩm. TPS1 vận hành theo ISO 22000 và HACCP, bảo quản lạnh liên tục và giao bằng xe lạnh chuyên dụng.",
        items: [
          "Vận chuyển bằng xe lạnh, giữ nhiệt độ bảo quản",
          "Kiểm tra chất lượng khi nhập kho và trước khi giao",
          "Hồ sơ an toàn thực phẩm theo yêu cầu của bệnh viện",
        ],
      },
      {
        heading: "Nhịp giao ổn định cho bếp không nghỉ",
        body:
          "Bếp bệnh viện hoạt động mỗi ngày. TPS1 thống nhất lịch giao dài hạn và kế hoạch dự trữ cùng bệnh viện, để nguồn thực phẩm cho người bệnh và nhân viên y tế luôn đầy đủ.",
        items: [
          "Lịch giao cố định theo tuần hoặc theo ngày",
          "Kế hoạch dự trữ cho các dịp nghỉ lễ",
          "Đầu mối kinh doanh riêng cho bệnh viện",
        ],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "suat-an-cong-nghiep",
    metaDescription: "Nguồn nguyên liệu ổn định cho đơn vị suất ăn công nghiệp: giao theo ca, giá sỉ theo sản lượng, hỗ trợ xây dựng thực đơn và kiểm soát chi phí mỗi suất.",
    title: "Đơn vị suất ăn",
    description:
      "Nhà thầu suất ăn cần quy cách đồng đều để giữ chi phí mỗi suất. TPS1 cung cấp hàng chuẩn quy cách, báo trước biến động giá và gợi ý món thay thế theo mùa.",
    targets: ["Nhà thầu suất ăn", "Căng tin doanh nghiệp", "Suất ăn văn phòng", "Bếp nhiều ca"],
    sections: [
      {
        heading: "Quy cách đồng đều giữ chi phí mỗi suất",
        body:
          "Đơn vị suất ăn không chỉ cần mua sỉ mà còn cần hàng đúng quy cách: kích cỡ đồng đều, hao hụt thấp, dễ chia khẩu phần. Quy cách ổn định giúp chi phí mỗi suất luôn nằm trong ngân sách.",
        items: [
          "Hàng có quy cách đồng nhất giữa các chuyến",
          "Tư vấn định lượng nguyên liệu theo số suất",
          "Hao hụt thấp, dễ kiểm soát food cost",
        ],
      },
      {
        heading: "Giao theo ca cho bếp nhiều suất",
        body:
          "TPS1 bố trí kho lạnh, đội xe lạnh và lịch giao theo từng ca để đơn vị suất ăn nhận đủ hàng trước giờ chế biến.",
        items: [
          "Lịch giao theo ca sáng, trưa, tối",
          "Xe lạnh chuyên dụng, giữ độ tươi suốt quãng đường",
          "Phương án bổ sung khi phát sinh thiếu hàng",
        ],
      },
      {
        heading: "Cùng giữ thực đơn trong ngân sách",
        body:
          "Thực đơn cần thay đổi thường xuyên nhưng ngân sách mỗi suất thì cố định. TPS1 báo trước biến động giá và đề xuất nguyên liệu thay thế khi giá tăng hoặc trái mùa.",
        items: [
          "Báo trước biến động giá để chủ động ngân sách",
          "Đề xuất nguyên liệu thay thế hợp lý",
          "Hỗ trợ xây dựng thực đơn đa dạng, ít ngán",
        ],
      },
    ],
    faqs: sharedFaqs,
  },
];

export const services: ContentItem[] = [
  {
    slug: "tu-van-menu",
    metaTitle: "Tư vấn thực đơn cho bếp ăn tập thể",
    metaDescription: "TPS1 đề xuất thực đơn và danh mục nguyên liệu phù hợp với ngân sách, định lượng mỗi suất và đối tượng ăn của từng bếp ăn tập thể.",
    title: "Tư vấn thực đơn",
    description:
      "Một thực đơn hay vừa ngon miệng người ăn, vừa nằm gọn trong ngân sách của bếp. TPS1 cùng quý khách đi từ thực đơn đến danh sách nguyên liệu, định lượng và lịch giao cụ thể.",
    sections: [
      {
        heading: "Từ thực đơn đến danh sách mua hàng",
        body:
          "TPS1 chuyển thực đơn tuần hoặc tháng thành danh sách nguyên liệu, định lượng cho từng món và lịch giao phù hợp, để bếp đặt hàng đúng, đủ, không thừa.",
        items: ["Lên thực đơn theo đối tượng ăn", "Cân đối chi phí theo từng suất hoặc từng món", "Gợi ý nhóm hàng thay thế khi giá biến động"],
      },
      {
        heading: "Cho nhà hàng lẫn bếp ăn tập thể",
        body:
          "Nhà hàng cần thực đơn đổi theo mùa để thực khách không nhàm chán; bếp ăn công ty và trường học cần thực đơn xoay vòng mà vẫn đủ chất. TPS1 tư vấn theo đúng nhịp của từng gian bếp.",
        items: ["Thực đơn theo mùa cho nhà hàng", "Thực đơn xoay vòng cho bếp ăn", "Danh mục hàng đi kèm từng thực đơn"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "setup-bep-an",
    metaTitle: "Hỗ trợ thiết lập bếp ăn mới",
    metaDescription: "Hỗ trợ bếp ăn mới tính danh mục hàng cần nhập, phương án lưu kho và luồng vận hành, để bếp đi vào hoạt động ổn định ngay từ những ngày đầu.",
    title: "Thiết lập bếp ăn mới",
    description:
      "Một gian bếp vận hành trơn tru từ ngày đầu là gian bếp được chuẩn bị kỹ từ trước. TPS1 hỗ trợ tính danh mục hàng cần nhập, phương án lưu kho và luồng nhận hàng cho bếp mới.",
    sections: [
      {
        heading: "Chuẩn bị trước khi bếp đỏ lửa",
        body:
          "Một bếp mới cần sẵn sàng từ tiêu chuẩn vệ sinh an toàn thực phẩm, thiết bị, dụng cụ đến quy trình nhập hàng. TPS1 cùng quý khách rà từng khâu trước ngày khai bếp.",
        items: ["Tư vấn danh mục thiết bị", "Lập luồng nhận hàng", "Chuẩn hóa khu sơ chế, lưu kho, chế biến"],
      },
      {
        heading: "Danh mục hàng cho những tuần đầu",
        body:
          "Dựa trên thực đơn và số suất dự kiến, TPS1 đề xuất danh mục hàng cho những tuần đầu, để bếp vừa đủ nguyên liệu vừa không tồn kho quá nhiều khi lượng khách chưa ổn định.",
        items: ["Danh mục hàng theo thực đơn dự kiến", "Định mức nhập cho những tuần đầu", "Lịch giao ban đầu, điều chỉnh dần theo thực tế"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "tinh-toan-dinh-duong",
    metaTitle: "Tính toán dinh dưỡng cho suất ăn tập thể",
    metaDescription: "Phối hợp nguyên liệu theo nhu cầu dinh dưỡng của từng nhóm: trẻ em, người bệnh, phụ nữ mang thai và người lao động nặng.",
    title: "Tính toán dinh dưỡng",
    description:
      "Mỗi người ăn cần một bữa ăn vừa vặn với cơ thể mình. TPS1 phối hợp nguyên liệu theo nhu cầu dinh dưỡng của từng nhóm: trẻ em, người bệnh, phụ nữ mang thai và người lao động nặng.",
    sections: [
      {
        heading: "Mỗi nhóm ăn có nhu cầu khác nhau",
        body:
          "Trẻ em cần đủ chất để lớn, người bệnh cần khẩu phần nhẹ và đúng chế độ, người lao động nặng cần đủ năng lượng cho cả ca làm. TPS1 hỗ trợ tính định lượng và cân đối các nhóm thực phẩm cho từng đối tượng.",
        items: ["Tính định lượng khẩu phần", "Cân đối nhóm đạm, rau củ, tinh bột", "Đề xuất thực đơn theo môi trường làm việc"],
      },
    ],
    faqs: sharedFaqs,
  },
  {
    slug: "cung-cap-dinh-ky",
    metaTitle: "Cung cấp thực phẩm theo lịch định kỳ",
    metaDescription: "Giao thực phẩm theo lịch ngày, tuần hoặc theo ca với quy cách cố định, giúp bếp ăn hạn chế thiếu hàng, hư hao và thất thoát.",
    title: "Cung cấp theo lịch định kỳ",
    description:
      "Khi chuyến hàng đến đều đặn như nhịp bếp mỗi ngày, người đứng bếp không còn phải lo thiếu hàng. TPS1 giao theo lịch ngày, tuần hoặc theo ca với quy cách cố định.",
    sections: [
      {
        heading: "Dành cho gian bếp đặt hàng lặp lại",
        body:
          "Dịch vụ phù hợp với nhà hàng, quán ăn, bếp công ty và trường học có nhu cầu mua lặp lại, cần chất lượng ổn định, thời gian giao đúng hẹn và chi phí dễ dự trù.",
        items: ["Lịch giao theo ngày, theo tuần hoặc theo ca", "Danh mục hàng cố định", "Điều chỉnh theo mùa vụ và thực đơn"],
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
    metaTitle: "Chính sách bảo mật dữ liệu báo giá",
    metaDescription: "Cách TPS1 thu thập, sử dụng và bảo vệ thông tin liên hệ cùng dữ liệu yêu cầu báo giá của khách hàng doanh nghiệp.",
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
    metaDescription: "Khu vực giao hàng, khung giờ giao và cách phối hợp nhận hàng giữa TPS1 với bếp ăn tại Đồng Nai, TP.HCM, Bình Dương và Bà Rịa - Vũng Tàu.",
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
    metaTitle: "Chính sách đổi trả hàng",
    metaDescription: "Nguyên tắc TPS1 xử lý hàng lỗi, hàng sai quy cách và các phát sinh trong quá trình giao nhận với khách hàng doanh nghiệp.",
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
