const TRIGGER_LABELS = {
  "pressure:down": "低気圧",
  "pressure:up": "気圧上昇",
  "temp:down": "気温低下",
  "temp:up": "気温上昇",
  "temp:change": "寒暖差",
  "humidity:up": "湿気",
  "humidity:down": "乾燥",
};

const DIRECT_LABEL_NORMALIZE = {
  "気圧が下がる日": "低気圧",
  "気圧が上がる日": "気圧上昇",
  "冷え込みやすい日": "気温低下",
  "冷え込む日": "気温低下",
  "気温が上がりやすい日": "気温上昇",
  // v7.78.18以前に保存された表示名も、現在の「寒暖差」へ正規化する。
  "気温差が大きい日": "寒暖差",
  "寒暖差が大きい日": "寒暖差",
  "湿がこもりやすい日": "湿気",
  "湿っぽい日": "湿気",
  "乾燥しやすい日": "乾燥",
  "気象の変化がある日": "気象変化",
};

export function normalizePushTimeText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;

  // Supabaseのtime型で返る "14:00:00" / "14:30:00" を通知向けに短くする。
  const hms = text.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:[+-]\d{2}:?\d{2})?$/);
  if (hms) return `${hms[1].padStart(2, "0")}:${hms[2]}`;

  // ISO datetime風に入ってきた場合も、時刻部分だけを使う。
  const isoTime = text.match(/T(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
  if (isoTime) return `${isoTime[1].padStart(2, "0")}:${isoTime[2]}`;

  // 念のため、文中に残った HH:MM:SS も HH:MM に丸める。
  return text.replace(/\b(\d{1,2}:\d{2}):\d{2}(?:\.\d+)?\b/g, "$1");
}

export function stripPushTimeSeconds(text) {
  if (text == null) return text;
  return String(text).replace(/\b(\d{1,2}:\d{2}):\d{2}(?:\.\d+)?\b/g, "$1");
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
  const start = normalizePushTimeText(forecast?.peak_start);
  const end = normalizePushTimeText(forecast?.peak_end);
  if (start && end) return `${start}〜${end}`;
  if (start) return `${start}ごろ`;
  return null;
}

export function buildRadarPushPayload({ kind, forecast, targetDate }) {
  const triggerLabel = getForecastTriggerLabel(forecast);
  const peak = getPeakText(forecast);
  const url = `/radar?date=${encodeURIComponent(targetDate)}`;

  const payload = kind === "night"
    ? {
        title: "明日は天気の影響が強めの日です",
        body: peak
          ? `${triggerLabel}の影響で、${peak}は崩れ方が出やすい予報。今夜は早めに整えておくのがおすすめです。`
          : `${triggerLabel}の影響が強めに出やすい予報。今夜は早めに整えておくのがおすすめです。`,
        url,
        tag: `mibyo-radar-night-${targetDate}`,
        data: {
          kind,
          target_date: targetDate,
          forecast_id: forecast?.id || null,
        },
      }
    : {
        title: "今日は天気の影響が強めの日です",
        body: peak
          ? `${peak}は${triggerLabel}の影響を受けやすい時間帯。無理を詰め込みすぎず、早めのケアを意識しましょう。`
          : `${triggerLabel}の影響を受けやすい日。無理を詰め込みすぎず、早めのケアを意識しましょう。`,
        url,
        tag: `mibyo-radar-morning-${targetDate}`,
        data: {
          kind,
          target_date: targetDate,
          forecast_id: forecast?.id || null,
        },
      };

  // 最終防衛線。通知本文に秒桁が残った場合も、必ず HH:MM にする。
  return {
    ...payload,
    title: stripPushTimeSeconds(payload.title),
    body: stripPushTimeSeconds(payload.body),
  };
}
