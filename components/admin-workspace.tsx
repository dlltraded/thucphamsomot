"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, LockKeyhole, Newspaper, Package, ShieldCheck } from "lucide-react";
import { DEFAULT_ADMIN_TOKEN, ADMIN_TOKEN_STORAGE_KEY } from "@/lib/admin-token";
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
  const [tokenInput, setTokenInput] = useState("");
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("news");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
    if (savedToken) {
      setTokenInput(savedToken);
      setToken(savedToken);
      setUnlocked(savedToken === DEFAULT_ADMIN_TOKEN);
    }
  }, []);

  function persistToken(value: string) {
    setTokenInput(value);
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, value);
  }

  function unlock() {
    const value = tokenInput.trim();
    setToken(value);
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, value);
    setUnlocked(value === DEFAULT_ADMIN_TOKEN);
  }

  const tokenStatus = useMemo(() => {
    if (!tokenInput.trim()) return "Nhap mat khau de mo quan tri.";
    return tokenInput.trim() === DEFAULT_ADMIN_TOKEN ? "Mat khau dung." : "Mat khau chua dung.";
  }, [tokenInput]);

  return (
    <section className="admin-workspace">
      <div className="admin-gate">
        <div>
          <div className="eyebrow">Quan tri noi dung</div>
          <h2>Mot noi de sua tin tuc, san pham va kien thuc.</h2>
          <p>Nhap mat khau de mo khu quan tri. Sau khi mo, anh co the chuyen giua tin tuc, san pham va kien thuc trong cung mot khu vuc.</p>
        </div>

        <div className="admin-token">
          <label>Mat khau quan tri</label>
          <input
            type="password"
            value={tokenInput}
            onChange={(event) => persistToken(event.target.value)}
            placeholder="Nhap mat khau"
            className="lead-form__input"
          />
          <div className="admin-gate__status">
            <ShieldCheck size={16} />
            <span>{tokenStatus}</span>
          </div>
          <button type="button" className="btn-primary" onClick={unlock}>
            <LockKeyhole size={16} />
            Mo quan tri
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
