import { buildBaseCarePreferences } from "./carePreferences";
import { buildMeridianLineCare } from "../../radar_v1/careRules/dailyCareV2";
import { getCareMovementImage } from "../../radar_v1/careMovementImages";

export const RESULT_CARE_EXAMPLE_VERSION = "result_loosen_example_v98_2026-10-14";

// Keep this example tied to the check. Reopening it must not turn the result
// into a new daily forecast or change the action on a later viewing day.
export function resultCareExampleDate(createdAt) {
  const stamp = typeof createdAt === "string" ? Date.parse(createdAt) : NaN;
  if (!Number.isFinite(stamp)) return "2026-08-31";
  return new Date(stamp + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function buildResultCareExample({
  answers = {},
  computed = {},
  symptomKey = null,
  createdAt = null,
  carePreferences = null,
} = {}) {
  if (!computed?.core_code) return null;

  const symptom = symptomKey || answers?.symptom_focus || computed?.symptom_focus || "fatigue";
  const preferences = carePreferences || buildBaseCarePreferences({ answers, computed, symptomKey: symptom });
  const targetDate = resultCareExampleDate(createdAt);
  const subLabels = Array.isArray(computed.sub_labels)
    ? [...new Set(computed.sub_labels.map(value => typeof value === "object" ? value?.code : value).filter(Boolean))]
    : [];
  const theme = {
    mode: "today",
    target_date: targetDate,
    // Weather answers remain preferences. No measured weather, location,
    // forecast load or actual execution history is assumed in this example.
    trigger_key: "none",
    secondary_trigger_key: null,
    signal: 0,
    stimulus: String(computed.core_code).includes("batt_small") ? "弱め・短め" : "軽く一度",
    policies: preferences.items || [],
    core_code: computed.core_code,
    sub_labels: subLabels,
    symptom_focus: symptom,
    primary_meridian: computed.primary_meridian || null,
    secondary_meridian: computed.secondary_meridian || null,
  };
  const line = buildMeridianLineCare({ theme });
  if (!line) return null;

  const checkPrompt = line.care_kind === "breath"
    ? "息を吐く前後で、肩や手を当てた場所の力みが変わるか確かめてみてください。"
    : line.care_kind === "movement"
      ? "動かす前後で、その場所のこわばりや動かしやすさが変わるか確かめてみてください。"
      : "触れる前後で、その場所の張りや重さの感じが変わるか確かめてみてください。";
  return {
    id: line.id,
    kind: "line_care",
    title: line.title,
    action: line.action,
    image: getCareMovementImage(line.id),
    short_reason: line.selection_reason,
    public_reason: line.reason,
    guidance: `${line.guidance_note.replace(/^今日は/, "")}痛みが出る時は中止してください。`,
    check_prompt: checkPrompt,
    meridian_code: line.meridian_code,
    line_label: line.line_label,
    selection_basis: {
      ...line.selection_basis,
      target_date: targetDate,
      signal: 0,
      trigger_key: null,
      secondary_trigger_key: null,
    },
    example_version: RESULT_CARE_EXAMPLE_VERSION,
    basis_label: "体質チェックの結果に合わせた、ほぐすケアの例です。",
  };
}
