"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AIModel } from "@/types";
import { fetchModels } from "@/lib/modelService";
import { DEFAULT_MODEL_IDS, isPremiumModel, modelIdMatchesPrefix } from "@/lib/openrouter";

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
  const [activeTab, setActiveTab] = useState<"default" | "premium">("default");
  const [freeModels, setFreeModels] = useState<AIModel[]>([]);
  const [paidModels, setPaidModels] = useState<AIModel[]>([]);
  const [premiumAllowed, setPremiumAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [premiumRequestSent, setPremiumRequestSent] = useState(false);

  const uniqById = useCallback(<T extends { id: string }>(arr: T[]) =>
    arr.filter((m, i, a) => a.findIndex((x) => x.id === m.id) === i), []);

  const onModelSelectRef = useRef(onModelSelectAction);
  onModelSelectRef.current = onModelSelectAction;

  const loadInitial = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [freeData, paidData] = await Promise.all([
        fetchModels(true, { limit: 20 }),
        fetchModels(false, { limit: 20 }),
      ]);

      if (freeData.length === 0 && paidData.length === 0) {
        setError("모델이 없습니다. 'OpenRouter 최신 모델 동기화' 버튼을 눌러주세요.");
      }

      setFreeModels(uniqById(freeData));
      setPaidModels(uniqById(paidData));

      const all = [...freeData, ...paidData];
      let defaultModelId: string | null = null;
      let allowed = false;

      try {
        const prefRes = await fetch("/api/user/preferences");
        if (prefRes.ok) {
          const pref = await prefRes.json();
          defaultModelId = pref.defaultModelId || null;
          allowed = pref.premiumAllowed === true;
          setPremiumAllowed(allowed);
        }
      } catch (prefErr) {
        console.warn("기본 모델 조회 실패:", prefErr);
      }

      // 초기 선택 모델 결정 로직
      let initialModel: AIModel | undefined;

      // 1) 저장된 기본 모델이 있고, Premium 이 아니면 그대로 사용
      if (defaultModelId) {
        const found = all.find((m) => m.id === defaultModelId);
        if (found && !isPremiumModel(found.id)) {
          initialModel = found;
        }
      }

      // 2) 없거나 Premium 이면, DEFAULT_MODEL_IDS 순서대로 저렴 모델 중 첫 번째 선택
      if (!initialModel) {
        const firstDefault = DEFAULT_MODEL_IDS.map((prefix) =>
          all.find(
            (m) => !isPremiumModel(m.id) && modelIdMatchesPrefix(m.id, prefix)
          )
        ).find(Boolean);
        if (firstDefault) {
          initialModel = firstDefault;
        }
      }

      // 3) 결정된 초기 모델을 실제로 선택하고, 필요하면 기본값으로 저장
      if (initialModel) {
        onModelSelectRef.current(initialModel);
        if (initialModel.id !== defaultModelId) {
          try {
            await fetch("/api/user/preferences", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ defaultModelId: initialModel.id }),
            });
          } catch {
            // 저장 실패는 무시 (선택은 유지)
          }
        }
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
  }, [uniqById]);

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

  const defaultModels = uniqById([
    ...freeModels,
    ...paidModels.filter((m) => !isPremiumModel(m.id)),
  ]);
  const premiumModels = uniqById(paidModels.filter((m) => isPremiumModel(m.id)));

  const handlePremiumRequest = async () => {
    try {
      const res = await fetch("/api/user/premium-request", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setPremiumRequestSent(true);
      else setError(data.error || "신청에 실패했습니다.");
    } catch {
      setError("신청에 실패했습니다.");
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

    const isPremiumTab = activeTab === "premium";
    const currentModels = isPremiumTab ? premiumModels : defaultModels;

    return (
      <div className="space-y-4">
        {/* 탭 */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("default")}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === "default"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🆓 무료·저렴
          </button>
          <button
            onClick={() => setActiveTab("premium")}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === "premium"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ✨ Premium
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

        {/* Premium 탭 + 미허용: 신청 CTA */}
        {isPremiumTab && !premiumAllowed && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="mb-2">Premium 모델은 사용 신청 후 승인되면 이용할 수 있습니다.</p>
            {premiumRequestSent ? (
              <p className="text-amber-700">신청이 접수되었습니다. 검토 후 연락드리겠습니다.</p>
            ) : (
              <button
                onClick={handlePremiumRequest}
                className="w-full py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
              >
                Premium 사용 신청
              </button>
            )}
          </div>
        )}

        {/* 모델 목록 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {currentModels.map((model) => {
            const disabled = isPremiumTab && !premiumAllowed;
            return (
              <button
                key={model.id}
                disabled={disabled}
                onClick={async () => {
                  if (disabled) return;
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
                  disabled
                    ? "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                    : selectedModel?.id === model.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{model.name}</div>
                    <div className="text-sm text-gray-500">{model.provider}</div>
                  </div>
                  {!disabled && selectedModel?.id === model.id && (
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
            );
          })}
        </div>

        {currentModels.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            {isPremiumTab ? "Premium 모델이 없습니다" : "모델이 없습니다"}
          </div>
        )}
      </div>
    );
  }

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

  const isPremiumTab = activeTab === "premium";
  const modalDefaultModels = uniqById([
    ...freeModels,
    ...paidModels.filter((m) => !isPremiumModel(m.id)),
  ]);
  const modalPremiumModels = uniqById(paidModels.filter((m) => isPremiumModel(m.id)));
  const modalCurrentModels = isPremiumTab ? modalPremiumModels : modalDefaultModels;

  return (
    <div className="space-y-6">
      {/* 탭 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("default")}
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === "default"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🆓 무료·저렴
        </button>
        <button
          onClick={() => setActiveTab("premium")}
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === "premium"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          ✨ Premium
        </button>
      </div>

      {isPremiumTab && !premiumAllowed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-3">Premium 모델은 사용 신청 후 승인되면 이용할 수 있습니다.</p>
          {premiumRequestSent ? (
            <p className="text-amber-700">신청이 접수되었습니다. 검토 후 연락드리겠습니다.</p>
          ) : (
            <button
              onClick={handlePremiumRequest}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
            >
              Premium 사용 신청
            </button>
          )}
        </div>
      )}

      {/* 모델 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modalCurrentModels.map((model) => {
          const disabled = isPremiumTab && !premiumAllowed;
          return (
            <div
              key={model.id}
              className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                disabled
                  ? "border-gray-200 bg-gray-50 opacity-75 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-lg " +
                    (selectedModel?.id === model.id
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300")
              }`}
              onClick={async () => {
                if (disabled) return;
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
              {!disabled && selectedModel?.id === model.id && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              )}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{model.name}</h3>
                  <p className="text-sm text-gray-600">{model.provider}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {model.isFree ? "🆓 무료" : isPremiumModel(model.id) ? "✨ Premium" : "💰 저렴"}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{model.description}</p>
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
              <div className="text-xs text-gray-500">
                {typeof model.pricing === "string" ? model.pricing : "가격 정보 없음"}
              </div>
            </div>
          );
        })}
      </div>

      {modalCurrentModels.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">🤖</div>
          <p className="text-gray-600">
            {isPremiumTab ? "Premium 모델이 없습니다" : "모델이 없습니다"}
          </p>
        </div>
      )}
    </div>
  );
}
