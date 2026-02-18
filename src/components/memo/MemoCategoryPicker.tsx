"use client";
import { useEffect, useState } from "react";

interface Category {
  id: string;
  name: string;
}

interface Props {
  memoId?: string;
  initialCategoryIds?: string[];
  onChange: (ids: string[]) => void;
  singleSelect?: boolean;
  onSelectionChange?: (ids: string[]) => void;
}

export default function MemoCategoryPicker({
  initialCategoryIds = [],
  onChange,
  singleSelect = false,
  onSelectionChange,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>(initialCategoryIds);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    })();
  }, []);

  // 초기값만 부모에게 전달
  useEffect(() => {
    if (selected.length > 0) {
      onChange(selected);
    }
    // selected 또는 onChange가 바뀌면 동기화
  }, [selected, onChange]);

  const toggle = (id: string) => {
    let newSelected: string[];
    if (singleSelect) {
      newSelected = [id];
    } else {
      newSelected = selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id];
    }
    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  if (categories.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">카테고리</div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              selected.includes(c.id)
                ? "bg-violet-100 text-violet-700 border-violet-300"
                : "bg-gray-100 text-gray-700 border-gray-200"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
