const SHEET_NAME = "Leads";

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
      "Delivery Area",
      "Need By",
      "Message",
      "Selected Items",
      "Selected Count",
      "Source",
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
    data.deliveryArea || "",
    data.needBy || "",
    data.message || "",
    selectedItems,
    data.selectedCount || 0,
    data.source || "",
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      sheetName: sheet.getName(),
      row: sheet.getLastRow(),
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}
