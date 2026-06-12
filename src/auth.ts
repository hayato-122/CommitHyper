import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// NextAuthの設定を行う
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      authorization: {
        // ユーザーとメールアドレス、リポジトリの読み取りの権限を求める                                     │
        params: { scope: "read:user user:email repo" },
      },
    }),
  ],
  // サインインページのURLを指定する
  pages: {
    signIn: "/login",
  },
});
