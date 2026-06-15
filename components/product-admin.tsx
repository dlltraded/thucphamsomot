"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Save, Upload } from "lucide-react";
import { ADMIN_TOKEN_STORAGE_KEY } from "@/lib/admin-token";

type ManagedProduct = {
  slug: string;
  title: string;
  summary?: string;
  features?: string[];
  image?: string;
};

type ProductAdminProps = {
  initialProducts?: ManagedProduct[];
  adminToken?: string;
  hideTokenInput?: boolean;
};

const sampleCsv = `title,slug,summary,features,image
Rau cu qua tuoi song,rau-cu-qua-tuoi-song,Nguon rau cu theo mua,kiem soat dau vao|giao dinh ky,/images/tps1-cover-food.jpg`;

export function ProductAdmin({ initialProducts = [], adminToken, hideTokenInput = false }: ProductAdminProps) {
  const [token, setToken] = useState(() => adminToken ?? readStoredToken());
  const [csv, setCsv] = useState(sampleCsv);
  const [products, setProducts] = useState<ManagedProduct[]>(initialProducts);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const initialProduct = initialProducts[0] ?? null;
  const [selectedSlug, setSelectedSlug] = useState<string>(initialProduct?.slug ?? "");
  const [editTitle, setEditTitle] = useState(() => initialProduct?.title ?? "");
  const [editSummary, setEditSummary] = useState(() => initialProduct?.summary ?? "");
  const [editImage, setEditImage] = useState(() => initialProduct?.image ?? "");
  const [editFeatures, setEditFeatures] = useState(() => (initialProduct?.features ?? []).join(" | "));

  useEffect(() => {
    if (!initialProducts.length) {
      void loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts.length]);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = (await res.json()) as { products?: ManagedProduct[] };
      const list = data.products ?? [];
      setProducts(list);
      if (!selectedSlug && list.length) {
        selectProduct(list[0].slug, list);
      }
    } finally {
      setLoading(false);
    }
  }

  function selectProduct(slug: string, source = products) {
    setSelectedSlug(slug);
    const item = source.find((product) => product.slug === slug);
    if (!item) return;
    setEditTitle(item.title);
    setEditSummary(item.summary ?? "");
    setEditImage(item.image ?? "");
    setEditFeatures((item.features ?? []).join(" | "));
  }

  function persistToken(value: string) {
    setToken(value);
    if (!adminToken) {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, value);
    }
  }

  async function uploadCsv() {
    setMessage(null);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({ csv }),
    });

    if (!res.ok) {
      setMessage("Cap nhat danh sach san pham that bai. Anh kiem tra lai token hoac file CSV.");
      return;
    }

    setMessage("Da cap nhat danh sach san pham.");
    await loadProducts();
  }

  async function saveCurrentProduct() {
    setMessage(null);
    if (!selectedSlug) {
      setMessage("Anh chon san pham can sua truoc.");
      return;
    }

    const payload = {
      slug: selectedSlug,
      title: editTitle,
      summary: editSummary,
      image: editImage,
      features: editFeatures
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    const res = await fetch("/api/products", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setMessage("Luu thay doi san pham that bai. Anh kiem tra token va du lieu.");
      return;
    }

    setMessage("Da luu thay doi san pham.");
    await loadProducts();
  }

  return (
    <section className="admin-shell" style={{ marginTop: 28 }}>
      <div className="admin-shell__top">
        <div>
          <div className="eyebrow">Quan tri san pham</div>
          <h2>Upload danh sach san pham bang CSV</h2>
          <p>Format: title, slug, summary, features (tach bang dau |), image.</p>
        </div>
        {hideTokenInput ? null : (
          <div className="admin-token">
            <label>Ma quan tri</label>
            <input value={token} onChange={(event) => persistToken(event.target.value)} className="lead-form__input" />
          </div>
        )}
      </div>

      <div className="admin-grid">
        <div className="admin-panel admin-panel--editor">
          <div className="admin-panel__header">
            <strong>Nhap CSV</strong>
            <div className="admin-actions">
              <button type="button" className="btn-secondary" onClick={loadProducts}>
                <RefreshCw size={16} />
                Tai lai
              </button>
              <button type="button" className="btn-primary" onClick={uploadCsv}>
                <Upload size={16} />
                Cap nhat
              </button>
            </div>
          </div>
          {message ? <div className="admin-message">{message}</div> : null}
          <textarea value={csv} onChange={(event) => setCsv(event.target.value)} className="lead-form__textarea" rows={10} />
        </div>

        <aside className="admin-panel admin-panel--editor">
          <div className="admin-panel__header">
            <strong>Sua san pham cu</strong>
            <button type="button" className="btn-primary" onClick={saveCurrentProduct}>
              <Save size={16} />
              Luu sua
            </button>
          </div>

          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <label className="admin-form__label">Chon san pham</label>
            <select
              value={selectedSlug}
              onChange={(event) => selectProduct(event.target.value)}
              className="lead-form__input"
            >
              <option value="">-- Chon san pham --</option>
              {products.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.title}
                </option>
              ))}
            </select>
            <label className="admin-form__label">Ten san pham</label>
            <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="lead-form__input" />
            <label className="admin-form__label">Mo ta ngan</label>
            <textarea value={editSummary} onChange={(event) => setEditSummary(event.target.value)} className="lead-form__textarea" rows={3} />
            <label className="admin-form__label">Hinh anh</label>
            <input value={editImage} onChange={(event) => setEditImage(event.target.value)} className="lead-form__input" placeholder="/images/ten-file.jpg" />
            <label className="admin-form__label">Tinh nang (tach bang |)</label>
            <input value={editFeatures} onChange={(event) => setEditFeatures(event.target.value)} className="lead-form__input" />
          </div>

          <div className="admin-list">
            {loading ? <p>Dang tai...</p> : null}
            {products.map((item) => (
              <button
                key={item.slug}
                type="button"
                className={`admin-list__item${item.slug === selectedSlug ? " is-active" : ""}`}
                style={{ textAlign: "left" }}
                onClick={() => selectProduct(item.slug)}
              >
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.slug}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function readStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}
