"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const steps = [
  {
    icon: "📝",
    title: "카테고리 먼저 만들기",
    description:
      "메모를 정리할 카테고리를 먼저 만들어보세요. 예: 업무, 아이디어, 독서 등",
    tip: '상단의 "카테고리 만들기" 버튼을 클릭하세요',
  },
  {
    icon: "✏️",
    title: "메모 작성하기",
    description:
      "생각이 떠오를 때마다 메모하세요. 태그를 추가하면 나중에 찾기 쉬워요.",
    tip: "오른쪽 하단의 ✏️ 버튼으로 언제든지 빠르게 메모할 수 있어요",
  },
  {
    icon: "💬",
    title: "AI에게 질문하기",
    description:
      "메모를 첨부하고 AI에게 질문하세요. 요약, 인사이트, 아이디어 확장 등 다양한 도움을 받을 수 있어요.",
    tip: "메모 상세 페이지에서 'AI에게 질문하기' 버튼을 눌러보세요",
  },
];

export default function OnboardingGuide() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (session) {
      try {
        const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
        if (!hasSeenOnboarding) {
          // 첫 로그인 시 약간의 딜레이 후 온보딩 표시
          const timer = setTimeout(() => setIsOpen(true), 1000);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.warn("localStorage 접근 실패:", e);
      }
    }
  }, [session]);

  const handleClose = () => {
    setIsOpen(false);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("hasSeenOnboarding", "true");
      }
    } catch (e) {
      console.warn("localStorage 저장 실패:", e);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        {/* 프로그레스 바 */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-blue-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* 아이콘 */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center text-4xl">
            {step.icon}
          </div>

          {/* 스텝 인디케이터 */}
          <div className="text-center text-sm text-gray-400 mb-2">
            {currentStep + 1} / {steps.length}
          </div>

          {/* 제목 */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            {step.title}
          </h2>

          {/* 설명 */}
          <p className="text-gray-600 text-center mb-4">{step.description}</p>

          {/* 팁 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-amber-800">
              <span className="font-medium">💡 Tip:</span> {step.tip}
            </p>
          </div>

          {/* 버튼들 */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              건너뛰기
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-medium rounded-lg hover:from-violet-500 hover:to-blue-500 transition-all"
            >
              {currentStep < steps.length - 1 ? "다음" : "시작하기"}
            </button>
          </div>
        </div>

        {/* 스텝 도트 */}
        <div className="flex justify-center gap-2 pb-6">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep
                  ? "bg-violet-600 w-6"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
