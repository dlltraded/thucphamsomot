/**
 * =================================================================
 * TPS1 — Google Apps Script (Unified v2)
 * Nhận POST từ: Dashboard Admin | Zalo Mini App | Website
 * Đọc GET cho: PWA Admin sync
 * =================================================================
 */

// ─── CẤU HÌNH ─────────────────────────────────────────────────────
const SPREADSHEET_ID = "100vzbwgIwaJrqtAOaknwMxxILTMiGEhuVt8QX7J2Dpo";
const SHEET_NAME = "Leads";
const NOTIFY_EMAIL = "xuandinh.avg@gmail.com";

const LEAD_HEADERS = [
  "Submitted At",       // A
  "Vai trò",            // B
  "Loại form",          // C
  "Kênh",               // D
  "Name",               // E
  "Phone",              // F
  "Email",              // G
  "Company",            // H
  "Facility Type",      // I
  "Interested In",      // J
  "Purchase Scale",     // K
  "Delivery Frequency", // L
  "Delivery Area",      // M
  "Need By",            // N
  "Message",            // O
  "Selected Items",     // P  (text list các sản phẩm)
  "Selected Count",     // Q  (số lượng)
  "Source",             // R
  "Giỏ hàng",           // S  (chi tiết giỏ hàng miniapp)
  "Trạng thái xử lý",  // T  (admin điền)
  // Cột bổ sung Zalo Mini App
  "Zalo User ID",       // U
  "Zalo Display Name",  // V
  "Zalo Avatar",        // W
  "Zalo Phone Token",   // X
  "Zalo Follow OA",     // Y
  "Mini App Source"     // Z
];

// ─── TIỆN ÍCH ─────────────────────────────────────────────────────

function getTargetSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (_) {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
    throw new Error("Không thể kết nối Google Sheets — kiểm tra SPREADSHEET_ID.");
  }
}

/**
 * Xóa tất cả data rows, giữ nguyên header row 1.
 * Chạy thủ công từ Apps Script editor khi cần reset.
 */
