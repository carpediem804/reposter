import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, color")
      .eq("user_id", session.user.id)
      .order("name");

    if (error) {
      return NextResponse.json(
        { error: "카테고리 조회 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: data || [] });
  } catch (e) {
    console.error("카테고리 조회 오류:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { name, color } = await request.json();
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed)
      return NextResponse.json({ error: "name 필요" }, { status: 400 });
    if (trimmed.length > 50) {
      return NextResponse.json(
        { error: "카테고리명은 50자 이하" },
        { status: 400 }
      );
    }

    // 중복 이름 검사 (대소문자 무시)
    const { data: dupCheck, error: dupError } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", session.user.id)
      .ilike("name", trimmed);

    if (!dupError && dupCheck && dupCheck.length > 0) {
      return NextResponse.json(
        { error: "이미 존재하는 카테고리명" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        user_id: session.user.id,
        name: trimmed,
        color: color || "violet",
      })
      .select("id, name, color")
      .single();

    if (error) {
      console.error("카테고리 생성 DB 오류:", error);
      return NextResponse.json(
        { error: "카테고리 생성 실패", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ category: data });
  } catch (e) {
    console.error("카테고리 생성 오류:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "서버 오류", details: errorMessage },
      { status: 500 }
    );
  }
}
