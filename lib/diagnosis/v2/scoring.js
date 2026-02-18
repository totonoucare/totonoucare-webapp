// lib/diagnosis/v2/scoring.js

/**
 * Diagnosis v2 Scoring Engine (REFRESHED: 9 core types)
 *
 * Core = yin_yang (アクセル/安定/ブレーキ) × drive (バッテリー 小/標準/大)
 *
 * - yin_yang_score: 踏み癖（出力の使い方＝動かし方）
 *   accel(陽)  ←→  steady  ←→  brake(陰)
 *
 * - drive_score: 正気（余力＝バッテリー）
 *   batt_small ←→ batt_standard ←→ batt_large
 *
 * - obstruction_score: 邪実（詰まり/重さ/滞り：結果産物として別軸）
 *
 * Compatibility (DB/UIを壊さない):
 * - computed.core_code: 9 types code (e.g. "accel_batt_small")
 * - computed.sub_labels: up to 2 “整えポイント”
 * - thermo: repurposed as yin_yang tri (-1/0/+1)
 * - resilience: repurposed as drive tri (-1/0/+1)
 * - is_mixed: always false (mixedは軸に固定せずsteadyへ吸収)
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
 * Decide tri-state from split scores (DB-compatible qi/blood/fluid columns)
 * -1 = deficiency dominant, +1 = stagnation/flow dominant, 0 = none
 * NOTE: triは説明用。core判定の主軸には使わない（暴れるので）
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

/* ------------------------------------------------------------
 * ① yin_yang_score（踏み癖）: -1..+1
 *
 * 設計思想（ここが肝）：
 * - 「寒熱の自覚」はノイズが混じるので “補助（弱め）”
 * - 主成分は回答から推定する “使い方”
 *   accel(陽): 張り/詰まり/切替困難（気の動かし過多・テンション）
 *   brake(陰): 重だるさ/むくみ/湿（流れが鈍い・重い）
 * - 乾き（津液不足）や滋養不足（血虚）は「踏み癖」より「バッテリー」に寄せる
 * ------------------------------------------------------------ */

function thermoAssist(thermoAnswer) {
  // 自覚の寒熱は “補助” として 0.20 に固定（強くしない）
  if (thermoAnswer === "cold") return -0.20;
  if (thermoAnswer === "heat") return +0.20;
  // mixed/neutral は 0（steady側）
  return 0;
}

function computeYinYangScore({
  thermoAnswer,
  qi_flow,
  blood_flow,
  fluid_flow,
}) {
  // 0..(最大はざっくり 12～16)
  const total = qi_flow + blood_flow + fluid_flow + 1;

  // accel寄与：気滞（切替困難/張り）＋血の固さ（固定/変わらない）
  const accel = (1.00 * qi_flow + 0.55 * blood_flow) / total;

  // brake寄与：湿・重さ（むくみ/重だるさ）
  const brake = (1.15 * fluid_flow) / total;

  // 主軸は accel - brake、補助として thermo
  let yy = 1.35 * (accel - brake) + thermoAssist(thermoAnswer);

  return clamp11(yy);
}

/* ------------------------------------------------------------
 * ② drive_score（バッテリー）: -1..+1
 *
 * 設計思想：
 * - 主成分：量不足（気虚・血虚・津液不足）＝バッテリー容量
 * - 補正：持ち越し（resilience）＝実効出力/回復効率を削る
 * - 補正：環境感受性（env_sensitivity）＝外乱で削れる
 * - 詰まり（気滞/血瘀/痰湿）は “バッテリー” ではなく obstruction に寄せる
 *
 * 重要：ここでは「totalで割って比率化」しない。
 * 量不足は “絶対量（症状量）” として扱う方が、世界観と説明が崩れない。
 * ------------------------------------------------------------ */

function resiliencePenalty(resilienceFreqKey) {
  // “寝ても持ち越す”の頻度（0..4）をバッテリー減点へ
  const p = fp(resilienceFreqKey); // 0..4
  // 0:0, 1:0.10, 2:0.22, 3:0.34, 4:0.44
  return [0, 0.10, 0.22, 0.34, 0.44][p] ?? 0.22;
}

function envPenalty(envSensitivity) {
  const n = Number(envSensitivity ?? 0);
  if (!Number.isFinite(n)) return 0;
  // 0..3 -> 0..0.16
  return clamp01(n / 3) * 0.16;
}

function computeDriveScore({
  qi_qty,
  blood_qty,
  fluid_qty,
  qi_common,
  resilienceFreqKey,
  envSensitivity,
}) {
  // qty不足（0..最大）
  // - qi_qty: 0..4
  // - blood_qty: 0..8
  // - fluid_qty: 0..8
  // - qi_common（朝の重さ/だるさ）は “燃料不足寄り” として 0.5 で加点
  const qtyDef = qi_qty + blood_qty + fluid_qty + 0.5 * qi_common; // 0..(4+8+8+2)=22

  // 正規化：16 を“中庸目安”として扱う（重すぎると batt_small に落ちやすい）
  // qtyDef=0 → +1 に近い、qtyDef=16 → -1 に近い
  const qtyNorm = clamp01(qtyDef / 16);

  // 量不足が増えるほど drive が下がる（+1..-1）
  let drive = 1 - 2 * qtyNorm;

  // 実効補正（持ち越し・外乱で削れる）
  drive -= resiliencePenalty(resilienceFreqKey);
  drive -= envPenalty(envSensitivity);

  return clamp11(drive);
}

