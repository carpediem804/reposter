"use client";

import { useState, useEffect, useCallback } from "react";
import { Memo } from "@/types";
import CreateMemoModal from "../CreateMemoModal";

interface CategoryMemoListProps {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  searchQuery?: string;
}

interface MemoWithCategory extends Memo {
  categories?: {
    id: string;
    name: string;
    color: string;
  };
}

export default function CategoryMemoList({
  categoryId,
  categoryName,
  categoryColor,
  searchQuery = "",
}: CategoryMemoListProps) {
  const [memos, setMemos] = useState<MemoWithCategory[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // 검색어로 필터링된 메모
  const filteredMemos = memos.filter((memo) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      memo.title.toLowerCase().includes(query) ||
      memo.content.toLowerCase().includes(query) ||
      memo.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const fetchCategoryMemos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await fetch(`/api/memos?category_id=${categoryId}`);
      if (!response.ok) {
        if (response.status === 401) {
          // 인증 오류 - 로그인 페이지로 리다이렉트
          window.location.href = "/";
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `메모 조회 실패 (${response.status})`);
      }
      const data = await response.json();
      setMemos(data.memos || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "메모를 불러오는데 실패했습니다";
      setError(errorMessage);
      console.error("Error fetching category memos:", err);
      setMemos([]); // 에러 시 빈 배열로 설정
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCategoryMemos();
  }, [fetchCategoryMemos]);

  const handleMemoCreated = () => {
    fetchCategoryMemos(); // 새 메모 생성 후 목록 새로고침
    setShowCreateModal(false);
  };

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
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getColorClasses(
                categoryColor
              )}`}
            >
              {categoryName}
            </span>
            <span className="text-sm text-gray-500">로딩 중...</span>
          </div>
        </div>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">메모를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getColorClasses(
                categoryColor
              )}`}
            >
              {categoryName}
            </span>
            <span className="text-sm text-red-500">오류 발생</span>
          </div>
        </div>
        <div className="text-red-500 text-center py-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getColorClasses(
              categoryColor
            )}`}
          >
            {categoryName}
          </span>
          <span className="text-sm text-gray-500">
            {searchQuery && filteredMemos.length !== memos.length
              ? `${filteredMemos.length}/${memos.length}개`
              : `${memos.length}개의 메모`}
          </span>
        </div>
        {filteredMemos.length > 0 && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            새 메모
          </button>
        )}
      </div>

      {filteredMemos.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          {searchQuery ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                검색 결과가 없습니다
              </h3>
              <p className="text-gray-500">
                &quot;{searchQuery}&quot;와 일치하는 메모가 없어요
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                메모가 없습니다
              </h3>
              <p className="text-gray-500 mb-6">첫 번째 메모를 작성해보세요</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                새 메모 작성
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMemos.map((memo) => (
            <div
              key={memo.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => (window.location.href = `/memos/${memo.id}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                  {memo.title}
                </h3>
              </div>

              <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                {memo.content}
              </p>

              {/* 태그 */}
              {memo.tags && memo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {memo.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      #{tag}
                    </span>
                  ))}
                  {memo.tags.length > 3 && (
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">
                      +{memo.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-500">
                {new Date(memo.created_at).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateMemoModal
          onCloseAction={() => setShowCreateModal(false)}
          onMemoCreatedAction={handleMemoCreated}
          initialCategoryId={categoryId}
        />
      )}
    </div>
  );
}
