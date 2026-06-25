import fs from 'fs';

// Mock browser environment
global.window = {
  state: { quotes: [] },
  normalizeLeadStatus: (s) => s,
  quoteModule: {
    renderSavedQuotesList: () => {}
  }
};
global.localStorage = {
  setItem: () => {}
};
global.ensureReady = () => true;

// Mock upsertQuote
global.upsertQuote = async (quoteRecord, leadSnapshot, previousStatus) => {
  console.log("Called upsertQuote with:", {
    quoteRecord, leadSnapshot, previousStatus
  });
  return { ok: true };
};

// We need to extract syncLeadStatus and syncQuote
const supabaseCode = fs.readFileSync('d:\\quanly_admin_vanilla\\js\\supabase.js', 'utf8');

// Use a simple trick to evaluate it in this context
// We'll mock the module export since it's an IIFE that assigns to window.supabaseModule
const wrapper = `
  ${supabaseCode}
  return window.supabaseModule;
`;

const supabaseModule = new Function(wrapper)();

async function runTest() {
  const mockLead = {
    id: "lead_123",
    name: "Test Zalo User",
    phone: "0912345678",
    status: "new",
    message: "Mã đơn: DH123456\\nTổng tiền: 482.160đ",
    selectedItems: "Ba rọi rút sườn x1 | Ba rọi có xương x1"
  };

  console.log("Calling syncLeadStatus...");
  await supabaseModule.syncLeadStatus(mockLead, "new", "won", "Chuyển trạng thái test");
  
  console.log("window.state.quotes after sync:", window.state.quotes);
}

runTest().catch(console.error);
