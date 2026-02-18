import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: sessions, error } = await supabase
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
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("채팅 세션 조회 오류:", error);
      return NextResponse.json(
        { error: "채팅 세션을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("채팅 세션 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { title, modelId } = await request.json();

    if (!title || !modelId) {
      return NextResponse.json(
        { error: "제목과 모델이 필요합니다" },
        { status: 400 }
      );
    }

    const { data: chatSession, error } = await supabase
      .from("chat_sessions")
      .insert({
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: session.user.id,
        title,
        model_id: modelId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("채팅 세션 생성 오류:", error);
      return NextResponse.json(
        { error: "채팅 세션을 생성하는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: chatSession });
  } catch (error) {
    console.error("채팅 세션 생성 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
