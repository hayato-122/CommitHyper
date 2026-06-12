# CommitHyper Implementation Specification ┃

                                                                        ┃
    > このスキルは CommitHyper の詳細実装仕様を定義します。             ┃
    > AIへの基本行動ルールは `.codewhale/instructions.md` を参照してくだ┃
    さい。

## 0.1 モックデータ定義

UIのデザイン・確認時に使うダミーデータです。型定義（セクション10.4）と一致させてください。

```ts
// モックユーザー
const mockUser = {
  id: "user-1",
  name: "Taro Yamada",
  username: "taro-yamada",
  avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
  level: 3,
  xp: 320,
  title: "History Cleaner",
};

// モックリポジトリ
const mockRepository = {
  id: "repo-1",
  owner: "taro-yamada",
  name: "my-portfolio",
  fullName: "taro-yamada/my-portfolio",
  isPrivate: false,
  totalCommits: 48,
  initialAverageScore: 58,
  currentAverageScore: 71,
};

// モックコミット（改善候補）
const mockCommits = [
  {
    id: "commit-1",
    sha: "abc1234",
    message: "fix bug",
    initialScore: 24,
    currentScore: 24,
    status: "pending",
    rank: "poor",
    issues: [
      "変更内容が具体的ではありません",
      "何のbugを修正したか分かりません",
    ],
    suggestions: [
      "fix(auth): のように type と scope を付けてください",
      "何を修正したかを summary に書いてください",
    ],
    exampleMessage: "fix(auth): ログイン時のエラー処理を修正する",
    committedAt: "2024-12-01T10:00:00Z",
  },
  {
    id: "commit-2",
    sha: "def5678",
    message: "update",
    initialScore: 18,
    currentScore: 18,
    status: "pending",
    rank: "poor",
    issues: ["何を更新したのか全く分かりません"],
    suggestions: ["変更種別（feat / fix など）を prefix として付けてください"],
    exampleMessage: "feat(dashboard): リポジトリ切り替えUIを追加する",
    committedAt: "2024-11-28T15:00:00Z",
  },
  {
    id: "commit-3",
    sha: "ghi9012",
    message: "修正",
    initialScore: 30,
    currentScore: 30,
    status: "pending",
    rank: "poor",
    issues: ["日本語のみで内容が不明です", "何を修正したかが分かりません"],
    suggestions: [
      "英語の type prefix を付けてください",
      "具体的な変更内容を書いてください",
    ],
    exampleMessage: "fix(ui): ボタンのホバースタイルを修正する",
    committedAt: "2024-11-25T09:00:00Z",
  },
];

// モックXPイベント履歴
const mockXpEvents = [
  {
    id: "xp-1",
    type: "improvement_passed",
    amount: 10,
    reason: "fix bug を改善して合格",
    createdAt: "2024-12-05T12:00:00Z",
  },
  {
    id: "xp-2",
    type: "improvement_excellent",
    amount: 15,
    reason: "高評価（90点以上）で合格",
    createdAt: "2024-12-04T10:00:00Z",
  },
];
```

---

## 1. プロジェクト概要

CommitHyperは、GitHubリポジトリのコミットメッセージを分析し、改善すべきコミットメッセージを学習タスクとして提示するWebアプリです。

ユーザーはGitHubでログインし、分析したいリポジトリを選択します。CommitHyperはそのリポジトリのコミットメッセージを取得し、すべてのコミットメッセージにスコアを付けます。

その後、スコアが低いコミットメッセージを改善候補として表示します。ユーザーは提示されたコミットメッセージを自分で書き直し、再評価に合格するとXPが増え、成長ゲージ・レベル・称号が更新されます。

このアプリの目的は、単なる採点ではありません。過去の自分のコミットを題材にして、業務でも通用するコミットメッセージの書き方を練習し、改善によってリポジトリ全体の品質スコアが上がっていく体験を作ることです。

---

## 2. 解決したい課題

個人開発や学習段階では、コミットメッセージが `fix bug`、`update`、`修正` のように曖昧になりがちです。

しかし実務では、コミット履歴はチーム開発・コードレビュー・障害調査・リリース確認に使われる重要な情報です。良いコミットメッセージを書けることは、コードを書く力だけでなく、変更内容を他者に伝える力にも関係します。

CommitHyperは、GitHubの過去コミットを読み込み、改善すべきコミットメッセージを学習タスク化することで、開発者が「良いコミットメッセージを書く習慣」を身につけられるようにします。

---

## 3. ターゲットユーザー

- プログラミング学習者
- 個人開発者
- 就活用ポートフォリオを作っている学生
- GitHubのコミット履歴を改善したい人
- チーム開発を意識した書き方を身につけたい人

---

## 4. コア体験

1. GitHubでログインする
2. リポジトリを選択する
3. リポジトリのコミットメッセージを読み込む
4. 全コミットメッセージに初回スコアを付ける
5. 改善すべきコミットメッセージを3件表示する
6. 良いコミットメッセージ例や改善ポイントを参考に、自分で書き直す
7. 再評価に合格するとXPが増える
8. 成長ゲージ・レベル・称号が更新される
9. 改善済み候補は一覧から消え、次の候補が補充される
10. 改善によりリポジトリ全体の現在平均スコアが上がっていく

---

## 5. MVPの範囲

MVPでは、コミットメッセージ単体の評価に集中します。

diffを使った「実際の変更内容との整合性評価」はPhase 2以降に回します。

MVPで実装する機能:

