import { AIModel } from "@/types";

export async function fetchModels(
  isFree?: boolean,
  options: { limit?: number } = {}
): Promise<AIModel[]> {
  try {
    const params = new URLSearchParams();
    if (isFree !== undefined) {
      params.append("is_free", isFree.toString());
    }
    params.append("limit", String(options.limit ?? 10));

    const response = await fetch(`/api/models?${params.toString()}`);
    if (!response.ok) {
      throw new Error("모델을 불러오는데 실패했습니다");
    }

    const data = await response.json();
    return data.models.map(
      (model: {
        id: string;
        name: string;
        provider: string;
        description: string;
        pricing: { input: string; output: string; estimatedCost: string };
        features: string[];
        is_free: boolean;
        max_tokens: number;
        context_length: number;
      }) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        description: model.description,
        pricing: model.pricing,
        features: model.features,
        isFree: model.is_free,
        maxTokens: model.max_tokens,
        contextLength: model.context_length,
      })
    );
  } catch (error) {
    console.error("모델 조회 오류:", error);
    return [];
  }
}

export async function fetchModelById(id: string): Promise<AIModel | null> {
  try {
    const response = await fetch(`/api/models/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("모델을 불러오는데 실패했습니다");
    }

    const data = await response.json();
    const model = data.model;

    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      description: model.description,
      pricing: model.pricing,
      features: model.features,
      isFree: model.is_free,
      maxTokens: model.max_tokens,
      contextLength: model.context_length,
    };
  } catch (error) {
    console.error("모델 조회 오류:", error);
    return null;
  }
}

export async function createModel(
  modelData: Omit<AIModel, "id"> & { id: string }
): Promise<AIModel | null> {
  try {
    const response = await fetch("/api/models", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: modelData.id,
        name: modelData.name,
        provider: modelData.provider,
        description: modelData.description,
        pricing: modelData.pricing,
        features: modelData.features,
        isFree: modelData.isFree,
        maxTokens: modelData.maxTokens,
        contextLength: modelData.contextLength,
      }),
    });

    if (!response.ok) {
      throw new Error("모델 생성에 실패했습니다");
    }

    const data = await response.json();
    const model = data.model;

    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      description: model.description,
      pricing: model.pricing,
      features: model.features,
      isFree: model.is_free,
      maxTokens: model.max_tokens,
      contextLength: model.context_length,
    };
  } catch (error) {
    console.error("모델 생성 오류:", error);
    return null;
  }
}

export async function updateModel(
  id: string,
  updates: Partial<AIModel>
): Promise<AIModel | null> {
  try {
    const response = await fetch(`/api/models/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: updates.name,
        provider: updates.provider,
        description: updates.description,
        pricing: updates.pricing,
        features: updates.features,
        isFree: updates.isFree,
        maxTokens: updates.maxTokens,
        contextLength: updates.contextLength,
      }),
    });

    if (!response.ok) {
      throw new Error("모델 수정에 실패했습니다");
    }

    const data = await response.json();
    const model = data.model;

    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      description: model.description,
      pricing: model.pricing,
      features: model.features,
      isFree: model.is_free,
      maxTokens: model.max_tokens,
      contextLength: model.context_length,
    };
  } catch (error) {
    console.error("모델 수정 오류:", error);
    return null;
  }
}

export async function deleteModel(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/models/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("모델 삭제에 실패했습니다");
    }

    return true;
  } catch (error) {
    console.error("모델 삭제 오류:", error);
    return false;
  }
}
