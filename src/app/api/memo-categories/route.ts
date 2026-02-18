import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { memoId, categoryIds } = await request.json();
    if (!memoId || !Array.isArray(categoryIds)) {
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
    }

    // 기존 매핑 삭제 후 일괄 삽입
    await supabase
      .from("memo_categories")
      .delete()
      .eq("memo_id", memoId)
      .eq("user_id", session.user.id);

    if (categoryIds.length > 0) {
      const rows = categoryIds.map((cid: string) => ({
        memo_id: memoId,
        category_id: cid,
        user_id: session.user.id,
      }));
      const { error } = await supabase.from("memo_categories").insert(rows);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("메모 카테고리 추가 오류:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
