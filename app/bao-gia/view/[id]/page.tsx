import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface QuoteItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
}

interface QuoteData {
  id: string;
  local_quote_id: string;
  quote_code: string | null;
  lead_name: string;
  lead_phone: string;
  lead_email: string | null;
  created_at: string;
  items: QuoteItem[];
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  discount_amount: number;
  shipping_amount: number;
  grand_total: number;
  note: string | null;
}

export const dynamic = 'force-dynamic';

async function getQuote(id: string): Promise<QuoteData | null> {
  const supabaseUrl = process.env.SUPABASE_PRODUCTS_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_PRODUCTS_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) return null;

  try {
    // Thử truy vấn theo id (UUID) hoặc local_quote_id (Mã báo giá)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const queryParam = isUuid ? `id=eq.${id}` : `local_quote_id=eq.${id}`;

    const res = await fetch(`${supabaseUrl}/rest/v1/quotes?${queryParam}`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data && data.length > 0 ? (data[0] as QuoteData) : null;
  } catch (err) {
    console.error('Error fetching quote from Supabase:', err);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const quote = await getQuote(id);
  return {
    title: quote ? `Báo giá sỉ ${quote.quote_code || quote.local_quote_id} - TPS1` : 'Báo giá thực phẩm - TPS1',
    description: 'Báo giá sỉ thực phẩm tươi sống, rau củ quả cho nhà hàng, bếp ăn công nghiệp từ Thực Phẩm Số Một.',
    robots: { index: false, follow: false },
  };
}

export default async function ViewQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) {
    notFound();
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 md:px-6 print:bg-white print:py-0 print:px-0">
      {/* Top Banner / Actions (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors">
          ← Quay lại trang chủ
        </Link>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            🖨️ In báo giá / Tải PDF
          </button>
        </div>
      </div>

      {/* Quote Container */}
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-0 print:rounded-none">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 border-b border-slate-100 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">1</span>
              <span className="text-xl font-bold text-emerald-800">Thực Phẩm Số Một</span>
            </div>
            <p className="text-sm text-slate-500 font-medium max-w-sm leading-relaxed">
              Công Ty TNHH Thực Phẩm Số Một Đồng Nai<br />
              Chuyên cung cấp thực phẩm sỉ sll cho bếp ăn công nghiệp, KCN, trường học, bệnh viện.
            </p>
          </div>
          <div className="md:text-right">
            <h1 className="text-2xl font-bold text-slate-800 mb-2 uppercase">Báo Giá Sỉ</h1>
            <div className="text-sm text-slate-500 space-y-1 font-medium">
              <div>Mã: <strong className="text-slate-800">{quote.quote_code || quote.local_quote_id}</strong></div>
              <div>Ngày tạo: <strong>{new Date(quote.created_at).toLocaleDateString('vi-VN')}</strong></div>
              <div>Hotline hỗ trợ: <strong className="text-emerald-700">089 890 2222</strong></div>
            </div>
          </div>
        </div>

        {/* Customer & Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-slate-100 text-sm">
          <div>
            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-3">Đơn vị nhận báo giá:</h3>
            <div className="font-semibold text-slate-800 text-base mb-1">{quote.lead_name}</div>
            <div className="text-slate-500 font-medium space-y-1">
              <div>SĐT: <strong>{quote.lead_phone}</strong></div>
              {quote.lead_email && <div>Email: <strong>{quote.lead_email}</strong></div>}
            </div>
          </div>
          <div className="md:text-right">
            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-3">Thông tin nhà cung cấp:</h3>
            <div className="font-semibold text-slate-800 text-base mb-1">Thực Phẩm Số Một Đồng Nai</div>
            <div className="text-slate-500 font-medium space-y-1">
              <div>Hotline/Zalo: <strong>089 890 2222</strong></div>
              <div>Website: <strong>thucphamsomot.vn</strong></div>
              <div>Địa chỉ: Biên Hòa, Đồng Nai, Việt Nam</div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="py-8">
          <h3 className="text-slate-800 font-bold text-base mb-4">Danh mục sản phẩm báo giá:</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-xs font-bold">
                  <th className="py-3 pr-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Tên Sản Phẩm</th>
                  <th className="py-3 px-4 w-24 text-center">ĐVT</th>
                  <th className="py-3 px-4 w-28 text-center">Số Lượng</th>
                  <th className="py-3 px-4 w-32 text-right">Đơn Giá sỉ</th>
                  <th className="py-3 pl-4 w-36 text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {quote.items && quote.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 print:hover:bg-transparent transition-colors">
                    <td className="py-3 pr-4 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                    <td className="py-3 px-4 text-center text-slate-500 font-medium">{item.unit || 'Kg'}</td>
                    <td className="py-3 px-4 text-center font-semibold">{item.qty}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.price)}</td>
                    <td className="py-3 pl-4 text-right font-bold text-slate-900">{formatCurrency(item.qty * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculations Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-6 border-t border-slate-100 pt-8 text-sm">
          {/* Note / Terms */}
          <div className="sm:max-w-md">
            <h4 className="font-bold text-slate-700 mb-2">Ghi chú & Điều khoản giao dịch:</h4>
            <p className="text-slate-500 leading-relaxed font-medium">
              {quote.note || 'Báo giá có giá trị áp dụng từ ngày ban hành. Giá sỉ có thể biến động theo thời giá thị trường. Vui lòng liên hệ trực tiếp sales để thỏa thuận về tần suất giao hàng và hạn mức công nợ.'}
            </p>
          </div>

          {/* Pricing Breakdown */}
          <div className="w-full sm:w-80 space-y-3 font-medium">
            <div className="flex justify-between text-slate-500">
              <span>Tạm tính:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(quote.subtotal)}</span>
            </div>
            {quote.discount_amount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Chiết khấu:</span>
                <span className="font-semibold">-{formatCurrency(quote.discount_amount)}</span>
              </div>
            )}
            {quote.shipping_amount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Phí vận chuyển:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(quote.shipping_amount)}</span>
              </div>
            )}
            {quote.vat_amount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Thuế VAT ({quote.vat_rate}%):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(quote.vat_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base border-t border-slate-100 pt-3 text-slate-900 font-bold">
              <span>Tổng thanh toán:</span>
              <span className="text-emerald-700 text-lg">{formatCurrency(quote.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="mt-16 grid grid-cols-2 gap-8 text-center text-sm border-t border-slate-100 pt-8">
          <div>
            <div className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-1">Khách Hàng</div>
            <div className="text-slate-300 h-16 flex items-center justify-center">Ký & ghi rõ họ tên</div>
          </div>
          <div>
            <div className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-1">Người Báo Giá</div>
            <div className="text-slate-300 h-16 flex items-center justify-center">Thực Phẩm Số Một</div>
          </div>
        </div>

      </div>
    </main>
  );
}
