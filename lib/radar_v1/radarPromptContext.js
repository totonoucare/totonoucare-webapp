// lib/radar_v1/radarPromptContext.js
import {
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
  SYMPTOM_LABELS,
} from "@/lib/diagnosis/v2/labels";

const ORGAN_LABELS = {
  liver: "肝",
  spleen: "脾",
  kidney: "腎",
};

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export function buildRadarPromptContext({ riskContext, radarPlan }) {
  const coreCode = riskContext?.constitution_context?.core_code || "";
  const subLabelCodes = safeArray(riskContext?.constitution_context?.sub_labels);
  const symptomFocus = riskContext?.constitution_context?.symptom_focus || null;
  const organFocus = safeArray(riskContext?.tcm_context?.organ_focus);

  const core = getCoreLabel(coreCode);
  const subs = getSubLabels(subLabelCodes);

  const primaryMeridianCode =
    riskContext?.constitution_context?.primary_meridian || null;
  const secondaryMeridianCode =
    riskContext?.constitution_context?.secondary_meridian || null;

  const primaryMeridian = primaryMeridianCode
    ? getMeridianLine(primaryMeridianCode)
    : null;
  const secondaryMeridian = secondaryMeridianCode
    ? getMeridianLine(secondaryMeridianCode)
    : null;

  return {
    app_context: {
      app_name: "未病レーダー",
      app_purpose:
        "気象と体質の重なりから、明日の崩れやすさと先回りセルフケアを提案するアプリ。",
      audience:
        "一般ユーザー。専門用語を出しすぎず、短くても納得できる説明が必要。",
      style:
        "やさしいが甘すぎない。脅さない。診断や治療の断定はしない。",
    },

    constitution: {
      core: {
        code: coreCode,
        title: core?.title || null,
        short: core?.short || null,
        tcm_hint: core?.tcm_hint || null,
      },
      sub_labels: subs.map((s) => ({
        code: s.code,
        title: s.title,
        short: s.short,
        action_hint: s.action_hint,
      })),
      symptom_focus: symptomFocus,
      symptom_focus_label: symptomFocus ? SYMPTOM_LABELS[symptomFocus] || symptomFocus : null,
      organ_focus: organFocus.map((code) => ({
        code,
        label: ORGAN_LABELS[code] || code,
      })),
      primary_meridian: primaryMeridianCode
        ? {
            code: primaryMeridianCode,
            title: primaryMeridian?.title || null,
            body_area: primaryMeridian?.body_area || null,
            meridians: primaryMeridian?.meridians || [],
            organs_hint: primaryMeridian?.organs_hint || null,
          }
        : null,
      secondary_meridian: secondaryMeridianCode
        ? {
            code: secondaryMeridianCode,
            title: secondaryMeridian?.title || null,
            body_area: secondaryMeridian?.body_area || null,
            meridians: secondaryMeridian?.meridians || [],
            organs_hint: secondaryMeridian?.organs_hint || null,
          }
        : null,
    },

    forecast: {
      score_0_10: riskContext?.target?.score_0_10 ?? null,
      signal_label: riskContext?.target?.signal_label || null,
      main_trigger: riskContext?.summary?.main_trigger || null,
      trigger_dir: riskContext?.summary?.trigger_dir || null,
      main_trigger_label: riskContext?.summary?.main_trigger_label || null,
      peak_start: riskContext?.summary?.peak_start || null,
      peak_end: riskContext?.summary?.peak_end || null,
      care_tone: riskContext?.care_tone || null,
      risk_factors: safeArray(riskContext?.risk_factors),
    },

    tcm_context: {
      primary_label: riskContext?.tcm_context?.primary_label || null,
      secondary_label: riskContext?.tcm_context?.secondary_label || null,
      primary_actions: safeArray(riskContext?.tcm_context?.primary_actions),
      secondary_actions: safeArray(riskContext?.tcm_context?.secondary_actions),
      need_abdomen: !!riskContext?.tcm_context?.need_abdomen,
      abdomen_choice: riskContext?.tcm_context?.abdomen_choice || null,
    },

    mtest_context: {
      selected_line: riskContext?.mtest_context?.selected_line || null,
      selected_from: riskContext?.mtest_context?.selected_from || null,
      mode: riskContext?.mtest_context?.mode || null,
      mode_reason: riskContext?.mtest_context?.mode_reason || null,
    },

    tsubo_set: {
      points:
        radarPlan?.tonight?.tsubo_set?.points?.map((p) => ({
          code: p.code,
          name_ja: p.name_ja,
          source: p.source,
          point_region: p.point_region,
        })) || [],
    },

    current_food_plan: radarPlan?.tomorrow_food || null,
  };
}
