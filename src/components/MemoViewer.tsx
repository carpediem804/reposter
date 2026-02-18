"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Memo } from "@/types";
import { useUIStore } from "@/store/ui.store";

interface MemoViewerProps {
  memoId: string;
}

export default function MemoViewer({ memoId }: MemoViewerProps) {
  const router = useRouter();
  const { setPendingMemoForChat } = useUIStore();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // 수정 모드 상태
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchMemo(memoId);
  }, [memoId]);

  async function fetchMemo(memoId: string) {
    try {
      const response = await fetch(`/api/memos/${memoId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch memo");
      }
      const data = await response.json();
      setMemo(data.memo);
      setTitle(data.memo.title);
      setContent(data.memo.content);
      setTags(data.memo.tags || []);
    } catch (err) {
      console.error("Error fetching memo:", err);
      setError("메모를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/memos/${memoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          tags,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update memo");
      }

      const data = await response.json();
      setMemo(data.memo);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating memo:", err);
      setError("메모 수정에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("정말로 이 메모를 삭제하시겠습니까?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/memos/${memoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete memo");
      }

      router.push("/memos");
      router.refresh();
    } catch (err) {
      console.error("Error deleting memo:", err);
      setError("메모 삭제에 실패했습니다");
    } finally {
      setIsDeleting(false);
    }
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleEdit = () => {
    setTitle(memo?.title || "");
    setContent(memo?.content || "");
    setTags(memo?.tags || []);
    setTagInput("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTitle(memo?.title || "");
    setContent(memo?.content || "");
    setTags(memo?.tags || []);
    setTagInput("");
    setError("");
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">메모를 불러오는 중...</span>
      </div>
    );
  }

  if (error && !memo) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-lg font-medium">{error}</p>
        </div>
        <button
          onClick={() => router.push("/memos")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          메모 목록으로 돌아가기
        </button>
      </div>
    );
  }

  if (!memo) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-lg font-medium">메모를 찾을 수 없습니다</p>
        </div>
        <button
          onClick={() => router.push("/memos")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          메모 목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">
              {isEditing ? "메모 수정" : memo.title}
            </h1>
            {!isEditing && (
              <div className="flex items-center text-sm text-gray-500 space-x-4">
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0h6M4 7h16M5 7v13a2 2 0 002 2h10a2 2 0 002-2V7"
                    />
                  </svg>
                  {new Date(memo.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {memo.tags && memo.tags.length > 0 && (
                  <div className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-gray-400"
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
                    {memo.tags.length}개 태그
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => router.push("/memos")}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
            title="닫기"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {!isEditing ? (
        /* 보기 모드 */
        <div className="space-y-6">
          {/* 내용 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="prose prose-lg max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed text-base">
                {memo.content}
              </pre>
            </div>
          </div>

          {/* 태그 */}
          {memo.tags && memo.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">태그</h3>
              <div className="flex flex-wrap gap-2">
                {memo.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <svg
                      className="w-3 h-3 mr-1.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI에게 질문하기 - 눈에 띄는 CTA */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-white text-center sm:text-left">
                <h3 className="text-lg font-semibold">이 메모로 AI에게 질문하기</h3>
                <p className="text-sm text-white/80 mt-1">
                  메모 내용을 기반으로 인사이트를 얻어보세요
                </p>
              </div>
              <button
                onClick={() => {
                  if (memo) {
                    setPendingMemoForChat(memo);
                    router.push("/chat");
                  }
                }}
                className="flex items-center px-6 py-3 text-sm font-semibold text-violet-700 bg-white hover:bg-violet-50 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                AI에게 질문하기
              </button>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleEdit}
                className="flex items-center px-6 py-3 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:shadow-sm"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                수정하기
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`flex items-center px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isDeleting
                    ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                    : "text-red-600 bg-red-50 hover:bg-red-100 hover:shadow-sm"
                }`}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-transparent mr-2"></div>
                    삭제 중...
                  </>
                ) : (
                  <>
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    삭제하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 수정 모드 */
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              제목 *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
              placeholder="메모 제목을 입력하세요"
              required
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              내용 *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none bg-white text-gray-900"
              placeholder="메모 내용을 입력하세요"
              required
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              태그
            </label>

            {/* 태그 목록 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-blue-100 text-blue-800 border border-blue-200"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              type="text"
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
              placeholder="태그 입력 후 Enter를 누르세요"
            />
            <p className="text-sm text-gray-500 mt-2">
              태그를 입력하고 Enter 키를 눌러 추가할 수 있습니다
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 수정 모드 버튼 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                취소
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-8 py-3 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg transition-all duration-200 ${
                  isSaving
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-blue-700 hover:border-blue-700 hover:shadow-sm"
                }`}
              >
                {isSaving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    저장 중...
                  </div>
                ) : (
                  <div className="flex items-center">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    저장하기
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
