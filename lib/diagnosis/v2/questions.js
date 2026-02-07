// lib/diagnosis/v2/questions.js

/**
 * Diagnosis v2 Questions (FINAL SPEC)
 *
 * - default window: last 14 days (frequency buckets)
 * - exceptions:
 *   - Q-T1 thermo: "usual tendency"
 *   - Q-M1/Q-M2: movement test "try lightly now"
 *
 * Answer formats:
 * - freq5: 0 / 1-2 / 3-5 / 6-9 / 10+
 * - single: single choice
 * - multi(max=2)
 */

export const FREQ5_OPTIONS = [
  { label: "0日", value: "0" },
  { label: "1〜2日", value: "1_2" },
  { label: "3〜5日", value: "3_5" },
  { label: "6〜9日", value: "6_9" },
  { label: "10日以上", value: "10p" },
];

export const QUESTIONS_V2 = [
  // ----------------
  // S: symptom focus
  // ----------------
  {
    id: "Q-S1",
    key: "symptom_focus",
    block: "S",
    type: "single",
    title: "この2週間で、いちばん困っている不調はどれですか？（1つ）",
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

  // -------
  // Qi (量×流れ)
  // -------
  {
    id: "Q-Qi1",
    key: "qi_common",
    block: "QI",
    type: "freq5",
    title:
      "この2週間で、朝や動き始めに「重い／だるい／エンジンがかからない」と感じた日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q-Qi2",
    key: "qi_qty",
    block: "QI",
    type: "freq5",
    title:
      "この2週間で、特別な用事がない日でも「すぐ息切れする／電池切れする」と感じた日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q-Qi3",
    key: "qi_flow_1",
    block: "QI",
    type: "freq5",
    title:
      "この2週間で、胸・喉・みぞおち・お腹などに「詰まる／張る／つかえる」感じがあった日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q-Qi4",
    key: "qi_flow_2",
    block: "QI",
    type: "freq5",
    title:
      "この2週間で、ストレス・緊張のあとに「切り替えづらい／ため息が増える／イライラが残る」と感じた日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },

  // -------
  // Blood (血虚×血瘀)
  // -------
  {
    id: "Q-BQ1",
    key: "blood_qty_1",
    block: "BL",
    type: "freq5",
    title:
      "この2週間で、「頭が働かない／考えがまとまらない／集中が続かない」と感じた日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q-BQ2",
    key: "blood_qty_2",
    block: "BL",
    type: "freq5",
    title:
      "この2週間で、「目がかすむ／ピントが合いづらい／目が乾く」と感じた日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q-BF1",
    key: "blood_flow_1",
    block: "BL",
    type: "freq5",
    title:
      "（体の中の「巡り」や「滞り」の傾向を見る質問です）\nこの2週間で、不調を感じる場所が「毎回ほぼ同じ場所」だと感じた日は何日くらいありましたか？\n（首・肩・頭・お腹・腰など、痛み以外の違和感も含みます）",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q-BF2",
    key: "blood_flow_2",
    block: "BL",
    type: "freq5",
    title:
      "この2週間で、不調の強さが「動いたり、休んだり、温めたりしても、あまり変わらない」と感じた日は何日くらいありましたか？\n（こり・違和感・重だるさなどを含みます）",
    options: FREQ5_OPTIONS,
  },

  // -------
  // Fluid (津液 量×流れ)
  // -------
  {
    id: "Q-FQ1",
    key: "fluid_qty_1",
    block: "FL",
    type: "freq5",
    title:
      "この2週間で、「喉が乾く／口が乾く／肌が乾燥する」と感じた日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q-FQ2",
    key: "fluid_qty_2",
    block: "FL",
    type: "freq5",
    title:
      "この2週間で、便が「硬い／出にくい／スッキリしない」と感じた日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q-FF1",
    key: "fluid_flow_1",
    block: "FL",
    type: "freq5",
    title:
      "この2週間で、「体が重い／だるい／むくみっぽい」と感じた日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },
  {
    id: "Q-FF2",
    key: "fluid_flow_2",
    block: "FL",
    type: "freq5",
    title:
      "この2週間で、天候が変わる前後に「ふわふわする／頭が重い／めまいっぽい」と感じた日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },

  // -------
  // T: thermo (usual tendency)
  // -------
  {
    id: "Q-T1",
    key: "thermo",
    block: "T",
    type: "single",
    title: "普段の体調として、あなたに一番近いものはどれですか？",
    options: [
      { label: "寒さや冷えの方がつらく、温めると楽になりやすい", value: "cold" },
      { label: "暑さやほてりの方がつらく、涼しくすると楽になりやすい", value: "heat" },
      { label: "どちらとも言えず、季節や体調で変わりやすい", value: "mixed" },
      { label: "どちらもあまり気にならない", value: "neutral" },
    ],
  },

  // -------
  // ENV: environment sensitivity (year scale)
  // -------
  {
    id: "Q-ENV1",
    key: "env_sensitivity",
    block: "ENV",
    type: "single",
    title: "1年を通して、天候が“変わる前後”に体調が左右されやすいですか？",
    options: [
      { label: "ほとんどない", value: "0" },
      { label: "たまにある", value: "1" },
      { label: "わりとある", value: "2" },
      { label: "かなりある", value: "3" },
    ],
  },
  {
    id: "Q-ENV2",
    key: "env_vectors",
    block: "ENV",
    type: "multi",
    max: 2,
    title: "1年の中で、天候や環境が変わる前後に影響が出やすいのはどれですか？（最大2つ）",
    options: [
      { label: "寒さに寄った変化（冷え・冷風・冷房が入った時）", value: "cold_shift" },
      { label: "暑さに寄った変化（蒸し暑さ・急に暑い室内/日差し）", value: "heat_shift" },
      { label: "湿気に寄った変化（雨の前後・梅雨入り前後など）", value: "damp_shift" },
      { label: "乾燥に寄った変化（喉/肌/目が乾く・乾きが強まる時）", value: "dry_shift" },
      { label: "季節の変わり目（春/秋/梅雨入りなど“切り替わり”）", value: "season_shift" },
      { label: "特にない", value: "none" },
    ],
  },

  // -------
  // R: resilience (last 14 days)
  // -------
  {
    id: "Q-R1",
    key: "resilience",
    block: "R",
    type: "freq5",
    title:
      "この2週間で、「寝ても疲れが抜けず、翌日に持ち越した」と感じた日は何日くらいありますか？",
    options: FREQ5_OPTIONS,
  },

  // -------
  // M: movement test (try now)
  // primary + secondary
  // -------
  {
    id: "Q-M1",
    key: "meridian_primary",
    block: "M",
    type: "single",
    title:
      "次の動作を“軽く試したとき”、一番ツラさ・張り・違和感が出やすいものを選んでください（1つ）\n（無理に伸ばさず、痛みが出る手前でOK）",
    options: [
      { label: "前屈する（背中〜腰・脚の後ろがつらい）【腎/膀胱ライン】", value: "A" },
      { label: "上体を反らす（お腹・前ももがつらい）【脾/胃ライン】", value: "B" },
      { label: "体を左右にひねる・側屈する（脇腹・股関節周囲がつらい）【肝/胆ライン】", value: "C" },
      { label: "腕を上げる・首をうつむける（肩・肩甲骨まわり）【心/小腸ライン】", value: "D" },
      { label: "首を後ろに倒す・横を向く（首・鎖骨まわり）【肺/大腸ライン】", value: "E" },
      { label: "腕を横から上げる（上肢外側がつらい）【心包/三焦ライン】", value: "F" },
      { label: "どれも強くない", value: "none" },
    ],
  },
  {
    id: "Q-M2",
    key: "meridian_secondary",
    block: "M",
    type: "single",
    title:
      "（任意）その次にツラさが出やすい動作があれば選んでください（0〜1つ）",
    options: [
      { label: "前屈する（背中〜腰・脚の後ろがつらい）【腎/膀胱ライン】", value: "A" },
      { label: "上体を反らす（お腹・前ももがつらい）【脾/胃ライン】", value: "B" },
      { label: "体を左右にひねる・側屈する（脇腹・股関節周囲がつらい）【肝/胆ライン】", value: "C" },
      { label: "腕を上げる・首をうつむける（肩・肩甲骨まわり）【心/小腸ライン】", value: "D" },
      { label: "首を後ろに倒す・横を向く（首・鎖骨まわり）【肺/大腸ライン】", value: "E" },
      { label: "腕を横から上げる（上肢外側がつらい）【心包/三焦ライン】", value: "F" },
      { label: "選ばない", value: "none" },
    ],
  },
];

export function getQuestionMap() {
  const m = new Map();
  for (const q of QUESTIONS_V2) m.set(q.key, q);
  return m;
}

// ----------------------------
// Backward-compatible exports
// (app/check/page.js expects these)
// ----------------------------

/** Return all questions in order */
export function getQuestions() {
  return QUESTIONS_V2;
}

/** Total number of questions */
export function getTotalQuestions() {
  return QUESTIONS_V2.length;
}

/** Optional helper: find by key (safe) */
export function getQuestionByKey(key) {
  return QUESTIONS_V2.find((q) => q.key === key) || null;
}

/** Optional helper: find by id (safe) */
export function getQuestionById(id) {
  return QUESTIONS_V2.find((q) => q.id === id) || null;
}
