// Legacy forecast text can remain in saved snapshots after UI terminology changes.
// Normalize only presentation language; storage keys such as peak_start, peak_end,
// and before_peak remain unchanged for compatibility.
export function normalizeForecastTimingLanguage(value) {
  const raw = String(value || "");
  if (!raw) return "";

  return raw
    .replaceAll("崩れやすい時間帯", "天気ストレスが強まる時間帯")
    .replaceAll("響きやすい時間帯", "天気ストレスが強まる時間帯")
    .replaceAll("注意時間帯", "天気ストレスが強まる時間帯")
    .replaceAll("注意時間の前に", "天気ストレスのピーク前に")
    .replaceAll("注意時間の前", "天気ストレスのピーク前")
    .replaceAll("注意時間前", "天気ストレスのピーク前")
    .replaceAll("注意時間に向けて", "天気ストレスが強まる前に")
    .replaceAll("このあとの注意時間", "このあとの天気ストレス")
    .replaceAll("注意時間", "天気ストレスのピーク")
    .replaceAll("天気負荷", "天気ストレス");
}
