"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Minus, Plus, Send, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import { productImageBySlug } from "@/lib/content";
import { clearQuoteBasket, loadQuoteBasket, saveQuoteBasket, type QuoteBasketItem } from "@/lib/quote-basket";
import { leadSchema, type LeadInput } from "@/lib/validation";

type ProductSource = {
  slug: string;
  title: string;
  summary?: string;
  features?: string[];
  image?: string;
};

type QuotePortalProps = {
  initialProducts: ProductSource[];
};

export function QuotePortal({ initialProducts }: QuotePortalProps) {
  const [basket, setBasket] = useState<QuoteBasketItem[]>([]);
  const [products, setProducts] = useState<ProductSource[]>(initialProducts);
  const [submitted, setSubmitted] = useState(false);
  const [submittedItems, setSubmittedItems] = useState<ReturnType<typeof selectedItemsFromBasket>>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setBasket(loadQuoteBasket());
    if (initialProducts.length) {
      setProducts(initialProducts);
    } else {
      void loadProducts();
    }
  }, [initialProducts]);

  async function loadProducts() {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = (await res.json()) as { products?: ProductSource[] };
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
    }
  }

  function selectedItemsFromBasket(items: QuoteBasketItem[]) {
    return items.map((item) => ({
      slug: item.slug,
      title: item.title,
      quantity: item.quantity,
    }));
  }

  const selectedCount = useMemo(() => basket.reduce((total, item) => total + item.quantity, 0), [basket]);

  const selectedItems = selectedItemsFromBasket(basket);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      phone: "",
      company: "",
      email: "",
      deliveryArea: "",
      needBy: "",
      message: "",
      selectedItems: [],
    },
  });

  function handleAddItem(product: ProductSource) {
    setBasket((current) => {
      const next = current.map((item) => ({ ...item }));
      const existing = next.find((item) => item.slug === product.slug);
      if (existing) {
        existing.quantity += 1;
      } else {
        next.push({
          slug: product.slug,
          title: product.title,
          summary: product.summary,
          quantity: 1,
        });
      }
      saveQuoteBasket(next);
      return next;
    });
  }

  function handleSetQuantity(slug: string, quantity: number) {
    setBasket((current) => {
      const next = current
        .map((item) => (item.slug === slug ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0);
      saveQuoteBasket(next);
      return next;
    });
  }

  function handleRemove(slug: string) {
    setBasket((current) => {
      const next = current.filter((item) => item.slug !== slug);
      saveQuoteBasket(next);
      return next;
    });
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSubmitted(false);

    const payload = {
      ...values,
      selectedItems,
      message: [
        values.message,
        selectedItems.length ? `Danh mục đã chọn: ${selectedItems.map((item) => `${item.title} x${item.quantity}`).join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    };

    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSubmitError("Chưa gửi được yêu cầu. Anh thử lại hoặc gọi hotline giúp em nhé.");
      return;
    }

    setSubmittedItems(selectedItems);
    reset();
    setSubmitted(true);
  });

  return (
    <section className="portal-layout">
      <div className="portal-layout__catalog">
        <div className="section-heading">
          <div className="eyebrow">Chọn sản phẩm</div>
          <h2 className="section-heading__title">Bấm thêm vào danh sách rồi gửi một lượt.</h2>
          <p className="section-heading__description">
            Khách có thể chọn đúng nhóm hàng, gom số lượng theo nhu cầu và gửi sang đội kinh doanh để nhận báo giá riêng.
          </p>
        </div>

        <div className="portal-grid">
          {products.map((item) => (
            <article key={item.slug} className="portal-card">
              <div className="portal-card__media">
                <Image
                  src={item.image ?? productImageBySlug[item.slug] ?? productImageBySlug["rau-cu-qua-tuoi-song"]}
                  alt={item.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 28vw"
                  className="portal-card__image"
                />
              </div>
              <div className="portal-card__body">
                <div className="portal-card__index">0{products.indexOf(item) + 1}</div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="portal-card__features">
                  {(item.features ?? []).slice(0, 3).map((feature) => (
                    <span key={feature}>{feature}</span>
                  ))}
                </div>
                <div className="portal-card__actions">
                  <Link href={`/san-pham/${item.slug}`} className="text-link">
                    Xem chi tiết <ArrowRight size={16} />
                  </Link>
                  <button type="button" className="btn-secondary" onClick={() => handleAddItem(item)}>
                    <ShoppingBag size={16} />
                    Thêm vào báo giá
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="portal-layout__panel">
        {submitted ? (
          <div className="portal-submit-status portal-submit-status--success" aria-live="polite">
            <div className="portal-submit-status__badge">
              <Sparkles size={16} />
              Đã gửi thành công
            </div>
            <strong>Đội ngũ đã nhận thông tin của anh.</strong>
            <p>Em sẽ dựa trên danh mục đã chọn, số lượng và khu vực giao để phản hồi phương án phù hợp.</p>
            {submittedItems.length ? (
              <div className="portal-submit-status__summary">
                <span>Đơn vừa gửi:</span>
                <strong>
                  {submittedItems.map((item) => `${item.title} x${item.quantity}`).join(" · ")}
                </strong>
              </div>
            ) : null}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                clearQuoteBasket();
                setBasket([]);
                setSubmitted(false);
                setSubmittedItems([]);
              }}
            >
              Gửi đơn mới
            </button>
          </div>
        ) : null}

        {submitError ? (
          <div className="portal-submit-status portal-submit-status--error" aria-live="polite">
            <strong>Chưa gửi được yêu cầu.</strong>
            <p>{submitError}</p>
          </div>
        ) : null}

        <div className="portal-panel">
          <div className="portal-panel__header">
            <div>
              <div className="portal-panel__eyebrow">Danh sách đã chọn</div>
              <h2>{selectedCount} sản phẩm trong báo giá</h2>
            </div>
            <button
              type="button"
              className="portal-panel__clear"
              onClick={() => {
                clearQuoteBasket();
                setBasket([]);
                setSubmitted(false);
                setSubmittedItems([]);
              }}
            >
              <Trash2 size={16} />
              Xóa tất cả
            </button>
          </div>

          {basket.length ? (
            <div className="portal-basket">
              {basket.map((item) => (
                <div key={item.slug} className="portal-basket__item">
                  <div className="portal-basket__copy">
                    <strong>{item.title}</strong>
                    <span>{item.summary ?? "Đã thêm vào danh sách báo giá"}</span>
                  </div>
                  <div className="portal-basket__controls">
                    <button type="button" onClick={() => handleSetQuantity(item.slug, item.quantity - 1)} aria-label="Giảm số lượng">
                      <Minus size={14} />
                    </button>
                    <strong>{item.quantity}</strong>
                    <button type="button" onClick={() => handleSetQuantity(item.slug, item.quantity + 1)} aria-label="Tăng số lượng">
                      <Plus size={14} />
                    </button>
                    <button type="button" onClick={() => handleRemove(item.slug)} aria-label="Xóa sản phẩm">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="portal-empty">
              <ShoppingBag size={22} />
              <p>Chưa có sản phẩm nào. Anh chọn hàng ở bên trái hoặc quay về trang sản phẩm.</p>
            </div>
          )}
        </div>

        <form className="portal-form" onSubmit={onSubmit}>
          <div className="portal-form__header">
            <div className="portal-form__eyebrow">Gửi yêu cầu báo giá</div>
            <p>Điền thông tin người liên hệ để đội ngũ chuẩn bị báo giá riêng theo danh mục đã chọn.</p>
          </div>

          <div className="portal-form__grid">
            <Field label="Họ tên" error={errors.name?.message} {...register("name")} />
            <Field label="Số điện thoại" error={errors.phone?.message} {...register("phone")} />
          </div>

          <div className="portal-form__grid">
            <Field label="Công ty" error={errors.company?.message} {...register("company")} />
            <Field label="Email" error={errors.email?.message} {...register("email")} />
          </div>

          <div className="portal-form__grid">
            <Field label="Khu vực giao" error={errors.deliveryArea?.message} {...register("deliveryArea")} />
            <Field label="Thời gian cần báo giá" error={errors.needBy?.message} {...register("needBy")} />
          </div>

          <div>
            <label className="portal-form__label">Ghi chú đơn hàng</label>
            <textarea
              {...register("message")}
              rows={5}
              className="lead-form__textarea"
              placeholder="Mô tả số lượng, quy cách, tần suất giao, yêu cầu đóng gói hoặc ngân sách dự kiến"
            />
            {errors.message?.message ? <p className="lead-form__error">{errors.message.message}</p> : null}
          </div>

          <button disabled={isSubmitting} className="btn-primary portal-form__button">
            {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu báo giá"}
            <Send size={18} />
          </button>

          <p className="portal-form__note">
            Bấm gửi là đội ngũ sẽ xem danh mục đã chọn và phản hồi theo số lượng, tuyến giao và tần suất mua hàng.
          </p>
        </form>
      </aside>
    </section>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

function Field({ label, error, ...props }: FieldProps) {
  return (
    <div>
      <label className="portal-form__label">{label}</label>
      <input {...props} className="lead-form__input" />
      {error ? <p className="lead-form__error">{error}</p> : null}
    </div>
  );
}
