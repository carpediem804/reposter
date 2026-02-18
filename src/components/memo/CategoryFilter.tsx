"use client";
import { useState, useEffect, useCallback } from "react";
import CategoryManager from "./CategoryManager";

interface Category {
  id: string;
  name: string;
  color: string;
}
interface CategoryFilterProps {
  selectedCategories: string[];
  onChangeAction: (categoryIds: string[]) => void;
  onCategoriesUpdated?: (categories: Category[]) => void;
  openManagerTrigger?: number;
}

export default function CategoryFilter({
  selectedCategories,
  onChangeAction,
  onCategoriesUpdated,
  openManagerTrigger,
}: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        if (res.status === 401) {
          // 인증 오류 - 로그인 페이지로 리다이렉트
          window.location.href = "/";
          return;
        }
        throw new Error(`카테고리 조회 실패: ${res.status}`);
      }
      const data = await res.json();
      const list = data.categories || [];
      setCategories(list);
      onCategoriesUpdated?.(list);
    } catch (error) {
      console.error("카테고리 조회 실패:", error);
      // 에러가 있어도 빈 배열로 설정해서 UI가 깨지지 않게
      setCategories([]);
      onCategoriesUpdated?.([]);
    } finally {
      setIsLoading(false);
    }
  }, [onCategoriesUpdated]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!openManagerTrigger) return;
    setShowManager(true);
  }, [openManagerTrigger]);

  // URL 파라미터에서 초기 카테고리 선택 상태 복원은 상위 컴포넌트에서 처리

  const handleCategoryChange = (categoryId: string) => {
    const newSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];
    onChangeAction(newSelection);
  };

  const handleSelectAll = () => {
    onChangeAction([]);
  };

  // URL 파라미터 업데이트는 상위 컴포넌트에서 처리

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      violet: "bg-violet-100 text-violet-700 border-violet-300",
      blue: "bg-blue-100 text-blue-700 border-blue-300",
      green: "bg-green-100 text-green-700 border-green-300",
      yellow: "bg-yellow-100 text-yellow-700 border-yellow-300",
      orange: "bg-orange-100 text-orange-700 border-orange-300",
      red: "bg-red-100 text-red-700 border-red-300",
      pink: "bg-pink-100 text-pink-700 border-pink-300",
      gray: "bg-gray-100 text-gray-700 border-gray-300",
    };
    return colorMap[color] || colorMap.violet;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <div className="h-8 w-20 bg-gray-100 rounded" />
        <div className="h-8 w-16 bg-gray-100 rounded" />
        <div className="h-8 w-24 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full">
          <button
            onClick={handleSelectAll}
            className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap ${
              selectedCategories.length === 0
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
            }`}
          >
            전체
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap ${
                selectedCategories.includes(category.id)
                  ? getColorClasses(category.color)
                  : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowManager(true)}
          className="self-end sm:self-auto px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs hover:bg-blue-700 whitespace-nowrap"
        >
          카테고리 관리
        </button>
      </div>

      {showManager && (
        <CategoryManager
          onClose={() => setShowManager(false)}
          onCategoryChange={() => {
            fetchCategories();
            setShowManager(false);
          }}
        />
      )}
    </>
  );
}
