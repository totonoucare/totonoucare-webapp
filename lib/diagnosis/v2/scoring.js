// lib/diagnosis/v2/scoring.js

/**
 * Diagnosis v2 Scoring Engine (REFRESHED: 9 core types)
 *
 * Core = yin_yang (アクセル/安定/ブレーキ) × drive (バッテリー 小/標準/大)
 * - yin_yang_score: 運転癖（出力の使い方・動かし方）
 * - drive_score: 正気（エネルギー/滋養/潤いの総合余力＝バッテリー）
 * - obstruction_score: 邪実（詰まり/重さ/滞り：結果産物として別軸）
 *
 * Compatibility:
 * - computed.core_code: 9 types code (e.g. "accel_batt_small")
 * - computed.sub_labels: still outputs up to 2 “整えポイント”
 * - thermo: reused as yin_yang tri (-1/0/+1)
 * - resilience: reused as drive tri (-1/0/+1)
 * - is_mixed: always false
 */

const MERIDIAN_MAP = {
  A: "kidney_bl",
  B: "spleen_st",
  C: "liver_gb",
  D: "heart_si",
  E: "lung_li",
  F: "pc_sj",
};

const SYMPTOM_FOCUS_DEFAULT = "fatigue";

const FREQ_POINTS = {
  "0": 0,
  "1_2": 1,
  "3_5": 2,
  "6_9": 3,
  "10p": 4,
};

function fp(v) {
  return FREQ_POINTS[v] ?? 0;
}

function clamp11(v) {
  return Math.max(-1, Math.min(1, v));
}
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
function clampTri(v) {
  if (v > 0) return 1;
  if (v < 0) return -1;
  return 0;
}
function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * Candidate list: sort positive scores desc, tie by code asc
 */
