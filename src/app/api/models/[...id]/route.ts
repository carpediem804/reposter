import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 정적 생성 비활성화 (동적 라우트이므로)
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string[] }> }
) {
  try {
    const params = await context.params;
    const modelId = params.id.join("/");
    const { data: model, error } = await supabase
      .from("ai_models")
      .select("*")
      .eq("id", modelId)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "모델을 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      console.error("AI 모델 조회 오류:", error);
      return NextResponse.json(
        { error: "AI 모델을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ model });
  } catch (error) {
    console.error("AI 모델 조회 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string[] }> }
) {
  try {
    const params = await context.params;
    const modelId = params.id.join("/");
    const {
      name,
      provider,
      description,
      pricing,
      features,
      isFree,
      maxTokens,
      contextLength,
      isActive,
    } = await request.json();

    const updateData: {
      name?: string;
      provider?: string;
      description?: string;
      pricing?: { input: string; output: string; estimatedCost: string };
      features?: string[];
      is_free?: boolean;
      max_tokens?: number;
      context_length?: number;
      is_active?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (provider !== undefined) updateData.provider = provider;
    if (description !== undefined) updateData.description = description;
    if (pricing !== undefined) updateData.pricing = pricing;
    if (features !== undefined) updateData.features = features;
    if (isFree !== undefined) updateData.is_free = isFree;
    if (maxTokens !== undefined) updateData.max_tokens = maxTokens;
    if (contextLength !== undefined) updateData.context_length = contextLength;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: model, error } = await supabase
      .from("ai_models")
      .update(updateData)
      .eq("id", modelId)
      .select()
      .single();

    if (error) {
      console.error("AI 모델 수정 오류:", error);
      return NextResponse.json(
        { error: "AI 모델을 수정하는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ model });
  } catch (error) {
    console.error("AI 모델 수정 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string[] }> }
) {
  try {
    const params = await context.params;
    const modelId = params.id.join("/");
    // 실제 삭제 대신 is_active를 false로 설정 (소프트 삭제)
    const { error } = await supabase
      .from("ai_models")
      .update({ is_active: false })
      .eq("id", modelId);

    if (error) {
      console.error("AI 모델 삭제 오류:", error);
      return NextResponse.json(
        { error: "AI 모델을 삭제하는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "AI 모델이 삭제되었습니다" });
  } catch (error) {
    console.error("AI 모델 삭제 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
