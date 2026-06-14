"use client";

import Link from "next/link";
import { GitCommitHorizontal } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

const VALID_TYPES = [
  { type: "feat", desc: "新機能" },
  { type: "fix", desc: "バグ修正" },
  { type: "docs", desc: "ドキュメントのみの変更" },
  { type: "refactor", desc: "リファクタリング（機能追加・バグ修正なし）" },
  { type: "test", desc: "テストの追加・修正" },
  { type: "style", desc: "コードの意味に影響しない変更（空白・フォーマット等）" },
  { type: "chore", desc: "ビルドプロセス・ツール・依存関係の変更" },
  { type: "build", desc: "ビルドシステム・外部依存関係の変更" },
  { type: "ci", desc: "CI設定・スクリプトの変更" },
  { type: "perf", desc: "パフォーマンス改善" },
];

const CRITERIA = [
  { name: "形式の明確さ", points: 20, desc: "type(scope): summary の形式に従っているか" },
  { name: "変更種別の適切さ", points: 15, desc: "feat/fix 等のtypeが変更内容に合っているか" },
  { name: "Summaryの具体性", points: 25, desc: "何を変更したかが具体的に伝わるか" },
  { name: "Why・背景の説明", points: 20, desc: "なぜ変更したか、目的が伝わるか" },
  { name: "読みやすさ", points: 10, desc: "1行目の文字数が適切か（推奨: 10〜72文字）" },
  { name: "業務での追跡しやすさ", points: 10, desc: "scopeやIssue番号など、追跡に役立つ情報があるか" },
];

