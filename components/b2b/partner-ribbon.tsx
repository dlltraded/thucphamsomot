import fs from "fs";
import path from "path";
import Image from "next/image";

const texts = {
  vi: {
    ariaLabel: "Nhà cung cấp và thương hiệu tin dùng",
    label: "Nhãn hàng & Đối tác thương mại tin dùng",
    altPrefix: "Đối tác"
  },
  en: {
    ariaLabel: "Trusted suppliers and brands",
    label: "Trusted Brands & Commercial Partners",
    altPrefix: "Partner"
  }
};

export function PartnerRibbon({ locale = "vi" }: { locale?: "vi" | "en" }) {
  let logos: string[] = [];
  try {
    const logosDir = path.join(process.cwd(), "public/images/partners/logos");
    logos = fs.readdirSync(logosDir).filter(file => file.endsWith('.png'));
  } catch (error) {
    console.warn("Could not read partners logo directory", error);
  }

  if (logos.length === 0) return null;

  // Duplicate the logos array to create a seamless infinite marquee effect
  const displayLogos = [...logos, ...logos];
  const t = texts[locale];

  return (
    <section className="b2b-partners" aria-label={t.ariaLabel}>
      <div className="container-shell">
        <div className="b2b-partners__label">{t.label}</div>
      </div>
      <div className="b2b-partners__track-wrap">
        <div className="b2b-partners__track">
          {displayLogos.map((filename, i) => (
            <div key={`${filename}-${i}`} className="b2b-partner-logo">
              <Image
                src={`/images/partners/logos/${filename}`}
                alt={`${t.altPrefix} ${filename.replace('.png', '').replace(/_/g, ' ')}`}
                width={200}
                height={100}
                className="object-contain"
                style={{ height: "65px", width: "auto" }}
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
