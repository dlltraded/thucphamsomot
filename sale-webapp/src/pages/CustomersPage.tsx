import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Khách Hàng</h1>
          <p className="text-slate-500">Danh sách Leads và thông tin khách hàng</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="T�m theo t�n, S�T..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-4">Khách hàng</th>
                <th className="px-4 py-4">SĐT</th>
                <th className="px-4 py-4">Nguồn</th>
                <th className="px-4 py-4">Phân loại</th>
                <th className="px-4 py-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">Đang tải dữ liệu...</td></tr>
              ) : filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 font-medium text-slate-800">{customer.name}</td>
                  <td className="px-4 py-4 text-slate-500">{customer.phone}</td>
                  <td className="px-4 py-4">{customer.source || '-'}</td>
                  <td className="px-4 py-4">{customer.category || '-'}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                      {customer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

