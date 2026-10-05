import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { generateCustomerStatement } from "@/lib/receivables-statement";
import { exportStatementToExcel } from "@/lib/receivables-excel";
import { exportStatementToPdf } from "@/lib/receivables-pdf";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  if (!canForProfile(auth.profile, "finance.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem sổ đối chiếu công nợ" }, 403);
  }

  const customerId = req.nextUrl.searchParams.get("customerId")?.trim();
  if (!customerId) {
    return json({ ok: false, error: "Thiếu ID khách hàng (customerId)" }, 400);
  }

  const from = req.nextUrl.searchParams.get("from") || undefined;
  const to = req.nextUrl.searchParams.get("to") || undefined;
  const format = (req.nextUrl.searchParams.get("format") || "json").toLowerCase();

  try {
    // 1. Kiểm tra quyền Sale trước khi sinh bản đối chiếu
    const isSale = auth.profile?.role === "sale";
    if (isSale) {
      const { getCustomerSupabaseAdmin } = await import("@/lib/customer-supabase-server");
      const supabase = getCustomerSupabaseAdmin();
      const { data: custCheck } = await supabase
        .from("vip_accounts")
        .select("id, sales_rep_id")
        .eq("id", customerId)
        .maybeSingle();

      if (!custCheck || !custCheck.sales_rep_id || custCheck.sales_rep_id !== auth.profile?.id) {
        return json({ ok: false, error: "Bạn không được phân công phụ trách khách hàng này" }, 403);
      }
    }

    const statement = await generateCustomerStatement({ customerId, from, to });

    if (format === "excel") {
      const buffer = await exportStatementToExcel(statement);
      const filename = `Doi_chieu_cong_no_${statement.customer.partnerCode}_${statement.period.fromDateStr.replace(/\//g, '')}_${statement.period.toDateStr.replace(/\//g, '')}.xlsx`;
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Access-Control-Expose-Headers": "Content-Disposition",
          ...corsHeaders,
        },
      });
    }

    if (format === "pdf") {
      const buffer = await exportStatementToPdf(statement);
      const filename = `Doi_chieu_cong_no_${statement.customer.partnerCode}_${statement.period.fromDateStr.replace(/\//g, '')}_${statement.period.toDateStr.replace(/\//g, '')}.pdf`;
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Access-Control-Expose-Headers": "Content-Disposition",
          ...corsHeaders,
        },
      });
    }

    return json({
      ok: true,
      statement,
    });
  } catch (error: any) {
    console.error("GET /api/admin/receivables/statement lỗi:", error);
    return json({ ok: false, error: error?.message || "Không thể tạo bản đối chiếu công nợ" }, 500);
  }
}
