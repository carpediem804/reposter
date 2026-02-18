"use client";
import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CategoryManagerProps {
  onClose: () => void;
  onCategoryChange: () => void;
}

const COLOR_OPTIONS = [
  { name: "보라", value: "violet" },
  { name: "파랑", value: "blue" },
  { name: "초록", value: "green" },
  { name: "노랑", value: "yellow" },
  { name: "주황", value: "orange" },
  { name: "빨강", value: "red" },
  { name: "핑크", value: "pink" },
  { name: "회색", value: "gray" },
];

export default function CategoryManager({
  onClose,
  onCategoryChange,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("violet");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("violet");
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("카테고리 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    if (name.length > 50) {
      setErrorMsg("카테고리명은 50자 이하로 입력해주세요.");
      return;
    }
    const exists = categories.some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setErrorMsg("이미 존재하는 카테고리명입니다.");
      return;
    }

    try {
      setIsCreating(true);
      setErrorMsg("");
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newColor }),
      });

      if (res.ok) {
        setNewName("");
        setNewColor("violet");
        await fetchCategories();
        onCategoryChange();
      } else {
        const data = await res.json();
        const errorMsg = data?.error || "카테고리 생성 실패";
        const details = data?.details ? ` (${data.details})` : "";
        setErrorMsg(errorMsg + details);
        console.error("카테고리 생성 API 오류:", data);
      }
    } catch (error) {
      console.error("카테고리 생성 실패:", error);
      setErrorMsg("카테고리 생성 중 오류가 발생했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    if (name.length > 50) {
      setErrorMsg("카테고리명은 50자 이하로 입력해주세요.");
      return;
    }
    const exists = categories.some(
      (c) => c.id !== editingId && c.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setErrorMsg("이미 존재하는 카테고리명입니다.");
      return;
    }

    try {
      setIsUpdating(true);
      setErrorMsg("");
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: editColor }),
      });

      if (res.ok) {
        setEditingId(null);
        setEditName("");
        setEditColor("violet");
        await fetchCategories();
        onCategoryChange();
      } else {
        const data = await res.json();
        setErrorMsg(data?.error || "카테고리 수정 실패");
      }
    } catch (error) {
      console.error("카테고리 수정 실패:", error);
      setErrorMsg("카테고리 수정 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    // 먼저 해당 카테고리에 속한 메모 개수 확인
    try {
      const memosRes = await fetch(`/api/memos?category_id=${id}`);
      const memosData = await memosRes.json();
      const memoCount = memosData.memos?.length || 0;

      let confirmMessage = "이 카테고리를 삭제하시겠습니까?";
      if (memoCount > 0) {
        confirmMessage = `이 카테고리와 함께 ${memoCount}개의 메모가 삭제됩니다. 정말 삭제하시겠습니까?`;
      }

      if (!confirm(confirmMessage)) return;

      setDeletingId(id);
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        await fetchCategories();
        onCategoryChange();

        // 성공 메시지 표시 (선택사항)
        if (data.deletedMemosCount > 0) {
          alert(
            `카테고리와 ${data.deletedMemosCount}개의 메모가 삭제되었습니다.`
          );
        } else {
          alert("카테고리가 삭제되었습니다.");
        }
      } else {
        const data = await res.json();
        setErrorMsg(data?.error || "카테고리 삭제 실패");
      }
    } catch (error) {
      console.error("카테고리 삭제 실패:", error);
      setErrorMsg("카테고리 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("violet");
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
      <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-2 text-gray-600">
            카테고리를 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">카테고리 관리</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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

        {/* 새 카테고리 추가 */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            새 카테고리 추가
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="카테고리 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setNewColor(color.value)}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    newColor === color.value
                      ? getColorClasses(color.value)
                      : "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {color.name}
                </button>
              ))}
            </div>
            {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || isCreating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>

        {/* 기존 카테고리 목록 */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">기존 카테고리</h3>
          {categories.length === 0 ? (
            <p className="text-gray-500 text-sm">카테고리가 없습니다.</p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                {editingId === category.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      onKeyPress={(e) => e.key === "Enter" && handleUpdate()}
                    />
                    <div className="flex gap-1 flex-wrap">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setEditColor(color.value)}
                          className={`px-2 py-1 rounded text-xs border ${
                            editColor === color.value
                              ? getColorClasses(color.value)
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {color.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isUpdating ? "저장 중..." : "저장"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isUpdating}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:opacity-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs border ${getColorClasses(
                          category.color
                        )}`}
                      >
                        {category.name}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(category)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-4 h-4"
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
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        disabled={deletingId === category.id}
                        className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
