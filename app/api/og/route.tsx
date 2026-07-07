import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Dynamic params
    const hasTitle = searchParams.has("title");
    const title = hasTitle
      ? searchParams.get("title")?.slice(0, 100)
      : "Nhà Cung Cấp Thực Phẩm Số Một";

    const subtitle = searchParams.get("subtitle") || "Cho Bếp Ăn Công Nghiệp & Nhà Máy";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            backgroundImage: "url(" + siteConfig.url + "/images/food-banner.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Dark Overlay for better text readability */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 50, 25, 0.75)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "80px",
              position: "relative",
              color: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "40px",
              }}
            >
              {/* Optional: Add Logo here if we have a public URL for it */}
              <div
                style={{
                  fontSize: 32,
                  fontWeight: "bold",
                  color: "#4ade80",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                Thực Phẩm Số Một - TPS1
              </div>
            </div>

            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: "24px",
                maxWidth: "900px",
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: 36,
                fontWeight: 500,
                color: "#94a3b8",
                maxWidth: "800px",
              }}
            >
              {subtitle}
            </div>
            
            <div style={{ display: 'flex', marginTop: '60px', alignItems: 'center', gap: '30px' }}>
               <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, background: '#166534', padding: '10px 24px', borderRadius: '100px' }}>
                 ISO 22000
               </div>
               <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, background: '#166534', padding: '10px 24px', borderRadius: '100px' }}>
                 HACCP
               </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
