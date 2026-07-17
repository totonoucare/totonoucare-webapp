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
  CV12: {
    code: "CV12",
    name_ja: "中脘",
    reading_ja: "ちゅうかん",
    body_region: "upper_abdomen",
    point_region: "abdomen",
    meridian_code: "cv",
    image_path: "points/CV12.webp",
    tags_symptom: ["digestion", "fatigue", "swelling"],
    tags_trigger: ["humidity", "temp"],
    tcm_actions: ["tonify_qi", "strengthen_spleen", "transform_damp"],
    organ_focus: ["spleen"],
  },
  SP4: {
    code: "SP4",
    name_ja: "公孫",
    reading_ja: "こうそん",
    body_region: "foot_medial",
    point_region: "limb",
    meridian_code: "sp",
    tags_symptom: ["digestion", "fatigue", "swelling"],
    tags_trigger: ["humidity", "temp", "pressure"],
    tcm_actions: ["strengthen_spleen", "transform_damp", "move_qi"],
    organ_focus: ["spleen"],
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
  HT7: {
    code: "HT7",
    name_ja: "神門",
    reading_ja: "しんもん",
    body_region: "wrist_little_finger_side",
    point_region: "limb",
    meridian_code: "ht",
    tags_symptom: ["sleep", "mood"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["calm_spirit", "nourish_blood"],
    organ_focus: ["heart"],
  },
  SI3: {
    code: "SI3",
    name_ja: "後渓",
    reading_ja: "こうけい",
    body_region: "hand_little_finger_side",
    point_region: "limb",
    meridian_code: "si",
    tags_symptom: ["neck_shoulder", "headache"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "release_neck"],
    organ_focus: ["heart"],
  },
  BL40: {
    code: "BL40",
    name_ja: "委中",
    reading_ja: "いちゅう",
    body_region: "knee_back",
    point_region: "limb",
    meridian_code: "bl",
    tags_symptom: ["low_back_pain", "fatigue"],
    tags_trigger: ["temp", "humidity"],
    tcm_actions: ["move_blood", "release_back"],
    organ_focus: ["kidney"],
  },
  TE5: {
    code: "TE5",
    name_ja: "外関",
    reading_ja: "がいかん",
    body_region: "forearm_outer",
    point_region: "limb",
    meridian_code: "te",
    tags_symptom: ["headache", "neck_shoulder", "mood"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "clear_heat"],
    organ_focus: ["liver"],
  },
};

const TODAY_POINT_BY_SYMPTOM = {
  headache: ["GB20", "LI4", "LR3"],
  neck_shoulder: ["GB20", "LU7", "LI4"],
  low_back_pain: ["KI3", "CV6", "SP6"],
  dizziness: ["PC6", "KI3", "ST36"],
  mood: ["LR3", "PC6", "LI4"],
  sleep: ["PC6", "SP6", "KI3"],
  digestion: ["CV12", "ST36", "SP4"],
  fatigue: ["ST36", "CV6", "KI3"],
  swelling: ["SP5", "ST36", "SP6"],
};

const TODAY_POINT_BY_TRIGGER = {
  damp: ["CV12", "ST36", "SP4"],
  humidity: ["CV12", "ST36", "SP4"],
  pressure_down: ["GB20", "PC6", "LI4"],
  pressure_up: ["LR3", "LI4", "PC6"],
  cold: ["CV12", "KI3", "ST36"],
  heat: ["LI4", "LR3", "GB20"],
  dry: ["KI3", "PC6", "LU7"],
  temp: ["ST36", "KI3", "LI4"],
};

const SYMPTOM_SIGN_PHRASES = {
  headache: "頭から首が重く感じやすい",
  neck_shoulder: "首元・肩甲骨まわりがこわばりやすい",
  low_back_pain: "腰腹まわりや下半身が重くなりやすい",
  dizziness: "頭が重く感じたり、ふらついたりしやすい",
  mood: "胸まわりに力が入りやすい",
  sleep: "夜に力が抜けにくくなりやすい",
  digestion: "胃が重く感じたり、お腹が張ったりしやすい",
  fatigue: "午後にだるさが出やすい",
  swelling: "足元や下半身が重く感じやすい",
};

const TRIGGER_SIGN_PHRASES = {
  damp: "湿気の影響が少しあり",
  humidity: "湿気の影響が少しあり",
  pressure_down: "気圧低下の影響が少しあり",
  pressure_up: "気圧上昇の影響が少しあり",
  cold: "冷え込みの影響が少しあり",
  heat: "暑さの影響が少しあり",
  dry: "乾燥の影響が少しあり",
  temp: "気温差の影響が少しあり",
};

const POINT_ROLE_SUMMARIES = {
  LI4: "手で触れやすく、頭・首肩・気分に集まった力みを一度ほどきたい時に使いやすいツボです。",
  LR3: "足もとからめぐりをゆるめたい時に使いやすいツボです。頭や気分の重さが上に残る日に候補になります。",
  GB20: "首のつけ根から後頭部にかけて、こもった重さを逃がしたい時に触れやすいツボです。",
  PC6: "前腕から胸・みぞおちまわりの力みをゆるめたい時に向くツボです。ざわつきやふわつきが気になる日にも候補になります。",
  ST36: "すねの外側から、だるさ・胃腸・下半身の重さをまとめて見たい時に使いやすいツボです。",
  SP6: "足元の冷え・だるさ・重さを一緒に見たい時に使いやすいツボです。内側から支えたい日に候補になります。",
  KI3: "足首まわりから腰腹の冷えや重さを見たい時に使いやすいツボです。土台を冷やしたくない日に候補になります。",
  CV6: "下腹部にあり、腰腹まわりの冷えや力の抜けにくさをやさしく見たい時に使いやすいツボです。",
  CV12: "お腹の中央にあり、胃腸が水を含んだスポンジみたいに重い日に、やさしく触れたいツボです。",
  SP4: "足の内側にあり、食後の重さや胃腸のもたつきが気になる時に使いやすいツボです。",
  LU7: "手首の親指側にあり、首肩や呼吸まわりのこわばりをゆるめたい時に使いやすいツボです。",
  SP5: "内くるぶしの前下にあり、足元の重さやむくみ感を見たい時に向くツボです。",
  HT7: "手首の小指側にあり、夜まで残った緊張や考えごとを静かにほどきたい時の候補です。",
  SI3: "小指側の手にあり、肩甲骨から首へ残ったこわばりを軽く逃がしたい時の候補です。",
  BL40: "膝の裏にあり、腰から脚の後ろへ続く張りを強く押さずに見たい時の候補です。",
  TE5: "前腕の外側にあり、肩や頭へ集まった力みを腕から逃がしたい時の候補です。",
};

const POINT_USE_PHRASES = {
  LI4: "手で触れやすく、頭・首肩まわりが気になる時に向く",
  LR3: "足にあり、頭や気分の重さが気になる時に向く",
  GB20: "首のつけ根から後頭部にかけて、こわばりや重さを見たい時に向く",
  PC6: "前腕から胸・みぞおちまわりの力みをゆるめたい時に向く",
  ST36: "すねの外側から、だるさや下半身の重さを見たい時に向く",
  SP6: "足元の冷え・だるさ・重さをまとめて見たい時に向く",
  KI3: "足首まわりから腰腹の冷えや重さを見たい時に向く",
  CV6: "下腹部を冷やさず、腰腹まわりの力を抜きたい時に向く",
  CV12: "お腹の中央にあり、食後の重さや胃もたれが気になる時に向く",
  SP4: "足にあり、食後の胃の重さが気になる時に向く",
  LU7: "手首から首肩や呼吸まわりのこわばりをゆるめたい時に向く",
  SP5: "足元の重さやむくみ感を見たい時に向く",
  HT7: "手首から夜の緊張やざわつきを静かにほどきたい時に向く",
  SI3: "手の小指側から肩甲骨・首のこわばりを見たい時に向く",
  BL40: "膝裏から腰・脚の後ろの張りを見たい時に向く",
  TE5: "前腕外側から肩や頭へ集まった力みを逃がしたい時に向く",
};


const TSUBO_TRIGGER_TONE = {
  damp: "湿気で体が重く、めぐりがゆっくりになりやすい日",
  humidity: "湿気で体が重く、めぐりがゆっくりになりやすい日",
  pressure_down: "気圧低下で頭・耳・首まわりにこもりが出やすい日",
  pressure_up: "気圧上昇で肩や胸まわりに力が入りやすい日",
  cold: "冷え込みで体がきゅっと縮こまりやすい日",
  heat: "暑さで熱やそわつきが上に残りやすい日",
  dry: "乾燥で目・のど・首肩がこわばりやすい日",
  temp: "気温差で体が身構えやすい日",
};

const TSUBO_SYMPTOM_TONE = {
  headache: "頭だけでなく、首・耳・目まわりも一緒に見たい状態です",
  neck_shoulder: "首本人を責めるより、肩甲骨や呼吸の出口も作りたい状態です",
  low_back_pain: "腰だけでなく、足元やお腹まわりの土台も見たい状態です",
  dizziness: "急な動きより、耳・首・足元の落ち着きを見たい状態です",
  mood: "気分を直接上げるより、足もとや胸まわりの力みをほどきたい状態です",
  sleep: "休む前に、胸・首肩・足元の力を抜きたい状態です",
  digestion: "胃腸まわりのもたつきを、やさしくほどきたい状態です",
  fatigue: "だるさを押し切るより、体の起動を足元から支えたい状態です",
  swelling: "足元にたまりやすい重さを、強く押さずに流したい状態です",
};

function getSignalTiming(signal) {
  if (Number(signal) >= 2) return "体調が変わりやすい時間の前に、早めに短く触る";
  if (Number(signal) === 1) return "体調が変わりやすい時間の前に一度、短く触る";
  return "気になった時に短く触る";
}

function buildSelectionReason(point, { symptomFocus, triggerKey, signal, primaryMeridian, secondaryMeridian } = {}) {
  const triggerTone = TSUBO_TRIGGER_TONE[triggerKey] || "天気の変化でいつもの弱いところに出やすい日";
  const symptomTone = TSUBO_SYMPTOM_TONE[symptomFocus] || "今見ている不調を、強くなる前に整えたい状態です";
  const timing = getSignalTiming(signal);
  const pointUse = POINT_USE_PHRASES[point.code] || "短時間で触れやすい";

  const profileLine = safeArray(POINTS_BY_MERIDIAN_LINE[primaryMeridian]).includes(point.code)
    ? "体質チェックで優先された経絡ラインにもつながります。"
    : safeArray(POINTS_BY_MERIDIAN_LINE[secondaryMeridian]).includes(point.code)
      ? "体質チェックの副経絡ラインにもつながります。"
      : "";
  return `今日は、${triggerTone}。${symptomTone}。${point.name_ja}は${pointUse}ツボです。${profileLine}${timing}くらいで、強く押し込まず短く触れてください。`;
}

function decorateTodayPoint(point, { symptomFocus, triggerKey, signal, primaryMeridian, secondaryMeridian } = {}) {
  const symptomLabel = SYMPTOM_LABELS[symptomFocus] || "今見ている不調";
  const triggerLabel = TRIGGER_LABELS[triggerKey] || "天気の変化";

  return {
    ...point,
    source: "today_rule",
    explanation: {
      role_summary:
        POINT_ROLE_SUMMARIES[point.code] ||
        "今日これからの違和感を、強くなる前に見ておきたい時に使いやすいツボです。",
      selection_reason: buildSelectionReason(point, { symptomFocus, triggerKey, signal, primaryMeridian, secondaryMeridian }),
      match_tags: [
        symptomFocus ? `今見ている不調：${symptomLabel}` : null,
        triggerKey ? `天気の影響：${triggerLabel}` : null,
        safeArray(POINTS_BY_MERIDIAN_LINE[primaryMeridian]).includes(point.code) ? "主経絡ライン" : null,
        safeArray(POINTS_BY_MERIDIAN_LINE[secondaryMeridian]).includes(point.code) ? "副経絡ライン" : null,
      ].filter(Boolean),
    },
  };
}

const POINTS_BY_MERIDIAN_LINE = {
  lung_li: ["LU7", "LI4"],
  heart_si: ["HT7", "SI3"],
  kidney_bl: ["KI3", "BL40"],
  liver_gb: ["LR3", "GB20"],
  spleen_st: ["ST36", "SP4", "CV12"],
  pc_sj: ["PC6", "TE5"],
};

const POINTS_BY_SUB_LABEL = {
  qi_stagnation: ["LR3", "PC6", "LI4", "TE5"],
  qi_deficiency: ["ST36", "CV6", "KI3"],
  blood_deficiency: ["SP6", "ST36", "HT7"],
  blood_stasis: ["LR3", "LI4", "GB20", "BL40"],
  dampness: ["SP4", "ST36", "SP5", "CV12"],
  fluid_deficiency: ["KI3", "LU7", "SP6"],
};

function stableHash(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function dateOrdinal(targetDate) {
  const match = String(targetDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
}

function pointScore(code, {
  symptomFocus,
  triggerKey,
  fallbackTriggerKey,
  primaryMeridian,
  secondaryMeridian,
  subLabels,
  coreCode,
  targetDate,
} = {}) {
  let score = 0;
  if (safeArray(TODAY_POINT_BY_SYMPTOM[symptomFocus]).includes(code)) score += 4;
  if (safeArray(TODAY_POINT_BY_TRIGGER[triggerKey]).includes(code)) score += 3;
  if (safeArray(TODAY_POINT_BY_TRIGGER[fallbackTriggerKey]).includes(code)) score += 1;
  if (safeArray(POINTS_BY_MERIDIAN_LINE[primaryMeridian]).includes(code)) score += 3.2;
  if (safeArray(POINTS_BY_MERIDIAN_LINE[secondaryMeridian]).includes(code)) score += 1.6;
  safeArray(subLabels).forEach((label, index) => {
    if (safeArray(POINTS_BY_SUB_LABEL[label]).includes(code)) score += index === 0 ? 2.1 : 1.1;
  });
  if (String(coreCode || "").includes("batt_small") && ["ST36", "KI3", "CV6", "HT7"].includes(code)) score += 0.9;
  const jitter = ((stableHash(`${targetDate}|${code}`) + dateOrdinal(targetDate)) % 37) / 100;
  return score + jitter;
}

function pickTodayPointCodes(symptomFocus, triggerKey, {
  fallbackTriggerKey,
  primaryMeridian,
  secondaryMeridian,
  subLabels = [],
  coreCode = null,
  targetDate = null,
} = {}) {
  const candidates = Array.from(new Set([
    ...safeArray(TODAY_POINT_BY_SYMPTOM[symptomFocus]),
    ...safeArray(TODAY_POINT_BY_TRIGGER[triggerKey]),
    ...safeArray(POINTS_BY_MERIDIAN_LINE[primaryMeridian]),
    ...safeArray(POINTS_BY_MERIDIAN_LINE[secondaryMeridian]),
    ...safeArray(subLabels).flatMap((label) => safeArray(POINTS_BY_SUB_LABEL[label])),
    ...safeArray(TODAY_POINT_BY_TRIGGER[fallbackTriggerKey]),
    "LI4",
    "PC6",
    "ST36",
  ])).filter((code) => TODAY_POINT_LIBRARY[code]);

  return candidates
    .map((code) => ({
      code,
      score: pointScore(code, {
        symptomFocus,
        triggerKey,
        fallbackTriggerKey,
        primaryMeridian,
        secondaryMeridian,
        subLabels,
        coreCode,
        targetDate,
      }),
    }))
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
    .slice(0, 3)
    .map((item) => item.code);
}

export function buildTodayTsuboPoints({
  symptomFocus,
  triggerKey,
  signal,
  fallbackTriggerKey,
  primaryMeridian = null,
  secondaryMeridian = null,
  subLabels = [],
  coreCode = null,
  targetDate = null,
} = {}) {
  const codes = pickTodayPointCodes(symptomFocus, triggerKey, {
    fallbackTriggerKey,
    primaryMeridian,
    secondaryMeridian,
    subLabels,
    coreCode,
    targetDate,
  });
  return codes.map((code) => decorateTodayPoint(TODAY_POINT_LIBRARY[code], {
    symptomFocus,
    triggerKey,
    signal,
    primaryMeridian,
    secondaryMeridian,
  }));
}

