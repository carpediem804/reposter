import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
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

    const body = await request.json();

    const bodySchema = z
      .object({
        message: z.string().min(1).max(4000),
        modelId: z.string().min(1),
        selectedMemos: z.array(z.string()).max(50).optional().default([]),
        selectedTags: z.array(z.string()).max(100).optional().default([]),
        selectedCategory: z.string().optional(),
        // 클라이언트에서 넘어오는 다중 카테고리 키(서버에서는 저장에 사용하지 않음)
        selectedCategories: z.array(z.string()).optional().default([]),
        sessionId: z.string().nullable().optional(),
      })
      .strict();

    const {
      message,
      modelId,
      selectedMemos,
      selectedTags,
      selectedCategory,
      sessionId,
    } = bodySchema.parse(body);

    if (!message || !modelId) {
      return NextResponse.json(
        { error: "메시지와 모델이 필요합니다" },
        { status: 400 }
      );
    }

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

      if (!memoError && memos) {
        memoContext =
          "\n\n[첨부된 메모들]\n" +
          memos
            .map(
              (m) =>
                `제목: ${m.title}\n내용: ${m.content}\n태그: ${
                  m.tags?.join(", ") || "없음"
                }`
            )
            .join("\n\n");
      }
    }

    // 선택된 태그로 메모들 가져오기
    if (selectedTags.length > 0) {
      const { data: tagMemos, error: tagError } = await supabase
        .from("memos")
        .select("title, content, tags")
        .eq("user_id", session.user.id)
        .overlaps("tags", selectedTags);

      if (!tagError && tagMemos) {
        const tagContext =
          "\n\n[태그 관련 메모들]\n" +
          tagMemos
            .map(
              (m) =>
                `제목: ${m.title}\n내용: ${m.content}\n태그: ${
                  m.tags?.join(", ") || "없음"
                }`
            )
            .join("\n\n");
        memoContext += tagContext;
      }
    }

    // 채팅 세션 처리 (기존 세션이 있으면 사용, 없으면 새로 생성)
    let chatSession;

    if (sessionId) {
      // 기존 세션 사용
      const { data: existingSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", session.user.id)
        .single();

      if (sessionError || !existingSession) {
        console.error("기존 세션 조회 오류:", sessionError);
        return NextResponse.json(
          { error: "채팅 세션을 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      chatSession = existingSession;

      // 세션 업데이트 시간 갱신
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    } else {
      // 새 세션 생성
      const sessionTitle =
        message.length > 50 ? message.substring(0, 50) + "..." : message;

      const sessionData: Record<string, unknown> = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: session.user.id,
        title: sessionTitle,
        model_id: modelId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 선택된 카테고리가 있으면 세션에 저장
      if (selectedCategory) {
        sessionData.category_id = selectedCategory;
      }

      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert(sessionData)
        .select()
        .single();

      if (sessionError) {
        console.error("세션 생성 오류:", sessionError);
        return NextResponse.json(
          { error: "채팅 세션을 생성할 수 없습니다" },
          { status: 500 }
        );
      }

      chatSession = newSession;
    }

    // 사용자 메시지 저장
    const userMessageId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    await supabase.from("chat_messages").insert({
      id: userMessageId,
      session_id: chatSession.id,
      role: "user",
      content: message,
      model_id: modelId,
      memo_ids: selectedMemos,
      created_at: new Date().toISOString(),
    });

    // Assistant 메시지 ID 생성
    const assistantMessageId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 스트리밍 응답 설정
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 클라이언트가 새로 생성된 세션 ID를 알 수 있도록 먼저 전달
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "session",
                sessionId: chatSession.id,
              })}\n\n`
            )
          );

          // 초기 응답 메시지 저장
          await supabase.from("chat_messages").insert({
            id: assistantMessageId,
            session_id: chatSession.id,
            role: "assistant",
            content: "",
            model_id: modelId,
            created_at: new Date().toISOString(),
          });

          let fullResponse = "";

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

            const requestBody = {
              model: modelId,
              messages,
              max_tokens: Math.min(model.max_tokens, 4000),
              temperature: 0.7,
              stream: true,
            };


            const response = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer":
                    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                  "X-Title": "AI Memo Chat",
                },
                body: JSON.stringify(requestBody),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error("OpenRouter API 에러 응답:", errorText);
              throw new Error(
                `OpenRouter API 오류: ${response.status} - ${errorText}`
              );
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("스트림을 읽을 수 없습니다");

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") {
                    // 스트리밍 완료
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "done" })}\n\n`
                      )
                    );

                    // 최종 응답을 DB에 업데이트
                    await supabase
                      .from("chat_messages")
                      .update({ content: fullResponse })
                      .eq("id", assistantMessageId);

                    // 세션 제목 업데이트 (첫 번째 응답 기반)
                    if (fullResponse.length > 20) {
                      const title = fullResponse.substring(0, 50) + "...";
                      await supabase
                        .from("chat_sessions")
                        .update({ title, updated_at: new Date().toISOString() })
                        .eq("id", chatSession.id);
                    }

                    controller.close();
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.choices?.[0]?.delta?.content) {
                      const content = parsed.choices[0].delta.content;
                      fullResponse += content;

                      // 스트리밍 데이터 전송
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            type: "content",
                            content,
                          })}\n\n`
                        )
                      );
                    }
                  } catch {
                    // JSON 파싱 오류 무시
                  }
                }
              }
            }
          } catch (error) {
            console.error("OpenRouter API 호출 오류:", error);

            // 폴백 응답
            const fallbackResponse = `[${model.name}] 개발 중인 모델입니다. 실제 구현 시 ${model.provider} API를 호출합니다.\n\n질문: ${message}\n\n첨부된 메모: ${selectedMemos.length}개`;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "content",
                  content: fallbackResponse,
                })}\n\n`
              )
            );

            // 폴백 응답을 DB에 저장
            await supabase
              .from("chat_messages")
              .update({ content: fallbackResponse })
              .eq("id", assistantMessageId);

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
            );
            controller.close();
          }
        } catch (error) {
          console.error("스트리밍 오류:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("채팅 API 오류:", error instanceof Error ? error.message : error);

    return NextResponse.json(
      { error: "일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
