import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginButton from "@/components/LoginButton";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // 로그인되어 있으면 메모 페이지로 리다이렉트
  if (session) {
    redirect("/memos");
  }

  // 로그인이 안되어 있으면 랜딩 페이지
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      {/* 히어로 섹션 */}
      <div className="relative overflow-hidden">
        {/* 배경 효과 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-600/20 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-32">
          {/* 로고 */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 text-white/60 text-sm font-medium px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              AI 기반 메모 인사이트
            </span>
          </div>

          {/* 메인 헤드라인 */}
          <h1 className="text-center text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            메모에서{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              숨은 인사이트
            </span>
            를<br />
            AI가 찾아드려요
          </h1>

          <p className="text-center text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-12">
            흩어진 생각들을 메모하고, AI에게 물어보세요.
            <br className="hidden sm:block" />
            당신만의 지식 베이스에서 새로운 아이디어가 탄생합니다.
          </p>

          {/* CTA */}
          <div className="flex justify-center mb-16">
            <LoginButton />
          </div>

          {/* 미리보기 이미지/모킹 */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gradient-to-b from-white/10 to-white/5 rounded-2xl border border-white/10 p-1 shadow-2xl shadow-violet-500/10">
              <div className="bg-slate-900/80 rounded-xl p-6 backdrop-blur">
                {/* 모킹 UI */}
                <div className="flex gap-4">
                  {/* 메모 목록 */}
                  <div className="flex-1 space-y-3">
                    <div className="text-xs text-white/40 mb-2">📝 내 메모</div>
                    {[
                      { title: "프로젝트 아이디어", tag: "업무" },
                      { title: "독서 노트: 생각의 탄생", tag: "독서" },
                      { title: "회의 요약 - 2월 계획", tag: "회의" },
                    ].map((memo, i) => (
                      <div
                        key={i}
                        className="p-3 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="text-sm text-white/80">{memo.title}</div>
                        <div className="text-xs text-violet-400 mt-1">
                          #{memo.tag}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AI 채팅 */}
                  <div className="flex-1 bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="text-xs text-white/40 mb-3">💬 AI 채팅</div>
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <div className="bg-violet-600 text-white text-sm px-3 py-2 rounded-lg max-w-[80%]">
                          내 메모들에서 공통된 패턴을 찾아줘
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-white/10 text-white/80 text-sm px-3 py-2 rounded-lg max-w-[80%]">
                          분석 결과, &apos;생산성 향상&apos;이라는 공통 주제가
                          발견됩니다. 특히...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 기능 소개 섹션 */}
      <div className="bg-slate-900/50 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white mb-4">
            왜 AI 메모 채팅인가요?
          </h2>
          <p className="text-center text-white/50 mb-16 max-w-xl mx-auto">
            단순한 메모앱이 아닙니다. 당신의 생각을 이해하고, 연결하고, 확장하는
            AI 파트너입니다.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "📝",
                title: "체계적인 메모 관리",
                desc: "카테고리와 태그로 생각을 정리하세요. 나중에 AI가 맥락을 이해하는 데 도움이 됩니다.",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                icon: "🤖",
                title: "메모 기반 AI 대화",
                desc: "원하는 메모를 첨부하고 질문하면, AI가 당신의 메모를 참고해 맞춤형 답변을 드립니다.",
                gradient: "from-violet-500 to-purple-500",
              },
              {
                icon: "💡",
                title: "숨은 인사이트 발견",
                desc: "흩어진 메모들 사이의 연결고리, 패턴, 새로운 아이디어를 AI가 찾아드립니다.",
                gradient: "from-amber-500 to-orange-500",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 사용 방법 섹션 */}
      <div className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white mb-16">
            3단계로 시작하세요
          </h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
            {[
              { step: "1", title: "메모 작성", desc: "생각이 떠오를 때마다 기록" },
              { step: "2", title: "메모 첨부", desc: "AI에게 물어볼 메모 선택" },
              { step: "3", title: "인사이트 획득", desc: "AI의 분석과 제안 확인" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-3">
                    {item.step}
                  </div>
                  <div className="text-white font-medium">{item.title}</div>
                  <div className="text-white/50 text-sm">{item.desc}</div>
                </div>
                {i < 2 && (
                  <div className="hidden md:block text-white/20 text-3xl">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 최종 CTA */}
      <div className="border-t border-white/5 bg-gradient-to-b from-violet-950/50 to-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-white/50 mb-8">
            무료로 시작할 수 있습니다. 카카오 로그인으로 3초 만에 가입하세요.
          </p>
          <LoginButton />
        </div>
      </div>

      {/* 푸터 */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-white/30 text-sm">
          © 2026 AI 메모 채팅. 당신의 생각을 확장합니다.
        </div>
      </footer>
    </div>
  );
}
