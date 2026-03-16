// lib/radar_v1/radarPromptContext.js

const CORE_CODE_DESCRIPTIONS = {
  accel_batt_small:
    "アクセル型で余力小。上にのぼりやすさや張りを持ちつつ、土台は消耗しやすい。頑張るほど崩れやすい。",
  accel_batt_large:
    "アクセル型で余力大。動けるが、張りや偏りが強まると急に崩れやすい。",
  brake_batt_small:
    "ブレーキ型で余力小。冷えや重さ、停滞が出やすく、回復にも時間がかかりやすい。",
  brake_batt_large:
    "ブレーキ型で余力大。重さや滞りはあるが、立て直す余地は比較的ある。",
};

const SUB_LABEL_DESCRIPTIONS = {
  qi_deficiency: "気虚。エネルギー不足で、疲れやすく支えが弱い。",
  qi_stagnation: "気滞。張り、つかえ、詰まり、切り替えの悪さが出やすい。",
  blood_deficiency: "血虚。うるおいと栄養が不足し、こわばりや不安定さが出やすい。",
  blood_stasis: "瘀血。巡りの悪さ、固定的な張りや痛みが出やすい。",
  fluid_deficiency: "津液不足。乾き、のぼせ、回復しにくさが出やすい。",
  fluid_damp: "湿。重だるさ、むくみ、頭重感、停滞が出やすい。",
};

const SYMPTOM_LABELS = {
  fatigue: "疲れやすさ",
  sleep: "睡眠",
  mood: "気分",
  neck_shoulder: "首肩",
  low_back_pain: "腰",
  swelling: "むくみ",
  headache: "頭痛",
  dizziness: "めまい",
};

const ORGAN_LABELS = {
  liver: "肝",
  spleen: "脾",
  kidney: "腎",
};

export function buildRadarPromptContext({ riskContext, radarPlan }) {
  const coreCode = riskContext?.constitution_context?.core_code || "";
  const subLabels = Array.isArray(riskContext?.constitution_context?.sub_labels)
    ? riskContext.constitution_context.sub_labels
    : [];
  const symptomFocus = riskContext?.constitution_context?.symptom_focus || null;
  const organFocus = Array.isArray(riskContext?.tcm_context?.organ_focus)
    ? riskContext.tcm_context.organ_focus
    : [];

  return {
    app_context: {
      app_name: "未病レーダー",
      app_purpose:
        "気象と体質の重なりから、明日の崩れやすさと先回りセルフケアを提案するアプリ。",
      audience:
        "一般ユーザー。東洋医学の専門用語を最小限にしつつ、納得感のある短文が必要。",
      style:
        "やさしいが甘すぎない。断定や脅しは避ける。医療判断や診断の断定はしない。",
    },

    constitution: {
      core_code: coreCode,
      core_description:
        CORE_CODE_DESCRIPTIONS[coreCode] ||
        "体質の偏りと余力のバランスに特徴がある。",
      sub_labels: subLabels.map((code) => ({
        code,
        description:
          SUB_LABEL_DESCRIPTIONS[code] || "体質の偏りを示す補助ラベル。",
      })),
      symptom_focus: symptomFocus,
      symptom_focus_label: symptomFocus ? SYMPTOM_LABELS[symptomFocus] || symptomFocus : null,
      organ_focus: organFocus.map((code) => ({
        code,
        label: ORGAN_LABELS[code] || code,
      })),
      primary_meridian: riskContext?.constitution_context?.primary_meridian || null,
      secondary_meridian: riskContext?.constitution_context?.secondary_meridian || null,
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
      risk_factors: riskContext?.risk_factors || [],
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
