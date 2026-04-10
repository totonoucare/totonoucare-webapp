// lib/diagnosis/v2/questions.js

/**
 * Diagnosis v2 Questions
 *
 * 方針:
 * - 本体: 14問（固定）
 * - 分岐: 回答次第で 0〜4問
 * - 最後に主訴: 1問
 *
 * Answer formats:
 * - freq5: 0 / 1-2 / 3-5 / 6-9 / 10+
 * - single: single choice
 * - multi(max=2)
 */

export const FREQ5_OPTIONS = [
  { label: "ほとんどない（0日）", value: "0" },
  { label: "少ない（1〜2日）", value: "1_2" },
  { label: "ときどきある（3〜5日）", value: "3_5" },
  { label: "わりと多い（6〜9日）", value: "6_9" },
  { label: "かなり多い（10日以上）", value: "10p" },
];

const FREQ_ORDER = {
  "0": 0,
  "1_2": 1,
  "3_5": 2,
  "6_9": 3,
  "10p": 4,
};

export const QUESTIONS_V2_BASE = [
  {
    id: "Q1",
    key: "fatigue_easy",
    block: "BASE",
    type: "freq5",
    title:
      "この2週間で、特別に無理をしたわけではないのに、すぐ疲れる・電池切れすると感じた日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q2",
    key: "carryover",
    block: "BASE",
    type: "freq5",
    title:
      "この2週間で、寝ても疲れが抜けず、次の日まで引きずった日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q3",
    key: "qi_stuck",
    block: "BASE",
    type: "freq5",
    title:
      "この2週間で、胸・喉・みぞおち・お腹などがつまる感じや、ため息が出やすい日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q4",
    key: "tension_residue",
    block: "BASE",
    type: "freq5",
    title:
      "この2週間で、気持ちや体の緊張がなかなか抜けず、イライラしたり、焦って落ち着かない感じが残る日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q5",
    key: "fluid_heavy",
    block: "BASE",
    type: "freq5",
    title:
      "この2週間で、体が重い・だるい・むくみやすいと感じた日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q6",
    key: "postmeal_heavy",
    block: "BASE",
    type: "freq5",
    title:
      "この2週間で、食後や夕方になると、眠気・だるさ・体の重さが強くなる日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q7",
    key: "fixed_location",
    block: "BASE",
    type: "freq5",
    title:
      "この2週間で、不調がいつも同じ場所に出やすい、または同じ場所に居座りやすいと感じた日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q8",
    key: "vision_blur",
    block: "BASE",
    type: "freq5",
    title:
      "この2週間で、目がかすむ・ピントが合いにくいと感じた日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q9",
    key: "dryness_general",
    block: "BASE",
    type: "freq5",
    title:
      "この2週間で、目・喉・口・肌の乾きが気になった日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q10",
    key: "stool_dry",
    block: "BASE",
    type: "freq5",
    title:
      "この2週間で、便が硬い・出にくい・スッキリしないと感じた日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q11",
    key: "thermo",
    block: "BASE",
    type: "single",
    title: "普段の体調として、あなたに一番近いものはどれですか？",
    options: [
      { label: "寒さや冷えの方がつらく、温めると楽になりやすい", value: "cold" },
      { label: "暑さやほてりの方がつらく、涼しくすると楽になりやすい", value: "heat" },
      { label: "どちらとも言えず、季節や体調で変わりやすい", value: "mixed" },
      { label: "どちらもあまり気にならない", value: "neutral" },
    ],
  },
  {
    id: "Q12",
    key: "env_sensitivity",
    block: "BASE",
    type: "single",
    title: "1年を通して、天候や気圧・寒暖差の変化前後に体調が左右されやすいですか？",
    options: [
      { label: "ほとんどない", value: "0" },
      { label: "たまにある", value: "1" },
      { label: "わりとある", value: "2" },
      { label: "かなりある", value: "3" },
    ],
  },
{
  id: "Q13",
  key: "meridian_primary",
  block: "M",
  type: "single",
  title:
    "動作チェック 1/2\n次の2問で、負担が出やすい動きを2つまで選びます。\nまずは、動かしたときに一番ツラさ・張り・違和感が出やすいものを1つ選んでください。\n(つらさが出る場所は、動きで伸ばされる場所と同じでなくても大丈夫です。)",
  options: [
    { label: "前屈する", value: "A" },
    { label: "上体を反らす", value: "B" },
    { label: "体を左右にひねる・側屈する", value: "C" },
    { label: "腕を上げる・首をうつむける", value: "D" },
    { label: "首を後ろに倒す・横を向く", value: "E" },
    { label: "腕を横から上げる", value: "F" },
    { label: "どれも強くない", value: "none" },
  ],
},
{
  id: "Q14",
  key: "meridian_secondary",
  block: "M",
  type: "single",
  title:
    "動作チェック 2/2\n次に、2番目に気になる動きがあれば1つ選んでください。\n特になければ「選ばない」で進めます。",
  options: [
    { label: "前屈する", value: "A" },
    { label: "上体を反らす", value: "B" },
    { label: "体を左右にひねる・側屈する", value: "C" },
    { label: "腕を上げる・首をうつむける", value: "D" },
    { label: "首を後ろに倒す・横を向く", value: "E" },
    { label: "腕を横から上げる", value: "F" },
    { label: "選ばない", value: "none" },
  ],
},
];

