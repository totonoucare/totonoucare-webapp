import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { GUIDED_CANDIDATES, GUIDED_CLUE_OPTIONS } from "../lib/care-shop/guidedCatalog.js";
import { buildGuidedSearchResult } from "../lib/care-shop/guidedEngine.js";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const safeInput = {
  concerns: ["neck_shoulder"],
  freeText: "",
  duration: "months",
  intensity: "moderate",
  thermal: "mixed",
  moisture: "dry",
  reserve: "standard",
  digestion: "none",
  response: "move_better",
  scope: "all",
  ageBand: "adult",
  pregnancy: "no",
  medication: "no",
  allergy: "no",
  redFlags: [],
  clues: [],
};

test("専門候補を具体的な用品・健康食品・漢方へ拡充する", () => {
  const counts = Object.fromEntries(["selfcare", "health", "kampo"].map((type) => [type, GUIDED_CANDIDATES.filter((item) => item.type === type).length]));
  assert.ok(counts.selfcare >= 16);
  assert.ok(counts.health >= 20);
  assert.ok(counts.kampo >= 25);
  assert.equal(new Set(GUIDED_CANDIDATES.map((item) => item.id)).size, GUIDED_CANDIDATES.length);
  assert.ok(GUIDED_CANDIDATES.some((item) => item.title === "肩甲骨まで覆うレンジ加熱式ネックピロー"));
  assert.ok(GUIDED_CANDIDATES.some((item) => item.title === "火を使わない貼るタイプのお灸"));
  assert.ok(GUIDED_CANDIDATES.some((item) => item.title === "人参養栄湯"));
  assert.ok(GUIDED_CANDIDATES.some((item) => item.title === "抑肝散加陳皮半夏"));
});

test("一般的なノンカフェイン健康茶をショップ候補から外す", () => {
  assert.ok(!GUIDED_CANDIDATES.some((item) => /ノンカフェイン.*健康茶|ノンカフェイン.*ハーブティー/.test(`${item.title} ${item.query}`)));
  assert.ok(GUIDED_CANDIDATES.filter((item) => item.type === "selfcare").every((item) => !/用品$|サポート$/.test(item.title)));
});

test("結果上部は選んだ内容の要点だけを短く表示する", () => {
  const result = buildGuidedSearchResult(safeInput);
  assert.match(result.currentState.summary, /首肩のつらさ/);
  assert.match(result.currentState.summary, /冷えと熱感の両方/);
  assert.match(result.currentState.summary, /乾き/);
  assert.match(result.currentState.summary, /動くと少し楽/);
  assert.doesNotMatch(result.currentState.summary, /体力は普段とあまり変わらない/);
  assert.doesNotMatch(result.currentState.summary, /こわばり・滞り|力が抜けにくい/);
  result.groups.flatMap((group) => group.candidates).forEach((candidate) => assert.doesNotMatch(candidate.matchReason, /力が抜けにくい/));
});

test("補助回答がある場合だけ近い漢方方剤を追加する", () => {
  const withoutClue = buildGuidedSearchResult({ ...safeInput, scope: "kampo" });
  assert.ok(!withoutClue.groups.flatMap((group) => group.candidates).some((item) => item.id === "kampo-nijutsuto"));

  const withClue = buildGuidedSearchResult({ ...safeInput, scope: "kampo", clues: ["shoulder_arm_pain"] });
  const candidates = withClue.groups.flatMap((group) => group.candidates);
  assert.ok(candidates.some((item) => item.id === "kampo-nijutsuto"));
  assert.match(candidates.find((item) => item.id === "kampo-nijutsuto").matchSummary, /肩から腕にかけて痛む/);
});

test("睡眠の追加回答から成分候補と方剤候補を分けて表示する", () => {
  const result = buildGuidedSearchResult({
    ...safeInput,
    concerns: ["sleep", "fatigue"],
    thermal: "cold",
    moisture: "neutral",
    reserve: "low",
    response: "rest_better",
    clues: ["tired_no_sleep"],
  });
  const ids = result.groups.flatMap((group) => group.candidates.map((item) => item.id));
  assert.ok(ids.includes("health-gaba-functional"));
  assert.ok(ids.includes("health-theanine-functional"));
  assert.ok(ids.includes("kampo-sansoninto"));
});

test("追加質問と画面先頭への移動をUIへ実装する", async () => {
  const [guided, page] = await Promise.all([
    source("components/care-shop/GuidedCareSearch.jsx"),
    source("app/care-navi/page.js"),
  ]);
  assert.match(guided, /飲む候補をもう少し絞る/);
  assert.match(guided, /GUIDED_CLUE_OPTIONS/);
  assert.match(guided, /scrollIntoView/);
  assert.match(guided, /moveToStep\(2\)[\s\S]*moveToStep\(3\)/);
  assert.doesNotMatch(guided, /今日だけ違う状態があっても、体質チェックの結果は上書きしません/);
  assert.match(page, /title="ケアショップ"/);
  assert.match(page, /subtitle="体質と今の状態から選ぶ"/);
});

test("追加質問キーと候補側の条件キーが一致する", () => {
  const clueKeys = new Set(GUIDED_CLUE_OPTIONS.map((item) => item.key));
  GUIDED_CANDIDATES.forEach((candidate) => {
    [...candidate.requiredClues, ...candidate.anyClues].forEach((key) => assert.ok(clueKeys.has(key), `${candidate.id}: ${key}`));
  });
});