- GitHub OAuthログイン
- 非公開リポジトリ対応
- リポジトリ一覧取得
- リポジトリ切り替え
- 選択リポジトリのコミット取得
- 全コミットメッセージの初回評価
- コミットごとの `initialScore` と `currentScore` の保存
- 改善候補キュー生成
- ダッシュボードに改善候補を3件表示
- ページ切り替えUI（例: `02 / 18`、前へ / 次へボタン）
- 良いコミットメッセージ例の表示
- ユーザーによる改善メッセージ入力
- 改善後メッセージの再評価
- 合格判定
- XP付与
- 成長ゲージ更新
- レベル表示
- 称号表示
- 改善済み候補の非表示化
- 現在平均スコアの更新
- 「良いコミットメッセージとは」ページ

---

## 6. 推奨技術スタック

MVPでは以下の構成を採用します。

- フロントエンド: Next.js（**App Router**を使用）
- 言語: TypeScript
- スタイリング: Tailwind CSS
- UIコンポーネント: **shadcn/ui**（Radix UI ベース、カスタマイズ可能）
- アニメーション: **Motion**（旧 Framer Motion）
- バックエンド: Next.js Route Handlers / Server Actions
- 認証: Auth.js v5 / NextAuth.js
- OAuth Provider: GitHub OAuth
- DB: PostgreSQL
- DBホスティング: **Supabase**（無料枠で運用）
- ORM: Prisma
- デプロイ: Vercel
- 評価ロジック: Phase 1はルールベース、Phase 2以降でLLM APIを検討

---

## 7. 技術選定理由

CommitHyperでは、挑戦したい技術ではなく、1ヶ月で価値あるWebアプリとして完成させるための最適な技術を選びます。

**Next.js（App Router）** をフルスタックに利用します。GitHub OAuth、GitHub API連携、DB保存、画面表示、評価ロジックを1つのアプリケーション内で完結させることで、実装・保守・デプロイの複雑さを抑えます。App RouterはAuth.js v5との相性が良く、Vercelが推奨する構成でもあります。Pages Routerより学習コストはやや高いですが、AIサポートを前提とすれば問題なく進められます。

**Supabase** をDBホスティングに採用します。PostgreSQLをそのまま使えるホスティングサービスで、無料枠が広く（500MB）、GUIでテーブルの中身を確認できるため、DB周りに不安がある場合でも状態を視覚的に把握しながら開発できます。Vercelとの接続実績も豊富です。

**Prisma** を採用する理由は、ORMの中でもっとも初学者に優しい設計だからです。`schema.prisma` にテーブル定義を書くだけで型が自動生成され、SQLを直接書かずにDBを操作できます。`npx prisma studio` でブラウザからテーブルをGUI確認できる点も、DB周りに慣れていない段階では大きな助けになります。

**PostgreSQL** を採用する理由は、User → Repository → Commit → XpEvent のようなリレーショナルなデータ構造と相性が良いためです。

GoはMVPでは採用しません。Goは高速なAPIサーバーや並列処理に強いですが、本プロジェクトの中心価値は大量処理ではなく、コミットメッセージ改善体験・成長可視化・ダッシュボード体験であるためです。

Python FastAPIもMVPでは採用しません。PythonはAIや自然言語処理に強いですが、MVP段階では必須ではありません。評価ロジックが複雑化した場合や、LLM連携を独立したサービスとして扱いたい場合に、Phase 3以降で追加します。

**shadcn/ui** を採用する理由は、アクセシビリティ（キーボード操作・スクリーンリーダー対応）が最初から完成しており、Tailwind CSSとの親和性が高く、コンポーネントのソースコードを所有できるため、DESIGN.mdのトークンに合わせたカスタマイズが自由にできるためです。

**Motion** を採用する理由は、CommitHyperにはゲーミフィケーション要素（XPバー、レベルアップ、スコア表示）があり、これらの体験をアニメーションで強化することでユーザーのモチベーションに直結するためです。

---

## 7.1 デザインシステム

CommitHyperのUI設計は、以下の2つのファイルで定義されたデザインシステムに従います。

- **`DESIGN.md`** — デザイントークン（色、タイポグラフィ、スペーシング、コンポーネント仕様）の定義
- **`theme.css`** — Tailwind v4の `@theme` ブロックで定義されたCSSカスタムプロパティ

### デザインの基本方針

- **ライトテーマ**: 温かみのある白地（Pearl #f4f4f5）をキャンバスに、カードは白（#ffffff）
- **アクセントカラーは1色**: Brand Teal（#019d91）のみをCTAや強調に使用し、それ以外のUIはグレースケール
- **フラットデザイン**: ドロップシャドウは最小限（`--shadow-subtle`のみ）、ボーダーで構造を分離
- **角丸の4段階**: nav=8px、images=12px、buttons=16px、cards=24px

### 日本語サイト最適化ルール

DESIGN.mdはLottieFiles（英語サイト）がベースのため、日本語テキストに合わせて以下を調整すること。

| 項目                  | 英語（DESIGN.md原本） | 日本語での調整                                             |
| --------------------- | --------------------- | ---------------------------------------------------------- |
| 見出しフォント        | DM Sans               | **Noto Sans JP**（日本語） + DM Sans（英数字）             |
| 本文フォント          | Inter                 | **Noto Sans JP**（日本語） + Inter（英数字）               |
| display サイズ        | 64px                  | 48〜56px に縮小（日本語は視覚的に大きい）                  |
| heading-lg サイズ     | 48px                  | 36〜40px に縮小                                            |
| letter-spacing        | -2.56px〜-0.12px      | 日本語テキストでは **0〜0.04em**（負のtrackingを使わない） |
| line-height（本文）   | 1.5                   | **1.7〜1.8**（日本語の可読性向上）                         |
| line-height（見出し） | 1.12〜1.25            | **1.3〜1.4**（日本語は行間が詰まると読みにくい）           |

