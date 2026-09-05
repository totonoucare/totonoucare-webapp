const FIRST_RECORD_SAVE_SOURCES = new Set([
  "reconstructed_at_first_record_save",
  "saved_at_record_from_radar_rules",
]);

export function displayedCareUsageNote(source) {
  if (FIRST_RECORD_SAVE_SOURCES.has(source)) {
    return "初回記録時に同じルールで再構成した参考ケア。本人が当時閲覧・実行した事実とは扱わない。";
  }
  if (source === "reconstructed_from_complete_risk_context") {
    return "現在の体調予報画面と同じ計算によるケア。本人が閲覧・実行した事実とは扱わず、追加案はミモルの応用案と明記して区別する。";
  }
  return "由来を確認できない参考ケア。本人が画面で閲覧・実行した事実とは扱わない。";
}

export function normalizeDisplayedCareForAi(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    ...value,
    usage_note: displayedCareUsageNote(value.source),
  };
}
