"use client";
import { useState } from "react";
import { Memo } from "@/types";

interface MemoChipsProps {
  memos: Memo[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  selectedCategories?: string[];
}

export default function MemoChips({
  memos,
  selectedIds,
  onToggle,
  selectedCategories = [],
}: MemoChipsProps) {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 6; // 2줄 x 3개씩

  // 선택된 카테고리의 메모들만 필터링
  const filteredMemos =
    selectedCategories.length === 0
      ? memos
      : memos.filter((memo) => {
          const categoryId = (memo as { category_id?: string }).category_id;
          return categoryId && selectedCategories.includes(categoryId);
        });

  const visibleMemos = showAll
    ? filteredMemos
    : filteredMemos.slice(0, maxVisible);
  const hasMore = filteredMemos.length > maxVisible;

  if (filteredMemos.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        {selectedCategories.length === 0
          ? "메모가 없습니다. 먼저 메모를 작성해보세요."
          : "선택된 카테고리에 메모가 없습니다."}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {visibleMemos.map((memo) => (
          <button
            key={memo.id}
            onClick={() => onToggle(memo.id)}
            className={`p-2 rounded-lg border text-left transition-all ${
              selectedIds.includes(memo.id)
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="text-xs font-medium truncate mb-1">
              {memo.title}
            </div>
            <div className="text-xs text-gray-500 line-clamp-2">
              {memo.content}
            </div>
            {selectedIds.includes(memo.id) && (
              <div className="absolute top-1 right-1">
                <svg
                  className="w-3 h-3 text-blue-600"
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
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {showAll ? "접기" : `더보기 (${memos.length - maxVisible}개 더)`}
        </button>
      )}

      {selectedIds.length > 0 && (
        <div className="text-xs text-gray-500">
          선택된 메모: {selectedIds.length}개
        </div>
      )}
    </div>
  );
}
