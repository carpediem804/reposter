import { createClient } from "@supabase/supabase-js";
import { Session } from "next-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 로그인한 사용자가 관리자인지 DB(users.is_admin)로 확인.
 * Supabase users 테이블에서 본인 행의 is_admin 을 true 로 바꾸면 관리자.
 */
export async function isAdmin(session: Session | null): Promise<boolean> {
  if (!session?.user?.id) return false;
  const { data } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", session.user.id)
    .single();
  return data?.is_admin === true;
}
