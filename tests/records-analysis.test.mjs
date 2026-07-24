import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const analysisSource = await readFile(new URL("../lib/records/analysis.js", import.meta.url), "utf8");
const analysisModule = await import(
  `data:text/javascript;base64,${Buffer.from(analysisSource).toString("base64")}`
);

const {
  buildActionTags,
  buildChartPoints,
  buildForecastPatternGroups,
  buildRecordsSummary,
  classifyRecord,
  reviewCareDomains,
  reviewCareTiming,
  reviewFactors,
  snapshotFromForecast,
  trimRecordForAi,
} = analysisModule;

function row({ date = "2026-07-01", signal, score = null, condition = 2, prevent = 0, domains = [], timing = "", factors = [], careActions = [] } = {}) {
  return {
    date,
    forecast: signal == null
      ? null
      : {
          id: `forecast-${date}`,
          target_date: date,
          signal,
          score_precise_0_10: score == null ? [1, 5, 9][signal] : score,
          personal_main_trigger_exact: "damp",
        },
    care_actions: careActions,
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
  assert.equal(summary.attention_good_days, 1);
  assert.equal(summary.attention_difficult_days, 1);
  assert.equal(summary.stable_difficult_days, 1);
  assert.equal(summary.stable_good_days, 0);
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
  assert.deepEqual(points[0].actual_counts, { good: 1, mild: 1, hard: 0 });
  assert.equal(points[0].forecast_severity, 2);
  assert.equal(points[0].forecast_min, 50);
  assert.equal(points[0].forecast_max, 90);
  assert.equal(points[0].exact_trigger, "damp");
  assert.equal(points[0].pattern_counts.attention_good, 1);
  assert.equal(points[0].pattern_counts.attention_difficult, 1);
});

test("four reflection patterns exclude records without a forecast", () => {
  const groups = buildForecastPatternGroups([
    row({ date: "2026-07-01", signal: 2, condition: 2, prevent: 2, domains: ["live"] }),
    row({ date: "2026-07-02", signal: undefined, condition: 0 }),
  ]);
  const attentionGood = groups.find((group) => group.key === "attention_good");
  assert.equal(groups.reduce((sum, group) => sum + group.days, 0), 1);
  assert.equal(attentionGood.days, 1);
  assert.equal(attentionGood.care_days, 1);
  assert.equal(attentionGood.points[0].date, "2026-07-01");
});

test("all nine forecast/actual combinations collapse into four useful reflection patterns", () => {
  const conditions = [2, 1, 0];
  const rows = [];
  for (let forecastSeverity = 0; forecastSeverity <= 2; forecastSeverity += 1) {
    for (let actualSeverity = 0; actualSeverity <= 2; actualSeverity += 1) {
      rows.push(row({
        date: `2026-07-${String(forecastSeverity * 3 + actualSeverity + 1).padStart(2, "0")}`,
        signal: forecastSeverity,
        condition: conditions[actualSeverity],
      }));
    }
  }

  const groups = buildForecastPatternGroups(rows);
  assert.deepEqual(
    Object.fromEntries(groups.map((group) => [group.key, group.days])),
    {
      attention_good: 2,
      attention_difficult: 4,
      stable_good: 1,
      stable_difficult: 2,
    }
  );
});


test("matched forecast comparisons keep similar trigger and score conditions together", () => {
  const summary = buildRecordsSummary([
    row({ date: "2026-07-01", signal: 1, score: 5.1, condition: 2, prevent: 2, domains: ["eat"], timing: "before_peak" }),
    row({ date: "2026-07-02", signal: 1, score: 5.4, condition: 1, prevent: 1, domains: ["eat"], timing: "after_symptom" }),
    row({ date: "2026-07-03", signal: 1, score: 5.2, condition: 1, prevent: 0 }),
    row({ date: "2026-07-04", signal: 1, score: 5.8, condition: 0, prevent: 0 }),
  ]);

  const comparison = summary.matched_forecast_comparisons.find((item) => item.exact_trigger === "damp");
  assert.equal(comparison.score_band.label, "50〜59");
  assert.equal(comparison.signal_label, "いたわり");
  assert.equal(comparison.comparison_status, "early_comparison");
  assert.equal(comparison.care_days, 2);
  assert.equal(comparison.no_care_days, 2);
  assert.deepEqual(comparison.care_actual_counts, { good: 1, mild: 1, hard: 0 });
  assert.deepEqual(comparison.no_care_actual_counts, { good: 0, mild: 1, hard: 1 });
  assert.equal(comparison.domain_outcomes[0].domain, "eat");
  assert.equal(comparison.before_peak_care_days, 1);
  assert.deepEqual(comparison.timing_outcomes.before_peak.actual_counts, { good: 1, mild: 0, hard: 0 });
  assert.deepEqual(comparison.timing_outcomes.after_symptom.actual_counts, { good: 0, mild: 1, hard: 0 });
  assert.equal(comparison.evidence_level, "small_clue");
});

