import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase } from '../lib/apiBase';
import { can } from '../lib/permissions';
import {
  AlertCircle, RefreshCw, ChevronDown, ChevronUp, BarChart3, ListChecks,
  FileSpreadsheet, CheckCircle2, PackageCheck, Boxes, AlertTriangle, Search,
  User, Calendar, X, ArrowRight
} from 'lucide-react';

function money(v: number) { return new Intl.NumberFormat('vi-VN').format(Math.round(Number(v) || 0)) + 'đ'; }
function dt(v: string) { return v ? new Date(v).toLocaleString('vi-VN') : '—'; }

export default function SoanHangPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'pack' | 'report'>('pack');

  return (
    <div className="space-y-5">
      {/* Navigation tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200/80 shadow-2xs w-fit">
        <button
          type="button"
          onClick={() => navigate('/don-tong')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
        >
          <Boxes size={16} />
          <span>1. Đơn tổng thu mua (Kiểm tra nhu cầu)</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/soan-hang')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white shadow-xs"
        >
          <PackageCheck size={16} />
          <span>2. Soạn hàng theo đơn (Chỉ đơn đã xác nhận)</span>
        </button>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Xử lý &amp; Soạn hàng</h1>
          <p className="text-slate-500 text-sm">
            Danh sách soạn hàng chỉ phát hành cho các đơn đã xác nhận. Nhận soạn, ghi nhận số lượng thực soạn và xử lý ngoại lệ.
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm self-start">
          <button
            onClick={() => setMode('pack')}
            className={`px-4 py-2 flex items-center gap-1.5 ${mode === 'pack' ? 'bg-green-600 text-white font-semibold' : 'bg-white text-slate-600'}`}
          >
            <ListChecks size={15} /> Tác vụ soạn hàng
          </button>
          <button
            onClick={() => setMode('report')}
            className={`px-4 py-2 flex items-center gap-1.5 border-l border-slate-200 ${mode === 'report' ? 'bg-green-600 text-white font-semibold' : 'bg-white text-slate-600'}`}
          >
            <BarChart3 size={15} /> Báo cáo đã bán
          </button>
        </div>
      </header>

      {mode === 'pack' ? <PickingTasksWorkflow /> : <SalesReport />}
    </div>
  );
}

type PickingTab = 'released' | 'in_progress' | 'exception' | 'done' | 'all';

interface PickingTask {
  id: string;
  task_number: string;
  order_id: string;
  version: number;
  status: 'released' | 'accepted' | 'picking' | 'exception' | 'completed' | 'done' | 'superseded' | 'canceled';
  assigned_to: string | null;
  delivery_date: string | null;
  is_overdue?: boolean;
  open_exceptions_count?: number;
  released_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  order?: {
    id: string;
    order_code: string;
    customer_name: string;
    customer_phone?: string;
    customer_company?: string;
    delivery_address?: string;
    delivery_date?: string;
    status: string;
    grand_total?: number;
  };
  assigned_to_profile?: {
    id: string;
    full_name: string;
    role: string;
  };
  items?: Array<{
    id: string;
    requested_qty: number;
    picked_qty: number;
    unit: string;
    status: string;
  }>;
  exceptions?: Array<{
    id: string;
    exception_type: string;
    status: string;
  }>;
}

function PickingTasksWorkflow() {
  const { user, token } = useAuth();
  const apiBase = getApiBase();

  const [activeTab, setActiveTab] = useState<PickingTab>('released');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState<PickingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [activeDetailTaskId, setActiveDetailTaskId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Modal báo ngoại lệ
  const [reportingItem, setReportingItem] = useState<any>(null);
  const [exceptionType, setExceptionType] = useState<'shortage' | 'substitution' | 'damaged' | 'other'>('shortage');
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionActualQty, setExceptionActualQty] = useState('');
  const [submittingException, setSubmittingException] = useState(false);

  const canResolveException = user?.role ? can(user.role, 'picking.exception_resolve') : false;
  const canClaim = user?.role ? can(user.role, 'picking.claim') : false;
  const canUpdate = user?.role ? can(user.role, 'picking.update') : false;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (activeTab !== 'all') q.set('status', activeTab);
      if (deliveryDate) q.set('date', deliveryDate);
      if (search.trim()) q.set('search', search.trim());

      const res = await fetch(`${apiBase}/api/admin/picking/tasks?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setTasks(data.data || []);
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, activeTab, deliveryDate, search]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const fetchDetailTask = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/picking/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setDetailTask(data.data);
      }
    } catch {
      // error
    } finally {
      setLoadingDetail(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (activeDetailTaskId) {
      fetchDetailTask(activeDetailTaskId);
    } else {
      setDetailTask(null);
    }
  }, [activeDetailTaskId, fetchDetailTask]);

  const handleClaim = async (taskId: string) => {
    if (!canClaim) {
      alert('Bạn không có quyền nhận soạn hàng.');
      return;
    }
    setClaiming(taskId);
    try {
      const res = await fetch(`${apiBase}/api/admin/picking/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'claim' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Không nhận soạn được tác vụ');
      alert('✅ Đã nhận tác vụ soạn hàng thành công!');
      await fetchTasks();
      if (activeDetailTaskId === taskId) {
        await fetchDetailTask(taskId);
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setClaiming(null);
    }
  };

  const handleSaveItems = async () => {
    if (!detailTask || !canUpdate) return;
    try {
      const itemsPayload = detailTask.items.map((it: any) => ({
        id: it.id,
        picked_qty: Number(it.picked_qty) || 0,
        note: it.note || '',
      }));

      const res = await fetch(`${apiBase}/api/admin/picking/tasks/${detailTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'update_items', items: itemsPayload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Không lưu được tiến độ');
      alert('✅ Đã lưu tiến độ soạn hàng');
      await fetchDetailTask(detailTask.id);
      await fetchTasks();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleCompleteTask = async () => {
    if (!detailTask || !canUpdate) return;
    if (!confirm('Xác nhận hoàn tất soạn hàng cho đơn này?')) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/picking/tasks/${detailTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'complete' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Không hoàn tất được tác vụ');
      alert('✅ Đã hoàn tất soạn hàng!');
      setActiveDetailTaskId(null);
      await fetchTasks();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleReportException = async () => {
    if (!detailTask || !reportingItem || !exceptionReason.trim()) {
      alert('Vui lòng nhập lý do ngoại lệ');
      return;
    }
    setSubmittingException(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/picking/exceptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskId: detailTask.id,
          taskItemId: reportingItem.id,
          orderId: detailTask.order_id,
          exceptionType,
          requestedQty: reportingItem.requested_qty,
          actualQty: exceptionActualQty ? Number(exceptionActualQty) : 0,
          reason: exceptionReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Báo ngoại lệ thất bại');
      alert('✅ Đã ghi nhận ngoại lệ và chuyển trạng thái tác vụ');
      setReportingItem(null);
      setExceptionReason('');
      setExceptionActualQty('');
      await fetchDetailTask(detailTask.id);
      await fetchTasks();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmittingException(false);
    }
  };

  const handleResolveException = async (exceptionId: string, action: 'accept_shortage' | 'accept_substitution' | 'reject') => {
    if (!canResolveException) {
      alert('Chỉ Admin, Trưởng phòng hoặc NV Vận hành được duyệt ngoại lệ');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/admin/picking/exceptions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ exceptionId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Thao tác thất bại');
      alert('✅ Đã giải quyết ngoại lệ');
      if (detailTask) await fetchDetailTask(detailTask.id);
      await fetchTasks();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleExportSelectedPackingList = async () => {
    if (selectedTaskIds.size === 0) {
      alert('Vui lòng chọn ít nhất một tác vụ soạn hàng để xuất danh sách.');
      return;
    }

    const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
    const orderIds = selectedTasks.map(t => t.order_id).filter(Boolean);

    if (orderIds.length === 0) {
      alert('Không tìm thấy mã đơn hàng hợp lệ trong các tác vụ đã chọn');
      return;
    }

    setExporting(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/reports/packing-list/export?orderIds=${orderIds.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Không xuất được danh sách soạn hàng');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Danh_Sach_Soan_Hang_${orderIds.length}_don.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map(t => t.id)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Disclaimer banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-900 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          <span>
            <b>DANH SÁCH SOẠN HÀNG CHÍNH THỨC</b>: Tất cả các tác vụ dưới đây đều thuộc đơn hàng đã xác nhận. Mọi thay đổi về số lượng hoặc chủng loại sau bước này đều phải được ghi nhận qua Ngoại lệ.
          </span>
        </div>
      </div>

      {/* Toolbar: Sub-tabs + Filter + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'released', label: 'Chờ nhận soạn' },
              { id: 'in_progress', label: 'Đang soạn' },
              { id: 'exception', label: 'Có ngoại lệ' },
              { id: 'done', label: 'Đã xong' },
              { id: 'all', label: 'Tất cả' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={deliveryDate}
              onChange={e => setDeliveryDate(e.target.value)}
              className="text-xs font-semibold text-slate-800 border-0 focus:ring-0 p-0"
            />
            {deliveryDate && (
              <button onClick={() => setDeliveryDate('')} className="text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã đơn, khách, PK..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20"
            />
          </div>

          <button
            onClick={fetchTasks}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
            title="Tải lại"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Multi-selection Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={tasks.length > 0 && selectedTaskIds.size === tasks.length}
            onChange={selectAllVisible}
            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span className="font-medium text-slate-700">
            Đã chọn {selectedTaskIds.size} / {tasks.length} tác vụ
          </span>
        </div>

        <button
          onClick={handleExportSelectedPackingList}
          disabled={selectedTaskIds.size === 0 || exporting}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-xs"
        >
          <FileSpreadsheet size={14} />
          <span>{exporting ? 'Đang xuất...' : `Tạo danh sách soạn (${selectedTaskIds.size} đơn)`}</span>
        </button>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw size={18} className="animate-spin" />
          <span>Đang tải danh sách tác vụ soạn hàng...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
          Không có tác vụ soạn hàng nào trong mục này.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => {
            const isSelected = selectedTaskIds.has(task.id);
            const totalItems = task.items?.length || 0;
            const pickedItems = task.items?.filter(i => Number(i.picked_qty) > 0).length || 0;

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border p-4.5 space-y-3.5 shadow-xs transition-shadow hover:shadow-md ${
                  task.is_overdue
                    ? 'border-rose-300 bg-rose-50/20'
                    : isSelected
                    ? 'border-slate-800 ring-1 ring-slate-800'
                    : 'border-slate-200'
                }`}
              >
                {/* Header card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectTask(task.id)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{task.task_number}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded">
                          v{task.version}
                        </span>
                      </div>
                      <span className="text-xs text-blue-700 font-bold">{task.order?.order_code}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        task.status === 'released'
                          ? 'bg-sky-100 text-sky-800'
                          : task.status === 'accepted' || task.status === 'picking'
                          ? 'bg-amber-100 text-amber-800'
                          : task.status === 'exception'
                          ? 'bg-rose-100 text-rose-800'
                          : task.status === 'done' || task.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {task.status === 'released' && 'Chờ nhận'}
                      {task.status === 'accepted' && 'Đã nhận'}
                      {task.status === 'picking' && 'Đang soạn'}
                      {task.status === 'exception' && 'Có ngoại lệ'}
                      {(task.status === 'done' || task.status === 'completed') && 'Đã soạn xong'}
                    </span>
                    {task.is_overdue && (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5">
                        <AlertTriangle size={11} /> Quá ngày giao!
                      </span>
                    )}
                  </div>
                </div>

                {/* Customer info */}
                <div className="text-xs space-y-1 text-slate-600 border-t border-slate-100 pt-2.5">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" />
                    <span>{task.order?.customer_name}</span>
                  </div>
                  {task.order?.delivery_address && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      Đ/c: {task.order.delivery_address}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Giao: {task.delivery_date || task.order?.delivery_date || '—'}</span>
                    <span>Tiến độ: <b className="text-slate-800">{pickedItems}/{totalItems}</b> SP</span>
                  </div>
                </div>

                {/* Assigned staff info */}
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg flex items-center justify-between">
                  <span>
                    Người soạn: <b className="text-slate-700">{task.assigned_to_profile?.full_name || 'Chưa nhận'}</b>
                  </span>
                  <span>{task.accepted_at ? dt(task.accepted_at) : '—'}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {task.status === 'released' && (
                    <button
                      onClick={() => handleClaim(task.id)}
                      disabled={claiming === task.id || !canClaim}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {claiming === task.id ? 'Đang nhận...' : 'Nhận soạn'}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveDetailTaskId(task.id)}
                    className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Mở soạn hàng</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer / Modal */}
      {activeDetailTaskId && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-3 sm:p-4"
          onMouseDown={() => setActiveDetailTaskId(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Tác vụ soạn: {detailTask?.task_number || 'Đang tải...'}
                  </h2>
                  {detailTask?.version && (
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      v{detailTask.version}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đơn hàng: <b className="text-blue-700">{detailTask?.order?.order_code}</b> · Khách hàng: {detailTask?.order?.customer_name}
                </p>
              </div>
              <button
                onClick={() => setActiveDetailTaskId(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {loadingDetail || !detailTask ? (
                <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Đang tải chi tiết dòng hàng...</span>
                </div>
              ) : (
                <>
                  {/* Status & assignment banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500">Người nhận soạn:</span>{' '}
                      <b className="text-slate-800">{detailTask.assigned_to_profile?.full_name || 'Chưa nhận'}</b>
                    </div>
                    <div>
                      <span className="text-slate-500">Ngày giao:</span>{' '}
                      <b className="text-slate-800">{detailTask.delivery_date || detailTask.order?.delivery_date || '—'}</b>
                    </div>
                    <div>
                      <span className="text-slate-500">Trạng thái:</span>{' '}
                      <span className="font-bold text-slate-800 uppercase">{detailTask.status}</span>
                    </div>
                  </div>

                  {/* Exceptions banner if any */}
                  {Array.isArray(detailTask.exceptions) && detailTask.exceptions.length > 0 && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                        <AlertCircle size={16} className="text-rose-600" />
                        <span>Danh sách ngoại lệ phát sinh ({detailTask.exceptions.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {detailTask.exceptions.map((exc: any) => (
                          <div
                            key={exc.id}
                            className="bg-white p-2.5 rounded-lg border border-rose-100 flex items-center justify-between gap-3 text-xs flex-wrap"
                          >
                            <div>
                              <span className="font-bold text-rose-800 uppercase mr-2">[{exc.exception_type}]</span>
                              <span className="text-slate-700">{exc.reason}</span>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Báo bởi: {exc.reporter?.full_name || 'NV'} lúc {dt(exc.reported_at)} · Trạng thái: <b>{exc.status}</b>
                              </div>
                            </div>
                            {(exc.status === 'open' || exc.status === 'pending') && canResolveException && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleResolveException(exc.id, 'accept_shortage')}
                                  className="px-2 py-1 bg-amber-600 text-white rounded text-[11px] font-semibold hover:bg-amber-700"
                                >
                                  Duyệt thiếu
                                </button>
                                <button
                                  onClick={() => handleResolveException(exc.id, 'accept_substitution')}
                                  className="px-2 py-1 bg-teal-600 text-white rounded text-[11px] font-semibold hover:bg-teal-700"
                                >
                                  Duyệt đổi SP
                                </button>
                                <button
                                  onClick={() => handleResolveException(exc.id, 'reject')}
                                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] font-semibold hover:bg-slate-300"
                                >
                                  Bác bỏ
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items Table */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Sản phẩm</th>
                          <th className="py-2.5 px-2 text-center">Cần soạn</th>
                          <th className="py-2.5 px-2 text-center w-28">Thực soạn</th>
                          <th className="py-2.5 px-3">Trạng thái</th>
                          <th className="py-2.5 px-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailTask.items?.map((item: any, idx: number) => {
                          const orderItem = item.order_item || {};
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">{orderItem.name || '---'}</div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  SKU: {orderItem.sku || '---'} · {item.unit}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-slate-700 text-sm">
                                {item.requested_qty}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={item.picked_qty}
                                  onChange={e => {
                                    const val = Number(e.target.value) || 0;
                                    setDetailTask((prev: any) => {
                                      const nextItems = [...prev.items];
                                      nextItems[idx] = { ...nextItems[idx], picked_qty: val };
                                      return { ...prev, items: nextItems };
                                    });
                                  }}
                                  className="w-20 text-center font-bold text-emerald-800 border border-slate-200 rounded-lg py-1 px-1.5 focus:ring-2 focus:ring-emerald-500/20"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    item.status === 'picked'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.status === 'shortage'
                                      ? 'bg-rose-100 text-rose-800'
                                      : item.status === 'substituted'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {item.status === 'picked' ? 'Đã soạn' : item.status === 'shortage' ? 'Thiếu' : item.status === 'substituted' ? 'Đổi hàng' : 'Chờ soạn'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailTask((prev: any) => {
                                      const nextItems = [...prev.items];
                                      nextItems[idx] = { ...nextItems[idx], picked_qty: item.requested_qty, status: 'picked' };
                                      return { ...prev, items: nextItems };
                                    });
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                                >
                                  Đủ hàng
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReportingItem(item);
                                    setExceptionReason('');
                                    setExceptionActualQty(String(item.picked_qty || 0));
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg"
                                >
                                  Báo ngoại lệ
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-slate-500">
                {detailTask?.status === 'released' && (
                  <span className="text-amber-700 font-semibold">Tác vụ cần được nhận trước khi hoàn tất.</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {detailTask?.status === 'released' && (
                  <button
                    onClick={() => handleClaim(detailTask.id)}
                    disabled={claiming === detailTask.id || !canClaim}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
                  >
                    Nhận soạn
                  </button>
                )}
                <button
                  onClick={handleSaveItems}
                  disabled={!canUpdate}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl"
                >
                  Lưu tiến độ
                </button>
                <button
                  onClick={handleCompleteTask}
                  disabled={!canUpdate || detailTask?.status === 'done' || detailTask?.status === 'completed' || detailTask?.status === 'released'}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl disabled:opacity-50"
                >
                  Hoàn tất soạn hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exception Report Modal */}
      {reportingItem && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/50 flex items-center justify-center p-4"
          onMouseDown={() => setReportingItem(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-4"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                Báo ngoại lệ soạn hàng
              </h3>
              <button onClick={() => setReportingItem(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>Sản phẩm: <b className="text-slate-800">{reportingItem.order_item?.name || '---'}</b></div>
              <div>Số lượng đặt: <b>{reportingItem.requested_qty} {reportingItem.unit}</b></div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loại ngoại lệ:</label>
                <select
                  value={exceptionType}
                  onChange={e => setExceptionType(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white"
                >
                  <option value="shortage">Thiếu hàng / Không đủ số lượng</option>
                  <option value="substitution">Đổi sang sản phẩm khác</option>
                  <option value="damaged">Hàng hỏng / Hết hạn</option>
                  <option value="other">Lý do khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng thực soạn được:</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={exceptionActualQty}
                  onChange={e => setExceptionActualQty(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do chi tiết <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={exceptionReason}
                  onChange={e => setExceptionReason(e.target.value)}
                  placeholder="Nhập lý do thiếu hàng hoặc hàng thay thế..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReportingItem(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleReportException}
                disabled={submittingException || !exceptionReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
              >
                {submittingException ? 'Đang gửi...' : 'Gửi báo cáo ngoại lệ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Báo cáo đã bán (Doanh số theo khoảng ngày) ────────────────────────
type RangePreset = 'day' | 'month' | 'year' | 'custom';

function SalesReport() {
  const { token } = useAuth();
  const apiBase = getApiBase();
  const [preset, setPreset] = useState<RangePreset>('day');
  const [anchor, setAnchor] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customFrom, setCustomFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const computeRange = useCallback((): [string, string] => {
    if (preset === 'custom') return [`${customFrom}T00:00:00`, `${customTo}T23:59:59.999`];
    const [y, m] = anchor.split('-').map(Number);
    if (preset === 'day') return [`${anchor}T00:00:00`, `${anchor}T23:59:59.999`];
    if (preset === 'month') {
      const last = new Date(y, m, 0).getDate();
      return [`${y}-${String(m).padStart(2, '0')}-01T00:00:00`, `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}T23:59:59.999`];
    }
    return [`${y}-01-01T00:00:00`, `${y}-12-31T23:59:59.999`];
  }, [preset, anchor, customFrom, customTo]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const [from, to] = computeRange();
      const res = await fetch(`${apiBase}/api/admin/reports/sales-detail?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) setReport(data);
    } finally { setLoading(false); }
  }, [apiBase, token, computeRange]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const [from, to] = computeRange();
  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/reports/sales-detail/export?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không xuất được báo cáo');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bao-cao-ban-hang-chi-tiet_${from}_${to}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không xuất được báo cáo'));
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['day', 'month', 'year', 'custom'] as RangePreset[]).map((p) => (
            <button key={p} onClick={() => setPreset(p)}
              className={`px-3 py-2 border-l border-slate-200 first:border-l-0 ${preset === p ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
              {p === 'day' ? 'Theo ngày' : p === 'month' ? 'Theo tháng' : p === 'year' ? 'Theo năm' : 'Tùy chỉnh'}
            </button>
          ))}
        </div>
        {preset !== 'custom' ? (
          <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        ) : (
          <>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <span className="text-slate-400 text-sm">đến</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </>
        )}
        <button onClick={exportExcel} disabled={exporting}
          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5">
          <FileSpreadsheet size={16} /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
        <button onClick={fetchReport} className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50" title="Tải lại">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-xs text-slate-400">
          {new Date(from).toLocaleDateString('vi-VN')} – {new Date(to.replace('T23:59:59.999', '')).toLocaleDateString('vi-VN')}
        </span>
      </div>

      {report && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xl font-bold text-slate-800">{money(report.totalRevenue)}</p>
            <p className="text-xs text-slate-500">Doanh thu</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xl font-bold text-slate-800">{report.totalQuantity}</p>
            <p className="text-xs text-slate-500">Tổng số lượng bán</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xl font-bold text-slate-800">{report.orderCount}</p>
            <p className="text-xs text-slate-500">Số đơn</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <RefreshCw className="animate-spin mr-2" size={20} /> Đang tải...
        </div>
      ) : !report || report.categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">Không có dữ liệu trong khoảng này</div>
      ) : (
        <div className="space-y-2">
          {report.categories.map((cat: any) => {
            const catOpen = expandedCategory === cat.category;
            return (
              <article key={cat.category} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedCategory(catOpen ? null : cat.category)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{cat.category}</p>
                    <p className="text-xs text-slate-400">{cat.products.length} mặt hàng</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-700">{money(cat.revenue)}</p>
                    <p className="text-xs text-slate-400">{cat.quantity} đơn vị</p>
                  </div>
                  {catOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {catOpen && (
                  <div className="border-t border-slate-50 divide-y divide-slate-50">
                    {cat.products.map((p: any) => {
                      const key = `${cat.category}__${p.name}`;
                      const prodOpen = expandedProduct === key;
                      return (
                        <div key={key}>
                          <button onClick={() => setExpandedProduct(prodOpen ? null : key)}
                            className="w-full flex items-center gap-3 px-4 py-3 pl-8 text-left hover:bg-slate-50/50">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-700">{p.name}</p>
                              <p className="text-xs text-slate-400">{p.orders.length} lượt bán</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-700">{money(p.revenue)}</p>
                              <p className="text-xs text-slate-400">{p.quantity} {p.unit}</p>
                            </div>
                            {prodOpen ? <ChevronUp size={15} className="text-slate-300" /> : <ChevronDown size={15} className="text-slate-300" />}
                          </button>
                          {prodOpen && (
                            <div className="pl-12 pr-4 pb-3">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-slate-400 uppercase">
                                    <th className="pb-1">Đơn hàng</th>
                                    <th className="pb-1">Khách hàng</th>
                                    <th className="pb-1 text-right">Số lượng</th>
                                    <th className="pb-1 text-right">Thành tiền</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.orders.map((o: any, i: number) => (
                                    <tr key={i} className="border-t border-slate-50">
                                      <td className="py-1.5 font-medium text-slate-600">{o.orderCode}</td>
                                      <td className="py-1.5 text-slate-500">{o.customerName}{o.customerCompany ? ` (${o.customerCompany})` : ''}</td>
                                      <td className="py-1.5 text-right text-slate-600">{o.quantity} {p.unit}</td>
                                      <td className="py-1.5 text-right text-slate-600">{money(o.revenue)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
