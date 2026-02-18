import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";
import Header from "@/components/Header";
import MemosClient from "./MemosClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function MemosPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  // 서버에서 카테고리 데이터만 미리 가져오기
  let categories: Array<{ id: string; name: string; color: string }> = [];

  try {
    const categoriesResult = await supabase
      .from("categories")
      .select("id, name, color")
      .eq("user_id", session.user!.id!)
      .order("name");

    categories = categoriesResult.data || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <MemosClient categories={categories} />
      </div>
    </div>
  );
}
