import { fetchCommitDiff } from "@/lib/github";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string; sha: string }> },
) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json(
      { error: "Server misconfigured: GITHUB_TOKEN not set" },
      { status: 500 },
    );
  }

  const { owner, name, sha } = await params;

  try {
    const diff = await fetchCommitDiff(owner, name, sha, token);
    return new Response(diff, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("404") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
