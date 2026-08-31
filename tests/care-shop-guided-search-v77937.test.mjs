import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assessGuidedSafety,
  buildGuidedSearchResult,
  normalizeConcernText,
} from "../lib/care-shop/guidedEngine.js";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const safeOralInput = {
  concerns: ["fatigue"],
  freeText: "",
  duration: "weeks",
  intensity: "moderate",
  thermal: "cold",
  moisture: "neutral",
  reserve: "low",
  digestion: "appetite_low",
  response: "rest_better",
  scope: "all",
  ageBand: "adult",
  pregnancy: "no",
  medication: "no",
  allergy: "no",
  redFlags: [],
};

test("体質チェックと今日の状態を混ぜずに候補を絞る", () => {
  const result = buildGuidedSearchResult(safeOralInput, {
    core_code: "brake_batt_large",
    sub_labels: ["fluid_damp"],
  });
  assert.equal(result.safety.level, "compare");
  assert.ok(result.currentState.stateKeys.includes("energy_low"));
  assert.ok(result.currentState.stateKeys.includes("cold"));
  assert.ok(result.groups.some((group) => group.type === "kampo"));
  const kampo = result.groups.find((group) => group.type === "kampo").candidates;
  assert.ok(kampo.some((item) => item.title === "補中益気湯"));
  assert.ok(kampo.every((item) => item.productClass === "第2類医薬品"));
  assert.match(kampo[0].matchSummary, /疲れ・だるさ/);
  assert.match(kampo[0].matchReason, /疲れやすさ/);
  assert.ok(kampo.every((item) => item.compare));
});

test("レッドフラッグはAIを通さず商品表示を止める", () => {
  const normalized = normalizeConcernText("突然、今までにない激しい頭痛が出た");
  assert.ok(normalized.red_flags.includes("sudden_headache"));
  const safety = assessGuidedSafety({ ...safeOralInput, freeText: "突然、今までにない激しい頭痛が出た" });
  assert.equal(safety.level, "stop");
  const result = buildGuidedSearchResult({ ...safeOralInput, freeText: "突然、今までにない激しい頭痛が出た" });
  assert.deepEqual(result.groups, []);
});

test("服薬中は内服候補を削除せず専門家確認へ切り替える", () => {
  const result = buildGuidedSearchResult({ ...safeOralInput, medication: "yes" });
  assert.equal(result.safety.level, "consult");
  assert.ok(result.groups.length > 0);
  assert.ok(result.safety.reasons.includes("治療中・服薬中"));
});

test("使用中の同一成分を候補へ明示する", () => {
  const activeEntries = [{ item: { activeUse: true, ingredientIds: ["licorice_root"] } }];
  const result = buildGuidedSearchResult(safeOralInput, null, activeEntries);
  const formula = result.groups.flatMap((group) => group.candidates).find((item) => item.ingredientIds.includes("licorice_root"));
  assert.ok(formula);
  assert.deepEqual(formula.duplicateIngredients, ["licorice_root"]);
});

test("ショップUIはおすすめ・悩み・保存を分け、AIは明示ボタン時だけ呼ぶ", async () => {
  const [page, guided, route] = await Promise.all([
    source("app/care-navi/page.js"),
    source("components/care-shop/GuidedCareSearch.jsx"),
    source("app/api/care-shop/interpret/route.js"),
  ]);
  assert.match(page, /おすすめ[\s\S]*悩みから探す/);
  assert.match(page, /SavedShopButton[\s\S]*保存した候補/);
  assert.doesNotMatch(page, /key: "interested", label: "気になる"/);
  assert.match(guided, /AIで入力内容を整理（任意）[\s\S]*このボタンを押した時だけAIを使います/);
  assert.match(guided, /IconSearch/);
  assert.doesNotMatch(guided, /⌕/);
  const aiFunction = guided.slice(guided.indexOf("async function organizeWithAi"), guided.indexOf("const oralSelected"));
  assert.match(aiFunction, /fetch\("\/api\/care-shop\/interpret"/);
  assert.doesNotMatch(guided.slice(0, guided.indexOf("async function organizeWithAi")), /\/api\/care-shop\/interpret/);
  assert.match(route, /model: "gpt-5\.6-luna"/);
  assert.match(route, /診断、原因推定、重症度判定、受診判断、商品・成分・漢方処方の推薦は絶対にしません/);
});

test("内服系は購入済みだけでは予報へ出ず、使用中だけ記録候補になる", async () => {
  const [itemsRoute, radar, page] = await Promise.all([
    source("app/api/care-shop/items/route.js"),
    source("app/radar/page.js"),
    source("app/care-navi/page.js"),
  ]);
  assert.match(itemsRoute, /ingredientIds: cleanStringList\(item\.ingredientIds\)/);
  assert.match(itemsRoute, /activeUse: Boolean\(item\.activeUse\)/);
  assert.match(page, /使用中にする/);
  assert.match(page, /使用中を解除/);
  assert.match(radar, /"health", "supplement", "kampo", "otc"/);
  assert.match(radar, /if \(ingestible && shopItem\.activeUse !== true\) return/);
});
