import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const careNaviPageSource = await readFile(new URL("../app/care-navi/page.js", import.meta.url), "utf8");
const rakutenRouteSource = await readFile(new URL("../app/api/care-navi/rakuten/route.js", import.meta.url), "utf8");
const actionSource = await readFile(new URL("../lib/radar_v1/careActionItems.js", import.meta.url), "utf8");
const actions = await import(`data:text/javascript;base64,${Buffer.from(actionSource).toString("base64")}`);

function build({
  date = "2026-08-01",
  symptomFocus = "neck_shoulder",
  trigger = "damp",
  secondary = null,
  coreCode = "brake_batt_small",
  mode = "today",
  signal = 1,
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
  return [plan.primary_action, ...plan.alternatives].filter(Boolean);
}

function environmentIds(options) {
  return shown(build(options).lifestyle_plan)
    .filter((item) => item.care_kind === "environment")
    .map((item) => item.id);
}

test("暮らすは環境調整と身体の使い方だけを、最大二件で返す", () => {
  for (const trigger of ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"]) {
    for (const symptomFocus of ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"]) {
      const plan = build({ trigger, symptomFocus }).lifestyle_plan;
      const items = shown(plan);
      assert.ok(items.length <= 2, `${trigger}/${symptomFocus}/${items.length}`);
      for (const action of items) {
        assert.ok(["body", "environment"].includes(action.care_kind));
        assert.ok(["身体の使い方", "環境を整える"].includes(action.kind_label));
        assert.ok(action.scene.length > 0);
        assert.ok(action.label.length > 0);
        assert.ok(action.reason.length > 0);
        assert.ok(action.felt_sense.length > 0);
        assert.ok(action.reset.length > 0);
        assert.doesNotMatch(
          `${action.scene} ${action.label} ${action.reason} ${action.felt_sense} ${action.reset}`,
          /ではなく|ためです|できています|あなたは|必ず|治る|改善する/
        );
      }
    }
  }
});

test("環境候補は天気へ直接触れる六件だけで、段取りや基礎ケアを混ぜない", () => {
  const environmentBlock = dailySource.match(/const ENVIRONMENT_EXPERIMENT_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 身体OS/s)?.[1] || "";
  const ids = [...environmentBlock.matchAll(/id:\s*"(env-[a-z0-9-]+)"/g)].map((match) => match[1]).sort();
  assert.deepEqual(ids, [
    "env-cold-airflow-line",
    "env-cold-floor-contact",
    "env-damp-window-choice",
    "env-dry-airflow-line",
    "env-heat-humidity-mode",
    "env-heat-window-radiation",
  ]);
  assert.doesNotMatch(environmentBlock, /予定|休憩|止め時|先送り|タスク|食後|着替え|汗を拭|水分を数口/);
  assert.doesNotMatch(dailySource, /const FOUNDATION_LIFESTYLE_CANDIDATES/);
});

test("環境候補は対応する天気の日だけ表示する", () => {
  assert.deepEqual(environmentIds({ trigger: "damp", symptomFocus: "mood" }), ["env-damp-window-choice"]);
  assert.deepEqual(environmentIds({ trigger: "heat", symptomFocus: "mood" }), ["env-heat-window-radiation"]);
  assert.deepEqual(environmentIds({ trigger: "dry", symptomFocus: "mood" }), ["env-dry-airflow-line"]);
  assert.deepEqual(new Set(environmentIds({ trigger: "cold", symptomFocus: "mood" })), new Set([
    "env-cold-airflow-line",
    "env-cold-floor-contact",
  ]));
  assert.deepEqual(environmentIds({ trigger: "pressure_down", symptomFocus: "mood" }), []);
  assert.deepEqual(environmentIds({ trigger: "pressure_up", symptomFocus: "mood" }), []);
  assert.deepEqual(environmentIds({ trigger: "temp_shift", symptomFocus: "mood" }), []);
});

test("暑さと湿気の複合案は両方がある日だけ候補になる", () => {
  assert.equal(environmentIds({ trigger: "heat", symptomFocus: "mood" }).includes("env-heat-humidity-mode"), false);
  assert.equal(environmentIds({ trigger: "damp", symptomFocus: "mood" }).includes("env-heat-humidity-mode"), false);
  assert.equal(environmentIds({ trigger: "heat", secondary: "damp", symptomFocus: "mood" }).includes("env-heat-humidity-mode"), true);
  assert.equal(environmentIds({ trigger: "damp", secondary: "heat", symptomFocus: "mood" }).includes("env-heat-humidity-mode"), true);
});

test("気圧の日に環境案を作り足さず、合う身体操作もなければ提案を休む", () => {
  const bodyPlan = build({ trigger: "pressure_down", symptomFocus: "neck_shoulder" }).lifestyle_plan;
  assert.equal(bodyPlan.primary_action?.care_kind, "body");
  assert.equal(shown(bodyPlan).some((item) => item.care_kind === "environment"), false);

  const emptyPlan = build({ trigger: "pressure_down", symptomFocus: "mood" }).lifestyle_plan;
  assert.equal(emptyPlan.primary_action, null);
  assert.deepEqual(emptyPlan.steps, []);
  assert.equal(emptyPlan.no_suggestion, true);
  assert.match(emptyPlan.no_suggestion_text, /足す一手はありません/);
  const displayed = actions.buildDisplayedCareItems({ lifestylePlan: emptyPlan, sourceMode: "today" });
  assert.deepEqual(displayed, []);
});

test("主役は適合度優先、ほぼ同点の時だけ日付で入れ替える", () => {
  const strongBody = build({ trigger: "damp", symptomFocus: "neck_shoulder" }).lifestyle_plan;
  assert.equal(strongBody.primary_action?.care_kind, "body");
  assert.ok(strongBody.selection_basis.body_score > strongBody.selection_basis.environment_score);

  const nearTieKinds = new Set(Array.from({ length: 14 }, (_, index) => build({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    trigger: "damp",
    symptomFocus: "sleep",
    coreCode: "brake_batt_large",
  }).lifestyle_plan.primary_action?.care_kind));
  assert.deepEqual(nearTieKinds, new Set(["body", "environment"]));
});

test("同じ条件の再読込は固定し、近い候補だけ日替わりにする", () => {
  const first = build({ date: "2026-08-03", symptomFocus: "low_back_pain" }).lifestyle_plan;
  const second = build({ date: "2026-08-03", symptomFocus: "low_back_pain" }).lifestyle_plan;
  assert.equal(first.primary_action?.id, second.primary_action?.id);
  assert.deepEqual(first.alternatives.map((item) => item.id), second.alternatives.map((item) => item.id));

  const ids = new Set(Array.from({ length: 14 }, (_, index) => build({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    symptomFocus: "low_back_pain",
  }).lifestyle_plan.primary_action?.id));
  assert.ok(ids.size >= 2, [...ids].join(","));
});

test("めまいでは不安定な身体操作を選ばない", () => {
  const unsafeIds = new Set(["tension-walk-center-first", "tension-stairs-center-up", "tension-floor-object-axis"]);
  for (const trigger of ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"]) {
    for (let day = 1; day <= 14; day += 1) {
      const plan = build({
        date: `2026-08-${String(day).padStart(2, "0")}`,
        symptomFocus: "dizziness",
        trigger,
      }).lifestyle_plan;
      for (const action of shown(plan)) {
        assert.equal(unsafeIds.has(action.id), false, `${trigger}/${action.id}`);
      }
    }
  }
});

test("身体操作の成功判定は姿勢採点より、ラクさの変化を主役にする", () => {
  const publicBlock = dailySource.match(/const PUBLIC_ACTION_COPY_BY_ID = \{(.*?)\n\};\n\nconst BODY_MECHANICS/s)?.[1] || "";
  const actionCount = [...publicBlock.matchAll(/"tension-[a-z0-9-]+":\s*\{/g)].length;
  assert.ok(actionCount >= 20);
  assert.equal([...publicBlock.matchAll(/\n\s+felt_sense:/g)].length, actionCount);
  assert.doesNotMatch(publicBlock, /左右の肩の高さがそろ|耳が肩のほぼ真上|鼻と胸の正面がほぼ同じ|できています/);
  assert.match(publicBlock, /少し軽く感じたら|ラクならOK|重さが残りにくければOK|ねじる感じが減ったらOK/);
});

test("予報カードは一手の有無と、環境・身体で異なる目安ラベルを扱う", () => {
  const liveStart = radarPageSource.indexOf('{careTab === "live"');
  const liveEnd = radarPageSource.indexOf("<PurchasedCareItemsPanel", liveStart);
  const liveBlock = radarPageSource.slice(liveStart, liveEnd);
  assert.match(radarPageSource, /lifestylePrimaryAction \? \(/);
  assert.match(radarPageSource, /lifestylePlan\.no_suggestion_text/);
  assert.match(radarPageSource, /care_kind === "environment" \? "合っている目安" : "ラクになった目安"/);
  assert.match(radarPageSource, /ほかの一手・しっくりこない時/);
  assert.match(radarPageSource, /lifestylePrimaryAction \? <CareSetNaviBridge/);
  assert.doesNotMatch(radarPageSource, /\{lifestylePrimaryAction\?\.shop_query\}/);
  assert.doesNotMatch(liveBlock, /まずはこれ/);
});

test("現行の環境action idだけを許可済みショップ検索へ接続する", () => {
  for (const id of [
    "env-damp-window-choice",
    "env-heat-window-radiation",
    "env-heat-humidity-mode",
    "env-dry-airflow-line",
    "env-cold-airflow-line",
    "env-cold-floor-contact",
  ]) {
    assert.match(rakutenRouteSource, new RegExp(`"${id}":\\s*careQueryRow`));
  }
  assert.doesNotMatch(rakutenRouteSource, /"env-stop-line":\s*careQueryRow/);
  assert.doesNotMatch(rakutenRouteSource, /"env-breathing-room":\s*careQueryRow/);
  assert.doesNotMatch(rakutenRouteSource, /"foundation-[a-z0-9-]+":\s*careQueryRow/);
  assert.match(rakutenRouteSource, /LIFESTYLE_ACTION_LIVE_QUERY_RULES/);
  assert.match(rakutenRouteSource, /heat_shielding:\s*\{ label: "窓からの熱を減らす" \}/);
  assert.match(rakutenRouteSource, /heat_moisture_control:\s*\{ label: "暑さと湿気を整える" \}/);
  assert.match(careNaviPageSource, /heat_shielding:\s*"窓からの熱を減らす"/);
  assert.match(careNaviPageSource, /heat_moisture_control:\s*"暑さと湿気を整える"/);
  assert.doesNotMatch(dailySource, /shop_query|item_hint|楽天|商品名/);
});

test("暮らすの変換は予報スコアを変更しない", () => {
  const forecast = {
    target_date: "2026-08-01",
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
