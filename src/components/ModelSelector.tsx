"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AIModel } from "@/types";
import { fetchModels } from "@/lib/modelService";

interface ModelSelectorProps {
  onModelSelectAction: (model: AIModel) => void;
  selectedModel?: AIModel;
  isSimple?: boolean; // 간단한 모드 (채팅 페이지용)
}

export default function ModelSelector({
  onModelSelectAction,
  selectedModel,
  isSimple = false,
}: ModelSelectorProps) {
  const [activeTab, setActiveTab] = useState<"free" | "paid">("free");
  const [freeModels, setFreeModels] = useState<AIModel[]>([]);
  const [paidModels, setPaidModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const onModelSelectRef = useRef(onModelSelectAction);
  onModelSelectRef.current = onModelSelectAction;

  const loadInitial = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [freeData, paidData] = await Promise.all([
        fetchModels(true, { limit: 10 }),
        fetchModels(false, { limit: 10 }),
      ]);

      if (freeData.length === 0 && paidData.length === 0) {
        setError("모델이 없습니다. 'OpenRouter 최신 모델 동기화' 버튼을 눌러주세요.");
      }

      setFreeModels(freeData);
      setPaidModels(paidData);

      try {
        const prefRes = await fetch("/api/user/preferences");
        if (prefRes.ok) {
          const { defaultModelId } = await prefRes.json();
          if (defaultModelId) {
            const all = [...freeData, ...paidData];
            const found = all.find((m) => m.id === defaultModelId);
            if (found) {
              onModelSelectRef.current(found);
            }
          }
        }
      } catch (prefErr) {
        console.warn("기본 모델 조회 실패:", prefErr);
      }
    } catch (err) {
      console.error("모델 로딩 오류:", err);
      const errorMessage = err instanceof Error ? err.message : "모델을 불러오는데 실패했습니다";
      setError(errorMessage);
      setFreeModels([]);
      setPaidModels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError("");
      const res = await fetch("/api/models/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keepIds: selectedModel?.id ? [selectedModel.id] : [],
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (data && (data.error || data.details)) ||
          "모델 동기화에 실패했습니다";
        setError(typeof msg === "string" ? msg : "모델 동기화 실패");
        return;
      }
      await loadInitial();
    } catch (e) {
      setError(e instanceof Error ? e.message : "모델 동기화 실패");
    } finally {
      setIsSyncing(false);
    }
  };

  // 간단한 모드 (채팅 페이지용)
  if (isSimple) {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="space-y-3">
          <div className="text-red-600 text-sm">{error}</div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            {isSyncing ? "OpenRouter에서 동기화 중..." : "OpenRouter 최신 모델 동기화"}
          </button>
          <button
            onClick={loadInitial}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            다시 불러오기
          </button>
        </div>
      );
    }

    const currentModels = activeTab === "free" ? freeModels : paidModels;

    return (
      <div className="space-y-4">
        {/* 탭 */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("free")}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === "free"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🆓 무료
          </button>
          <button
            onClick={() => setActiveTab("paid")}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === "paid"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            💰 유료
          </button>
        </div>

        {/* 최신 모델 동기화 */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          {isSyncing ? "OpenRouter에서 동기화 중..." : "OpenRouter 최신 모델 동기화"}
        </button>

        {/* 모델 목록 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {currentModels.map((model) => (
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
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                selectedModel?.id === model.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{model.name}</div>
                  <div className="text-sm text-gray-500">{model.provider}</div>
                </div>
                {selectedModel?.id === model.id && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {currentModels.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            {activeTab === "free"
              ? "무료 모델이 없습니다"
              : "유료 모델이 없습니다"}
          </div>
        )}
      </div>
    );
  }

  // 기존 모달 모드 (메인 페이지용)
  const renderModelCard = (model: AIModel) => (
    <div
      key={model.id}
      className={`relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-lg ${
        selectedModel?.id === model.id
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
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
    >
      {/* 선택 표시 */}
      {selectedModel?.id === model.id && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}

      {/* 모델 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {model.name}
          </h3>
          <p className="text-sm text-gray-600">{model.provider}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {model.isFree ? "🆓 무료" : "💰 유료"}
          </div>
        </div>
      </div>

      {/* 모델 설명 */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {model.description}
      </p>

      {/* 기능 태그 */}
      <div className="flex flex-wrap gap-1 mb-4">
        {model.features.slice(0, 3).map((feature, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
          >
            {feature}
          </span>
        ))}
        {model.features.length > 3 && (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            +{model.features.length - 3}
          </span>
        )}
      </div>

      {/* 가격 정보 */}
      <div className="text-xs text-gray-500">
        {typeof model.pricing === "string" ? model.pricing : "가격 정보 없음"}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border-2 border-gray-200 bg-white"
          >
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">❌</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 탭 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("free")}
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === "free"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🆓 무료 모델
        </button>
        <button
          onClick={() => setActiveTab("paid")}
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === "paid"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          💰 유료 모델
        </button>
      </div>

      {/* 모델 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === "free" ? freeModels : paidModels).map(renderModelCard)}
      </div>

      {(activeTab === "free" ? freeModels : paidModels).length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">🤖</div>
          <p className="text-gray-600">
            {activeTab === "free"
              ? "무료 모델이 없습니다"
              : "유료 모델이 없습니다"}
          </p>
        </div>
      )}
    </div>
  );
}
