import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { applyFreeConsultTrialAccess } from "../lib/records/accessPolicy.js";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const analysisSource = await source("lib/records/analysis.js");
const analysisModule = await import(
  `data:text/javascript;base64,${Buffer.from(analysisSource).toString("base64")}`
);
const { buildActionTags, buildCompactChartPoints } = analysisModule;

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function chartRow(date, index = 0) {
  const signal = index % 3;
  const condition = [2, 1, 0][signal];
  const timing = index % 2 ? "after_symptom" : "before_peak";
  return {
    date,
    forecast: {
      id: `forecast-${date}`,
      target_date: date,
      signal,
      score_precise_0_10: [2.5, 5.5, 8][signal],
      personal_main_trigger_exact: index % 2 ? "damp" : "pressure_down",
    },
    care_actions: [{ id: `care-${date}`, domain: "loosen" }],
    review: {
      condition_level: condition,
      prevent_level: 2,
      care_domains: ["loosen"],
      care_timing: timing,
      context_factors: [],
      action_tags: buildActionTags({ domains: ["loosen"], timing }),
    },
  };
}

const lockedAccess = {
  mode: "free",
  entitled: false,
  beta_enabled: false,
  consult_enabled: false,
  consult_requires_subscription: true,
};

test("無料Ekken相談は3日記録後に生涯2回答だけ開く", () => {
  const before = applyFreeConsultTrialAccess(lockedAccess, { used: 0, recordedDays: 2 });
  assert.equal(before.consult_enabled, false);
  assert.equal(before.consult_access_mode, "trial_locked");
  assert.equal(before.consult_trial.records_needed, 1);

  const ready = applyFreeConsultTrialAccess(lockedAccess, { used: 1, recordedDays: 3 });
  assert.equal(ready.consult_enabled, true);
  assert.equal(ready.consult_access_mode, "trial");
  assert.equal(ready.consult_trial.remaining, 1);

  const exhausted = applyFreeConsultTrialAccess(lockedAccess, { used: 2, recordedDays: 8 });
  assert.equal(exhausted.consult_enabled, false);
  assert.equal(exhausted.consult_access_mode, "trial_exhausted");
  assert.equal(exhausted.consult_history_enabled, true);
});

test("有料・先行体験の相談回数は無料体験ルールで変えない", () => {
  const paid = applyFreeConsultTrialAccess({
    ...lockedAccess,
    mode: "paid",
    entitled: true,
    consult_enabled: true,
    consult_requires_subscription: false,
  }, { used: 2, recordedDays: 0 });
  assert.equal(paid.consult_enabled, true);
  assert.equal(paid.consult_access_mode, "paid");
  assert.equal(paid.consult_trial, null);

  const beta = applyFreeConsultTrialAccess({
    ...lockedAccess,
    mode: "beta",
    beta_enabled: true,
    consult_enabled: true,
    consult_requires_subscription: false,
  }, { used: 2, recordedDays: 0 });
  assert.equal(beta.consult_access_mode, "beta");
  assert.equal(beta.consult_trial, null);
});

test("直感グラフは7日を日別、30日を週区切り、長期を月別にまとめる", () => {
  const sevenRows = Array.from({ length: 7 }, (_, index) => chartRow(ymd(2026, 8, 1 + index), index));
  const thirtyRows = Array.from({ length: 30 }, (_, index) => chartRow(ymd(2026, 8, 1 + index), index));
  const longRows = [
    chartRow("2026-01-05", 0),
    chartRow("2026-01-20", 1),
    chartRow("2026-02-08", 2),
    chartRow("2026-03-03", 3),
  ];

  assert.equal(buildCompactChartPoints(sevenRows, 7).length, 7);
  assert.equal(buildCompactChartPoints(thirtyRows, 30).length, 5);
  assert.deepEqual(buildCompactChartPoints(longRows, 90).map((point) => point.label), ["1月", "2月", "3月"]);
});

