import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SelectRepoSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || !session.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = SelectRepoSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid fields", details: parsed.error.flatten() }, { status: 400 });
  }

  const { githubRepoId, name, owner, fullName, isPrivate } = parsed.data;

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
