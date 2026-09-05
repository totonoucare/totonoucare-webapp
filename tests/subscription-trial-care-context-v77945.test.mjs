import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const dailySource = await source("lib/radar_v1/careRules/dailyCareV2.js");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);

function plan({ date, mode, trigger, symptom = "fatigue", meridian = "spleen_st" }) {
  return daily.enhanceDailyCarePlan({
    baseCarePlan: { night_tsubo_set: { points: [{ code: "ST36", name_ja: "足三里" }] } },
    forecast: { target_date: date, signal: 1, personal_main_trigger_exact: trigger },
    riskContext: {
      summary: { main_trigger_exact: trigger },
      target: { signal: 1 },
      constitution_context: {
        core_code: "brake_batt_small",
        sub_labels: ["qi_deficiency", "fluid_damp"],
        symptom_focus: symptom,
        primary_meridian: meridian,
      },
    },
    mode,
    targetDate: date,
    symptomFocus: symptom,
  });
}

test("今日の暮らす・ほぐすと、翌日の準備ケアは同じ主案を再掲しない", () => {
  const triggers = ["pressure_down", "pressure_up", "damp", "dry", "cold", "heat", "temp_shift"];
  const symptoms = ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"];
  for (const trigger of triggers) {
    for (const symptom of symptoms) {
      const today = plan({ date: "2026-10-03", mode: "today", trigger, symptom });
      const tomorrow = plan({ date: "2026-10-04", mode: "tomorrow", trigger, symptom });
      assert.ok(today.lifestyle_plan.primary_action?.id, `${trigger}/${symptom}: today lifestyle`);
      assert.ok(tomorrow.lifestyle_plan.primary_action?.id, `${trigger}/${symptom}: tomorrow lifestyle`);
      assert.notEqual(today.lifestyle_plan.primary_action.id, tomorrow.lifestyle_plan.primary_action.id);
      assert.notEqual(today.night_tsubo_set.line_care.id, tomorrow.night_tsubo_set.line_care.id);
      assert.match(tomorrow.lifestyle_plan.timing_label, /今夜|明朝/);
      assert.match(tomorrow.night_tsubo_set.line_care.timing_label, /今夜|明朝/);
    }
  }
});

test("ミモルへ今日・明日の表示モードと画面用ケアを明示して渡す", async () => {
  const [context, snapshot, live, prompts, radarPage, server] = await Promise.all([
    source("lib/records/aiContext.js"),
    source("lib/radar_v1/displayedCareSnapshot.js"),
    source("app/api/records/live-chat/route.js"),
    source("lib/records/aiPrompts.js"),
    source("app/radar/page.js"),
    source("lib/records/server.js"),
  ]);
  assert.match(context, /reconstructed_from_complete_risk_context/);
  assert.match(snapshot, /exact_visible_items/);
  assert.match(context, /resolveDisplayedCarePlan/);
  assert.match(radarPage, /resolveDisplayedCarePlan/);
  assert.match(server, /care_reconstruction_context/);
  assert.match(live, /todayRow[\s\S]*mode: "today"/);
  assert.match(live, /tomorrowRow[\s\S]*mode: "tomorrow"/);
  assert.match(prompts, /exact_visible_items/);
  assert.match(prompts, /ミモルの応用案/);
  assert.match(prompts, /reconstructed_at_first_record_save/);
  assert.match(prompts, /本人が当時閲覧・実行したケアとして扱わない/);
});

test("14日体験と終了後の無料範囲を主要画面とAPIの両方で案内・制御する", async () => {
  const [home, radar, records, guide, signup, policy, forecastRoute, reviewRoute, careRoute, pushRoute] = await Promise.all([
    source("app/HomeClient.jsx"),
    source("app/radar/page.js"),
    source("components/records/RecordsPageClient.jsx"),
    source("app/guide/GuideClient.jsx"),
    source("app/signup/SignupClient.js"),
    source("lib/records/policy.js"),
    source("app/api/radar/v1/forecast/route.js"),
    source("app/api/radar/review/route.js"),
    source("app/api/radar/care-actions/route.js"),
    source("app/api/push/register/route.js"),
  ]);
  assert.match(policy, /startsAt: "2026-10-01T00:00:00\+09:00"/);
  assert.match(policy, /days: 14/);
  assert.match(home, /参考体質で見る今日の予報[\s\S]*SubscriptionPaywall/);
  assert.match(radar, /personalized_forecast_enabled[\s\S]*SubscriptionPaywall/);
  assert.match(records, /records_write_enabled/);
  assert.match(guide, /登録後14日間は、全部試せます/);
  assert.match(signup, /カード登録は不要/);
  assert.match(forecastRoute, /personalized_forecast_access_required/);
  assert.match(reviewRoute, /records_write_access_required/);
  assert.match(careRoute, /records_write_access_required/);
  assert.match(pushRoute, /notifications_access_required/);
});
