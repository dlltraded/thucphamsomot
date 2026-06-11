// QUOTE BUILDER & INVOICE GENERATOR: THỰC PHẨM SỐ MỘT

(function() {
  // Trạng thái đơn hàng hiện tại đang soạn thảo
  let activeQuote = {
    id: null,
    leadId: '',
    priceType: 'wholesale', // wholesale hoặc retail
    items: [],
    discount: 0,
    shipping: 0,
    deposit: 0,
    note: ''
  };

  // Khởi tạo các sự kiện liên quan khi load trang
  document.addEventListener('DOMContentLoaded', () => {
    setupQuoteListeners();
  });

  function setupQuoteListeners() {
    const leadSelector = document.getElementById('quote-lead-selector');
    const productSelector = document.getElementById('quote-product-selector');
    const addItemBtn = document.getElementById('quote-add-item-btn');
    const priceWholesaleRadio = document.getElementById('price-type-wholesale');
    const priceRetailRadio = document.getElementById('price-type-retail');
    
    const discountInput = document.getElementById('quote-discount-input');
    const shippingInput = document.getElementById('quote-shipping-input');
    const depositInput = document.getElementById('quote-deposit-input');
    const noteInput = document.getElementById('quote-note-input');

    const resetBtn = document.getElementById('quote-reset-btn');
    const copyZaloBtn = document.getElementById('quote-copy-zalo-btn');
    const printBtn = document.getElementById('quote-print-btn');
    const previewContainer = document.getElementById('quote-preview-container');
    const previewPrintBtn = document.getElementById('quote-preview-print-btn');
    const previewCloseBtn = document.getElementById('quote-preview-close-btn');

    // 1. Khi chọn khách hàng
    if (leadSelector) {
      leadSelector.addEventListener('change', () => {
        const leadId = leadSelector.value;
        if (!leadId) {
          resetQuoteBuilder();
          return;
        }
        
        loadQuoteForLead(leadId);
      });
    }

    // 2. Khi thay đổi Loại giá (Sỉ/Lẻ)
    [priceWholesaleRadio, priceRetailRadio].forEach(radio => {
      if (radio) {
        radio.addEventListener('change', () => {
          activeQuote.priceType = priceWholesaleRadio.checked ? 'wholesale' : 'retail';
          // Cập nhật lại đơn giá của các mặt hàng đã chọn trong bảng
          recalculateSelectedItemsPrices();
          renderQuoteEditorTable();
          calculateTotals();
        });
      }
    });

    // 3. Thêm mặt hàng
    if (addItemBtn) {
      addItemBtn.addEventListener('click', () => {
        const prodId = productSelector.value;
        const qtyVal = parseFloat(document.getElementById('quote-qty-input').value);

        if (!prodId) {
          alert("Vui lòng chọn một mặt hàng thực phẩm!");
          return;
        }
        if (isNaN(qtyVal) || qtyVal <= 0) {
          alert("Vui lòng nhập số lượng lớn hơn 0!");
          return;
        }

        const product = state.products.find(p => p.id === prodId);
        if (!product) return;

        // Xác định đơn giá theo cấu hình sỉ/lẻ hiện tại
        const unitPrice = activeQuote.priceType === 'wholesale' ? product.price_wholesale : product.price_retail;

        // Kiểm tra xem sản phẩm đã có trong list chưa
        const existingIdx = activeQuote.items.findIndex(item => item.productId === prodId);
        if (existingIdx !== -1) {
          activeQuote.items[existingIdx].qty += qtyVal;
        } else {
          activeQuote.items.push({
            productId: prodId,
            name: product.name,
            unit: product.unit,
            price: unitPrice,
            qty: qtyVal
          });
        }

        // Reset ô nhập sản phẩm
        productSelector.value = '';
        document.getElementById('quote-qty-input').value = '';

        // Render & Tính toán lại
        renderQuoteEditorTable();
        calculateTotals();
        saveCurrentQuoteToState();
      });
    }

    // 4. Lắng nghe thay đổi chiết khấu, vận chuyển, cọc và ghi chú
    if (discountInput) {
      discountInput.addEventListener('input', () => {
        activeQuote.discount = Math.min(100, Math.max(0, parseInt(discountInput.value) || 0));
        calculateTotals();
        saveCurrentQuoteToState();
      });
    }
    if (shippingInput) {
      shippingInput.addEventListener('input', () => {
        activeQuote.shipping = Math.max(0, parseInt(shippingInput.value) || 0);
        calculateTotals();
        saveCurrentQuoteToState();
      });
    }
    if (depositInput) {
      depositInput.addEventListener('input', () => {
        activeQuote.deposit = Math.max(0, parseInt(depositInput.value) || 0);
        calculateTotals();
        saveCurrentQuoteToState();
      });
    }
    if (noteInput) {
      noteInput.addEventListener('input', () => {
        activeQuote.note = noteInput.value.trim();
        document.getElementById('inv-note-text').innerText = activeQuote.note || 'Báo giá này mang tính chất tham khảo. Xin quý khách vui lòng liên hệ nhân viên kinh doanh để xác thực thời gian giao hàng và kiểm tra tồn kho.';
        saveCurrentQuoteToState();
      });
    }

    // 5. Nút Đặt lại
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("Bạn có chắc chắn muốn đặt lại và xóa toàn bộ sản phẩm đang soạn?")) {
          resetQuoteBuilder();
        }
      });
    }

    // 6. Nút Sao chép gửi Zalo
    if (copyZaloBtn) {
      copyZaloBtn.addEventListener('click', () => {
        const lead = state.leads.find(l => l.id === activeQuote.leadId);
        if (!lead) {
          alert("Vui lòng chọn khách hàng trước khi sao chép báo giá!");
          return;
        }
        if (activeQuote.items.length === 0) {
          alert("Báo giá chưa có sản phẩm nào!");
          return;
        }

        const zaloText = generateZaloQuoteText(lead);
        navigator.clipboard.writeText(zaloText)
          .then(() => {
            showToastNotification("Đã sao chép báo giá Zalo! Bạn có thể dán (Ctrl+V) sang chat box Zalo gửi khách hàng.");
            
            // Tự động chuyển trạng thái lead sang "Đã gửi báo giá"
            if (lead.status === 'new' || lead.status === 'contacting') {
              updateLeadField(lead.id, 'status', 'quoted');
            }
          })
          .catch(err => {
            console.error('Lỗi copy clipboard:', err);
            alert('Không thể sao chép tự động. Vui lòng thử lại!');
          });
      });
    }

    // 7. Nút In hóa đơn (PDF)
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const lead = state.leads.find(l => l.id === activeQuote.leadId);
        if (!lead) {
          alert("Vui lòng chọn khách hàng trước khi in báo giá!");
          return;
        }
        if (activeQuote.items.length === 0) {
          alert("Báo giá chưa có sản phẩm nào!");
          return;
        }

        // Tự động chuyển trạng thái lead sang "Đã gửi báo giá"
        if (lead.status === 'new' || lead.status === 'contacting') {
          updateLeadField(lead.id, 'status', 'quoted');
        }

        openQuotePreview();
      });
    }

    if (previewPrintBtn) {
      previewPrintBtn.addEventListener('click', () => {
        printQuoteInvoice();
      });
    }

    if (previewCloseBtn) {
      previewCloseBtn.addEventListener('click', () => {
        closeQuotePreview();
      });
    }

    if (previewContainer) {
      previewContainer.addEventListener('click', (e) => {
        if (e.target === previewContainer) {
          closeQuotePreview();
        }
      });
    }
  }

  function openQuotePreview() {
    const previewContainer = document.getElementById('quote-preview-container');
    if (!previewContainer) return;
    previewContainer.classList.add('preview-open');
  }

  function closeQuotePreview() {
    const previewContainer = document.getElementById('quote-preview-container');
    if (!previewContainer) return;
    previewContainer.classList.remove('preview-open');
  }

  function printQuoteInvoice() {
    const invoicePaper = document.getElementById('invoice-paper');
    if (!invoicePaper) {
      alert('Không tìm thấy mẫu báo giá để in!');
      return;
    }

    const printTitle = 'TPS1-Admin - Báo giá';
    const printWindow = window.open('', '_blank', 'width=1100,height=1400');
    if (!printWindow) {
      alert('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép popup rồi thử lại.');
      return;
    }

    const printHtml = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${printTitle}</title>
  <link rel="stylesheet" href="./css/style.css?v=15">
  <style>
    @page {
      size: A4;
      margin: 14mm 12mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: var(--font-family);
    }
    .print-shell {
      width: 100%;
      box-sizing: border-box;
      padding: 0 12mm;
    }
    .invoice-paper {
      width: 100%;
      max-width: 100%;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      padding: 10mm 0 !important;
      margin: 0 !important;
      background: #fff !important;
      color: #000 !important;
    }
    .invoice-table-responsive {
      overflow: visible !important;
    }
    .invoice-header {
      margin-bottom: 16px;
    }
    .invoice-footer-notes {
      margin-bottom: 24px;
    }
    a {
      color: inherit;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="print-shell">
    ${invoicePaper.outerHTML}
  </div>
  <script>
    window.addEventListener('load', () => {
      document.title = ${JSON.stringify(printTitle)};
      setTimeout(() => {
        window.focus();
        window.print();
      }, 300);
    });
    window.addEventListener('afterprint', () => {
      window.close();
    });
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }

  // Khởi tạo tab Lên đơn báo giá
  function initQuoteBuilder() {
    const leadSelector = document.getElementById('quote-lead-selector');
    const productSelector = document.getElementById('quote-product-selector');
    if (!leadSelector) return;

    // Xóa selector khách hàng
    leadSelector.innerHTML = '<option value="">-- Chọn khách hàng --</option>';
    
    // Đổ danh sách khách hàng hoạt động (không bị thất bại)
    const activeLeads = state.leads.filter(l => l.status !== 'lost');
    activeLeads.forEach(lead => {
      const option = document.createElement('option');
      option.value = lead.id;
      option.innerText = `${lead.name} (${lead.phone})`;
      leadSelector.appendChild(option);
    });

    // Đổ danh mục sản phẩm
    productSelector.innerHTML = '<option value="">-- Chọn mặt hàng thực phẩm --</option>';
    state.products.forEach(prod => {
      const option = document.createElement('option');
      option.value = prod.id;
      option.innerText = `${prod.name} (${prod.unit})`;
      productSelector.appendChild(option);
    });

    // Reset giao diện ban đầu
    resetQuoteBuilder();
  }

  // Tải báo giá cho khách hàng cụ thể
  function loadQuoteForLead(leadId) {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;

    // Tìm kiếm xem đã có quote nào cho lead này chưa
    const existingQuote = state.quotes.find(q => q.leadId === leadId);

    if (existingQuote) {
      activeQuote = {
        id: existingQuote.id,
        leadId: existingQuote.leadId,
        priceType: existingQuote.priceType || 'wholesale',
        items: [...(existingQuote.items || [])],
        discount: existingQuote.discount || 0,
        shipping: existingQuote.shipping || 0,
        deposit: existingQuote.deposit || 0,
        note: existingQuote.note || ''
      };
    } else {
      // Tạo quote mới hoàn toàn cho lead
      activeQuote = {
        id: 'quote_' + Date.now(),
        leadId: leadId,
        // Tự động phân phối loại giá mặc định theo nhóm khách
        priceType: (lead.category === 'wholesale_restaurant' || lead.category === 'wholesale_agency') ? 'wholesale' : 'retail',
        items: [],
        discount: 0,
        shipping: 0,
        deposit: 0,
        note: ''
      };
    }

    // Đồng bộ form Editor
    document.getElementById('quote-discount-input').value = activeQuote.discount;
    document.getElementById('quote-shipping-input').value = activeQuote.shipping;
    document.getElementById('quote-deposit-input').value = activeQuote.deposit;
    document.getElementById('quote-note-input').value = activeQuote.note;
    
    if (activeQuote.priceType === 'wholesale') {
      document.getElementById('price-type-wholesale').checked = true;
    } else {
      document.getElementById('price-type-retail').checked = true;
    }

    // Đổ thông tin khách lên mẫu hóa đơn in
    document.getElementById('inv-cust-name').innerText = lead.name;
    document.getElementById('inv-cust-phone').innerText = lead.phone;
    document.getElementById('inv-cust-email').innerText = lead.email || 'Chưa cung cấp';
    
    const categoryText = {
      wholesale_restaurant: 'Sỉ - Nhà hàng/Lẩu nướng',
      wholesale_agency: 'Sỉ - Đại lý phân phối',
      retail_vip: 'Lẻ - Khách hàng VIP',
      retail_regular: 'Lẻ - Khách hàng thường'
    }[lead.category] || 'Chưa phân loại';
    document.getElementById('inv-cust-cat').innerText = categoryText;

    // Tạo mã hóa đơn báo giá và ngày
    document.getElementById('inv-code').innerText = `BG-${lead.id.replace('lead_', '')}`;
    document.getElementById('inv-date').innerText = new Date(existingQuote ? existingQuote.createdAt : Date.now()).toLocaleDateString('vi-VN');

    // Chân hóa đơn note
    document.getElementById('inv-note-text').innerText = activeQuote.note || 'Báo giá này mang tính chất tham khảo. Xin quý khách vui lòng liên hệ nhân viên kinh doanh để xác thực thời gian giao hàng và kiểm tra tồn kho.';

    // Render bảng sản phẩm & tính tiền
    renderQuoteEditorTable();
    calculateTotals();
  }

  // Đặt lại trình báo giá về rỗng
  function resetQuoteBuilder() {
    activeQuote = {
      id: null,
      leadId: '',
      priceType: 'wholesale',
      items: [],
      discount: 0,
      shipping: 0,
      deposit: 0,
      note: ''
    };

    document.getElementById('quote-lead-selector').value = '';
    document.getElementById('quote-product-selector').value = '';
    document.getElementById('quote-qty-input').value = '';
    
    document.getElementById('quote-discount-input').value = 0;
    document.getElementById('quote-shipping-input').value = 0;
    document.getElementById('quote-deposit-input').value = 0;
    document.getElementById('quote-note-input').value = '';
    document.getElementById('price-type-wholesale').checked = true;

    // Trả mẫu hóa đơn về trống
    document.getElementById('inv-cust-name').innerText = 'Chưa chọn';
    document.getElementById('inv-cust-phone').innerText = '---';
    document.getElementById('inv-cust-email').innerText = '---';
    document.getElementById('inv-cust-cat').innerText = '---';
    document.getElementById('inv-code').innerText = 'BG-2026-XXXX';
    document.getElementById('inv-date').innerText = new Date().toLocaleDateString('vi-VN');
    document.getElementById('inv-note-text').innerText = 'Báo giá này mang tính chất tham khảo. Xin quý khách vui lòng liên hệ nhân viên kinh doanh để xác thực thời gian giao hàng và kiểm tra tồn kho.';

    renderQuoteEditorTable();
    calculateTotals();
  }

  // Cập nhật lại đơn giá khi đổi nút chọn Sỉ/Lẻ
  function recalculateSelectedItemsPrices() {
    activeQuote.items.forEach(item => {
      const product = state.products.find(p => p.id === item.productId);
      if (product) {
        item.price = activeQuote.priceType === 'wholesale' ? product.price_wholesale : product.price_retail;
      }
    });
  }

  // Render bảng danh sách sản phẩm đã chọn bên khung soạn thảo
  function renderQuoteEditorTable() {
    const tbody = document.getElementById('quote-items-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (activeQuote.items.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-row-msg">
          <td colspan="5" class="text-center">Chưa chọn sản phẩm nào cho báo giá</td>
        </tr>
      `;
      return;
    }

    activeQuote.items.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Sản phẩm"><strong>${item.name}</strong></td>
        <td data-label="Đơn giá" class="text-right">${formatCurrency(item.price)}</td>
        <td data-label="Số lượng" class="text-center">
          <div class="qty-btn-group">
            <button class="btn btn-secondary btn-xs" onclick="updateItemQty(${index}, -1)" style="padding: 2px 6px;">-</button>
            <span style="font-weight:600; width:35px; text-align:center;">${item.qty}</span>
            <button class="btn btn-secondary btn-xs" onclick="updateItemQty(${index}, 1)" style="padding: 2px 6px;">+</button>
          </div>
        </td>
        <td data-label="Thành tiền" class="text-right"><strong>${formatCurrency(item.price * item.qty)}</strong></td>
        <td>
          <button class="btn-icon" onclick="deleteQuoteItem(${index})" style="color:#EF4444;">
            <i class="fa-solid fa-trash-can"></i><span class="show-mobile-inline" style="margin-left: 6px;">Xóa dòng</span>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Hàm thay đổi số lượng sản phẩm từ bảng Editor
  window.updateItemQty = function(index, delta) {
    if (activeQuote.items[index]) {
      activeQuote.items[index].qty = Math.max(0.1, activeQuote.items[index].qty + delta);
      // Đảm bảo số lượng làm tròn đẹp mắt
      activeQuote.items[index].qty = Math.round(activeQuote.items[index].qty * 100) / 100;
      
      renderQuoteEditorTable();
      calculateTotals();
      saveCurrentQuoteToState();
    }
  };

  // Hàm xóa sản phẩm khỏi bảng Editor
  window.deleteQuoteItem = function(index) {
    activeQuote.items.splice(index, 1);
    renderQuoteEditorTable();
    calculateTotals();
    saveCurrentQuoteToState();
  };

  // Tính toán tổng số tiền và render lên hóa đơn preview bên phải
  function calculateTotals() {
    // 1. Cộng tiền hàng
    const items = activeQuote.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // 2. Chiết khấu
    const discountAmt = (subtotal * activeQuote.discount) / 100;
    
    // 3. Tổng cộng thanh toán
    const grandTotal = subtotal - discountAmt + activeQuote.shipping;
    
    // 4. Tiền cọc và còn lại
    const balance = grandTotal - activeQuote.deposit;

    // Đổ số liệu lên hóa đơn in
    document.getElementById('inv-subtotal').innerText = formatCurrency(subtotal);
    document.getElementById('inv-discount').innerText = `-${formatCurrency(discountAmt)} (${activeQuote.discount}%)`;
    document.getElementById('inv-shipping').innerText = formatCurrency(activeQuote.shipping);
    document.getElementById('inv-grandtotal').innerText = formatCurrency(grandTotal);
    document.getElementById('inv-deposit').innerText = formatCurrency(activeQuote.deposit);
    document.getElementById('inv-balance').innerText = formatCurrency(balance);

    // Render bảng sản phẩm lên hóa đơn in
    const invTbody = document.getElementById('invoice-items-body');
    if (!invTbody) return;
    invTbody.innerHTML = '';

    if (activeQuote.items.length === 0) {
      invTbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="color: #94a3b8; font-style: italic; padding: 30px 0;">Vui lòng chọn sản phẩm và cấu hình để hiển thị hóa đơn</td>
        </tr>
      `;
      return;
    }

    activeQuote.items.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center">${index + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td class="text-center">${item.unit}</td>
        <td class="text-right">${formatCurrency(item.price)}</td>
        <td class="text-center">${item.qty}</td>
        <td class="text-right"><strong>${formatCurrency(item.price * item.qty)}</strong></td>
      `;
      invTbody.appendChild(tr);
    });
  }

  // Lưu báo giá đang sửa đổi vào State tổng cục và lưu LocalStorage
  function saveCurrentQuoteToState() {
    if (!activeQuote.leadId) return;

    const existingIdx = state.quotes.findIndex(q => q.leadId === activeQuote.leadId);
    
    const quoteDataToSave = {
      id: activeQuote.id,
      leadId: activeQuote.leadId,
      priceType: activeQuote.priceType,
      items: activeQuote.items,
      discount: activeQuote.discount,
      shipping: activeQuote.shipping,
      deposit: activeQuote.deposit,
      note: activeQuote.note,
      createdAt: existingIdx !== -1 ? state.quotes[existingIdx].createdAt : new Date().toISOString()
    };

    if (existingIdx !== -1) {
      state.quotes[existingIdx] = quoteDataToSave;
    } else {
      state.quotes.push(quoteDataToSave);
      // Đổ quote_id vào lead để liên kết
      const leadIdx = state.leads.findIndex(l => l.id === activeQuote.leadId);
      if (leadIdx !== -1) {
        state.leads[leadIdx].quotes = [activeQuote.id];
        saveState('leads');
      }
    }

    saveState('quotes');
  }

  // TẠO NỘI DUNG VĂN BẢN GỬI QUA ZALO
  function generateZaloQuoteText(lead) {
    const items = activeQuote.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountAmt = (subtotal * activeQuote.discount) / 100;
    const grandTotal = subtotal - discountAmt + activeQuote.shipping;
    const balance = grandTotal - activeQuote.deposit;

    let itemsLines = "";
    activeQuote.items.forEach((item, idx) => {
      itemsLines += `${idx + 1}. ${item.name}\n   -> SL: ${item.qty} ${item.unit} x Đơn giá: ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.qty)}\n`;
    });

    const quoteCode = `BG-${lead.id.replace('lead_', '')}`;

    return `*THƯƠNG HIỆU THỰC PHẨM SỐ MỘT (TPS1)*
