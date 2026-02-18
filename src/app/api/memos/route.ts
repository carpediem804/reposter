import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js";
import { Memo } from "@/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MemosResponse {
  memos: Memo[];
}

interface CreateMemoRequest {
  title: string;
  content: string;
  tags?: string[];
  categoryId?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<MemosResponse | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");

    let query = supabase
      .from("memos")
      .select("*, categories(id, name, color)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data: memos, error } = await query;

    if (error) {
      console.error("Error fetching memos:", error);
      return NextResponse.json(
        { error: "Failed to fetch memos" },
        { status: 500 }
      );
    }

    return NextResponse.json({ memos });
  } catch (error) {
    console.error("Error in GET /api/memos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<{ memo: Memo } | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateMemoRequest = await request.json();
    const { title, content, tags, categoryId } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    // 카테고리 존재 확인
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("user_id", session.user.id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const { data: memo, error } = await supabase
      .from("memos")
      .insert([
        {
          user_id: session.user.id,
          title,
          content,
          tags,
          category_id: categoryId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating memo:", error);
      return NextResponse.json(
        { error: "Failed to create memo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ memo });
  } catch (error) {
    console.error("Error in POST /api/memos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
