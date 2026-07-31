import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const careNaviPageSource = await readFile(new URL("../app/care-navi/page.js", import.meta.url), "utf8");
const rakutenRouteSource = await readFile(new URL("../app/api/care-navi/rakuten/route.js", import.meta.url), "utf8");

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
      summary: {
        main_trigger_exact: trigger,
        secondary_trigger_exact: secondary,
      },
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

test("暮らすの主提案は身体操作または環境実験から返し、体感確認まで持つ", () => {
  for (let day = 1; day <= 14; day += 1) {
    const action = build({ date: `2026-08-${String(day).padStart(2, "0")}` }).lifestyle_plan.primary_action;
    assert.ok(["body", "environment"].includes(action.care_kind), action.care_kind);
    assert.ok(["身体の使い方", "環境を変える"].includes(action.kind_label), action.kind_label);
    assert.ok(action.scene.length > 0);
    assert.ok(action.scene_label.length > 0);
    assert.ok(action.label.length > 0);
    assert.match(action.reason, /ためです。$/);
    assert.ok(action.felt_sense.length > 0);
    assert.ok(action.reset.length > 0);
    assert.ok(action.item_role);
    assert.equal(action.shop_query, undefined);
    assert.equal(action.item_hint, undefined);
    assert.doesNotMatch(`${action.scene} ${action.label} ${action.reason}`, /あなたは|いつも|必ず|治る|改善する/);
  }
});

test("レーン間は適合度を優先し、0.75点以内の時だけ日替わりにする", () => {
  let strictFitCases = 0;
  let nearTieCases = 0;
  for (const mode of ["today", "tomorrow"]) {
    for (const trigger of TRIGGERS) {
      for (const symptomFocus of SYMPTOMS) {
        const plans = Array.from({ length: 8 }, (_, index) =>
          build({
            date: `2026-08-${String(index + 1).padStart(2, "0")}`,
            trigger,
            secondary: trigger === "heat" ? "damp" : "heat",
            symptomFocus,
            mode,
          }).lifestyle_plan
        );
        const basis = plans[0].selection_basis;
        const kinds = new Set(plans.map((plan) => plan.primary_action.care_kind));
        if (basis.lane_score_gap <= basis.near_tie_delta) {
          nearTieCases += 1;
          assert.equal(basis.lane_rotation_applied, true, `${mode}/${trigger}/${symptomFocus}: rotation`);
          assert.deepEqual([...kinds].sort(), ["body", "environment"], `${mode}/${trigger}/${symptomFocus}`);
        } else {
          strictFitCases += 1;
          const expectedKind = basis.body_score > basis.environment_score ? "body" : "environment";
          assert.equal(basis.lane_rotation_applied, false, `${mode}/${trigger}/${symptomFocus}: no rotation`);
          assert.deepEqual([...kinds], [expectedKind], `${mode}/${trigger}/${symptomFocus}`);
        }
      }
    }
  }
  assert.ok(strictFitCases > 0);
  assert.ok(nearTieCases > 0);
});

test("各レーンの主候補も最高点から0.75点以内だけを日替わり対象にする", () => {
  for (const trigger of TRIGGERS) {
    for (const symptomFocus of SYMPTOMS) {
      for (let day = 1; day <= 8; day += 1) {
        const plan = build({
          date: `2026-08-${String(day).padStart(2, "0")}`,
          trigger,
          secondary: trigger === "heat" ? "damp" : "heat",
          symptomFocus,
        }).lifestyle_plan;
        const basis = plan.selection_basis;
        const laneScore = plan.primary_action.care_kind === "body"
          ? basis.body_score
          : basis.environment_score;
        assert.ok(
          laneScore - basis.primary_candidate_score <= basis.near_tie_delta + 1e-9,
          `${trigger}/${symptomFocus}/${plan.primary_action.id}: ${laneScore} - ${basis.primary_candidate_score}`
        );
      }
    }
  }
});

test("直接つながる身体操作がある時だけ別レーン案を含め、ない不調へ無理に差し込まない", () => {
  const bodySupportedSymptoms = new Set([
    "fatigue",
    "sleep",
    "neck_shoulder",
    "low_back_pain",
    "swelling",
    "headache",
  ]);
  for (const trigger of TRIGGERS) {
    for (const symptomFocus of SYMPTOMS) {
      const plan = build({ trigger, symptomFocus }).lifestyle_plan;
      const actions = [plan.primary_action, ...plan.alternatives];
      const kinds = new Set(actions.map((item) => item.care_kind));
      assert.equal(kinds.has("environment"), true, `${trigger}/${symptomFocus}: environment`);
      assert.equal(kinds.has("body"), bodySupportedSymptoms.has(symptomFocus), `${trigger}/${symptomFocus}: body`);
      if (!bodySupportedSymptoms.has(symptomFocus)) {
        assert.equal(plan.primary_action.care_kind, "environment");
        assert.equal(plan.selection_basis.body_score, -100);
      }
      assert.equal(new Set(actions.map((item) => item.scene_family)).size, actions.length);
    }
  }
});

