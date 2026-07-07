const fs = require('fs');
const path = require('path');
const https = require('https');

const partners = [
  { name: "HungNghiepFormosa", domain: "fpg.com.tw", text: "Hưng Nghiệp Formosa" },
  { name: "LongSonPetrochemicals", domain: "lsp.com.vn", text: "Long Sơn Petrochemicals" },
  { name: "FashionGarments2", domain: "fashiongarments.com", text: "Fashion Garments" },
  { name: "Leader", domain: "leaderenergy.net", text: "Leader" },
  { name: "Regza", domain: "regza.com", text: "Regza" },
  { name: "Aqua", domain: "aquavietnam.com.vn", text: "Aqua" },
  { name: "Saite", domain: "saitepower.com", text: "Saite" },
  { name: "ThienLong", domain: "thienlonggroup.com", text: "Thiên Long" },
  { name: "Dechang", domain: "dechang.com", text: "Dechang" },
  { name: "Fullxin", domain: "fullxin.com", text: "Fullxin" },
  { name: "NhatGo", domain: null, text: "Nhất Gỗ" },
  { name: "GiaySaiGon", domain: "saigonpaper.com", text: "Giấy Sài Gòn" },
  { name: "Starprint", domain: "starprintvn.com", text: "Starprint" },
  { name: "UyViet", domain: null, text: "Uy Việt" },
  { name: "Caesar", domain: "caesar.com.vn", text: "Caesar" },
  { name: "Toyota", domain: "toyota.com.vn", text: "Toyota" },
  { name: "Taicera", domain: "taicera.com", text: "Taicera" },
  { name: "Cargill", domain: "cargill.com", text: "Cargill" },
  { name: "Bayer", domain: "bayer.com", text: "Bayer" },
  { name: "NovaBuildings", domain: "novabuildings.com", text: "Nova Buildings" },
  { name: "GMApparel", domain: "gmapparel.com", text: "GM Apparel" },
  { name: "Allnex", domain: "allnex.com", text: "Allnex" },
  { name: "Nobel", domain: "nobel.com", text: "Nobel" },
  { name: "Nankai", domain: "nankai.com", text: "Nankai" },
  { name: "Kirin", domain: "kirin.co.jp", text: "Kirin" },
  { name: "Interfood", domain: "interfood.com", text: "Interfood" },
  { name: "MauGiaoVinhTan", domain: null, text: "MG Vĩnh Tân" },
  { name: "MamNonHoangYen", domain: null, text: "MN Hoàng Yến" },
  { name: "MamNonHoangYen2", domain: null, text: "MN Hoàng Yến 2" },
  { name: "FDeliNhiDong", domain: null, text: "F.Deli Nhi Đồng" },
  { name: "BVThongNhat", domain: "bvthongnhat.vn", text: "BV Thống Nhất" },
  { name: "HaiMinhShipyard", domain: null, text: "Hải Minh" },
  { name: "HPFoodPhuMy", domain: null, text: "HP Food" }
];

const outDir = path.join(__dirname, 'public/images/partners/logos');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Clear out old cropped images
const oldFiles = fs.readdirSync(outDir);
for (const file of oldFiles) {
  if (file.startsWith('set1_') || file.startsWith('set2_') || file.endsWith('.png') || file.endsWith('.svg')) {
    fs.unlinkSync(path.join(outDir, file));
  }
}

function generateSvgFallback(name, text) {
  // Extract initials
  const words = text.split(' ');
  let initials = words[0][0];
  if (words.length > 1) initials += words[1][0];
  initials = initials.toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80">
  <rect width="240" height="80" fill="transparent"/>
  <rect x="0" y="20" width="40" height="40" rx="8" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1"/>
  <text x="20" y="45" font-family="Arial, sans-serif" font-weight="bold" font-size="16" fill="#64748b" text-anchor="middle">${initials}</text>
  <text x="50" y="46" font-family="Arial, sans-serif" font-weight="bold" font-size="20" fill="#334155">${text}</text>
</svg>`;
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
  console.log(`Generated SVG for ${name}`);
}

function downloadLogo(partner) {
  return new Promise((resolve) => {
    if (!partner.domain) {
      generateSvgFallback(partner.name, partner.text);
      return resolve();
    }

    const url = `https://logo.clearbit.com/${partner.domain}`;
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(path.join(outDir, `${partner.name}.png`));
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${partner.name}`);
          resolve();
        });
      } else {
        // Fallback to SVG
        generateSvgFallback(partner.name, partner.text);
        resolve();
      }
    }).on('error', (err) => {
      console.error(`Error downloading ${partner.name}:`, err.message);
      generateSvgFallback(partner.name, partner.text);
      resolve();
    });
  });
}

async function run() {
  for (const partner of partners) {
    await downloadLogo(partner);
    // Sleep a tiny bit to avoid hammering API
    await new Promise(r => setTimeout(r, 200));
  }
  console.log("Done generating all logos!");
}

run();
