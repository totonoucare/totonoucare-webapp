const TRIGGER_LABELS = {
  "pressure:down": "低気圧",
  "pressure:up": "気圧上昇",
  "temp:down": "冷え込み",
  "temp:up": "気温上昇",
  "humidity:up": "湿気",
  "humidity:down": "乾燥",
};

const DIRECT_LABEL_NORMALIZE = {
  "気圧が下がる日": "低気圧",
  "気圧が上がる日": "気圧上昇",
  "冷え込みやすい日": "冷え込み",
  "冷え込む日": "冷え込み",
  "気温が上がりやすい日": "気温上昇",
  "湿がこもりやすい日": "湿気",
  "湿っぽい日": "湿気",
  "乾燥しやすい日": "乾燥",
  "気象の変化がある日": "気象変化",
};

function normalizeScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(10, Math.round(n)));
}

function formatClockText(value) {
  if (!value) return null;
  const text = String(value).trim();

  // Supabaseのtime型などで返る "14:00:00" / "14:30:00" を通知向けに短くする。
  const hms = text.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (hms) return `${hms[1].padStart(2, "0")}:${hms[2]}`;

  // ISO datetime風に入ってきた場合も、時刻部分だけを使う。
  const isoTime = text.match(/T(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
  if (isoTime) return `${isoTime[1].padStart(2, "0")}:${isoTime[2]}`;

  return text;
}

function normalizeTriggerLabel(label) {
  if (!label) return null;
  return DIRECT_LABEL_NORMALIZE[label] || label;
}

export function getForecastTriggerLabel(forecast) {
  const snapshot = forecast?.computed?.forecast_snapshot || {};
  const direct = normalizeTriggerLabel(snapshot.main_trigger_label || null);
  if (direct) return direct;

  const key = `${forecast?.main_trigger || ""}:${forecast?.trigger_dir || ""}`;
  return TRIGGER_LABELS[key] || "気象変化";
}

export function getPeakText(forecast) {
  const start = formatClockText(forecast?.peak_start);
  const end = formatClockText(forecast?.peak_end);
  if (start && end) return `${start}〜${end}`;
  if (start) return `${start}ごろ`;
  return null;
}

export function buildRadarPushPayload({ kind, forecast, targetDate }) {
  const score = normalizeScore(forecast?.score_0_10);
  const triggerLabel = getForecastTriggerLabel(forecast);
  const peak = getPeakText(forecast);
  const url = `/radar?date=${encodeURIComponent(targetDate)}`;

  if (kind === "night") {
    return {
      title: `明日はスコア${score}の警戒日です`,
      body: peak
        ? `${triggerLabel}の影響で、${peak}は崩れやすい予報。今夜は早めに整えておくのがおすすめです。`
        : `${triggerLabel}の影響が出やすい予報。今夜は早めに整えておくのがおすすめです。`,
      url,
      tag: `mibyo-radar-night-${targetDate}`,
      data: {
        kind,
        target_date: targetDate,
        forecast_id: forecast?.id || null,
      },
    };
  }

  return {
    title: `今日はスコア${score}の警戒日です`,
    body: peak
      ? `${peak}は${triggerLabel}の影響に注意。無理を詰め込みすぎず、早めのケアを意識しましょう。`
      : `${triggerLabel}の影響に注意。無理を詰め込みすぎず、早めのケアを意識しましょう。`,
    url,
    tag: `mibyo-radar-morning-${targetDate}`,
    data: {
      kind,
      target_date: targetDate,
      forecast_id: forecast?.id || null,
    },
  };
}

