const SHEET_NAME = "Leads";
const NOTIFY_EMAIL = "xuandinh.avg@gmail.com";

function getTargetSpreadsheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  throw new Error("Missing spreadsheet context. Set SPREADSHEET_ID in Script Properties or use a bound script.");
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents || "{}");
  const ss = getTargetSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Submitted At",
      "Name",
      "Phone",
      "Email",
      "Company",
      "Facility Type",
      "Interested In",
      "Purchase Scale",
      "Delivery Frequency",
      "Delivery Area",
      "Need By",
      "Message",
      "Selected Items",
      "Selected Count",
      "Source",
      "Raw Payload",
    ]);
  }

  const selectedItems = Array.isArray(data.selectedItems)
    ? data.selectedItems.map((item) => `${item.title} x${item.quantity ?? 1}`).join(" | ")
    : "";

  sheet.appendRow([
    data.submittedAt || new Date().toISOString(),
    data.name || "",
    data.phone || "",
    data.email || "",
    data.company || "",
    data.facilityType || "",
    data.interestedIn || "",
    data.purchaseScale || "",
    data.deliveryFrequency || "",
    data.deliveryArea || "",
    data.needBy || "",
    data.message || "",
    selectedItems,
    data.selectedCount || 0,
    data.source || "",
    JSON.stringify(data),
  ]);

  const row = sheet.getLastRow();

  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: `Lead mới từ website TPS1 - ${data.name || "Khách hàng mới"}`,
      htmlBody: `
        <h2>Có lead báo giá mới từ website TPS1</h2>
        <p><b>Thời gian:</b> ${data.submittedAt || new Date().toISOString()}</p>
        <p><b>Họ tên:</b> ${data.name || ""}</p>
        <p><b>Số điện thoại:</b> ${data.phone || ""}</p>
        <p><b>Email:</b> ${data.email || ""}</p>
        <p><b>Công ty:</b> ${data.company || ""}</p>
        <p><b>Loại hình đơn vị:</b> ${data.facilityType || ""}</p>
        <p><b>Nhóm hàng quan tâm:</b> ${data.interestedIn || ""}</p>
        <p><b>Quy mô nhu cầu:</b> ${data.purchaseScale || ""}</p>
        <p><b>Tần suất giao:</b> ${data.deliveryFrequency || ""}</p>
        <p><b>Khu vực giao:</b> ${data.deliveryArea || ""}</p>
        <p><b>Cần phản hồi trước:</b> ${data.needBy || ""}</p>
        <p><b>Sản phẩm đã chọn:</b> ${selectedItems || "Không có"}</p>
        <p><b>Nội dung:</b><br>${String(data.message || "").replace(/\n/g, "<br>")}</p>
        <hr>
        <p><b>Nguồn:</b> ${data.source || ""}</p>
        <p><b>Dòng trong Google Sheet:</b> ${row}</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send lead notification email", error);
  }

  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      sheetName: sheet.getName(),
      row,
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}
