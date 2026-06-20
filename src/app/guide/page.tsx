"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GitCommitHorizontal,
  Clipboard,
  Download,
  X,
  Check,
} from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

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
    points: 20,
    desc: "type(scope): summary の形式に従っているか",
  },
  {
    name: "変更種別の適切さ",
    points: 15,
    desc: "feat/fix 等のtypeが変更内容に合っているか",
  },
  {
    name: "Summaryの具体性",
    points: 25,
    desc: "何を変更したかが具体的に伝わるか",
  },
  {
    name: "Why・背景の説明",
    points: 20,
    desc: "なぜ変更したか、目的が伝わるか",
  },
  {
    name: "読みやすさ",
    points: 10,
    desc: "1行目の文字数が適切か（推奨: 10〜72文字）",
  },
  {
    name: "業務での追跡しやすさ",
    points: 10,
    desc: "scopeやIssue番号など、追跡に役立つ情報があるか",
  },
];

function PromptModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const promptContent = `# CommitHyper: AI Commit Message Generator

あなたはGitリポジトリのコミットメッセージを生成するアシスタントです。
以下のルールに従い、与えられたdiffに最適なコミットメッセージを日本語で1つだけ生成してください。

## 形式

すべてのコミットメッセージは以下の形式に従ってください：

\`\`\`
type(scope): summary
\`\`\`

### type（変更の種類）

- feat — 新機能
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
影響範囲（auth, ui, api, db, config など）

### summary（要約）
- 日本語で書く
- 語尾は「〜する」または「〜した」（一貫性を推奨）
- 10〜72文字に収める
- 「何を変更したか」を具体的に伝える

### body（必要に応じて）
- diffが複数ファイルにわたる場合、summaryの後に空行→箇条書きで詳細を補足
- 「なぜ変更したか」も含めるとなお良い

## 良い例

feat(auth): GitHubログインボタンを追加する
fix(ui): ボタンのホバー色を修正した
refactor(db): クエリのN+1問題を解消する

## 悪い例（絶対に避ける）

fix bug
バグを修正
update
変更

## 評価ポイント

1. type(scope): summary の形式に従っていること
2. type が変更内容と一致していること
3. summary が具体的であること
4. 「なぜ」が必要なら body で補足すること
5. 1行目は10〜72文字に収めること
6. scope や Issue番号など、追跡に役立つ情報を含めること

## 指示

以下のdiffを確認し、上記のルールに従ったコミットメッセージを1つだけ生成してください。
理由などの余計な説明は不要です。コミットメッセージのみを出力してください。`;

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
        className="mx-4 w-full max-w-[640px] rounded-2xl border border-mist bg-white p-6 shadow-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-body-sm font-semibold text-midnight-ink">
            プロンプトをコピー
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-pearl hover:text-midnight-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <pre className="mb-5 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-pearl p-4 text-caption leading-relaxed text-zinc-600">
          {promptContent}
        </pre>
        <button
          onClick={handleCopy}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-body-sm font-semibold transition-all ${
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
      <header className="flex h-14 shrink-0 items-center border-b border-mist bg-white px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal">
            <GitCommitHorizontal className="h-4 w-4 text-white" />
          </div>
          <span className="text-body-sm font-semibold text-midnight-ink">
            CommitHyper
          </span>
        </Link>
        <div className="mx-4 h-4 w-px bg-mist" />
        <button
          onClick={() => window.history.back()}
          className="text-body-sm text-zinc-500 hover:text-midnight-ink"
        >
          戻る
        </button>
        <div className="mx-4 h-4 w-px bg-mist" />
        <span className="text-body-sm text-zinc-500">ガイド</span>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        {/* Hero */}
        <ScrollReveal>
          <h1 className="text-[2rem] font-semibold leading-none tracking-tight text-midnight-ink">
            良いコミットメッセージとは
          </h1>
          <p className="mt-4 text-body leading-relaxed text-zinc-600">
            コミットメッセージは、未来の自分やチームメンバーが変更履歴を見返したときに、「何を」「なぜ」変更したのかを理解できるように書くことが最も重要です。このページでは、CommitHyper
            が推奨する良いコミットメッセージの書き方を説明します。
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
              <code className="text-subheading font-semibold text-midnight-ink">
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
                  変更内容の要約
                </p>
              </div>
              <div className="mt-4 rounded-xl bg-pearl p-4">
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

        {/* Body */}
        <section className="mt-16">
          <ScrollReveal>
            <h2 className="text-heading-sm font-semibold text-midnight-ink">
              本文（Body）で変更内容を補足する
            </h2>
            <p className="mt-2 text-body text-zinc-500">
              サマリー（1行目）だけで伝えきれないときは、空行の後に本文を追加し、変更内容を箇条書き（
              <code className="rounded bg-pearl px-1 text-caption">-</code>
              ）で書くとより読みやすくなります。
            </p>
            <div className="mt-6 rounded-3xl border border-mist bg-white p-6">
              <div className="rounded-xl bg-pearl p-4">
                <p className="text-caption font-medium text-zinc-500">
                  完全なコミットメッセージの例
                </p>
                <div className="mt-2 space-y-1">
                  <code className="block text-body-sm text-brand-teal">
                    feat(auth): GitHubログインボタンを追加する
                  </code>
                  <code className="block text-body-sm text-zinc-400"> </code>
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
                  <span className="mt-0.5 shrink-0 rounded-full bg-brand-teal/10 px-2 py-0.5 text-caption font-semibold text-brand-teal">
                    S
                  </span>
                  <span>
                    <span className="font-semibold">サマリー</span> —
                    1行目。type(scope): 要約の形式で、何をしたか一言で
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-pearl px-2 py-0.5 text-caption font-semibold text-zinc-500">
                    B
                  </span>
                  <span>
                    <span className="font-semibold">本文</span> —
                    空行の後に箇条書き（
                    <code className="rounded bg-pearl px-1 text-caption">
                      -
                    </code>
                    ）で変更内容を整理
                  </span>
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
              type
              は変更の種類を表します。この中から適切なものを選んでください。
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {VALID_TYPES.map((t) => (
                <div
                  key={t.type}
                  className="rounded-2xl border border-mist bg-white p-4"
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
                <div
                  key={c.name}
                  className="rounded-2xl border border-mist bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-midnight-ink">
                        {c.name}
                      </h3>
                      <p className="mt-1 text-body-sm leading-relaxed text-zinc-500">
                        {c.desc}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-teal/10 px-3 py-1 text-caption font-bold text-brand-teal">
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
              具体的なコミットメッセージを見てみましょう。type(scope): summary
              の形式に従うと、格段に読みやすくなります。
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-leaf-soft/30 bg-white p-6">
                <p className="mb-3 text-body-sm font-bold text-leaf-soft">
                  良い例
                </p>
                <div className="space-y-4">
                  {[
                    {
                      msg: "feat(auth): GitHubログインボタンを追加する",
                      note: "語尾に「〜する」をつけた日本語として自然な形",
                    },
                    {
                      msg: "fix(api): GitHubの空レスポンスを処理する",
                      note: "こちらも「〜する」形式。一貫性があれば問題なし",
                    },
                    {
                      msg: "refactor(db): クエリのN+1問題を解消する",
                      note: "scope に db を指定。何を直したか一目でわかる",
                    },
                  ].map((item, i) => (
                    <div key={i}>
                      <code className="block rounded-xl bg-green-50 px-4 py-2.5 text-body-sm text-green-700">
                        {item.msg}
                      </code>
                      <p className="mt-1 text-caption text-zinc-500">
                        {item.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-red-200 bg-white p-6">
                <p className="mb-3 text-body-sm font-bold text-red-500">
                  悪い例
                </p>
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
                      <code className="block rounded-xl bg-red-50 px-4 py-2.5 text-body-sm text-red-600">
                        {item.msg}
                      </code>
                      <p className="mt-1 text-caption text-zinc-500">
                        {item.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* AI Tools Section */}
        <section className="mt-16">
          <ScrollReveal>
            <h2 className="text-heading-sm font-semibold text-midnight-ink">
              AI・コーディングエージェントに渡す
            </h2>
            <p className="mt-2 text-body text-zinc-500">
              ChatGPT/Claude
              に直接貼り付けるプロンプトと、コーディングエージェントにインポートするルールファイルを用意しています。
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-5 text-left text-body-sm transition-all hover:border-zinc-400 hover:bg-zinc-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                  <Clipboard className="h-5 w-5 text-zinc-500" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-600">
                    プロンプトをコピー
                  </p>
                  <p className="text-caption text-zinc-400">
                    ChatGPT/Claudeに渡す
                  </p>
                </div>
              </button>
              <a
                href="/prompts/commithyper.md"
                download
                className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-5 text-left text-body-sm transition-all hover:border-zinc-400 hover:bg-zinc-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                  <Download className="h-5 w-5 text-zinc-500" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-600">
                    ルールをダウンロード
                  </p>
                  <p className="text-caption text-zinc-400">
                    コーディングエージェント用
                  </p>
                </div>
              </a>
            </div>
            <div className="mt-5 rounded-xl bg-white border border-mist p-4">
              <p className="text-caption font-semibold text-zinc-500">
                💡 使い方
              </p>
              <p className="mt-2 text-caption leading-relaxed text-zinc-600">
                ダウンロードしたファイルをプロジェクトのルールディレクトリ（
                <code className="rounded bg-pearl px-1 text-caption">
                  .cursor/rules/
                </code>
                、
                <code className="rounded bg-pearl px-1 text-caption">
                  .github/copilot-instructions.md
                </code>{" "}
                など）に配置し、他のルールファイルから以下のように参照してください。
              </p>
              <pre className="mt-2 rounded-lg bg-pearl p-3 text-caption leading-relaxed text-zinc-600">
                {`# プロジェクトルール例
コミットメッセージを作成・評価する際は、
必ず commithyper.md のルールに従ってください。
評価基準・良い例・悪い例は commithyper.md を参照。`}
              </pre>
            </div>
          </ScrollReveal>
        </section>
      </main>

      {showModal && <PromptModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
