const ACTION_KEYS = [
  "tool-arm-support",
  "tool-screen-height",
  "tool-carry-distribution",
  "tool-work-height",
  "tool-foot-support",
  "tool-light-zone",
  "tool-back-support",
  "tool-leg-rest",
  "tool-side-sleep-support",
  "tool-facing-layout",
  "tool-sound-zone",
];

const ACTION_KEY_SET = new Set(ACTION_KEYS);

// 予報の shop_context とショップ検索で共有する唯一の許可リスト。
// 身体操作の tension-* は商品へ直結させず、環境調整の tool-* だけを通す。
export const LIFESTYLE_SHOP_ACTION_KEYS = Object.freeze([...ACTION_KEYS]);

export function normalizeLifestyleShopActionKey(value) {
  const key = String(value || "").trim();
  return ACTION_KEY_SET.has(key) ? key : "";
}

export function normalizeLifestyleShopItemRole(value) {
  const role = String(value || "").trim();
  return /^[a-z][a-z0-9_]{1,48}$/.test(role) ? role : "";
}
