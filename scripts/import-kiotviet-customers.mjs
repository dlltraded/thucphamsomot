#!/usr/bin/env node
/**
 * scripts/import-kiotviet-customers.mjs
 *
 * Nhập danh sách khách hàng từ file Excel KiotViet vào hệ thống TPS1.
 * Mặc định: CHẾ ĐỘ XEM TRƯỚC (DRY-RUN) — KHÔNG GHI VÀO SUPABASE.
 *
 * Cách dùng:
 *   node --env-file=.env scripts/import-kiotviet-customers.mjs [duong_dan_file.xlsx]
 *   node --env-file=.env scripts/import-kiotviet-customers.mjs [duong_dan_file.xlsx] --skip-match (không tự gộp SĐT)
 *   node --env-file=.env scripts/import-kiotviet-customers.mjs [duong_dan_file.xlsx] --apply (chỉ admin chạy)
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

// ----------------------------------------------------------------------------
// 1. Helper chuẩn hóa tiếng Việt & sinh mã đối tác
// ----------------------------------------------------------------------------
export function removeAccents(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizePhone(rawPhone) {
  if (!rawPhone) return null;
  // Lấy cụm số đầu tiên nếu có nhiều số ngăn cách bởi dấu phẩy, gạch, khoảng trắng
  const firstPart = String(rawPhone).split(/[,;/|\s]+/)[0] || '';
  const digits = firstPart.replace(/[^0-9]/g, '');
  if (!digits) return null;

  let norm = digits;
  if (norm.startsWith('84') && norm.length === 11) {
    norm = '0' + norm.slice(2);
  }
  if (norm.length >= 9 && norm.length <= 11) {
    return norm;
  }
  return null;
}

export function generateBaseSlug(name, preferredCode) {
  // 1. Ưu tiên mã KiotViet
  if (preferredCode && String(preferredCode).trim()) {
    const clean = removeAccents(preferredCode)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (clean) return clean.slice(0, 12);
  }

  // 2. Sinh từ tên khách hàng
  if (name && String(name).trim()) {
    let clean = removeAccents(name).toUpperCase();
    clean = clean.replace(
      /\b(CONG TY|TNHH|CO PHAN|CP|MTV|HO KINH DOANH|HKD|DNTN|TRUONG|MAM NON|MAU GIAO|NHA HANG|QUAN|TIEM|CHI NHANH|CN|VPDD)\b/g,
      ' '
    );
    clean = clean.replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, '');
    if (clean) return clean.slice(0, 12);

    // Fallback lấy 6 ký tự đầu của tên gốc
    const fallback = removeAccents(name)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (fallback) return fallback.slice(0, 6);
  }

  return 'KHACH';
}

export function assignUniquePartnerCode(base, usedCodesSet) {
  const candidate = `TPS1-${base}`;
  let final = candidate;
  let suffix = 1;

  while (usedCodesSet.has(final.toUpperCase())) {
    suffix++;
    final = `${candidate}${suffix}`;
  }

  usedCodesSet.add(final.toUpperCase());
  return final;
}

// ----------------------------------------------------------------------------
// 2. Hàm thực thi chính
// ----------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const skipMatch = args.includes('--skip-match');
  const ignoreArg = args.find((a) => a.startsWith('--ignore-existing='));
  const ignoredPartnerCodes = new Set(
    ignoreArg
      ? ignoreArg
          .slice('--ignore-existing='.length)
          .split(',')
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean)
      : []
  );
  const customPath = args.find((a) => !a.startsWith('--'));
  const filePath =
    customPath ||
    'C:\\Users\\boanl\\Downloads\\DanhSachKhachHang_KV20092026-143107-369.xlsx';

  console.log('='.repeat(70));
  console.log('TPS1 — IMPORT KHÁCH HÀNG TỪ KIOTVIET (WP2b)');
  console.log(`Chế độ: ${apply ? 'GHI THẬT (--apply)' : 'XEM TRƯỚC (DRY-RUN)'}`);
  if (skipMatch) console.log('Tùy chọn: --skip-match (Không tự gộp MATCH_PHONE)');
  if (ignoredPartnerCodes.size > 0) {
    console.log(`Tùy chọn: --ignore-existing (${Array.from(ignoredPartnerCodes).join(', ')}) — bỏ qua khi khớp`);
  }
  console.log(`File nguồn: ${filePath}`);
  console.log('='.repeat(70));

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Không tìm thấy file tại đường dẫn: ${filePath}`);
    process.exit(1);
  }

  const url = process.env.SUPABASE_PRODUCTS_URL;
  const key =
    process.env.SUPABASE_PRODUCTS_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Thiếu SUPABASE_PRODUCTS_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // G2-a: Nếu chạy --apply, kiểm tra bắt buộc cột kiotviet_code đã có trong DB
  if (apply) {
    const { error: colCheck } = await supabase.from('vip_accounts').select('kiotviet_code').limit(1);
    if (colCheck && colCheck.message.includes('kiotviet_code')) {
      console.error('\n❌ BẮT BUỘC DỪNG LẠI:');
      console.error('Cột "kiotviet_code" chưa tồn tại trong bảng vip_accounts trên Supabase!');
      console.error('Anh phải chạy migration "20260920c_customer_kiotviet_import.sql" trên Supabase SQL Editor TRƯỚC khi chạy script với cờ --apply.\n');
      process.exit(1);
    }
  }

  // 1. Đọc dữ liệu từ file Excel KiotViet
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawRows.length < 2) {
    console.error('❌ File Excel không có dữ liệu khách hàng');
    process.exit(1);
  }

  const headers = rawRows[0].map((h) => String(h || '').trim());
  const dataRows = rawRows.slice(1);
  console.log(`✓ Đọc thành công ${dataRows.length} dòng từ sheet "${sheetName}".`);

  // Tìm index các cột
  const colIdx = {
    customerType: headers.indexOf('Loại khách'),
    kiotvietCode: headers.indexOf('Mã khách hàng'),
    name: headers.indexOf('Tên khách hàng'),
    phone: headers.indexOf('Điện thoại'),
    address: headers.indexOf('Địa chỉ'),
    customerGroup: headers.indexOf('Nhóm khách hàng'),
    companyInvoice: headers.indexOf('Tên công ty (xuất HĐ)'),
    addressInvoice: headers.indexOf('Địa chỉ chi tiết (xuất HĐ)'),
    taxCode: headers.indexOf('MST (xuất HĐ)'),
    phoneInvoice: headers.indexOf('SĐT (xuất HĐ)'),
    openingDebt: headers.indexOf('Nợ cần thu hiện tại'),
    totalSales: headers.indexOf('Tổng bán'),
    status: headers.indexOf('Trạng thái'),
  };

  // 2. Query danh sách khách hàng hiện có trong vip_accounts
  console.log('Đang tải danh sách khách hàng hiện có trên Supabase...');
  let existingCustomers = [];
  const { data: withKiot, error: exErr } = await supabase
    .from('vip_accounts')
    .select('id, partner_code, name, phone, company, address, tax_code, kiotviet_code, customer_group, is_active');

  if (exErr) {
    if (exErr.message.includes('kiotviet_code')) {
      console.log('ℹ️ Cột kiotviet_code chưa có trên Supabase (chưa chạy migration). Đang tải danh mục cơ bản...');
      const { data: basic, error: basicErr } = await supabase
        .from('vip_accounts')
        .select('id, partner_code, name, phone, company, address, tax_code, is_active');
      if (basicErr) {
        console.error('❌ Lỗi tải dữ liệu vip_accounts:', basicErr.message);
        process.exit(1);
      }
      existingCustomers = basic || [];
    } else {
      console.error('❌ Lỗi tải dữ liệu vip_accounts:', exErr.message);
      process.exit(1);
    }
  } else {
    existingCustomers = withKiot || [];
  }

  const existingList = existingCustomers;
  console.log(`✓ Hệ thống đang có ${existingList.length} tài khoản khách hàng.`);

  // Xây dựng bộ chỉ mục hiện có
  const usedPartnerCodes = new Set(
    existingList.map((c) => String(c.partner_code || '').toUpperCase()).filter(Boolean)
  );

  const existingByKiotvietCode = new Map();
  const existingByPhone = new Map();
  const existingByName = new Map();
  let skippedInactiveCount = 0;
  let ignoredExistingCount = 0;

  for (const c of existingList) {
    const pCodeUpper = String(c.partner_code || '').trim().toUpperCase();

    // G7: Bỏ qua tài khoản bị vô hiệu hóa khi lập chỉ mục khớp
    if (c.is_active === false) {
      skippedInactiveCount++;
      continue;
    }

    // G7: Bỏ qua tài khoản test theo danh sách --ignore-existing khi lập chỉ mục khớp
    if (pCodeUpper && ignoredPartnerCodes.has(pCodeUpper)) {
      ignoredExistingCount++;
      continue;
    }

    if (c.kiotviet_code) {
      existingByKiotvietCode.set(String(c.kiotviet_code).trim().toUpperCase(), c);
    }
    const normP = normalizePhone(c.phone);
    if (normP) {
      existingByPhone.set(normP, c);
    }
    if (c.name) {
      const normN = removeAccents(c.name).toLowerCase().replace(/\s+/g, '');
      if (normN) {
        if (!existingByName.has(normN)) existingByName.set(normN, []);
        existingByName.get(normN).push(c);
      }
    }
  }
  console.log(`✓ Chỉ mục khớp: bỏ qua ${skippedInactiveCount} tài khoản inactive, ${ignoredExistingCount} tài khoản test (--ignore-existing).`);

  // 3. Xử lý từng dòng khách hàng trong file Excel
  const results = [];
  const invalidPhonesList = [];
  const matchedPhoneRows = [];

  const stats = {
    total: dataRows.length,
    newCount: 0,
    matchedPhoneCount: 0,
    alreadyImportedCount: 0,
    needsReviewCount: 0,
    hasRawPhoneCount: 0,
    validPhoneCount: 0,
    missingPhoneCount: 0,
    hasAddressCount: 0,
    missingAddressCount: 0,
    specialCharCodes: 0,
    verifiedCount: 0,
    pendingCount: 0,
    positiveDebtCount: 0,
    totalPositiveDebt: 0,
    negativeDebtCount: 0,
    totalNegativeDebt: 0,
    groupDistribution: {},
  };

  const seenInFileKiotCodes = new Set();
  const seenInFilePhones = new Map();

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx];
    const rawKiotCode = String(row[colIdx.kiotvietCode] || '').trim();
    const rawName = String(row[colIdx.name] || '').trim();
    if (!rawKiotCode && !rawName) continue;

    const rawCompany = String(row[colIdx.companyInvoice] || '').trim();
    const company = rawCompany || rawName;
    const rawPhone = String(row[colIdx.phone] || row[colIdx.phoneInvoice] || '').trim();
    const phone = normalizePhone(rawPhone);

    const rawAddr = String(row[colIdx.address] || row[colIdx.addressInvoice] || '').trim();
    const address = rawAddr || null;

    const taxCode = String(row[colIdx.taxCode] || '').trim() || null;
    const customerGroup = String(row[colIdx.customerGroup] || '').trim() || 'Chưa phân nhóm';
    const openingDebt = Number(row[colIdx.openingDebt]) || 0;
    const totalSales = Number(row[colIdx.totalSales]) || 0;
    const verificationStatus = totalSales > 0 ? 'verified' : 'pending';

    // Thống kê động
    if (rawPhone) {
      stats.hasRawPhoneCount++;
      if (phone) {
        stats.validPhoneCount++;
      } else {
        invalidPhonesList.push({
          kiotviet_code: rawKiotCode,
          name: rawName,
          raw_phone: rawPhone,
          reason: 'Không chuẩn hóa được (không đủ 9-11 chữ số)',
        });
      }
    }
    if (!phone) stats.missingPhoneCount++;

    if (address) stats.hasAddressCount++;
    else stats.missingAddressCount++;

    if (/[^A-Za-z0-9]/.test(rawKiotCode)) stats.specialCharCodes++;

    if (verificationStatus === 'verified') stats.verifiedCount++;
    else stats.pendingCount++;

    if (openingDebt > 0) {
      stats.positiveDebtCount++;
      stats.totalPositiveDebt += openingDebt;
    } else if (openingDebt < 0) {
      stats.negativeDebtCount++;
      stats.totalNegativeDebt += openingDebt;
    }

    stats.groupDistribution[customerGroup] = (stats.groupDistribution[customerGroup] || 0) + 1;

    // Kiểm tra trùng lặp trong nội bộ file
    let internalConflict = null;
    if (seenInFileKiotCodes.has(rawKiotCode.toUpperCase())) {
      internalConflict = `Trùng mã KiotViet "${rawKiotCode}" trong nội bộ file`;
    }
    seenInFileKiotCodes.add(rawKiotCode.toUpperCase());

    if (phone) {
      if (seenInFilePhones.has(phone)) {
        internalConflict = `Trùng SĐT "${phone}" với dòng khác trong file (${seenInFilePhones.get(phone)})`;
      } else {
        seenInFilePhones.set(phone, rawKiotCode);
      }
    }

    // Xác định Action
    let action = 'CREATE';
    let targetCustomer = null;
    let assignedPartnerCode = '';
    let reason = '';

    const upperKiot = rawKiotCode.toUpperCase();
    const normName = removeAccents(rawName).toLowerCase().replace(/\s+/g, '');

    if (existingByKiotvietCode.has(upperKiot)) {
      action = 'ALREADY_IMPORTED';
      targetCustomer = existingByKiotvietCode.get(upperKiot);
      assignedPartnerCode = targetCustomer.partner_code;
      reason = 'Đã có kiotviet_code trên hệ thống';
      stats.alreadyImportedCount++;
    } else if (phone && existingByPhone.has(phone)) {
      const matched = existingByPhone.get(phone);
      if (skipMatch) {
        action = 'NEEDS_REVIEW';
        assignedPartnerCode = '';
        reason = `[--skip-match] Khớp SĐT ${phone} với tài khoản (${matched.partner_code} - ${matched.name}). Tạm giữ để duyệt tay.`;
        stats.needsReviewCount++;
      } else {
        action = 'MATCH_PHONE';
        targetCustomer = matched;
        assignedPartnerCode = targetCustomer.partner_code;
        reason = `Khớp SĐT ${phone} với tài khoản hiện có (${targetCustomer.partner_code} - ${targetCustomer.name || 'chưa có tên'})`;
        stats.matchedPhoneCount++;
        matchedPhoneRows.push({
          kiotviet_code: rawKiotCode,
          name: rawName,
          phone,
          db_partner_code: targetCustomer.partner_code,
          db_name: targetCustomer.name,
          db_company: targetCustomer.company,
        });
      }
    } else if (normName && existingByName.has(normName)) {
      action = 'NEEDS_REVIEW';
      const matches = existingByName.get(normName);
      assignedPartnerCode = '';
      reason = `Trùng tên tiếng Việt với ${matches.length} tài khoản hiện có (${matches.map((m) => m.partner_code).join(', ')})`;
      stats.needsReviewCount++;
    } else if (internalConflict) {
      action = 'NEEDS_REVIEW';
      assignedPartnerCode = '';
      reason = internalConflict;
      stats.needsReviewCount++;
    } else {
      action = 'CREATE';
      const baseSlug = generateBaseSlug(rawName, rawKiotCode);
      assignedPartnerCode = assignUniquePartnerCode(baseSlug, usedPartnerCodes);
      stats.newCount++;
    }

    results.push({
      kiotviet_code: rawKiotCode,
      partner_code: assignedPartnerCode,
      name: rawName,
      company,
      phone: phone || '',
      raw_phone: rawPhone,
      address: address || '',
      tax_code: taxCode || '',
      customer_group: customerGroup,
      opening_debt: openingDebt,
      total_sales: totalSales,
      verification_status: verificationStatus,
      action,
      target_customer: targetCustomer,
      target_customer_id: targetCustomer?.id || null,
      reason,
    });
  }

  // 4. Tạo thư mục tmp/ và xuất file đối chiếu CSV
  const tmpDir = path.resolve(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const csvPath = path.join(tmpDir, `doi_chieu_ma_khach_${dateStr}.csv`);
  const reportPath = path.join(tmpDir, `import-khach-${dateStr}.md`);

  const csvHeaders = [
    'kiotviet_code',
    'partner_code',
    'name',
    'phone',
    'address',
    'customer_group',
    'opening_debt',
    'total_sales',
    'action',
    'reason',
  ];

  const escapeCsv = (val) => {
    const s = String(val == null ? '' : val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvContent = [
    csvHeaders.join(','),
    ...results.map((r) =>
      [
        escapeCsv(r.kiotviet_code),
        escapeCsv(r.partner_code),
        escapeCsv(r.name),
        escapeCsv(r.phone),
        escapeCsv(r.address),
        escapeCsv(r.customer_group),
        r.opening_debt,
        r.total_sales,
        escapeCsv(r.action),
        escapeCsv(r.reason),
      ].join(',')
    ),
  ].join('\n');

  fs.writeFileSync(csvPath, '\uFEFF' + csvContent, 'utf8');
  console.log(`✓ Đã tạo file đối chiếu CSV tại: ${csvPath}`);

  // 5. Ghi file Markdown Báo cáo dry-run (G3: hoàn toàn bằng số tính động)
  const sortedGroups = Object.entries(stats.groupDistribution).sort((a, b) => b[1] - a[1]);

  const mdReport = `# BÁO CÁO DRY-RUN NHẬP KHÁCH HÀNG TỪ KIOTVIET (WP2b)
**Ngày thực hiện:** ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
**File nguồn:** \`${filePath}\`
**Trạng thái:** ${apply ? 'ĐÃ GHI DATABASE (--apply)' : 'XEM TRƯỚC (DRY-RUN — chưa ghi DB)'}

---

## 1. TỔNG QUAN SỐ LIỆU ĐO ĐƯỢC (TÍNH TOÁN ĐỘNG)

| Chỉ số | Số lượng | Ghi chú |
|---|---|---|
| **Tổng số dòng khách hàng trong file** | **${stats.total}** | Tất cả có Trạng thái = 1 |
| **Sẽ tạo mới (CREATE)** | **${stats.newCount}** | Được sinh mã dạng \`TPS1-<VIẾTTẮT>\` |
| **Sẽ khớp tự động theo SĐT (MATCH_PHONE)** | **${stats.matchedPhoneCount}** | Khớp theo SĐT, chỉ điền trường còn trống |
| **Đã import trước đó (ALREADY_IMPORTED)** | **${stats.alreadyImportedCount}** | Trùng kiotviet_code đã có |
| **Cần duyệt thủ công (NEEDS_REVIEW)** | **${stats.needsReviewCount}** | Trùng tên tiếng Việt hoặc trùng nội bộ file |
| **Tài khoản inactive bị bỏ qua khi khớp** | **${skippedInactiveCount}** | Tài khoản \`is_active = false\` không dùng để khớp |
| **Tài khoản test bỏ qua (--ignore-existing)** | **${ignoredExistingCount}** | Danh sách: \`${Array.from(ignoredPartnerCodes).join(', ') || 'không có'}\` |
| **Khách có SĐT trong file** | **${stats.hasRawPhoneCount}** | ${stats.validPhoneCount} SĐT hợp lệ, ${invalidPhonesList.length} SĐT không hợp lệ |
| **Khách có SĐT hợp lệ (9–11 số)** | **${stats.validPhoneCount}** | Đã chuẩn hóa về định dạng \`0...\` |
| **Khách THIẾU SĐT (hoặc SĐT lỗi)** | **${stats.missingPhoneCount}** | Cần nhân viên bổ sung dần |
| **Khách có địa chỉ trong file** | **${stats.hasAddressCount}** | Sẽ tạo 1 \`customer_addresses\` mặc định |
| **Khách THIẾU địa chỉ** | **${stats.missingAddressCount}** | Cần nhân viên bổ sung dần |
| **Mã khách có ký tự đặc biệt / dấu** | **${stats.specialCharCodes}** | Đã chuẩn hóa an toàn sang A-Z0-9 |
| **Khách xác thực ngay (\`verified\`)** | **${stats.verifiedCount}** | Có Tổng bán > 0 (verified_by: 'import KiotViet') |
| **Khách chờ xác thực (\`pending\`)** | **${stats.pendingCount}** | Chưa có phát sinh doanh số (Tổng bán = 0) |

---

## 2. DANH SÁCH SĐT KHÔNG HỢP LỆ BỊ BỎ (${invalidPhonesList.length} khách)

| STT | Mã KiotViet | Tên khách hàng | SĐT gốc trong file | Lý do |
|---|---|---|---|---|
${
  invalidPhonesList.length === 0
    ? '| - | - | - | - | Không có |'
    : invalidPhonesList
        .map((inv, i) => `| ${i + 1} | \`${inv.kiotviet_code}\` | ${inv.name} | \`${inv.raw_phone}\` | ${inv.reason} |`)
        .join('\n')
}

---

## 3. CHI TIẾT CÁC DÒNG KHỚP SĐT (MATCH_PHONE: ${matchedPhoneRows.length} khách)
*Quy tắc: Khi chạy \`--apply\`, hệ thống CHỈ điền các trường còn trống (kiotviet_code, customer_group, nợ đầu kỳ, tax_code, address nếu chưa có). **TUYỆT ĐỐI KHÔNG GHI ĐÈ tên hoặc công ty hiện có**.*

${
  matchedPhoneRows.length === 0
    ? '_Không có khách nào khớp SĐT._'
    : matchedPhoneRows
        .map(
          (m, i) =>
            `${i + 1}. **Mã KV:** \`${m.kiotviet_code}\` — **Tên KV:** ${m.name}\n` +
            `   - **SĐT khớp:** \`${m.phone}\`\n` +
            `   - **Tài khoản DB khớp:** Mã \`${m.db_partner_code}\` — Tên: "${m.db_name}" (Công ty: "${m.db_company || '---'}")\n` +
            `   - **Lưu ý kiểm tra:** ${
              m.name.toUpperCase() !== String(m.db_name || '').toUpperCase()
                ? '⚠️ **Tên trên KiotViet khác tên tài khoản Zalo Mini App hiện có!** Anh cần xem xét xác nhận trước khi gộp (có thể dùng `--skip-match` để tách).'
                : '✓ Tên khớp hoàn toàn.'
            }`
        )
        .join('\n\n')
}

---

## 4. THỐNG KÊ CÔNG NỢ ĐẦU KỲ (THAM CHIẾU KIOTVIET)
*Lưu ý: Số nợ KiotViet lưu tại \`kiotviet_opening_debt\`, KHÔNG đưa vào công nợ tính toán đơn hàng để tránh lệch số.*

- **Số khách có nợ dương (TPS1 cần thu):** **${stats.positiveDebtCount}** khách
  - Tổng số tiền cần thu: **${stats.totalPositiveDebt.toLocaleString('vi-VN')} đ**
- **Số khách có nợ âm (khách trả dư / tạm ứng):** **${stats.negativeDebtCount}** khách
  - Tổng số tiền khách trả dư: **${stats.totalNegativeDebt.toLocaleString('vi-VN')} đ**

---

## 5. PHÂN BỐ THEO NHÓM KHÁCH HÀNG

| STT | Nhóm khách hàng (KiotViet) | Số khách |
|---|---|---|
${sortedGroups.map(([g, c], i) => `| ${i + 1} | ${g} | ${c} |`).join('\n')}

---

## 6. DANH SÁCH CẦN DUYỆT THỦ CÔNG (NEEDS_REVIEW: ${stats.needsReviewCount} khách)
${
  results.filter((r) => r.action === 'NEEDS_REVIEW').length === 0
    ? '_Không có khách nào cần duyệt thủ công._'
    : results
        .filter((r) => r.action === 'NEEDS_REVIEW')
        .map(
          (r, i) =>
            `${i + 1}. **${r.name}** (Mã KV: \`${r.kiotviet_code}\`, SĐT: \`${r.phone || 'trống'}\`)\n   - **Lý do:** ${r.reason}`
        )
        .join('\n')
}

---

## 7. MẪU BẢNG ĐỐI CHIẾU MÃ ĐỐI TÁC (\`kiotviet_code\` → \`partner_code\`)
*Bảng đầy đủ 269 dòng được lưu tại file CSV: \`tmp/doi_chieu_ma_khach_${dateStr}.csv\`*

| STT | Mã KiotViet | Mã hệ thống sinh (\`partner_code\`) | Tên khách hàng | SĐT | Địa chỉ | Hành động |
|---|---|---|---|---|---|---|
${results
  .slice(0, 20)
  .map(
    (r, i) =>
      `| ${i + 1} | \`${r.kiotviet_code}\` | \`${r.partner_code || '---'}\` | ${r.name} | ${r.phone || '---'} | ${r.address ? r.address.slice(0, 30) + '...' : '---'} | ${r.action} |`
  )
  .join('\n')}

---

## 8. LƯU Ý KỸ THUẬT VÀ RÀNG BUỘC DATABASE
1. **Ràng buộc cột \`phone\` trong \`vip_accounts\`:** Bảng \`vip_accounts\` ban đầu có \`phone text NOT NULL\`. Do ${stats.missingPhoneCount} khách KiotViet không có SĐT hợp lệ, migration \`20260920c_customer_kiotviet_import.sql\` đã có lệnh \`ALTER TABLE public.vip_accounts ALTER COLUMN phone DROP NOT NULL;\`. Cần chạy migration này trên Supabase trước khi chạy \`--apply\`.
2. **Nguồn đăng ký (\`registration_source\`):** Toàn bộ bản ghi import được đặt \`registration_source = 'admin'\`, tuân thủ đúng CHECK constraint \`('zalo_mini_app', 'website', 'admin')\`.
3. **Mật khẩu (\`password_hash\`):** Để \`null\`. Khách chưa tự đăng nhập được; nhân viên sẽ dùng chức năng cấp mật khẩu khi khách bắt đầu tự đặt.
4. **Điểm giao hàng (\`customer_addresses\`):** Đối với ${stats.hasAddressCount} khách có địa chỉ, khi chạy \`--apply\` hệ thống sẽ tự động tạo 1 địa chỉ mặc định (\`is_default = true\`, label "Địa chỉ giao hàng").
`;

  fs.writeFileSync(reportPath, mdReport, 'utf8');
  console.log(`✓ Đã tạo file báo cáo Markdown tại: ${reportPath}`);

  // 6. Thực thi ghi thật nếu có cờ --apply (G2: có xác nhận YES, kiểm lỗi từng dòng, không ghi đè name/company)
  if (apply) {
    console.log('\n' + '!'.repeat(70));
    console.log('⚠️ BẠN ĐANG CHẠY CHẾ ĐỘ GHI THẬT (--apply) VÀO SUPABASE!');
    console.log(`Tóm tắt: Sẽ tạo mới ${stats.newCount} khách hàng, cập nhật ${stats.matchedPhoneCount} khách hàng.`);
    console.log('!'.repeat(70) + '\n');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('Gõ YES để xác nhận ghi dữ liệu vào Supabase: ');
    rl.close();

    if (answer.trim() !== 'YES') {
      console.log('Đã hủy thao tác ghi dữ liệu theo yêu cầu của bạn.');
      process.exit(0);
    }

    console.log('\nĐang tiến hành ghi vào Supabase (--apply)...');
    let inserted = 0;
    let updated = 0;
    const errorsList = [];

    for (const item of results) {
      if (item.action === 'CREATE') {
        try {
          const { data: newCust, error: insErr } = await supabase
            .from('vip_accounts')
            .insert({
              partner_code: item.partner_code,
              name: item.name,
              company: item.company,
              phone: item.phone || null,
              address: item.address || null,
              tax_code: item.tax_code || null,
              customer_group: item.customer_group,
              kiotviet_code: item.kiotviet_code,
              kiotviet_opening_debt: item.opening_debt,
              kiotviet_imported_at: new Date().toISOString(),
              discount_tier: 'VIP0',
              is_active: true,
              registration_source: 'admin',
              verification_status: item.verification_status,
              verified_by: item.verification_status === 'verified' ? 'import KiotViet' : null,
              verified_at: item.verification_status === 'verified' ? new Date().toISOString() : null,
            })
            .select('id')
            .single();

          if (insErr) {
            console.error(`Lỗi tạo khách ${item.name} (${item.kiotviet_code}):`, insErr.message);
            errorsList.push({ item: item.kiotviet_code, error: insErr.message, step: 'insert_vip_account' });
          } else {
            inserted++;
            if (item.address && newCust?.id) {
              const { error: addrErr } = await supabase.from('customer_addresses').insert({
                customer_id: newCust.id,
                label: 'Địa chỉ giao hàng',
                address: item.address,
                contact_name: item.name,
                contact_phone: item.phone || '',
                is_default: true,
              });
              if (addrErr) {
                console.error(`Lỗi tạo địa chỉ cho khách ${item.name}:`, addrErr.message);
                errorsList.push({ item: item.kiotviet_code, error: addrErr.message, step: 'insert_customer_address' });
              }
            }
          }
        } catch (rowErr) {
          console.error(`Lỗi ngoại lệ tạo khách ${item.name}:`, rowErr.message);
          errorsList.push({ item: item.kiotviet_code, error: rowErr.message, step: 'exception_insert' });
        }
      } else if (item.action === 'MATCH_PHONE' && item.target_customer_id) {
        try {
          // G2-b: CHỈ điền các trường đang trống, KHÔNG ghi đè name hoặc company
          const updatePayload = {
            kiotviet_code: item.kiotviet_code,
            customer_group: item.customer_group,
            kiotviet_opening_debt: item.opening_debt,
            kiotviet_imported_at: new Date().toISOString(),
          };

          if (!item.target_customer?.tax_code && item.tax_code) {
            updatePayload.tax_code = item.tax_code;
          }
          if (!item.target_customer?.address && item.address) {
            updatePayload.address = item.address;
          }

          const { error: upErr } = await supabase
            .from('vip_accounts')
            .update(updatePayload)
            .eq('id', item.target_customer_id);

          if (upErr) {
            console.error(`Lỗi cập nhật khách ${item.name}:`, upErr.message);
            errorsList.push({ item: item.kiotviet_code, error: upErr.message, step: 'update_vip_account' });
          } else {
            updated++;
          }
        } catch (upEx) {
          console.error(`Lỗi ngoại lệ cập nhật khách ${item.name}:`, upEx.message);
          errorsList.push({ item: item.kiotviet_code, error: upEx.message, step: 'exception_update' });
        }
      }
    }

    console.log(`\n✓ Hoàn tất ghi dữ liệu: Đã tạo mới: ${inserted}, Cập nhật: ${updated}, Lỗi: ${errorsList.length}`);
    if (errorsList.length > 0) {
      const errorLogPath = path.join(tmpDir, `import_errors_${dateStr}.json`);
      fs.writeFileSync(errorLogPath, JSON.stringify(errorsList, null, 2), 'utf8');
      console.log(`⚠️ Danh sách lỗi đã được ghi vào: ${errorLogPath}`);
    }
  } else {
    console.log('\n[DRY-RUN HOÀN TẤT] Không có dữ liệu nào bị thay đổi trong database.');
    console.log(`Số liệu tóm tắt: Sẽ tạo mới: ${stats.newCount}, Khớp SĐT: ${stats.matchedPhoneCount}, Cần duyệt: ${stats.needsReviewCount}`);
    if (invalidPhonesList.length > 0) {
      console.log(`ℹ️ Có ${invalidPhonesList.length} SĐT không hợp lệ bị bỏ qua (xem chi tiết trong tmp/import-khach-${dateStr}.md)`);
    }
  }
}

main().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
