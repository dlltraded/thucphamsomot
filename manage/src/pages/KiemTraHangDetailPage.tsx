import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Save,
  Send,
  UserCheck,
  RefreshCw,
  History,
  Calendar,
  Phone,
  MapPin,
  Building,
} from 'lucide-react';

interface ReviewDetail {
  id: string;
  order_id: string;
  version: number;
  status: string;
  requested_by: string;
  assigned_to: string | null;
  accepted_at: string | null;
  responded_at: string | null;
  operation_accepted_at: string | null;
  note: string | null;
  created_at: string;
  orders?: {
    id: string;
    order_code: string;
    delivery_date: string;
    delivery_shift: string;
    delivery_name: string;
    delivery_phone: string;
    delivery_address: string;
    customer_name: string;
    customer_company: string;
    customer_phone: string;
    status: string;
  };
  requested_by_profile?: { full_name: string; email: string };
  assigned_to_profile?: { full_name: string; email: string } | null;
  items: Array<{
    id: string;
    order_item_id: string;
    result_status: string;
    requested_qty: number;
    available_qty: number;
    shortage_qty: number;
    proposed_product_id?: string | null;
    proposed_price?: number | null;
    expected_at?: string | null;
    note?: string | null;
    order_item?: {
      product_name: string;
      sku: string;
      unit: string;
      quantity: number;
      unit_price: number;
    };
    proposed_product?: {
      sku: string;
      name: string;
    } | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    reason: string | null;
    created_at: string;
    actor?: { full_name: string; role: string } | null;
  }>;
}

