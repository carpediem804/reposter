"use client";
import { useEffect, useState } from "react";

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface CategoryBarProps {
  activeIds?: string[];
  onChange: (categoryIds: string[]) => void;
}

export default function CategoryBar({
  activeIds = [],
  onChange,
}: CategoryBarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const getColorClasses = (color: string, isActive: boolean) => {
    const colorMap: Record<string, string> = {
      violet: isActive
        ? "bg-violet-200 text-violet-800 border-violet-400 shadow-sm"
        : "bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 hover:border-violet-300",
      blue: isActive
        ? "bg-blue-200 text-blue-800 border-blue-400 shadow-sm"
        : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:border-blue-300",
      green: isActive
        ? "bg-green-200 text-green-800 border-green-400 shadow-sm"
        : "bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:border-green-300",
      yellow: isActive
        ? "bg-yellow-200 text-yellow-800 border-yellow-400 shadow-sm"
        : "bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300",
      orange: isActive
        ? "bg-orange-200 text-orange-800 border-orange-400 shadow-sm"
        : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:border-orange-300",
      red: isActive
        ? "bg-red-200 text-red-800 border-red-400 shadow-sm"
        : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300",
      pink: isActive
        ? "bg-pink-200 text-pink-800 border-pink-400 shadow-sm"
        : "bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100 hover:border-pink-300",
      gray: isActive
        ? "bg-gray-200 text-gray-800 border-gray-400 shadow-sm"
        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300",
    };
    return colorMap[color] || colorMap.violet;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        // 색상이 없는 카테고리들에 기본 색상 할당
        const categoriesWithColors = (data.categories || []).map(
          (cat: Category, index: number) => ({
            ...cat,
            color:
              cat.color ||
              [
                "violet",
                "blue",
                "green",
                "yellow",
                "orange",
                "red",
                "pink",
                "gray",
              ][index % 8],
          })
        );
        setCategories(categoriesWithColors);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <div className="h-8 w-20 bg-gray-100 rounded" />
        <div className="h-8 w-16 bg-gray-100 rounded" />
        <div className="h-8 w-24 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      <button
        onClick={() => onChange([])}
        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
          activeIds.length === 0
            ? "bg-gray-900 text-white border-gray-900 shadow-sm"
            : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:border-gray-300"
        }`}
      >
        전체
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => {
            const newActiveIds = activeIds.includes(c.id)
              ? activeIds.filter((id) => id !== c.id)
              : [...activeIds, c.id];
            onChange(newActiveIds);
          }}
          className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition-colors ${getColorClasses(
            c.color || "violet",
            activeIds.includes(c.id)
          )}`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
