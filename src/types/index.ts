import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    provider?: string;
    user: {
      id: string;
      provider_id: string;
      name: string;
      image: string;
    };
  }
}

export interface KakaoProfile {
  id: number;
  connected_at: string;
  properties: {
    nickname: string;
    profile_image: string;
    thumbnail_image: string;
  };
  kakao_account: {
    profile_nickname_needs_agreement: boolean;
    profile_image_needs_agreement: boolean;
    profile: {
      nickname: string;
      thumbnail_image_url: string;
      profile_image_url: string;
      is_default_image: boolean;
      is_default_nickname: boolean;
    };
  };
}

export interface User {
  id: string;
  provider_id: string;
  name: string;
  image: string;
  thumbnail_image?: string;
  provider: string;
  connected_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Memo {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  model_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model_id: string;
  memo_ids?: string[];
  created_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface LLMProvider {
  provider: "openai" | "anthropic" | "google";
  name: string;
  maxTokens: number;
}

export interface ChatRequest {
  message: string;
  model: string;
  selectedMemoIds?: string[];
  sessionId: string;
}

export interface ChatResponse {
  response: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: {
    input: string;
    output: string;
    estimatedCost: string;
  };
  features: string[];
  isFree: boolean;
  maxTokens: number;
  contextLength: number;
}
