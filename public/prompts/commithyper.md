# CommitHyper — Commit Message Rules

When writing commit messages, always follow the Conventional Commits format below.

## Language
- Summary は **日本語** で書くこと
- チームで言語ルールを決めるのが理想だが、このサイトでは日本語を前提としている
- Body も日本語推奨（英語の場合はリポジトリ内で統一）

## Format

```
type(scope): 変更の要約

- 必要に応じて箇条書きで詳細
- なぜ変更したかを含めると尚良い
```

### type
- `feat` — 新機能の追加
- `fix` — バグ修正
- `docs` — ドキュメントのみの変更
- `refactor` — リファクタリング（機能追加・バグ修正なし）
- `test` — テストの追加・修正
- `style` — コードの意味に影響しない変更（空白・フォーマット等）
- `chore` — ビルドプロセス・ツール・依存関係の変更
- `build` — ビルドシステム・外部依存関係の変更
- `ci` — CI設定・スクリプトの変更
- `perf` — パフォーマンス改善

### scope (optional)
影響範囲を表す単語（`auth`, `ui`, `api`, `db`, `config`, `deps` など）

### summary (required)
- 「〜する」または「〜した」調（リポジトリ内で統一）
- 10〜72文字に収める
- 「何を」変更したか明確に伝える。固有名詞を含めて具体性を高める

### body (recommended for multi-file diffs)
- summary の後に空行を入れ、`-` で箇条書き
- 「なぜこの変更が必要か」を含める
- 各ファイルの変更内容を簡潔に説明

## Good Examples

```
feat(auth): GitHubログインボタンを追加する

- トップページにOAuth認証の入り口を設置
- Auth.js v5でコールバック処理を実装
- ログイン後はダッシュボードにリダイレクト
```

```
fix(api): GitHubの空レスポンスを処理する

- GitHub APIが空配列を返した場合に500エラーになる問題を修正
- 早期リターンで空配列をそのまま返すよう変更
```

## Bad Examples (avoid)
- `fix bug` — どのバグか不明
- `update` — 何も伝わらない
- `chore: fix` — type と summary が噛み合っていない
- `feat: 追加` — scope がなく、何を追加したか不明

## Output Rule
Output ONLY the commit message. No explanation, no quotes, no alternatives.
