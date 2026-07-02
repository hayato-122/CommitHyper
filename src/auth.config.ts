import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * 共通 auth 設定（PrismaAdapter なしで Edge Runtime でも安全）
 * auth.ts が PrismaAdapter を追加して拡張する
 */
export const authConfig = {
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      authorization: {
        params: { scope: "read:user user:email repo" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies Parameters<typeof NextAuth>[0];

/** proxy.ts で使う軽量な auth インスタンス（PrismaAdapter なし） */
export const { auth: proxyAuth } = NextAuth(authConfig);
