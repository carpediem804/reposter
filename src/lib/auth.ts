import { NextAuthOptions } from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import { createClient } from "@supabase/supabase-js";
import { User, KakaoProfile } from "@/types";

async function saveUserToSupabase(userData: Partial<User>): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("users")
    .upsert(userData, { onConflict: "provider_id" });

  if (error) {
    console.error("Error saving user:", error);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;

        if (user) {
          token.sub = user.id;
          token.provider_id = user.id;
          token.name = user.name;
          token.picture = user.image;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.provider = token.provider as string;

      if (session.user) {
        session.user.id = token.sub as string;
        session.user.provider_id = token.provider_id as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }

      return session;
    },

    async signIn({ account, profile }) {
      const kakaoProfile = profile as KakaoProfile;

      if (account?.provider === "kakao") {
        const kakaoUser: Partial<User> = {
          id: kakaoProfile.id.toString(),
          provider_id: kakaoProfile.id.toString(),
          name: kakaoProfile.properties.nickname,
          image: kakaoProfile.properties.profile_image,
          thumbnail_image: kakaoProfile.properties.thumbnail_image,
          provider: "kakao",
          connected_at: kakaoProfile.connected_at,
        };

        await saveUserToSupabase(kakaoUser);
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
};
