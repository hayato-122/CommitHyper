"use client";

import { useState } from "react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Header } from "@/components/Header";
import {
  Clipboard,
  Download,
  X,
  Check,
  ArrowLeft,
  FileText,
  Eye,
  Sparkles,
  MessageSquare,
  Ruler,
  Search,
  Code2,
  Lightbulb,
  Sword,
  Trophy,
  ChevronRight,
} from "lucide-react";

const VALID_TYPES = [
  { type: "feat", desc: "新機能" },
  { type: "fix", desc: "バグ修正" },
  { type: "docs", desc: "ドキュメントのみの変更" },
  { type: "refactor", desc: "リファクタリング（機能追加・バグ修正なし）" },
  { type: "test", desc: "テストの追加・修正" },
  {
    type: "style",
    desc: "コードの意味に影響しない変更（空白・フォーマット等）",
  },
  { type: "chore", desc: "ビルドプロセス・ツール・依存関係の変更" },
  { type: "build", desc: "ビルドシステム・外部依存関係の変更" },
  { type: "ci", desc: "CI設定・スクリプトの変更" },
  { type: "perf", desc: "パフォーマンス改善" },
];

const CRITERIA = [
  {
    name: "形式の明確さ",
    points: 30,
    icon: FileText,
    desc: "type(scope): summary の形式に従っているか（scopeあり30点／なし15点）",
    eval: "ルールベース",
    evalColor: "bg-zinc-100 text-zinc-500",
  },
  {
    name: "変更種別の適切さ",
    points: 20,
    icon: Code2,
    desc: "feat/fix 等のtypeが変更内容に合っているか（標準20点／近似10点）",
    eval: "ルールベース",
    evalColor: "bg-zinc-100 text-zinc-500",
  },
  {
    name: "Summaryの具体性",
    points: 20,
    icon: Eye,
    desc: "何を変更したかが具体的に伝わるか",
    eval: "AI評価",
    evalColor: "bg-brand-teal/10 text-brand-teal",
  },
  {
    name: "Why・背景の説明",
    points: 15,
    icon: MessageSquare,
    desc: "なぜ変更したか、目的が伝わるか（bodyも確認）",
    eval: "AI評価",
    evalColor: "bg-brand-teal/10 text-brand-teal",
  },
  {
    name: "読みやすさ",
    points: 10,
    icon: Ruler,
    desc: "1行目の文字数が適切か（推奨: 10〜72文字）",
    eval: "ルールベース",
    evalColor: "bg-zinc-100 text-zinc-500",
  },
  {
    name: "業務での追跡しやすさ",
    points: 5,
    icon: Search,
    desc: "scopeやIssue番号など、追跡に役立つ情報があるか",
    eval: "ルールベース",
    evalColor: "bg-zinc-100 text-zinc-500",
  },
];

function PromptModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const promptContent = `# Commit Message Generator

あなたはコミットメッセージを生成するアシスタントです。diffがある場合は一緒に貼り付けてください。
以下のルールに従い、コミットメッセージを**1つだけ**出力してください。説明や補足は一切不要です。

## 形式（必須）

\`\`\`
type(scope): 変更内容の要約

- 必要に応じて箇条書きで詳細
- なぜ変更したかを含めると尚良い
\`\`\`

### type（変更の種類）
- feat — 新機能の追加
- fix — バグ修正
- docs — ドキュメントのみの変更
- refactor — リファクタリング（機能追加・バグ修正なし）
- test — テストの追加・修正
- style — コードの意味に影響しない変更（空白・フォーマット等）
- chore — ビルドプロセス・ツール・依存関係の変更
- build — ビルドシステム・外部依存関係の変更
- ci — CI設定・スクリプトの変更
- perf — パフォーマンス改善

### scope（省略可）
影響範囲を表す単語（auth / ui / api / db / config / deps など）。
diffの変更ファイル一覧から判断すること。

### summary（要約）— 最重要項目
- 「〜する」または「〜した」（リポジトリ内で統一。既存のコミットがあればそれに合わせる）
- 10〜72文字に収める
- 「何を」「なぜ」のうち、少なくとも「何を」は明確に伝える
- 固有名詞（機能名・画面名・ライブラリ名）を含めて具体性を高める

### body（diffが複数ファイルに跨ぐ場合に必須）
- summaryの後に空行を入れ、- で箇条書き
- 各ファイルの変更内容を簡潔に説明
- 「なぜこの変更が必要か」を含めるとスコアが上がる

## diffの読み方
1. 変更ファイルの一覧から scope を決める
2. 追加行（+）を読み、「何を追加したか」を summary に反映する
3. 削除行（-）や修正行から、「なぜ変更したか」を推測して body に含める
4. 複数ファイルに跨ぐ変更は body で整理する

## 良い例

feat(auth): GitHubログインボタンを追加する

- トップページにOAuth認証の入り口を設置
- Auth.js v5でコールバック処理を実装
- ログイン後はダッシュボードにリダイレクト

fix(api): 空レスポンス時のクラッシュを修正する

- GitHub APIが空配列を返した場合に500エラーになる問題を修正
- 早期リターンで空配列をそのまま返すよう変更

refactor(db): クエリのN+1問題を解消する

- User一覧取得時にprismaのincludeで一度にJOIN
- ループ内クエリを削除しレスポンス時間を1/3に改善

## 悪い例（絶対に避ける）
- fix bug → どのバグか不明
- バグを修正 → typeがない
- update → 何も伝わらない
- chore: fix → typeとsummaryが噛み合っていない
- feat: 追加 → scopeがなく、何を追加したか不明
- fix(ui): 修正 → summaryが具体性ゼロ

## 出力ルール
- コミットメッセージ**のみ**を出力する（説明・補足・引用符は不要）
- 複数候補を出さない（最適な1つだけ）
- リポジトリに既存のコミットが参照できる場合、語尾（「〜する」「〜した」）や形式はそれに合わせる`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptContent);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = promptContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-[640px] rounded-3xl border border-mist bg-white p-6 shadow-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-midnight-ink">
            プロンプトをコピー
          </h3>
          <button
            onClick={onClose}
            className="rounded-2xl p-1.5 text-zinc-500 transition-colors hover:bg-pearl hover:text-midnight-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <pre className="mb-5 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-3xl bg-pearl p-4 text-caption leading-relaxed text-zinc-600">
          {promptContent}
        </pre>
        <button
          onClick={handleCopy}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-body-sm font-semibold transition-all ${
            copied
              ? "bg-leaf-soft text-white"
              : "bg-brand-teal text-white hover:brightness-110"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              コピーしました！
            </>
          ) : (
            <>
              <Clipboard className="h-4 w-4" />
              クリップボードにコピー
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function GuidePage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-pearl">
      <Header
        left={
          <>
            <div className="h-4 w-px bg-mist" />
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 text-body-sm text-zinc-500 transition-colors hover:text-midnight-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              戻る
            </button>
            <div className="h-4 w-px bg-mist" />
            <span className="text-body-sm text-zinc-500">ガイド</span>
          </>
        }
        right={
          <Link
            href="/login"
            className="rounded-xl bg-brand-teal px-5 py-2 text-body-sm font-semibold text-white transition-all hover:brightness-110"
          >
            ログイン
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        {/* ===== Hero ===== */}
        <ScrollReveal>
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-brand-teal">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1
            className="mt-4 text-[2rem] font-semibold leading-none tracking-tight text-midnight-ink"
            style={{
              fontFamily:
                "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
            }}
          >
            良いコミットメッセージとは
          </h1>
          <p className="mt-4 text-body leading-relaxed text-zinc-500">
            コミットメッセージは、未来の自分やチームメンバーが変更履歴を見返したときに、
            「何を」「なぜ」変更したのかを理解できるように書くことが最も重要です。
            このページでは、CommitHyper が推奨する良いコミットメッセージの書き方を説明します。
          </p>
        </ScrollReveal>

        {/* ===== Recommended Format ===== */}
        <section className="mt-16">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/10">
                <FileText className="h-4.5 w-4.5 text-brand-teal" />
              </div>
              <h2
                className="text-heading-sm font-semibold text-midnight-ink"
                style={{
                  fontFamily:
                    "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
                }}
              >
                推奨フォーマット
              </h2>
            </div>
            <p className="mb-6 text-body text-zinc-500">
              Conventional Commits の形式をベースにしています。
            </p>
            <div className="rounded-3xl border border-mist bg-white p-6 shadow-subtle">
              <code className="text-subheading font-semibold text-brand-teal">
                type(scope): summary
              </code>
              <div className="mt-4 space-y-2 text-body-sm leading-relaxed text-zinc-600">
                <p>
                  <span className="font-semibold text-brand-teal">type</span> —
                  変更の種類（feat / fix / refactor 等）
                </p>
                <p>
                  <span className="font-semibold text-zinc-500">(scope)</span> —
                  変更箇所（省略可。auth / ui / db 等）
                </p>
                <p>
                  <span className="font-semibold text-zinc-500">summary</span> —
                  変更内容の要約（日本語で「〜する」調）
                </p>
              </div>
              <div className="mt-4 rounded-3xl bg-pearl p-4">
                <p className="text-caption font-medium text-zinc-500">良い例</p>
                <code className="mt-1 block text-body-sm text-midnight-ink">
                  feat(auth): GitHubログインボタンを追加する
                </code>
                <code className="mt-1 block text-body-sm text-midnight-ink">
                  fix(ui): ボタンのホバー色を修正する
                </code>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ===== Body ===== */}
        <section className="mt-16">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/10">
                <MessageSquare className="h-4.5 w-4.5 text-brand-teal" />
              </div>
              <h2
                className="text-heading-sm font-semibold text-midnight-ink"
                style={{
                  fontFamily:
                    "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
                }}
              >
                本文（Body）で変更内容を補足する
              </h2>
            </div>
            <p className="mb-6 text-body text-zinc-500">
              サマリー（1行目）だけで伝えきれないときは、空行の後に本文を追加し、
              変更内容を箇条書き（
              <code className="rounded-2xl bg-pearl px-1.5 py-0.5 text-caption">-</code>
              ）で書くとより読みやすくなります。
            </p>
            <div className="rounded-3xl border border-mist bg-white p-6 shadow-subtle">
              <div className="rounded-3xl bg-pearl p-4">
                <p className="text-caption font-medium text-zinc-500">
                  完全なコミットメッセージの例
                </p>
                <div className="mt-2 space-y-1">
                  <code className="block text-body-sm text-brand-teal">
                    feat(auth): GitHubログインボタンを追加する
                  </code>
                  <code className="block text-body-sm text-zinc-300"> </code>
                  <code className="block text-body-sm text-midnight-ink">
                    - トップページにGitHub OAuth認証の入り口を追加
                  </code>
                  <code className="block text-body-sm text-midnight-ink">
                    - Auth.js v5でコールバック処理を実装
                  </code>
                  <code className="block text-body-sm text-midnight-ink">
                    - ログイン後はダッシュボードにリダイレクトする
                  </code>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-body-sm leading-relaxed text-zinc-600">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-caption font-semibold text-brand-teal">
                    S
                  </span>
                  <span>
                    <span className="font-semibold">サマリー</span> —
                    1行目。type(scope): 要約の形式で、何をしたか一言で
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-pearl px-2.5 py-0.5 text-caption font-semibold text-zinc-500">
                    B
                  </span>
                  <span>
                    <span className="font-semibold">本文</span> —
                    空行の後に箇条書き（
                    <code className="rounded-2xl bg-pearl px-1.5 text-caption">
                      -
                    </code>
                    ）で変更内容を整理
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ===== Type List ===== */}
        <section className="mt-16">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/10">
                <Code2 className="h-4.5 w-4.5 text-brand-teal" />
              </div>
              <h2
                className="text-heading-sm font-semibold text-midnight-ink"
                style={{
                  fontFamily:
                    "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
                }}
              >
                Type 一覧
              </h2>
            </div>
            <p className="mb-6 text-body text-zinc-500">
              type は変更の種類を表します。この中から適切なものを選んでください。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {VALID_TYPES.map((t) => (
                <div
                  key={t.type}
                  className="rounded-3xl border border-mist bg-white p-4 shadow-subtle transition-shadow hover:shadow-md"
                >
                  <code className="text-body-sm font-bold text-brand-teal">
                    {t.type}
                  </code>
                  <p className="mt-1 text-body-sm text-zinc-500">{t.desc}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* ===== Evaluation Criteria ===== */}
        <section className="mt-16">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/10">
                <Lightbulb className="h-4.5 w-4.5 text-brand-teal" />
              </div>
              <h2
                className="text-heading-sm font-semibold text-midnight-ink"
                style={{
                  fontFamily:
                    "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
                }}
              >
                CommitHyper の評価観点
              </h2>
            </div>
            <p className="mb-6 text-body text-zinc-500">
              コミットメッセージは以下の6項目、合計100点で評価されます。
              観点3（具体性）・観点4（Why）は
              <span className="font-semibold text-brand-teal"> AI（Gemini Flash）</span>
              が評価し、観点1・2・5・6はルールベースで評価します。
            </p>
            <div className="space-y-4">
              {CRITERIA.map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.name}
                    className="rounded-3xl border border-mist bg-white p-5 shadow-subtle"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
                          <Icon className="h-4 w-4 text-brand-teal" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-midnight-ink">
                              {c.name}
                            </h3>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.evalColor}`}>
                              {c.eval}
                            </span>
                          </div>
                          <p className="mt-1 text-body-sm leading-relaxed text-zinc-500">
                            {c.desc}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-teal/10 px-3 py-1 text-caption font-bold text-brand-teal">
                        {c.points}点
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Hybrid Evaluation Box */}
            <div className="mt-6 rounded-3xl border border-mist bg-white p-6 shadow-subtle">
              <h3 className="flex items-center gap-2 text-body-sm font-semibold text-midnight-ink">
                <Sparkles className="h-4 w-4 text-brand-teal" />
                ハイブリッド評価方式
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-pearl p-4">
                  <p className="text-caption font-semibold text-zinc-500">ルールベース</p>
                  <p className="mt-1 text-[32px] font-bold text-midnight-ink">65点</p>
                  <p className="mt-1 text-caption text-zinc-500">形式・種別・読みやすさ・追跡性</p>
                </div>
                <div className="rounded-3xl border border-brand-teal/20 bg-white p-4">
                  <p className="text-caption font-semibold text-brand-teal">AI評価</p>
                  <p className="mt-1 text-[32px] font-bold text-midnight-ink">35点</p>
                  <p className="mt-1 text-caption text-zinc-500">具体性・Why（Gemini Flash）</p>
                </div>
              </div>
              <p className="mt-4 text-body-sm leading-relaxed text-zinc-500">
                形式（type(scope)の有無）や文字数・スコープといった客観的な判定はルールベースで即座に処理。
                一方、Summaryの具体性やWhyの説明といった人間の判断が必要な部分は Gemini API が評価します。
                初回分析時は全コミットに対してルール評価→AI評価が順次実行され、進捗画面で状況を確認できます。
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* ===== Examples ===== */}
        <section className="mt-16">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/10">
                <Trophy className="h-4.5 w-4.5 text-brand-teal" />
              </div>
              <h2
                className="text-heading-sm font-semibold text-midnight-ink"
                style={{
                  fontFamily:
                    "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
                }}
              >
                良い例 / 悪い例
              </h2>
            </div>
            <p className="mb-6 text-body text-zinc-500">
              具体的なコミットメッセージを見てみましょう。
              type(scope): summary の形式に従うと、格段に読みやすくなります。
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Good Examples */}
              <div className="rounded-3xl border border-mist bg-white p-6 shadow-subtle">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-leaf-soft/20">
                    <Check className="h-4 w-4 text-leaf-soft" />
                  </div>
                  <p className="text-body-sm font-bold text-leaf-soft">
                    良い例
                  </p>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      msg: "feat(auth): GitHubログインボタンを追加する",
                      note: "語尾に「〜する」をつけた日本語として自然な形",
                    },
                    {
                      msg: "fix(api): GitHubの空レスポンスを処理する",
                      note: "scope に api を指定。影響範囲が一目でわかる",
                    },
                    {
                      msg: "refactor(db): クエリのN+1問題を解消する",
                      note: "何を・なぜ変えたかが具体的に伝わる",
                    },
                  ].map((item, i) => (
                    <div key={i}>
                      <code className="block rounded-2xl border border-mist bg-snow px-4 py-2.5 text-body-sm text-midnight-ink">
                        {item.msg}
                      </code>
                      <p className="mt-1 text-caption text-zinc-400">
                        {item.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bad Examples */}
              <div className="rounded-3xl border border-mist bg-white p-6 shadow-subtle">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50">
                    <X className="h-4 w-4 text-red-400" />
                  </div>
                  <p className="text-body-sm font-bold text-zinc-500">
                    悪い例
                  </p>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      msg: "fix bug",
                      note: "どのバグを何のために直したか不明。typeもなし",
                    },
                    {
                      msg: "バグを修正",
                      note: "日本語のみ。何をどう修正したかわからない",
                    },
                    { msg: "update", note: "最もよくない例。何も伝わらない" },
                  ].map((item, i) => (
                    <div key={i}>
                      <code className="block rounded-2xl border border-mist bg-pearl px-4 py-2.5 text-body-sm text-zinc-600">
                        {item.msg}
                      </code>
                      <p className="mt-1 text-caption text-zinc-400">
                        {item.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ===== AI Tools ===== */}
        <section className="mt-16">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/10">
                <Sparkles className="h-4.5 w-4.5 text-brand-teal" />
              </div>
              <h2
                className="text-heading-sm font-semibold text-midnight-ink"
                style={{
                  fontFamily:
                    "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
                }}
              >
                AI・コーディングエージェントに渡す
              </h2>
            </div>
            <p className="mb-6 text-body text-zinc-500">
              ChatGPT/Claude に直接貼り付けるプロンプトと、
              コーディングエージェントにインポートするルールファイルを用意しています。
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 rounded-3xl border border-mist bg-white p-5 text-left text-body-sm shadow-subtle transition-all hover:border-brand-teal/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-teal/10">
                  <Clipboard className="h-5 w-5 text-brand-teal" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-midnight-ink">
                    プロンプトをコピー
                  </p>
                  <p className="text-caption text-zinc-400">
                    ChatGPT/Claudeに渡す
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-300" />
              </button>
              <a
                href="/prompts/commithyper.md"
                download
                className="flex items-center gap-3 rounded-3xl border border-mist bg-white p-5 text-left text-body-sm shadow-subtle transition-all hover:border-brand-teal/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-teal/10">
                  <Download className="h-5 w-5 text-brand-teal" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-midnight-ink">
                    ルールをダウンロード
                  </p>
                  <p className="text-caption text-zinc-400">
                    コーディングエージェント用
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-300" />
              </a>
            </div>
            <div className="mt-6 rounded-3xl border border-mist bg-white p-5 shadow-subtle">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-brand-teal" />
                <p className="text-caption font-semibold text-midnight-ink">
                  使い方
                </p>
              </div>
              <p className="text-caption leading-relaxed text-zinc-500">
                ダウンロードしたファイルをプロジェクトのルールディレクトリ（
                <code className="rounded-2xl bg-pearl px-1.5 py-0.5 text-caption">
                  .cursor/rules/
                </code>
                、
                <code className="rounded-2xl bg-pearl px-1.5 py-0.5 text-caption">
                  .github/copilot-instructions.md
                </code>
                など）に配置し、他のルールファイルから参照してください。
              </p>
              <pre className="mt-3 rounded-2xl bg-pearl p-3 text-caption leading-relaxed text-zinc-600">
                {`# プロジェクトルール例
コミットメッセージを作成・評価する際は、
必ず commithyper.md のルールに従ってください。`}
              </pre>
            </div>
          </ScrollReveal>
        </section>
      </main>

      {showModal && <PromptModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
