import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // ログインしているかチェック
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // DBからGitHubのアクセストークンを取得
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
  });
  if (!account?.access_token) {
    return Response.json({ error: "No GitHub token" }, { status: 401 });
  }

  // GitHub APIを呼び出し
  const res = await fetch("https://api.github.com/user/repos", {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  const repos = await res.json();

  // レスポンスを返す
  return Response.json(repos);
}
