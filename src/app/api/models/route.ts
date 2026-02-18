import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import {
  getOpenRouterModels,
  isCuratedModel,
  getCuratedOrder,
} from "@/lib/openrouter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type OpenRouterDbRow = {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: { input: string; output: string; estimatedCost: string };
  features: string[];
  is_free: boolean;
  max_tokens: number;
  context_length: number;
  is_active: boolean;
};

function parseLimit(raw: string | null, fallback: number) {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

function isLikelyFreeModelId(id: string) {
  return id.includes(":free") || id.endsWith("-free");
}

async function syncCuratedModelsToDb() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY가 설정되어 있지 않습니다");
  }

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
      } satisfies OpenRouterDbRow;
    });

  const { error: deactivateError } = await supabase
    .from("ai_models")
    .update({ is_active: false })
    .eq("is_active", true);
  if (deactivateError) throw deactivateError;

  if (selected.length > 0) {
    const { error: upsertError } = await supabase
      .from("ai_models")
      .upsert(selected, { onConflict: "id" });
    if (upsertError) throw upsertError;
  }

  return {
    free: selected.filter((m) => m.is_free).length,
    paid: selected.filter((m) => !m.is_free).length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isFree = searchParams.get("is_free");
    const provider = searchParams.get("provider");
    const limit = parseLimit(searchParams.get("limit"), 50);
    const autoSync = searchParams.get("auto_sync") !== "false";

    let query = supabase
      .from("ai_models")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (isFree !== null) {
      query = query.eq("is_free", isFree === "true");
    }

    if (provider) {
      query = query.eq("provider", provider);
    }

    query = query.limit(limit);

    let { data: models, error } = await query;

    // DB가 비어있으면 큐레이션 모델 자동 동기화
    if (
      autoSync &&
      !error &&
      (!models || models.length === 0) &&
      process.env.OPENROUTER_API_KEY
    ) {
      try {
        await syncCuratedModelsToDb();
        const refreshed = await supabase
          .from("ai_models")
          .select("*")
          .eq("is_active", true)
          .order("name")
          .limit(limit);
        models = refreshed.data || [];
        error = refreshed.error;
      } catch (syncErr) {
        console.error("큐레이션 모델 자동 동기화 실패:", syncErr);
      }
    }

    if (error) {
      console.error("AI 모델 조회 오류:", error);
      return NextResponse.json(
        { error: "AI 모델을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    const sorted =
      models && models.length > 0
        ? [...models].sort(
            (a, b) => getCuratedOrder(a.id) - getCuratedOrder(b.id)
          )
        : models || [];

    return NextResponse.json({ models: sorted });
  } catch (error) {
    console.error("AI 모델 API 오류:", error);
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

    const {
      id,
      name,
      provider,
      description,
      pricing,
      features,
      isFree,
      maxTokens,
      contextLength,
    } = await request.json();

    // 필수 필드 검증
    if (!id || !name || !provider || !description) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ai_models")
      .insert({
        id,
        name,
        provider,
        description,
        pricing,
        features,
        is_free: isFree,
        max_tokens: maxTokens,
        context_length: contextLength,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("AI 모델 생성 오류:", error);
      return NextResponse.json(
        { error: "AI 모델을 생성하는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ model: data });
  } catch (error) {
    console.error("AI 모델 생성 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
