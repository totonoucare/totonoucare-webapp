import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const careNaviPageSource = await readFile(new URL("../app/care-navi/page.js", import.meta.url), "utf8");
const rakutenRouteSource = await readFile(new URL("../app/api/care-navi/rakuten/route.js", import.meta.url), "utf8");

function build({
  date = "2026-08-04",
  symptomFocus = "neck_shoulder",
  trigger = "damp",
  secondary = null,
  coreCode = "brake_batt_small",
  mode = "today",
  signal = 1,
  axes = null,
  splitScores = null,
} = {}) {
  return daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast: {
      target_date: date,
      signal,
      score_display_0_10: signal === 2 ? 7.2 : signal === 1 ? 4.8 : 2.4,
      personal_main_trigger_exact: trigger,
      personal_secondary_trigger_exact: secondary,
    },
    riskContext: {
      summary: { main_trigger_exact: trigger, secondary_trigger_exact: secondary },
      target: { signal },
      constitution_context: {
        core_code: coreCode,
        sub_labels: coreCode.startsWith("brake") ? ["fluid_damp", "qi_deficiency"] : ["qi_stagnation", "fluid_deficiency"],
        symptom_focus: symptomFocus,
        ...(axes ? { axes } : {}),
        ...(splitScores ? { split_scores: splitScores } : {}),
      },
    },
    mode,
    targetDate: date,
    symptomFocus,
  });
}

function shown(plan) {
  return [plan?.primary_action, ...(plan?.alternatives || [])].filter(Boolean);
}

test("暮らすは身体の使い方と環境調整だけを、根拠付きで最大二件返す", () => {
  for (const trigger of ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"]) {
    for (const symptomFocus of ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"]) {
      const plan = build({ trigger, symptomFocus }).lifestyle_plan;
      const items = shown(plan);
      assert.ok(items.length >= 1 && items.length <= 2, `${trigger}/${symptomFocus}/${items.length}`);
      assert.equal(
        items[0].selected_because.some((reason) => reason.axis === "symptom" && reason.key === symptomFocus),
        true,
        `${trigger}/${symptomFocus}/${items[0].id}`
      );
      for (const action of items) {
        assert.ok(["body", "environment"].includes(action.care_kind));
        assert.ok(["身体の使い方", "環境調整"].includes(action.kind_label));
        assert.ok(action.scene.length > 0);
        assert.ok(action.label.length > 0);
        assert.ok(action.reason.length > 0);
        assert.ok(action.felt_sense.length > 0);
        assert.ok(action.why_today.length > 0);
        assert.ok(action.selected_because.length >= 1);
        assert.ok(Object.keys(action.score_breakdown).length >= 5);
        assert.ok(action.care_needs.length >= 1);
      }
    }
  }
});

test("主提案は選択中の不調を主アンカーにし、天気と体質を順位と理由へ通す", () => {
  const plan = build({
    trigger: "damp",
    symptomFocus: "neck_shoulder",
    coreCode: "brake_batt_small",
    axes: { yin_yang_score: -0.82, drive_score: -0.74, obstruction_score: 0.35 },
    splitScores: {
      qi: { deficiency: 3.2, stagnation: 0.8 },
      blood: { deficiency: 0.4, stasis: 0.7 },
      fluid: { deficiency: 0.2, damp: 4.1 },
    },
  }).lifestyle_plan;
  const primary = plan.primary_action;
  assert.equal(primary.selected_because[0].axis, "symptom");
  assert.equal(primary.selected_because[0].key, "neck_shoulder");
  assert.equal(primary.selected_because.some((item) => item.axis === "weather" && item.key === "damp"), true);
  assert.equal(primary.selected_because.some((item) => item.axis === "constitution"), true);
  assert.match(primary.why_today, /首肩のつらさ/);
  assert.match(primary.why_today, /湿気/);
  assert.ok(primary.score_breakdown.symptom <= 40);
  assert.ok(primary.score_breakdown.weather <= 25);
  assert.ok(primary.score_breakdown.constitution <= 20);
});

test("環境調整は人間工学と回復環境を扱い、冷房・除湿の常識助言だけにしない", () => {
  const toolBlock = dailySource.match(/const ENVIRONMENT_ADJUSTMENT_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 身体OS/s)?.[1] || "";
  const ids = [...toolBlock.matchAll(/id:\s*"(tool-[a-z0-9-]+)"/g)].map((match) => match[1]).sort();
  assert.deepEqual(ids, [
    "tool-arm-support",
    "tool-back-support",
    "tool-carry-distribution",
    "tool-facing-layout",
    "tool-foot-support",
    "tool-leg-rest",
    "tool-light-zone",
    "tool-screen-height",
    "tool-side-sleep-support",
    "tool-sound-zone",
    "tool-work-height",
  ]);
  assert.doesNotMatch(toolBlock, /除湿機|除湿剤|冷房か除湿|肌のべたつき|汗を拭|水分を数口/);
  assert.doesNotMatch(toolBlock, /予定|休憩|止め時|先送り|タスク|段取り/);
  assert.match(toolBlock, /care_needs:/);
  assert.match(toolBlock, /shop_eligible: true/);
});

