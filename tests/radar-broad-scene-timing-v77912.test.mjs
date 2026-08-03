import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");

const BROAD_SCENES = new Set([
  "物を持つ・運ぶ時は",
  "物を押す・引く・回す時は",
  "手を伸ばして物を取る時は",
  "かがむ・高さを変える時は",
  "立つ・座る・起き上がる時は",
  "歩く・段差を移動する時は",
  "手作業や画面操作が続く時は",
  "同じ姿勢で待つ・作業する時は",
  "横になる・寝返る時は",
]);

const BED_IDS = new Set(["tension-bed-long-roll", "tension-bed-return-roll", "tension-bed-rise-side"]);

function build({
  date = "2026-08-03",
  mode = "today",
  trigger = "damp",
  secondary = null,
  symptomFocus = "neck_shoulder",
  coreCode = "brake_batt_small",
  baseCarePlan = {},
} = {}) {
  return daily.enhanceDailyCarePlan({
    baseCarePlan,
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

test("身体操作の場面見出しは九つの基本動作へそろえる", () => {
  const seen = new Set();
  for (const mode of ["today", "tomorrow"]) {
    for (const trigger of ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"]) {
      for (const symptomFocus of ["fatigue", "sleep", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness"]) {
        for (let day = 1; day <= 14; day += 1) {
          const plan = build({ date: `2026-08-${String(day).padStart(2, "0")}`, mode, trigger, symptomFocus }).lifestyle_plan;
          for (const item of shown(plan).filter((action) => action.care_kind === "body")) {
            seen.add(item.scene);
            assert.equal(BROAD_SCENES.has(item.scene), true, `${item.id}: ${item.scene}`);
            assert.doesNotMatch(item.scene, /まな板|器|モップ|掃除機|洗濯|買い物袋|スマホ|扉|引き出し/);
          }
        }
      }
    }
  }
  assert.ok(seen.size >= 8, [...seen].join(" / "));
});

test("今日に寝床の操作を出さず、今夜〜明朝は寝床と起床だけに絞る", () => {
  for (let day = 1; day <= 28; day += 1) {
    const date = `2026-08-${String(day).padStart(2, "0")}`;
    const today = build({ date, mode: "today", symptomFocus: "sleep" }).lifestyle_plan;
    assert.equal(today.timing_label, "今日の一手");
    for (const item of shown(today).filter((action) => action.care_kind === "body")) assert.equal(BED_IDS.has(item.id), false);

    const tomorrow = build({ date, mode: "tomorrow", symptomFocus: "sleep" }).lifestyle_plan;
    assert.equal(tomorrow.timing_label, "今夜〜明朝の一手");
    for (const item of shown(tomorrow).filter((action) => action.care_kind === "body")) assert.equal(BED_IDS.has(item.id), true, item.id);
  }
  assert.match(radarPageSource, /selectedIsToday \? "今日の一手" : "今夜〜明朝の一手"/);
  assert.match(dailySource, /mode === "tomorrow" \? "今夜〜明朝のほぐしの一手"/);
});

test("寝床の環境ケアは今夜〜明朝だけに出す", () => {
  const bedtimeEnvironmentIds = new Set(["env-heat-bed-release", "env-damp-bed-air", "env-dry-bed-airflow", "env-cold-bed-warm"]);
  for (const [trigger, secondary] of [["heat", null], ["damp", null], ["dry", null], ["cold", null]]) {
    for (let day = 1; day <= 28; day += 1) {
      const date = trigger === "cold" ? `2026-01-${String(day).padStart(2, "0")}` : `2026-08-${String(day).padStart(2, "0")}`;
      const today = build({ date, mode: "today", trigger, secondary, symptomFocus: "sleep" }).lifestyle_plan;
      for (const item of shown(today)) assert.equal(bedtimeEnvironmentIds.has(item.id), false, `${trigger}/${item.id}`);
    }
  }
});

test("夏冬の空調文を暦で分ける", () => {
  const warmSeen = new Set();
  const coldSeen = new Set();
  for (let day = 1; day <= 28; day += 1) {
    for (const item of shown(build({ date: `2026-08-${String(day).padStart(2, "0")}`, trigger: "heat", symptomFocus: "fatigue" }).lifestyle_plan)) warmSeen.add(item.id);
    for (const item of shown(build({ date: `2026-01-${String(day).padStart(2, "0")}`, trigger: "cold", symptomFocus: "fatigue" }).lifestyle_plan)) coldSeen.add(item.id);
  }
  assert.equal([...warmSeen].some((id) => id.startsWith("env-heat-") || id.startsWith("env-summer-")), true);
  assert.equal([...warmSeen].some((id) => id.startsWith("env-cold-")), false);
  assert.equal([...coldSeen].some((id) => id.startsWith("env-cold-")), true);
  assert.equal([...coldSeen].some((id) => id.startsWith("env-heat-") || id.startsWith("env-summer-")), false);

  const januaryWarmTrigger = build({ date: "2026-01-15", trigger: "heat", symptomFocus: "fatigue" }).lifestyle_plan;
  assert.equal(shown(januaryWarmTrigger).some((item) => item.id.startsWith("env-heat-") || item.id.startsWith("env-summer-")), false);
  const augustColdTrigger = build({ date: "2026-08-15", trigger: "cold", symptomFocus: "fatigue" }).lifestyle_plan;
  assert.equal(shown(augustColdTrigger).some((item) => item.id.startsWith("env-cold-")), false);
});

test("旧保存データの予定・段取り・失敗欄を持ち越さない", () => {
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

test("明日タブの暮らす・食べる・ほぐすは今夜〜明朝へ統一する", () => {
  assert.match(radarPageSource, /今夜〜明朝の環境に合う道具を見る/);
  assert.match(radarPageSource, /今夜〜明朝の食べ方候補を見る/);
  assert.match(radarPageSource, /今夜〜明朝のほぐし候補を見る/);
  assert.doesNotMatch(radarPageSource, /明日の暮らし候補を見る|明日の食べる候補を見る|明日のほぐす候補を見る/);
});
