export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json(
      { error: "Server misconfigured: GITHUB_TOKEN not set" },
      { status: 500 },
    );
  }

  const { username } = await params;

  try {
    const url = `https://api.github.com/users/${username}/repos?type=public&per_page=100&sort=updated`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (res.status === 404) {
      return Response.json(
        { error: `ユーザー "${username}" が見つかりません` },
        { status: 404 },
      );
    }

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`);
    }

    const repos: {
      id: number;
      name: string;
      owner: { login: string };
      full_name: string;
      private: boolean;
      description: string | null;
      fork: boolean;
    }[] = await res.json();

    // フォークを除外、公開のみ
    const publicRepos = repos
      .filter((r) => !r.private && !r.fork)
      .map((r) => ({
        id: r.id,
        name: r.name,
        owner: { login: r.owner.login },
        full_name: r.full_name,
        private: r.private,
        description: r.description,
      }));

    return Response.json(publicRepos);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
