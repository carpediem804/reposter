"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ChatSession {
  id: string;
  title: string;
  model_id: string;
  created_at: string;
  updated_at: string;
  ai_models?: {
    name: string;
    provider: string;
  };
}

interface ChatSessionListProps {
  onSessionSelect?: (sessionId: string) => void;
  selectedSessionId?: string;
  refreshKey?: number;
}

export default function ChatSessionList({
  onSessionSelect,
  selectedSessionId,
  refreshKey,
}: ChatSessionListProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await fetch("/api/chat/sessions?limit=20");
      if (!response.ok) {
        throw new Error("세션을 불러오는데 실패했습니다");
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("세션 로딩 오류:", err);
      setError("세션을 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, refreshKey]);

  const handleSessionClick = (sessionId: string) => {
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    } else {
      // 기본 동작: 채팅 페이지로 이동
      router.push(`/chat?session=${sessionId}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    } else {
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">채팅 기록</h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">채팅 기록</h3>
        <div className="text-center py-4">
          <div className="text-red-500 mb-2">❌</div>
          <p className="text-sm text-gray-600">{error}</p>
          <button
            onClick={fetchSessions}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">채팅 기록</h3>
        <button
          onClick={fetchSessions}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          새로고침
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-4">
          <div className="text-gray-400 mb-2">💬</div>
          <p className="text-sm text-gray-600">아직 채팅 기록이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSessionClick(session.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedSessionId === session.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <h4 className="text-sm font-medium text-gray-900 truncate pr-2">
                  {session.title}
                </h4>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatDate(session.updated_at)}
                </span>
              </div>
              {session.ai_models && (
                <p className="text-xs text-gray-600">
                  {session.ai_models.provider} - {session.ai_models.name}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