function clearTestData() {
  const ss    = getTargetSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return "Sheet không tồn tại.";

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return "Sheet đã trống (chỉ có header).";

  sheet.deleteRows(2, lastRow - 1);
  return "Đã xóa " + (lastRow - 1) + " dòng data. Header được giữ nguyên.";
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeArray(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function normalizeBoolean(value) {
  if (value === true || value === "true") return "TRUE";
  if (value === false || value === "false") return "FALSE";
  return value || "";
}

/**
 * Lấy text sản phẩm đã chọn từ nhiều key format khác nhau:
 * - selectedItems (array [{title, quantity}])  ← Website format
 * - selectedProducts (string)                  ← Miniapp format (canonical v2)
 * - selected_products (string)                 ← Miniapp format cũ (fallback)
 */
function buildSelectedItemsText(payload) {
  // 1. Array format (website)
  if (Array.isArray(payload.selectedItems) && payload.selectedItems.length > 0) {
    return payload.selectedItems
      .map(function(item) {
        const title = item.title || item.name || "Sản phẩm";
        const qty   = item.quantity !== undefined ? item.quantity : 1;
        return title + " x" + qty;
      })
      .join(" | ");
  }
  // 2. String format: selectedProducts (canonical v2)
  if (payload.selectedProducts) return String(payload.selectedProducts);
  // 3. String format cũ: selected_products (fallback)
  if (payload.selected_products) return String(payload.selected_products);
  // 4. selectedItems là string
  if (payload.selectedItems) return String(payload.selectedItems);
  return "";
}

/**
 * Xây dựng nội dung cột "Giỏ hàng":
 * - Nếu có cartItems (array) → JSON có cấu trúc (tên + số lượng + đơn vị + giá)
 * - Nếu không có array → dùng text summary (selectedProducts)
 */
function buildCartJson(payload) {
  // 1. cartItems (array đầy đủ từ miniapp v2 / website)
  if (Array.isArray(payload.cartItems) && payload.cartItems.length > 0) {
    return JSON.stringify(payload.cartItems.map(function(item) {
      return {
        name:  item.name  || item.title || "",
        qty:   item.qty   || item.quantity || 1,
        unit:  item.unit  || "kg",
        price: item.price || 0
      };
    }));
  }
  // 2. selectedItems array (website format)
  if (Array.isArray(payload.selectedItems) && payload.selectedItems.length > 0) {
    return JSON.stringify(payload.selectedItems.map(function(item) {
      return {
        name: item.title || item.name || "",
        qty:  item.quantity || 1
      };
    }));
  }
  // 3. Fallback: text summary
  return payload.selectedProducts || payload.selected_products ||
         (typeof payload.selectedItems === "string" ? payload.selectedItems : "");
}

function isZaloMiniAppLead(payload) {
  return (
    payload.kenh === "Zalo Mini App" ||
    payload.channel === "Zalo Mini App" ||
    payload.source === "zalo_mini_app" ||
    !!payload.miniAppSource ||
    !!payload.zaloUserId
  );
}


function scoreLead(payload) {
  const area = String(payload.deliveryArea || payload.delivery_area || "").toLowerCase();
  const frequency = String(payload.deliveryFrequency || payload.delivery_frequency || "").toLowerCase();
  const role = String(payload.contactRole || "").toLowerCase();
  const scale = String(payload.purchaseScale || payload.purchase_scale || "").toLowerCase();
  const hasList = String(payload.hasBuyingList || "").toLowerCase();
  const message = String(payload.message || "").toLowerCase();
  const company = String(payload.company || "").trim();
  const needBy = String(payload.needBy || payload.need_by || "").trim();
  let score = 0;
  const servedArea = /(biên hòa|bien hoa|tam hiệp|tam hiep|long bình|long binh|amata|tam phước|tam phuoc|giang điền|giang dien|long thành|long thanh|nhơn trạch|nhon trach|an phước|an phuoc)/.test(area);
  if (servedArea) score += 3;
  if (/(hằng ngày|hang ngay|2–3|2-3|nhiều lần|nhieu lan)/.test(frequency)) score += 3;
  if (hasList === "có" || hasList === "co" || payload.attachmentName) score += 2;
  if (needBy) score += 2;
  if (/(chủ|giám đốc|thu mua|cung ứng|quản lý bếp|canteen|owner|director|procurement|manager)/.test(role)) score += 2;
  if (/(200–499|500–999|1.000\+|200-499|500-999|1000\+)/.test(scale)) score += 1;
  const retail = /(mua lẻ|mua le|hộ gia đình|ho gia dinh|1kg|2kg)/.test(message) || !company;
  if (retail) score -= 3;
  if (area && !servedArea) score -= 2;
  const priceOnly = /(chỉ hỏi giá|chi hoi gia|xin giá|xin gia)$/.test(message.trim());
  if (priceOnly) score -= 2;
  const reasons = [];
  if (retail) reasons.push("Bán lẻ/không xác định tổ chức");
  if (area && !servedArea) reasons.push("Ngoài 2 cụm chạy tháng 1");
  if (priceOnly) reasons.push("Chỉ hỏi giá, chưa có nhu cầu rõ");
  return { score: score, quality: score >= 7 && !retail ? "Qualified" : "Needs review", reason: reasons.join("; ") };
}
// ─── SHEET MANAGEMENT ─────────────────────────────────────────────

function getOrCreateLeadsSheet() {
  const ss    = getTargetSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  ensureLeadHeaders(sheet);
  return sheet;
}

/**
 * Đảm bảo header row đúng — không xóa dữ liệu cũ,
 * chỉ thêm cột mới vào cuối nếu thiếu.
 */
function ensureLeadHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    if (sheet.getMaxColumns() < LEAD_HEADERS.length) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), LEAD_HEADERS.length - sheet.getMaxColumns());
    }
    sheet.getRange(1, 1, 1, LEAD_HEADERS.length).setValues([LEAD_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }

  const lastCol       = Math.max(sheet.getLastColumn(), 1);
  let existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function(h) { return String(h || "").trim(); });

  if (!existingHeaders[0]) {
    sheet.getRange(1, 1, 1, LEAD_HEADERS.length).setValues([LEAD_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }

  LEAD_HEADERS.forEach(function(header) {
    if (existingHeaders.indexOf(header) === -1) {
      sheet.insertColumnAfter(sheet.getLastColumn());
      sheet.getRange(1, sheet.getLastColumn()).setValue(header);
      existingHeaders.push(header);
    }
  });

  sheet.setFrozenRows(1);
}

/**
 * Ghi dữ liệu theo TÊN CỘT — tránh lệch cột khi thêm/đổi header.
 */
function appendLeadByHeaders(sheet, leadObject) {
  ensureLeadHeaders(sheet);
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(h) { return String(h || "").trim(); });

  const row = headers.map(function(header) {
    return leadObject[header] !== undefined ? leadObject[header] : "";
  });

  sheet.appendRow(row);
  return sheet.getLastRow();
}

