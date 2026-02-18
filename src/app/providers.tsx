"use client";

import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

interface ProvidersProps {
  children: ReactNode;
  session?: Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
