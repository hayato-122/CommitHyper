import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateCommit } from "@/lib/evaluateCommit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, name } = await params;
  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "true";
  const branch = url.searchParams.get("branch") || "default";

  const repository = await prisma.repository.findFirst({
    where: { userId: session.user.id, owner, name },
  });

  if (!repository) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  if (!refresh && repository.analyzedAt) {
    const existingCommits = await prisma.commit.findMany({
      where: { repositoryId: repository.id },
      orderBy: { committedAt: "desc" },
      take: 100,
      include: { evaluations: { orderBy: { evaluatedAt: "desc" }, take: 1 } },
    });
    if (existingCommits.length > 0) {
      return Response.json(
        existingCommits.map((c) => ({
          id: c.id,
          sha: c.sha,
          message: c.message,
          authorName: c.authorName,
          authorEmail: c.authorEmail,
          committedAt: c.committedAt,
          url: c.url,
          initialScore: c.initialScore,
          currentScore: c.currentScore,
          status: c.status,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          repositoryId: c.repositoryId,
          firstIssue: c.evaluations?.[0]?.issues
            ? (JSON.parse(c.evaluations[0].issues) as string[])[0] ?? null
            : null,
          exampleMessage: c.evaluations?.[0]?.exampleMessage ?? null,
        }))
      );
    }
  }

  if (refresh) {
    await prisma.commitEvaluation.deleteMany({
      where: { commit: { repositoryId: repository.id } },
    });
    await prisma.commit.deleteMany({
      where: { repositoryId: repository.id },
    });
  }

  const apiUrl = branch && branch !== "default"
    ? `https://api.github.com/repos/${owner}/${name}/commits?sha=${encodeURIComponent(branch)}&per_page=100`
    : `https://api.github.com/repos/${owner}/${name}/commits?per_page=100`;

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) {
    return Response.json(await res.json(), { status: res.status });
  }

  const githubCommits = await res.json();

  const commits = [];
  for (const c of githubCommits) {
    const evalResult = evaluateCommit(c.commit.message);
    const status = evalResult.score >= 70 ? "excellent" : "pending";

    const commit = await prisma.commit.create({
      data: {
        repositoryId: repository.id,
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author?.name ?? "",
        authorEmail: c.commit.author?.email ?? "",
        committedAt: new Date(c.commit.author?.date ?? c.commit.committer?.date),
        url: c.html_url,
        initialScore: evalResult.score,
        currentScore: evalResult.score,
        status,
      },
    });

    await prisma.commitEvaluation.create({
      data: {
        commitId: commit.id,
        targetMessage: c.commit.message,
        score: evalResult.score,
        rank: evalResult.rank,
        issues: JSON.stringify(evalResult.issues),
        suggestions: JSON.stringify(evalResult.suggestions),
        exampleMessage: evalResult.exampleMessage,
      },
    });

    commits.push({
      ...commit,
      firstIssue: evalResult.issues[0] ?? null,
      exampleMessage: evalResult.exampleMessage,
    });
  }

  await prisma.repository.update({
    where: { id: repository.id },
    data: { analyzedAt: new Date() },
  });

  return Response.json(commits);
}
