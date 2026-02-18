"use client";
import { useQuery } from "@tanstack/react-query";
import { chatQueryOptions } from "@/store-query/chat.queryOptions";

export function useChatSessions() {
  return useQuery(chatQueryOptions.sessions());
}

export function useChatSessionDetail(id?: string) {
  return useQuery(chatQueryOptions.sessionDetail(id!));
}
