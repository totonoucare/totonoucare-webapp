import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { GUIDED_CANDIDATES, GUIDED_SCOPE_OPTIONS } from "../lib/care-shop/guidedCatalog.js";
import { buildGuidedSearchResult } from "../lib/care-shop/guidedEngine.js";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const safeInput = {
  concerns: ["fatigue"],
  freeText: "",
  duration: "days",
  intensity: "moderate",
  thermal: "neutral",
  moisture: "neutral",
  reserve: "standard",
  digestion: "none",
  response: "none",
  scope: "all",
  ageBand: "adult",
  pregnancy: "no",
  medication: "no",
  allergy: "no",
  redFlags: [],
};

test("ショップ対象はケア用品・健康食品サプリ・漢方薬の3分類", () => {
  assert.deepEqual(GUIDED_SCOPE_OPTIONS.map((item) => item.key), ["all", "selfcare", "health", "kampo"]);
  assert.deepEqual([...new Set(GUIDED_CANDIDATES.map((item) => item.type))], ["selfcare", "health", "kampo"]);
  assert.ok(!GUIDED_CANDIDATES.some((item) => item.id.startsWith("otc-")));
});

test("検索語は商品探索語に限定し比較項目を混ぜない", () => {
  GUIDED_CANDIDATES.forEach((candidate) => {
    assert.doesNotMatch(candidate.query, /成分量|原材料|含有量|規格/);
    assert.ok(candidate.compare, `${candidate.id} に選ぶときの確認が必要`);
    assert.ok(candidate.why, `${candidate.id} に候補理由が必要`);
  });
  const iron = GUIDED_CANDIDATES.find((item) => item.id === "health-heme-iron");
  assert.equal(iron.query, "ヘム鉄 サプリ");
  assert.doesNotMatch(iron.query, /非ヘム鉄/);
});

test("一般食品ではなくドラッグストア系の健康食品と飲料を扱う", () => {
  const health = GUIDED_CANDIDATES.filter((item) => item.type === "health");
  assert.ok(health.some((item) => item.productClass === "健康飲料"));
  assert.ok(health.some((item) => item.productClass === "健康茶"));
  assert.ok(health.some((item) => item.productClass === "サプリメント"));
  assert.ok(!health.some((item) => /スープ|山芋|常備食品|主食|副菜/.test(`${item.title} ${item.query}`)));
});

test("体質の重さ傾向を残したまま今日の乾きを別に表示する", () => {
  const result = buildGuidedSearchResult({
    ...safeInput,
    moisture: "dry",
    duration: "days",
  }, {
    core_code: "brake_batt_small",
    sub_labels: ["fluid_damp"],
  });
  assert.ok(result.currentState.baseline.stateKeys.includes("damp"));
  assert.ok(result.currentState.stateKeys.includes("dry"));
  assert.ok(!result.currentState.stateKeys.includes("damp"));
  assert.match(result.currentState.baseline.summary, /重さが出やすい/);
  assert.match(result.currentState.summary, /乾き/);
  assert.ok(!result.groups.some((group) => group.type === "health"));
});

test("マグネシウムは曖昧な緊張から自動表示せず明示入力時だけ比較する", () => {
  const vague = buildGuidedSearchResult({
    ...safeInput,
    concerns: ["neck_shoulder"],
    duration: "months",
    reserve: "high",
    scope: "health",
  });
  assert.ok(!vague.groups.flatMap((group) => group.candidates).some((item) => item.id === "health-magnesium"));

  const explicit = buildGuidedSearchResult({
    ...safeInput,
    concerns: ["other"],
    freeText: "マグネシウムを見たい",
    scope: "health",
  });
  const magnesium = explicit.groups.flatMap((group) => group.candidates).find((item) => item.id === "health-magnesium");
  assert.ok(magnesium);
  assert.match(magnesium.matchReason, /マグネシウムを調べたい/);
});

test("UIは理由と比較項目を分け意味不明な確認済みタグを出さない", async () => {
  const guided = await source("components/care-shop/GuidedCareSearch.jsx");
  assert.match(guided, /候補に入った理由/);
  assert.match(guided, /選ぶときの確認/);
  assert.match(guided, /今の体力に近いのは？/);
  assert.doesNotMatch(guided, /今の余力|用途確認済み|candidate\.trust/);
  assert.doesNotMatch(guided, /reserve: baseline\.reserve|thermal: baseline\.thermal/);
});