// ─── RESET (chỉ chạy khi muốn xóa toàn bộ) ───────────────────────

function resetLeadsSheet() {
  const ss    = getTargetSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sheet.clear();
  if (sheet.getMaxColumns() < LEAD_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), LEAD_HEADERS.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, LEAD_HEADERS.length).setValues([LEAD_HEADERS]);
  sheet.setFrozenRows(1);
  return "Reset sheet " + SHEET_NAME + " with " + LEAD_HEADERS.length + " headers.";
}

// ─── EMAIL HELPER ──────────────────────────────────────────────────

function buildEmailHtml(leadObject, selectedItems, extraFields) {
  const fields = [
    ["Thời gian",          leadObject["Submitted At"]],
    ["Vai trò",            leadObject["Vai trò"]],
    ["Loại form",          leadObject["Loại form"]],
    ["Kênh",               leadObject["Kênh"]],
    ["Họ tên",             leadObject["Name"]],
    ["Số điện thoại",      leadObject["Phone"]],
    ["Email",              leadObject["Email"]],
    ["Công ty",            leadObject["Company"]],
    ["Loại hình đơn vị",   leadObject["Facility Type"]],
    ["Nhóm hàng quan tâm", leadObject["Interested In"]],
    ["Quy mô nhu cầu",     leadObject["Purchase Scale"]],
    ["Tần suất giao",      leadObject["Delivery Frequency"]],
    ["Khu vực giao",       leadObject["Delivery Area"]],
    ["Cần phản hồi trước", leadObject["Need By"]],
    ["Sản phẩm đã chọn",   selectedItems || "Không có"],
    ["Nội dung",           String(leadObject["Message"] || "").replace(/\n/g, "<br>")],
    ["Nguồn",              leadObject["Source"]],
  ].concat(extraFields || []);

  return fields.map(function(f) {
    return "<p><b>" + f[0] + ":</b> " + (f[1] || "") + "</p>";
  }).join("");
}

function sendLeadEmail(subject, body) {
  try {
    MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: subject, htmlBody: body });
  } catch (err) {
    console.error("Email error:", err);
  }
}

// ─── GET — Đọc leads cho PWA Admin sync ───────────────────────────

function doGet(e) {
  try {
    const ss    = getTargetSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const rows  = sheet.getDataRange().getValues();

    if (!rows || rows.length === 0) return jsonResponse([]);

    const headers = rows[0].map(function(h) { return h.toString().trim(); });
    const data = rows.slice(1)
      .map(function(row) {
        const obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i]; });
        return obj;
      })
      .filter(function(r) { return r["Name"] || r["Phone"]; });

    return jsonResponse(data);
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// ─── POST — Nhận diện & xử lý 3 loại request ─────────────────────

