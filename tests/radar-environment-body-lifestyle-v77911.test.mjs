import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const careNaviPageSource = await readFile(new URL("../app/care-navi/page.js", import.meta.url), "utf8");
const rakutenRouteSource = await readFile(new URL("../app/api/care-navi/rakuten/route.js", import.meta.url), "utf8");

const ENVIRONMENT_IDS = [
  "env-heat-window-radiation",
  "env-heat-air-mixing",
  "env-heat-radiant-seat",
  "env-heat-bed-release",
  "env-heat-humidity-mode",
  "env-damp-window-choice",
  "env-damp-source-route",
  "env-damp-bed-air",
  "env-dry-airflow-line",
  "env-dry-local-humidity",
  "env-dry-bed-airflow",
  "env-summer-cold-airflow",
  "env-summer-cold-floor-air",
  "env-cold-window-radiation",
  "env-cold-floor-contact",
  "env-cold-draft-line",
  "env-cold-bed-warm",
  "env-room-temperature-bridge",
];

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
        sub_labels: coreCode.startsWith("brake") ? ["fluid_damp", "qi_deficiency"] : ["qi_stagnation"],
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

function collectIds(options, days = 31) {
  const ids = new Set();
  for (let day = 1; day <= days; day += 1) {
    const date = `${String(options?.date || "2026-08").slice(0, 7)}-${String(day).padStart(2, "0")}`;
    for (const item of shown(build({ ...options, date }).lifestyle_plan)) ids.add(item.id);
  }
  return ids;
}

test("暮らすは環境調整と身体の使い方だけを最大二件で返す", () => {
  for (const trigger of ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"]) {
    for (const symptomFocus of ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"]) {
      const plan = build({ trigger, symptomFocus }).lifestyle_plan;
      const items = shown(plan);
      assert.ok(items.length <= 2, `${trigger}/${symptomFocus}/${items.length}`);
      assert.equal(plan.trap, "");
      for (const action of items) {
        assert.ok(["body", "environment"].includes(action.care_kind));
        assert.ok(["身体の使い方", "環境を整える"].includes(action.kind_label));
        assert.ok(action.scene.length > 0);
        assert.ok(action.label.length > 0);
        assert.ok(action.reason.length > 0);
        assert.ok(action.felt_sense.length > 0);
        assert.equal("reset" in action, false);
        assert.doesNotMatch(`${action.scene} ${action.label} ${action.reason} ${action.felt_sense}`, /予定|段取り|休憩|止め時|先送り|タスク/);
      }
    }
  }
});

