"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Memo } from "@/types";
import { createMemoSchema, CreateMemoFormData } from "@/lib/validations/memo";

interface CreateMemoModalProps {
  onCloseAction: () => void;
  onMemoCreatedAction: (memo: Memo) => void;
  initialCategoryId?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function CreateMemoModal({
  onCloseAction,
  onMemoCreatedAction,
  initialCategoryId,
}: CreateMemoModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMemoFormData>({
    resolver: zodResolver(createMemoSchema),
    defaultValues: {
      title: "",
      content: "",
      categoryId: initialCategoryId || "",
      tags: [],
    },
    mode: "onChange",
  });

  const watchedTags = watch("tags");

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
    }
  };

  const onSubmit = async (data: CreateMemoFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/memos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          tags: data.tags,
          categoryId: data.categoryId,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "메모 생성에 실패했습니다");
      }

      const memo = responseData.memo as Memo;
      onMemoCreatedAction(memo);
    } catch (error) {
      console.error("Error creating memo:", error);
      alert(
        error instanceof Error ? error.message : "메모 생성에 실패했습니다"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // IME(한글 등) 조합 중 Enter는 무시
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isComposing = (e.nativeEvent as any)?.isComposing;
    if (isComposing) return;

    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      const raw = e.currentTarget.value;
      const next = raw.trim();
      if (!next) return;

      const currentTags = watchedTags || [];
      if (!currentTags.includes(next)) {
        setValue("tags", [...currentTags, next], { shouldDirty: true });
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = watchedTags || [];
    setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove),
      { shouldDirty: true }
    );
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

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl border border-gray-200">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-bold text-gray-900">새 메모 작성</h2>
          <button
            onClick={onCloseAction}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg
              className="w-5 h-5"
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

        {/* 콘텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-white">
          {categories.length === 0 && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left">
              <div className="text-sm font-medium text-amber-900">
                카테고리가 없어서 메모를 작성할 수 없어요
              </div>
              <div className="mt-1 text-sm text-amber-800">
                먼저 <span className="font-medium">카테고리 관리</span>에서
                카테고리를 만든 뒤 다시 메모를 작성해 주세요.
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* 제목 */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                제목 *
              </label>
              <input
                {...register("title")}
                type="text"
                id="title"
                className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 ${
                  errors.title ? "border-red-300" : "border-gray-200"
                }`}
                placeholder="메모 제목을 입력하세요"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* 내용 */}
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                내용 *
              </label>
              <textarea
                {...register("content")}
                id="content"
                rows={8}
                className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none bg-white text-gray-900 ${
                  errors.content ? "border-red-300" : "border-gray-200"
                }`}
                placeholder="메모 내용을 입력하세요"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.content.message}
                </p>
              )}
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리 *
              </label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => field.onChange(category.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          field.value === category.id
                            ? getColorClasses(category.color)
                            : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.categoryId.message}
                </p>
              )}
            </div>

            {/* 태그 */}
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                태그
              </label>

              {/* 태그 목록 */}
              {watchedTags && watchedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {watchedTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
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
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
                placeholder="태그 입력 후 Enter를 누르세요"
              />
              <p className="text-sm text-gray-500 mt-1">
                태그를 입력하고 Enter 키를 눌러 추가할 수 있습니다
              </p>
            </div>
          </form>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onCloseAction}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            취소
          </button>
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className={`px-6 py-2 text-sm font-medium text-white bg-blue-500 border-2 border-blue-500 rounded-lg transition-all ${
              isSubmitting
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-600 hover:border-blue-600"
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                저장 중...
              </div>
            ) : (
              "저장"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
