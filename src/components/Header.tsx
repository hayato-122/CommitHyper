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
import { LogOut, BookOpen } from "lucide-react";

type User = { name: string; avatarUrl: string };

type HeaderProps = {
  /** Left-side content after logo (breadcrumbs, branch selector, etc.) */
  left?: ReactNode;
  /** Right-side content before the ガイド link and user avatar */
  right?: ReactNode;
  /** Logged-in user (shows avatar dropdown) */
  user?: User | null;
};

export function Header({ left, right, user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-mist bg-white px-6">
      <div className="flex items-center gap-4">
        {/* Logo — always links to / */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-teal">
            <img src="/icon1.png" alt="CommitHyper" className="h-full w-full object-contain" />
          </div>
          <span className="text-sm font-medium text-midnight-ink">CommitHyper</span>
        </Link>
        {left}
      </div>
      <div className="flex flex-1 items-center justify-end gap-4">
        {right}
        <Link href="/guide" className="flex items-center gap-1.5 text-body-sm text-zinc-500 hover:text-midnight-ink">
          <BookOpen className="h-3.5 w-3.5" />
          ガイド
        </Link>
        {user && (
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
