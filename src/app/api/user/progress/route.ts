import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const LEVELS = [
  { level: 1, xpRequired: 0, title: "Commit Beginner" },
  { level: 2, xpRequired: 100, title: "Message Trainer" },
  { level: 3, xpRequired: 250, title: "History Cleaner" },
  { level: 4, xpRequired: 450, title: "Commit Craftsman" },
  { level: 5, xpRequired: 700, title: "Git Log Master" },
];

function calcLevel(xp: number) {
  let current = LEVELS[0];
  let next = LEVELS[1] ?? null;
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) {
      current = l;
      const idx = LEVELS.indexOf(l);
      next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
    }
  }
  const xpInLevel = xp - current.xpRequired;
  const xpToNext = next ? next.xpRequired - current.xpRequired : 1;
  const progress = Math.min(100, Math.round((xpInLevel / xpToNext) * 100));
  return {
    level: current.level,
    title: current.title,
    xp,
    nextLevel: next ? next.level : current.level,
    nextTitle: next ? next.title : current.title,
    progress,
    xpToNext: next ? xpToNext - xpInLevel : 0,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xp: true, level: true, title: true, name: true, image: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({
    ...calcLevel(user.xp),
    name: user.name,
    avatarUrl: user.image,
  });
}
