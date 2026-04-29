const TRIGGER_LABELS = {
  "pressure:down": "低気圧",
  "pressure:up": "気圧上昇",
  "temp:down": "冷え込み",
  "temp:up": "気温上昇",
  "humidity:up": "湿気",
  "humidity:down": "乾燥",
};

function normalizeScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(10, Math.round(n)));
}

function formatTimeForPush(value) {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  // DB time values may arrive as "14:00:00", "14:00", or an ISO-like string.
  // Push notifications should stay compact: "14:00".
  const hhmmMatch = raw.match(/(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
  if (hhmmMatch) {
    return `${hhmmMatch[1].padStart(2, "0")}:${hhmmMatch[2]}`;
  }

  return raw;
}

export function getForecastTriggerLabel(forecast) {
  const snapshot = forecast?.computed?.forecast_snapshot || {};
  const direct = snapshot.main_trigger_label || null;
  if (direct) return direct;

  const key = `${forecast?.main_trigger || ""}:${forecast?.trigger_dir || ""}`;
  return TRIGGER_LABELS[key] || "気象変化";
}

export function getPeakText(forecast) {
  const start = formatTimeForPush(forecast?.peak_start);
  const end = formatTimeForPush(forecast?.peak_end);
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
