import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getRegistrationTrialWindow,
  resolveRecordsAccess,
} from "../lib/records/accessPolicy.js";

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

test("9月登録者は10月1日から14日間、新規登録者は登録時刻から14日間体験する", () => {
  const config = { enabled: true, startsAt: "2026-10-01T00:00:00+09:00", days: 14 };
  const septemberUser = getRegistrationTrialWindow(
    Date.parse("2026-10-01T00:00:01+09:00"),
    { userCreatedAt: "2026-09-12T03:00:00Z", config },
  );
  assert.equal(septemberUser.active, true);
  assert.equal(septemberUser.days_remaining, 14);
  assert.match(septemberUser.starts_at, /^2026-09-30T15:00:00\.000Z$/);

  const octoberUser = getRegistrationTrialWindow(
    Date.parse("2026-10-10T12:00:01+09:00"),
    { userCreatedAt: "2026-10-10T03:00:00Z", config },
  );
  assert.equal(octoberUser.active, true);
  assert.match(octoberUser.starts_at, /^2026-10-10T03:00:00\.000Z$/);

  const expired = getRegistrationTrialWindow(
    Date.parse("2026-10-15T00:00:00+09:00"),
    { userCreatedAt: "2026-09-12T03:00:00Z", config },
  );
  assert.equal(expired.active, false);
  assert.equal(expired.expired, true);
});

test("14日体験中は全機能、終了後は体質・ショップ・履歴だけ残す", () => {
  const active = resolveRecordsAccess({
    beta: { active: false },
    trial: { active: true, eligible: true, days: 14, days_remaining: 7 },
    entitlement: null,
  });
  assert.equal(active.mode, "trial");
  assert.equal(active.personalized_forecast_enabled, true);
  assert.equal(active.records_write_enabled, true);
  assert.equal(active.consult_enabled, true);

  const expired = resolveRecordsAccess({
    beta: { active: false, expired: true },
    trial: { active: false, eligible: true, expired: true, days: 14, days_remaining: 0 },
    entitlement: null,
  });
  assert.equal(expired.mode, "free");
  assert.equal(expired.personalized_forecast_enabled, false);
  assert.equal(expired.records_write_enabled, false);
  assert.equal(expired.analysis_enabled, false);
  assert.equal(expired.records_history_enabled, true);
  assert.equal(expired.analysis_history_enabled, true);
  assert.equal(expired.consult_history_enabled, true);
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
  assert.match(analysis, /ケアナビAI ミモル[\s\S]*AIでこの期間を振り返る[\s\S]*次に一つだけ[\s\S]*AIを使わない基本集計[\s\S]*RecordsSimpleTrendChart/);
  assert.match(analysis, /hasAiAnalysis \? "AI振り返りの根拠と内訳" : "基本集計の内訳を見る"/);
  assert.match(paywall, /自分を把握したミモルへ相談/);
  assert.match(live, /今回ミモルが把握していること[\s\S]*今日・明日の予報[\s\S]*直近14日の記録/);
  assert.match(daily, /天気以外に気になったこと[\s\S]*（任意）/);
  assert.doesNotMatch(route, /free_chat_response|freeTrial/);
  assert.match(route, /assertQuota\(usageBefore, "chat"\)/);
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
