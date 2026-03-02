import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Premium 사용 신청. 이미 신청했거나 허용된 사용자는 200으로 스킵. */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { data: pref } = await supabase
      .from("user_preferences")
      .select("premium_allowed")
      .eq("user_id", session.user.id)
      .single();

    if (pref?.premium_allowed === true) {
      return NextResponse.json({ ok: true, message: "이미 Premium 사용 가능합니다." });
    }

    await supabase.from("premium_requests").upsert(
      { user_id: session.user.id },
      { onConflict: "user_id" }
    );

    return NextResponse.json({
      ok: true,
      message: "Premium 사용 신청이 접수되었습니다. 검토 후 연락드리겠습니다.",
    });
  } catch (error) {
    console.error("POST /api/user/premium-request 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
