"use client";
import { useState, useMemo } from "react";
import { Memo } from "@/types";

interface TagPickerProps {
  memos: Memo[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  selectedCategories?: string[];
}

export default function TagPicker({
  memos,
  selectedTags,
  onChange,
  selectedCategories = [],
}: TagPickerProps) {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 8; // 2줄 x 4개씩

  // 선택된 카테고리의 메모들에서 태그 추출 및 중복 제거
  const allTags = useMemo(() => {
    const tags = new Set<string>();

    // 카테고리가 선택되지 않았으면 모든 메모에서 태그 추출
    if (selectedCategories.length === 0) {
      memos.forEach((memo) => {
        if (memo.tags) {
          memo.tags.forEach((tag) => tags.add(tag));
        }
      });
    } else {
      // 선택된 카테고리의 메모들에서만 태그 추출
      memos.forEach((memo) => {
        const categoryId = (memo as { category_id?: string }).category_id;
        const hasSelectedCategory =
          categoryId && selectedCategories.includes(categoryId);
        if (hasSelectedCategory && memo.tags) {
          memo.tags.forEach((tag) => tags.add(tag));
        }
      });
    }

    return Array.from(tags).sort();
  }, [memos, selectedCategories]);

  const visibleTags = showAll ? allTags : allTags.slice(0, maxVisible);
  const hasMore = allTags.length > maxVisible;

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    onChange(newTags);
  };

  if (allTags.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        태그가 없습니다. 메모에 태그를 추가해보세요.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {visibleTags.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-2 py-1.5 rounded-full text-xs border transition-all ${
              selectedTags.includes(tag)
                ? "bg-blue-100 text-blue-700 border-blue-300"
                : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {showAll ? "접기" : `더보기 (${allTags.length - maxVisible}개 더)`}
        </button>
      )}

      {selectedTags.length > 0 && (
        <div className="text-xs text-gray-500">
          선택된 태그: {selectedTags.length}개
        </div>
      )}
    </div>
  );
}
