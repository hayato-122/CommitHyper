"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

type User = { name: string; avatarUrl: string };

type HeaderProps = {
  /** Show landing-style header (right-aligned, guide + login button) */
  landing?: boolean;
  /** Show simple style (logo left, guide right) — used on login page */
  simple?: boolean;
  /** Extra content next to the logo (breadcrumbs, branch selector, guide link) */
  left?: ReactNode;
  /** Logged-in user (shows avatar dropdown) */
  user?: User | null;
};

export function Header({ landing, simple, left, user }: HeaderProps) {
  // Landing: 右寄せ、ガイド + ログインボタン
  if (landing) {
    return (
      <header className="flex h-14 shrink-0 items-center justify-end border-b border-mist bg-white px-6">
        <div className="flex items-center gap-4">
          <Link href="/guide" className="text-body-sm text-zinc-500 hover:text-midnight-ink">
            ガイド
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-brand-teal px-5 py-2 text-body-sm font-semibold text-white transition-all hover:brightness-110"
          >
            ログイン
          </Link>
        </div>
      </header>
    );
  }

  // Simple / Dashboard: ロゴ + コンテンツ
  return (
    <header className="flex h-14 items-center justify-between border-b border-mist bg-white px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-teal">
            <img src="/icon1.png" alt="" className="h-full w-full object-contain" />
          </div>
          <span className="text-sm font-medium text-midnight-ink">
            CommitHyper
          </span>
        </Link>
        {left}
      </div>
      <div className="flex items-center gap-4">
        <Link href="/guide" className="text-xs text-zinc-400 hover:text-zinc-600">
          ガイド
        </Link>
        {!simple && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-xs text-zinc-500 hover:text-midnight-ink">
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                )}
                {user.name}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="cursor-pointer gap-2"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