/* ------------------------------------------------------------
 * ③ obstruction_score（邪実）: 0..1
 * 詰まり/重さ/滞り（結果産物）。coreとは独立軸。
 * ------------------------------------------------------------ */
function computeObstructionScore({ qi_flow, blood_flow, fluid_flow }) {
  const total = qi_flow + blood_flow + fluid_flow + 1;
  const raw =
    (1.00 * qi_flow + 1.00 * blood_flow + 1.10 * fluid_flow) / total; // 0..~1
  // sqrt圧縮：暴れ防止
  return clamp01(Math.sqrt(clamp01(raw)));
}

/* ------------------------------------------------------------
 * ④ ラベル化（3×3）
 * ------------------------------------------------------------ */
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
 * - 不足も詰まりも同居OK（血虚×血瘀など）
 * - max 2
 * - “同系統の重複”を軽く抑制（ただし差が大きいなら同系統でも採用）
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

    if (out.length === 1) {
      const g1 = groupOf(out[0]);
      const g2 = groupOf(code);
      if (g1 === g2) {
        const s1 = materialScores[out[0]] ?? 0;
        const s2 = materialScores[code] ?? 0;
        if (s2 < s1 + 2) continue; // 近いなら別系統を優先
      }
    }

    out.push(code);
  }

  return out;
}

export function scoreDiagnosis(answers = {}) {
  const symptom_focus = answers.symptom_focus || SYMPTOM_FOCUS_DEFAULT;

  // ----------------
  // Split scores（質問は現状維持）
  // ----------------
  const qi_common = fp(answers.qi_common);
  let qi_qty_score = fp(answers.qi_qty);
  let qi_flow_score = fp(answers.qi_flow_1) + fp(answers.qi_flow_2);

  // allocate common buffer（互換維持）
  if (qi_flow_score >= qi_qty_score) qi_flow_score += qi_common;
  else qi_qty_score += qi_common;

  const blood_qty_score = fp(answers.blood_qty_1) + fp(answers.blood_qty_2);
  const blood_flow_score = fp(answers.blood_flow_1) + fp(answers.blood_flow_2);

  const fluid_qty_score = fp(answers.fluid_qty_1) + fp(answers.fluid_qty_2);
  const fluid_flow_score = fp(answers.fluid_flow_1) + fp(answers.fluid_flow_2);

  // tri-state columns（DB互換）
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

  // sub_labels（整えポイント）
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
  // NEW: axes（9タイプ）
  // ----------------
  const thermoAnswer = answers.thermo || "neutral"; // mixedもここに来るが、assistは0でsteady側へ

  const yin_yang_score = computeYinYangScore({
    thermoAnswer,
    qi_flow: qi_flow_score,
    blood_flow: blood_flow_score,
    fluid_flow: fluid_flow_score,
  });

  const drive_score = computeDriveScore({
    qi_qty: qi_qty_score,
    blood_qty: blood_qty_score,
    fluid_qty: fluid_qty_score,
    qi_common,
    resilienceFreqKey: answers.resilience,
    envSensitivity: env_sensitivity,
  });

  const obstruction_score = computeObstructionScore({
    qi_flow: qi_flow_score,
    blood_flow: blood_flow_score,
    fluid_flow: fluid_flow_score,
  });

  const yy = labelYinYang(yin_yang_score);
  const dr = labelDrive(drive_score);

  const core_code = buildCoreCode(yy.key, dr.key);

  // Compatibility: thermo/resilience reuse（tri）
  const thermo = yy.tri;         // -1/0/+1 (yin_yang)
  const resilience = dr.tri;     // -1/0/+1 (drive)
  const is_mixed = false;        // mixedは軸にしない（steadyへ吸収）

  return {
    symptom_focus,

    // DB-compatible tri-state columns（説明用）
    qi: clampTri(qi),
    blood: clampTri(blood),
    fluid: clampTri(fluid),

    // repurposed columns（互換維持）
    thermo,
    resilience,
    is_mixed,

    // meridians
    primary_meridian,
    secondary_meridian,

    // UI
    core_code,   // 9 types
    sub_labels,  // max 2

    // explainability
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

    // internal axes（保存してOK）
    axes: {
      yin_yang_score,       // -1..+1
      drive_score,          // -1..+1
      obstruction_score,    // 0..1
      yin_yang_label: yy.key, // accel/steady/brake
      drive_label: dr.key,    // batt_small/batt_standard/batt_large
      thermo_answer: thermoAnswer,
    },

    version: "v2",
    engine_version: "v2",
  };
}

/**
 * Prepare DB payload for constitution_profiles (latest cache)
 * ※ schema互換：cold_heat に thermo を、resilience に drive を入れる
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
    cold_heat: computed.thermo,        // (now: yin_yang tri)
    resilience: computed.resilience,   // (now: drive tri)

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
