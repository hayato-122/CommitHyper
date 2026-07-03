export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json(
      { error: "Server misconfigured: GITHUB_TOKEN not set" },
      { status: 500 },
    );
  }

  const { owner, name } = await params;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${name}/branches?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!res.ok) {
    return Response.json(await res.json(), { status: res.status });
  }

  const branches = await res.json();
  return Response.json(branches.map((b: { name: string }) => b.name));
}