test("記録・振り返り・相談の情報階層と課金価値を画面へ反映する", async () => {
  const [records, analysis, paywall, live, daily, route] = await Promise.all([
    source("components/records/RecordsPageClient.jsx"),
    source("components/records/AiAnalysisPanel.jsx"),
    source("components/billing/SubscriptionPaywall.jsx"),
    source("components/records/LiveSupportPanel.jsx"),
    source("components/records/DailyRecordCard.jsx"),
    source("app/api/records/live-chat/route.js"),
  ]);

  assert.match(records, /key: "analysis", label: "振り返り"/);
  assert.match(records, /normalized === "consult"[\s\S]*loadFeatureAccess\(\)/);
  assert.match(records, /setMonthRows[\s\S]*loadFeatureAccess\(\)[\s\S]*return nextRow/);
  assert.match(analysis, /ケアナビAI Ekken[\s\S]*AIでこの期間を振り返る[\s\S]*次に一つだけ[\s\S]*AIを使わない基本集計[\s\S]*RecordsSimpleTrendChart/);
  assert.match(analysis, /hasAiAnalysis \? "AI振り返りの根拠と内訳" : "基本集計の内訳を見る"/);
  assert.match(paywall, /自分を把握したEkkenへ相談/);
  assert.match(live, /今回Ekkenが把握していること[\s\S]*今日・明日の予報[\s\S]*直近14日の記録/);
  assert.match(daily, /天気以外に気になったこと[\s\S]*（任意）/);
  assert.match(route, /free_chat_response/);
  assert.match(route, /if \(!freeTrial\) assertQuota\(usageBefore, "chat"\)/);
  assert.match(route, /consult_history_enabled/);
});

test("AI未実行時と保存済みAI結果を分け、期間が進んでも前回結果と会話を引き継ぐ", async () => {
  const [panel, analysisRoute, threadsRoute, chatRoute] = await Promise.all([
    source("components/records/AiAnalysisPanel.jsx"),
    source("app/api/records/analysis/route.js"),
    source("app/api/records/threads/route.js"),
    source("app/api/records/chat/route.js"),
  ]);

  assert.match(panel, /const hasAiAnalysis = Boolean/);
  assert.match(panel, /ボタンを押したときだけAIを使います。タブを開くだけでは回数を使いません/);
  assert.match(panel, /結果は自動で消えません。新しい記録を含めたいときだけ更新してください/);
  assert.match(panel, /hasAiAnalysis && displayedAnalysis\.hypotheses/);
  assert.match(panel, /この見立ての理由：/);

  const latestLookup = analysisRoute.slice(
    analysisRoute.indexOf("async function findLatestAnalysis"),
    analysisRoute.indexOf("function algorithmResponse")
  );
  assert.match(latestLookup, /\.eq\("period_key", key\)/);
  assert.doesNotMatch(latestLookup, /\.eq\("range_start"|\.eq\("range_end"/);
  assert.match(analysisRoute, /period_advanced_since_saved_analysis/);
  assert.match(analysisRoute, /analysis_range: \{ start: latest\.range_start, end: latest\.range_end \}/);

  assert.match(threadsRoute, /previousThreads[\s\S]*\.eq\("period_key", periodKey\)[\s\S]*carried_over/);
  assert.match(chatRoute, /previous[\s\S]*\.eq\("period_key", periodKey\)[\s\S]*if \(previous\?\.\[0\]\) return previous\[0\]/);
  assert.match(chatRoute, /thread_period_mismatch/);
  assert.doesNotMatch(chatRoute, /thread_range_mismatch/);
});

test("機能名を体調予報・体調警戒度・振り返りへ統一する", async () => {
  const functionalSources = await Promise.all([
    "app/HomeClient.jsx",
    "app/guide/GuideClient.jsx",
    "app/settings/page.js",
    "components/records/AiAnalysisPanel.jsx",
    "components/records/RecordsPageClient.jsx",
    "components/records/RecordsTrendChart.jsx",
    "components/records/RecordsSimpleTrendChart.jsx",
    "components/records/ExpertConsultPreview.jsx",
    "lib/records/aiPrompts.js",
    "lib/records/forecastReasoning.js",
  ].map(source));
  const joined = functionalSources.join("\n");
  assert.doesNotMatch(joined, /体調ゆらぎ予報|体調ゆらぎ度|AI分析/);
  assert.match(joined, /体調予報/);
  assert.match(joined, /体調警戒度/);
  assert.match(joined, /振り返り/);
});
