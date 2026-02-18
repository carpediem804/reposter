"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navItems = [
    { href: "/memos", label: "메모", icon: "📝" },
    { href: "/chat", label: "AI 채팅", icon: "💬" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* 로고 */}
          <Link
            href="/memos"
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
              AI
            </div>
            <span className="hidden sm:block text-white font-semibold tracking-tight">
              메모 채팅
            </span>
          </Link>

          {/* 네비게이션 */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "text-white bg-white/10"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="sm:hidden text-base">{item.icon}</span>
                  <span className="hidden sm:flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full" />
                  )}
                </Link>
              );
            })}

            {/* 구분선 */}
            <div className="w-px h-6 bg-white/10 mx-2 hidden sm:block" />

            {/* 사용자 프로필 */}
            {session && (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt="프로필"
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full ring-2 ring-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                      {session.user?.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="hidden md:block text-sm text-white/80 max-w-[100px] truncate">
                    {session.user?.name}
                  </span>
                  <svg
                    className={`w-4 h-4 text-white/40 transition-transform ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* 드롭다운 메뉴 */}
                {isProfileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 py-2 bg-slate-800 rounded-xl shadow-xl border border-white/10 z-20 animate-fade-in">
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="text-sm font-medium text-white truncate">
                          {session.user?.name}
                        </p>
                        <p className="text-xs text-white/50 truncate">
                          카카오 로그인
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          signOut();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2"
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
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        로그아웃
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
