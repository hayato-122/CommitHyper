import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, name } = await params;

  // DBからリポジトリを取得
  const repository = await prisma.repository.findFirst({
    where: {
      userId: session.user.id,
      owner,
      name,
    },
  });

  if (!repository) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  // 既にコミットがDBにあればそれを返す
  const existingCommits = await prisma.commit.findMany({
    where: { repositoryId: repository.id },
    orderBy: { committedAt: "desc" },
    take: 100,
  });

  if (existingCommits.length > 0) {
    repository.analyzedAt = new Date();
    await prisma.repository.update({
      where: { id: repository.id },
      data: { analyzedAt: new Date() },
    });
    return Response.json(existingCommits);
  }

  // GitHub APIからコミットを取得
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${name}/commits?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!res.ok) {
    return Response.json(await res.json(), { status: res.status });
  }

  const githubCommits = await res.json();

  // DBに保存（shaで重複防止）
  const commits = [];
  for (const c of githubCommits) {
    const existing = await prisma.commit.findFirst({
      where: { repositoryId: repository.id, sha: c.sha },
    });
    if (existing) {
      commits.push(existing);
      continue;
    }

    const commit = await prisma.commit.create({
      data: {
        repositoryId: repository.id,
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author?.name ?? "",
        authorEmail: c.commit.author?.email ?? "",
        committedAt: new Date(c.commit.author?.date ?? c.commit.committer?.date),
        url: c.html_url,
        initialScore: 0,
        currentScore: 0,
        status: "pending",
      },
    });
    commits.push(commit);
  }

  // 解析完了時刻を更新
  await prisma.repository.update({
    where: { id: repository.id },
    data: { analyzedAt: new Date() },
  });

  return Response.json(commits);
}
