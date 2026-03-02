import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Premium 승인 (관리자만). user_id 에 대해 premium_allowed = true 설정 후 신청 레코드 삭제 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }
    if (!(await isAdmin(session))) {
      return NextResponse.json({ error: "관리자만 접근할 수 있습니다" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : null;
    if (!userId) {
      return NextResponse.json({ error: "userId가 필요합니다" }, { status: 400 });
    }

    const { error: prefError } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          premium_allowed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (prefError) {
      console.error("user_preferences 업데이트 오류:", prefError);
      return NextResponse.json(
        { error: "승인 처리에 실패했습니다" },
        { status: 500 }
      );
    }

    await supabase.from("premium_requests").delete().eq("user_id", userId);

    return NextResponse.json({ ok: true, message: "승인되었습니다." });
  } catch (e) {
    console.error("POST /api/admin/premium-requests/approve 오류:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
