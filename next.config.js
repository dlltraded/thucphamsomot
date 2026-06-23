/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Supabase Storage — ảnh sản phẩm (cùng dùng với miniapp)
        protocol: "https",
        hostname: "yntgxollwjemyidizhnn.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "cdn2-retail-images.kiotviet.vn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn-images.kiotviet.vn",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
