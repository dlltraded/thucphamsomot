import { NextResponse } from "next/server";
import { quoteSchema } from "@/lib/validation";
import { siteConfig } from "@/lib/site";

const QUOTE_NOTICE_COOKIE = "tps1_quote_notice_v1";

async function readLeadPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return req.json().catch(() => null);
  }

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData().catch(() => null);
    if (!formData) return null;

    const entries = Object.fromEntries(formData.entries());
    return Object.fromEntries(
      Object.entries(entries).map(([key, value]) => [key, typeof value === "string" ? value : ""]),
    );
  }

  return req.json().catch(() => null);
}

function wantsJsonResponse(req: Request) {
  const accept = req.headers.get("accept") ?? "";
  const contentType = req.headers.get("content-type") ?? "";
  return accept.includes("application/json") || contentType.includes("application/json");
}

function quoteRedirectResponse(req: Request, notice: unknown) {
  const response = NextResponse.redirect(new URL("/bao-gia", req.url), 303);
  response.cookies.set(QUOTE_NOTICE_COOKIE, JSON.stringify(notice), {
    path: "/bao-gia",
    sameSite: "lax",
    maxAge: 300,
  });
  return response;
}

function errorNotice(message: string) {
  return { kind: "error" as const, message };
}

export async function POST(req: Request) {
  const body = await readLeadPayload(req);
  const normalizedBody =
    body && typeof body === "object" && !Array.isArray(body)
      ? { inquiryType: "buyer", ...body }
      : body;
  const parsed = quoteSchema.safeParse(normalizedBody);

  if (!parsed.success) {
    const notice = errorNotice("Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại thông tin hoặc gọi hotline để được hỗ trợ ngay.");

    if (!wantsJsonResponse(req)) {
      return quoteRedirectResponse(req, notice);
    }

    return NextResponse.json({ ok: false, error: notice.message, errors: parsed.error.flatten() }, { status: 400 });
  }

  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    const notice = errorNotice("Thiếu cấu hình GOOGLE_SHEET_WEBHOOK_URL. Vui lòng gọi hotline để được hỗ trợ ngay.");

    if (!wantsJsonResponse(req)) {
      return quoteRedirectResponse(req, notice);
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Missing GOOGLE_SHEET_WEBHOOK_URL",
        message: notice.message,
        hint: "Configure a Google Apps Script web app URL in Vercel project settings or .env.local for local dev.",
      },
      { status: 500 },
    );
  }

  const { inquiryType, ...leadData } = parsed.data;
  const payload = {
    vaiTro: inquiryType === "supplier" ? "Nhà cung cấp" : "Người mua",
    loaiForm: "Báo giá / chào hàng",
    kenh: "Website",
    inquiryType,
    ...leadData,
    site: siteConfig.domain,
    source: `${siteConfig.domain}/bao-gia`,
    submittedAt: new Date().toISOString(),
    selectedCount: leadData.selectedItems?.length ?? 0,
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text().catch(() => "");
  const contentType = response.headers.get("content-type") ?? "";
  const looksLikeJson = contentType.includes("application/json") || text.trim().startsWith("{");

  if (!response.ok || !looksLikeJson) {
    const notice = errorNotice("Không ghi được dữ liệu lên Google Sheet. Vui lòng gọi hotline để được hỗ trợ ngay.");

    if (!wantsJsonResponse(req)) {
      return quoteRedirectResponse(req, notice);
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to forward lead to Google Sheet webhook",
        message: notice.message,
        details: text.slice(0, 200),
      },
      { status: 502 },
    );
  }

  try {
    const data = JSON.parse(text) as { ok?: boolean };
    if (data.ok !== true) {
      const notice = errorNotice("Google Sheet webhook chưa xác nhận thành công. Vui lòng gọi hotline để được hỗ trợ ngay.");

      if (!wantsJsonResponse(req)) {
        return quoteRedirectResponse(req, notice);
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Google Sheet webhook returned a non-success payload",
          message: notice.message,
          details: text.slice(0, 200),
        },
        { status: 502 },
      );
    }
  } catch {
    const notice = errorNotice("Google Sheet webhook trả về dữ liệu không hợp lệ. Vui lòng gọi hotline để được hỗ trợ ngay.");

    if (!wantsJsonResponse(req)) {
      return quoteRedirectResponse(req, notice);
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Google Sheet webhook did not return valid JSON",
        message: notice.message,
        details: text.slice(0, 200),
      },
      { status: 502 },
    );
  }

  const notice = {
    kind: "success" as const,
    summary: {
      name: parsed.data.name,
      company: parsed.data.company?.trim() || "Chưa ghi công ty",
      inquiryType: parsed.data.inquiryType,
      primaryNeed:
        parsed.data.inquiryType === "supplier"
          ? parsed.data.offeredProducts || "Chào hàng chưa ghi rõ"
          : parsed.data.interestedIn || "Nhóm hàng chưa ghi rõ",
      secondaryNeed:
        parsed.data.inquiryType === "supplier"
          ? parsed.data.supplyArea
            ? `Khu vực cung ứng: ${parsed.data.supplyArea}`
            : "Khu vực cung ứng: chưa ghi"
          : parsed.data.deliveryArea
            ? `Khu vực giao: ${parsed.data.deliveryArea}`
            : "Khu vực giao: chưa ghi",
    },
  };

  if (!wantsJsonResponse(req)) {
    return quoteRedirectResponse(req, notice);
  }

  return NextResponse.json({ ok: true, routed: true, selectedCount: payload.selectedCount, notice });
}
