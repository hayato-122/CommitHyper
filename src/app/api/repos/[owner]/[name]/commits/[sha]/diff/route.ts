import { auth } from "@/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string; sha: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, name, sha } = await params;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${name}/commits/${sha}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github.v3.diff",
      },
    }
  );

  if (!res.ok) {
    return Response.json({ error: "Failed to fetch diff" }, { status: res.status });
  }

  const diff = await res.text();
  return new Response(diff, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
