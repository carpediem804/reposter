import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import {
  getOpenRouterModels,
  isCuratedModel,
} from "@/lib/openrouter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isLikelyFreeModelId(id: string) {
  return id.includes(":free") || id.endsWith("-free");
}

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

    const pref = await supabase
      .from("user_preferences")
      .select("default_model_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    const defaultModelId =
      typeof pref.data?.default_model_id === "string"
        ? pref.data.default_model_id
        : null;

    const raw = await getOpenRouterModels();

    const selected = raw
      .filter((m) => !!m?.id && !!m?.name && isCuratedModel(m.id))
      .map((m) => {
        const prompt = Number(m.pricing?.prompt ?? "NaN");
        const completion = Number(m.pricing?.completion ?? "NaN");
        const isFree =
          isLikelyFreeModelId(m.id) ||
          (Number.isFinite(prompt) &&
            Number.isFinite(completion) &&
            prompt === 0 &&
            completion === 0);

        const provider = m.id.includes("/") ? m.id.split("/")[0] : "unknown";

        return {
          id: m.id,
          name: m.name,
          provider,
          description: m.description || "",
          pricing: {
            input: String(m.pricing?.prompt ?? ""),
            output: String(m.pricing?.completion ?? ""),
            estimatedCost: isFree ? "무료" : "OpenRouter (변동)",
          },
          features: [
            m.architecture?.modality ? `modality:${m.architecture.modality}` : "",
            m.architecture?.tokenizer ? `tok:${m.architecture.tokenizer}` : "",
          ].filter(Boolean),
          is_free: isFree,
          max_tokens: m.top_provider?.max_completion_tokens ?? 4096,
          context_length: m.context_length ?? 0,
          is_active: true,
        };
      });

    if (selected.length === 0) {
      return NextResponse.json(
        { error: "모델 동기화 실패", details: "큐레이션 모델을 찾지 못했습니다." },
        { status: 500 }
      );
    }

    const { error: upsertError } = await supabase
      .from("ai_models")
      .upsert(selected, { onConflict: "id" });
    if (upsertError) throw upsertError;

    const { data: activeRows, error: activeListError } = await supabase
      .from("ai_models")
      .select("id")
      .eq("is_active", true);
    if (activeListError) throw activeListError;
    const selectedIds = new Set(selected.map((m) => m.id));
    const deactivateIds = (activeRows || [])
      .map((r: { id: string }) => r.id)
      .filter((id) => !selectedIds.has(id));
    if (deactivateIds.length > 0) {
      const { error: deactivateError } = await supabase
        .from("ai_models")
        .update({ is_active: false })
        .in("id", deactivateIds);
      if (deactivateError) throw deactivateError;
    }

    if (defaultModelId) {
      const stillActive = selected.some((m) => m.id === defaultModelId);
      if (!stillActive && selected.length > 0) {
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

