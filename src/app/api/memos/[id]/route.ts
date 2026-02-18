import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js";
import { Memo } from "@/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UpdateMemoRequest {
  title: string;
  content: string;
  tags?: string[];
}

// 메모 조회
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ memo: Memo } | { message: string }>> {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: memo, error } = await supabase
      .from("memos")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (error) throw error;
    if (!memo) {
      return NextResponse.json({ message: "Memo not found" }, { status: 404 });
    }

    return NextResponse.json({ memo });
  } catch (error) {
    console.error("Error fetching memo:", error);
    return NextResponse.json(
      { message: "Error fetching memo" },
      { status: 500 }
    );
  }
}

// 메모 수정
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ memo: Memo } | { message: string }>> {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: UpdateMemoRequest = await request.json();
    const { title, content, tags } = body;

    // 먼저 메모가 현재 사용자의 것인지 확인
    const { data: existingMemo, error: checkError } = await supabase
      .from("memos")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (checkError || !existingMemo) {
      return NextResponse.json({ message: "Memo not found" }, { status: 404 });
    }

    const { data: memo, error } = await supabase
      .from("memos")
      .update({
        title,
        content,
        tags: tags || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ memo });
  } catch (error) {
    console.error("Error updating memo:", error);
    return NextResponse.json(
      { message: "Error updating memo" },
      { status: 500 }
    );
  }
}

// 메모 삭제
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ success: boolean } | { message: string }>> {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from("memos")
      .delete()
      .eq("id", params.id)
      .eq("user_id", session.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting memo:", error);
    return NextResponse.json(
      { message: "Error deleting memo" },
      { status: 500 }
    );
  }
}
