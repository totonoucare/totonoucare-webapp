import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGuidedSearchResult } from "../lib/care-shop/guidedEngine.js";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const input = {
  subject: "self",
  concerns: ["low_back_pain"],
  freeText: "",
  duration: "days",
  intensity: "moderate",
  thermal: "cold",
  moisture: "damp",
  reserve: "low",
  digestion: "none",
  response: "warm_better",
  scope: "all",
  ageBand: "adult",
  pregnancy: "no",
  medication: "no",
  allergy: "no",
  redFlags: [],
  clues: [],
};

test("通常結果では意味の曖昧な安全確認文を表示しない", async () => {
  const result = buildGuidedSearchResult(input);
  assert.equal(result.safety.level, "compare");
  assert.deepEqual(result.safety.reasons, []);
  const guided = await source("components/care-shop/GuidedCareSearch.jsx");
  assert.doesNotMatch(guided, /選択した安全確認では大きな該当なし|内服しない候補を表示/);
  assert.match(guided, /result\.safety\.level !== "compare"/);
});

test("候補カードは短い照合条件を残し詳細を一つの開閉欄へまとめる", async () => {
  const guided = await source("components/care-shop/GuidedCareSearch.jsx");
  assert.match(guided, /合っている条件/);
  assert.match(guided, /理由と選び方を見る/);
  assert.match(guided, /group-open:hidden/);
  assert.doesNotMatch(guided, /同じ素材を含む区分を見る ＋|購入前に確認 ＋/);
  assert.ok(guided.indexOf("duplicateIngredients.length") < guided.indexOf("理由と選び方を見る"));
});

test("候補理由は回答全文を復唱せず候補固有の説明にする", () => {
  const result = buildGuidedSearchResult(input);
  const candidate = result.groups.flatMap((group) => group.candidates)[0];
  assert.ok(candidate.matchSummary);
  assert.match(candidate.matchSummary, /腰のつらさ/);
  assert.equal(candidate.matchReason, candidate.why);
  assert.doesNotMatch(candidate.matchReason, /今回選んだ|体質チェックの/);
});
