import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { data: chatSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .select(
        `
        *,
        ai_models (
          name,
          provider
        )
      `
      )
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (sessionError) {
      if (sessionError.code === "PGRST116") {
        return NextResponse.json(
          { error: "채팅 세션을 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      console.error("채팅 세션 조회 오류:", sessionError);
      return NextResponse.json(
        { error: "채팅 세션을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", params.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("메시지 조회 오류:", messagesError);
      return NextResponse.json(
        { error: "메시지를 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session: chatSession,
      messages,
    });
  } catch (error) {
    console.error("채팅 세션 조회 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { title } = await request.json();

    const { data: chatSession, error } = await supabase
      .from("chat_sessions")
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) {
      console.error("채팅 세션 수정 오류:", error);
      return NextResponse.json(
        { error: "채팅 세션을 수정하는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: chatSession });
  } catch (error) {
    console.error("채팅 세션 수정 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 먼저 메시지들 삭제
    const { error: messagesError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("session_id", params.id);

    if (messagesError) {
      console.error("메시지 삭제 오류:", messagesError);
      return NextResponse.json(
        { error: "메시지를 삭제하는데 실패했습니다" },
        { status: 500 }
      );
    }

    // 그 다음 세션 삭제
    const { error: sessionError } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", params.id)
      .eq("user_id", session.user.id);

    if (sessionError) {
      console.error("채팅 세션 삭제 오류:", sessionError);
      return NextResponse.json(
        { error: "채팅 세션을 삭제하는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "채팅 세션이 삭제되었습니다" });
  } catch (error) {
    console.error("채팅 세션 삭제 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
