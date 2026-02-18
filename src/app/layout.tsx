import { Providers } from "./providers";
import "./globals.css";
import { Metadata } from "next";
import AuthenticatedQuickMemo from "@/components/AuthenticatedQuickMemo";
import OnboardingGuide from "@/components/OnboardingGuide";

export const metadata: Metadata = {
  title: "AI 메모 채팅",
  description: "메모 기반 AI 질의응답 시스템",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          {children}
          <AuthenticatedQuickMemo />
          <OnboardingGuide />
        </Providers>
      </body>
    </html>
  );
}
