import { describe, test, expect } from "vitest";
import { evaluateCommit, SCORE, WEIGHT } from "../evaluateCommit";

describe("evaluateCommit", () => {
  test("完全な Conventional Commits（scopeあり）は高スコア", () => {
    const r = evaluateCommit("feat(auth): Googleログイン機能を追加する");
    expect(r.aspectScores.format).toBe(WEIGHT.FORMAT_SCOPE);
    expect(r.aspectScores.type).toBe(WEIGHT.TYPE_VALID);
    expect(r.score).toBeGreaterThanOrEqual(SCORE.GOOD);
  });

  test("scopeなしは FORMART_NO_SCOPE 点", () => {
    const r = evaluateCommit("feat: 追加する");
    expect(r.aspectScores.format).toBe(WEIGHT.FORMAT_NO_SCOPE);
  });

  test("typeがないと type スコアは0", () => {
    const r = evaluateCommit("適当なメッセージ");
    expect(r.aspectScores.type).toBe(0);
  });

  test("Merge pull request は55点", () => {
    const r = evaluateCommit("Merge pull request #123");
    expect(r.score).toBe(55);
  });

  test("Merge branch も55点", () => {
    const r = evaluateCommit("Merge branch 'feature/xxx' into main");
    expect(r.score).toBe(55);
  });

  test("Merge remote-tracking branch も55点", () => {
    const r = evaluateCommit("Merge remote-tracking branch 'origin/main'");
    expect(r.score).toBe(55);
  });

  test("First commit は55点", () => {
    const r = evaluateCommit("initial commit");
    expect(r.score).toBe(55);
  });

  test("近似typeは TYPE_CLOSE 点", () => {
    const r = evaluateCommit("feata(auth): タイポしたtype");
    expect(r.aspectScores.type).toBe(WEIGHT.TYPE_CLOSE);
  });

  test("bodyがあると why スコアが15点", () => {
    const r = evaluateCommit("fix(ui): ボタンの色を修正する\n\nユーザーから視認性が低いとフィードバックがあったため");
    expect(r.aspectScores.why).toBe(15);
  });

  test("課題番号があると traceability が5点", () => {
    const r = evaluateCommit("fix(ui): 修正 #123");
    expect(r.aspectScores.traceability).toBe(WEIGHT.TRACEABILITY);
  });

  test("読みやすい長さ(10-72文字)は readability が10点", () => {
    const r = evaluateCommit("fix(auth): ログインエラーを修正する");
    expect(r.aspectScores.readability).toBe(WEIGHT.READABILITY);
  });

  test("poor ランク（50点未満）", () => {
    const r = evaluateCommit("wip");
    expect(r.rank).toBe("poor");
    expect(r.score).toBeLessThan(SCORE.NEEDS_IMPROVEMENT);
  });
});
