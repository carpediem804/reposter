"use client";

import { useState, useEffect } from "react";
import { Memo } from "@/types";
import CreateMemoModal from "./CreateMemoModal";

interface MemoWithCategories extends Memo {
  category_id?: string;
  categories?: {
    id: string;
    name: string;
    color: string;
  };
}

interface MemoListProps {
  initialMemos?: MemoWithCategories[];
  categoryId?: string;
  onMemoCreated?: () => void;
}

export default function MemoList({
  initialMemos = [],
  categoryId,
  onMemoCreated,
}: MemoListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading] = useState(!initialMemos.length);
  const [error] = useState("");

  useEffect(() => {
    // 부모에서 내려주는 데이터만 사용합니다. 클라이언트 사이드 재요청은 하지 않습니다.
  }, [initialMemos]);

  const handleMemoCreated = () => {
    onMemoCreated?.();
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
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">메모를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!initialMemos.length) {
    return (
      <>
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
        </div>
        {showCreateModal && (
          <CreateMemoModal
            onCloseAction={() => setShowCreateModal(false)}
            onMemoCreatedAction={handleMemoCreated}
            initialCategoryId={categoryId}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">
          메모 목록 ({initialMemos.length})
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            className="w-4 h-4 mr-2"
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {initialMemos.map((memo: MemoWithCategories) => (
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

            {/* 카테고리 배지 */}
            {memo.categories && (
              <div className="flex flex-wrap gap-1 mb-3">
                <span
                  className={`px-2 py-1 rounded text-xs border ${getColorClasses(
                    memo.categories.color
                  )}`}
                >
                  {memo.categories.name}
                </span>
              </div>
            )}

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

      {showCreateModal && (
        <CreateMemoModal
          onCloseAction={() => setShowCreateModal(false)}
          onMemoCreatedAction={handleMemoCreated}
          initialCategoryId={categoryId}
        />
      )}
    </>
  );
}
