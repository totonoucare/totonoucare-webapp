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
} = {}) {
  return daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast: {
      target_date: date,
      signal: 1,
      score_display_0_10: 4.8,
      personal_main_trigger_exact: trigger,
      personal_secondary_trigger_exact: secondary,
    },
    riskContext: {
      summary: {
        main_trigger_exact: trigger,
        secondary_trigger_exact: secondary,
      },
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

const EXPECTED_SCENES = {
  hold_carry: ["持つ・運ぶ", "物を持つ・運ぶ時は"],
  push_pull_turn: ["押す・引く・回す", "物を押す・引く・回す時は"],
  reach_take: ["手を伸ばす・物を取る", "手を伸ばして物を取る時は"],
  bend_height: ["かがむ・高さを変える", "かがむ・高さを変える時は"],
  sit_rise: ["立つ・座る・起き上がる", "立つ・座る・起き上がる時は"],
  walk_step: ["歩く・段差を移動する", "歩く・段差を移動する時は"],
  screen_handwork: ["手作業・画面操作", "手作業や画面操作が続く時は"],
  hold_posture: ["同じ姿勢で待つ・作業する", "同じ姿勢で待つ・作業する時は"],
  lie_turn: ["横になる・寝返る", "横になる・寝返る時は"],
};

test("暮らすの主提案は基本動作・具体操作・確認方法を一組で返す", () => {
  const plan = build().lifestyle_plan;
  const action = plan.primary_action;
  assert.match(action.id, /^tension-/);
  assert.ok(action.scene.length > 0);
  assert.ok(action.scene_label.length > 0);
  assert.ok(action.label.length > 0);
  assert.ok(action.reason.length > 0);
  assert.ok(action.felt_sense.length > 0);
  assert.ok(action.reset.length > 0);
  assert.ok(action.scene_family);
  assert.ok(action.item_role);
  assert.equal(action.shop_query, undefined);
  assert.equal(action.item_hint, undefined);
  assert.deepEqual(
    [action.scene_label, action.scene],
    EXPECTED_SCENES[action.scene_family]
  );
  assert.equal(
    new Set([action, ...plan.alternatives].map((item) => item.scene_family)).size,
    3
  );
  assert.doesNotMatch(`${action.scene} ${action.label} ${action.reason}`, /あなたは|いつも|必ず|治る|改善する/);
  assert.match(action.reason, /ためです。$/);
});

test("内部の身体OS・九つの基本動作・画面の具体操作を三層に分ける", () => {
  const internalBlock = dailySource.match(/const BODY_MECHANICS_INTERNAL_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 場面は/s)?.[1] || "";
  const sceneBlock = dailySource.match(/const LIFESTYLE_SCENE_DEFINITIONS = \{(.*?)\n\};\n\n\/\/ ここには/s)?.[1] || "";
  const publicBlock = dailySource.match(/const PUBLIC_ACTION_COPY_BY_ID = \{(.*?)\n\};\n\nconst BODY_MECHANICS_LIFESTYLE_CANDIDATES/s)?.[1] || "";
  assert.match(internalBlock, /橈骨|母指|正中|張力/);
  assert.doesNotMatch(publicBlock, /橈骨|母指|正中|張力|起始側|伸張|荷重|重心線|拮抗|体の中心|足は下|頭は上|朝顔の手|壁と地面/);
  assert.doesNotMatch(publicBlock, /姿勢を正しく|背筋を伸ばして|水分をこまめに|服を着替/);
  const publicActionIds = [...publicBlock.matchAll(/"(tension-[a-z0-9-]+)":\s*\{/g)].map((match) => match[1]);
  assert.equal(publicActionIds.length, 22);
  assert.equal([...sceneBlock.matchAll(/^\s{2}([a-z_]+):\s*\{/gm)].length, 9);
  assert.equal([...sceneBlock.matchAll(/label:/g)].length, 9);
  assert.equal([...sceneBlock.matchAll(/scene:/g)].length, 9);
  assert.equal([...publicBlock.matchAll(/^\s{4}scene:/gm)].length, 0);
  const sceneFamilies = new Set([...publicBlock.matchAll(/scene_family:\s*"([a-z_]+)"/g)].map((match) => match[1]));
  assert.deepEqual([...sceneFamilies].sort(), Object.keys(EXPECTED_SCENES).sort());
  assert.equal([...publicBlock.matchAll(/felt_sense:/g)].length, 22);
  assert.equal([...publicBlock.matchAll(/reset:/g)].length, 22);
});

test("同じ天気が続く七日間も、関連する基本動作を広く回す", () => {
  const minimumSceneCount = {
    fatigue: 4,
    sleep: 3,
    digestion: 3,
    neck_shoulder: 4,
    low_back_pain: 4,
    swelling: 4,
    headache: 4,
    dizziness: 3,
    mood: 4,
  };
  for (const mode of ["today", "tomorrow"]) {
    for (const coreCode of ["brake_batt_small", "brake_batt_large", "accel_batt_small", "accel_batt_large"]) {
      for (const trigger of ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"]) {
        for (const symptomFocus of Object.keys(minimumSceneCount)) {
          const actions = Array.from({ length: 7 }, (_, index) =>
            build({
              date: `2026-08-${String(index + 1).padStart(2, "0")}`,
              symptomFocus,
              trigger,
              coreCode,
              mode,
            }).lifestyle_plan.primary_action
          );
          for (let index = 1; index < actions.length; index += 1) {
            assert.notEqual(
              actions[index].scene_family,
              actions[index - 1].scene_family,
              `${mode}/${coreCode}/${trigger}/${symptomFocus}: adjacent scene`
            );
          }
          assert.ok(
            new Set(actions.map((item) => item.scene_family)).size >= minimumSceneCount[symptomFocus],
            `${mode}/${coreCode}/${trigger}/${symptomFocus}: scene variation`
          );
        }
      }
    }
  }
});

test("同じ基本動作が再登場する時は、その中の具体操作も日替わりにする", () => {
  const actions = Array.from({ length: 28 }, (_, index) =>
    build({
      date: `2026-08-${String(index + 1).padStart(2, "0")}`,
      symptomFocus: "neck_shoulder",
      trigger: "damp",
    }).lifestyle_plan.primary_action
  );
  const byScene = actions.reduce((map, item) => {
    if (!map.has(item.scene_family)) map.set(item.scene_family, []);
    map.get(item.scene_family).push(item);
    return map;
  }, new Map());
  const multiVariantScenes = new Set([
    "hold_carry",
    "push_pull_turn",
    "walk_step",
    "screen_handwork",
    "hold_posture",
  ]);
  for (const [sceneFamily, items] of byScene) {
    if (items.length < 2 || !multiVariantScenes.has(sceneFamily)) continue;
    assert.ok(new Set(items.map((item) => item.id)).size >= 2, `${sceneFamily}: action variation`);
  }
});

test("場面名には個別家事を持ち込まず、具体操作側だけで例を変える", () => {
  for (const focus of ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"]) {
    for (let day = 1; day <= 14; day += 1) {
      const action = build({
        date: `2026-08-${String(day).padStart(2, "0")}`,
        symptomFocus: focus,
      }).lifestyle_plan.primary_action;
      assert.doesNotMatch(action.scene, /コップ|バッグ|スマホ|モップ|洗濯かご|包丁|扉|引き出し/);
      assert.deepEqual([action.scene_label, action.scene], EXPECTED_SCENES[action.scene_family]);
    }
  }
});

test("同じ条件の再読込では暮らすの一手が変わらない", () => {
  const first = build({ date: "2026-08-03", symptomFocus: "low_back_pain" });
  const second = build({ date: "2026-08-03", symptomFocus: "low_back_pain" });
  assert.equal(first.lifestyle_plan.primary_action.id, second.lifestyle_plan.primary_action.id);
  assert.equal(first.lifestyle_plan.primary_action.label, second.lifestyle_plan.primary_action.label);
});

test("予報カードは具体的な商品を出さず、内部action idだけをショップへ渡す", () => {
  assert.match(radarPageSource, /liveAction=/);
  assert.match(radarPageSource, /lifestylePrimaryAction\?\.scene/);
  assert.match(radarPageSource, /lifestylePrimaryAction\?\.reason/);
  assert.match(radarPageSource, /lifestylePrimaryAction\?\.felt_sense/);
  assert.match(radarPageSource, /できた目安/);
  assert.match(radarPageSource, /うまくいかない時/);
  assert.doesNotMatch(radarPageSource, /lifestylePrimaryAction\?\.item_hint/);
  assert.doesNotMatch(radarPageSource, /\{lifestylePrimaryAction\?\.shop_query\}/);
  assert.doesNotMatch(radarPageSource, /compare_before|compare_after|普段どおり一回/);
});

test("ショップは許可済みaction idを暮らす検索と方針セットへ接続する", () => {
  assert.match(careNaviPageSource, /params\.get\("liveAction"\)/);
  assert.match(careNaviPageSource, /lifestyleActionKey: categoryKey === "live"/);
  assert.match(careNaviPageSource, /lifestyleItemRole/);
  assert.match(careNaviPageSource, /contextBoostRoles/);
  assert.match(rakutenRouteSource, /BODY_MECHANICS_LIVE_QUERY_RULES/);
  assert.match(rakutenRouteSource, /source: "body_mechanics"/);
  assert.match(rakutenRouteSource, /sourceKey: "body_mechanics"/);
  assert.match(rakutenRouteSource, /ノートパソコン スタンド 高さ調整/);
  assert.match(rakutenRouteSource, /デスク アームレスト 後付け/);
  assert.match(rakutenRouteSource, /ランドリー バスケット キャスター/);
  assert.match(rakutenRouteSource, /軽量 モップ 長さ調整/);
  assert.doesNotMatch(rakutenRouteSource, /body\?\.lifestyleQuery/);
  const shopBodyCopy = rakutenRouteSource.match(/const BODY_MECHANICS_LIVE_QUERY_RULES = \{(.*?)\n\};\n\n\n\nconst LIFE_POLICY_HINTS/s)?.[1] || "";
  assert.doesNotMatch(shopBodyCopy, /橈骨|母指|正中|張力|起始側|伸張|荷重|重心線|体の中心|足は下|頭は上|手の空間|内側の軸|朝顔の手|壁と地面/);
  assert.doesNotMatch(careNaviPageSource, /母指側を長くする|足元から軸を通す|内側の軸を探す|重心から歩く/);
});

test("暮らす候補とショップ検索のaction idは全件対応し、商品語はケア側へ持たない", () => {
  const candidateBlock = dailySource.match(/const BODY_MECHANICS_INTERNAL_CANDIDATES = \[(.*?)\n\];\n\n\/\/ 場面は/s)?.[1] || "";
  const careActionIds = new Set([...candidateBlock.matchAll(/id:\s*"(tension-[a-z0-9-]+)"/g)].map((match) => match[1]));
  const shopActionIds = new Set([...rakutenRouteSource.matchAll(/"(tension-[a-z0-9-]+)":\s*careQueryRow/g)].map((match) => match[1]));
  assert.ok(careActionIds.size >= 20);
  assert.deepEqual([...shopActionIds].sort(), [...careActionIds].sort());
  assert.doesNotMatch(dailySource, /shop_query|item_hint|楽天|商品名/);
});

test("めまいでは歩行・階段・深い拾い動作を選ばない", () => {
  const unsafeIds = new Set([
    "tension-walk-center-first",
    "tension-stairs-center-up",
    "tension-floor-object-axis",
  ]);
  for (let day = 1; day <= 28; day += 1) {
    const action = build({
      date: `2026-08-${String(day).padStart(2, "0")}`,
      symptomFocus: "dizziness",
      trigger: day % 2 ? "pressure_down" : "temp_shift",
    }).lifestyle_plan.primary_action;
    assert.equal(unsafeIds.has(action.id), false, action.id);
  }
});

test("壁押し・片足立ちなどの練習を暮らすの画面文へ出さない", () => {
  for (const symptomFocus of ["fatigue", "swelling", "low_back_pain", "neck_shoulder"]) {
    for (let day = 1; day <= 14; day += 1) {
      const action = build({ date: `2026-08-${String(day).padStart(2, "0")}`, symptomFocus }).lifestyle_plan.primary_action;
      assert.doesNotMatch(`${action.scene} ${action.label}`, /壁を押|片足立ち|片足を浮かせ|朝顔の手/);
    }
  }
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
      constitution_context: { core_code: "brake_batt_small", symptom_focus: "fatigue" },
    },
    mode: "today",
    targetDate: forecast.target_date,
    symptomFocus: "fatigue",
  });
  assert.deepEqual(forecast, before);
});
