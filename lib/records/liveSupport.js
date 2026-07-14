import { buildRecordsSummary } from "@/lib/records/analysis";
export { buildLiveSupportGreeting } from "@/lib/records/liveSupportGreeting";

export const EKIKEN_NAME = "Ekiken";
export const EKIKEN_READING = "エキケン";
export const EKIKEN_DISPLAY_NAME = `${EKIKEN_NAME}（${EKIKEN_READING}）`;
export const LIVE_SUPPORT_THREAD_KIND = "live_support";
export const LIVE_SUPPORT_PERIOD_KEY = "live_support";

export const LIVE_SUPPORT_CONSULTATION_STATUS_OPTIONS = [
  { key: "not_consulted", label: "この不調はまだ相談していない" },
  { key: "medical_consulting", label: "医療機関に相談・検査中" },
  { key: "checked_no_major_issue", label: "検査では大きな異常なしと言われた" },
  { key: "medical_treatment", label: "医療機関で治療中" },
  { key: "other_professional", label: "鍼灸院・治療院などに相談中" },
  { key: "prefer_not_to_say", label: "今は登録しない" },
];

const CONSULTATION_STATUS_KEYS = new Set(
  LIVE_SUPPORT_CONSULTATION_STATUS_OPTIONS.map((item) => item.key)
);

export function normalizeConsultationStatus(value) {
  const key = String(value || "").trim();
  return CONSULTATION_STATUS_KEYS.has(key) ? key : "";
}

export function consultationStatusLabel(value) {
  const key = normalizeConsultationStatus(value);
  return LIVE_SUPPORT_CONSULTATION_STATUS_OPTIONS.find((item) => item.key === key)?.label || "";
}

export const LIVE_SUPPORT_QUICK_PROMPTS = [
  "今、つらい症状がある",
  "今日のケアを一緒に選びたい",
  "なんとなく調子が悪い",
  "受診した方がよいか迷っている",
];

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
