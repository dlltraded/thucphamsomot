"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Edit3, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { ADMIN_TOKEN_STORAGE_KEY } from "@/lib/admin-token";
import type { KnowledgeArticle } from "@/lib/knowledge";

type SectionForm = {
  heading: string;
  body: string;
  itemsText: string;
};

type FaqForm = {
  question: string;
  answer: string;
};

type KnowledgeForm = {
  slug: string;
  title: string;
  description: string;
  sections: SectionForm[];
  faqs: FaqForm[];
};

type KnowledgeAdminProps = {
  initialArticles?: KnowledgeArticle[];
  adminToken?: string;
  hideTokenInput?: boolean;
};

function createEmptySection(): SectionForm {
  return { heading: "", body: "", itemsText: "" };
}

function createEmptyFaq(): FaqForm {
  return { question: "", answer: "" };
}

function createInitialForm(): KnowledgeForm {
  return {
    slug: "",
    title: "",
    description: "",
    sections: [createEmptySection()],
    faqs: [],
  };
}

function toSectionForm(section: KnowledgeArticle["sections"][number]): SectionForm {
  return {
    heading: section.heading ?? "",
    body: section.body ?? "",
    itemsText: (section.items ?? []).join(" | "),
  };
}

function toFaqForm(faq: KnowledgeArticle["faqs"][number]): FaqForm {
  return {
    question: faq.question ?? "",
    answer: faq.answer ?? "",
  };
}

function toForm(article: KnowledgeArticle): KnowledgeForm {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description ?? "",
    sections: (article.sections ?? []).map(toSectionForm),
    faqs: (article.faqs ?? []).map(toFaqForm),
  };
}

function toPayload(form: KnowledgeForm) {
  return {
    slug: form.slug.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    sections: form.sections
      .map((section) => ({
        heading: section.heading.trim(),
        body: section.body.trim(),
        items: section.itemsText
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean),
      }))
      .filter((section) => section.heading && section.body),
    faqs: form.faqs
      .map((faq) => ({
        question: faq.question.trim(),
        answer: faq.answer.trim(),
      }))
      .filter((faq) => faq.question && faq.answer),
  };
}

