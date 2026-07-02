import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all: unknown[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!res.ok) {
      return Response.json(await res.json(), { status: res.status });
    }

    const repos: unknown[] = await res.json();
    if (repos.length === 0) break;

    all.push(...repos);
    if (repos.length < 100) break;
    page++;
  }

  return Response.json(all);
}
