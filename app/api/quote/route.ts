import { NextResponse } from "next/server";
import { quoteSchema } from "@/lib/validation";
import { siteConfig } from "@/lib/site";
import { sendZNSTemplate } from "@/lib/zalo";

const QUOTE_NOTICE_COOKIE = "tps1_quote_notice_v1";

async function readLeadPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return req.json().catch(() => null);
  }

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData().catch(() => null);
    if (!formData) return null;

    const payloadRaw = formData.get("payload");
    let payload: Record<string, unknown> | null = null;

    if (typeof payloadRaw === "string" && payloadRaw.trim()) {
      try {
        payload = JSON.parse(payloadRaw) as Record<string, unknown>;
      } catch {
        payload = null;
      }
    }

    if (!payload) {
      const entries = Object.fromEntries(formData.entries());
      payload = Object.fromEntries(
        Object.entries(entries).map(([key, value]) => [key, typeof value === "string" ? value : ""]),
      );
    }

    const attachment = formData.get("attachment");
    if (attachment instanceof File && attachment.size > 0) {
      const allowedTypes = [
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
        "application/pdf", 
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv"
      ];
      const isSafeExt = attachment.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|csv|txt)$/);
      const isSafeType = attachment.type === "" ? isSafeExt : (allowedTypes.includes(attachment.type) || attachment.type.startsWith("image/"));

      if (!isSafeType && !isSafeExt) {
        payload.attachmentValidationFailed = true;
      } else {
        payload.attachmentName = attachment.name;
        payload.attachmentType = attachment.type || "application/octet-stream";
        payload.attachmentSize = String(attachment.size);

        const maxInlineBytes = 4 * 1024 * 1024;
        if (attachment.size <= maxInlineBytes) {
          const bytes = Buffer.from(await attachment.arrayBuffer());
          payload.attachmentDataUrl = `data:${payload.attachmentType};base64,${bytes.toString("base64")}`;
        } else {
          payload.attachmentTooLarge = "true";
        }
      }
    }

    return payload;
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

  if (body?.attachmentValidationFailed) {
    const notice = errorNotice("Loại file đính kèm không hợp lệ. Chỉ cho phép định dạng Hình ảnh, Word, Excel, PDF hoặc Text để đảm bảo an toàn.");
    if (!wantsJsonResponse(req)) return quoteRedirectResponse(req, notice);
    return NextResponse.json({ ok: false, error: notice.message }, { status: 400 });
  }

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
  const pagePath = typeof leadData.pagePath === "string" && leadData.pagePath.trim() ? leadData.pagePath.trim() : "/bao-gia";
  const payload = {
    vaiTro: inquiryType === "supplier" ? "Nhà cung cấp" : "Người mua",
    loaiForm: inquiryType === "supplier" ? "chao_hang" : "bao_gia",
    kenh: "Website",
    inquiryType,
    ...leadData,
    site: siteConfig.domain,
    source: `${siteConfig.domain}${pagePath.startsWith("/") ? pagePath : "/" + pagePath}`,
    submittedAt: new Date().toISOString(),
    selectedCount: leadData.selectedItems?.length ?? 0,
    selectedProducts: leadData.selectedItems
      ?.map((i) => `${i.title}${i.quantity ? ` x${i.quantity}` : ""}`)
      .join(", ") ?? "",
    rawPayload: JSON.stringify(parsed.data),
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
      phone: parsed.data.phone,
      company: parsed.data.company?.trim() || "Chưa ghi công ty",
      inquiryType: parsed.data.inquiryType,
      primaryNeed:
        parsed.data.inquiryType === "supplier"
          ? parsed.data.goodsServices || "Chào hàng chưa ghi rõ"
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

  // Gửi ZNS xác nhận tiếp nhận yêu cầu trong background
  if (parsed.data.phone && parsed.data.name) {
    const ZNS_LEAD_RECEIVED_TEMPLATE_ID = process.env.ZNS_LEAD_RECEIVED_TEMPLATE_ID || '555234';
    const znsTemplateData = {
      ten_khach_hang: parsed.data.name,
      nguon_dang_ky: 'Website TPS1',
      thoi_gian: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    };
    sendZNSTemplate(parsed.data.phone, ZNS_LEAD_RECEIVED_TEMPLATE_ID, znsTemplateData)
      .then((res) => console.log('Zalo ZNS website quote success response:', res))
      .catch((err) => console.error('Zalo ZNS website quote error:', err));
  }

  if (!wantsJsonResponse(req)) {
    return quoteRedirectResponse(req, notice);
  }

  return NextResponse.json({ ok: true, routed: true, selectedCount: payload.selectedCount, notice });
}
