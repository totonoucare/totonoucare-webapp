import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const analysisSource = await readFile(new URL("../lib/records/analysis.js", import.meta.url), "utf8");
const analysisModule = await import(`data:text/javascript;base64,${Buffer.from(analysisSource).toString("base64")}`);

const {
  buildActionTags,
  buildChartPoints,
  buildForecastActualMapPoints,
  buildRecordsSummary,
  classifyRecord,
  reviewCareDomains,
  reviewCareTiming,
  reviewFactors,
  snapshotFromForecast,
} = analysisModule;

function row({ date = "2026-07-01", signal, condition = 2, prevent = 0, domains = [], timing = "", factors = [] } = {}) {
  return {
    date,
    forecast: signal == null
      ? null
      : {
          id: `forecast-${date}`,
          target_date: date,
          signal,
          score_precise_0_10: [1, 5, 9][signal],
          personal_main_trigger_exact: "damp",
        },
    review: {
      condition_level: condition,
      prevent_level: prevent,
      care_domains: domains,
      care_timing: timing || null,
      context_factors: factors,
      action_tags: buildActionTags({ domains, timing, factors }),
    },
  };
}

test("missing forecast is not silently classified as stable", () => {
  const result = classifyRecord(row({ signal: undefined, condition: 2 }));
  assert.equal(result.comparison, "no_forecast");
  assert.equal(result.comparable, false);
  assert.equal(result.mismatch, false);
});

test("all three-level forecast/actual combinations classify exactly", () => {
  const expected = [
    ["aligned", "worse", "worse"],
    ["better", "aligned", "worse"],
    ["better", "better", "aligned"],
  ];
  const conditionForActualSeverity = [2, 1, 0];

  for (let forecastSeverity = 0; forecastSeverity <= 2; forecastSeverity += 1) {
    for (let actualSeverity = 0; actualSeverity <= 2; actualSeverity += 1) {
      const result = classifyRecord(row({
        signal: forecastSeverity,
        condition: conditionForActualSeverity[actualSeverity],
      }));
      assert.equal(
        result.comparison,
        expected[forecastSeverity][actualSeverity],
        `forecast=${forecastSeverity}, actual=${actualSeverity}`,
      );
    }
  }
});

test("structured care fields and legacy action tags remain compatible", () => {
  const tags = buildActionTags({
    domains: ["live", "loosen"],
    timing: "before_peak",
    factors: ["sleep_short", "busy"],
    existing: ["legacy-note"],
  });
  const legacyReview = { action_tags: tags };

  assert.deepEqual(reviewCareDomains(legacyReview), ["live", "loosen"]);
  assert.equal(reviewCareTiming(legacyReview), "before_peak");
  assert.deepEqual(reviewFactors(legacyReview), ["sleep_short", "busy"]);
  assert.ok(tags.includes("legacy-note"));
});

test("factor 'none' is exclusive", () => {
  const tags = buildActionTags({ factors: ["sleep_short", "none", "busy"] });
  assert.deepEqual(tags.filter((tag) => tag.startsWith("factor:")), ["factor:none"]);
});

test("summary counts comparison, care, timing, and missing forecast separately", () => {
  const rows = [
    row({ date: "2026-07-01", signal: 2, condition: 2, prevent: 2, domains: ["live"], timing: "before_peak" }),
    row({ date: "2026-07-02", signal: 0, condition: 0, prevent: 0, factors: ["sleep_short"] }),
    row({ date: "2026-07-03", signal: 1, condition: 1, prevent: 1, domains: ["eat"], timing: "after_symptom" }),
    row({ date: "2026-07-04", signal: undefined, condition: 2 }),
  ];
  const summary = buildRecordsSummary(rows);

  assert.equal(summary.recorded_days, 4);
  assert.equal(summary.comparable_days, 3);
  assert.equal(summary.missing_forecast_record_days, 1);
  assert.equal(summary.better_than_forecast_days, 1);
  assert.equal(summary.worse_than_forecast_days, 1);
  assert.equal(summary.aligned_days, 1);
  assert.equal(summary.care_days, 2);
  assert.equal(summary.before_peak_care_days, 1);
  assert.equal(summary.after_symptom_care_days, 1);
  assert.deepEqual(summary.domain_counts, { live: 1, eat: 1 });
  assert.deepEqual(summary.factor_counts, { sleep_short: 1 });
});

test("long periods aggregate by ISO week without pretending one day represents the week", () => {
  const rows = [
    row({ date: "2026-07-06", signal: 1, condition: 2 }),
    row({ date: "2026-07-08", signal: 2, condition: 1 }),
    row({ date: "2026-07-13", signal: 0, condition: 2 }),
  ];
  const points = buildChartPoints(rows, 90);

  assert.equal(points.length, 2);
  assert.equal(points[0].date, "2026-07-06");
  assert.equal(points[0].end_date, "2026-07-08");
  assert.equal(points[0].is_aggregate, true);
  assert.equal(points[0].recorded_count, 2);
});

test("forecast/actual map excludes records without a forecast", () => {
  const points = buildForecastActualMapPoints([
    row({ date: "2026-07-01", signal: 2, condition: 2, prevent: 2, domains: ["live"] }),
    row({ date: "2026-07-02", signal: undefined, condition: 0 }),
  ]);
  assert.equal(points.length, 1);
  assert.equal(points[0].date, "2026-07-01");
  assert.equal(points[0].care_done, true);
});

test("forecast snapshot carries the exact trigger and the forecast date", () => {
  const snapshot = snapshotFromForecast({
    id: "f1",
    target_date: "2026-07-10",
    signal: 2,
    main_trigger: "humidity",
    trigger_dir: "up",
    score_precise_0_10: 8.25,
    peak_start: "13:00",
    peak_end: "17:00",
  });

  assert.equal(snapshot.target_date, "2026-07-10");
  assert.equal(snapshot.personal_main_trigger_exact, "damp");
  assert.equal(snapshot.score_precise_0_10, 8.25);
  assert.equal(snapshot.snapshot_source, "record_save");
});
