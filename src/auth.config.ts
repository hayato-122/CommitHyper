import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { auth: middlewareAuth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      authorization: {
        params: { scope: "read:user user:email repo" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
