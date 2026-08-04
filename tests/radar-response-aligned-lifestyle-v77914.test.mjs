import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const bodySignSource = await readFile(new URL("../lib/radar_v1/bodySignInsights.js", import.meta.url), "utf8");
const bodySigns = await import(`data:text/javascript;base64,${Buffer.from(bodySignSource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");

function build({
  trigger,
  symptomFocus,
  reactionDirection,
  coreCode,
  date = "2026-08-04",
  mode = "today",
} = {}) {
  const brake = reactionDirection === "brake";
  return daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast: {
      target_date: date,
      signal: 1,
      personal_main_trigger_exact: trigger,
      reaction_direction: reactionDirection,
    },
    riskContext: {
      summary: { main_trigger_exact: trigger, reaction_direction: reactionDirection },
      target: { signal: 1 },
      constitution_context: {
        core_code: coreCode,
        sub_labels: brake ? ["fluid_damp", "qi_deficiency"] : ["qi_stagnation", "fluid_deficiency"],
        symptom_focus: symptomFocus,
        manifestation: { reaction_direction: reactionDirection },
        axes: {
          yin_yang_score: reactionDirection === "accel" ? 0.8 : brake ? -0.8 : 0,
          drive_score: brake ? -0.7 : 0.25,
          obstruction_score: 0.45,
        },
        split_scores: {
          qi: { deficiency: brake ? 3 : 0.4, stagnation: reactionDirection === "accel" ? 3 : 0.4 },
          blood: { deficiency: 0.4, stasis: 0.7 },
          fluid: { deficiency: reactionDirection === "accel" ? 2 : 0.2, damp: brake ? 4 : 0.2 },
        },
      },
    },
    mode,
    targetDate: date,
    symptomFocus,
  });
}

test("出やすいサインの個人反応を、同じ7方針と暮らすケアへ接続する", () => {
  const signs = bodySigns.buildGroundedBodySignDetails({
    weatherKey: "heat",
    symptomFocus: "neck_shoulder",
    signal: 1,
    targetDate: "2026-08-04",
    constitutionContext: {
      summary: { reaction_direction: "accel" },
      constitution_context: {
        core_code: "accel_batt_standard",
        sub_labels: ["qi_stagnation"],
        manifestation: { reaction_direction: "accel" },
      },
    },
  });
  assert.match(signs.join(" "), /首肩.*力み|首肩.*張り/);

  const plan = build({
    trigger: "heat",
    symptomFocus: "neck_shoulder",
    reactionDirection: "accel",
    coreCode: "accel_batt_standard",
  });
  assert.equal(plan.care_theme.response_profile.reaction_direction, "accel");
  assert.equal(plan.care_theme.response_profile.primary_response_key, plan.care_theme.policies[0].key);
  assert.equal(plan.care_theme.policies.some((policy) => policy.key === "yurumeru"), true);
  assert.equal(plan.lifestyle_plan.primary_action.care_kind, "body");
  assert.equal(plan.lifestyle_plan.alternatives.some((item) => item.care_kind === "environment"), true);
});

test("湿気×ブレーキ×胃腸×低余力は、ながす・ささえるから環境調整を主役にする", () => {
  const plan = build({
    trigger: "damp",
    symptomFocus: "digestion",
    reactionDirection: "brake",
    coreCode: "brake_batt_small",
  });
  assert.deepEqual(plan.care_theme.policies.map((policy) => policy.key), ["nagasu", "sasaeru"]);
  assert.equal(plan.care_theme.response_profile.reserve_level, "small");
  assert.equal(plan.lifestyle_plan.primary_action.care_kind, "environment");
  assert.equal(plan.lifestyle_plan.primary_action.id, "tool-work-height");
  assert.match(plan.lifestyle_plan.primary_action.label, /お腹|みぞおち/);
  assert.equal(plan.lifestyle_plan.alternatives.some((item) => item.care_kind === "body"), true);
});

test("明示的balancedをコア体質のアクセル軸で上書きしない", () => {
  const plan = build({
    trigger: "dry",
    symptomFocus: "fatigue",
    reactionDirection: "balanced",
    coreCode: "accel_batt_standard",
  });
  assert.equal(plan.care_theme.reaction_direction, "balanced");
  assert.equal(plan.care_theme.response_profile.reaction_direction, "balanced");
  const constitutionReasons = [
    plan.lifestyle_plan.primary_action,
    ...plan.lifestyle_plan.alternatives,
  ].flatMap((item) => item.selected_because).filter((item) => item.axis === "constitution");
  assert.equal(constitutionReasons.some((item) => item.key === "accel"), false);
});

test("今日と明日の主提案重複を、関連候補内の日付ローテーションで抑える", () => {
  const triggers = ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"];
  const symptoms = ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"];
  const profiles = [
    ["brake_batt_small", "brake"],
    ["accel_batt_standard", "accel"],
  ];
  let same = 0;
  let total = 0;
  for (const trigger of triggers) {
    for (const symptomFocus of symptoms) {
      for (const [coreCode, reactionDirection] of profiles) {
        const today = build({ trigger, symptomFocus, reactionDirection, coreCode }).lifestyle_plan;
        const tomorrow = build({
          trigger,
          symptomFocus,
          reactionDirection,
          coreCode,
          date: "2026-08-05",
          mode: "tomorrow",
        }).lifestyle_plan;
        total += 1;
        if (today.primary_action?.id === tomorrow.primary_action?.id) same += 1;
        assert.equal(
          tomorrow.alternatives.every((item) => item.selected_because.some((reason) => reason.axis === "symptom" && reason.key === symptomFocus)),
          true
        );
      }
    }
  }
  assert.ok(same / total <= 0.25, `${same}/${total}`);
});

test("一般向け身体操作文は、自然なスマホ操作と二手UIへ更新する", () => {
  const publicBlock = dailySource.match(/const PUBLIC_ACTION_COPY_BY_ID = \{(.*?)\n\};\n\nconst BODY_CARE_NEEDS/s)?.[1] || "";
  assert.match(publicBlock, /スマホは片手で持ち続けず、反対の手でも下から支える/);
  assert.match(publicBlock, /親指の先だけで操作せず、ひじを小さく動かして手全体の位置も変えてみる/);
  assert.doesNotMatch(publicBlock, /手のひらを端末へ|指先を追いかけ/);
  assert.doesNotMatch(radarPageSource, /ほかの一手・しっくりこない時|>しっくりこない時</);
  assert.match(radarPageSource, /lifestyleSecondaryAction/);
  assert.match(radarPageSource, /care_kind === "environment" \? "合っている目安"/);
  assert.match(radarPageSource, /lifestyleContextChips/);
});
