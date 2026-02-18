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
  } = {}
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
      }
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
 * 큐레이션된 유명 모델 목록.
 * OpenRouter 동기화 시 이 목록에 매칭되는 모델만 포함됩니다.
 * order 값이 작을수록 UI에서 위에 표시됩니다.
 */
export const CURATED_FREE_MODELS: { id: string; order: number }[] = [
  { id: "deepseek/deepseek-r1-0528:free", order: 1 },
  { id: "openai/gpt-oss-120b:free", order: 2 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", order: 3 },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", order: 4 },
  { id: "qwen/qwen3-coder:free", order: 5 },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", order: 6 },
  { id: "google/gemma-3-27b-it:free", order: 7 },
  { id: "openai/gpt-oss-20b:free", order: 8 },
];

export const CURATED_PAID_MODELS: { id: string; order: number }[] = [
  { id: "anthropic/claude-opus-4.6", order: 1 },
  { id: "anthropic/claude-sonnet-4.6", order: 2 },
  { id: "openai/gpt-4.1", order: 3 },
  { id: "openai/o4-mini", order: 4 },
  { id: "google/gemini-2.5-pro", order: 5 },
  { id: "google/gemini-2.5-flash", order: 6 },
  { id: "x-ai/grok-4", order: 7 },
  { id: "x-ai/grok-3", order: 8 },
  { id: "deepseek/deepseek-r1-0528", order: 9 },
  { id: "openai/gpt-4.1-mini", order: 10 },
];

const ALL_CURATED_IDS = new Set([
  ...CURATED_FREE_MODELS.map((m) => m.id),
  ...CURATED_PAID_MODELS.map((m) => m.id),
]);

export function isCuratedModel(modelId: string): boolean {
  return ALL_CURATED_IDS.has(modelId);
}

export function getCuratedOrder(modelId: string): number {
  const free = CURATED_FREE_MODELS.find((m) => m.id === modelId);
  if (free) return free.order;
  const paid = CURATED_PAID_MODELS.find((m) => m.id === modelId);
  if (paid) return paid.order;
  return 999;
}

export function getOpenRouterModelId(ourModelId: string): string {
  return ourModelId;
}
