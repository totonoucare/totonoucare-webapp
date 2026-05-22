// lib/radar_v1/careRules/todayTsuboRules.js
import { SYMPTOM_LABELS, TRIGGER_LABELS } from "./phrases";

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

const TODAY_POINT_LIBRARY = {
  LI4: {
    code: "LI4",
    name_ja: "合谷",
    reading_ja: "ごうこく",
    body_region: "hand",
    point_region: "limb",
    meridian_code: "li",
    image_path: "points/LI4.webp",
    tags_symptom: ["headache", "neck_shoulder", "mood"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "move_blood"],
    organ_focus: ["liver"],
  },
  LR3: {
    code: "LR3",
    name_ja: "太衝",
    reading_ja: "たいしょう",
    body_region: "foot_dorsum",
    point_region: "limb",
    meridian_code: "lr",
    image_path: "points/LR3.webp",
    tags_symptom: ["headache", "mood", "neck_shoulder"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "soothe_liver"],
    organ_focus: ["liver"],
  },
  GB20: {
    code: "GB20",
    name_ja: "風池",
    reading_ja: "ふうち",
    body_region: "neck_base",
    point_region: "head_neck",
    meridian_code: "gb",
    image_path: "points/GB20.webp",
    tags_symptom: ["headache", "dizziness", "neck_shoulder"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "move_blood"],
    organ_focus: ["liver"],
  },
  PC6: {
    code: "PC6",
    name_ja: "内関",
    reading_ja: "ないかん",
    body_region: "forearm_inner",
    point_region: "limb",
    meridian_code: "pc",
    image_path: "points/PC6.webp",
    tags_symptom: ["sleep", "mood", "dizziness"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "soothe_liver"],
    organ_focus: ["liver", "kidney"],
  },
  ST36: {
    code: "ST36",
    name_ja: "足三里",
    reading_ja: "あしさんり",
    body_region: "leg_anterior",
    point_region: "limb",
    meridian_code: "st",
    image_path: "points/ST36.webp",
    tags_symptom: ["fatigue", "swelling", "dizziness"],
    tags_trigger: ["humidity", "temp"],
    tcm_actions: ["tonify_qi", "strengthen_spleen"],
    organ_focus: ["spleen", "kidney"],
  },
  SP6: {
    code: "SP6",
    name_ja: "三陰交",
    reading_ja: "さんいんこう",
    body_region: "leg_medial",
    point_region: "limb",
    meridian_code: "sp",
    image_path: "points/SP6.webp",
    tags_symptom: ["fatigue", "sleep", "low_back_pain"],
    tags_trigger: ["humidity", "temp"],
    tcm_actions: ["nourish_blood", "generate_fluids"],
    organ_focus: ["spleen", "kidney"],
  },
  KI3: {
    code: "KI3",
    name_ja: "太渓",
    reading_ja: "たいけい",
    body_region: "ankle_medial",
    point_region: "limb",
    meridian_code: "ki",
    image_path: "points/KI3.webp",
    tags_symptom: ["fatigue", "low_back_pain", "dizziness"],
    tags_trigger: ["temp", "pressure"],
    tcm_actions: ["support_kidney", "generate_fluids"],
    organ_focus: ["kidney"],
  },
  CV6: {
    code: "CV6",
    name_ja: "気海",
    reading_ja: "きかい",
    body_region: "lower_abdomen",
    point_region: "abdomen",
    meridian_code: "cv",
    image_path: "points/CV6.webp",
    tags_symptom: ["fatigue", "low_back_pain", "dizziness"],
    tags_trigger: ["temp", "pressure"],
    tcm_actions: ["tonify_qi", "support_kidney"],
    organ_focus: ["kidney"],
  },
  LU7: {
    code: "LU7",
    name_ja: "列缺",
    reading_ja: "れっけつ",
    body_region: "forearm_thumb_side",
    point_region: "limb",
    meridian_code: "lu",
    image_path: "points/LU7.webp",
    tags_symptom: ["neck_shoulder", "headache"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "tonify_qi"],
    organ_focus: ["liver", "spleen"],
  },
  SP5: {
    code: "SP5",
    name_ja: "商丘",
    reading_ja: "しょうきゅう",
    body_region: "ankle_medial",
    point_region: "limb",
    meridian_code: "sp",
    image_path: "points/SP5.webp",
    tags_symptom: ["swelling", "fatigue"],
    tags_trigger: ["humidity", "temp"],
    tcm_actions: ["transform_damp"],
    organ_focus: ["spleen"],
  },
};