test("concrete care actions are counted by target day and keep previous-night provenance", () => {
  const action = {
    source_mode: "tomorrow",
    domain: "loosen",
    item_key: "loosen:point:0:abc",
    kind: "tsubo_point",
    label: "内関のツボケア",
    timing_relation: "previous_night",
    checked_at: "2026-07-01T12:00:00.000Z",
  };
  const summary = buildRecordsSummary([
    row({ date: "2026-07-02", signal: 1, score: 5.6, condition: 2, prevent: 0, careActions: [action] }),
    row({ date: "2026-07-03", signal: 1, score: 5.8, condition: 1, prevent: 0 }),
  ]);

  assert.equal(summary.care_days, 1);
  assert.equal(summary.concrete_care_days, 1);
  assert.equal(summary.concrete_care_action_count, 1);
  assert.equal(summary.previous_night_care_days, 1);
  assert.equal(summary.before_peak_care_days, 1);
  assert.equal(summary.specific_care_patterns[0].label, "内関のツボケア");
  assert.equal(summary.specific_care_patterns[0].previous_night_days, 1);
  assert.deepEqual(summary.specific_care_patterns[0].actual_counts, { good: 1, mild: 0, hard: 0 });
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
  assert.equal(snapshot.version, 2);
});

test("the same concrete care keeps both previous-night and same-day timing outcomes", () => {
  const careActions = [
    {
      source_mode: "tomorrow",
      domain: "loosen",
      item_key: "legacy-a",
      canonical_key: "v2:loosen:point:pc6",
      kind: "tsubo_point",
      label: "内関のツボケア",
      timing_relation: "previous_night",
    },
    {
      source_mode: "today",
      domain: "loosen",
      item_key: "legacy-b",
      canonical_key: "v2:loosen:point:pc6",
      kind: "tsubo_point",
      label: "内関のツボケア",
      timing_relation: "same_day_after",
    },
  ];
  const summary = buildRecordsSummary([
    row({ date: "2026-07-05", signal: 1, score: 5.8, condition: 1, careActions }),
  ]);
  const pattern = summary.specific_care_patterns[0];

  assert.equal(pattern.days, 1);
  assert.equal(pattern.previous_night_days, 1);
  assert.equal(pattern.same_day_days, 1);
  assert.equal(pattern.timing_outcomes.before_peak.days, 1);
  assert.equal(pattern.timing_outcomes.after_symptom.days, 1);
  assert.deepEqual(pattern.actual_counts, { good: 0, mild: 1, hard: 0 });
});


test("record-page care stays separate from Daily Care proposals in AI input", () => {
  const input = row({
    date: "2026-07-06",
    signal: 1,
    score: 5.6,
    condition: 2,
    careActions: [
      {
        source_mode: "today",
        domain: "loosen",
        item_key: "v3:loosen:point:pc6",
        kind: "tsubo_point",
        label: "内関のツボケア",
        timing_relation: "same_day_before",
        item_snapshot: { meta: { point_code: "PC6", entry_origin: "daily_care_card" } },
      },
      {
        source_mode: "today",
        domain: "live",
        item_key: "v3:live:manual_care:custom",
        kind: "manual_care",
        label: "自分で首を温めた",
        timing_relation: "same_day_before",
        item_snapshot: { meta: { entry_origin: "record_page" } },
      },
    ],
  });

  const ai = trimRecordForAi(input);
  assert.deepEqual(ai.performed_care_items.map((item) => item.label), ["内関のツボケア"]);
  assert.deepEqual(ai.user_added_care_items.map((item) => item.label), ["自分で首を温めた"]);

  const summary = buildRecordsSummary([input]);
  assert.deepEqual(summary.specific_care_patterns.map((item) => item.label), ["内関のツボケア"]);
});
