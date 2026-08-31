/**
 * Diagnosis v2 questions.
 *
 * The fixed questions describe the user's usual tendency over roughly the
 * previous three months. Temporary illness, injury and exceptional busyness
 * are intentionally excluded. Symptom focus and environmental triggers are
 * stored as expression lenses; neither changes the six constitution scores.
 */

export const FREQ5_OPTIONS = [
  { label: "ほとんどない", value: "never" },
  { label: "まれにある", value: "rare" },
  { label: "ときどきある", value: "sometimes" },
  { label: "よくある", value: "often" },
  { label: "ほぼいつもある", value: "almost_always" },
];

export const ANSWER_SCORE = Object.freeze({
  never: 0,
  rare: 0.25,
  sometimes: 0.5,
  often: 0.75,
  almost_always: 1,
});

export function answerScore(value) {
  return ANSWER_SCORE[value] ?? null;
}

const BASE = (id, key, title) => ({
  id,
  key,
  block: "BASE",
  type: "freq5",
  title,
  options: FREQ5_OPTIONS,
});

export const QUESTIONS_V2_BASE = [
  BASE("Q1", "fatigue_easy", "普段どおりに動いていても、疲れやすい・力が長く続かないことはありますか？"),
  BASE("Q2", "recovery_lag", "休んだり眠ったりしても、疲れが翌日まで残ることはありますか？"),
  BASE("Q3", "qi_obstruction", "胸・喉・みぞおち・お腹などに、張る・つかえる・詰まる感じが出ることはありますか？"),
  BASE("Q4", "stress_variability", "緊張や気分の変化に合わせて、体の張りや不調の強さが変わることはありますか？"),
  BASE("Q5", "body_heaviness", "体や手足が重い、むくんだように感じることはありますか？"),
  BASE("Q6", "postmeal_burden", "食後に、お腹の張り・眠気・だるさ・体の重さが出ることはありますか？"),
  BASE("Q7", "fixed_discomfort", "痛みやこわばりが、いつも同じ場所に残りやすいことはありますか？"),
  BASE("Q8", "visual_depletion", "目を使ったあとに、かすむ・ピントが合いにくい・目が疲れ切ることはありますか？"),
  BASE("Q9", "orthostatic_unsteadiness", "立ち上がったときや長く立ったときに、ふらつく・くらっとすることはありますか？"),
  BASE("Q10", "general_dryness", "目・口・喉・肌などの乾きが続くことはありますか？"),
  BASE("Q11", "dry_stool", "便が乾いて硬くなりやすいことはありますか？"),
  BASE("Q12", "cold_pattern", "手足や腰・お腹が冷えやすく、温めると楽になることはありますか？"),
  BASE("Q13", "heat_pattern", "ほてる・熱がこもる感じが出やすく、涼しくすると楽になることはありますか？"),
  BASE("Q14", "env_sensitivity", "天気・気圧・気温・湿度・乾燥の変化で、体調が左右されることはありますか？"),
];

