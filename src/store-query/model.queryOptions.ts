import { queryOptions } from "@tanstack/react-query";
import { AIModel } from "@/types";

type DbModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: { input: string; output: string; estimatedCost: string };
  features: string[];
  is_free: boolean;
  max_tokens: number;
  context_length: number;
};

export const modelQueryKeys = {
  all: ["models"] as const,
  free: () => [...modelQueryKeys.all, "free"] as const,
  paid: () => [...modelQueryKeys.all, "paid"] as const,
  byId: (id: string) => [...modelQueryKeys.all, id] as const,
  userDefault: () => [...modelQueryKeys.all, "userDefault"] as const,
};

export const modelQueryOptions = {
  free: () =>
    queryOptions<AIModel[]>({
      queryKey: modelQueryKeys.free(),
      queryFn: async () => {
        const res = await fetch(`/api/models?is_free=true&limit=10`);
        if (!res.ok) throw new Error("무료 모델 로드 실패");
        const data = await res.json();
        return data.models.map((m: DbModel) => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          description: m.description,
          pricing: m.pricing,
          features: m.features,
          isFree: m.is_free,
          maxTokens: m.max_tokens,
          contextLength: m.context_length,
        })) as AIModel[];
      },
      staleTime: 1000 * 60,
    }),
  paid: () =>
    queryOptions<AIModel[]>({
      queryKey: modelQueryKeys.paid(),
      queryFn: async () => {
        const res = await fetch(`/api/models?is_free=false&limit=10`);
        if (!res.ok) throw new Error("유료 모델 로드 실패");
        const data = await res.json();
        return data.models.map((m: DbModel) => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          description: m.description,
          pricing: m.pricing,
          features: m.features,
          isFree: m.is_free,
          maxTokens: m.max_tokens,
          contextLength: m.context_length,
        })) as AIModel[];
      },
      staleTime: 1000 * 60,
    }),
  byId: (id: string) =>
    queryOptions<AIModel | null>({
      queryKey: modelQueryKeys.byId(id),
      queryFn: async () => {
        const res = await fetch(`/api/models/${id}`);
        if (!res.ok) return null;
        const data = await res.json();
        const m = data.model;
        return {
          id: m.id,
          name: m.name,
          provider: m.provider,
          description: m.description,
          pricing: m.pricing,
          features: m.features,
          isFree: m.is_free,
          maxTokens: m.max_tokens,
          contextLength: m.context_length,
        } as AIModel;
      },
      enabled: !!id,
    }),
  userDefault: () =>
    queryOptions<AIModel | null>({
      queryKey: modelQueryKeys.userDefault(),
      queryFn: async () => {
        const prefRes = await fetch(`/api/user/preferences`);
        if (!prefRes.ok) return null;
        const pref = await prefRes.json();
        const id = pref.defaultModelId as string | null;
        if (!id) return null;
        const res = await fetch(`/api/models/${id}`);
        if (!res.ok) return null;
        const data = await res.json();
        const m = data.model;
        return {
          id: m.id,
          name: m.name,
          provider: m.provider,
          description: m.description,
          pricing: m.pricing,
          features: m.features,
          isFree: m.is_free,
          maxTokens: m.max_tokens,
          contextLength: m.context_length,
        } as AIModel;
      },
      staleTime: 1000 * 60,
    }),
};
