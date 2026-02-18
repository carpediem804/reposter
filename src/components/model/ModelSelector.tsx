"use client";
import { useEffect } from "react";
import { AIModel } from "@/types";
import {
  useFreeModels,
  usePaidModels,
  useUserDefaultModel,
} from "@/hooks/useModels";

interface ModelSelectorProps {
  onModelSelectAction: (model: AIModel) => void;
  selectedModel?: AIModel;
}

export default function ModelSelector({
  onModelSelectAction,
  selectedModel,
}: ModelSelectorProps) {
  const { data: freeModels = [], isLoading: isLoadingFree } = useFreeModels();
  const { data: paidModels = [], isLoading: isLoadingPaid } = usePaidModels();
  const { data: defaultModel } = useUserDefaultModel();

  useEffect(() => {
    if (!selectedModel && defaultModel) {
      onModelSelectAction(defaultModel);
    }
  }, [defaultModel, selectedModel, onModelSelectAction]);

  const isLoading = isLoadingFree || isLoadingPaid;

  const renderGrid = (models: AIModel[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
      {models.map((model) => (
        <button
          key={model.id}
          onClick={async () => {
            onModelSelectAction(model);
            try {
              await fetch("/api/user/preferences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ defaultModelId: model.id }),
              });
            } catch {}
          }}
          className={`text-left relative p-4 sm:p-5 rounded-xl border transition-all duration-200 hover:shadow-md ${
            selectedModel?.id === model.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-start justify-between mb-1 sm:mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {model.name}
              </h3>
              <p className="text-sm text-gray-600">{model.provider}</p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                model.isFree
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {model.isFree ? "🆓 무료" : "💰 유료"}
            </div>
          </div>
          <p className="text-gray-700 text-sm mb-2 sm:mb-3 leading-relaxed line-clamp-2 sm:line-clamp-3">
            {model.description}
          </p>
          <div className="border-t border-gray-100 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">예상 비용:</span>
              <span
                className={`font-medium ${
                  model.isFree ? "text-green-600" : "text-orange-600"
                }`}
              >
                {model.pricing.estimatedCost}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>컨텍스트:</span>
              <span>{model.contextLength.toLocaleString()} tokens</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">모델을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-base font-semibold text-gray-900">
            🆓 무료 모델
          </h4>
          <span className="text-xs text-gray-500">{freeModels.length}개</span>
        </div>
        {renderGrid(freeModels)}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-base font-semibold text-gray-900">
            💰 유료 모델
          </h4>
          <span className="text-xs text-gray-500">{paidModels.length}개</span>
        </div>
        {renderGrid(paidModels)}
      </div>
    </div>
  );
}
