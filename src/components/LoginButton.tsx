"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          {session.user?.image && (
            <Image
              src={session.user.image}
              alt="프로필"
              width={40}
              height={40}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <p className="font-medium text-gray-900">{session.user?.name}</p>
            <p className="text-sm text-gray-500">님, 환영합니다!</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("kakao")}
      className="w-full bg-yellow-400 text-gray-900 px-6 py-3 rounded-lg hover:bg-yellow-500 transition-colors font-medium flex items-center justify-center space-x-2"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
      </svg>
      <span>카카오로 로그인</span>
    </button>
  );
}
