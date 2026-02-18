import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth"
// import ChatInterface from "@/components/ChatInterface";
// import ModelSelectorWrapper from "@/components/ModelSelectorWrapper";
import Header from "@/components/Header";
import { Memo } from "@/types";
import ChatPageClient from "./ChatPageClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  // 서버에서 메모 데이터 미리 가져오기
  let initialMemos: Memo[] = [];

  try {
    const memosResult = await supabase
      .from("memos")
      .select(
        `
        *,
        categories(id, name, color)
      `
      )
      .eq("user_id", session.user!.id!)
      .order("created_at", { ascending: false });

    initialMemos = memosResult.data || [];
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  return (
    <div className="h-screen bg-gray-50">
      <Header />
      <ChatPageClient initialMemos={initialMemos} />
    </div>
  );
}
