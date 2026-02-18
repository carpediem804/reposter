"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import CategoryFilter from "@/components/memo/CategoryFilter";
import CategoryMemoList from "@/components/memo/CategoryMemoList";

interface MemosClientProps {
  categories: Array<{ id: string; name: string; color: string }>;
}

export default function MemosClient({ categories }: MemosClientProps) {
  const router = useRouter();
  const [categoryList, setCategoryList] = useState(categories);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [openManagerTrigger, setOpenManagerTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAiBanner, setShowAiBanner] = useState(true);

  // URL 파라미터에서 카테고리 선택 상태 복원
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const categoriesParam = urlParams.get("categories");
      if (categoriesParam) {
        setSelectedCategories(categoriesParam.split(","));
      }
    }
  }, []);

  // 카테고리 변경 시 선택된 카테고리 유효성 정리
  useEffect(() => {
    if (!categoryList || categoryList.length === 0) {
      setSelectedCategories((prev) => (prev.length > 0 ? [] : prev));
      return;
    }
    setSelectedCategories((prev) =>
      prev.filter((id) => categoryList.some((c) => c.id === id))
    );
  }, [categoryList]);

  // 카테고리 선택에 따른 URL 동기화 (선택 상태만 관리)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedCategories.length > 0) {
      url.searchParams.set("categories", selectedCategories.join(","));
    } else {
      url.searchParams.delete("categories");
    }
    window.history.replaceState({}, "", url.toString());
  }, [selectedCategories]);

  const handleCategoriesUpdated = useCallback(
    (list: Array<{ id: string; name: string; color: string }>) => {
      setCategoryList(list);
    },
    []
  );

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      {/* AI 인사이트 배너 */}
      {showAiBanner && categoryList.length > 0 && (
        <div className="mb-6 relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 p-4 sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          <button
            onClick={() => setShowAiBanner(false)}
            className="absolute top-2 right-2 text-white/60 hover:text-white p-1"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-lg">메모에서 인사이트를 발견하세요</h3>
              <p className="text-white/80 text-sm mt-0.5">
                AI에게 메모를 첨부하고 질문하면 요약, 패턴 분석, 아이디어 확장 등 다양한 인사이트를 얻을 수 있어요.
              </p>
            </div>
            <button
              onClick={() => router.push("/chat")}
              className="flex-shrink-0 px-5 py-2.5 bg-white text-violet-700 font-semibold rounded-lg hover:bg-violet-50 transition-colors shadow-lg"
            >
              AI 채팅 시작 →
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 메모</h1>
            <p className="text-gray-600 mt-1">
              카테고리별로 메모를 관리하고 AI 채팅에 활용해보세요
            </p>
          </div>
          {/* 검색창 */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="메모 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <CategoryFilter
          selectedCategories={selectedCategories}
          onChangeAction={(ids) => setSelectedCategories(ids)}
          onCategoriesUpdated={handleCategoriesUpdated}
          openManagerTrigger={openManagerTrigger}
        />
      </div>

      {/* 카테고리별 메모 목록 (선택 없으면 전체, 있으면 선택된 카테고리만) */}
      <div className="space-y-8">
        {categoryList.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              카테고리가 없습니다
            </h3>
            <p className="text-gray-500 mb-6">
              먼저 카테고리를 만든 다음, 그 카테고리에서 메모를 작성할 수 있어요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={() => setOpenManagerTrigger((v) => v + 1)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 w-full sm:w-auto"
              >
                카테고리 만들기
              </button>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-200 text-gray-400 text-sm font-medium w-full sm:w-auto cursor-not-allowed"
                title="카테고리를 만든 후 메모를 작성할 수 있어요"
              >
                메모 작성
              </button>
            </div>
          </div>
        ) : (
          (selectedCategories.length === 0
            ? categoryList
            : categoryList.filter((c) => selectedCategories.includes(c.id))
          ).map((category) => (
            <CategoryMemoList
              key={category.id}
              categoryId={category.id}
              categoryName={category.name}
              categoryColor={category.color}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  );
}