test("水分・着替え・休憩などの基礎ケアは主役にせず、必要な日の補助だけにする", () => {
  const supported = build({ coreCode: "brake_batt_small", signal: 1 }).lifestyle_plan;
  assert.notEqual(supported.primary_action.care_kind, "foundation");
  assert.equal(supported.alternatives.some((item) => item.care_kind === "foundation"), true);
  assert.equal(supported.selection_basis.foundation_included, true);

  const strong = build({ coreCode: "accel_batt_large", signal: 2 }).lifestyle_plan;
  assert.notEqual(strong.primary_action.care_kind, "foundation");
  assert.equal(strong.alternatives.some((item) => item.care_kind === "foundation"), true);

  const calm = build({ coreCode: "accel_batt_large", signal: 0 }).lifestyle_plan;
  assert.notEqual(calm.primary_action.care_kind, "foundation");
  assert.equal(calm.alternatives.some((item) => item.care_kind === "foundation"), false);
  assert.equal(calm.selection_basis.foundation_included, false);
});

test("環境実験は旧来の標語をそのまま復活させず、比較できる一手にする", () => {
  const environmentBlock = dailySource.match(/const ENVIRONMENT_EXPERIMENT_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 水分/s)?.[1] || "";
  const foundationBlock = dailySource.match(/const FOUNDATION_LIFESTYLE_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 身体OS/s)?.[1] || "";
  assert.ok([...environmentBlock.matchAll(/id:\s*"env-/g)].length >= 10);
  assert.ok([...foundationBlock.matchAll(/id:\s*"foundation-/g)].length >= 5);
  assert.equal([...environmentBlock.matchAll(/care_kind:\s*"environment"/g)].length, [...environmentBlock.matchAll(/id:\s*"env-/g)].length);
  assert.equal([...environmentBlock.matchAll(/felt_sense:/g)].length, [...environmentBlock.matchAll(/id:\s*"env-/g)].length);
  assert.equal([...environmentBlock.matchAll(/reset:/g)].length, [...environmentBlock.matchAll(/id:\s*"env-/g)].length);
  assert.doesNotMatch(environmentBlock, /5分だけ換気し|食後に2〜3分だけ歩き|水分を少しずつ取る|今日の予定・家事・移動のどれかを一段軽くする/);
  assert.doesNotMatch(dailySource, /const LIFESTYLE_CANDIDATES|const POLICY_LIFESTYLE_CANDIDATES|const SYMPTOM_LIFESTYLE_CANDIDATES/);
});

test("環境実験は主・副の天気ストレスに合う候補群から選ぶ", () => {
  const allowedForDampHeat = new Set([
    "env-damp-source-route",
    "env-damp-work-zone",
    "env-heat-task-zone",
    "env-heat-input-load",
    "env-pressure-task-offload",
    "env-digestion-transition",
  ]);
  for (const symptomFocus of SYMPTOMS) {
    for (let day = 1; day <= 14; day += 1) {
      const plan = build({
        date: `2026-08-${String(day).padStart(2, "0")}`,
        trigger: "damp",
        secondary: "heat",
        symptomFocus,
      }).lifestyle_plan;
      for (const action of [plan.primary_action, ...plan.alternatives].filter((item) => item.care_kind === "environment")) {
        assert.equal(allowedForDampHeat.has(action.id), true, `${symptomFocus}/${action.id}`);
      }
    }
  }
});

test("同じ条件の再読込では暮らすの一手が変わらない", () => {
  const first = build({ date: "2026-08-03", symptomFocus: "low_back_pain" }).lifestyle_plan;
  const second = build({ date: "2026-08-03", symptomFocus: "low_back_pain" }).lifestyle_plan;
  assert.equal(first.primary_action.id, second.primary_action.id);
  assert.deepEqual(first.alternatives.map((item) => item.id), second.alternatives.map((item) => item.id));
});

test("めまいでは不安定な身体操作と食後の立位実験を選ばない", () => {
  const unsafeIds = new Set([
    "tension-walk-center-first",
    "tension-stairs-center-up",
    "tension-floor-object-axis",
    "env-digestion-transition",
  ]);
  for (const trigger of TRIGGERS) {
    for (let day = 1; day <= 28; day += 1) {
      const plan = build({
        date: `2026-08-${String(day).padStart(2, "0")}`,
        symptomFocus: "dizziness",
        trigger,
        secondary: "temp_shift",
      }).lifestyle_plan;
      for (const action of [plan.primary_action, ...plan.alternatives]) {
        assert.equal(unsafeIds.has(action.id), false, `${trigger}/${action.id}`);
      }
    }
  }
});

test("予報カードはケア種別を表示し、商品名は出さずaction idだけをショップへ渡す", () => {
  assert.match(radarPageSource, /lifestylePrimaryAction\?\.kind_label/);
  assert.match(radarPageSource, /item\.kind_label/);
  assert.match(radarPageSource, /liveAction=/);
  assert.match(radarPageSource, /lifestylePrimaryAction\?\.felt_sense/);
  assert.match(radarPageSource, /表示中の暮らしの一手とケア方針/);
  assert.doesNotMatch(radarPageSource, /表示中の身体操作とケア方針/);
  assert.doesNotMatch(radarPageSource, /lifestylePrimaryAction\?\.item_hint/);
  assert.doesNotMatch(radarPageSource, /\{lifestylePrimaryAction\?\.shop_query\}/);
});

test("暮らす上段の重複説明を削除し、今日の一手から具体場面を先に表示する", () => {
  const liveStart = radarPageSource.indexOf('{careTab === "live"');
  const liveEnd = radarPageSource.indexOf("<PurchasedCareItemsPanel", liveStart);
  const liveBlock = radarPageSource.slice(liveStart, liveEnd);
  assert.ok(liveStart >= 0 && liveEnd > liveStart);
  assert.doesNotMatch(liveBlock, /まずはこれ/);
  assert.doesNotMatch(liveBlock, /lifestylePlan\.(?:title|lead)/);
  assert.ok(liveBlock.indexOf("今日の一手") < liveBlock.indexOf("lifestylePrimaryAction.scene"));
  assert.ok(liveBlock.indexOf("lifestylePrimaryAction.scene") < liveBlock.indexOf("lifestylePrimaryAction?.label"));
});

test("身体操作の全候補が一般分類ではなく具体的な使用場面を持つ", () => {
  const publicCopyBlock = dailySource.match(/const PUBLIC_ACTION_COPY_BY_ID = \{(.*?)\n\};\n\nconst BODY_MECHANICS/s)?.[1] || "";
  const actionCount = [...publicCopyBlock.matchAll(/"tension-[a-z0-9-]+":\s*\{/g)].length;
  const sceneFamilyCount = [...publicCopyBlock.matchAll(/\n\s+scene_family:/g)].length;
  const concreteSceneCount = [...publicCopyBlock.matchAll(/\n\s+scene:/g)].length;
  assert.ok(actionCount >= 20);
  assert.equal(sceneFamilyCount, actionCount);
  assert.equal(concreteSceneCount, actionCount);

  const genericScenes = new Set([
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
  for (const trigger of TRIGGERS) {
    for (const symptomFocus of SYMPTOMS) {
      const plan = build({ trigger, symptomFocus }).lifestyle_plan;
      for (const action of [plan.primary_action, ...plan.alternatives].filter((item) => item.care_kind === "body")) {
        assert.equal(genericScenes.has(action.scene), false, `${action.id}: ${action.scene}`);
      }
    }
  }
});

test("身体操作・環境実験・基礎ケアのaction idを許可済みショップ検索へ接続する", () => {
  const bodyBlock = dailySource.match(/const BODY_MECHANICS_INTERNAL_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 場面は/s)?.[1] || "";
  const environmentBlock = dailySource.match(/const ENVIRONMENT_EXPERIMENT_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 水分/s)?.[1] || "";
  const foundationBlock = dailySource.match(/const FOUNDATION_LIFESTYLE_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 身体OS/s)?.[1] || "";
  const careActionIds = new Set([
    ...[...bodyBlock.matchAll(/id:\s*"(tension-[a-z0-9-]+)"/g)].map((match) => match[1]),
    ...[...environmentBlock.matchAll(/id:\s*"(env-[a-z0-9-]+)"/g)].map((match) => match[1]),
    ...[...foundationBlock.matchAll(/id:\s*"(foundation-[a-z0-9-]+)"/g)].map((match) => match[1]),
  ]);
  const shopActionIds = new Set([
    ...[...rakutenRouteSource.matchAll(/"((?:tension|env|foundation)-[a-z0-9-]+)":\s*careQueryRow/g)].map((match) => match[1]),
  ]);
  assert.ok(careActionIds.size >= 35);
  assert.deepEqual([...shopActionIds].sort(), [...careActionIds].sort());
  assert.match(rakutenRouteSource, /LIFESTYLE_ACTION_LIVE_QUERY_RULES/);
  assert.match(rakutenRouteSource, /\(\?:body\|tension\|env\|foundation\)/);
  assert.match(rakutenRouteSource, /source: safeLifestyleActionKey\.startsWith\("tension-"\) \? "body_mechanics" : "lifestyle_action"/);
  assert.match(careNaviPageSource, /cooling_support/);
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
  build({ date: forecast.target_date });
  daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast,
    riskContext: {
      summary: { main_trigger_exact: "damp", secondary_trigger_exact: "heat" },
      constitution_context: { core_code: "brake_batt_small", symptom_focus: "fatigue" },
    },
    mode: "today",
    targetDate: forecast.target_date,
    symptomFocus: "fatigue",
  });
  assert.deepEqual(forecast, before);
});