export function KnowledgeAdmin({ initialArticles = [], adminToken, hideTokenInput = false }: KnowledgeAdminProps) {
  const [token, setToken] = useState(() => adminToken ?? readStoredToken());
  const [articles, setArticles] = useState<KnowledgeArticle[]>(initialArticles);
  const initialArticle = initialArticles[0] ?? null;
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialArticle?.slug ?? null);
  const [form, setForm] = useState<KnowledgeForm>(() => (initialArticle ? toForm(initialArticle) : createInitialForm()));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedArticle = useMemo(
    () => articles.find((article) => article.slug === selectedSlug) ?? null,
    [articles, selectedSlug],
  );

  useEffect(() => {
    void loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadArticles() {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge", { cache: "no-store" });
      const data = (await res.json()) as { articles?: KnowledgeArticle[] };
      const next = data.articles ?? [];
      setArticles(next);
      const nextSelected = next.find((article) => article.slug === selectedSlug) ?? next[0] ?? null;
      if (nextSelected) {
        applyArticle(nextSelected);
      } else {
        setSelectedSlug(null);
        setForm(createInitialForm());
      }
    } finally {
      setLoading(false);
    }
  }

  function applyArticle(article: KnowledgeArticle) {
    setSelectedSlug(article.slug);
    setForm(toForm(article));
  }

  function persistToken(value: string) {
    setToken(value);
    if (!adminToken) {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, value);
    }
  }

  function resetForm() {
    setSelectedSlug(null);
    setForm(createInitialForm());
  }

  function addSection() {
    setForm((current) => ({ ...current, sections: [...current.sections, createEmptySection()] }));
  }

  function addFaq() {
    setForm((current) => ({ ...current, faqs: [...current.faqs, createEmptyFaq()] }));
  }

  async function submitArticle() {
    setMessage(null);

    const payload = toPayload(form);
    const isEdit = Boolean(selectedArticle);
    const endpoint = isEdit ? `/api/knowledge/${selectedArticle?.slug}` : "/api/knowledge";
    const res = await fetch(endpoint, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setMessage("Không lưu được bài kiến thức. Anh kiểm tra lại mật khẩu quản trị hoặc dữ liệu nhập vào.");
      return;
    }

    const data = (await res.json()) as { article?: KnowledgeArticle };
    setMessage("Đã lưu bài kiến thức.");
    if (data.article) {
      applyArticle(data.article);
    }
    await loadArticles();
  }

  async function removeArticle(slug: string) {
    if (!window.confirm("Anh muốn xóa bài kiến thức này chứ?")) {
      return;
    }

    const res = await fetch(`/api/knowledge/${slug}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });

    if (!res.ok) {
      setMessage("Không xóa được bài kiến thức. Anh kiểm tra lại mật khẩu quản trị.");
      return;
    }

    setMessage("Đã xóa bài kiến thức.");
    setSelectedSlug(null);
    resetForm();
    await loadArticles();
  }

  return (
    <section className="admin-shell" style={{ marginTop: 28 }}>
      <div className="admin-shell__top">
        <div>
          <div className="eyebrow">Quản trị kiến thức</div>
          <h2>Thêm, sửa, bớt bài hướng dẫn cho mục Kiến thức.</h2>
          <p>
            Anh có thể quản lý nội dung tư vấn, mẹo chọn hàng, hướng dẫn đặt báo giá và các bài đọc hữu ích ngay trong cùng
            khu quản trị.
          </p>
        </div>
        {hideTokenInput ? null : (
          <div className="admin-token">
            <label>Mã quản trị</label>
            <input value={token} onChange={(event) => persistToken(event.target.value)} className="lead-form__input" />
          </div>
        )}
      </div>

      <div className="admin-grid">
        <aside className="admin-panel">
          <div className="admin-panel__header">
            <strong>Danh sách bài kiến thức</strong>
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
                onClick={() => applyArticle(article)}
              >
                <span>
                  <strong>{article.title}</strong>
                  <small>{article.slug}</small>
                </span>
                {article.sections?.length ? <Check size={16} /> : <Edit3 size={16} />}
              </button>
            ))}
          </div>
        </aside>

        <div className="admin-panel admin-panel--editor">
          <div className="admin-panel__header">
            <strong>{selectedArticle ? "Chỉnh sửa bài kiến thức" : "Tạo bài kiến thức mới"}</strong>
            <div className="admin-actions">
              <button type="button" className="btn-secondary" onClick={resetForm}>
                <Plus size={16} />
                Bài mới
              </button>
              <button type="button" className="btn-primary" onClick={submitArticle}>
                <Save size={16} />
                Lưu bài
              </button>
            </div>
          </div>

          {message ? <div className="admin-message">{message}</div> : null}

          <div className="admin-form">
            <div className="admin-form__grid">
              <Field label="Tiêu đề" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
              <Field label="Slug" value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} />
            </div>

            <div>
              <label className="admin-form__label">Mô tả</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="lead-form__textarea"
                rows={3}
              />
            </div>

            <div className="admin-inline-actions">
              <strong>Section</strong>
              <button type="button" className="btn-secondary" onClick={addSection}>
                <Plus size={16} />
                Thêm section
              </button>
            </div>

            {form.sections.map((section, index) => (
              <div key={`${selectedSlug ?? "new"}-section-${index}`} className="admin-card-block">
                <div className="admin-card-block__header">
                  <strong>Section {index + 1}</strong>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        sections: current.sections.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    <Trash2 size={16} />
                    Xóa
                  </button>
                </div>
                <div className="admin-form__grid">
                  <Field
                    label="Tiêu đề section"
                    value={section.heading}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        sections: current.sections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, heading: value } : item,
                        ),
                      }))
                    }
                  />
                  <Field
                    label="Danh sách ý"
                    value={section.itemsText}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        sections: current.sections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, itemsText: value } : item,
                        ),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="admin-form__label">Nội dung section</label>
                  <textarea
                    value={section.body}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sections: current.sections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, body: event.target.value } : item,
                        ),
                      }))
                    }
                    className="lead-form__textarea"
                    rows={4}
                  />
                </div>
              </div>
            ))}

            <div className="admin-inline-actions">
              <strong>FAQ</strong>
              <button type="button" className="btn-secondary" onClick={addFaq}>
                <Plus size={16} />
                Thêm câu hỏi
              </button>
            </div>

            {form.faqs.map((faq, index) => (
              <div key={`${selectedSlug ?? "new"}-faq-${index}`} className="admin-card-block">
                <div className="admin-card-block__header">
                  <strong>Câu hỏi {index + 1}</strong>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        faqs: current.faqs.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    <Trash2 size={16} />
                    Xóa
                  </button>
                </div>
                <div className="admin-form__grid">
                  <Field
                    label="Câu hỏi"
                    value={faq.question}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        faqs: current.faqs.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, question: value } : item,
                        ),
                      }))
                    }
                  />
                  <Field
                    label="Câu trả lời"
                    value={faq.answer}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        faqs: current.faqs.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, answer: value } : item,
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          {selectedArticle ? (
            <button type="button" className="admin-delete" onClick={() => removeArticle(selectedArticle.slug)}>
              <Trash2 size={16} />
              Xóa bài kiến thức
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
};

function Field({ label, value, onChange, type = "text" }: FieldProps) {
  return (
    <div>
      <label className="admin-form__label">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="lead-form__input" />
    </div>
  );
}

function readStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}
