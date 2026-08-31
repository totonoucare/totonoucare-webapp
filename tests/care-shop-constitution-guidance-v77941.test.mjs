import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { GUIDED_CLUE_OPTIONS } from "../lib/care-shop/guidedCatalog.js";
import { buildGuidedSearchResult, deriveCurrentState } from "../lib/care-shop/guidedEngine.js";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const profile = {
  computed: {
    score_scale: "0_100",
    material_scores: {
      qi_deficiency: 72,
      qi_stagnation: 45,
      blood_deficiency: 48,
      blood_stasis: 62,
      fluid_deficiency: 30,
      fluid_damp: 75,
    },
    axes: { reserve_score: -0.35, cold_score: 0.75, heat_score: 0.15 },
  },
};

const lowBackInput = {
  subject: "self",
  concerns: ["low_back_pain"],
  freeText: "",
  duration: "days",
  intensity: "moderate",
  thermal: "mixed",
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

test("六つの体質素材スコアと今回の状態を合わせて候補を絞る", () => {
  const result = buildGuidedSearchResult(lowBackInput, profile);
  assert.ok(result.currentState.baseline.stateKeys.includes("energy_low"));
  assert.ok(result.currentState.baseline.stateKeys.includes("damp"));
  assert.ok(result.currentState.baseline.stateKeys.includes("stagnation"));
  assert.match(result.currentState.summary, /体質チェックの「.+」と、今回の「.+」を合わせて確認しています/);
  const ids = result.groups.flatMap((group) => group.candidates.map((candidate) => candidate.id));
  assert.ok(ids.includes("kampo-keishikajutsubuto"));
  const formula = result.groups.flatMap((group) => group.candidates).find((candidate) => candidate.id === "kampo-keishikajutsubuto");
  assert.match(formula.matchSummary, /腰のつらさ/);
  assert.match(formula.matchSummary, /体質：/);
  assert.doesNotMatch(formula.matchReason, /今回選んだ|体質チェックの/);
});

test("痛み方と排尿変化がそろう場合は足腰向け方剤を区別する", () => {
  const result = buildGuidedSearchResult({
    ...lowBackInput,
    duration: "months",
    thermal: "cold",
    clues: ["leg_pain_numbness", "urination_change_cold"],
  }, profile);
  const ids = result.groups.flatMap((group) => group.candidates.map((candidate) => candidate.id));
  assert.ok(ids.includes("kampo-hachimijiogan"));
  assert.ok(ids.includes("kampo-goshajinkigan"));
});

test("つりやすさの質問は重いけいれん表現を使わない", () => {
  const cramp = GUIDED_CLUE_OPTIONS.find((item) => item.key === "muscle_cramp");
  assert.equal(cramp.label, "足などの筋肉がつりやすい");
  assert.doesNotMatch(cramp.label, /けいれん|痙攣/);
});

test("家族を探す時はログイン中ユーザーの体質を流用しない", () => {
  const result = buildGuidedSearchResult({ ...lowBackInput, subject: "other" }, profile);
  assert.deepEqual(result.currentState.baseline.stateKeys, []);
  assert.doesNotMatch(result.currentState.summary, /体質チェックの/);
});

test("普段より動けそうという回答だけで緊張扱いにしない", () => {
  const state = deriveCurrentState({
    ...lowBackInput,
    concerns: ["other"],
    thermal: "neutral",
    moisture: "neutral",
    reserve: "high",
    response: "none",
  });
  assert.ok(!state.stateKeys.includes("tension"));
});

test("結果UIは通常の安全表示と選定根拠をコンパクトにする", async () => {
  const guided = await source("components/care-shop/GuidedCareSearch.jsx");
  assert.match(guided, /この条件で選びました/);
  assert.match(guided, /result\.safety\.level !== "compare"/);
  assert.doesNotMatch(guided, /体質と今回の回答を分けて確認|もともとの傾向/);
  assert.doesNotMatch(guided, /動けるが、力が抜けにくい/);
});