test("環境候補は暑さ・湿気・乾燥・冷え・温度差を生活場面へ落とした十八件", () => {
  const environmentBlock = dailySource.match(/const ENVIRONMENT_EXPERIMENT_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 身体OS/s)?.[1] || "";
  const ids = [...environmentBlock.matchAll(/id:\s*"(env-[a-z0-9-]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, ENVIRONMENT_IDS);
  assert.doesNotMatch(environmentBlock, /予定|段取り|休憩|止め時|先送り|タスク|食後/);
  assert.match(environmentBlock, /冷房中も窓側だけ熱く感じる時/);
  assert.match(environmentBlock, /浴室・調理・室内干しの湿気/);
  assert.match(environmentBlock, /寝ている間に、目・鼻・喉が乾きやすい時/);
  assert.match(environmentBlock, /暖房中も窓側だけ冷たく感じる時/);
});

test("環境候補は対応する天気だけに接続し、気圧だけの日へ作り足さない", () => {
  const dampIds = collectIds({ trigger: "damp", symptomFocus: "mood" });
  assert.equal([...dampIds].some((id) => id.startsWith("env-damp-")), true);
  assert.equal([...dampIds].some((id) => id.startsWith("env-cold-")), false);

  const heatIds = collectIds({ trigger: "heat", symptomFocus: "mood" });
  assert.equal([...heatIds].some((id) => id.startsWith("env-heat-")), true);
  assert.equal([...heatIds].some((id) => id.startsWith("env-cold-")), false);

  const pressurePlan = build({ trigger: "pressure_down", symptomFocus: "neck_shoulder" }).lifestyle_plan;
  assert.equal(shown(pressurePlan).some((item) => item.care_kind === "environment"), false);
  assert.equal(pressurePlan.shop_context, null);
});

test("暑さと湿気の複合案は両方がある日だけ候補になる", () => {
  assert.equal(collectIds({ trigger: "heat", symptomFocus: "mood" }).has("env-heat-humidity-mode"), false);
  assert.equal(collectIds({ trigger: "damp", symptomFocus: "mood" }).has("env-heat-humidity-mode"), false);
  assert.equal(collectIds({ trigger: "heat", secondary: "damp", symptomFocus: "mood" }).has("env-heat-humidity-mode"), true);
  assert.equal(collectIds({ trigger: "damp", secondary: "heat", symptomFocus: "mood" }).has("env-heat-humidity-mode"), true);
});

test("同じ条件の再読込は固定し、ほぼ同点の候補だけ日替わりにする", () => {
  const first = build({ date: "2026-08-03", symptomFocus: "low_back_pain" }).lifestyle_plan;
  const second = build({ date: "2026-08-03", symptomFocus: "low_back_pain" }).lifestyle_plan;
  assert.equal(first.primary_action?.id, second.primary_action?.id);
  assert.deepEqual(first.alternatives.map((item) => item.id), second.alternatives.map((item) => item.id));
  const ids = collectIds({ symptomFocus: "low_back_pain" }, 14);
  assert.ok(ids.size >= 3, [...ids].join(","));
});

test("めまいでは歩行・段差・床の物を取る候補を選ばない", () => {
  const unsafeIds = new Set(["tension-walk-center-first", "tension-stairs-center-up", "tension-floor-object-axis"]);
  for (const trigger of ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"]) {
    for (let day = 1; day <= 14; day += 1) {
      const plan = build({ date: `2026-08-${String(day).padStart(2, "0")}`, symptomFocus: "dizziness", trigger }).lifestyle_plan;
      for (const action of shown(plan)) assert.equal(unsafeIds.has(action.id), false, `${trigger}/${action.id}`);
    }
  }
});

test("身体操作は専門語を出さず、具体的な生活例とラクさの目安を残す", () => {
  const publicBlock = dailySource.match(/const PUBLIC_ACTION_COPY_BY_ID = \{(.*?)\n\};\n\nconst BODY_MECHANICS/s)?.[1] || "";
  assert.doesNotMatch(publicBlock, /橈骨|尺骨|正中|張力|起始側|陰きょう脈|ディープフロント/);
  assert.match(publicBlock, /バッグや買い物袋/);
  assert.match(publicBlock, /掃除機・モップ・フロアワイパー/);
  assert.match(publicBlock, /親指が届きにくい画面の端/);
  assert.match(publicBlock, /少し軽く感じれば合っています/);
  assert.doesNotMatch(publicBlock, /左右の肩の高さがそろ|耳が肩の真上|正しい姿勢/);
});

test("画面はグレーの失敗欄を廃止し、ショップは環境候補だけへ接続する", () => {
  assert.match(radarPageSource, /ほかの一手/);
  assert.doesNotMatch(radarPageSource, /ほかの一手・しっくりこない時/);
  assert.doesNotMatch(radarPageSource, /lifestylePlan\?\.trap/);
  assert.doesNotMatch(radarPageSource, /lifestylePrimaryAction\?\.reset/);
  assert.match(radarPageSource, /lifestyleShopContext \? <CareSetNaviBridge/);
  assert.match(radarPageSource, /lifestylePlan\?\.shop_context/);

  for (const id of ENVIRONMENT_IDS) assert.match(rakutenRouteSource, new RegExp(`"${id}":\\s*careQueryRow`));
  assert.doesNotMatch(rakutenRouteSource, /"tension-[a-z0-9-]+":\s*careQueryRow/);
  assert.match(rakutenRouteSource, /temperature_transition:\s*\{ label: "部屋間の温度差を整える" \}/);
  assert.match(careNaviPageSource, /temperature_transition:\s*"部屋間の温度差を整える"/);
});

test("暮らすの変換は予報スコアを変更しない", () => {
  const forecast = {
    target_date: "2026-08-03",
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
