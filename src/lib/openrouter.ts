export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  // OpenRouter 응답에 있을 수 있는 추가 필드들(버전/시점마다 다를 수 있어 optional)
  created?: number;
  created_at?: string;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string;
  };
  top_provider: {
    max_completion_tokens: number;
    is_moderated: boolean;
  };
  per_request_limits: {
    prompt_tokens: string;
    completion_tokens: string;
  };
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function getOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("모델 목록을 불러오는데 실패했습니다");
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("OpenRouter 모델 조회 오류:", error);
    return [];
  }
}

export async function callOpenRouterAPI(
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  options: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  } = {},
): Promise<OpenRouterResponse> {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "AI Memo Chat",
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 1,
          stream: false,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "API 호출에 실패했습니다");
    }

    return await response.json();
  } catch (error) {
    console.error("OpenRouter API 호출 오류:", error);
    throw error;
  }
}

/**
 * 큐레이션된 무료 모델. (OpenRouter :free 는 테스트/불안정이라 비움 → 저렴 유료만 사용)
 * 동기화 시 이 목록에 있는 모델만 DB에 포함됩니다.
 */
export const CURATED_FREE_MODELS: { id: string; order: number }[] = [];

/**
 * 큐레이션된 유료 모델. order 작을수록 UI 상단.
 * 상단 = 엄청 싼/오래된 모델, 아래 = 고가(신청 후 사용).
 */
export const CURATED_PAID_MODELS: { id: string; order: number }[] = [
  // === 신청 없이 쓸 수 있는 초저가 모델만 (아래 화이트리스트와 일치) ===
  { id: "openai/gpt-3.5-turbo", order: 1 },
  { id: "openai/gpt-4o-mini", order: 2 },
  { id: "google/gemini-2.0-flash", order: 3 },
  { id: "google/gemini-flash-1.5", order: 4 },
  { id: "openai/gpt-4.1-mini", order: 6 },
  // === Premium(신청·승인 후 사용) ===
  { id: "google/gemini-2.5-flash", order: 11 },
  { id: "anthropic/claude-sonnet-4.6", order: 12 },
  { id: "anthropic/claude-opus-4.6", order: 13 },
  { id: "openai/gpt-4.1", order: 14 },
  { id: "openai/o4-mini", order: 15 },
  { id: "google/gemini-2.5-pro", order: 16 },
  { id: "x-ai/grok-4", order: 17 },
  { id: "x-ai/grok-3", order: 18 },
];

/**
 * 신청 없이 쓸 수 있는 모델 접두사. OpenRouter가 버전 접미사(예: -2024-07-18)를 붙이므로 접두사로 비교.
 */
const ALLOWED_WITHOUT_PREMIUM_PREFIXES = [
  "openai/gpt-3.5-turbo",
  "openai/gpt-4o-mini",
  "openai/gpt-4.1-mini",
  "google/gemini-2.0-flash",
  "google/gemini-flash-1.5",
];

/**
 * 기본 추천 모델 접두사. 이 순서로 첫 번째로 존재하는 모델을 자동 선택.
 */
export const DEFAULT_MODEL_IDS: string[] = [
  "openai/gpt-3.5-turbo",
  "openai/gpt-4o-mini",
  "openai/gpt-4.1-mini",
  "google/gemini-2.0-flash",
  "google/gemini-flash-1.5",
];

/** OpenRouter id가 접두사와 일치하는지 (버전 접미사 대응). */
export function modelIdMatchesPrefix(modelId: string, prefix: string): boolean {
  return modelId === prefix || modelId.startsWith(prefix + "-") || modelId.startsWith(prefix + ":");
}

/**
 * Premium 모델 = 위 접두사에 해당하지 않으면 전부 Premium.
 */
export function isPremiumModel(modelId: string): boolean {
  return !ALLOWED_WITHOUT_PREMIUM_PREFIXES.some((p) => modelIdMatchesPrefix(modelId, p));
}

/**
 * OpenRouter id가 큐레이션 목록에 포함되는지. 접두사 매칭(버전 접미사 대응).
 */
export function isCuratedModel(modelId: string): boolean {
  const fromFree = CURATED_FREE_MODELS.some((m) => modelId === m.id || modelId.startsWith(m.id + "-") || modelId.startsWith(m.id + ":"));
  if (fromFree) return true;
  return CURATED_PAID_MODELS.some((m) => modelId === m.id || modelId.startsWith(m.id + "-") || modelId.startsWith(m.id + ":"));
}

export function getCuratedOrder(modelId: string): number {
  const free = CURATED_FREE_MODELS.find((m) => modelId === m.id || modelId.startsWith(m.id + "-") || modelId.startsWith(m.id + ":"));
  if (free) return free.order;
  const paid = CURATED_PAID_MODELS.find((m) => modelId === m.id || modelId.startsWith(m.id + "-") || modelId.startsWith(m.id + ":"));
  if (paid) return paid.order;
  return 999;
}

export function getOpenRouterModelId(ourModelId: string): string {
  return ourModelId;
}
