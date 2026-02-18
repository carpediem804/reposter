import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;
    const { name, color } = await request.json();

    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) {
      return NextResponse.json({ error: "name 필요" }, { status: 400 });
    }
    if (trimmed.length > 50) {
      return NextResponse.json(
        { error: "카테고리명은 50자 이하" },
        { status: 400 }
      );
    }

    // 자기 자신 제외, 사용자 내 중복 이름 검사 (대소문자 무시)
    const { data: dupCheck } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", session.user.id)
      .ilike("name", trimmed);

    if (dupCheck && dupCheck.some((c) => c.id !== id)) {
      return NextResponse.json(
        { error: "이미 존재하는 카테고리명" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .update({ name: trimmed, color: color || "violet" })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("id, name, color")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "카테고리 수정 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ category: data });
  } catch (e) {
    console.error("카테고리 수정 오류:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;

    // 먼저 해당 카테고리에 속한 메모 개수 확인
    const { data: memos, error: memosError } = await supabase
      .from("memos")
      .select("id, title")
      .eq("category_id", id)
      .eq("user_id", session.user.id);

    if (memosError) {
      return NextResponse.json({ error: "메모 조회 실패" }, { status: 500 });
    }

    // 카테고리에 속한 메모가 있으면 함께 삭제
    if (memos && memos.length > 0) {
      const { error: deleteMemosError } = await supabase
        .from("memos")
        .delete()
        .eq("category_id", id)
        .eq("user_id", session.user.id);

      if (deleteMemosError) {
        return NextResponse.json({ error: "메모 삭제 실패" }, { status: 500 });
      }
    }

    // 카테고리 삭제
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      return NextResponse.json(
        { error: "카테고리 삭제 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedMemosCount: memos?.length || 0,
    });
  } catch (e) {
    console.error("카테고리 삭제 오류:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
