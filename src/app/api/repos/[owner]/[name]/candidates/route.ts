import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const perPage = 3;

  const repository = await prisma.repository.findFirst({
    where: { userId: session.user.id, owner, name },
  });

  if (!repository) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  const where = {
    repositoryId: repository.id,
    status: "pending",
    currentScore: { lt: 70 },
  };

  const [totalCount, rawCommits] = await Promise.all([
    prisma.commit.count({ where }),
    prisma.commit.findMany({
      where,
      orderBy: [
        { currentScore: "asc" },
        { committedAt: "desc" },
      ],
      take: perPage,
      skip: (page - 1) * perPage,
      include: { evaluations: { orderBy: { evaluatedAt: "desc" }, take: 1 } },
    }),
  ]);

  const commits = rawCommits.map((c) => ({
    ...c,
    firstIssue: c.evaluations?.[0]?.issues
      ? (JSON.parse(c.evaluations[0].issues) as string[])[0] ?? null
      : null,
    exampleMessage: c.evaluations?.[0]?.exampleMessage ?? null,
  }));

  const totalPages = Math.ceil(totalCount / perPage);

  return Response.json({
    commits,
    page,
    totalPages,
    totalCount,
  });
}
