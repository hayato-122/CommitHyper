# CommitHyper — Commit Message Rules

When writing commit messages, always follow the Conventional Commits format below.

## Format

```
type(scope): summary

- optional body with bullet points
- include why the change was made
```

### type
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `refactor` — refactoring (no feature/bugfix)
- `test` — add/fix tests
- `style` — formatting, whitespace (no logic change)
- `chore` — build process, tooling, dependencies
- `build` — build system / external dependencies
- `ci` — CI config / scripts
- `perf` — performance improvement

### scope (optional)
Single word indicating affected area (e.g. `auth`, `ui`, `api`, `db`, `config`, `deps`).

### summary (required)
- "Do something" or "Did something" form (consistent within repo)
- 10–72 characters
- Clearly state WHAT changed; include proper nouns for specificity

### body (recommended for multi-file diffs)
- Blank line after summary, then `-` bullet points
- Explain WHY the change was needed
- List key changes per file or area

## Good Examples

```
feat(auth): add GitHub login button

- Add OAuth entry point on top page
- Implement callback with Auth.js v5
- Redirect to dashboard after login
```

```
fix(api): handle empty response from GitHub

- Fix 500 error when GitHub API returns empty array
- Return empty array directly with early return
```

## Bad Examples (avoid)
- `fix bug` — which bug?
- `update` — says nothing
- `chore: fix` — type and summary mismatch
- `feat: 追加` — no scope, no specificity

## Output Rule
Output ONLY the commit message. No explanation, no quotes, no alternatives.
