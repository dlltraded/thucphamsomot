import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/portal/",
          "/quan-tri",
          "/namecard/admin",
          "/bao-gia/view/",
        ],
      },
    ],
    sitemap: "https://thucphamsomot.vn/sitemap.xml",
  };
}
