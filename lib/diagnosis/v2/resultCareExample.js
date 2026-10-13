import { buildBaseCarePreferences } from "./carePreferences";
import {
  foodCombinationDetail,
  selectFoodCombinations,
} from "../../radar_v1/careRules/foodTcm";

export const RESULT_CARE_EXAMPLE_VERSION = "result_care_example_v96_2026-10-13";

// Keep the example tied to this check, including its season. Opening the same
// result on another day must not turn it into a different daily forecast.
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
  // Incomplete/loading/obsolete results do not get a made-up neutral example.
  if (!computed?.core_code) return null;

  const symptom = symptomKey || answers?.symptom_focus || computed?.symptom_focus || "fatigue";
  const preferences = carePreferences || buildBaseCarePreferences({ answers, computed, symptomKey: symptom });
  const subLabels = Array.isArray(computed?.sub_labels) ? [...computed.sub_labels] : [];
  const thermal = computed?.axes?.thermo_answer;
  if (thermal === "cold" || thermal === "mixed") subLabels.push("cold_pattern");
  if (thermal === "heat" || thermal === "mixed") subLabels.push("heat_pattern");
  const split = computed?.split_scores || {};
  const material = computed?.material_scores || {
    qi_deficiency: split?.qi?.deficiency,
    qi_stagnation: split?.qi?.stagnation,
    blood_deficiency: split?.blood?.deficiency,
    blood_stasis: split?.blood?.stasis,
    fluid_deficiency: split?.fluid?.deficiency,
    fluid_damp: split?.fluid?.damp,
  };
  const targetDate = resultCareExampleDate(createdAt);
  const options = {
    targetDate,
    symptomFocus: symptom,
    subLabels,
    mode: "today",
    theme: {
      sub_labels: subLabels,
      symptom_focus: symptom,
      policies: preferences.items || [],
      constitution_profile: {
        available: Object.values(material).some((value) => Number(value) > 0),
        material,
        score_scale: computed?.score_scale || split?.scale || null,
      },
      // No measured weather, location or actual consumption history is assumed.
      signal: 0,
      trigger_key: null,
      secondary_trigger_key: null,
    },
  };
  const selected = selectFoodCombinations(options)[0];
  const proposal = foodCombinationDetail(selected, options);
  return {
    ...proposal,
    example_version: RESULT_CARE_EXAMPLE_VERSION,
    short_reason: proposal.public_reason.split("。")[0] + "。",
    basis_label: "体質チェックの結果に合わせた食事の例です。",
  };
}
