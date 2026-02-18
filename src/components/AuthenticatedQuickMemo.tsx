"use client";

import { useSession } from "next-auth/react";
import QuickMemoButton from "./QuickMemoButton";

export default function AuthenticatedQuickMemo() {
  const { data: session } = useSession();

  // 로그인된 사용자만 플로팅 버튼 표시
  if (!session) return null;

  return <QuickMemoButton />;
}