const TODAY_POINT_BY_SYMPTOM = {
  headache: ["GB20", "LI4", "LR3"],
  neck_shoulder: ["GB20", "LU7", "LI4"],
  low_back_pain: ["KI3", "CV6", "SP6"],
  dizziness: ["PC6", "KI3", "ST36"],
  mood: ["LR3", "PC6", "LI4"],
  sleep: ["PC6", "SP6", "KI3"],
  fatigue: ["ST36", "CV6", "KI3"],
  swelling: ["SP5", "ST36", "SP6"],
};

const TODAY_POINT_BY_TRIGGER = {
  damp: ["ST36", "SP5", "SP6"],
  humidity: ["ST36", "SP5", "SP6"],
  pressure_down: ["GB20", "PC6", "LI4"],
  pressure_up: ["LR3", "LI4", "PC6"],
  cold: ["KI3", "CV6", "ST36"],
  heat: ["LI4", "LR3", "GB20"],
  dry: ["KI3", "PC6", "LU7"],
  temp: ["ST36", "KI3", "LI4"],
};

function decorateTodayPoint(point, { symptomFocus, triggerKey, signal } = {}) {
  const symptomLabel = SYMPTOM_LABELS[symptomFocus] || "今日の不調";
  const triggerLabel = TRIGGER_LABELS[triggerKey] || "このあとの変化";
  const pressure = signal >= 2 ? "山場前に" : "気づいた時に";
  return {
    ...point,
    source: "today_rule",
    explanation: {
      role_summary:
        point.point_region === "head_neck"
          ? "頭・首肩まわりのこもりを、その場で逃がしたい時に使いやすいツボです。"
          : point.point_region === "abdomen"
            ? "お腹と腰腹まわりの力を抜き、冷えやだるさを抱え込ませないためのツボです。"
            : "今日これからの違和感を、強くなる前に逃がすためのセルフケア向きのツボです。",
      selection_reason: `${symptomLabel}と${triggerLabel}の影響を見て、${pressure}短時間で取り入れやすいツボとして選んでいます。今日の山場に合わせて、まず体感を軽くしやすいものを優先しています。`,
      match_tags: [
        symptomFocus ? `今見ている不調：${symptomLabel}` : null,
        triggerKey ? `天気の影響：${triggerLabel}` : null,
      ].filter(Boolean),
    },
  };
}

function pickTodayPointCodes(symptomFocus, triggerKey, { fallbackTriggerKey } = {}) {
  const ordered = [
    ...safeArray(TODAY_POINT_BY_SYMPTOM[symptomFocus]),
    ...safeArray(TODAY_POINT_BY_TRIGGER[triggerKey]),
    ...safeArray(TODAY_POINT_BY_TRIGGER[fallbackTriggerKey]),
    "LI4",
    "PC6",
    "ST36",
  ];
  return Array.from(new Set(ordered)).filter((code) => TODAY_POINT_LIBRARY[code]).slice(0, 3);
}

export function buildTodayTsuboPoints({ symptomFocus, triggerKey, signal, fallbackTriggerKey } = {}) {
  const codes = pickTodayPointCodes(symptomFocus, triggerKey, { fallbackTriggerKey });
  return codes.map((code) => decorateTodayPoint(TODAY_POINT_LIBRARY[code], { symptomFocus, triggerKey, signal }));
}