------------------------------------
*BÁO GIÁ ĐƠN HÀNG HÀNG HÓA*
Mã báo giá: *${quoteCode}*
Ngày lập: ${new Date().toLocaleDateString('vi-VN')}

Kính gửi Quý khách hàng: *${lead.name}*
SĐT liên hệ: ${lead.phone}

*Chi tiết danh mục thực phẩm báo giá:*
${itemsLines}
------------------------------------
- *Cộng tiền hàng:* ${formatCurrency(subtotal)}
- *Chiết khấu:* -${formatCurrency(discountAmt)} (${activeQuote.discount}%)
- *Phí vận chuyển:* ${formatCurrency(activeQuote.shipping)}
- *TỔNG THANH TOÁN:* *${formatCurrency(grandTotal)}*
- *Đã tạm ứng/đặt cọc:* ${formatCurrency(activeQuote.deposit)}
- *Số tiền còn lại cần thanh toán:* *${formatCurrency(balance)}*

*Ghi chú báo giá:*
${activeQuote.note || 'Miễn phí giao hàng Biên Hòa cho đơn hàng trên 2 triệu. Vui lòng phản hồi sớm để kịp sắp xếp xe giao sáng mai.'}

*THÔNG TIN THANH TOÁN CHUYỂN KHOẢN:*
- Tên chủ tài khoản: CÔNG TY TNHH THỰC PHẨM SỐ MỘT
- Số tài khoản: 0898902222
- Ngân hàng: ACB (Á Châu)
- Nội dung CK: Chuyen khoan ${quoteCode}

Xin cảm ơn Quý khách đã tin tưởng dịch vụ sỉ lẻ của Thực phẩm số một!
Hotline hỗ trợ: 089 890 2222
Website: https://thucphamsomot.vn`;
  }

  // Định dạng tiền tệ
  function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', 'đ');
  }

  // Export module để sử dụng toàn cục
  window.quoteModule = {
    initQuoteBuilder: initQuoteBuilder,
    loadQuoteForLead: loadQuoteForLead
  };
})();
