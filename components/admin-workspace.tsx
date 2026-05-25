"use client";

import { useState } from "react";
import { BookOpenText, LockKeyhole, Newspaper, Package, ShieldCheck, Loader2 } from "lucide-react";
import { ADMIN_TOKEN_STORAGE_KEY } from "@/lib/admin-token";
import { NewsAdmin } from "@/components/news-admin";
import { ProductAdmin } from "@/components/product-admin";
import type { NewsArticle } from "@/lib/news";
import { KnowledgeAdmin } from "@/components/knowledge-admin";
import type { KnowledgeArticle } from "@/lib/knowledge";

type ManagedProduct = {
  slug: string;
  title: string;
  summary?: string;
  features?: string[];
  image?: string;
};

type AdminWorkspaceProps = {
  initialArticles: NewsArticle[];
  initialProducts: ManagedProduct[];
  initialKnowledge: KnowledgeArticle[];
};

type TabKey = "news" | "products" | "knowledge";

export function AdminWorkspace({ initialArticles, initialProducts, initialKnowledge }: AdminWorkspaceProps) {
  const [tokenInput, setTokenInput] = useState(() => readStoredToken());
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("news");
  const [unlocked, setUnlocked] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [tokenStatus, setTokenStatus] = useState("Nhập mật khẩu để mở quản trị.");

  async function validateToken(pwd: string) {
    if (!pwd.trim()) {
      setTokenStatus("Nhập mật khẩu để mở quản trị.");
      setUnlocked(false);
      return;
    }
    setIsValidating(true);
    setTokenStatus("Đang kiểm tra mật khẩu...");
    try {
      const res = await fetch("/api/admin/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: pwd.trim() }),
      });
      if (res.ok) {
        setToken(pwd.trim());
        setUnlocked(true);
        setTokenStatus("Mật khẩu đúng.");
      } else {
        setUnlocked(false);
        setTokenStatus("Mật khẩu chưa đúng.");
      }
    } catch (err) {
      setUnlocked(false);
      setTokenStatus("Lỗi kết nối đến máy chủ.");
    } finally {
      setIsValidating(false);
    }
  }

  function persistToken(value: string) {
    setTokenInput(value);
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, value);
    if (!value.trim()) {
      setTokenStatus("Nhập mật khẩu để mở quản trị.");
    } else {
      setTokenStatus("Nhấn 'Mở quản trị' để xác thực.");
    }
  }

  function unlock() {
    validateToken(tokenInput);
  }

  return (
    <section className="admin-workspace">
      <div className="admin-gate">
        <div>
          <div className="eyebrow">Quản trị nội dung</div>
          <h2>Một nơi để sửa tin tức, sản phẩm và kiến thức.</h2>
          <p>Nhập mật khẩu để mở khu quản trị. Sau khi mở, anh có thể chuyển giữa tin tức, sản phẩm và kiến thức trong cùng một khu vực.</p>
        </div>

        <div className="admin-token">
          <label>Mật khẩu quản trị</label>
          <input
            type="password"
            value={tokenInput}
            onChange={(event) => persistToken(event.target.value)}
            placeholder="Nhập mật khẩu"
            className="lead-form__input"
            disabled={isValidating}
          />
          <div className="admin-gate__status">
            {isValidating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShieldCheck size={16} />
            )}
            <span>{tokenStatus}</span>
          </div>
          <button type="button" className="btn-primary" onClick={unlock} disabled={isValidating}>
            {isValidating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LockKeyhole size={16} />
            )}
            {isValidating ? "Đang xác thực..." : "Mở quản trị"}
          </button>
        </div>
      </div>

      {unlocked ? (
        <div className="admin-workspace__body">
          <div className="admin-tabs" role="tablist" aria-label="Khu quan tri">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "news"}
              className={`admin-tab${activeTab === "news" ? " is-active" : ""}`}
              onClick={() => setActiveTab("news")}
            >
              <Newspaper size={16} />
              Tin tuc
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "products"}
              className={`admin-tab${activeTab === "products" ? " is-active" : ""}`}
              onClick={() => setActiveTab("products")}
            >
              <Package size={16} />
              San pham
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "knowledge"}
              className={`admin-tab${activeTab === "knowledge" ? " is-active" : ""}`}
              onClick={() => setActiveTab("knowledge")}
            >
              <BookOpenText size={16} />
              Kien thuc
            </button>
          </div>

          <div className="admin-workspace__panel">
            {activeTab === "news" ? (
              <NewsAdmin initialArticles={initialArticles} adminToken={token} hideTokenInput />
            ) : activeTab === "products" ? (
              <ProductAdmin initialProducts={initialProducts} adminToken={token} hideTokenInput />
            ) : (
              <KnowledgeAdmin initialArticles={initialKnowledge} adminToken={token} hideTokenInput />
            )}
          </div>
        </div>
      ) : (
        <div className="admin-lock">
          <div className="admin-lock__card">
            <ShieldCheck size={22} />
            <strong>Khu quan tri dang bi khoa</strong>
            <p>Nhap mat khau quan tri de mo khu sua noi dung.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function readStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}