export default function KiemTraHangDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [itemsState, setItemsState] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'exception' | 'pending'>('all');
  const [showAudit, setShowAudit] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/procurement/reviews/${id}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Không thể tải chi tiết yêu cầu');
      }
      setReview(data.data);
      setItemsState(
        (data.data.items || []).map((item: any) => ({
          ...item,
          available_qty: Number(item.available_qty || 0),
          requested_qty: Number(item.requested_qty || 0),
          shortage_qty: Math.max(0, Number(item.requested_qty || 0) - Number(item.available_qty || 0)),
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleItemChange = (itemId: string, field: string, value: any) => {
    setItemsState((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const updated = { ...it, [field]: value };
        if (field === 'available_qty') {
          const avail = Math.max(0, Number(value) || 0);
          updated.available_qty = avail;
          updated.shortage_qty = Math.max(0, it.requested_qty - avail);
          if (avail >= it.requested_qty) {
            updated.result_status = 'available';
          } else if (avail > 0) {
            updated.result_status = 'partial';
          }
        }
        if (field === 'result_status' && value === 'available') {
          updated.available_qty = it.requested_qty;
          updated.shortage_qty = 0;
        }
        return updated;
      })
    );
  };

  const handleMarkAllAvailable = () => {
    setItemsState((prev) =>
      prev.map((it) => ({
        ...it,
        result_status: 'available',
        available_qty: it.requested_qty,
        shortage_qty: 0,
      }))
    );
  };

  const handleClaim = async () => {
    if (!id) return;
    setClaimLoading(true);
    try {
      const res = await fetch(`/api/admin/procurement/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Tiếp nhận thất bại');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setClaimLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!id) return;
    setSavingDraft(true);
    try {
      const itemsPayload = itemsState.map((it) => ({
        id: it.id,
        result_status: it.result_status,
        available_qty: Number(it.available_qty || 0),
        proposed_product_id: it.proposed_product_id || null,
        proposed_price: it.proposed_price != null ? Number(it.proposed_price) : null,
        expected_at: it.expected_at || null,
        note: it.note || null,
      }));

      const res = await fetch(`/api/admin/procurement/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_draft', items: itemsPayload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Lưu nháp thất bại');
      alert('Đã lưu nháp thành công!');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    // Kiểm tra dòng pending
    const hasPending = itemsState.some((it) => it.result_status === 'pending');
    if (hasPending) {
      alert('Vui lòng kiểm tra và chọn kết quả cho toàn bộ mặt hàng trước khi gửi cho Vận hành!');
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload = itemsState.map((it) => ({
        id: it.id,
        result_status: it.result_status,
        available_qty: Number(it.available_qty || 0),
        proposed_product_id: it.proposed_product_id || null,
        proposed_price: it.proposed_price != null ? Number(it.proposed_price) : null,
        expected_at: it.expected_at || null,
        note: it.note || null,
      }));

      const res = await fetch(`/api/admin/procurement/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', items: itemsPayload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Gửi kết quả thất bại');
      alert('Đã gửi kết quả cho Vận hành thành công!');
      navigate('/kiem-tra-hang');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50">
        <RefreshCw className="animate-spin text-teal-600" size={32} />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="p-8 text-center text-rose-600">
        <p>{error || 'Không tìm thấy yêu cầu'}</p>
        <button
          onClick={() => navigate('/kiem-tra-hang')}
          className="mt-4 px-4 py-2 bg-slate-200 text-slate-800 rounded-lg"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const order = review.orders;
  const isEditable = ['in_review', 'needs_revision'].includes(review.status);

  // Bộ lọc danh sách mặt hàng
  const filteredItems = itemsState.filter((it) => {
    if (filterType === 'pending') return it.result_status === 'pending';
    if (filterType === 'exception') {
      return (
        it.shortage_qty > 0 ||
        ['partial', 'out_of_stock', 'need_purchase', 'substitution_proposed', 'price_pending'].includes(
          it.result_status
        )
      );
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-screen p-4 md:p-6 lg:p-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => navigate('/kiem-tra-hang')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50"
          >
            <History size={16} /> Lịch sử kiểm tra ({review.auditLogs?.length || 0})
          </button>
        </div>
      </div>

      {/* Warning/Revision Banner */}
      {review.status === 'needs_revision' && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-semibold text-rose-900">Vận hành yêu cầu kiểm tra lại</h4>
            <p className="text-sm text-rose-700 mt-0.5">{review.note || 'Không có ghi chú cụ thể'}</p>
          </div>
        </div>
      )}

      {/* Order & Header Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Đơn hàng #{order?.order_code || '---'}
              </h2>
              <span className="text-xs bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                Phiên kiểm tra v{review.version}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                {review.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Yêu cầu tạo lúc: {new Date(review.created_at).toLocaleString('vi-VN')} bởi {review.requested_by_profile?.full_name || 'Vận hành'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {review.status === 'pending_acceptance' && (
              <button
                onClick={handleClaim}
                disabled={claimLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                <UserCheck size={16} />
                <span>{claimLoading ? 'Đang tiếp nhận...' : 'Tiếp nhận kiểm tra'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs text-slate-600">
          <div className="space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
              <Building size={14} className="text-slate-400" />
              {order?.customer_name || 'Khách lẻ'}
            </div>
            {order?.customer_company && <div>Công ty: {order.customer_company}</div>}
            <div className="flex items-center gap-1 text-slate-500">
              <Phone size={12} /> {order?.customer_phone || '---'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
              <Calendar size={14} className="text-slate-400" />
              Ngày giao: {order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('vi-VN') : '---'}
            </div>
            <div>Ca giao: {order?.delivery_shift || 'Tiêu chuẩn'}</div>
            <div className="text-slate-500">Người nhận: {order?.delivery_name || order?.customer_name}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <MapPin size={14} className="text-slate-400 shrink-0" />
              <span className="truncate">{order?.delivery_address || 'Giao tại kho'}</span>
            </div>
            <div className="text-slate-500">
              Người Thu mua phụ trách: <span className="font-medium text-slate-800">{review.assigned_to_profile?.full_name || 'Chưa nhận'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Review Workspace */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        {/* Workspace Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lọc hiển thị:</span>
            {(['all', 'exception', 'pending'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterType === t
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t === 'all' ? 'Tất cả' : t === 'exception' ? 'Chỉ dòng thiếu/ngoại lệ' : 'Chờ kết luận'}
              </button>
            ))}
          </div>

          {isEditable && (
            <button
              onClick={handleMarkAllAvailable}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100"
            >
              <CheckCircle2 size={14} />
              <span>Đánh dấu tất cả đủ hàng</span>
            </button>
          )}
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">STT</th>
                <th className="py-3 px-4">Sản phẩm</th>
                <th className="py-3 px-4 text-center">ĐVT</th>
                <th className="py-3 px-4 text-center">Khách đặt</th>
                <th className="py-3 px-4 text-center">Đáp ứng</th>
                <th className="py-3 px-4 text-center">Thiếu</th>
                <th className="py-3 px-4">Kết quả Thu mua</th>
                <th className="py-3 px-4">Đề xuất / Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredItems.map((item, idx) => {
                const oi = item.order_item;
                const isShortage = Number(item.shortage_qty) > 0;

                return (
                  <tr key={item.id} className={isShortage ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}>
                    <td className="py-3 px-4 text-xs text-slate-400 font-mono">{idx + 1}</td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{oi?.product_name || '---'}</div>
                      <div className="text-xs text-slate-400 font-mono">SKU: {oi?.sku || '---'}</div>
                    </td>

                    <td className="py-3 px-4 text-center text-xs text-slate-600 font-medium">
                      {oi?.unit || 'Kg'}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {item.requested_qty}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isEditable ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={item.requested_qty}
                          value={item.available_qty}
                          onChange={(e) => handleItemChange(item.id, 'available_qty', e.target.value)}
                          className="w-20 px-2 py-1 text-center font-bold text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                        />
                      ) : (
                        <span className="font-bold text-slate-900">{item.available_qty}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold ${isShortage ? 'text-rose-600' : 'text-slate-400'}`}>
                        {item.shortage_qty}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {isEditable ? (
                        <select
                          value={item.result_status}
                          onChange={(e) => handleItemChange(item.id, 'result_status', e.target.value)}
                          className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 bg-white"
                        >
                          <option value="pending">-- Chưa kiểm tra --</option>
                          <option value="available">Đủ hàng</option>
                          <option value="partial">Thiếu một phần</option>
                          <option value="need_purchase">Cần mua thêm</option>
                          <option value="out_of_stock">Hết hàng</option>
                          <option value="substitution_proposed">Đề xuất đổi SP</option>
                          <option value="price_pending">Chờ giá</option>
                          <option value="price_proposed">Đề xuất giá</option>
                        </select>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.result_status}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 space-y-1.5">
                      {item.result_status === 'substitution_proposed' && (
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Mã SP / Tên thay thế..."
                            value={item.proposed_product?.name || ''}
                            disabled={!isEditable}
                            className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                          />
                          <input
                            type="number"
                            placeholder="Giá đề xuất..."
                            value={item.proposed_price || ''}
                            disabled={!isEditable}
                            onChange={(e) => handleItemChange(item.id, 'proposed_price', e.target.value)}
                            className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                          />
                        </div>
                      )}

                      <input
                        type="text"
                        placeholder="Ghi chú (NCC, giờ giao...)"
                        value={item.note || ''}
                        disabled={!isEditable}
                        onChange={(e) => handleItemChange(item.id, 'note', e.target.value)}
                        className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:border-slate-400"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        {isEditable && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft || submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 shadow-sm disabled:opacity-50"
            >
              <Save size={16} />
              <span>{savingDraft ? 'Đang lưu...' : 'Lưu nháp'}</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting || savingDraft}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              <Send size={16} />
              <span>{submitting ? 'Đang gửi...' : 'Gửi kết quả cho Vận hành'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Audit History Drawer / Section */}
      {showAudit && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <History size={16} className="text-teal-600" /> Lịch sử thay đổi &amp; Audit Log
          </h3>
          <div className="space-y-3">
            {(review.auditLogs || []).map((log) => (
              <div key={log.id} className="text-xs p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">{log.action}</span>
                  <span>{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                </div>
                <div className="text-slate-800">
                  Thực hiện bởi: <span className="font-medium">{log.actor?.full_name || 'Hệ thống'}</span> ({log.actor?.role || 'System'})
                </div>
                {log.reason && <div className="text-slate-600 mt-1 italic">Lý do: &quot;{log.reason}&quot;</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
