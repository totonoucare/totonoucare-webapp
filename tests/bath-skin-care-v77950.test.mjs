import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "./helpers/rule-read.mjs";

import { buildGuidedSearchResult } from "../lib/care-shop/guidedEngine.js";
import { matchesLifestyleProductRole } from "../lib/care-navi/lifestyleProductFit.js";
import {
  normalizeLifestyleShopActionKey,
} from "../lib/care-navi/lifestyleShopContext.js";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const careNaviSource = await readFile(new URL("../app/care-navi/page.js", import.meta.url), "utf8");
const rakutenSource = (await readFile(new URL("../app/api/care-navi/rakuten/route.js", import.meta.url), "utf8")) + (await readFile(new URL("../lib/care-navi/lifestyleShopQueries.js", import.meta.url), "utf8"));

function buildLifestyle({ mode, date, symptomFocus = "fatigue", trigger = "cold" }) {
  return daily.enhanceDailyCarePlan({
    lifestyleScene: "sleep",
    baseCarePlan: {},
    forecast: {
      target_date: date,
      signal: 1,
      score_display_0_10: 4.8,
      personal_main_trigger_exact: trigger,
    },
    riskContext: {
      summary: { main_trigger_exact: trigger },
      target: { signal: 1 },
      constitution_context: {
        core_code: "brake_batt_small",
        sub_labels: ["qi_deficiency", "blood_stasis"],
        symptom_focus: symptomFocus,
      },
    },
    mode,
    targetDate: date,
    symptomFocus,
  }).lifestyle_plan;
}

function shownIds(plan) {
  return [plan?.primary_action, ...(plan?.alternatives || [])].filter(Boolean).map((item) => item.id);
}

const safeGuidedInput = {
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

test("寝る前の場面を選ぶと、今日・今夜とも冷えに合う入浴ケアを選べる", () => {
for(const mode of ["today","tomorrow"]) {
const plans=Array.from({length:28},(_,i)=>buildLifestyle({mode,date:`2026-09-${String(i+1).padStart(2,"0")}`}));
const bath=plans.flatMap(p=>[p.primary_action,...p.alternatives]).find(x=>x?.id==="tool-bath-or-footbath");
assert.ok(bath);assert.match(bath.scene,/今夜、冷えが気になる時/);assert.match(bath.label,/ぬるめのお湯/);
assert.ok(!plans.some(p=>shownIds(p).some(id=>id.startsWith("prep-"))));
}
});

test("入浴・足湯は冷え系条件だけに出し、頭痛・めまいへ自動提案しない", () => {
  for (const mode of ["today", "tomorrow"]) {
    const hot = buildLifestyle({ mode, date: "2026-09-05", trigger: "heat" });
    assert.equal(shownIds(hot).some((id) => id.includes("bath-or-footbath")), false);
    for (const symptomFocus of ["headache", "dizziness"]) {
      for (let day = 1; day <= 7; day += 1) {
        const plan = buildLifestyle({ mode, date: `2026-09-${String(day).padStart(2, "0")}`, symptomFocus });
        assert.equal(shownIds(plan).some((id) => id.includes("bath-or-footbath")), false);
      }
    }
  }
});

test("入浴ケアからショップへ渡すキーと商品用途を固定する", () => {
  assert.equal(normalizeLifestyleShopActionKey("tool-bath-or-footbath"), "tool-bath-or-footbath");
  assert.equal(normalizeLifestyleShopActionKey("prep-evening-bath-or-footbath"), "prep-evening-bath-or-footbath");
  assert.equal(matchesLifestyleProductRole("無香料 炭酸 入浴剤", "bath_shift"), true);
  assert.equal(matchesLifestyleProductRole("足浴 バケツ 保温 深型", "bath_shift"), true);
  assert.equal(matchesLifestyleProductRole("デスク アームレスト", "bath_shift"), false);
  assert.match(rakutenSource, /"tool-bath-or-footbath": careQueryRow/);
  assert.match(rakutenSource, /"prep-evening-bath-or-footbath": careQueryRow/);
});

test("乾きの回答では全身用ボディミルクを優先し、不要な時は自動表示しない", () => {
  const dry = buildGuidedSearchResult({ ...safeGuidedInput, moisture: "dry" });
  const drySelfcare = dry.groups.find((group) => group.type === "selfcare")?.candidates || [];
  assert.ok(drySelfcare.slice(0, 3).some((item) => item.id === "care-body-moisturizing-milk"));

  const neutral = buildGuidedSearchResult({ ...safeGuidedInput, scope: "selfcare" });
  assert.equal(neutral.groups.flatMap((group) => group.candidates).some((item) => item.id === "care-body-moisturizing-milk"), false);

  const explicit = buildGuidedSearchResult({
    ...safeGuidedInput,
    concerns: ["other"],
    freeText: "ボディミルクを探したい",
    scope: "selfcare",
  });
  assert.ok(explicit.groups.flatMap((group) => group.candidates).some((item) => item.id === "care-body-moisturizing-milk"));
});

test("おすすめ検索も肌保湿を加湿器とは別用途で扱う", () => {
  assert.match(careNaviSource, /body_moisture: "肌のうるおいを守る"/);
  assert.match(careNaviSource, /ボディミルク 無香料 敏感肌 ポンプ 全身/);
  assert.match(careNaviSource, /key: "body_moisture"/);
  assert.match(rakutenSource, /body_moisture: \{ label: "肌のうるおいを守る" \}/);
  assert.match(rakutenSource, /ボディミルク 無香料 敏感肌 ポンプ 全身/);
});
