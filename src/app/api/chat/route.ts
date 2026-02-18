import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js";
import { callOpenRouterAPI } from "@/lib/openrouter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 입력 검증
    const body = await request.json();
    const bodySchema = z
      .object({
        message: z.string().min(1).max(4000),
        modelId: z.string().min(1),
        selectedMemos: z.array(z.string()).max(50).optional().default([]),
      })
      .strict();
    const { message, modelId, selectedMemos } = bodySchema.parse(body);

    if (!message || !modelId) {
      return NextResponse.json(
        { error: "메시지와 모델이 필요합니다" },
        { status: 400 }
      );
    }

    // DB에서 모델 조회
    const { data: model, error: modelError } = await supabase
      .from("ai_models")
      .select("*")
      .eq("id", modelId)
      .eq("is_active", true)
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: "유효하지 않은 모델입니다" },
        { status: 400 }
      );
    }

    // 선택된 메모들 가져오기
    let memoContext = "";
    if (selectedMemos.length > 0) {
      const { data: memos, error: memoError } = await supabase
        .from("memos")
        .select("title, content, tags")
        .in("id", selectedMemos)
        .eq("user_id", session.user.id);

      if (memoError) {
        console.error("메모 조회 오류:", memoError);
        return NextResponse.json(
          { error: "메모를 불러오는데 실패했습니다" },
          { status: 500 }
        );
      }

      if (memos && memos.length > 0) {
        memoContext =
          "\n\n[첨부된 메모들]\n" +
          memos
            .map(
              (memo) =>
                `제목: ${memo.title}\n내용: ${memo.content}\n태그: ${
                  memo.tags?.join(", ") || "없음"
                }\n---`
            )
            .join("\n");
      }
    }

    // OpenRouter API 호출
    let aiResponse = "";
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    try {
      const messages = [
        {
          role: "system",
          content: `당신은 사용자의 메모를 분석하고 질문에 답변하는 도우미입니다. 
          사용자가 첨부한 메모 내용을 참고하여 정확하고 도움이 되는 답변을 제공해주세요.
          한국어로 답변해주세요.`,
        },
        {
          role: "user",
          content: `${message}${memoContext}`,
        },
      ];

      const response = await callOpenRouterAPI(modelId, messages, {
        maxTokens: Math.min(model.max_tokens, 4000),
        temperature: 0.7,
      });

      aiResponse =
        response.choices[0]?.message?.content || "응답을 생성할 수 없습니다.";
      usage = response.usage;

      console.log(
        `OpenRouter API 사용량: ${usage.total_tokens} tokens (${usage.prompt_tokens} + ${usage.completion_tokens})`
      );
    } catch (error) {
      console.error("OpenRouter API 호출 오류:", error);

      // 폴백: 개발 중인 모델들은 임시 응답
      aiResponse = `[${model.name}] 개발 중인 모델입니다. 실제 구현 시 ${model.provider} API를 호출합니다.\n\n질문: ${message}\n\n첨부된 메모: ${selectedMemos.length}개`;
    }

    // 채팅 세션 생성 또는 업데이트
    const sessionTitle =
      message.length > 50 ? message.substring(0, 50) + "..." : message;

    const { data: chatSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: session.user.id,
        title: sessionTitle,
        model_id: modelId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error("채팅 세션 생성 오류:", sessionError);
      return NextResponse.json(
        { error: "채팅 세션을 생성하는데 실패했습니다" },
        { status: 500 }
      );
    }

    // 사용자 메시지 저장
    await supabase.from("chat_messages").insert({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      session_id: chatSession.id,
      role: "user",
      content: message,
      model_id: modelId,
      memo_ids: selectedMemos,
      created_at: new Date().toISOString(),
    });

    // AI 응답 저장
    await supabase.from("chat_messages").insert({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      session_id: chatSession.id,
      role: "assistant",
      content: aiResponse,
      model_id: modelId,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      response: aiResponse,
      sessionId: chatSession.id,
      usage,
    });
  } catch (error) {
    console.error("채팅 API 오류:", error);
    return NextResponse.json(
      {
        error: "일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