function doPost(e) {
  try {
    const raw     = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    const payload = JSON.parse(raw);

    // ═══════════════════════════════════════════════════════════════
    // CASE A: ADMIN ACTION (add / delete / update_status)
    // ═══════════════════════════════════════════════════════════════
    if (payload.action) {
      return handleAdminAction(payload.action, payload.data || {});
    }

    // ═══════════════════════════════════════════════════════════════
    // CASE B & C: LEAD MỚI — xây dựng leadObject thống nhất
    // Nhận diện Zalo vs Website qua isZaloMiniAppLead()
    // ═══════════════════════════════════════════════════════════════
    const isZalo        = isZaloMiniAppLead(payload);
    const selectedItems = buildSelectedItemsText(payload);

    const scoring = scoreLead(payload);

    const leadObject = {
      "Submitted At":       payload.submittedAt || new Date().toISOString(),
      "Vai trò":            payload.vaiTro || payload.role || (isZalo ? "Người mua" : ""),
      "Loại form":          payload.loaiForm || payload.formType || (isZalo ? "Zalo Mini App - Báo giá" : ""),
      "Kênh":               payload.kenh || payload.channel || (isZalo ? "Zalo Mini App" : "Website"),
      "Name":               payload.name || payload.zaloDisplayName || "",
      "Phone":              payload.phone || "",
      "Email":              payload.email || "",
      "Company":            payload.company || "",
      "Facility Type":      payload.facilityType || payload.facility_type || "",
      "Interested In":      normalizeArray(payload.interestedIn || payload.interested_in),
      "Purchase Scale":     payload.purchaseScale || payload.purchase_scale || "",
      "Delivery Frequency": payload.deliveryFrequency || payload.delivery_frequency || "",
      "Delivery Area":      payload.deliveryArea || payload.delivery_area || "",
      "Need By":            payload.needBy || payload.need_by || "",
      "Message":            payload.message || "",
      "Selected Items":     selectedItems,
      "Selected Count":     payload.selectedCount || payload.selected_count || 0,
      "Source":             payload.source || (isZalo ? "zalo_mini_app" : ""),
      "Giỏ hàng":           buildCartJson(payload),
      "Trạng thái xử lý":  "Mới",
      // Zalo-only fields
      "Zalo User ID":       isZalo ? (payload.zaloUserId       || "") : "",
      "Zalo Display Name":  isZalo ? (payload.zaloDisplayName  || "") : "",
      "Zalo Avatar":        isZalo ? (payload.zaloAvatar        || "") : "",
      "Zalo Phone Token":   isZalo ? (payload.zaloPhoneToken    || "") : "",
      "Zalo Follow OA":     isZalo ? normalizeBoolean(payload.zaloFollowOA) : "",
      "Mini App Source":    isZalo ? (payload.miniAppSource     || "quote_form") : "",
      "Contact Role":       payload.contactRole || "",
      "Has Buying List":    payload.hasBuyingList || (payload.attachmentName ? "Có" : ""),
      "Consent":            normalizeBoolean(payload.consent),
      "UTM Source":         payload.utmSource || "",
      "UTM Medium":         payload.utmMedium || "",
      "UTM Campaign":       payload.utmCampaign || "",
      "UTM Content":        payload.utmContent || "",
      "UTM Term":           payload.utmTerm || "",
      "FBCLID":             payload.fbclid || "",
      "Lead Score":         scoring.score,
      "Lead Quality":       scoring.quality,
      "Disqualification Reason": scoring.reason
    };

    const sheet = getOrCreateLeadsSheet();
    const row   = appendLeadByHeaders(sheet, leadObject);

    // Email thông báo
    const extraFields = isZalo ? [
      ["Tên Zalo",       leadObject["Zalo Display Name"]],
      ["Zalo User ID",   leadObject["Zalo User ID"]],
      ["Mini App Source",leadObject["Mini App Source"]],
      ["Dòng Sheet",     row]
    ] : [["Dòng Sheet",  row]];

    const source  = isZalo ? "Zalo Mini App" : "website";
    const subject = "Lead mới từ " + source + " TPS1 — " + (leadObject["Name"] || "Khách hàng mới");
    const html    = "<h2>Có lead báo giá mới từ " + source + " TPS1</h2>"
                  + buildEmailHtml(leadObject, selectedItems, extraFields);

    sendLeadEmail(subject, html);

    return jsonResponse({
      ok:        true,
      status:    "success",
      source:    isZalo ? "zalo_mini_app" : "website",
      sheetName: sheet.getName(),
      row:       row,
      message:   "Đã ghi lead từ " + source + "."
    });

  } catch (err) {
    console.error("doPost error:", err);
    return jsonResponse({ ok: false, status: "error", message: err.toString() });
  }
}

// ─── ADMIN ACTION HANDLER ─────────────────────────────────────────