### フォントの読み込み

```ts
// Next.jsでの設定例
import { Noto_Sans_JP, DM_Sans, Inter } from "next/font/google";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
```

### 過去の制作物の参照

`C:\visualstudiocode\ui_ux_ts` にある制作物は、同じ技術スタック（Next.js + Tailwind CSS + Motion + shadcn/ui）で構築されています。以下のコンポーネントやパターンを参考にすること。

| ファイル                      | 用途                       | CommitHyperでの活用                          |
| ----------------------------- | -------------------------- | -------------------------------------------- |
| `components/ScrollReveal.tsx` | スクロール時のフェードイン | ダッシュボード・Guideページの表示演出        |
| `components/ui/button.tsx`    | shadcn/ui Button           | CommitHyper用にトークンを上書きして再利用    |
| `components/ui/card.tsx`      | shadcn/ui Card             | コミットカード・スコアカードに活用           |
| `components/ui/carousel.tsx`  | Emblaベースのカルーセル    | 改善候補のスライド表示に検討                 |
| `theme.css`                   | Tailwind v4 テーマ定義     | 構造を参考にCommitHyper用theme.cssを構築済み |

### AIへの指示

- UIを構築する際は、必ず `DESIGN.md` と `theme.css` のトークンを使用すること
- 色・フォント・スペーシング・角丸を独自に決めず、定義済みトークンから選ぶこと
- 日本語テキストを含む要素では、上記の日本語最適化ルールを適用すること
- shadcn/uiのコンポーネントを活用し、DESIGN.mdのトークンでスタイルを上書きすること
- アニメーションが効果的な場面（XP演出、スコア表示、画面遷移）ではMotionを使用すること
- 以前の制作物（`C:\visualstudiocode\ui_ux_ts`）のコンポーネントを参考にすること

---

## 8. セキュリティ要件

- GitHubアクセストークンをクライアントに渡さない
- GitHub API呼び出しはサーバー側で行う
- OAuth Client ID / Secret、Auth Secret、Database URLは環境変数で管理する
- ユーザーが自分以外のリポジトリ、コミット、評価結果、XP履歴にアクセスできないようにする
- 非公開リポジトリ対応ではGitHub OAuthのscopeに注意する
- private repositoryへのアクセスは強い権限を要求するため、MVPでは自分のアカウントでの検証を主目的とする
- 一般公開デモでは、公開リポジトリのみを扱えるモードも検討する

### 8.1 必要な環境変数

`.env.local` に以下を設定します。

```env
# データベース接続（SupabaseのConnection StringをPrisma用に設定）
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Auth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ランダムな文字列（openssl rand -base64 32 で生成）"

# GitHub OAuth App
GITHUB_CLIENT_ID="GitHubで発行したClient ID"
GITHUB_CLIENT_SECRET="GitHubで発行したClient Secret"
```

> **SupabaseのURLについて**: Supabaseはコネクションプーリングの関係で `DATABASE_URL`（ポート6543）と `DIRECT_URL`（ポート5432）の2つが必要です。`schema.prisma` に `directUrl = env("DIRECT_URL")` を追加することでマイグレーションが正常に動作します。

GitHub OAuth Appの作成方法:

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. `Authorization callback URL` を `http://localhost:3000/api/auth/callback/github` に設定する

Supabaseプロジェクトの作成方法:

