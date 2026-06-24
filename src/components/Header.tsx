"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { LogOut, BookOpen, Search } from "lucide-react";

type User = { name: string; avatarUrl: string };

type HeaderProps = {
  left?: ReactNode;
  right?: ReactNode;
  user?: User | null;
};

export function Header({ left, right, user }: HeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const insideSearch = searchRef.current?.contains(e.target as Node);
      const insidePopover = popoverRef.current?.contains(e.target as Node);
      if (!insideSearch && !insidePopover) {
        setSearchOpen(false);
      }
    }
    if (searchOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchOpen]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    const urlMatch = trimmed.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    const plainMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
    const match = urlMatch || plainMatch;
    if (!match) return;

    setSearchOpen(false);
    setSearchInput("");
    router.push(`/evaluate/${match[1]}/${match[2]}`);
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-mist bg-white px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-teal">
              <img src="/icon1.png" alt="CommitHyper" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-medium text-midnight-ink">CommitHyper</span>
          </Link>
          {left}
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          <div ref={searchRef}>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex items-center gap-1.5 text-body-sm text-zinc-500 hover:text-midnight-ink"
              title="公開リポジトリを評価"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
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
        {searchOpen && (
          <div ref={popoverRef} className="absolute right-6 top-full z-30 w-[28rem] rounded-3xl border border-mist bg-white p-6 shadow-subtle">
            <p
              className="mb-4 text-body-sm font-semibold text-midnight-ink"
              style={{ fontFamily: "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif" }}
            >
              公開リポジトリを評価する
            </p>
            <form onSubmit={handleSearchSubmit}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="owner/repo-name または GitHub URL"
                    className="w-full h-12 rounded-2xl border border-mist bg-white px-4 text-body-sm text-midnight-ink placeholder:text-fog-gray focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!searchInput.trim()}
                  className="flex h-12 shrink-0 items-center rounded-2xl bg-brand-teal px-6 text-body-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                >
                  評価する
                </button>
              </div>
            </form>
          </div>
        )}
      </header>
    </>
  );
}
