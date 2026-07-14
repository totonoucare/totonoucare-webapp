import { buildRecordsSummary } from "@/lib/records/analysis";

export const EKIKEN_NAME = "EKIKEN";
export const EKIKEN_READING = "エキケン";
export const EKIKEN_DISPLAY_NAME = `${EKIKEN_NAME}（${EKIKEN_READING}）`;
export const LIVE_SUPPORT_THREAD_KIND = "live_support";
export const LIVE_SUPPORT_PERIOD_KEY = "live_support";

export const LIVE_SUPPORT_QUICK_PROMPTS = [
  "今、つらい症状がある",
  "今日のケアを一緒に選びたい",
  "なんとなく調子が悪い",
  "受診した方がよいか迷っている",
];

function conditionLevel(row) {
  const value = Number(row?.review?.condition_level);
  return Number.isFinite(value) ? value : null;
}

function signalLevel(row) {
  const value = Number(row?.forecast?.signal);
  return Number.isFinite(value) ? value : 0;
}

export function buildLiveSupportGreeting({ todayRow = null, yesterdayRow = null, hour = 12 } = {}) {
  const yesterdayCondition = conditionLevel(yesterdayRow);
  const todaySignal = signalLevel(todayRow);
  const careCount = Array.isArray(todayRow?.care_actions) ? todayRow.care_actions.length : 0;

  if (yesterdayCondition === 2) {
    return "昨日はつらい記録でしたね。その後の調子を、一言からでも聞かせてください。";
  }
  if (careCount > 0) {
    return "今日は対策ケアを取り入れられたんですね。その後の調子はどうですか？";
  }
  if (todaySignal === 2) {
    return "今日は守りの予報です。今つらいことや、無理しそうなことはありますか？";
  }
  if (todaySignal === 1) {
    return "今日は少しゆらぎやすい日です。無理する前に、今の調子を話してみませんか？";
  }
  if (Number(hour) >= 20 || Number(hour) < 5) {
    return "今日もお疲れさまです。寝る前に、気になっていることを少し話していきませんか？";
  }
  return "今の調子はどうですか？小さな違和感でも、まとまっていなくても大丈夫です。";
}

export function buildLiveRecentSummary(rows = []) {
  const summary = buildRecordsSummary(rows);
  return {
    recorded_days: summary.recorded_days || 0,
    good_days: summary.good_days || 0,
    difficult_days: summary.difficult_days || 0,
    care_days: summary.care_days || 0,
    previous_night_care_days: summary.previous_night_care_days || 0,
    same_day_care_days: summary.same_day_care_days || 0,
    top_difficult_triggers: (summary.top_difficult_triggers || []).slice(0, 3),
    domain_counts: summary.domain_counts || {},
    factor_counts: summary.factor_counts || {},
  };
}

export function selectLiveDetailRows(rows = [], today) {
  return (rows || [])
    .filter((row) => row?.date && (!today || row.date <= today))
    .slice(-3);
}
