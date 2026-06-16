import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  adminFetchProducts,
  adminUpdateProduct,
  adminToggleActive,
  adminUploadImage,
  adminFetchCategories,
} from '../services/admin';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'tps1admin2024';
const SESSION_KEY = 'tps1_admin_auth';
const PAGE_SIZE = 20;

const fmt = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

// ─── Login Screen ───────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      onLogin();
    } else {
      setError('Mật khẩu không đúng!');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2d3e 100%)',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '40px 32px',
        width: '320px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔐</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a2332', margin: 0 }}>
            TPS1 Admin
          </h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
            Quản trị sản phẩm
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(''); }}
            placeholder="Nhập mật khẩu admin"
            autoFocus
            style={{
              width: '100%', padding: '12px 14px', border: '1.5px solid #ddd',
              borderRadius: '10px', fontSize: '15px', outline: 'none',
              boxSizing: 'border-box', marginBottom: '8px',
            }}
          />
          {error && (
            <p style={{ color: '#e53e3e', fontSize: '13px', marginBottom: '8px' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%', padding: '12px', background: '#1a73e8',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────
function EditModal({ product, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    name: product.name || '',
    price_wholesale: product.price_wholesale || 0,
    price_retail: product.price_retail || 0,
    category: product.category || '',
    unit: product.unit || 'Kg',
    pack_size: product.pack_size || '',
    notes: product.notes || '',
    active: product.active !== false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(product.image_url || null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let updates = { ...form };

      // Upload image if changed
      if (imageFile) {
        setUploadProgress('📤 Đang upload hình...');
        const imageUrl = await adminUploadImage(imageFile, product.local_product_id || product.id);
        updates.image_url = imageUrl;
        setUploadProgress('');
      }

      const saved = await adminUpdateProduct(product.id, updates);
      onSave(saved);
    } catch (err) {
      alert('Lỗi lưu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: '600px', maxHeight: '90vh',
        overflowY: 'auto', padding: '24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>✏️ Sửa sản phẩm</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Image Upload */}
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div
            onClick={() => fileInputRef.current.click()}
            style={{
              width: '100px', height: '100px', borderRadius: '12px',
              border: '2px dashed #ddd', margin: '0 auto 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', background: '#f5f5f5',
            }}
          >
            {imagePreview
              ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '32px' }}>📷</span>
            }
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            style={{ fontSize: '12px', color: '#1a73e8', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Chọn hình ảnh
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          {uploadProgress && <p style={{ fontSize: '12px', color: '#666' }}>{uploadProgress}</p>}
        </div>

        {/* Form Fields */}
        {[
          { label: 'Tên sản phẩm *', key: 'name', type: 'text' },
          { label: 'Giá sỉ (VND) *', key: 'price_wholesale', type: 'number' },
          { label: 'Giá lẻ (VND)', key: 'price_retail', type: 'number' },
          { label: 'Đơn vị', key: 'unit', type: 'text' },
          { label: 'Quy cách (pack size)', key: 'pack_size', type: 'text' },
        ].map(({ label, key, type }) => (
          <div key={key} style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px', fontWeight: '500' }}>
              {label}
            </label>
            <input
              type={type}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0',
                borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}

        {/* Category */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px', fontWeight: '500' }}>
            Danh mục
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            style={{
              width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0',
              borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px', fontWeight: '500' }}>Ghi chú</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0',
              borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical',
            }}
          />
        </div>

        {/* Active Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Hiển thị sản phẩm</label>
          <div
            onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
            style={{
              width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
              background: form.active ? '#34c759' : '#ccc', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: '2px',
              left: form.active ? '22px' : '2px',
              width: '20px', height: '20px', borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </div>
          <span style={{ fontSize: '13px', color: form.active ? '#34c759' : '#999' }}>
            {form.active ? 'Đang hiển thị' : 'Ẩn'}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px', border: '1.5px solid #ddd',
              borderRadius: '10px', background: '#fff', fontSize: '14px',
              fontWeight: '600', cursor: 'pointer', color: '#666',
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: '12px', border: 'none',
              borderRadius: '10px', background: saving ? '#ccc' : '#1a73e8',
              color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const searchTimer = useRef(null);

  const loadProducts = useCallback(async (pg = 1, q = search, cat = catFilter) => {
    setLoading(true);
    try {
      const res = await adminFetchProducts({ page: pg, pageSize: PAGE_SIZE, search: q, category: cat });
      setProducts(res.products);
      setTotal(res.total);
      setPage(pg);
    } catch (err) {
      alert('Lỗi tải sản phẩm: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, catFilter]);

  useEffect(() => {
    if (!authed) return;
    adminFetchCategories().then(setCategories);
    loadProducts(1);
  }, [authed]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadProducts(1, val, catFilter), 400);
  };

  const handleCatChange = (cat) => {
    setCatFilter(cat);
    loadProducts(1, search, cat);
  };

  const handleSaved = (updated) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditProduct(null);
  };

  const handleToggle = async (product) => {
    try {
      const updated = await adminToggleActive(product.id, product.active);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
        padding: '16px 20px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: '700' }}>⚙️ TPS1 Admin</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{total} sản phẩm tổng</div>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); }}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
        >
          Đăng xuất
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', padding: '16px', overflowX: 'auto' }}>
        {[
          { label: 'Tổng SP', value: total, icon: '📦', color: '#1a73e8' },
          { label: 'Đang hiển thị', value: products.filter(p => p.active).length + '+', icon: '✅', color: '#34c759' },
          { label: 'Danh mục', value: categories.length, icon: '🗂️', color: '#ff9500' },
        ].map((s) => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: '12px', padding: '14px 18px',
            minWidth: '110px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1,
          }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#999' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ padding: '0 16px 12px' }}>
        <input
          type="text"
          placeholder="🔍 Tìm tên sản phẩm..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            width: '100%', padding: '11px 14px', border: '1.5px solid #e0e0e0',
            borderRadius: '10px', fontSize: '14px', outline: 'none',
            boxSizing: 'border-box', marginBottom: '10px', background: '#fff',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => handleCatChange('')}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap',
              background: catFilter === '' ? '#1a73e8' : '#e8f0fe',
              color: catFilter === '' ? '#fff' : '#1a73e8',
              fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCatChange(cat)}
              style={{
                padding: '6px 14px', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap',
                background: catFilter === cat ? '#1a73e8' : '#e8f0fe',
                color: catFilter === cat ? '#fff' : '#1a73e8',
                fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>⏳ Đang tải...</div>
        ) : products.map((product) => (
          <div key={product.id} style={{
            background: '#fff', borderRadius: '12px', marginBottom: '10px',
            padding: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            display: 'flex', gap: '12px', alignItems: 'center',
            opacity: product.active ? 1 : 0.5,
          }}>
            {/* Image */}
            <div style={{
              width: '60px', height: '60px', borderRadius: '8px',
              background: '#f5f5f5', overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {product.image_url
                ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '24px' }}>📷</span>
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a2332', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {product.name}
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                {product.category} • {product.unit}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a73e8' }}>
                  {fmt(product.price_wholesale)}
                </span>
                {product.price_retail > product.price_wholesale && (
                  <span style={{ fontSize: '11px', color: '#999', textDecoration: 'line-through' }}>
                    {fmt(product.price_retail)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => setEditProduct(product)}
                style={{
                  padding: '6px 12px', background: '#1a73e8', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '12px',
                  fontWeight: '600', cursor: 'pointer',
                }}
              >
                ✏️ Sửa
              </button>
              <button
                onClick={() => handleToggle(product)}
                style={{
                  padding: '6px 12px',
                  background: product.active ? '#fff3f3' : '#f0fff4',
                  color: product.active ? '#e53e3e' : '#38a169',
                  border: `1px solid ${product.active ? '#e53e3e' : '#38a169'}`,
                  borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                {product.active ? '🚫 Ẩn' : '✅ Hiện'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadProducts(page - 1)}
            disabled={page === 1}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd',
              background: page === 1 ? '#f5f5f5' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            ← Trước
          </button>
          <span style={{ padding: '8px 16px', fontSize: '13px', color: '#666' }}>
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => loadProducts(page + 1)}
            disabled={page === totalPages}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd',
              background: page === totalPages ? '#f5f5f5' : '#fff',
              cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px',
            }}
          >
            Sau →
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <EditModal
          product={editProduct}
          categories={categories}
          onSave={handleSaved}
          onClose={() => setEditProduct(null)}
        />
      )}
    </div>
  );
}
