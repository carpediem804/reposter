import { create } from "zustand";
import { AIModel, Memo } from "@/types";

interface UIStore {
  selectedModel: AIModel | undefined;
  setSelectedModel: (model: AIModel | undefined) => void;
  // 메모 상세에서 "AI에게 질문하기" 클릭 시, 채팅 페이지로 전달할 메모
  pendingMemoForChat: Memo | null;
  setPendingMemoForChat: (memo: Memo | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedModel: undefined,
  setSelectedModel: (model) => set({ selectedModel: model }),
  pendingMemoForChat: null,
  setPendingMemoForChat: (memo) => set({ pendingMemoForChat: memo }),
}));
