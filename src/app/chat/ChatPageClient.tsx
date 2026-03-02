"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import ModelSelectorWrapper from "@/components/ModelSelectorWrapper";
import ChatSessionList from "@/components/ChatSessionList";
import { Memo, Message, AIModel } from "@/types";
import { useUIStore } from "@/store/ui.store";

interface ChatPageClientProps {
  initialMemos: Memo[];
}

export default function ChatPageClient({ initialMemos }: ChatPageClientProps) {
  const { setSelectedModel } = useUIStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{
    title: string;
    modelLabel: string;
  } | null>(null);
  const [sessionListRefreshKey, setSessionListRefreshKey] = useState(0);
  const [mobileSheet, setMobileSheet] = useState<"model" | "history" | null>(
    null
  );
  const searchParams = useSearchParams();
  const router = useRouter();

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        const sessionObj = (data?.session ?? {}) as Record<string, unknown>;
        const titleRaw =
          typeof sessionObj.title === "string" ? sessionObj.title : "대화";
        const aiModelsObj = (sessionObj.ai_models ?? {}) as Record<
          string,
          unknown
        >;
        const provider =
          typeof aiModelsObj.provider === "string" ? aiModelsObj.provider : "";
        const name = typeof aiModelsObj.name === "string" ? aiModelsObj.name : "";
        const modelLabel =
          provider && name ? `${provider} · ${name}` : (typeof sessionObj.model_id === "string" ? sessionObj.model_id : "");

        setSessionInfo({
          title: titleRaw,
          modelLabel: modelLabel || "모델",
        });

        // 세션의 모델로 선택 상태 업데이트
        const modelId = typeof sessionObj.model_id === "string" ? sessionObj.model_id : "";
        if (modelId) {
          try {
            const modelRes = await fetch(`/api/models/${encodeURIComponent(modelId)}`);
            if (modelRes.ok) {
              const modelData = await modelRes.json();
              const model = modelData.model;
              if (model) {
                const aiModel: AIModel = {
                  id: model.id,
                  name: model.name,
                  provider: model.provider,
                  description: model.description || "",
                  pricing: model.pricing || { input: "", output: "", estimatedCost: "" },
                  features: model.features || [],
                  isFree: model.is_free,
                  maxTokens: model.max_tokens,
                  contextLength: model.context_length,
                };
                setSelectedModel(aiModel);
              }
            }
          } catch (modelError) {
            console.error("세션 모델 로드 오류:", modelError);
          }
        }

        const rawMessages: unknown[] = Array.isArray(data.messages)
          ? (data.messages as unknown[])
          : [];
        // API는 system 역할도 올 수 있으니, UI 타입(Message)에 맞게 정리
        const mapped: Message[] = rawMessages
          .map((m) => {
            const obj = (m ?? {}) as Record<string, unknown>;
            const roleRaw = typeof obj.role === "string" ? obj.role : "";
            return {
              id: typeof obj.id === "string" ? obj.id : String(obj.id ?? ""),
              role: roleRaw === "user" ? ("user" as const) : ("assistant" as const),
              content:
                typeof obj.content === "string" ? obj.content : String(obj.content ?? ""),
              created_at:
                typeof obj.created_at === "string"
                  ? obj.created_at
                  : new Date().toISOString(),
            };
          })
          .filter((m) => {
            if (m.role === "user") return m.content.trim().length > 0;
            if (m.content.trim().length > 0) return true;
            // assistant의 빈 응답 = 서버에서 아직 스트리밍 진행 중
            return false;
          });

        setSessionMessages(mapped);
      } else {
        setSessionMessages([]);
        setSessionInfo(null);
      }
    } catch (e) {
      console.error("세션 메시지 로드 오류:", e);
      setSessionMessages([]);
      setSessionInfo(null);
    }
  }, [setSelectedModel]);

  // URL에서 세션 ID 가져오기
  useEffect(() => {
    const sessionId = searchParams.get("session");
    if (sessionId) {
      setSelectedSessionId(sessionId);
      loadSessionMessages(sessionId);
    } else {
      setSelectedSessionId(null);
      setSessionMessages([]);
      setSessionInfo(null);
    }
  }, [searchParams, loadSessionMessages]);

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    loadSessionMessages(sessionId);
    // URL에 반영해서 새로고침/공유 시에도 동일 세션 복원
    router.replace(`/chat?session=${encodeURIComponent(sessionId)}`);
    // 모바일 바텀시트에서 선택했다면 닫기
    setMobileSheet(null);
  };

  const pendingSessionIdRef = useRef<string | null>(null);

  const handleSessionIdChangeFromStream = useCallback((newSessionId: string) => {
    if (!newSessionId) return;
    pendingSessionIdRef.current = newSessionId;
    window.history.replaceState(null, "", `/chat?session=${encodeURIComponent(newSessionId)}`);
    setSessionListRefreshKey((prev) => prev + 1);
  }, []);

  const handleStreamComplete = useCallback(() => {
    if (pendingSessionIdRef.current) {
      setSelectedSessionId(pendingSessionIdRef.current);
      pendingSessionIdRef.current = null;
    }
  }, []);

  const handleNewChat = () => {
    setMobileSheet(null);
    setSelectedSessionId(null);
    setSessionMessages([]);
    setSessionInfo(null);
    router.replace("/chat");
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 h-[calc(100svh-5rem)] lg:h-[calc(100vh-5rem)]">
      {/* 모바일: 채팅을 메인으로 두고, 모델/기록은 바텀시트로 */}
      <div className="lg:hidden h-full min-h-0 flex flex-col">
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-1 pb-3 bg-gray-50/80 backdrop-blur border-b border-gray-100">
          <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setMobileSheet("model")}
            className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border shadow-sm text-sm font-medium ${
              mobileSheet === "model"
                ? "border-blue-300 bg-blue-50 text-blue-900"
                : "border-gray-200 bg-white text-gray-900"
            }`}
          >
            <span>🤖</span>
            <span>모델</span>
          </button>
          <button
            onClick={() => setMobileSheet("history")}
            className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border shadow-sm text-sm font-medium ${
              mobileSheet === "history"
                ? "border-blue-300 bg-blue-50 text-blue-900"
                : "border-gray-200 bg-white text-gray-900"
            }`}
          >
            <span>🕘</span>
            <span>기록</span>
          </button>
          <button
            onClick={handleNewChat}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white shadow-sm text-sm font-medium text-gray-900"
          >
            <span>➕</span>
            <span>새 대화</span>
          </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-white rounded-lg shadow">
          <ChatInterface
            memos={initialMemos}
            initialMessages={sessionMessages}
            sessionId={selectedSessionId}
            onSessionIdChange={handleSessionIdChangeFromStream}
            onStreamComplete={handleStreamComplete}
            sessionInfo={sessionInfo}
          />
        </div>

        {mobileSheet && (
          <div className="fixed inset-0 z-50">
            <button
              aria-label="닫기"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileSheet(null)}
            />
            <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-xl max-h-[85svh] overflow-hidden pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">
                  {mobileSheet === "model" ? "AI 모델 선택" : "채팅 기록"}
                </h2>
                <button
                  onClick={() => setMobileSheet(null)}
                  className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700"
                >
                  닫기
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(85svh-3.25rem)]">
                {mobileSheet === "model" ? (
                  <ModelSelectorWrapper />
                ) : (
                  <ChatSessionList
                    onSessionSelect={handleSessionSelect}
                    selectedSessionId={selectedSessionId || undefined}
                    refreshKey={sessionListRefreshKey}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 데스크톱: 기존 2-컬럼(사이드바 + 채팅) */}
      <div className="hidden lg:grid grid-cols-4 gap-6 h-full min-h-0">
        <div className="lg:col-span-1 flex flex-col gap-4 h-full min-h-0">
          <div className="bg-white rounded-lg shadow p-4 lg:basis-0 lg:flex-[2] lg:min-h-0 lg:overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              AI 모델 선택
            </h2>
            <ModelSelectorWrapper />
          </div>

          <div className="bg-white rounded-lg shadow p-4 lg:basis-0 lg:flex-[3] lg:min-h-0 lg:overflow-y-auto">
            <ChatSessionList
              onSessionSelect={handleSessionSelect}
              selectedSessionId={selectedSessionId || undefined}
              refreshKey={sessionListRefreshKey}
            />
          </div>
        </div>

        <div className="lg:col-span-3 h-full min-h-0">
          <div className="bg-white rounded-lg shadow h-full min-h-0">
            <ChatInterface
              memos={initialMemos}
              initialMessages={sessionMessages}
              sessionId={selectedSessionId}
              onSessionIdChange={handleSessionIdChangeFromStream}
              onStreamComplete={handleStreamComplete}
              sessionInfo={sessionInfo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
