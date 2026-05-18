"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Edit3, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { brandAssets } from "@/lib/brand";
import type { NewsArticle } from "@/lib/news";

type NewsForm = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt: string;
  readingTime: string;
  coverImage: string;
  content: string;
  featured: boolean;
};

const coverOptions = [
  { label: "Hàng thực phẩm", value: brandAssets.coverFood },
  { label: "Kho vận", value: brandAssets.warehouseWide },
  { label: "Xe giao hàng", value: brandAssets.deliveryTruck },
  { label: "Kiểm tra chất lượng", value: brandAssets.quality },
  { label: "Bếp vận hành", value: brandAssets.kitchen },
  { label: "Đội ngũ", value: brandAssets.team },
];

function toDatetimeLocal(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function createInitialForm(): NewsForm {
  return {
    slug: "",
    title: "",
    excerpt: "",
    category: "Tin tức",
    author: "TPS1",
    publishedAt: toDatetimeLocal(new Date()),
    readingTime: "4 phút",
    coverImage: brandAssets.coverFood,
    content: "",
    featured: false,
  };
}

export function NewsAdmin({ initialArticles = [] }: { initialArticles?: NewsArticle[] }) {
  const [token, setToken] = useState("");
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [form, setForm] = useState<NewsForm>(createInitialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedArticle = useMemo(
    () => articles.find((article) => article.slug === selectedSlug) ?? null,
    [articles, selectedSlug],
  );

  useEffect(() => {
    const savedToken = window.localStorage.getItem("tps1-admin-token") ?? "";
    setToken(savedToken);
  }, []);

  useEffect(() => {
    void loadArticles();
  }, []);

  useEffect(() => {
    if (selectedArticle) {
      setForm({
        slug: selectedArticle.slug,
        title: selectedArticle.title,
        excerpt: selectedArticle.excerpt,
        category: selectedArticle.category,
        author: selectedArticle.author,
        publishedAt: toDatetimeLocal(selectedArticle.publishedAt),
        readingTime: selectedArticle.readingTime,
        coverImage: selectedArticle.coverImage,
        content: selectedArticle.content,
        featured: selectedArticle.featured ?? false,
      });
    }
  }, [selectedArticle]);

  async function loadArticles() {
    setLoading(true);
    try {
      const res = await fetch("/api/news", { cache: "no-store" });
      const data = (await res.json()) as { articles?: NewsArticle[] };
      const next = data.articles ?? [];
      setArticles(next);
      if (!selectedSlug && next.length) {
        setSelectedSlug(next[0].slug);
      }
    } finally {
      setLoading(false);
    }
  }

  function persistToken(value: string) {
    setToken(value);
    window.localStorage.setItem("tps1-admin-token", value);
  }

  function resetForm() {
    setSelectedSlug(null);
    setForm(createInitialForm());
  }

  async function submitArticle() {
    setMessage(null);

    const payload = {
      ...form,
      slug: form.slug.trim(),
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : new Date().toISOString(),
    };

    const isEdit = Boolean(selectedArticle);
    const endpoint = isEdit ? `/api/news/${selectedArticle?.slug}` : "/api/news";
    const res = await fetch(endpoint, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setMessage("Không lưu được bài viết. Anh kiểm tra lại mã quản trị hoặc nội dung nhập vào.");
      return;
    }

    const data = (await res.json()) as { article?: NewsArticle };
    setMessage("Đã lưu bài viết.");
    await loadArticles();
    if (data.article) {
      setSelectedSlug(data.article.slug);
    }
  }

  async function removeArticle(slug: string) {
    if (!window.confirm("Anh muốn xóa bài viết này chứ?")) {
      return;
    }

    const res = await fetch(`/api/news/${slug}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });

    if (!res.ok) {
      setMessage("Không xóa được bài viết. Anh kiểm tra lại mã quản trị.");
      return;
    }

    setMessage("Đã xóa bài viết.");
    setSelectedSlug(null);
    resetForm();
    await loadArticles();
  }

  return (
    <section className="admin-shell">
      <div className="admin-shell__top">
        <div>
          <div className="eyebrow">Quản trị nội dung</div>
          <h2>Đăng tin, sửa bài và quản lý nội dung hữu ích cho khách hàng.</h2>
          <p>Không cần rời site, anh vẫn có thể cập nhật bài viết, thông báo và nội dung tư vấn theo từng giai đoạn bán hàng.</p>
        </div>
        <div className="admin-token">
          <label>Mã quản trị</label>
          <input
            value={token}
            onChange={(event) => persistToken(event.target.value)}
            placeholder="Nhập mã quản trị"
            className="lead-form__input"
          />
        </div>
      </div>

      <div className="admin-grid">
        <aside className="admin-panel">
          <div className="admin-panel__header">
            <strong>Danh sách bài viết</strong>
            <button type="button" className="btn-secondary" onClick={loadArticles}>
              <RefreshCw size={16} />
              Tải lại
            </button>
          </div>

          <div className="admin-list">
            {loading ? <p>Đang tải...</p> : null}
            {articles.map((article) => (
              <button
                key={article.slug}
                type="button"
                className={`admin-list__item${article.slug === selectedSlug ? " is-active" : ""}`}
                onClick={() => {
                  setSelectedSlug(article.slug);
                }}
              >
                <span>
                  <strong>{article.title}</strong>
                  <small>
                    {article.category} · {article.readingTime}
                  </small>
                </span>
                {article.featured ? <Check size={16} /> : <Edit3 size={16} />}
              </button>
            ))}
          </div>
        </aside>

        <div className="admin-panel admin-panel--editor">
          <div className="admin-panel__header">
            <strong>{selectedArticle ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}</strong>
            <div className="admin-actions">
              <button type="button" className="btn-secondary" onClick={resetForm}>
                <Plus size={16} />
                Bài mới
              </button>
              <button type="button" className="btn-primary" onClick={submitArticle}>
                <Save size={16} />
                Lưu bài viết
              </button>
            </div>
          </div>

          {message ? <div className="admin-message">{message}</div> : null}

          <div className="admin-form">
            <div className="admin-form__grid">
              <Field label="Tiêu đề" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
              <Field label="Slug" value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} />
            </div>

            <div className="admin-form__grid">
              <Field label="Chuyên mục" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
              <Field label="Tác giả" value={form.author} onChange={(value) => setForm({ ...form, author: value })} />
            </div>

            <div className="admin-form__grid">
              <Field
                label="Ngày đăng"
                value={form.publishedAt}
                onChange={(value) => setForm({ ...form, publishedAt: value })}
                type="datetime-local"
              />
              <Field label="Thời gian đọc" value={form.readingTime} onChange={(value) => setForm({ ...form, readingTime: value })} />
            </div>

            <div className="admin-form__grid">
              <Field
                label="Ảnh bìa"
                value={form.coverImage}
                onChange={(value) => setForm({ ...form, coverImage: value })}
                asSelect
                options={coverOptions}
              />
              <label className="admin-form__switch">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event) => setForm({ ...form, featured: event.target.checked })}
                />
                Bài nổi bật
              </label>
            </div>

            <div>
              <label className="admin-form__label">Mô tả ngắn</label>
              <textarea
                value={form.excerpt}
                onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
                className="lead-form__textarea"
                rows={3}
              />
            </div>

            <div>
              <label className="admin-form__label">Nội dung bài viết</label>
              <textarea
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                className="lead-form__textarea"
                rows={12}
              />
            </div>
          </div>

          <div className="admin-preview">
            <div className="admin-preview__cover">
              <Image
                src={form.coverImage || brandAssets.coverFood}
                alt={form.title || "Ảnh bài viết"}
                fill
                className="admin-preview__image"
              />
            </div>
            <div className="admin-preview__copy">
              <div className="admin-preview__meta">
                <span>{form.category || "Tin tức"}</span>
                <span>{form.readingTime || "4 phút"}</span>
                <span>{form.featured ? "Nổi bật" : "Thường"}</span>
              </div>
              <h3>{form.title || "Tiêu đề bài viết"}</h3>
              <p>{form.excerpt || "Mô tả ngắn của bài viết sẽ hiện ở đây."}</p>
            </div>
          </div>

          {selectedArticle ? (
            <button type="button" className="admin-delete" onClick={() => removeArticle(selectedArticle.slug)}>
              <Trash2 size={16} />
              Xóa bài viết
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  asSelect?: boolean;
  options?: Array<{ label: string; value: string }>;
};

function Field({ label, value, onChange, type = "text", asSelect, options }: FieldProps) {
  return (
    <div>
      <label className="admin-form__label">{label}</label>
      {asSelect ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className="lead-form__input">
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="lead-form__input" />
      )}
    </div>
  );
}
