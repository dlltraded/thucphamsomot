// Custom next/image loader. Vercel's free Image Optimization quota (5,000
// transformations/month) ran out in 10/2026, so nothing goes through
// /_next/image any more:
// - Remote images (product photos on Supabase, KiotViet, Unsplash) are already
//   small compressed files, so they are served as-is.
// - Site images under /public are resized by wsrv.nl, a free image proxy on
//   Cloudflare's CDN with no transformation quota. To fall back to serving the
//   files directly, return `src` for local paths too.
const SITE_ORIGIN = "thucphamsomot.vn";

type LoaderParams = { src: string; width: number; quality?: number };

export default function imageLoader({ src, width, quality }: LoaderParams): string {
  if (!src.startsWith("/") || src.startsWith("//") || src.endsWith(".svg")) {
    return src;
  }
  const params = new URLSearchParams({
    url: `${SITE_ORIGIN}${src}`,
    w: String(width),
    q: String(quality ?? 75),
    output: "webp",
  });
  // `we`: never upscale beyond the original size.
  return `https://wsrv.nl/?${params.toString()}&we`;
}
