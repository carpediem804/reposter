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
      .from("user_preferences")
      .select("default_model_id")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("사용자 기본 설정 조회 오류:", error);
      return NextResponse.json(
        { error: "사용자 기본 설정을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      defaultModelId: data?.default_model_id || null,
    });
  } catch (error) {
    console.error("GET /api/user/preferences 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { defaultModelId } = await request.json();
    if (!defaultModelId) {
      return NextResponse.json(
        { error: "defaultModelId가 필요합니다" },
        { status: 400 }
      );
    }

    // upsert
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: session.user.id,
          default_model_id: defaultModelId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("default_model_id")
      .single();

    if (error) {
      console.error("사용자 기본 모델 저장 오류:", error);
      return NextResponse.json(
        { error: "사용자 기본 모델을 저장하는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ defaultModelId: data.default_model_id });
  } catch (error) {
    console.error("PUT /api/user/preferences 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
