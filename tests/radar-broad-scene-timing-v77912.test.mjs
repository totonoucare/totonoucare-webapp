import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");

const BROAD_SCENES = new Set(["軽いコップなどを持つ時", "荷物を両手で持つ時", "スマホを操作する時", "立っている時", "座り直す時", "椅子から立つ時", "あお向けから寝返る時"]);

function build({
  date = "2026-08-02",
  mode = "today",
  trigger = "damp",
  secondary = null,
  symptomFocus = "neck_shoulder",
  coreCode = "brake_batt_small",
  baseCarePlan = {},
  avoidLifestyleIds = [],
} = {}) {
  return daily.enhanceDailyCarePlan({
    baseCarePlan,
    avoidLifestyleIds,
    forecast: {
      target_date: date,
      signal: 1,
      score_display_0_10: 5.2,
      personal_main_trigger_exact: trigger,
      personal_secondary_trigger_exact: secondary,
    },
    riskContext: {
      summary: { main_trigger_exact: trigger, secondary_trigger_exact: secondary },
      target: { signal: 1 },
      constitution_context: {
        core_code: coreCode,
        sub_labels: ["fluid_damp", "qi_deficiency"],
        symptom_focus: symptomFocus,
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

test("身体操作は動きを想像できる具体的な場面を示す", () => {
  const seen = new Set();
  for (const trigger of ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"]) {
    for (const symptomFocus of ["fatigue", "sleep", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness"]) {
      for (let day = 1; day <= 14; day += 1) {
        const plan = build({
          date: `2026-08-${String(day).padStart(2, "0")}`,
          trigger,
          symptomFocus,
        }).lifestyle_plan;
        for (const item of shown(plan).filter((action) => action.care_kind === "body")) {
          seen.add(item.scene);
          assert.equal(BROAD_SCENES.has(item.scene), true, `${item.id}: ${item.scene}`);
          assert.doesNotMatch(item.scene, /まな板|器|モップ|掃除機|洗濯|買い物袋|扉|引き出し|キーボード|マウス/);
        }
      }
    }
  }
  assert.ok(seen.size >= 4, [...seen].join(" / "));
});

test("再現しやすいスマホ操作を残し、感覚の共有が必要な操作を外す", () => {
  assert.match(dailySource, /反対の手でもスマホを下から支える/);
  assert.doesNotMatch(dailySource, /後頭部を1cm|みぞおちの少し下を先へ運ぶ|明朝最初に使う物/);
});

test("明日タブは身体操作と環境調整を、今夜〜明朝の一手としてそろえる", () => {
  const today = build({ date: "2026-08-02", mode: "today" }).lifestyle_plan;
  const tomorrow = build({ date: "2026-08-03", mode: "tomorrow" }).lifestyle_plan;
  assert.equal(today.timing_label, "今日の一手");
  assert.equal(tomorrow.timing_label, "今夜〜明朝の一手");

  const tomorrowTool = Array.from({ length: 21 }, (_, index) => build({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    mode: "tomorrow",
    symptomFocus: "sleep",
    coreCode: "brake_batt_large",
  }).lifestyle_plan).find((plan) => plan.primary_action?.care_kind === "environment");
  assert.ok(tomorrowTool);
  assert.equal(tomorrowTool.timing_label, "今夜〜明朝の一手");
  assert.match(radarPageSource, /lifestylePlan\?\.timing_label/);
});

test("今日と明日は適合度を落とさず、近い候補だけを巡回する", () => {
  const today = build({ date: "2026-08-02", mode: "today" }).lifestyle_plan;
  const tomorrow = build({ date: "2026-08-03", mode: "tomorrow", avoidLifestyleIds: today.step_ids }).lifestyle_plan;
  for (const action of shown(tomorrow)) if (today.step_ids.includes(action.id)) assert.match(action.continuity_note, /今日と共通/);
  assert.ok(["body", "environment"].includes(today.primary_action?.care_kind));
  assert.ok(["body", "environment"].includes(tomorrow.primary_action?.care_kind));
  assert.ok(today.selection_basis.primary_candidate_score >= 18);
  assert.ok(tomorrow.selection_basis.primary_candidate_score >= 18);
  assert.ok(today.primary_action.selected_because.length >= 1);
  assert.ok(tomorrow.primary_action.selected_because.length >= 1);
});

test("旧保存データの予定・段取り・trapを現行の暮らすケアへ持ち越さない", () => {
  const legacy = build({
    baseCarePlan: {
      version: "daily_care_v2_8_legacy",
      lifestyle_plan: {
        title: "予定を軽くする",
        trap: "外せない予定がある日は、直前の用事を後ろへ送る",
        alternatives: [{ id: "env-stop-line", label: "ここまでで終わりを決める" }],
        steps: ["休憩を先に確保する"],
      },
    },
  });
  const text = JSON.stringify(legacy.lifestyle_plan);
  assert.doesNotMatch(text, /予定|段取り|休憩|止め時|先送り|ここまでで終わり|env-stop-line/);
  assert.equal(legacy.lifestyle_plan.trap, "");
  assert.equal(legacy.version, daily.DAILY_CARE_LOGIC_VERSION);
});
