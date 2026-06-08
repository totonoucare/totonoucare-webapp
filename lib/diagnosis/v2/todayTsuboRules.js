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
    tags_symptom: ["fatigue", "swelling", "dizziness", "digestion"],
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
    tags_symptom: ["fatigue", "sleep", "low_back_pain", "digestion"],
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
    tags_symptom: ["fatigue", "low_back_pain", "dizziness", "digestion"],
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
    tags_symptom: ["fatigue", "low_back_pain", "dizziness", "digestion"],
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
  digestion: ["ST36", "PC6", "SP6"],
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

const SYMPTOM_SIGN_PHRASES = {
  headache: "頭〜首に重さやこもりが残りやすい",
  neck_shoulder: "首元・肩甲骨まわりがこわばりやすい",
  low_back_pain: "腰腹まわりや下半身が重くなりやすい",
  dizziness: "頭の重さやふらつき感が残りやすい",
  mood: "胸まわりの詰まりや力みが残りやすい",
  sleep: "夜に力が抜けにくくなりやすい",
  digestion: "胃腸の重さやお腹の張りが残りやすい",
  fatigue: "午後にだるさが残りやすい",
  swelling: "足元や下半身に重さが残りやすい",
};

const TRIGGER_SIGN_PHRASES = {
  damp: "湿気の影響が少しあり",
  humidity: "湿気の影響が少しあり",
  pressure_down: "気圧低下の影響が少しあり",
  pressure_up: "気圧上昇の影響が少しあり",
  cold: "冷え込みの影響が少しあり",
  heat: "暑さや熱こもりの影響が少しあり",
  dry: "乾燥の影響が少しあり",
  temp: "気温差の影響が少しあり",
};

const POINT_ROLE_SUMMARIES = {
  LI4: "手で触れやすく、頭・首肩・気分のこわばりを一度ゆるめたい時に使いやすいツボです。",
  LR3: "足先から力みを抜きたい時に使いやすいツボです。頭や気分のこもりがある日に向いています。",
  GB20: "首のつけ根から後頭部にかけて、こわばりや重さを感じる時に触れやすいツボです。",
  PC6: "前腕から胸・みぞおちまわりの力みをゆるめたい時に向くツボです。",
  ST36: "すねの外側にあり、だるさや下半身の重さが気になる時に使いやすいツボです。",
  SP6: "内くるぶしの上にあり、冷え・だるさ・足元の重さを一緒に見たい時に使いやすいツボです。",
  KI3: "内くるぶしの近くにあり、足首・腰腹まわりを冷やしたくない日に使いやすいツボです。",
  CV6: "下腹部にあり、腰腹まわりの冷えや力の抜けにくさを見たい時に使いやすいツボです。",
  LU7: "手首の親指側にあり、首肩や呼吸まわりのこわばりをゆるめたい時に使いやすいツボです。",
  SP5: "内くるぶしの前下にあり、足元の重さやむくみ感を見たい時に向くツボです。",
};

const POINT_USE_PHRASES = {
  LI4: "手で触れやすく、頭・首肩まわりの力みを一度ゆるめたい時に向く",
  LR3: "足先から力みを逃がし、頭や気分のこもりを残しにくくしたい時に向く",
  GB20: "首のつけ根から後頭部にかけて、こわばりや重さを見たい時に向く",
  PC6: "前腕から胸・みぞおちまわりの力みをゆるめたい時に向く",
  ST36: "すねの外側から、だるさや下半身の重さを見たい時に向く",
  SP6: "足元の冷え・だるさ・重さをまとめて見たい時に向く",
  KI3: "足首まわりから腰腹の冷えや重さを見たい時に向く",
  CV6: "下腹部を冷やさず、腰腹まわりの力を抜きたい時に向く",
  LU7: "手首から首肩や呼吸まわりのこわばりをゆるめたい時に向く",
  SP5: "足元の重さやむくみ感を見たい時に向く",
};

function getSignalTiming(signal) {
  if (Number(signal) >= 2) return "山場の前に、早めに短く触る";
  if (Number(signal) === 1) return "山場の前に一度、短く触る";
  return "気になった時に短く触る";
}

function buildSelectionReason(point, { symptomFocus, triggerKey, signal } = {}) {
  const symptomSign = SYMPTOM_SIGN_PHRASES[symptomFocus] || "今見ている不調が残りやすい";
  const triggerSign = TRIGGER_SIGN_PHRASES[triggerKey] || "天気の影響が少しあり";
  const timing = getSignalTiming(signal);
  const pointUse = POINT_USE_PHRASES[point.code] || "短時間で触れやすい";

  return `今日は${triggerSign}、${symptomSign}日です。${point.name_ja}は${pointUse}場所なので、${timing}のが合います。`;
}

function decorateTodayPoint(point, { symptomFocus, triggerKey, signal } = {}) {
  const symptomLabel = SYMPTOM_LABELS[symptomFocus] || "今見ている不調";
  const triggerLabel = TRIGGER_LABELS[triggerKey] || "天気の変化";

  return {
    ...point,
    source: "today_rule",
    explanation: {
      role_summary:
        POINT_ROLE_SUMMARIES[point.code] ||
        "今日これからの違和感を、強くなる前に見ておきたい時に使いやすいツボです。",
      selection_reason: buildSelectionReason(point, { symptomFocus, triggerKey, signal }),
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