export const QUESTIONS_V2_BRANCH = [
  {
    id: "B1",
    key: "movement_response",
    block: "BRANCH",
    type: "single",
    title: "重さや疲れがあるとき、無理のない範囲で少し動くとどうなりやすいですか？",
    options: [
      { label: "少し楽になる", value: "easier" },
      { label: "あまり変わらない", value: "no_change" },
      { label: "さらに疲れる", value: "more_tired" },
      { label: "その時によって違う", value: "varies" },
    ],
    showIf: {
      anyScoreAtLeast: ["fatigue_easy", "body_heaviness", "postmeal_burden"],
      threshold: 0.5,
    },
  },
  {
    id: "B2",
    key: "blood_deficiency_clues",
    block: "BRANCH",
    type: "multi",
    max: 2,
    title: "あわせて起こりやすいものはありますか？（最大2つ）",
    options: [
      { label: "手足がしびれやすい", value: "numbness" },
      { label: "筋肉がつりやすい", value: "muscle_cramp" },
      { label: "爪が薄い・割れやすい", value: "brittle_nails" },
      { label: "特にない", value: "none" },
    ],
    showIf: {
      anyScoreAtLeast: ["visual_depletion", "orthostatic_unsteadiness"],
      threshold: 0.5,
    },
  },
  {
    id: "B3",
    key: "blood_stasis_clues",
    block: "BRANCH",
    type: "multi",
    max: 2,
    title: "同じ場所に残る不調について、近いものはありますか？（最大2つ）",
    options: [
      { label: "刺すような、場所のはっきりした痛み", value: "focal_stabbing" },
      { label: "夜になると強まりやすい", value: "worse_at_night" },
      { label: "押すと痛い", value: "tender_to_pressure" },
      { label: "あざができやすい・色が暗く見える", value: "bruising_dark" },
      { label: "特にない", value: "none" },
    ],
    showIf: { scoreAtLeast: "fixed_discomfort", threshold: 0.5 },
  },
  {
    id: "B4",
    key: "fluid_deficiency_clues",
    block: "BRANCH",
    type: "multi",
    max: 2,
    title: "乾きやほてりと一緒に起こりやすいものはありますか？（最大2つ）",
    options: [
      { label: "水分をとりたくなる", value: "thirst" },
      { label: "夕方から夜にほてりやすい", value: "evening_heat" },
      { label: "手のひら・足の裏がほてりやすい", value: "palms_soles_heat" },
      { label: "寝汗をかきやすい", value: "night_sweats" },
      { label: "特にない", value: "none" },
    ],
    showIf: {
      anyScoreAtLeast: ["general_dryness", "dry_stool", "heat_pattern"],
      threshold: 0.5,
    },
  },
  {
    id: "B5",
    key: "env_vectors",
    block: "BRANCH",
    type: "multi",
    max: 2,
    title: "特に影響が出やすい変化はどれですか？（最大2つ）",
    options: [
      { label: "気圧の変化", value: "pressure_shift" },
      { label: "寒暖差", value: "temp_swing" },
      { label: "湿度が上がる", value: "humidity_up" },
      { label: "乾燥が強まる", value: "dryness_up" },
      { label: "風が強い・冷たい風", value: "wind_strong" },
      { label: "特にない・わからない", value: "none" },
    ],
    showIf: { scoreAbove: "env_sensitivity", threshold: 0 },
  },
  {
    id: "B6",
    key: "reaction_tiebreak",
    block: "BRANCH",
    type: "single",
    title: "調子を崩したとき、より先に出やすいのはどちらですか？",
    options: [
      { label: "張る・詰まる・力が抜けにくい", value: "accel" },
      { label: "重い・眠い・動き始めにくい", value: "brake" },
    ],
    showIf: { reactionTie: true },
  },
];

export const QUESTIONS_V2_FINAL = [
  {
    id: "F1",
    key: "symptom_focus",
    block: "FINAL",
    type: "single",
    title: "体質とは別に、今いちばん気になる不調を1つ選んでください。",
    options: [
      { label: "だるさ・疲労", value: "fatigue" },
      { label: "睡眠", value: "sleep" },
      { label: "胃腸の調子", value: "digestion" },
      { label: "首肩のつらさ", value: "neck_shoulder" },
      { label: "腰のつらさ", value: "low_back_pain" },
      { label: "むくみ", value: "swelling" },
      { label: "頭痛", value: "headache" },
      { label: "めまい・ふらつき", value: "dizziness" },
      { label: "気分の浮き沈み", value: "mood" },
    ],
  },
];

export const QUESTIONS_V2 = [
  ...QUESTIONS_V2_BASE,
  ...QUESTIONS_V2_BRANCH,
  ...QUESTIONS_V2_FINAL,
];

const BASE_KEYS = QUESTIONS_V2_BASE.map((question) => question.key);

function scoreAtLeast(answers, key, threshold) {
  const score = answerScore(answers?.[key]);
  return score != null && score >= threshold;
}

function hasCompleteBase(answers) {
  return BASE_KEYS.every((key) => answerScore(answers?.[key]) != null);
}