function candidateList(scores) {
  return Object.entries(scores)
    .filter(([, v]) => (v ?? 0) > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
}

/**
 * Decide tri-state from split scores (kept for DB-compatible qi/blood/fluid columns)
 * -1 = deficiency dominant, +1 = stagnation/flow dominant, 0 = none
 * NOTE: tri is “説明用の粗い方向”で、core判定には直接使わない
 */
function decideTriState(deficiencyScore, stagnationScore, symptom_focus, kind) {
  if (deficiencyScore <= 0 && stagnationScore <= 0) return 0;

  const diff = deficiencyScore - stagnationScore;

  // clear wins
  if (diff >= 2) return -1;
  if (diff <= -2) return +1;

  // close -> tie-break（最小限）
  const sf = symptom_focus || SYMPTOM_FOCUS_DEFAULT;

  if (kind === "qi") {
    if (sf === "mood" || sf === "headache") return +1;
    if (sf === "fatigue" || sf === "sleep") return -1;
  }
  if (kind === "blood") {
    if (sf === "headache") return +1;
    if (sf === "sleep" || sf === "fatigue") return -1;
  }
  if (kind === "fluid") {
    if (sf === "swelling" || sf === "dizziness") return +1;
    if (sf === "headache" || sf === "mood") return 0;
  }

  // fallback deterministic
  if (deficiencyScore > stagnationScore) return -1;
  if (stagnationScore > deficiencyScore) return +1;
  return 0;
}

/**
 * ----- NEW AXES -----
 * yin_yang_score (-1..+1): ブレーキ(陰) ←→ アクセル(陽)
 *
 * 設計意図：
 * - “寒熱主観”はノイズが混じるので軽め（補助）
 * - 実データ（回答）から「動かし方」を推定する
 *   - 気の“動き/張り/切替困難”が多いほどアクセル寄り
 *   - 水分の“重さ/むくみ/湿”が多いほどブレーキ寄り
 *   - 乾き（津液不足）や滋養不足（血虚）は「運転癖」ではなく主にバッテリー側へ
 */
function thermoAssist(thermoAnswer) {
  // 0.30 まで落とす（旧0.6相当はやめる）
  // cold:-0.30, heat:+0.30, mixed/neutral:0
  if (thermoAnswer === "cold") return -0.30;
  if (thermoAnswer === "heat") return +0.30;
  return 0;
}

function computeYinYangScore({
  thermoAnswer,
  qi_flow,
  qi_common,
  blood_flow,
  fluid_flow,
  fluid_qty,
  blood_qty,
}) {
  // totals (0..)
  const total = qi_flow + qi_common + blood_flow + fluid_flow + fluid_qty + blood_qty + 1;

  // “動き/張り/切替困難”= アクセル方向（陽）
  const move = (qi_flow + 0.4 * blood_flow) / total; // 0..~1
  // “重さ/湿/むくみ”= ブレーキ方向（陰）
  const damp = (fluid_flow + 0.25 * fluid_qty) / total;

  // 乾き/滋養不足はここでは強く扱わない（driveへ）
  // スコアは move - damp を主軸に、thermo補助を足す
  let yy = 1.25 * (move - damp) + thermoAssist(thermoAnswer);

  return clamp11(yy);
}

/**
 * drive_score (-1..+1): バッテリー（正気）
 *
 * 設計意図：
 * - 気・血・津液の“量”を正気の主材料として評価（容量/余力）
 * - 回復の遅さ（resilience質問）や環境感受性は、実運用上バッテリーを削る方向として反映
 * - 詰まり（血瘀/痰湿/気滞）は「結果物」として obstruction へ分離（driveへ寄せない）
 */
function resiliencePenalty(resilienceFreqKey) {
  // “寝ても持ち越す”が多いほどバッテリーが小さい側へ
  const p = fp(resilienceFreqKey); // 0..4
  // 0:0, 1:0.10, 2:0.22, 3:0.35, 4:0.45
  return [0, 0.10, 0.22, 0.35, 0.45][p] ?? 0.22;
}

function envPenalty(envSensitivity) {
  const n = Number(envSensitivity ?? 0);
  if (!Number.isFinite(n)) return 0;
  // 0..3 -> 0..0.18
  return clamp01(n / 3) * 0.18;
}

function computeDriveScore({
  qi_qty,
  blood_qty,
  fluid_qty,
  qi_common,
  resilienceFreqKey,
  envSensitivity,
}) {
  const total = qi_qty + blood_qty + fluid_qty + qi_common + 1;

  // バッテリー材料：量（気血津液）を中心に
  const capacity = (qi_qty + blood_qty + fluid_qty + 0.5 * qi_common) / total; // 0..~1

  // 0.5 を中庸として -1..+1 に正規化（ざっくり）
  let drive = 2.4 * (capacity - 0.50);

  // 立て直しの遅れ・刺激耐性の弱さを減点
  drive -= resiliencePenalty(resilienceFreqKey);
  drive -= envPenalty(envSensitivity);

  return clamp11(drive);
}

/**
 * obstruction_score (0..1): 邪実（詰まり・重さ・滞り）
 *
 * - qi_stagnation / blood_stasis / fluid_damp を中心に
 * - “量不足”は obstruction に入れない（driveへ）
 */
function computeObstructionScore({ qi_flow, blood_flow, fluid_flow, total }) {
  // flowの総量が大きいほど obstruction は上がる（ただし暴れないように圧縮）
  const raw = (1.0 * qi_flow + 1.0 * blood_flow + 1.1 * fluid_flow) / (total + 1);
  return clamp01(Math.sqrt(clamp01(raw))); // 0..1（圧縮）
}

function labelYinYang(yin_yang_score) {
  if (yin_yang_score >= 0.22) return { key: "accel", tri: +1 };
  if (yin_yang_score <= -0.22) return { key: "brake", tri: -1 };
  return { key: "steady", tri: 0 };
}

function labelDrive(drive_score) {
  if (drive_score >= 0.22) return { key: "batt_large", tri: +1 };
  if (drive_score <= -0.22) return { key: "batt_small", tri: -1 };
  return { key: "batt_standard", tri: 0 };
}

function buildCoreCode(yinKey, driveKey) {
  return `${yinKey}_${driveKey}`; // e.g. accel_batt_small
}

/**
 * sub_labels selection:
 * - “不足”も“詰まり”も同居OK（血虚×血瘀など）
 * - max 2 を維持（UI互換）
 * - ただし“似た意味の重複”を避ける軽い抑制だけ入れる
 */
function pickSubLabels(materialScores) {
  const ranked = candidateList(materialScores);
  const out = [];

  const groupOf = (code) => {
    if (code.startsWith("qi_")) return "qi";
    if (code.startsWith("blood_")) return "blood";
    if (code.startsWith("fluid_")) return "fluid";
    return "misc";
  };

  for (const [code] of ranked) {
    if (out.length >= 2) break;

    // 同一グループ2つは原則避ける（ただし血虚×血瘀など強い場合は許容したい）
    // → 条件：2枠目で同一グループなら、スコア差が大きい時だけ採用
    if (out.length === 1) {
      const g1 = groupOf(out[0]);
      const g2 = groupOf(code);
      if (g1 === g2) {
        const s1 = materialScores[out[0]] ?? 0;
        const s2 = materialScores[code] ?? 0;
        if (s2 < s1 + 2) continue; // 近いならスキップ（違う系統を優先）
      }
    }

    out.push(code);
  }

  return out;
}

export function scoreDiagnosis(answers = {}) {
  const symptom_focus = answers.symptom_focus || SYMPTOM_FOCUS_DEFAULT;

  // ----------------
  // Split scores (same question set)
  // ----------------
  const qi_common = fp(answers.qi_common);
  let qi_qty_score = fp(answers.qi_qty);
  let qi_flow_score = fp(answers.qi_flow_1) + fp(answers.qi_flow_2);

  // allocate common buffer (kept)
  if (qi_flow_score >= qi_qty_score) qi_flow_score += qi_common;
  else qi_qty_score += qi_common;

  const blood_qty_score = fp(answers.blood_qty_1) + fp(answers.blood_qty_2);
  const blood_flow_score = fp(answers.blood_flow_1) + fp(answers.blood_flow_2);

  const fluid_qty_score = fp(answers.fluid_qty_1) + fp(answers.fluid_qty_2);
  const fluid_flow_score = fp(answers.fluid_flow_1) + fp(answers.fluid_flow_2);

  // tri-state columns (DB compatibility)
  const qi = decideTriState(qi_qty_score, qi_flow_score, symptom_focus, "qi");
  const blood = decideTriState(blood_qty_score, blood_flow_score, symptom_focus, "blood");
  const fluid = decideTriState(fluid_qty_score, fluid_flow_score, symptom_focus, "fluid");

  // ENV
  const env_sensitivity = Number(answers.env_sensitivity ?? 0) || 0;
  const env_vectors_raw = safeArr(answers.env_vectors);
  const env_vectors = env_vectors_raw.includes("none") ? [] : env_vectors_raw.slice(0, 2);

  // Meridians
  const pKey = answers.meridian_primary;
  const sKey = answers.meridian_secondary;

  const primary_meridian = MERIDIAN_MAP[pKey] || null;
  let secondary_meridian = MERIDIAN_MAP[sKey] || null;

  if (sKey === "none") secondary_meridian = null;
  if (pKey === "none") secondary_meridian = null;
  if (secondary_meridian && secondary_meridian === primary_meridian) secondary_meridian = null;

  // material scores（整えポイント用）
  const materialScores = {
    qi_deficiency: qi_qty_score,
    qi_stagnation: qi_flow_score,
    blood_deficiency: blood_qty_score,
    blood_stasis: blood_flow_score,
    fluid_deficiency: fluid_qty_score,
    fluid_damp: fluid_flow_score,
  };

  const sub_labels = pickSubLabels(materialScores);

  // ----------------
  // NEW: axes
  // ----------------
  const thermoAnswer = answers.thermo || "neutral";

  const yin_yang_score = computeYinYangScore({
    thermoAnswer,
    qi_flow: qi_flow_score,
    qi_common,
    blood_flow: blood_flow_score,
    fluid_flow: fluid_flow_score,
    fluid_qty: fluid_qty_score,
    blood_qty: blood_qty_score,
  });

  const drive_score = computeDriveScore({
    qi_qty: qi_qty_score,
    blood_qty: blood_qty_score,
    fluid_qty: fluid_qty_score,
    qi_common,
    resilienceFreqKey: answers.resilience,
    envSensitivity: env_sensitivity,
  });

  const totalAll =
    qi_qty_score +
    qi_flow_score +
    blood_qty_score +
    blood_flow_score +
    fluid_qty_score +
    fluid_flow_score;

  const obstruction_score = computeObstructionScore({
    qi_flow: qi_flow_score,
    blood_flow: blood_flow_score,
    fluid_flow: fluid_flow_score,
    total: totalAll,
  });

  const yy = labelYinYang(yin_yang_score);
  const dr = labelDrive(drive_score);

  const core_code = buildCoreCode(yy.key, dr.key);

  // Compatibility: thermo/resilience reuse (tri)
  const thermo = yy.tri;        // -1/0/+1 (yin_yang)
  const resilience = dr.tri;    // -1/0/+1 (drive)
  const is_mixed = false;

  return {
    symptom_focus,

    // DB-compatible tri-state columns (still useful for explain/debug)
    qi: clampTri(qi),
    blood: clampTri(blood),
    fluid: clampTri(fluid),

    // repurposed
    thermo,
    resilience,
    is_mixed,

    // meridians
    primary_meridian,
    secondary_meridian,

    // UI
    core_code,     // 9 types now
    sub_labels,    // max 2

    // explainability payload
    split_scores: {
      qi: { qty: qi_qty_score, flow: qi_flow_score, common: qi_common },
      blood: { qty: blood_qty_score, flow: blood_flow_score },
      fluid: { qty: fluid_qty_score, flow: fluid_flow_score },
      total: {
        qty: qi_qty_score + blood_qty_score + fluid_qty_score,
        flow: qi_flow_score + blood_flow_score + fluid_flow_score,
      },
    },
    env: { sensitivity: env_sensitivity, vectors: env_vectors },

    // new axes (internal but保存してOK)
    axes: {
      yin_yang_score,     // -1..+1
      drive_score,        // -1..+1
      obstruction_score,  // 0..1
      yin_yang_label: yy.key, // brake/steady/accel
      drive_label: dr.key,    // batt_small/batt_standard/batt_large
      thermo_answer: thermoAnswer,
    },

    version: "v2",
    engine_version: "v2",
  };
}

/**
 * Prepare DB payload for constitution_profiles (latest cache)
 */
export function buildConstitutionProfilePayload(userId, answers) {
  const computed = scoreDiagnosis(answers);

  return {
    user_id: userId,
    symptom_focus: computed.symptom_focus,

    qi: computed.qi,
    blood: computed.blood,
    fluid: computed.fluid,

    // repurposed columns
    cold_heat: computed.thermo, // (now: yin_yang tri)
    resilience: computed.resilience, // (now: drive tri)

    primary_meridian: computed.primary_meridian,
    secondary_meridian: computed.secondary_meridian,

    organs: computed.primary_meridian ? [computed.primary_meridian] : [],

    answers,
    computed,

    // keep schema fields
    thermo: computed.thermo,
    is_mixed: computed.is_mixed,
    core_code: computed.core_code,
    sub_labels: computed.sub_labels,
    engine_version: "v2",

    version: "v2",
  };
}