export const QUESTIONS_V2_BRANCH = [
  {
    id: "B1",
    key: "startup_heavy",
    block: "BRANCH",
    type: "freq5",
    title:
      "この2週間で、朝や座ったあとに動き出すとき、体が重くてなかなかエンジンがかからないと感じた日は何日くらいありましたか？",
    options: FREQ5_OPTIONS,
    showIf: {
      any: [
        { key: "fatigue_easy", gte: "3_5" },
        { key: "fluid_heavy", gte: "3_5" },
        { key: "postmeal_heavy", gte: "3_5" },
      ],
    },
  },
  {
    id: "B2",
    key: "startup_response",
    block: "BRANCH",
    type: "single",
    title: "そのつらさは、少し動くとラクになりますか？",
    options: [
      { label: "動くと少しラクになる", value: "eases_with_movement" },
      { label: "あまり変わらない", value: "little_change" },
      { label: "動くと余計しんどい", value: "worse_with_movement" },
    ],
    showIf: {
      key: "startup_heavy",
      gte: "1_2",
    },
  },
  {
    id: "B3",
    key: "fixed_response",
    block: "BRANCH",
    type: "single",
    title: "その不調は、温めたり軽く動かしたりすると変わりますか？",
    options: [
      { label: "温めるとラクになる", value: "warm_better" },
      { label: "軽く動くとラクになる", value: "move_better" },
      { label: "どちらでもあまり変わらない", value: "little_change" },
      { label: "むしろ悪化しやすい", value: "worse" },
    ],
    showIf: {
      key: "fixed_location",
      gte: "3_5",
    },
  },
  {
    id: "B4",
    key: "env_vectors",
    block: "BRANCH",
    type: "multi",
    max: 2,
    title: "特に影響が出やすい“きっかけ”はどれですか？（最大2つ）",
    options: [
      { label: "気圧の変化", value: "pressure_shift" },
      { label: "寒暖差", value: "temp_swing" },
      { label: "湿度が上がる", value: "humidity_up" },
      { label: "乾燥が強まる", value: "dryness_up" },
      { label: "風が強い・冷風", value: "wind_strong" },
      { label: "特にない / よくわからない", value: "none" },
    ],
    showIf: {
      key: "env_sensitivity",
      not: "0",
    },
  },
];

export const QUESTIONS_V2_FINAL = [
  {
    id: "F1",
    key: "symptom_focus",
    block: "FINAL",
    type: "single",
    title: "今いちばん困っている不調を1つ選んでください。",
    options: [
      { label: "だるさ・疲労", value: "fatigue" },
      { label: "睡眠", value: "sleep" },
      { label: "首肩のつらさ", value: "neck_shoulder" },
      { label: "腰のつらさ", value: "low_back_pain" },
      { label: "むくみ", value: "swelling" },
      { label: "頭痛", value: "headache" },
      { label: "めまい", value: "dizziness" },
      { label: "気分の浮き沈み", value: "mood" },
    ],
  },
];

export const QUESTIONS_V2 = [
  ...QUESTIONS_V2_BASE,
  ...QUESTIONS_V2_BRANCH,
  ...QUESTIONS_V2_FINAL,
];

function freqGte(value, threshold) {
  const a = FREQ_ORDER[value] ?? -1;
  const b = FREQ_ORDER[threshold] ?? -1;
  return a >= b;
}

function matchRule(rule, answers) {
  if (!rule) return true;

  if (Array.isArray(rule.any) && rule.any.length > 0) {
    return rule.any.some((r) => matchRule(r, answers));
  }
  if (Array.isArray(rule.all) && rule.all.length > 0) {
    return rule.all.every((r) => matchRule(r, answers));
  }

  const value = answers?.[rule.key];

  if (rule.gte != null) return freqGte(value, rule.gte);
  if (rule.eq != null) return value === rule.eq;
  if (rule.not != null) return value != null && value !== rule.not;
  if (rule.in != null) return Array.isArray(rule.in) && rule.in.includes(value);
  if (rule.exists) {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "";
  }

  return true;
}

export function getBranchQuestions(answers = {}) {
  return QUESTIONS_V2_BRANCH.filter((q) => matchRule(q.showIf, answers));
}

export function getQuestions(answers = {}) {
  const out = [];

  for (const q of QUESTIONS_V2_BASE) {
    out.push(q);

    if (q.key === "postmeal_heavy") {
      const startup = QUESTIONS_V2_BRANCH.find((x) => x.key === "startup_heavy");
      if (startup && matchRule(startup.showIf, answers)) out.push(startup);

      const startupResp = QUESTIONS_V2_BRANCH.find((x) => x.key === "startup_response");
      if (startupResp && matchRule(startupResp.showIf, answers)) out.push(startupResp);
    }

    if (q.key === "fixed_location") {
      const fixed = QUESTIONS_V2_BRANCH.find((x) => x.key === "fixed_response");
      if (fixed && matchRule(fixed.showIf, answers)) out.push(fixed);
    }

    if (q.key === "env_sensitivity") {
      const env = QUESTIONS_V2_BRANCH.find((x) => x.key === "env_vectors");
      if (env && matchRule(env.showIf, answers)) out.push(env);
    }
  }

  return [...out, ...QUESTIONS_V2_FINAL];
}

export function getTotalQuestions(answers = {}) {
  return getQuestions(answers).length;
}

export function getQuestionMap() {
  const m = new Map();
  for (const q of QUESTIONS_V2) m.set(q.key, q);
  return m;
}

export function getQuestionByKey(key) {
  return QUESTIONS_V2.find((q) => q.key === key) || null;
}

export function getQuestionById(id) {
  return QUESTIONS_V2.find((q) => q.id === id) || null;
}