1. [supabase.com](https://supabase.com) でプロジェクトを作成する
2. Settings → Database → Connection String → URI からURLを取得する

---

## 9. 良いコミットメッセージの定義

良いコミットメッセージとは、未来の自分やチームメンバーが変更履歴を見返したときに、「何を」「なぜ」変更したのかを理解できるメッセージです。

コードの差分を見れば、何が変わったかはある程度分かります。しかし、その変更がなぜ必要だったのか、どの問題を解決するためのものだったのか、どの機能や画面に関係するものなのかは、差分だけでは分かりにくいことがあります。

そのため、コミットメッセージは単なる作業メモではなく、開発の履歴を読むための説明文として書くことが大切です。

CommitHyperでは、Conventional Commitsをベースにした次の形式を推奨します。

```text
<type>(<scope>): <summary>

[optional body]
```

例:

```text
fix(auth): 空のパスワードでログインできる問題を修正する

バリデーションを通過して不要な認証リクエストが発生していたため。
```

代表的なtype:

- `feat`: 新機能の追加
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `refactor`: 振る舞いを変えないコード整理
- `test`: テスト追加・修正
- `style`: フォーマットや見た目の調整
- `chore`: 設定・依存関係・雑務的な変更
- `build`: ビルド設定
- `ci`: CI/CD設定
- `perf`: パフォーマンス改善

MVPでは、完全なConventional Commits準拠を必須にはしません。Conventional Commitsを推奨形式としつつ、具体的で理解しやすいメッセージも評価します。

### 日本語の語尾について

summaryを日本語で書く場合、語尾の `する` はあってもなくても同等に評価します。

- `fix(auth): ログイン時のエラー処理を修正する` → ✅
- `fix(auth): ログイン時のエラー処理を修正` → ✅（同スコア）

どちらのスタイルでも構いませんが、**プロジェクト内で統一する**ことを推奨します。

---

## 10. コミットメッセージ評価ロジック

MVPでは、diffを見ずにコミットメッセージ単体を評価します。

評価は100点満点とします。

### 10.1 評価基準

#### 1. 形式の明確さ / 20点

`type: summary` または `type(scope): summary` の形式に近いかを評価します。

**判定テーブル:**

| 条件                                                     | 点数 |
| -------------------------------------------------------- | ---- |
| `type(scope): summary` の形式に完全一致                  | 20点 |
| `type: summary` の形式に一致（scopeなし）                | 16点 |
| typeらしき prefix はあるが形式が不完全（例: `fix bug`）  | 8点  |
| 日本語のみ、または形式が全くない（例: `修正`、`update`） | 0点  |

高評価例:

```text
fix: ログインエラー表示を修正する
feat(repo): リポジトリ切り替え機能を追加する
refactor(score): 評価ロジックを分離する
```

低評価例:

```text
修正 / update / fix bug / ログイン修正
```

#### 2. 変更種別の適切さ / 15点

typeが一般的で、変更内容に合っているかを評価します。

**判定テーブル:**

| 条件                                                                                           | 点数 |
| ---------------------------------------------------------------------------------------------- | ---- |
| `feat` `fix` `docs` `refactor` `test` `style` `chore` `build` `ci` `perf` のいずれかに完全一致 | 15点 |
| 上記に近い表記だがやや外れている（例: `feature`、`bugfix`）                                    | 8点  |
| typeが存在しない、または全く異なる語                                                           | 0点  |

#### 3. Summaryの具体性 / 25点

何を変更したかが分かるかを評価します。

**判定テーブル:**

| 条件                                                       | 点数 |
| ---------------------------------------------------------- | ---- |
| 機能名・画面名・処理名など固有名詞が含まれ、変更内容が明確 | 25点 |
| 変更内容はある程度伝わるが固有名詞が不足                   | 15点 |
| 変更内容が曖昧（例: `update file`、`変更した`）            | 5点  |
| 単語1つ・意味不明（例: `fix`、`update`、`修正`）           | 0点  |

高評価例:

```text
fix(auth): 空のパスワードでログインできる問題を修正する
feat(repo): リポジトリ切り替え機能を追加する
```

低評価例:

```text
fix bug / update / 修正 / いろいろ変更
```

#### 4. Why・背景の説明 / 20点

なぜ変更したのか、または変更の目的が伝わるかを評価します。

MVPでは、本文がある場合やsummary内に目的が含まれている場合に加点します。ただし、単純なtypo修正や軽微な変更では、Whyがなくても大きく減点しません。

**判定テーブル:**

| 条件                                                           | 点数 |
| -------------------------------------------------------------- | ---- |
| 本文（body）に理由・背景が書かれている                         | 20点 |
| summaryにWhy相当の情報が含まれている（例: `〜のため修正する`） | 14点 |
| 軽微な変更でWhyが不要と判断できる（typo修正など）              | 12点 |
| Whyの記述が全くない（通常の変更）                              | 0点  |

#### 5. 読みやすさ / 10点

1行目が要約として読みやすいかを評価します。

**判定テーブル:**

| 条件                                                            | 点数 |
| --------------------------------------------------------------- | ---- |
| 10〜72文字で自然な表現                                          | 10点 |
| やや短い（5〜9文字）またはやや長い（73〜100文字）が内容は伝わる | 6点  |
| 短すぎる（4文字以下）または長すぎる（101文字以上）              | 2点  |

見るポイント:

- 短すぎない / 長すぎない
- 自然な表現
- 日本語の場合、語尾の `する` はあってもなくても減点しない（セクション9参照）

#### 6. 業務での追跡しやすさ / 10点

レビュー、障害調査、リリース確認で役立つ履歴になっているかを評価します。

**判定テーブル:**

| 条件                                                        | 点数 |
| ----------------------------------------------------------- | ---- |
| 機能名・画面名・処理名・Issue番号など追跡に役立つ情報がある | 10点 |
| scopeのみある                                               | 6点  |
| 追跡に役立つ情報がない                                      | 0点  |

加点対象: 機能名 / 画面名 / 処理名 / Issue番号 / 意味のあるscope

### 10.2 ランク

- `excellent`: 90〜100点
- `good`: 70〜89点
- `needs_improvement`: 50〜69点
- `poor`: 0〜49点

### 10.3 合格判定

改善後のスコアが70点以上なら合格とします。

90点以上の場合は高評価として追加XPを付与します。

### 10.4 評価結果の型

```ts
type CommitEvaluationResult = {
  score: number;
  rank: "excellent" | "good" | "needs_improvement" | "poor";
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
};
```

### 10.5 改善例の扱い

改善例は「正解」ではなく「参考例」として扱います。

MVPではdiffを見ないため、実際の変更内容と完全に一致するとは限りません。

例:

元メッセージ: `fix bug`

改善例: `fix(auth): ログイン時のエラー処理を修正する`

画面には以下のような補足を表示します。

```text
実際の変更内容に合わせて、scopeやsummaryを調整してください。
```

---

## 11. スコア更新方針

CommitHyperでは、リポジトリ読み込み時に全コミットメッセージへ初回スコアを割り当てます。

その後、ユーザーが改善メッセージを書いて再評価すると、コミットごとの現在スコアを更新します。

### 11.1 initialScore

`initialScore` は初回読み込み時に付与されたスコアです。

- リポジトリの元の状態を表す
- 改善後も変更しない
- Initial Average Scoreの計算に使う

### 11.2 currentScore

`currentScore` は現在の評価スコアです。

MVPでは、currentScoreを「そのコミットで達成した最高スコア」として扱います。

- 未改善の場合は `initialScore` と同じ
- 改善後、afterScoreが現在のcurrentScoreより高ければ更新する
- 合格していなくても、50点から65点のように改善していればcurrentScoreを上げられる
- Current Average Scoreの計算に使う

更新ルール:

```ts
if (afterScore > commit.currentScore) {
  commit.currentScore = afterScore;
}

if (afterScore >= 70) {
  commit.status = "improved";
}
```

この設計により、ユーザーが改善に取り組むほど、リポジトリ全体の現在平均スコアが上がっていく体験を実現します。

---

## 12. XP・成長ゲージ仕様

改善後スコアに応じてXPを付与します。

| スコア    | 判定           | 付与XP |
| --------- | -------------- | ------ |
| 90〜100点 | 合格（高評価） | +15 XP |
| 70〜89点  | 合格           | +10 XP |
| 50〜69点  | 不合格         | +3 XP  |
| 0〜49点   | 不合格         | +0 XP  |

改善に合格した場合:

1. 改善履歴を保存する
2. XP履歴を保存する
3. ユーザーのXPを更新する
4. レベルを再計算する
5. コミットのstatusを `improved` に変更する
6. 改善候補から削除する
7. 次の候補を補充する

50〜69点の場合:

- 少量XPを付与して学習努力を評価する
- currentScoreは上がる可能性がある
- ただしstatusは `pending` のままにする
- 改善候補には残す

---

## 13. レベル・称号仕様

成長ゲージはリポジトリ単位ではなく、ユーザー全体の累計XPに基づいて表示します。

理由:

- 複数リポジトリで改善しても成長が積み上がる
- CommitHyper上の学習進捗として分かりやすい
- レベル・称号と連動しやすい

MVPでは累計XPによってレベルを決めます。

| レベル | 必要累計XP | 称号             |
| ------ | ---------- | ---------------- |
| Lv.1   | 0 XP       | Commit Beginner  |
| Lv.2   | 100 XP     | Message Trainer  |
| Lv.3   | 250 XP     | History Cleaner  |
| Lv.4   | 450 XP     | Commit Craftsman |
| Lv.5   | 700 XP     | Git Log Master   |

レベル計算は固定テーブルまたは関数で実装します。

---

## 14. デスクトップ中心の画面方針

CommitHyperは、デスクトップ中心の開発者向けダッシュボードとして設計します。

スマホアプリのような縦長カードUIではなく、開発者がGitHubリポジトリの状態を確認しながら、改善すべきコミットメッセージを効率よく直していくワークスペースにします。

画面全体は以下の3カラム構成を基本とします。

- 左: ナビゲーション
- 中央: 改善候補・メイン作業エリア
- 右: 成長状況・統計・評価サマリー

レイアウトイメージ:

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Bar                                                      │
│ CommitHyper | Repository Selector | Re-analyze | User        │
├──────────────┬───────────────────────────────┬───────────────┤
│ Sidebar      │ Main Area                     │ Right Panel   │
│              │                               │               │
│ Dashboard    │ Improvement Queue             │ Growth Card   │
│ Repositories │ Candidate Cards x 3           │ Level / XP    │
│ Guide        │ Pager 02 / 18                 │ Stats         │
│ Settings     │                               │ Quality       │
└──────────────┴───────────────────────────────┴───────────────┘
```

---

## 15. 画面構成

MVPで作る画面:

1. ログイン画面
2. ダッシュボード画面
3. リポジトリ選択画面
4. コミット改善画面
5. 良いコミットメッセージとは画面

Phase 2以降:

6. 改善履歴画面
7. 設定画面
8. リポジトリ詳細分析画面

### 15.1 ログイン画面

目的: GitHubアカウントでログインする。

表示内容:

- CommitHyperロゴ
- アプリの短い説明
- GitHubでログインボタン
- リポジトリ権限に関する簡単な説明

### 15.2 ダッシュボード画面

目的: ユーザーの成長状態、選択中リポジトリの品質、改善すべきコミット候補を一画面で見せる。

#### Top Bar

表示内容:

- CommitHyperロゴ
- 現在選択中のリポジトリ
- リポジトリ切り替えボタン
- 再分析ボタン
- GitHubユーザーアイコン
- ログアウトメニュー

例:

```text
CommitHyper    owner/repository-name    [Switch Repository] [Re-analyze]    @username
```

#### Sidebar

MVPで実装: Dashboard / Repositories / Guide

Phase 2以降: History / Settings

#### Main Area

表示内容:

- `Improvement Queue`
- 改善候補カード3件
- ページ表示 `02 / 18`
- 前へ / 次へボタン

改善候補カードの表示内容:

- 元のコミットメッセージ
- 現在スコア
- ランク
- 主な問題点
- 改善例
- 改善するボタン
- スキップボタン

カード例:

```text
fix bug

Score: 24 / Poor

問題:
- 変更内容が具体的ではありません
- 何のbugを修正したか分かりません

改善例:
fix(auth): ログイン時のエラー処理を修正する

[改善する] [スキップ]
```

#### Pager

```text
02 / 18    [←] [→]
```

ルール:

- 1ページ3件
- `totalPages = ceil(候補数 / 3)`
- 改善成功した候補は消える
- 後続候補が補充される
- 現在ページが空になったら前のページへ戻る

#### Right Panel

Growth Card:

```text
Lv.3
History Cleaner

XP 320 / 450
[=======-------------]
あと130XPでLv.4
```

Repository Quality:

```text
Current Score: 71 / 100
Initial Score: 58 / 100
Improvement: +13

Total Commits: 48
Needs Improvement: 18
Improved: 7
Excellent: 23
```

### 15.3 リポジトリ選択画面

目的: 分析対象のGitHubリポジトリを切り替える。

表示内容:

- リポジトリ一覧
- 公開 / 非公開ラベル
- 最終更新日
- 分析済みかどうか
- 選択ボタン

動作:

- リポジトリを選ぶと、そのリポジトリをアクティブにする
- 未分析ならコミットを取得する
- 分析済みならDBの評価結果を利用する
- 必要に応じて再分析ボタンを用意する

### 15.4 コミット改善画面

目的: ユーザーが悪いコミットメッセージを自分で書き直し、再評価する。

MVPでは、ダッシュボードから別ページへ遷移する形式で実装します。

ルート例:

```text
/dashboard
/commits/[commitId]/improve
```

表示内容:

- 元のコミットメッセージ
- 現在スコア
- 問題点
- 改善提案
- 良いコミットメッセージ例
- 入力欄
- 再評価ボタン
- 再評価結果
- 獲得XP
- ダッシュボードへ戻るボタン

動作:

1. ユーザーが改善メッセージを入力する
2. 再評価ボタンを押す
3. afterScoreを算出する
4. afterScoreがcurrentScoreより高ければcurrentScoreを更新する
5. 70点以上なら改善成功
6. XPが付与される
7. 成長ゲージが増える
8. ホームの改善候補から消える

### 15.5 良いコミットメッセージとは画面

目的: CommitHyperがどのような基準でコミットメッセージを評価しているかを説明する。

表示内容:

- 良いコミットメッセージの定義
- 推奨フォーマット
- type一覧
- 悪い例
- 良い例
- Whyを書く重要性
- CommitHyperでの評価観点

---

## 16. ダッシュボードメトリクス定義

### 16.1 Current Average Score

```text
currentAverageScore = sum(currentScore) / totalCommitCount
```

改善結果を反映した現在のリポジトリ品質。ユーザーが改善するほど上がる。ダッシュボードで最も大きく表示する。

### 16.2 Initial Average Score

```text
initialAverageScore = sum(initialScore) / totalCommitCount
```

リポジトリの元の状態。改善前の基準値。

### 16.3 Improvement Score

```text
improvementScore = currentAverageScore - initialAverageScore
```

表示例: `+13` / `+8.5` / `No change`

### 16.4 Needs Improvement

条件: `currentScore < 70` かつ `status = pending`

### 16.5 Improved

条件: `status = improved`

### 16.6 Excellent

条件: `status = excellent`（初回評価時点で70点以上）

### 16.7 Total Commits

選択中リポジトリから取得した全コミット数。

---

## 17. DB設計

Prisma + PostgreSQLを使用します。

### 17.1 Prismaスキーマ（schema.prisma）

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// =====================
// Auth.js 標準モデル
// =====================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?

  // CommitHyper 独自フィールド
  githubId   String?  @unique
  username   String?
  avatarUrl  String?
  level      Int      @default(1)
  xp         Int      @default(0)
  title      String   @default("Commit Beginner")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  accounts           Account[]
  sessions           Session[]
  repositories       Repository[]
  improvementAttempts ImprovementAttempt[]
  xpEvents           XpEvent[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// =====================
// CommitHyper モデル
// =====================

model Repository {
  id            String   @id @default(cuid())
  userId        String
  githubRepoId  Int
  owner         String
  name          String
  fullName      String
  isPrivate     Boolean  @default(false)
  defaultBranch String   @default("main")
  selectedAt    DateTime?
  analyzedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  commits Commit[]

  @@unique([userId, githubRepoId])
}

model Commit {
  id           String   @id @default(cuid())
  repositoryId String
  sha          String
  message      String   @db.Text
  authorName   String?
  authorEmail  String?
  committedAt  DateTime
  url          String?
  initialScore Int      @default(0)
  currentScore Int      @default(0)
  // pending: 改善対象 / improved: 改善済み / ignored: スキップ / excellent: 初回から高評価
  status       String   @default("pending")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  repository          Repository           @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  evaluations         CommitEvaluation[]
  improvementAttempts ImprovementAttempt[]
  xpEvents            XpEvent[]

  @@unique([repositoryId, sha])
}

model CommitEvaluation {
  id            String   @id @default(cuid())
  commitId      String
  targetMessage String   @db.Text
  score         Int
  // excellent / good / needs_improvement / poor
  rank          String
  issues        Json     @default("[]")
  suggestions   Json     @default("[]")
  exampleMessage String  @db.Text
  evaluatedAt   DateTime @default(now())

  commit Commit @relation(fields: [commitId], references: [id], onDelete: Cascade)
}

model ImprovementAttempt {
  id            String   @id @default(cuid())
  commitId      String
  userId        String
  beforeMessage String   @db.Text
  afterMessage  String   @db.Text
  beforeScore   Int
  afterScore    Int
  passed        Boolean  @default(false)
  feedback      String?  @db.Text
  xpGained      Int      @default(0)
  createdAt     DateTime @default(now())

  commit Commit @relation(fields: [commitId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model XpEvent {
  id             String   @id @default(cuid())
  userId         String
  // improvement_passed / improvement_excellent / retry_bonus
  type           String
  amount         Int
  reason         String?
  relatedCommitId String?
  createdAt      DateTime @default(now())

  user          User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  relatedCommit Commit? @relation(fields: [relatedCommitId], references: [id])
}
```

### 17.2 リレーション

- User 1 - N Repository
- Repository 1 - N Commit
- Commit 1 - N CommitEvaluation
- Commit 1 - N ImprovementAttempt
- User 1 - N ImprovementAttempt
- User 1 - N XpEvent

---

## 18. 改善候補キュー

ダッシュボードでは、以下の条件に当てはまるコミットを改善候補として表示します。

条件:

- `status = pending`
- `currentScore < 70`

並び順:

1. `currentScore` が低い順
2. 同点の場合は `committedAt` が新しい順

表示:

- 1ページ3件
- ページャーは `02 / 18` 形式

内部計算:

```ts
totalPages = Math.ceil(candidateCount / 3);
currentPage = 1;
```

改善成功後:

1. Commit.statusを `improved` に変更する
2. Commit.currentScoreを更新する
3. 改善候補リストを再計算する
4. 現在ページを維持する
5. ページが空になった場合は前のページに戻す

---

## 19. 実装順序

### Step 1: プロジェクト初期化

作業:

- Next.jsプロジェクトを作成する
- TypeScriptを有効にする
- Tailwind CSSを設定する
- ESLint / Prettierを設定する
- 基本レイアウトを作成する

完了チェックリスト:

- [ ] `npm run dev` でローカル起動できる
- [ ] トップページ（`/`）が表示される
- [ ] TypeScriptエラーがない

---

### Step 2: 認証実装

作業:

- Auth.js / NextAuth.jsを導入する
- GitHub Providerを設定する
- GitHub OAuth Appを作成する（セクション8.1参照）
- 環境変数を設定する（セクション8.1参照）
- ログイン画面を作成する
- Prisma Adapterでユーザー情報をDBに保存する

完了チェックリスト:

- [ ] GitHubログインボタンが表示される
- [ ] クリックするとGitHubの認証画面に遷移する
- [ ] ログイン後にダッシュボードへリダイレクトされる
- [ ] DBのUserテーブルにレコードが保存されている

---

### Step 3: DBスキーマ作成

作業:

- Prismaを導入する
- PostgreSQL接続を設定する
- セクション17.1のスキーマをそのまま使う
- マイグレーションを実行する

完了チェックリスト:

- [ ] `npx prisma migrate dev` が成功する
- [ ] DBに必要なテーブルが全て作成される
- [ ] `npx prisma studio` でテーブルを確認できる

---

### Step 4: GitHub API連携

作業:

- サーバー側でGitHubアクセストークンを取得する
- ユーザーのリポジトリ一覧を取得する
- 公開 / 非公開リポジトリを表示する
- 選択したリポジトリをDBに保存する

完了チェックリスト:

- [ ] リポジトリ一覧が画面に表示される
- [ ] 公開・非公開のラベルが表示される
- [ ] リポジトリを選択するとDBに保存される

---

### Step 5: コミット取得

作業:

- 選択したリポジトリのコミット一覧をGitHub APIから取得する
- GitHub APIのページネーションに対応する
- 取得したコミットをDBに保存する
- repository + shaで重複保存を防ぐ
- 取得済みの場合はDBのデータを再利用する

完了チェックリスト:

- [ ] 選択リポジトリのコミットがDBに保存される
- [ ] 重複してコミットが保存されない

---

### Step 6: ルールベース評価

作業:

- コミットメッセージ評価ロジックを実装する（セクション10参照）
- score、rank、issues、suggestions、exampleMessageを返す
- 評価結果をDBに保存する
- 初回評価時に `initialScore` と `currentScore` を保存する
- 70点以上のコミットは `excellent` として扱う
- 70点未満のコミットは `pending` として改善候補にする

完了チェックリスト:

- [ ] 各コミットメッセージにスコアが付く
- [ ] DBのCommitテーブルにinitialScore・currentScore・statusが保存される
- [ ] `excellent` と `pending` が正しく分類される

---

### Step 7: デスクトップダッシュボード

作業:

- Top Barを作成する
- Sidebarを作成する
- Main Areaに改善候補カードを3件表示する（最初はモックデータで実装）
- `02 / 18` 形式のページャーを実装する
- Right Panelに成長状況とリポジトリ品質を表示する

完了チェックリスト:

- [ ] 3カラムレイアウトが表示される
- [ ] 改善候補カードが3件表示される
- [ ] ページャーで前後に移動できる
- [ ] Right Panelに成長状況・スコアが表示される

---

### Step 8: 改善画面

作業:

- 元のコミットメッセージを表示する
- 現在スコアを表示する
- 問題点を表示する
- 改善提案を表示する
- 良いコミットメッセージ例を表示する
- 入力欄を作成する
- 再評価ボタンを作成する

完了チェックリスト:

- [ ] ダッシュボードから改善画面に遷移できる
- [ ] 元メッセージ・スコア・問題点・改善例が表示される
- [ ] 改善メッセージを入力して再評価ボタンを押せる

---

### Step 9: XP・成長ゲージ・平均スコア更新

作業:

- 改善後メッセージを再評価する
- afterScoreがcurrentScoreより高ければcurrentScoreを更新する
- 70点以上なら合格にする
- ImprovementAttemptを保存する
- XpEventを保存する
- ユーザーのXPを更新する
- レベルと称号を再計算する
- 合格時はCommit.statusを `improved` に変更する
- ダッシュボードから改善済み候補を消す
- Current Average Scoreを再計算する
- Improvement Scoreを再計算する

完了チェックリスト:

- [ ] 改善に成功すると成長ゲージが伸びる
- [ ] 改善済みコミットが候補から消える
- [ ] リポジトリの現在平均スコアが上がる
- [ ] XP・レベル・称号が更新される

---

### Step 10: 良いコミットメッセージとはページ

作業:

- 良いコミットメッセージの説明ページを作成する
- 推奨フォーマットを表示する
- type一覧を表示する
- 悪い例 / 良い例を表示する
- CommitHyperの評価観点を説明する

完了チェックリスト:

- [ ] Sidebarの「Guide」リンクからページに遷移できる
- [ ] 評価基準・フォーマット・例が表示される

---

## 20. MVPでやらないこと

- diffを使った整合性評価
- LLM API必須の評価
- 実際のGit履歴の書き換え
- チーム機能
- Organization全体分析
- 厳格なConventional Commits完全準拠モード
- 高度なグラフ分析
- バッジ機能
- SNS共有

---

## 21. Phase 2の追加機能

MVP完成後、余裕があれば以下を実装します。

- 改善候補を選択したときにdiffを取得する
- 元メッセージとdiffの整合性を評価する
- 改善後メッセージとdiffの整合性を評価する
- LLM APIによる自然な改善提案を追加する
- 評価理由を詳細表示する
- 改善履歴画面を追加する

---

## 22. Phase 3の追加機能

Phase 2以降で、さらに余裕があれば以下を実装します。

- バッジ機能
- 連続改善日数
- 成長履歴グラフ
- 改善前後の比較履歴
- リポジトリ別スコア
- 月別コミットメッセージ品質推移
- 完了済みコミット一覧
- Strict Conventional Commits Mode
- Python FastAPIによる評価サービス分離

---

## 23. 1ヶ月スケジュール

### Week 1: 土台作り

目標: ログインとDB保存まで完成させる。

作業: プロジェクト作成 / Tailwind CSS設定 / Auth.js + GitHub OAuth / Prisma + PostgreSQL / User・Repository周りのDB設計 / GitHub APIでリポジトリ一覧取得

成果物: GitHubログインできる / リポジトリ一覧が表示される

### Week 2: コミット取得と評価

目標: リポジトリのコミットを取得し、評価できるようにする。

作業: コミット取得処理 / ページネーション対応 / コミット保存 / ルールベース評価ロジック / initialScore・currentScore保存 / 評価結果保存 / 改善候補キュー生成

成果物: 改善すべきコミット候補が生成される

### Week 3: ダッシュボードとコア体験完成

目標: 改善して成長ゲージと平均スコアが伸びる体験を完成させる。

作業: デスクトップダッシュボード / 成長ゲージ / リポジトリ品質メトリクス / 改善候補3件表示 / ページャー / 改善画面 / 再評価 / XP付与 / currentScore更新 / 改善済み候補の非表示化

成果物: CommitHyperのMVP体験が完成する

### Week 4: 仕上げ・発展機能

目標: 提出できる品質まで磨く。

作業: 良いコミットメッセージとはページ / UI調整 / ローディング状態 / エラー処理 / 空状態 / デプロイ / README作成 / 余裕があればPhase 2の一部を実装

成果物: 本番URL / README / デモ可能なWebアプリ

---

## 24. 最終優先順位

開発時間が足りなくなった場合は、以下の順で優先します。

1. GitHubログイン
2. リポジトリ選択
3. コミット取得
4. コミットメッセージ評価
5. initialScore / currentScore保存
6. ダッシュボードの改善候補表示
7. 改善メッセージ入力
8. XP・成長ゲージ
9. Current Average Score更新
10. 良いコミットメッセージとはページ
11. UI調整
12. Phase 2以降の機能

MVPの完了条件:

1. GitHubでログインできる
2. リポジトリを選択できる
3. 全コミットメッセージを取得できる
4. 全コミットメッセージに初回スコアを付けられる
5. 改善すべきコミットメッセージが表示される
6. ユーザーがコミットメッセージを書き直せる
7. 再評価に合格できる
8. XPが増える
9. 成長ゲージが伸びる
10. 改善済み候補が消える
11. リポジトリの現在平均スコアが上がる

---

## 25. 就活で話せるポイント（補足）

READMEや面接では、以下を強調します。

- Next.js + TypeScriptでフルスタックWebアプリを開発した
- GitHub OAuth認証を実装した
- 非公開リポジトリへのアクセス権限を考慮した
- GitHub APIと連携してリポジトリ・コミット情報を取得した
- PostgreSQL + Prismaでユーザー、リポジトリ、コミット、評価履歴、XP履歴を設計した
- `initialScore` と `currentScore` を分け、改善前後の状態をデータとして扱えるようにした
- 改善によってリポジトリ全体のCurrent Average Scoreが上がる設計にした
- 実務で使われるコミットメッセージ作法をもとに評価ロジックを設計した
- 単なる採点ではなく、改善タスク・成長ゲージ・リポジトリ品質スコアを組み合わせた学習体験を作った
- MVPではdiff評価をあえて後回しにし、完成可能性とコア体験を優先した
- GoやPythonを無理に使わず、プロダクトの完成に最適な構成を選んだ
- デスクトップ中心のダッシュボードとして、開発者向けツールらしいUIを設計した
