import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Eye,
  UserCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';

interface ReviewItem {
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
  updated_at: string;
  waitingMinutes: number;
  isSlaBreached: boolean;
  itemStats: {
    totalItems: number;
    shortageItems: number;
    pendingItems: number;
  };
  orders?: {
    id: string;
    order_code: string;
    delivery_date: string;
    delivery_shift: string;
    customer_name: string;
    customer_company: string;
    customer_phone: string;
    status: string;
    grand_total: number;
  };
  requested_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_to_profile?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

type TabKey = 'all' | 'pending' | 'my_review' | 'waiting_op' | 'revision' | 'completed';

export default function KiemTraHangPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>(
    (searchParams.get('tab') as TabKey) || 'pending'
  );
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [deliveryDate, setDeliveryDate] = useState(searchParams.get('deliveryDate') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (activeTab !== 'all') q.set('tab', activeTab);
      if (searchTerm) q.set('search', searchTerm);
      if (deliveryDate) q.set('deliveryDate', deliveryDate);
      q.set('page', String(page));
      q.set('limit', '15');

      const res = await fetch(`/api/admin/procurement/reviews?${q.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Không thể tải danh sách kiểm tra hàng');
      }
      setReviews(data.data || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối khi tải danh sách');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, deliveryDate, page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
    const p = new URLSearchParams(searchParams);
    p.set('tab', tab);
    p.set('page', '1');
    setSearchParams(p);
  };

  const handleClaim = async (reviewId: string) => {
    setClaimingId(reviewId);
    try {
      const res = await fetch(`/api/admin/procurement/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Không thể tiếp nhận yêu cầu');
      }
      // Chuyển sang màn hình chi tiết kiểm tra
      navigate(`/kiem-tra-hang/${reviewId}`);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tiếp nhận yêu cầu');
    } finally {
      setClaimingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_acceptance':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Chờ tiếp nhận</span>;
      case 'in_review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Thu mua đang kiểm tra</span>;
      case 'responded':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">Đã gửi kết quả (Chờ VH)</span>;
      case 'needs_revision':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Cần kiểm tra lại</span>;
      case 'accepted_by_operations':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Vận hành đã duyệt</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Kiểm tra hàng hóa
              </h1>
              <p className="text-sm text-slate-500">
                Hàng đợi kiểm tra khả năng đáp ứng &amp; bổ sung giá Thu mua trước khi xác nhận đơn
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReviews()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 mb-6 pb-px">
        {[
          { key: 'pending', label: 'Chờ tiếp nhận' },
          { key: 'my_review', label: 'Tôi đang xử lý' },
          { key: 'waiting_op', label: 'Chờ Vận hành' },
          { key: 'revision', label: 'Cần kiểm tra lại' },
          { key: 'completed', label: 'Đã hoàn tất' },
          { key: 'all', label: 'Tất cả' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key as TabKey)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                isActive
                  ? 'text-teal-700 border-teal-600 bg-white font-semibold'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên khách..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => {
              setDeliveryDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {(searchTerm || deliveryDate) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setDeliveryDate('');
              setPage(1);
            }}
            className="text-xs text-rose-600 hover:underline px-2 py-1"
          >
            Xóa lọc
          </button>
        )}
      </div>

      {/* Main Table / Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-teal-600" />
            <p className="text-sm">Đang tải danh sách kiểm tra...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 flex flex-col items-center justify-center gap-2">
            <AlertTriangle size={24} />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => fetchReviews()}
              className="mt-2 text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200"
            >
              Thử lại
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Package size={36} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Không có yêu cầu kiểm tra nào trong mục này</p>
            <p className="text-xs text-slate-400">Các yêu cầu từ Vận hành sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Mã đơn &amp; Phiên bản</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Ngày giao</th>
                  <th className="py-3 px-4 text-center">Mặt hàng</th>
                  <th className="py-3 px-4">Phụ trách</th>
                  <th className="py-3 px-4">Thời gian / SLA</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {reviews.map((r) => {
                  const order = r.orders;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-teal-700 flex items-center gap-1.5">
                          <span>#{order?.order_code || '---'}</span>
                          <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            v{r.version}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Tạo: {new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-medium text-slate-900 truncate">
                          {order?.customer_name || 'Khách vãng lai'}
                        </div>
                        {order?.customer_company && (
                          <div className="text-xs text-slate-500 truncate">{order.customer_company}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">
                          {order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('vi-VN') : '---'}
                        </div>
                        {order?.delivery_shift && (
                          <span className="text-[11px] text-slate-500 font-normal">Ca: {order.delivery_shift}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="font-medium text-slate-800">
                          {r.itemStats.totalItems} món
                        </div>
                        {r.itemStats.shortageItems > 0 && (
                          <span className="inline-block text-[11px] text-rose-600 font-medium">
                            {r.itemStats.shortageItems} món thiếu/đổi
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="text-slate-500">
                          VH: <span className="text-slate-800 font-medium">{r.requested_by_profile?.full_name || '---'}</span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          TM: <span className="text-slate-800 font-medium">{r.assigned_to_profile?.full_name || 'Chưa nhận'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {r.isSlaBreached ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            <Clock size={12} /> Quá SLA ({r.waitingMinutes}p)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            <Clock size={12} /> {r.waitingMinutes} phút
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(r.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'pending_acceptance' && (
                            <button
                              onClick={() => handleClaim(r.id)}
                              disabled={claimingId === r.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                            >
                              <UserCheck size={14} />
                              <span>{claimingId === r.id ? 'Đang nhận...' : 'Tiếp nhận'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/kiem-tra-hang/${r.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                            <span>Chi tiết</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Trang {page} / {totalPages} (Tổng cộng {totalCount} yêu cầu)
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