test("個別ケア候補は天気への直結用品を外し、身体反応に応じた環境調整へ絞る", () => {
  const toolBlock = dailySource.match(/const ENVIRONMENT_ADJUSTMENT_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 身体OS/s)?.[1] || "";
  assert.doesNotMatch(toolBlock, /tool-heat-shield|tool-airflow-redirect|tool-bed-moisture-layer/);
  assert.doesNotMatch(toolBlock, /遮熱カーテン|冷房の風向き|敷きパッド/);
  assert.match(toolBlock, /tool-arm-support|tool-screen-height|tool-back-support|tool-leg-rest/);
});

test("商品適性は候補スコアへ入れず、身体操作は商品へ直結させない", () => {
  const scoringBlock = dailySource.match(/function lifestyleCandidateScore\(.*?\n\}/s)?.[0] || "";
  assert.doesNotMatch(scoringBlock, /shop_eligible|item_role|product|商品/);
  const bodyMapBlock = dailySource.match(/const BODY_MECHANICS_LIFESTYLE_CANDIDATES.*?\n\}\);/s)?.[0] || "";
  assert.match(bodyMapBlock, /item_role: null/);
  assert.match(bodyMapBlock, /shop_eligible: false/);
  assert.match(radarPageSource, /lifestylePlan\?\.shop_context/);
  assert.match(radarPageSource, /lifestyleShopContext \? <CareSetNaviBridge/);
});

test("身体操作と環境調整は同じ条件の再読込で固定し、別方向の二手を優先する", () => {
  const first = build({ date: "2026-08-04", symptomFocus: "low_back_pain", trigger: "damp" }).lifestyle_plan;
  const second = build({ date: "2026-08-04", symptomFocus: "low_back_pain", trigger: "damp" }).lifestyle_plan;
  assert.equal(first.primary_action.id, second.primary_action.id);
  assert.deepEqual(first.alternatives.map((item) => item.id), second.alternatives.map((item) => item.id));
  assert.equal(new Set(shown(first).map((item) => item.care_kind)).size, 2);
});

test("めまいでは不安定な身体操作を選ばない", () => {
  const unsafeIds = new Set(["tension-walk-center-first", "tension-stairs-center-up", "tension-floor-object-axis"]);
  for (const trigger of ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"]) {
    for (let day = 1; day <= 14; day += 1) {
      const plan = build({ date: `2026-08-${String(day).padStart(2, "0")}`, symptomFocus: "dizziness", trigger }).lifestyle_plan;
      for (const action of shown(plan)) assert.equal(unsafeIds.has(action.id), false, `${trigger}/${action.id}`);
    }
  }
});

test("環境調整の許可済みaction idだけをショップ検索へ接続する", () => {
  for (const id of [
    "tool-arm-support",
    "tool-screen-height",
    "tool-carry-distribution",
    "tool-work-height",
    "tool-foot-support",
    "tool-light-zone",
    "tool-back-support",
    "tool-leg-rest",
    "tool-side-sleep-support",
    "tool-facing-layout",
    "tool-sound-zone",
  ]) {
    assert.match(rakutenRouteSource, new RegExp(`"${id}":\\s*careQueryRow`));
  }
  assert.match(rakutenRouteSource, /\(\?:tool\|env\|foundation\)/);
  assert.match(rakutenRouteSource, /const LIFESTYLE_ACTION_ROLE_QUERY_RULES/);
  assert.match(rakutenRouteSource, /source:\s*"lifestyle_action"/);
  assert.doesNotMatch(rakutenRouteSource, /BODY_MECHANICS_LIVE_QUERY_RULES/);
  assert.match(careNaviPageSource, /lifestyle_action:\s*"暮らしの環境調整から"/);
  assert.doesNotMatch(rakutenRouteSource.match(/const TOOL_LAYOUT_LIVE_QUERY_RULES = \{(.*?)\n\};/s)?.[1] || "", /除湿機|除湿剤/);
});

test("暮らすの変換は予報スコアを変更しない", () => {
  const forecast = {
    target_date: "2026-08-04",
    signal: 1,
    score_display_0_10: 5.4,
    score_precise_0_10: 5.37,
    personal_main_trigger_exact: "damp",
    personal_secondary_trigger_exact: "heat",
  };
  const before = structuredClone(forecast);
  daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast,
    riskContext: {
      summary: { main_trigger_exact: "damp", secondary_trigger_exact: "heat" },
      target: { signal: 1 },
      constitution_context: { core_code: "brake_batt_small", symptom_focus: "fatigue" },
    },
    mode: "today",
    targetDate: forecast.target_date,
    symptomFocus: "fatigue",
  });
  assert.deepEqual(forecast, before);
});
