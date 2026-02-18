"use client";

import { useState, useEffect } from "react";
import CreateMemoModal from "./CreateMemoModal";
import { Memo } from "@/types";
import { usePathname } from "next/navigation";

export default function QuickMemoButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const pathname = usePathname();

  // 첫 방문 시 툴팁 표시
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const hasSeenTooltip = localStorage.getItem("quickMemoTooltipSeen");
      if (!hasSeenTooltip) {
        const timer = setTimeout(() => {
          setShowTooltip(true);
          // 5초 후 자동으로 사라짐
          setTimeout(() => {
            setShowTooltip(false);
            try {
              localStorage.setItem("quickMemoTooltipSeen", "true");
            } catch (e) {
              console.warn("localStorage 저장 실패:", e);
            }
          }, 5000);
        }, 2000);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn("localStorage 접근 실패:", e);
    }
  }, []);

  const handleMemoCreated = (memo: Memo) => {
    setIsOpen(false);
    // 메모 페이지가 아니면 리다이렉트 안내
    if (typeof window !== "undefined" && pathname !== "/memos" && !pathname.startsWith("/memos/")) {
      try {
        // 토스트 알림처럼 표시
        const toast = document.createElement("div");
        toast.className =
          "fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg z-50 animate-fade-in";
        toast.innerHTML = `
          <div class="flex items-center gap-2">
            <span>✅ 메모 저장됨: ${memo.title}</span>
            <a href="/memos" class="underline hover:no-underline">보러가기</a>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      } catch (e) {
        console.warn("토스트 표시 실패:", e);
      }
    }
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* 툴팁 */}
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-800 text-white text-sm rounded-lg shadow-xl animate-bounce-subtle">
            <div className="font-medium mb-1">💡 빠른 메모</div>
            <div className="text-white/70 text-xs">
              언제든지 이 버튼을 눌러 메모를 작성하세요!
            </div>
            <div className="absolute bottom-0 right-6 translate-y-1/2 rotate-45 w-3 h-3 bg-slate-800" />
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(true);
            setShowTooltip(false);
            try {
              if (typeof window !== "undefined") {
                localStorage.setItem("quickMemoTooltipSeen", "true");
              }
            } catch (e) {
              console.warn("localStorage 저장 실패:", e);
            }
          }}
          className="group relative w-14 h-14 bg-gradient-to-br from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-violet-500/25 transition-all hover:scale-105 active:scale-95"
          aria-label="빠른 메모 작성"
        >
          <span className="text-2xl">✏️</span>
          
          {/* 호버 라벨 */}
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            빠른 메모
          </span>
        </button>
      </div>

      {/* 모달 */}
      {isOpen && (
        <CreateMemoModal
          onCloseAction={() => setIsOpen(false)}
          onMemoCreatedAction={handleMemoCreated}
        />
      )}
    </>
  );
}