function handleAdminAction(action, data) {
  try {
    const ss    = getTargetSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const rows  = sheet.getDataRange().getValues();
    const headers = rows[0].map(function(h) { return h.toString().trim().toLowerCase(); });

    // Helper tìm index cột linh hoạt
    function colOf() {
      const candidates = Array.prototype.slice.call(arguments);
      for (let i = 0; i < candidates.length; i++) {
        const idx = headers.indexOf(candidates[i]);
        if (idx !== -1) return idx;
      }
      return -1;
    }

    const phoneIdx  = colOf("phone", "số điện thoại", "sđt");
    const nameIdx   = colOf("name", "họ tên", "họ và tên");
    const emailIdx  = colOf("email");
    const sourceIdx = colOf("source", "nguồn", "kênh nguồn", "kênh");
    const statusIdx = colOf("trạng thái xử lý", "trạng thái", "status");
    const noteIdx   = colOf("ghi chú", "note");

    // ── add ──────────────────────────────────────────────────────
    if (action === "add") {
      const catMap = {
        wholesale_restaurant: "Khách sỉ - Nhà hàng",
        wholesale_agency:     "Khách sỉ - Đại lý",
        retail_vip:           "Khách lẻ - VIP",
      };
      const priMap = { high: "Cao", low: "Thấp" };
      const catIdx = colOf("nhóm khách hàng", "nhóm", "phân loại");
      const priIdx = colOf("mức ưu tiên", "ưu tiên");
      const timeIdx = colOf("submitted at", "thời gian", "thời gian tạo");

      const maxCols = Math.max(sheet.getLastColumn(), LEAD_HEADERS.length);
      const newRow  = new Array(maxCols).fill("");
      if (nameIdx   >= 0) newRow[nameIdx]   = data.name   || "";
      if (phoneIdx  >= 0) newRow[phoneIdx]  = data.phone  || "";
      if (emailIdx  >= 0) newRow[emailIdx]  = data.email  || "";
      if (sourceIdx >= 0) newRow[sourceIdx] = data.source || "";
      if (catIdx    >= 0) newRow[catIdx]    = catMap[data.category] || "Khách lẻ - Thường";
      if (priIdx    >= 0) newRow[priIdx]    = priMap[data.priority] || "Trung bình";
      if (timeIdx   >= 0) newRow[timeIdx]   = data.createdAt || new Date().toISOString();
      if (statusIdx >= 0) newRow[statusIdx] = data.status || "new";
      
      if (noteIdx   >= 0 && data.notes && data.notes.length > 0) {
        newRow[noteIdx] = data.notes[0].text || "";
      }
      sheet.appendRow(newRow);
      return jsonResponse({ status: "success", message: "Đã thêm lead." });
    }

    // ── delete ────────────────────────────────────────────────────
    if (action === "delete") {
      const targetPhone = (data.phone || "").toString().replace(/[^0-9+]/g, "");
      let deleted = 0;
      for (let i = rows.length - 1; i >= 1; i--) {
        const rowPhone = (rows[i][phoneIdx] || "").toString().replace(/[^0-9+]/g, "");
        if (rowPhone === targetPhone) { sheet.deleteRow(i + 1); deleted++; }
      }
      return jsonResponse({ status: "success", message: "Đã xóa " + deleted + " dòng." });
    }

    // ── update_status (từ PWA Admin) ──────────────────────────────
    if (action === "update_status") {
      if (!data.phone) return jsonResponse({ ok: false, error: "Thiếu phone" });
      const targetPhone = data.phone.toString().replace(/[^0-9+]/g, "");
      for (let i = 1; i < rows.length; i++) {
        const rowPhone = (rows[i][phoneIdx] || "").toString().replace(/[^0-9+]/g, "");
        if (rowPhone === targetPhone) {
          if (statusIdx >= 0 && data.status) {
            sheet.getRange(i + 1, statusIdx + 1).setValue(data.status);
          }
          if (noteIdx >= 0 && data.note) {
            const existing = sheet.getRange(i + 1, noteIdx + 1).getValue() || "";
            const ts       = new Date().toLocaleString("vi-VN");
            sheet.getRange(i + 1, noteIdx + 1)
              .setValue(existing + (existing ? "\n" : "") + "[" + ts + "] " + data.note);
          }
          return jsonResponse({ ok: true, updatedRow: i + 1 });
        }
      }
      return jsonResponse({ ok: false, error: "Không tìm thấy lead với SĐT: " + data.phone });
    }

    return jsonResponse({ ok: false, error: "Unknown action: " + action });

  } catch (err) {
    return jsonResponse({ ok: false, status: "error", message: err.toString() });
  }
}
