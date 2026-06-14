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

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${name}/branches?per_page=100`,
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

  const branches = await res.json();
  return Response.json(branches.map((b: { name: string }) => b.name));
}
