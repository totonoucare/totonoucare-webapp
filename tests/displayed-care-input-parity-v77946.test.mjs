import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

async function importSource(relativePath) {
  const text = await source(relativePath);
  return import(`data:text/javascript;base64,${Buffer.from(text).toString("base64")}`);
}

const [daily, reconstruction] = await Promise.all([
  importSource("lib/radar_v1/careRules/dailyCareV2.js"),
  importSource("lib/records/careReconstruction.js"),
]);

const forecast = {
  id: "forecast-2026-09-03",
  target_date: "2026-09-03",
  signal: 1,
  personal_main_trigger_exact: "damp",
  computed: {
    radar_plan_meta: {
      risk_context: {
        summary: {
          main_trigger_exact: "damp",
          care_policies: ["sasaeru", "nagasu"],
          reaction_direction: "brake",
          reserve_band: "small",
        },
        target: { signal: 1 },
        constitution_context: {
          core_code: "brake_batt_small",
          sub_labels: ["qi_deficiency", "fluid_damp"],
          symptom_focus: "fatigue",
          primary_meridian: "spleen_st",
          secondary_meridian: "lung_li",
          axes: { reaction_score: -0.72, reserve_score: -0.58 },
          split_scores: {
            qi_stagnation: 18,
            qi_deficiency: 78,
            blood_deficiency: 42,
            blood_stasis: 31,
            fluid_damp: 84,
            fluid_dryness: 22,
          },
        },
      },
    },
  },
};

const baseCarePlan = {
  night_tsubo_set: { points: [{ code: "ST36", name_ja: "足三里" }] },
};

function finalPlan(riskContext) {
  return daily.enhanceDailyCarePlan({
    baseCarePlan,
    forecast,
    riskContext,
    mode: "today",
    targetDate: forecast.target_date,
    symptomFocus: "fatigue",
  });
}

test("AI再構成へ保持した完全risk_contextは画面相当と同じ最終ケアを作る", () => {
  const screenRiskContext = forecast.computed.radar_plan_meta.risk_context;
  const aiRiskContext = reconstruction.selectCareReconstructionContext({ currentForecast: forecast });
  assert.equal(aiRiskContext, screenRiskContext);

  const screen = finalPlan(screenRiskContext);
  const ai = finalPlan(aiRiskContext);
  assert.deepEqual(ai, screen);

  const missingContextPlan = finalPlan(null);
  assert.notDeepEqual(missingContextPlan.care_theme, screen.care_theme);
});

test("新規記録だけ表示ケアを保存し、未記録の現在予報はAI再構成できる", () => {
  assert.equal(
    reconstruction.shouldCaptureDisplayedCareAtRecordSave({ existingReview: null }),
    true,
  );
  assert.equal(
    reconstruction.selectCareReconstructionContext({ currentForecast: forecast }),
    forecast.computed.radar_plan_meta.risk_context,
  );
});

test("別forecastの保存スナップショットへ現在のrisk_contextを誤流用しない", () => {
  const savedSnapshot = { forecast_id: "older-forecast" };
  assert.equal(reconstruction.selectCareReconstructionContext({ savedSnapshot, currentForecast: forecast }), null);
  assert.equal(
    reconstruction.shouldCaptureDisplayedCareAtRecordSave({ existingReview: { id: "review-1", forecast_snapshot: savedSnapshot } }),
    false,
  );
});

test("同じforecast idでも既存スナップショットへ現在のケアを後付けしない", () => {
  const savedSnapshot = { forecast_id: forecast.id };
  assert.equal(reconstruction.selectCareReconstructionContext({ savedSnapshot, currentForecast: forecast }), null);
  assert.equal(
    reconstruction.shouldCaptureDisplayedCareAtRecordSave({ existingReview: { id: "review-2", forecast_snapshot: savedSnapshot } }),
    false,
  );
});

test("forecast id欠損の既存スナップショットへ現在のケアを後付けしない", () => {
  const savedSnapshot = { target_date: forecast.target_date };
  assert.equal(reconstruction.selectCareReconstructionContext({ savedSnapshot, currentForecast: forecast }), null);
  assert.equal(
    reconstruction.shouldCaptureDisplayedCareAtRecordSave({ existingReview: { id: "review-3", forecast_snapshot: savedSnapshot } }),
    false,
  );
});

test("保存済み表示ケアがあれば再構成を行わず保存値を優先する", () => {
  const context = reconstruction.selectCareReconstructionContext({
    savedSnapshot: { forecast_id: forecast.id, displayed_care: { exact_visible_items: [] } },
    currentForecast: forecast,
  });
  assert.equal(context, null);
  assert.equal(
    reconstruction.shouldCaptureDisplayedCareAtRecordSave({ existingReview: { id: "review-4" } }),
    false,
  );
});

test("スナップショットのない旧記録にも現在予報を後付けしない", () => {
  assert.equal(
    reconstruction.selectCareReconstructionContext({
      savedSnapshot: null,
      currentForecast: forecast,
      hasSavedReview: true,
    }),
    null,
  );
  assert.equal(
    reconstruction.shouldCaptureDisplayedCareAtRecordSave({ existingReview: { id: "legacy-review" } }),
    false,
  );
});

test("予報画面とAIは同じ最終ケア解決関数を使用し、記録時に表示スナップショットを保存する", async () => {
  const [page, aiContext, reviewRoute, snapshot, provenance] = await Promise.all([
    source("app/radar/page.js"),
    source("lib/records/aiContext.js"),
    source("app/api/radar/review/route.js"),
    source("lib/radar_v1/displayedCareSnapshot.js"),
    source("lib/records/displayedCareProvenance.js"),
  ]);
  assert.match(page, /resolveDisplayedCarePlan\(\{/);
  assert.match(aiContext, /resolveDisplayedCarePlan\(\{/);
  assert.match(aiContext, /row\?\.care_reconstruction_context/);
  assert.match(reviewRoute, /shouldCaptureDisplayedCareAtRecordSave/);
  assert.match(reviewRoute, /reconstructed_at_first_record_save/);
  assert.match(reviewRoute, /displayed_care: savedDisplayedCare/);
  assert.match(snapshot, /care_logic_version/);
  assert.match(snapshot, /target_date/);
  assert.match(snapshot, /exact_visible_items/);
  assert.match(snapshot, /displayedCareUsageNote\(source\)/);
  assert.match(provenance, /本人が当時閲覧・実行した事実とは扱わない/);
});
