import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const careNaviSource = await readFile(new URL("../app/care-navi/page.js", import.meta.url), "utf8");

function build({ trigger, symptomFocus, date = "2026-08-04", mode = "today" }) {
  return daily.enhanceDailyCarePlan({
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
        sub_labels: ["fluid_damp", "qi_deficiency"],
        symptom_focus: symptomFocus,
        axes: { yin_yang_score: -0.8, drive_score: -0.7, obstruction_score: 0.3 },
        split_scores: {
          qi: { deficiency: 3.2, stagnation: 0.8 },
          blood: { deficiency: 0.4, stasis: 0.7 },
          fluid: { deficiency: 0.2, damp: 4.1 },
        },
      },
    },
    mode,
    targetDate: date,
    symptomFocus,
  }).lifestyle_plan;
}

test("7天気×9不調で、主提案の根拠から選択中の不調を落とさない", () => {
  const triggers = ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"];
  const symptoms = ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"];
  for (const trigger of triggers) {
    for (const symptomFocus of symptoms) {
      const primary = build({ trigger, symptomFocus }).primary_action;
      assert.ok(primary, `${trigger}/${symptomFocus}`);
      assert.equal(
        primary.selected_because.some((item) => item.axis === "symptom" && item.key === symptomFocus),
        true,
        `${trigger}/${symptomFocus}/${primary.id}`
      );
      assert.ok(primary.care_needs.length > 0);
      assert.ok(primary.why_today.length > 0);
    }
  }
});

test("胃腸とめまいへ、別の不調用の身体操作を流用しない", () => {
  const digestion = build({ trigger: "damp", symptomFocus: "digestion" }).primary_action;
  assert.equal(digestion.id, "tool-work-height");
  assert.match(`${digestion.scene} ${digestion.label} ${digestion.reason}`, /胃腸|お腹/);
  assert.doesNotMatch(`${digestion.scene} ${digestion.label}`, /段差|荷物|床の物/);

  const dizziness = build({ trigger: "damp", symptomFocus: "dizziness" }).primary_action;
  assert.ok(["tool-facing-layout", "tool-screen-height"].includes(dizziness.id));
  assert.match(`${dizziness.label} ${dizziness.reason}`, /画面|頭|見る物/);
  assert.doesNotMatch(`${dizziness.scene} ${dizziness.label}`, /歩く|段差|片足/);
});

test("旧い汎用除湿ルートを、現行の天気・体質ブーストから外す", () => {
  const weatherProfiles = careNaviSource.match(/const WEATHER_KIT_PROFILES = \{(.*?)\n\};/s)?.[1] || "";
  const constitutionProfiles = careNaviSource.match(/const SUB_LABEL_KIT_PROFILES = \{(.*?)function mergeSlotBoosts/s)?.[1] || "";
  assert.doesNotMatch(weatherProfiles, /humidity_control|除湿機|除湿剤/);
  assert.doesNotMatch(constitutionProfiles, /humidity_control|除湿機|除湿剤/);
  assert.match(`${weatherProfiles} ${constitutionProfiles}`, /bedding_moisture|除湿シート/);
});
