(function() {
  const STORAGE_KEY = 'tps1_supabase_config';
  const STATUS_KEY = 'tps1_supabase_status';
  const DEFAULT_CONFIG = {
    url: 'https://yntgxollwjemyidizhnn.supabase.co',
    anonKey: '',
    enabled: false
  };

  let client = null;
  let config = loadConfig();

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch (err) {
      console.warn('Không đọc được cấu hình Supabase:', err);
      return { ...DEFAULT_CONFIG };
    }
  }

  function saveConfig(nextConfig) {
    config = {
      ...config,
      ...nextConfig
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    refreshSettingsForm();
    initClient();
    return config;
  }

  function initClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      client = null;
      updateStatus('missing-sdk');
      return client;
    }

    if (!config.enabled || !config.url || !config.anonKey) {
      client = null;
      updateStatus('disabled');
      return client;
    }

    try {
      client = window.supabase.createClient(config.url, config.anonKey);
      updateStatus('ready');
      return client;
    } catch (err) {
      console.error('Không khởi tạo được Supabase client:', err);
      client = null;
      updateStatus('error');
      return null;
    }
  }

  function isReady() {
    return !!client;
  }

  function getConfig() {
    return { ...config };
  }

  function updateStatus(status, detail) {
    const statusMap = {
      ready: 'Đã kết nối Supabase',
      saved: 'Đã lưu cấu hình',
      disabled: 'Chưa bật Supabase',
      'missing-sdk': 'Thiếu thư viện Supabase',
      error: 'Lỗi kết nối Supabase'
    };

    const payload = {
      status,
      label: statusMap[status] || status,
      detail: detail || null,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STATUS_KEY, JSON.stringify(payload));

    const statusEl = document.getElementById('supabase-status-text');
    const detailEl = document.getElementById('supabase-status-detail');
    const badgeEl = document.getElementById('supabase-status-badge');

    if (statusEl) statusEl.innerText = payload.label;
    if (detailEl) detailEl.innerText = detail || '';
    if (badgeEl) {
      badgeEl.className = 'sync-badge';
      badgeEl.classList.add(status === 'ready' ? 'idle' : 'error');
    }
  }

  function refreshSettingsForm() {
    const urlInput = document.getElementById('supabase-url-input');
    const keyInput = document.getElementById('supabase-key-input');
    const enableInput = document.getElementById('supabase-enabled-input');
    if (urlInput) urlInput.value = config.url || '';
    if (keyInput) keyInput.value = config.anonKey || '';
    if (enableInput) enableInput.checked = !!config.enabled;

    const quoteCountEl = document.getElementById('supabase-quotes-count');
    if (quoteCountEl && window.state && Array.isArray(window.state.quotes)) {
      quoteCountEl.innerText = window.state.quotes.length;
    }
  }

  async function upsertQuote(quoteRecord, leadSnapshot, previousStatus) {
    if (!isReady()) return { ok: false, skipped: true };

    const payload = buildQuotePayload(quoteRecord, leadSnapshot);
    const { error } = await client
      .from('quotes')
      .upsert(payload, { onConflict: 'local_quote_id' });

    if (error) {
      updateStatus('error', error.message);
      throw error;
    }

    if ((previousStatus || '') !== (quoteRecord.status || '')) {
      await insertHistory({
        quoteRecord,
        action: 'status_change',
        fromStatus: previousStatus || null,
        toStatus: quoteRecord.status || null,
        note: 'Đồng bộ trạng thái báo giá'
      });
    }

    updateStatus('ready');
    return { ok: true };
  }

  async function insertHistory({ quoteRecord, action, fromStatus, toStatus, note, payload }) {
    if (!isReady()) return { ok: false, skipped: true };

    const historyPayload = {
      local_quote_id: quoteRecord.id,
      lead_id: quoteRecord.leadId,
      action,
      from_status: fromStatus || null,
      to_status: toStatus || null,
      note: note || null,
      payload: payload || {},
      created_at: new Date().toISOString()
    };

    const { error } = await client.from('quote_history').insert(historyPayload);
    if (error) {
      updateStatus('error', error.message);
      throw error;
    }

    updateStatus('ready');
    return { ok: true };
  }

  function buildQuotePayload(quoteRecord, leadSnapshot) {
    return {
      local_quote_id: quoteRecord.id,
      lead_id: quoteRecord.leadId,
      quote_code: quoteRecord.quoteCode || null,
      lead_name: leadSnapshot?.name || '',
      lead_phone: leadSnapshot?.phone || '',
      lead_email: leadSnapshot?.email || null,
      lead_category: leadSnapshot?.category || null,
      lead_source: leadSnapshot?.source || null,
      lead_snapshot: leadSnapshot || {},
      quote_snapshot: quoteRecord,
      price_type: quoteRecord.priceType || 'wholesale',
      status: quoteRecord.status || 'draft',
      result: quoteRecord.result || null,
      items: quoteRecord.items || [],
      subtotal: quoteRecord.subtotal || 0,
      discount_percent: quoteRecord.discount || 0,
      discount_amount: quoteRecord.discountAmount || 0,
      shipping_amount: quoteRecord.shipping || 0,
      deposit_amount: quoteRecord.deposit || 0,
      grand_total: quoteRecord.grandTotal || 0,
      balance_amount: quoteRecord.balance || 0,
      note: quoteRecord.note || null,
      created_at: quoteRecord.createdAt || new Date().toISOString(),
      updated_at: quoteRecord.updatedAt || new Date().toISOString(),
      sent_at: quoteRecord.sentAt || null,
      closed_at: quoteRecord.closedAt || null
    };
  }

  function ensureReady() {
    if (!client) initClient();
    return !!client;
  }

  async function syncQuote(quoteRecord, leadSnapshot, previousStatus) {
    try {
      if (!ensureReady()) return { ok: false, skipped: true };
      return await upsertQuote(quoteRecord, leadSnapshot, previousStatus);
    } catch (err) {
      console.error('Lỗi đồng bộ báo giá Supabase:', err);
      return { ok: false, error: err };
    }
  }

  async function syncLeadStatus(lead, fromStatus, toStatus, note) {
    try {
      if (!ensureReady()) return { ok: false, skipped: true };
      const relatedQuotes = (window.state?.quotes || []).filter(q => q.leadId === lead.id);
      const leadSnapshot = {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email || '',
        category: lead.category || '',
        source: lead.source || ''
      };

      await Promise.all(relatedQuotes.map(async (quoteRecord) => {
        const updatedQuote = {
          ...quoteRecord,
          status: toStatus,
          updatedAt: new Date().toISOString(),
          closedAt: toStatus === 'won' || toStatus === 'lost' ? new Date().toISOString() : quoteRecord.closedAt || null
        };
        await syncQuote(updatedQuote, leadSnapshot, toStatus);
        await insertHistory({
          quoteRecord: updatedQuote,
          action: 'lead_status_change',
          fromStatus,
          toStatus,
          note: note || `Lead đổi trạng thái sang ${toStatus}`
        });
      }));

      return { ok: true };
    } catch (err) {
      console.error('Lỗi syncLeadStatus Supabase:', err);
      return { ok: false, error: err };
    }
  }

  function bindSettingsForm() {
    const saveBtn = document.getElementById('supabase-save-btn');
    const testBtn = document.getElementById('supabase-test-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const url = document.getElementById('supabase-url-input')?.value.trim();
        const anonKey = document.getElementById('supabase-key-input')?.value.trim();
        const enabled = document.getElementById('supabase-enabled-input')?.checked;
        if (!url) {
          showToastNotification('Vui lòng nhập Supabase URL.');
          return;
        }
        if (!anonKey) {
          showToastNotification('Vui lòng nhập Supabase anon public key.');
          return;
        }
        saveConfig({ url, anonKey, enabled });
        showToastNotification('Đã lưu cấu hình Supabase.');
      });
    }

    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        if (!ensureReady()) {
          showToastNotification('Supabase chưa sẵn sàng. Hãy lưu URL và anon key trước.');
          return;
        }
        try {
          const { error } = await client.from('quotes').select('id', { count: 'exact', head: true });
          if (error) throw error;
          updateStatus('ready', 'Kiểm tra kết nối thành công');
          showToastNotification('Kết nối Supabase ổn.');
        } catch (err) {
          updateStatus('error', err.message);
          showToastNotification(`Lỗi Supabase: ${err.message}`);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    refreshSettingsForm();
    bindSettingsForm();
    initClient();
    refreshSettingsForm();
  });

  window.supabaseModule = {
    getConfig,
    saveConfig,
    initClient,
    isReady,
    syncQuote,
    syncLeadStatus,
    insertHistory,
    refreshSettingsForm,
    updateStatus
  };
})();
