import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const productFitSource = await readFile(new URL("../lib/care-navi/lifestyleProductFit.js", import.meta.url), "utf8");
const productFit = await import(`data:text/javascript;base64,${Buffer.from(productFitSource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const careNaviPageSource = await readFile(new URL("../app/care-navi/page.js", import.meta.url), "utf8");
const rakutenRouteSource = await readFile(new URL("../app/api/care-navi/rakuten/route.js", import.meta.url), "utf8");

function build({
  date = "2026-08-04",
  symptomFocus = "neck_shoulder",
  trigger = "damp",
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
    },
    riskContext: {
      summary: { main_trigger_exact: trigger },
      target: { signal: 1 },
      constitution_context: {
        core_code: coreCode,
        sub_labels: coreCode.startsWith("brake")
          ? ["fluid_damp", "qi_deficiency"]
          : ["qi_stagnation", "fluid_deficiency"],
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

test("持ち方の身体操作は、手根側を近づけて手のひら中央へ空間を残す", () => {
  const publicCopyBlock = dailySource.match(/const PUBLIC_ACTION_COPY_BY_ID = \{(.*?)\n\};\n\nconst BODY_CARE_NEEDS/s)?.[1] || "";
  const palmCarry = publicCopyBlock.match(/"tension-open-palm-carry": \{(.*?)\n  \},/s)?.[1] || "";
  const littleFinger = publicCopyBlock.match(/"tension-little-finger-thumb-line": \{(.*?)\n  \},/s)?.[1] || "";
  assert.match(palmCarry, /指先を物へ添えた位置は残し/);
  assert.match(palmCarry, /手首に近い手のひらの付け根を物へ近づける/);
  assert.match(palmCarry, /手のひらの中央に浅いくぼみを残し/);
  assert.match(littleFinger, /手のひらの付け根を物へ近づけ/);
  assert.match(littleFinger, /小指側から包/);
  assert.doesNotMatch(publicCopyBlock, /細い持ち手|指先に掛けず/);
  assert.doesNotMatch(dailySource, /片手の袋を二つに分ける/);
});

test("身体の使い方は全条件で商品へ直結せず、ショップ文脈は環境調整から作る", () => {
  for (const trigger of ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"]) {
    for (const symptomFocus of ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"]) {
      const plan = build({ trigger, symptomFocus }).lifestyle_plan;
      for (const action of shown(plan).filter((item) => item.care_kind === "body")) {
        assert.equal(action.shop_eligible, false, `${trigger}/${symptomFocus}/${action.id}`);
        assert.equal(action.item_role, null, `${trigger}/${symptomFocus}/${action.id}`);
      }
      if (plan.shop_context) {
        assert.match(plan.shop_context.action_id, /^tool-/);
        assert.ok(plan.shop_context.item_role);
      }
      const displayedEnvironment = shown(plan).find((item) => item.care_kind === "environment");
      if (displayedEnvironment) {
        assert.equal(plan.shop_context?.action_id, displayedEnvironment.id, `${trigger}/${symptomFocus}/shop-context`);
      }
    }
  }

  const bodyFirst = build({
    date: "2026-08-01",
    symptomFocus: "neck_shoulder",
    trigger: "heat",
    coreCode: "accel_batt_large",
  }).lifestyle_plan;
  assert.equal(bodyFirst.primary_action.care_kind, "body");
  assert.equal(bodyFirst.alternatives[0].care_kind, "environment");
  assert.equal(bodyFirst.shop_context.action_id, bodyFirst.alternatives[0].id);
});

test("胃腸の前かがみケアは、商品検索でも画面・読み物用スタンドへ限定する", () => {
  const plan = build({
    date: "2026-08-04",
    symptomFocus: "digestion",
    trigger: "damp",
    coreCode: "brake_batt_small",
  }).lifestyle_plan;
  assert.equal(plan.primary_action.id, "tool-work-height");
  assert.equal(plan.shop_context.item_role, "screen_height");
  assert.match(rakutenRouteSource, /"tool-work-height:screen_height"/);
  assert.match(rakutenRouteSource, /タブレット 書見台 スタンド 高さ調整/);
});

test("スタンド系は用途と形状が一致する商品だけを通す", () => {
  assert.equal(productFit.matchesLifestyleProductRole("高さ調整 タブレット スタンド クランプ固定", "screen_height"), true);
  assert.equal(productFit.matchesLifestyleProductRole("卓上 収納トレー 文房具 小物入れ", "screen_height"), false);
  assert.equal(productFit.matchesLifestyleProductRole("高さ調整 マイクスタンド", "screen_height"), false);
  assert.equal(productFit.matchesLifestyleProductRole("本革 高さ調整 マイクスタンド", "screen_height"), false);
  assert.equal(productFit.matchesLifestyleProductRole("デスクオーガナイザー 卓上収納", "visual_layout"), true);
  assert.equal(productFit.matchesLifestyleProductRole("キッチン用 水切りトレー", "visual_layout"), false);
});

test("予報からショップへ渡すのは独立した環境調整コンテキストだけ", () => {
  assert.match(radarPageSource, /const shopContext = lifestylePlan\?\.shop_context \|\| null/);
  assert.match(radarPageSource, /const lifestyleShopContext = lifestylePlan\?\.shop_context \|\| null/);
  assert.match(rakutenRouteSource, /source:\s*"lifestyle_action"/);
  assert.doesNotMatch(rakutenRouteSource, /body_mechanics|BODY_MECHANICS_LIVE_QUERY_RULES/);
  assert.match(rakutenRouteSource, /matchesLifestyleProductRole/);
  assert.match(rakutenRouteSource, /plan\?\.source !== "lifestyle_action"/);
  assert.match(rakutenRouteSource, /\{ key: "lifestyle_action", count: 2 \}/);
  assert.doesNotMatch(rakutenRouteSource, /\|固定\|/);
  assert.doesNotMatch(careNaviPageSource, /\|固定\|/);
  assert.match(careNaviPageSource, /sourceType === "lifestyle_action"/);
});