function roughReactionDifference(answers) {
  const q = (key) => answerScore(answers?.[key]) || 0;
  const count = (key) => Array.isArray(answers?.[key])
    ? answers[key].filter((value) => value && value !== "none").slice(0, 2).length
    : 0;
  const movement = answers?.movement_response;
  const qiDeficiency = (
    q("fatigue_easy") + q("recovery_lag") + 0.25 * q("postmeal_burden") +
    0.2 * q("orthostatic_unsteadiness") + 0.35 * (movement === "more_tired" ? 1 : 0)
  ) / 2.8;
  const qiStagnation = (
    q("qi_obstruction") + q("stress_variability") + 0.3 * (movement === "easier" ? 1 : 0)
  ) / 2.3;
  const bloodDeficiency = (
    0.8 * q("visual_depletion") + 0.8 * q("orthostatic_unsteadiness") +
    0.3 * count("blood_deficiency_clues")
  ) / 2.2;
  const fluidDeficiency = (
    q("general_dryness") + 0.8 * q("dry_stool") + 0.25 * count("fluid_deficiency_clues")
  ) / 2.3;
  const fluidDamp = (
    q("body_heaviness") + q("postmeal_burden") +
    0.25 * (["easier", "no_change"].includes(movement) ? 1 : 0)
  ) / 2.25;
  const cold = q("cold_pattern");
  const heat = q("heat_pattern");
  const accel = 0.5 * qiStagnation + 0.2 * heat + 0.15 * fluidDeficiency * heat + 0.15 * (movement === "easier" ? 1 : 0);
  const brake = 0.45 * fluidDamp + 0.2 * cold + 0.15 * qiDeficiency * cold +
    0.1 * bloodDeficiency * cold + 0.1 * (movement === "more_tired" ? 1 : movement === "no_change" ? 0.35 : 0);
  return accel - brake;
}

export function shouldAskReactionTiebreak(answers = {}) {
  return hasCompleteBase(answers) && Math.abs(roughReactionDifference(answers)) <= 0.08;
}

function matchRule(rule, answers) {
  if (!rule) return true;
  if (Array.isArray(rule.anyScoreAtLeast)) {
    return rule.anyScoreAtLeast.some((key) => scoreAtLeast(answers, key, rule.threshold));
  }
  if (rule.scoreAtLeast) return scoreAtLeast(answers, rule.scoreAtLeast, rule.threshold);
  if (rule.scoreAbove) {
    const score = answerScore(answers?.[rule.scoreAbove]);
    return score != null && score > rule.threshold;
  }
  if (rule.reactionTie) return shouldAskReactionTiebreak(answers);
  return true;
}

function branch(key) {
  return QUESTIONS_V2_BRANCH.find((question) => question.key === key);
}

function appendIfVisible(out, key, answers) {
  const question = branch(key);
  if (question && matchRule(question.showIf, answers)) out.push(question);
}

export function getBranchQuestions(answers = {}) {
  return QUESTIONS_V2_BRANCH.filter((question) => matchRule(question.showIf, answers));
}

export function getQuestions(answers = {}) {
  const out = [];
  for (const question of QUESTIONS_V2_BASE) {
    out.push(question);
    if (question.key === "postmeal_burden") appendIfVisible(out, "movement_response", answers);
    if (question.key === "fixed_discomfort") appendIfVisible(out, "blood_stasis_clues", answers);
    if (question.key === "orthostatic_unsteadiness") appendIfVisible(out, "blood_deficiency_clues", answers);
    if (question.key === "heat_pattern") appendIfVisible(out, "fluid_deficiency_clues", answers);
    if (question.key === "env_sensitivity") appendIfVisible(out, "env_vectors", answers);
  }
  appendIfVisible(out, "reaction_tiebreak", answers);
  return [...out, ...QUESTIONS_V2_FINAL];
}

export function getTotalQuestions(answers = {}) {
  return getQuestions(answers).length;
}

export function getQuestionMap() {
  return new Map(QUESTIONS_V2.map((question) => [question.key, question]));
}

export function getQuestionByKey(key) {
  return QUESTIONS_V2.find((question) => question.key === key) || null;
}

export function getQuestionById(id) {
  return QUESTIONS_V2.find((question) => question.id === id) || null;
}
