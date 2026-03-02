"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

type RequestRow = { user_id: string; created_at: string };
type UsersMap = Record<string, { name: string; image?: string; provider_id?: string }>;

export default function AdminPremiumPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [users, setUsers] = useState<UsersMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/premium-requests");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            setError("로그인이 필요합니다.");
            return;
          }
          if (res.status === 403) {
            setError("관리자만 접근할 수 있습니다.");
            return;
          }
          setError(data.error || "목록을 불러오지 못했습니다.");
          return;
        }
        setRequests(data.requests ?? []);
        setUsers(data.users ?? {});
      } catch {
        setError("목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleApprove = async (userId: string) => {
    setApproving(userId);
    setError("");
    try {
      const res = await fetch("/api/admin/premium-requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "승인에 실패했습니다.");
        return;
      }
      setRequests((prev) => prev.filter((r) => r.user_id !== userId));
    } catch {
      setError("승인에 실패했습니다.");
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (error && error.includes("로그인")) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => signIn("kakao")}
          className="px-4 py-2 rounded-lg bg-yellow-400 text-black font-medium"
        >
          카카오 로그인
        </button>
      </div>
    );
  }

  if (error && error.includes("관리자만")) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">{error}</p>
        <Link href="/" className="text-blue-600 hover:underline">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Premium 사용 신청 목록</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          홈으로
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <p className="text-gray-500">신청이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li
              key={r.user_id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {users[r.user_id]?.name ?? "(이름 없음)"}
                </p>
                <p className="text-sm text-gray-500 font-mono">{r.user_id}</p>
                <p className="text-xs text-gray-400">
                  신청일: {new Date(r.created_at).toLocaleString("ko-KR")}
                </p>
              </div>
              <button
                onClick={() => handleApprove(r.user_id)}
                disabled={approving === r.user_id}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {approving === r.user_id ? "처리 중..." : "승인"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
