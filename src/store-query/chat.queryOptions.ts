import { queryOptions } from "@tanstack/react-query";
import { ChatSession, ChatMessage } from "@/types";

export const chatQueryKeys = {
  all: ["chat"] as const,
  sessions: () => [...chatQueryKeys.all, "sessions"] as const,
  session: (id: string) => [...chatQueryKeys.all, "session", id] as const,
  messages: (sessionId: string) => [...chatQueryKeys.all, "messages", sessionId] as const,
};

export const chatQueryOptions = {
  sessions: () =>
    queryOptions<ChatSession[]>({
      queryKey: chatQueryKeys.sessions(),
      queryFn: async () => {
        const res = await fetch("/api/chat/sessions?limit=50");
        if (!res.ok) throw new Error("세션 로드 실패");
        const data = await res.json();
        return data.sessions as ChatSession[];
      },
      staleTime: 1000 * 30,
    }),
  sessionDetail: (id: string) =>
    queryOptions<{ session: ChatSession; messages: ChatMessage[] }>({
      queryKey: chatQueryKeys.session(id),
      queryFn: async () => {
        const res = await fetch(`/api/chat/sessions/${id}`);
        if (!res.ok) throw new Error("세션 상세 로드 실패");
        const data = await res.json();
        return { session: data.session, messages: data.messages };
      },
      enabled: !!id,
    }),
};


