import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Premium 사용 신청 목록 (관리자만) */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }
    if (!(await isAdmin(session))) {
      return NextResponse.json({ error: "관리자만 접근할 수 있습니다" }, { status: 403 });
    }

    const { data: requests, error } = await supabase
      .from("premium_requests")
      .select("user_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("premium_requests 조회 오류:", error);
      return NextResponse.json(
        { error: "신청 목록을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    if (!requests?.length) {
      return NextResponse.json({ requests: [], users: {} });
    }

    const userIds = [...new Set(requests.map((r) => r.user_id))];
    const { data: users } = await supabase
      .from("users")
      .select("id, name, image, provider_id")
      .in("id", userIds);

    const usersMap: Record<string, { name: string; image?: string; provider_id?: string }> = {};
    users?.forEach((u) => {
      usersMap[u.id] = { name: u.name ?? "(이름 없음)", image: u.image ?? undefined, provider_id: u.provider_id };
    });

    return NextResponse.json({
      requests: requests.map((r) => ({ user_id: r.user_id, created_at: r.created_at })),
      users: usersMap,
    });
  } catch (e) {
    console.error("GET /api/admin/premium-requests 오류:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
