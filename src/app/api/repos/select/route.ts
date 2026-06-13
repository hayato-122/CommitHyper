import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || !session.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { githubRepoId, name, owner, fullName, isPrivate } = body;

  if (!githubRepoId || !name || !owner || !fullName) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  // 既に選択済みか確認
  const existing = await prisma.repository.findFirst({
    where: { userId: session.user.id, githubRepoId },
  });

  if (existing) {
    return Response.json({ repoId: existing.id });
  }

  // 新規保存
  const repo = await prisma.repository.create({
    data: {
      userId: session.user.id,
      githubRepoId,
      owner,
      name,
      fullName,
      isPrivate,
      selectedAt: new Date(),
    },
  });

  return Response.json({ repoId: repo.id });
}
