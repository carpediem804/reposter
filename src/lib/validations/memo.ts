import { z } from "zod";

export const createMemoSchema = z.object({
  title: z
    .string()
    .min(1, "제목을 입력해주세요")
    .max(100, "제목은 100자 이하로 입력해주세요")
    .trim(),
  content: z
    .string()
    .min(1, "내용을 입력해주세요")
    .trim(),
  categoryId: z
    .string()
    .min(1, "카테고리를 선택해주세요"),
  tags: z
    .array(z.string().trim()),
});

export type CreateMemoFormData = z.infer<typeof createMemoSchema>;
