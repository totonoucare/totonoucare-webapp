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
  secondary = "heat",
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

const TRIGGERS = ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"];
const SYMPTOMS = ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"];
const BODY_SUPPORTED = new Set(["fatigue", "sleep", "neck_shoulder", "low_back_pain", "swelling", "headache"]);

test("暮らすの表示文は短く、生活者へ話す言葉で返す", () => {
  for (const trigger of TRIGGERS) {
    for (const symptomFocus of SYMPTOMS) {
      const plan = build({ trigger, symptomFocus }).lifestyle_plan;
      const shown = [plan.primary_action, ...plan.alternatives].filter(Boolean);
      assert.ok(shown.length >= 1 && shown.length <= 2, `${trigger}/${symptomFocus}/${shown.length}`);
      for (const action of shown) {
        assert.ok(["body", "environment"].includes(action.care_kind));
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

test("直接つながる不調では身体の一手を優先し、無理な身体操作は差し込まない", () => {
  for (const trigger of TRIGGERS) {
    for (const symptomFocus of SYMPTOMS) {
      const plan = build({ trigger, symptomFocus }).lifestyle_plan;
      const bodyActions = [plan.primary_action, ...plan.alternatives]
        .filter((item) => item?.care_kind === "body");
      assert.equal(bodyActions.length > 0, BODY_SUPPORTED.has(symptomFocus), `${trigger}/${symptomFocus}`);
      if (!BODY_SUPPORTED.has(symptomFocus)) {
        assert.equal(plan.primary_action.care_kind, "environment", `${trigger}/${symptomFocus}`);
      }
    }
  }
});

test("環境案は生活状況を作り話にせず、止め時と予定の余白だけに絞る", () => {
  const environmentBlock = dailySource.match(/const ENVIRONMENT_EXPERIMENT_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 身体OS/s)?.[1] || "";
  const ids = [...environmentBlock.matchAll(/id:\s*"(env-[a-z0-9-]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids.sort(), ["env-breathing-room", "env-stop-line"]);
  assert.doesNotMatch(environmentBlock, /部屋干し|濡れた物が近く|汗を拭|着替え|食後に運動|食器を戻す|数口|窓を全部/);
  assert.doesNotMatch(dailySource, /const FOUNDATION_LIFESTYLE_CANDIDATES/);
});

test("空欄を埋めるために三件目や基礎ケアを足さない", () => {
  for (const trigger of TRIGGERS) {
    for (const symptomFocus of SYMPTOMS) {
      const plan = build({ trigger, symptomFocus, signal: 2 }).lifestyle_plan;
      assert.ok(plan.steps.length <= 2, `${trigger}/${symptomFocus}`);
      assert.equal(plan.alternatives.length <= 1, true);
      assert.equal(plan.selection_basis.foundation_included, false);
      assert.equal(plan.steps.some((step) => /汗を拭|着替え|水分を数口|薄い一枚/.test(step)), false);
    }
  }
});

test("天気との接点も不調との接点もない時は、提案を無理に作らない", () => {
  const theme = daily.buildDailyCareTheme({
    triggerKey: "default",
    secondaryKey: null,
    signal: 0,
    symptomFocus: "mood",
    riskContext: { constitution_context: { core_code: "accel_batt_large", symptom_focus: "mood" } },
  });
  const plan = daily.enhanceLifestylePlan({ basePlan: {}, theme, targetDate: "2026-08-01", symptomFocus: "mood" });
  assert.equal(plan.primary_action, null);
  assert.deepEqual(plan.steps, []);
  assert.equal(plan.no_suggestion, true);
  assert.match(plan.no_suggestion_text, /提案はお休み/);
  const displayed = actions.buildDisplayedCareItems({ lifestylePlan: plan, sourceMode: "today" });
  assert.deepEqual(displayed, []);
});

test("同じ条件の再読込では同じ一手を返し、近い候補だけを日替わりにする", () => {
  const first = build({ date: "2026-08-03", symptomFocus: "low_back_pain" }).lifestyle_plan;
  const second = build({ date: "2026-08-03", symptomFocus: "low_back_pain" }).lifestyle_plan;
  assert.equal(first.primary_action.id, second.primary_action.id);
  assert.deepEqual(first.alternatives.map((item) => item.id), second.alternatives.map((item) => item.id));

  const ids = new Set(Array.from({ length: 14 }, (_, index) => build({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    symptomFocus: "low_back_pain",
  }).lifestyle_plan.primary_action.id));
  assert.ok(ids.size >= 2, [...ids].join(","));
});

test("めまいでは不安定な身体操作を選ばない", () => {
  const unsafeIds = new Set(["tension-walk-center-first", "tension-stairs-center-up", "tension-floor-object-axis"]);
  for (const trigger of TRIGGERS) {
    for (let day = 1; day <= 14; day += 1) {
      const plan = build({
        date: `2026-08-${String(day).padStart(2, "0")}`,
        symptomFocus: "dizziness",
        trigger,
        secondary: "temp_shift",
      }).lifestyle_plan;
      for (const action of [plan.primary_action, ...plan.alternatives].filter(Boolean)) {
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

test("予報カードは一手の有無を扱い、商品名を直書きしない", () => {
  const liveStart = radarPageSource.indexOf('{careTab === "live"');
  const liveEnd = radarPageSource.indexOf("<PurchasedCareItemsPanel", liveStart);
  const liveBlock = radarPageSource.slice(liveStart, liveEnd);
  assert.match(radarPageSource, /lifestylePrimaryAction \? \(/);
  assert.match(radarPageSource, /lifestylePlan\.no_suggestion_text/);
  assert.match(radarPageSource, /ラクになった目安/);
  assert.match(radarPageSource, /ほかの一手・しっくりこない時/);
  assert.match(radarPageSource, /lifestylePrimaryAction \? <CareSetNaviBridge/);
  assert.doesNotMatch(radarPageSource, /\{lifestylePrimaryAction\?\.shop_query\}/);
  assert.doesNotMatch(liveBlock, /まずはこれ/);
});

test("新しい段取りの一手を許可済みショップ検索へ接続する", () => {
  assert.match(rakutenRouteSource, /"env-stop-line":\s*careQueryRow/);
  assert.match(rakutenRouteSource, /"env-breathing-room":\s*careQueryRow/);
  assert.match(rakutenRouteSource, /LIFESTYLE_ACTION_LIVE_QUERY_RULES/);
  assert.match(careNaviPageSource, /task_support/);
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