export default function GuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-pearl">
      <header className="flex h-14 items-center border-b border-mist bg-white px-6">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal">
            <GitCommitHorizontal className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-midnight-ink">CommitHyper</span>
        </Link>
        <div className="mx-4 h-4 w-px bg-zinc-200" />
        <span className="text-sm text-zinc-500">ガイド</span>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <ScrollReveal>
          <h1 className="text-[2rem] font-semibold leading-none tracking-tight text-midnight-ink">
            良いコミットメッセージとは
          </h1>
          <p className="mt-4 text-body leading-relaxed text-zinc-600">
            コミットメッセージは、未来の自分やチームメンバーが変更履歴を見返したときに、
            「何を」「なぜ」変更したのかを理解できるように書くことが最も重要です。
            このページでは、CommitHyper が推奨する良いコミットメッセージの書き方を説明します。
          </p>
        </ScrollReveal>

        {/* Recommended Format */}
        <section className="mt-16">
          <ScrollReveal>
            <h2 className="text-heading-sm font-semibold text-midnight-ink">
              推奨フォーマット
            </h2>
            <p className="mt-2 text-body text-zinc-500">
              Conventional Commits の形式をベースにしています。
            </p>
            <div className="mt-6 rounded-3xl border border-mist bg-white p-6">
              <code className="text-lg font-medium text-midnight-ink">
                type(scope): summary
              </code>
              <div className="mt-4 space-y-2 text-body-sm text-zinc-600">
                <p><span className="font-medium text-brand-teal">type</span> — 変更の種類（feat / fix / refactor 等）</p>
                <p><span className="font-medium text-zinc-500">(scope)</span> — 変更箇所（省略可。auth / ui / db 等）</p>
                <p><span className="font-medium text-zinc-500">summary</span> — 変更内容の要約</p>
              </div>
              <div className="mt-4 rounded-xl bg-pearl p-4">
                <p className="text-sm font-medium text-zinc-500">良い例</p>
                <code className="mt-1 block text-sm text-midnight-ink">
                  feat(auth): GitHubログインボタンを追加する
                </code>
                <code className="mt-1 block text-sm text-midnight-ink">
                  fix(ui): ボタンのホバー色を修正する
                </code>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Body */}
        <section className="mt-16">
          <ScrollReveal>
            <h2 className="text-heading-sm font-semibold text-midnight-ink">
              本文（Body）で変更内容を補足する
            </h2>
            <p className="mt-2 text-body text-zinc-500">
              サマリー（1行目）だけで伝えきれないときは、
              空行の後に本文を追加し、変更内容を箇条書き（<code className="rounded bg-zinc-100 px-1 text-caption">-</code>）で書くと
              より読みやすくなります。
            </p>
            <div className="mt-6 rounded-3xl border border-mist bg-white p-6">
              <div className="rounded-xl bg-peat p-4">
                <p className="text-sm font-medium text-zinc-500">完全なコミットメッセージの例</p>
                <div className="mt-2 space-y-1">
                  <code className="block text-sm text-brand-teal">feat(auth): GitHubログインボタンを追加する</code>
                  <code className="block text-sm text-zinc-400">{" "}</code>
                  <code className="block text-sm text-midnight-ink">- トップページにGitHub OAuth認証の入り口を追加</code>
                  <code className="block text-sm text-midnight-ink">- Auth.js v5でコールバック処理を実装</code>
                  <code className="block text-sm text-midnight-ink">- ログイン後はダッシュボードにリダイレクトする</code>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-body-sm text-zinc-600">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-brand-teal/10 px-2 py-0.5 text-caption font-medium text-brand-teal">S</span>
                  <span><span className="font-medium">サマリー（Summary）</span> — 1行目。type(scope): 要約の形式で、何をしたか一言で</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-caption font-medium text-zinc-500">B</span>
                  <span><span className="font-medium">本文（Body）</span> — 空行の後。<code className="rounded bg-zinc-100 px-1 text-caption">-</code> で箇条書きすると、変更内容を整理して伝えられる</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Type List */}
        <section className="mt-16">
          <ScrollReveal>
            <h2 className="text-heading-sm font-semibold text-midnight-ink">
              Type 一覧
            </h2>
            <p className="mt-2 text-body text-zinc-500">
              type は変更の種類を表します。この中から適切なものを選んでください。
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {VALID_TYPES.map((t) => (
                <div key={t.type} className="rounded-2xl border border-mist bg-white p-4">
                  <code className="text-sm font-semibold text-brand-teal">{t.type}</code>
                  <p className="mt-1 text-body-sm text-zinc-500">{t.desc}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Evaluation Criteria */}
        <section className="mt-16">
          <ScrollReveal>
            <h2 className="text-heading-sm font-semibold text-midnight-ink">
              CommitHyper の評価観点
            </h2>
            <p className="mt-2 text-body text-zinc-500">
              コミットメッセージは以下の6項目、合計100点で評価されます。
            </p>
            <div className="mt-6 space-y-4">
              {CRITERIA.map((c) => (
                <div key={c.name} className="rounded-2xl border border-mist bg-white p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-midnight-ink">{c.name}</h3>
                      <p className="mt-1 text-body-sm text-zinc-500">{c.desc}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-teal/10 px-3 py-1 text-caption font-medium text-brand-teal">
                      {c.points}点
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Examples */}
        <section className="mt-16">
          <ScrollReveal>
            <h2 className="text-heading-sm font-semibold text-midnight-ink">
              良い例 / 悪い例
            </h2>
            <p className="mt-2 text-body text-zinc-500">
              具体的なコミットメッセージを見てみましょう。
              type(scope): summary の形式に従うと、格段に読みやすくなります。
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-white p-6">
                <p className="mb-3 text-sm font-semibold text-emerald-600">良い例 — どれも「何を変えたか」が明確</p>
                <div className="space-y-4">
                  <div>
                    <code className="block rounded-xl bg-emerald-50 px-4 py-2.5 text-body-sm text-emerald-700">
                      feat(auth): GitHubログインボタンを追加する
                    </code>
                    <p className="mt-1 text-caption text-zinc-500">
                      語尾に「〜する」をつけた日本語として自然な形
                    </p>
                  </div>
                  <div>
                    <code className="block rounded-xl bg-emerald-50 px-4 py-2.5 text-body-sm text-emerald-700">
                      fix(api): GitHubの空レスポンスを処理する
                    </code>
                    <p className="mt-1 text-caption text-zinc-500">
                      こちらも「〜する」形式。一貫性があれば問題なし
                    </p>
                  </div>
                  <div>
                    <code className="block rounded-xl bg-emerald-50 px-4 py-2.5 text-body-sm text-emerald-700">
                      refactor(db): ユーザー検索を別関数に抽出
                    </code>
                    <p className="mt-1 text-caption text-zinc-500">
                      「〜する」を省略した形。簡潔で読みやすい
                    </p>
                  </div>
                  <div>
                    <code className="block rounded-xl bg-emerald-50 px-4 py-2.5 text-body-sm text-emerald-700">
                      docs(readme): インストール手順を更新
                    </code>
                    <p className="mt-1 text-caption text-zinc-500">
                      「〜する」を省略した形。やや長めの要約でもOK
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-caption text-zinc-400">
                  ※ 語尾は「〜する」でも「〜した」でも、命令形でも構いません。一貫性が大切です。
                </p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-white p-6">
                <p className="mb-3 text-sm font-semibold text-red-500">悪い例 — 何を変えたか全く伝わらない</p>
                <div className="space-y-4">
                  <div>
                    <code className="block rounded-xl bg-red-50 px-4 py-2.5 text-body-sm text-red-600">fix bug</code>
                    <p className="mt-1 text-caption text-zinc-500">どのバグを直したのか不明。一見typeらしきものがあるが形式になっていない</p>
                  </div>
                  <div>
                    <code className="block rounded-xl bg-red-50 px-4 py-2.5 text-body-sm text-red-600">update</code>
                    <p className="mt-1 text-caption text-zinc-500">何をupdateしたのか全く分からない</p>
                  </div>
                  <div>
                    <code className="block rounded-xl bg-red-50 px-4 py-2.5 text-body-sm text-red-600">修正</code>
                    <p className="mt-1 text-caption text-zinc-500">日本語のみでtypeがない。何を修正したか不明</p>
                  </div>
                  <div>
                    <code className="block rounded-xl bg-red-50 px-4 py-2.5 text-body-sm text-red-600">いろいろ変更</code>
                    <p className="mt-1 text-caption text-zinc-500">変更内容が曖昧で、レビューや障害調査で役立たない</p>
                  </div>
                  <div>
                    <code className="block rounded-xl bg-red-50 px-4 py-2.5 text-body-sm text-red-600">fix</code>
                    <p className="mt-1 text-caption text-zinc-500">1単語だけでは何も伝わらない</p>
                  </div>
                  <div>
                    <code className="block rounded-xl bg-red-50 px-4 py-2.5 text-body-sm text-red-600">update file</code>
                    <p className="mt-1 text-caption text-zinc-500">どのファイルをなぜupdateしたか不明瞭</p>
                  </div>
                  <div>
                    <code className="block rounded-xl bg-red-50 px-4 py-2.5 text-body-sm text-red-600">change</code>
                    <p className="mt-1 text-caption text-zinc-500">英単語1語だけでは全く意味が伝わらない最悪の例</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Why section */}
        <section className="mt-16">
          <ScrollReveal>
            <h2 className="text-heading-sm font-semibold text-midnight-ink">
              Why を書く重要性
            </h2>
            <div className="mt-6 rounded-3xl border border-mist bg-white p-6">
              <p className="text-body leading-relaxed text-zinc-600">
                コミットメッセージには「何を」だけでなく「なぜ」変更したのかを書くことで、
                後から見た人が変更の意図を理解できるようになります。
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-red-500">Why がない例</p>
                  <code className="mt-1 block text-body-sm text-zinc-600">
                    fix(api): タイムアウトを変更する
                  </code>
                  <p className="mt-1 text-caption text-zinc-400">
                    なぜタイムアウトを変更したか不明
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-600">Why がある例</p>
                  <code className="mt-1 block text-body-sm text-zinc-600">
                    fix(api): LLMの応答遅延のためタイムアウトを30秒に延長する
                  </code>
                  <p className="mt-1 text-caption text-zinc-400">
                    理由（LLMの応答が遅い）が明確
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <div className="mt-16 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-teal px-6 py-3 text-body-sm font-medium text-white transition-all hover:brightness-110"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
