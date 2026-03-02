import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import {
  getOpenRouterModels,
  isCuratedModel,
  modelIdMatchesPrefix,
  isPremiumModel,
} from "@/lib/openrouter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY가 설정되어 있지 않습니다" },
        { status: 400 }
      );
    }

    await request.json().catch(() => ({}));

    const { data: prefData } = await supabase
      .from("user_preferences")
      .select("default_model_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    const defaultModelId =
      typeof prefData?.default_model_id === "string" ? prefData.default_model_id : null;

    const raw = await getOpenRouterModels();
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { error: "모델 동기화 실패", details: "OpenRouter에서 모델 목록을 가져오지 못했습니다. API 키를 확인하세요." },
        { status: 500 }
      );
    }

    const selected = raw
      .filter((m) => !!m?.id && !!m?.name && isCuratedModel(m.id))
      .map((m) => {
        const provider = m.id.includes("/") ? m.id.split("/")[0] : "unknown";
        const name = (m.name || m.id || "").slice(0, 100);
        const description = (m.description || "").slice(0, 5000);
        const features = [
          m.architecture?.modality ? `modality:${m.architecture.modality}` : "",
          m.architecture?.tokenizer ? `tok:${m.architecture.tokenizer}` : "",
        ].filter(Boolean);
        if (features.length === 0) features.push("chat");
        const isFree = !isPremiumModel(m.id);

        return {
          id: m.id,
          name,
          provider,
          description,
          pricing: {
            input: String(m.pricing?.prompt ?? ""),
            output: String(m.pricing?.completion ?? ""),
            estimatedCost: isFree ? "저렴" : "OpenRouter (변동)",
          },
          features,
          is_free: isFree,
          max_tokens: Number(m.top_provider?.max_completion_tokens) || 4096,
          context_length: Number(m.context_length) || 0,
          is_active: true,
        };
      });

    if (selected.length === 0) {
      return NextResponse.json(
        { error: "모델 동기화 실패", details: "큐레이션 모델을 찾지 못했습니다." },
        { status: 500 }
      );
    }

    // 1) 기존 모델 전부 비활성화 (무료 등 더 이상 큐레이션에 없는 모델 제거)
    const { error: deactivateAllError } = await supabase
      .from("ai_models")
      .update({ is_active: false })
      .eq("is_active", true);
    if (deactivateAllError) throw deactivateAllError;

    // 2) 큐레이션된 모델만 upsert 후 활성화
    const { error: upsertError } = await supabase
      .from("ai_models")
      .upsert(selected, { onConflict: "id" });
    if (upsertError) throw upsertError;

    if (defaultModelId && selected.length > 0) {
      const stillActive = selected.some(
        (m) => m.id === defaultModelId || modelIdMatchesPrefix(m.id, defaultModelId)
      );
      if (!stillActive) {
        await supabase
          .from("user_preferences")
          .upsert(
            { user_id: session.user.id, default_model_id: selected[0].id },
            { onConflict: "user_id" }
          );
      }
    }

    const freeCount = selected.filter((m) => m.is_free).length;
    const paidCount = selected.filter((m) => !m.is_free).length;

    return NextResponse.json({
      success: true,
      synced: {
        free: freeCount,
        paid: paidCount,
        total: selected.length,
      },
    });
  } catch (e) {
    console.error("모델 동기화 오류:", e);
    return NextResponse.json(
      { error: "모델 동기화 실패", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

