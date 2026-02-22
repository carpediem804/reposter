"use client";
import { useState, useEffect, useRef } from "react";
import { Memo, Message } from "@/types";
import TagPicker from "@/components/memo/TagPicker";
import MemoChips from "@/components/memo/MemoChips";
import CategoryBar from "@/components/memo/CategoryBar";
import { useUIStore } from "@/store/ui.store";

interface ChatInterfaceProps {
  memos: Memo[];
  initialMessages?: Message[];
  sessionId?: string | null;
  onSessionIdChange?: (sessionId: string) => void;
  sessionInfo?: { title: string; modelLabel: string } | null;
}

export default function ChatInterface({
  memos,
  initialMessages,
  sessionId,
  onSessionIdChange,
  sessionInfo,
}: ChatInterfaceProps) {
  const { selectedModel, setSelectedModel, pendingMemoForChat, setPendingMemoForChat } = useUIStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMemos, setSelectedMemos] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [streamingResponse, setStreamingResponse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isAttachOpen, setIsAttachOpen] = useState(true);
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef("");
  const assistantMsgIdRef = useRef<string | null>(null);

  // 초기 세션/메시지 주입
  useEffect(() => {
    setMessages(initialMessages || []);
  }, [initialMessages]);

  // 세션 전환 시: 진행 중인 스트리밍 중단 + 상태 초기화
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      // abort 시점까지 수신된 스트리밍 내용이 있으면 메시지에 보존
      if (streamingContentRef.current && assistantMsgIdRef.current) {
        const savedContent = streamingContentRef.current;
        const savedId = assistantMsgIdRef.current;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === savedId ? { ...msg, content: savedContent } : msg
          )
        );
      }
    }
    streamingContentRef.current = "";
    assistantMsgIdRef.current = null;
    setIsLoading(false);
    setStreamingResponse("");
    setInputMessage("");
    setSelectedMemos([]);
    setSelectedTags([]);
    setActiveCategories([]);
  }, [sessionId]);

  // 사용자 기본 모델 로드
  useEffect(() => {
    const loadDefaultModel = async () => {
      try {
        const prefRes = await fetch("/api/user/preferences");
        if (prefRes.ok) {
          const { defaultModelId } = await prefRes.json();
          if (defaultModelId && !selectedModel) {
            let modelRes = await fetch(`/api/models/${defaultModelId}`);
            // DB에 없으면(동기화로 비활성화/누락) OpenRouter 동기화 후 재시도
            if (modelRes.status === 404) {
              await fetch("/api/models/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keepIds: [defaultModelId] }),
              }).catch(() => null);
              modelRes = await fetch(`/api/models/${defaultModelId}`);
            }

            if (modelRes.ok) {
              const { model } = await modelRes.json();
              setSelectedModel(model);
            }
          }
        }
      } catch (error) {
        console.error("기본 모델 로드 실패:", error);
      }
    };
    loadDefaultModel();
  }, [selectedModel, setSelectedModel]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingResponse]);

  // 모바일에서는 첨부 영역을 기본 접기
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsAttachOpen(false);
    }
  }, []);

  // 메모 상세에서 "AI에게 질문하기"로 넘어온 경우 자동 첨부
  useEffect(() => {
    if (pendingMemoForChat) {
      // 해당 메모의 카테고리 활성화
      const memoWithCategory = memos.find(m => m.id === pendingMemoForChat.id) as Memo & { category_id?: string };
      if (memoWithCategory?.category_id) {
        setActiveCategories(prev => 
          prev.includes(memoWithCategory.category_id!) ? prev : [...prev, memoWithCategory.category_id!]
        );
      }
      // 메모 선택
      setSelectedMemos(prev => 
        prev.includes(pendingMemoForChat.id) ? prev : [...prev, pendingMemoForChat.id]
      );
      // 첨부 영역 열기
      setIsAttachOpen(true);
      // store에서 제거
      setPendingMemoForChat(null);
    }
  }, [pendingMemoForChat, memos, setPendingMemoForChat]);

  // 카테고리 선택 시 선택된 메모를 카테고리에 맞게 정리
  useEffect(() => {
    if (activeCategories.length === 0) return;
    const allowed = memos
      .filter(
        (m: Memo & { category_id?: string }) =>
          m.category_id && activeCategories.includes(m.category_id)
      )
      .map((m) => m.id);
    setSelectedMemos((prev) => prev.filter((id) => allowed.includes(id)));
  }, [activeCategories, memos]);

  // Enter 키로 전송
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputFocus = () => {
    // 모바일에서 키보드가 올라오면 화면이 답답해져서, 첨부 영역은 자동으로 접어줌
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsAttachOpen(false);
      // 레이아웃 반영 후 입력창이 보이도록 스크롤
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 0);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedModel || isLoading) return;

    // 이전 스트리밍이 남아있다면 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentSessionId = sessionId;

    const userMessage = {
      id: `user_${Date.now()}`,
      role: "user" as const,
      content: inputMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setStreamingResponse("");

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          modelId: selectedModel.id,
          selectedMemos,
          selectedTags,
          selectedCategories: activeCategories,
          sessionId: currentSessionId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("API 호출 실패");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다");

      const assistantMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant" as const,
        content: "",
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      assistantMsgIdRef.current = assistantMessage.id;

      let fullStreamingContent = "";
      streamingContentRef.current = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (abortController.signal.aborted) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "session" && data.sessionId) {
                onSessionIdChange?.(data.sessionId);
              } else if (data.type === "content") {
                fullStreamingContent += data.content;
                streamingContentRef.current = fullStreamingContent;
                if (!abortController.signal.aborted) {
                  setStreamingResponse(fullStreamingContent);
                }
              } else if (data.type === "done") {
                streamingContentRef.current = "";
                assistantMsgIdRef.current = null;
                if (!abortController.signal.aborted) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: fullStreamingContent }
                        : msg
                    )
                  );
                  setStreamingResponse("");
                  setIsLoading(false);
                }
                return;
              }
            } catch {
              // JSON 파싱 오류 무시
            }
          }
        }
      }
    } catch (error) {
      if (abortController.signal.aborted) return;
      console.error("메시지 전송 오류:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: "메시지 전송에 실패했습니다. 다시 시도해주세요.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
        setStreamingResponse("");
      }
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleMemoToggle = (memoId: string) => {
    setSelectedMemos((prev) =>
      prev.includes(memoId)
        ? prev.filter((id) => id !== memoId)
        : [...prev, memoId]
    );
  };

  const clearSelectedMemos = () => {
    setSelectedMemos([]);
  };

  const clearSelectedTags = () => {
    setSelectedTags([]);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 메시지 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* 세션 정보(제목/모델) - 메시지 리스트 상단 고정 */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-white/85 backdrop-blur border-b border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-gray-500">
                {sessionId ? "현재 대화" : "새 대화"}
              </div>
              <div className="text-sm font-semibold text-gray-900 truncate">
                {sessionInfo?.title || (sessionId ? "대화" : "새 대화")}
              </div>
            </div>
            <div className="flex-shrink-0 text-xs text-gray-600 max-w-[45%] truncate">
              {sessionInfo?.modelLabel || (selectedModel ? `${selectedModel.provider} · ${selectedModel.name}` : "모델 미선택")}
            </div>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="py-8 px-4">
            <div className="text-center text-gray-500 mb-8">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-medium mb-2">
                AI와 대화를 시작해보세요
              </h3>
              <p className="text-sm">
                메모를 첨부하거나 태그를 선택하여 더 정확한 답변을 받을 수
                있습니다
              </p>
            </div>

            {/* 프롬프트 제안 */}
            {showPromptSuggestions && selectedMemos.length > 0 && (
              <div className="max-w-lg mx-auto">
                <p className="text-xs text-gray-500 mb-3 text-center">
                  💡 선택한 메모로 이런 질문을 해보세요
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { icon: "📝", text: "이 메모를 요약해줘", prompt: "첨부된 메모의 핵심 내용을 간결하게 요약해줘." },
                    { icon: "💡", text: "인사이트 알려줘", prompt: "첨부된 메모를 분석해서 숨겨진 인사이트나 패턴을 알려줘." },
                    { icon: "🔗", text: "연관된 아이디어", prompt: "첨부된 메모와 연관된 새로운 아이디어나 확장 가능한 주제를 제안해줘." },
                    { icon: "✅", text: "액션 아이템 정리", prompt: "첨부된 메모에서 실행 가능한 액션 아이템이나 할 일 목록을 추출해줘." },
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputMessage(suggestion.prompt);
                        setShowPromptSuggestions(false);
                        inputRef.current?.focus();
                      }}
                      className="flex items-center gap-2 px-4 py-3 text-left text-sm bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-300 rounded-lg transition-all group"
                    >
                      <span className="text-lg group-hover:scale-110 transition-transform">{suggestion.icon}</span>
                      <span className="text-gray-700 group-hover:text-violet-700">{suggestion.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 메모 미선택 시 가이드 */}
            {showPromptSuggestions && selectedMemos.length === 0 && (
              <div className="max-w-md mx-auto text-center">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">💡 Tip:</span> 아래에서 카테고리/메모를 선택하면<br />
                    AI가 메모 내용을 참고해서 답변해줘요!
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}

        {/* 스트리밍 응답 */}
        {streamingResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-900">
              <div className="whitespace-pre-wrap">
                {streamingResponse}
                <span className="animate-pulse">▋</span>
              </div>
            </div>
          </div>
        )}

        {/* 로딩 표시 */}
        {isLoading && !streamingResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-900">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>AI가 응답을 생성하고 있습니다...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 첨부 영역 */}
      {selectedModel && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => setIsAttachOpen(!isAttachOpen)}
            className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between"
          >
            <span>📎 메모 및 태그 첨부</span>
            <svg
              className={`w-4 h-4 transform transition-transform ${
                isAttachOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {isAttachOpen && (
            <div className="px-4 pb-4 space-y-4 max-h-[40vh] overflow-y-auto">
              {/* 카테고리 선택 */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  📂 카테고리 선택
                </h4>
                <CategoryBar
                  activeIds={activeCategories}
                  onChange={setActiveCategories}
                />
              </div>

              {/* 태그 선택 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    🏷️ 태그 선택
                  </h4>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={clearSelectedTags}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      모두 해제
                    </button>
                  )}
                </div>
                <TagPicker
                  memos={memos}
                  selectedTags={selectedTags}
                  onChange={setSelectedTags}
                  selectedCategories={activeCategories}
                />
              </div>

              {/* 메모 첨부 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    📝 메모 첨부
                  </h4>
                  {selectedMemos.length > 0 && (
                    <button
                      onClick={clearSelectedMemos}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      모두 해제
                    </button>
                  )}
                </div>
                <MemoChips
                  memos={memos}
                  selectedIds={selectedMemos}
                  onToggle={handleMemoToggle}
                  selectedCategories={activeCategories}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 입력 영역 */}
      <div className="border-t border-gray-200 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {/* 첨부된 항목 요약 표시 */}
        {(selectedMemos.length > 0 || selectedTags.length > 0) && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">첨부됨:</span>
            {selectedMemos.slice(0, 3).map((memoId) => {
              const memo = memos.find((m) => m.id === memoId);
              return memo ? (
                <span
                  key={memoId}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-violet-100 text-violet-700 rounded-full"
                >
                  📝 {memo.title.length > 15 ? memo.title.slice(0, 15) + "..." : memo.title}
                  <button
                    onClick={() => handleMemoToggle(memoId)}
                    className="ml-0.5 text-violet-500 hover:text-violet-700"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
            {selectedMemos.length > 3 && (
              <span className="text-xs text-gray-500">+{selectedMemos.length - 3}개</span>
            )}
            {selectedTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
              >
                #{tag}
                <button
                  onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
                  className="ml-0.5 text-blue-500 hover:text-blue-700"
                >
                  ×
                </button>
              </span>
            ))}
            {selectedTags.length > 3 && (
              <span className="text-xs text-gray-500">+{selectedTags.length - 3}개 태그</span>
            )}
          </div>
        )}

        {!selectedModel ? (
          <div className="text-center py-4 text-gray-500">
            <div className="text-lg mb-2">🤖</div>
            <p className="text-sm">왼쪽에서 AI 모델을 선택해주세요</p>
          </div>
        ) : (
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              placeholder={`${selectedModel.name}에게 메시지를 입력하세요...`}
              disabled={isLoading}
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 caret-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              rows={1}
              style={{
                minHeight: "40px",
                maxHeight: "120px",
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
