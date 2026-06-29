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
import { LogOut, BookOpen, Search, Menu } from "lucide-react";

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
    const userUrlMatch = trimmed.match(/github\.com\/([\w.-]+)\/?$/);
    const plainMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
    const plainUserMatch = trimmed.match(/^@?([\w.-]+)$/);

    if (urlMatch) {
      router.push(`/evaluate/${urlMatch[1]}/${urlMatch[2]}`);
    } else if (userUrlMatch) {
      router.push(`/evaluate/users/${userUrlMatch[1]}`);
    } else if (plainMatch) {
      router.push(`/evaluate/${plainMatch[1]}/${plainMatch[2]}`);
    } else if (plainUserMatch) {
      router.push(`/evaluate/users/${plainUserMatch[1]}`);
    } else {
      return;
    }

    setSearchOpen(false);
    setSearchInput("");
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-mist bg-white px-4 md:px-6 gap-2 md:gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-teal">
              <img src="/icon1.png" alt="CommitHyper" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-medium text-midnight-ink">CommitHyper</span>
          </Link>
          {left}
        </div>
        <div className="flex flex-1 items-center justify-end gap-1 md:gap-4">
          {right}
          {/* Desktop: search + guide + user */}
          <div ref={searchRef} className="hidden md:block">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex items-center gap-1.5 text-body-sm text-zinc-500 hover:text-midnight-ink"
              title="公開リポジトリを評価"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          <Link href="/guide" className="hidden md:flex items-center gap-1.5 text-body-sm text-zinc-500 hover:text-midnight-ink">
            <BookOpen className="h-3.5 w-3.5" />
            ガイド
          </Link>
          {user && (
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-xs text-zinc-500 hover:text-midnight-ink">
                    {user.avatarUrl && <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" />}
                    {user.name}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="cursor-pointer gap-2">
                    <LogOut className="h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {/* Mobile: hamburger with all items */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center text-zinc-500 hover:text-midnight-ink">
                  <Menu className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user && (
                  <div className="flex items-center gap-2 px-2 py-2 border-b border-mist">
                    {user.avatarUrl && <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />}
                    <span className="text-sm font-medium text-midnight-ink truncate">{user.name}</span>
                  </div>
                )}
                <DropdownMenuItem onClick={() => { setSearchOpen(true); }} className="cursor-pointer gap-2">
                  <Search className="h-4 w-4" />
                  リポジトリを検索
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/guide")} className="cursor-pointer gap-2">
                  <BookOpen className="h-4 w-4" />
                  ガイド
                </DropdownMenuItem>
                {user && (
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="cursor-pointer gap-2 border-t border-mist">
                    <LogOut className="h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {searchOpen && (
          <div ref={popoverRef} className="absolute right-4 md:right-6 top-full z-30 w-[90vw] max-w-[28rem] rounded-3xl border border-mist bg-white p-6 shadow-subtle">
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
