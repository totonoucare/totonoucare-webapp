// components/records/reviewConfig.js
export const CONDITION_OPTIONS = [
  { value: 0, label: "つらかった" },
  { value: 1, label: "少しつらかった" },
  { value: 2, label: "ほぼ平気" },
];

export const PREVENT_OPTIONS = [
  { value: 0, label: "あまりできなかった" },
  { value: 1, label: "ある程度できた" },
  { value: 2, label: "かなりできた" },
];

export const ACTION_TAG_OPTIONS = [
  { value: "tsubo", label: "ツボをした" },
  { value: "food", label: "食事を意識した" },
  { value: "rest", label: "早めに休んだ" },
  { value: "warm", label: "冷やさないようにした" },
  { value: "hydrate", label: "水分を意識した" },
  { value: "nothing", label: "特に何もしなかった" },
];

export function labelForValue(options, value, fallback = "—") {
  const hit = options.find((opt) => Number(opt.value) === Number(value));
  return hit?.label || fallback;
}

export function conditionLabel(value) {
  return labelForValue(CONDITION_OPTIONS, value);
}

export function preventLabel(value) {
  return labelForValue(PREVENT_OPTIONS, value);
}

export function actionTagLabel(tag) {
  return ACTION_TAG_OPTIONS.find((opt) => opt.value === tag)?.label || tag;
}

export function signalLabel(signal) {
  if (signal === 2) return "要警戒";
  if (signal === 1) return "注意";
  return "安定";
}

export function signalBadgeClass(signal) {
  if (signal === 2) return "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200";
  if (signal === 1) return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200";
  return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200";
}

export function triggerLabel(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "気圧低下";
  if (mainTrigger === "pressure" && triggerDir === "up") return "気圧上昇";
  if (mainTrigger === "temp" && triggerDir === "down") return "冷え";
  if (mainTrigger === "temp" && triggerDir === "up") return "暑さ";
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿度";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

export function formatDateLabel(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`;
}
