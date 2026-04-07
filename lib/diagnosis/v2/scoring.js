// lib/diagnosis/v2/scoring.js

/**
 * Diagnosis v2 Scoring Engine
 *
 * Core = yin_yang (accel / brake) × drive (batt_small / batt_standard / batt_large)
 *
 * - yin_yang_score: 踏み癖（アクセル / ブレーキ）
 * - drive_score: 余力（バッテリー）
 * - obstruction_score: 滞り・重さ・固定化の内部補助軸
 *
 * 設計メモ:
 * - steady は廃止し、yin_yang は 2値化
 * - thermo（寒熱の主観）は、方向の主役ではなく “境界補助” のみ
 * - blood_stasis は core の主方向づけより obstruction 寄り
 * - postmeal_heavy は fluid_damp 主、qi_deficiency 副
 * - symptom_focus は結果文 / radar 用。体質スコア主計算には基本使わない
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

const STARTUP_RESPONSE_FACTOR = {
  eases_with_movement: {
    qi_stagnation: 0.60,
    qi_deficiency: 0.10,
    fluid_damp: 0.10,
    blood_stasis: 0.10,
  },
  little_change: {
    qi_stagnation: 0.10,
    qi_deficiency: 0.20,
    fluid_damp: 0.20,
    blood_stasis: 0.45,
  },
  worse_with_movement: {
    qi_stagnation: 0.00,
    qi_deficiency: 0.55,
    fluid_damp: 0.35,
    blood_stasis: 0.10,
  },
  default: {
    qi_stagnation: 0.15,
    qi_deficiency: 0.35,
    fluid_damp: 0.35,
    blood_stasis: 0.15,
  },
};

const FIXED_RESPONSE_BONUS = {
  warm_better: {
    blood_stasis: 0.80,
  },
  move_better: {
    blood_stasis: 0.30,
    qi_stagnation: 0.60,
  },
  little_change: {
    blood_stasis: 1.50,
  },
  worse: {
    blood_stasis: 0.90,
    fluid_damp: 0.40,
  },
  default: {},
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

function candidateList(scores) {
  return Object.entries(scores)
    .filter(([, v]) => (v ?? 0) > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
}

function getFactor(dict, key, fallback = "default") {
  return dict[key] || dict[fallback] || {};
}

function getFreq(answers, nextKey, legacyKeys = []) {
  if (answers?.[nextKey] != null) return fp(answers[nextKey]);
  for (const k of legacyKeys) {
    if (answers?.[k] != null) return fp(answers[k]);
  }
  return 0;
}

function getSingle(answers, nextKey, legacyKeys = [], fallback = null) {
  if (answers?.[nextKey] != null) return answers[nextKey];
  for (const k of legacyKeys) {
    if (answers?.[k] != null) return answers[k];
  }
  return fallback;
}

function inferFixedResponse(answers) {
  if (answers?.fixed_response) return answers.fixed_response;
  if (fp(answers?.blood_flow_2) > 0) return "little_change";
  return "default";
}

function normalizeThermoAnswer(v) {
  return v || "neutral";
}

function decideTriState(deficiencyScore, stagnationScore) {
  if (deficiencyScore <= 0 && stagnationScore <= 0) return 0;

  const diff = deficiencyScore - stagnationScore;
  if (diff >= 1.5) return -1;
  if (diff <= -1.5) return +1;

  if (deficiencyScore > stagnationScore) return -1;
  if (stagnationScore > deficiencyScore) return +1;
  return 0;
}

function resiliencePenalty(freqKey) {
  const p = fp(freqKey);
  return [0, 0.10, 0.22, 0.34, 0.46][p] ?? 0.22;
}

function envPenalty(envSensitivity) {
  const n = Number(envSensitivity ?? 0);
  if (!Number.isFinite(n)) return 0;
  return clamp01(n / 3) * 0.16;
}

function thermoAssistBoundaryOnly(thermoAnswer, base) {
  if (Math.abs(base) >= 0.18) return 0;
  if (thermoAnswer === "cold") return -0.16;
  if (thermoAnswer === "heat") return +0.16;
  return 0;
}

function computeDriveScore({
  qi_deficiency,
  blood_deficiency,
  fluid_deficiency,
  carryoverFreqKey,
  envSensitivity,
}) {
  const qtyLoad =
    1.00 * qi_deficiency +
    1.00 * blood_deficiency +
    0.90 * fluid_deficiency;

  const qtyNorm = clamp01(qtyLoad / 8.5);

  let drive = 1 - 2 * qtyNorm;
  drive -= resiliencePenalty(carryoverFreqKey);
  drive -= envPenalty(envSensitivity);

  return clamp11(drive);
}

function computeObstructionScore({ qi_stagnation, blood_stasis, fluid_damp }) {
  const raw =
    (1.00 * qi_stagnation +
      1.00 * blood_stasis +
      1.05 * fluid_damp) /
    (qi_stagnation + blood_stasis + fluid_damp + 1);

  return clamp01(Math.sqrt(clamp01(raw)));
}

function labelYinYangBinary(yin_yang_score) {
  return yin_yang_score >= 0
    ? { key: "accel", tri: +1 }
    : { key: "brake", tri: -1 };
}

function labelDrive(drive_score) {
  if (drive_score >= 0.28) return { key: "batt_large", tri: +1 };
  if (drive_score <= -0.28) return { key: "batt_small", tri: -1 };
  return { key: "batt_standard", tri: 0 };
}

function buildCoreCode(yinYangKey, driveKey) {
  return `${yinYangKey}_${driveKey}`;
}

function pickSubLabels(materialScores, driveLabel) {
  const ranked = candidateList(materialScores);
  if (ranked.length === 0) return [];

  const deficiencyCodes = [
    "qi_deficiency",
    "blood_deficiency",
    "fluid_deficiency",
  ];

  const deficiencyEntries = ranked.filter(([code]) => deficiencyCodes.includes(code));

  const out = [ranked[0][0]];
  for (let i = 1; i < ranked.length && out.length < 2; i += 1) {
    const [code] = ranked[i];
    if (!out.includes(code)) out.push(code);
  }

  if (
    driveLabel === "batt_small" &&
    out.length >= 2 &&
    !deficiencyCodes.includes(out[0]) &&
    !deficiencyCodes.includes(out[1]) &&
    deficiencyEntries.length > 0
  ) {
    const [defCode, defScore] = deficiencyEntries[0];
    const secondScore = materialScores[out[1]] ?? 0;
    if (defScore >= secondScore - 2) {
      out[1] = defCode;
    }
  }

  return Array.from(new Set(out)).slice(0, 2);
}

export function scoreDiagnosis(answers = {}) {
  const symptom_focus =
    getSingle(answers, "symptom_focus", ["symptom_focus"], SYMPTOM_FOCUS_DEFAULT) ||
    SYMPTOM_FOCUS_DEFAULT;

  // --------------------------------------------------
  // New keys (v2 revised) with legacy fallback
  // --------------------------------------------------
  const fatigue_easy = getFreq(answers, "fatigue_easy", ["qi_qty"]);
  const carryover = getFreq(answers, "carryover", ["resilience"]);

  const qi_stuck = getFreq(answers, "qi_stuck", ["qi_flow_1"]);
  const tension_residue = getFreq(answers, "tension_residue", ["qi_flow_2"]);

  const fluid_heavy = getFreq(answers, "fluid_heavy", ["fluid_flow_1"]);
  const postmeal_heavy = getFreq(answers, "postmeal_heavy", ["fluid_flow_2"]);

  const fixed_location = getFreq(answers, "fixed_location", ["blood_flow_1"]);
  const startup_heavy = getFreq(answers, "startup_heavy", ["qi_common"]);

  const vision_blur = getFreq(answers, "vision_blur", ["blood_qty_2"]);
  const dryness_general = getFreq(answers, "dryness_general", ["fluid_qty_1"]);
  const stool_dry = getFreq(answers, "stool_dry", ["fluid_qty_2"]);

  const legacyBloodQty1 = fp(answers?.blood_qty_1);

  const thermoAnswer = normalizeThermoAnswer(
    getSingle(answers, "thermo", ["thermo"], "neutral")
  );

  const env_sensitivity =
    Number(getSingle(answers, "env_sensitivity", ["env_sensitivity"], 0)) || 0;

  const env_vectors_raw = safeArr(
    getSingle(answers, "env_vectors", ["env_vectors"], [])
  );
  const env_vectors = env_vectors_raw.includes("none")
    ? []
    : env_vectors_raw.slice(0, 2);

  const startup_response = getSingle(
    answers,
    "startup_response",
    [],
    "default"
  );
  const startupFactor = getFactor(STARTUP_RESPONSE_FACTOR, startup_response);

  const fixed_response = inferFixedResponse(answers);
  const fixedBonus = getFactor(FIXED_RESPONSE_BONUS, fixed_response);

  // --------------------------------------------------
  // Sub label scores
  // --------------------------------------------------
  const qi_deficiency =
    1.00 * fatigue_easy +
    0.60 * carryover +
    0.45 * postmeal_heavy +
    0.25 * fluid_heavy +
    0.50 * startup_heavy * (startupFactor.qi_deficiency ?? 0);

  const qi_stagnation =
    1.00 * qi_stuck +
    0.95 * tension_residue +
    0.50 * startup_heavy * (startupFactor.qi_stagnation ?? 0) +
    (fixedBonus.qi_stagnation ?? 0);

  const blood_stasis =
    1.00 * fixed_location +
    0.40 * startup_heavy * (startupFactor.blood_stasis ?? 0) +
    (fixedBonus.blood_stasis ?? 0);

  const blood_deficiency =
    1.00 * vision_blur +
    0.20 * legacyBloodQty1;

  const fluid_deficiency =
    1.00 * dryness_general +
    0.45 * stool_dry;

  const fluid_damp =
    1.00 * fluid_heavy +
    1.00 * postmeal_heavy +
    0.60 * startup_heavy * (startupFactor.fluid_damp ?? 0) +
    0.20 * fatigue_easy +
    (fixedBonus.fluid_damp ?? 0);

  // --------------------------------------------------
  // DB-compatible tri-state columns
  // --------------------------------------------------
  const qi = decideTriState(qi_deficiency, qi_stagnation);
  const blood = decideTriState(blood_deficiency, blood_stasis);
  const fluid = decideTriState(fluid_deficiency, fluid_damp);

  // --------------------------------------------------
  // Meridian
  // --------------------------------------------------
  const pKey = answers.meridian_primary;
  const sKey = answers.meridian_secondary;

  const primary_meridian = MERIDIAN_MAP[pKey] || null;
  let secondary_meridian = MERIDIAN_MAP[sKey] || null;

  if (pKey === "none") {
    secondary_meridian = null;
  }
  if (sKey === "none") {
    secondary_meridian = null;
  }
  if (secondary_meridian && secondary_meridian === primary_meridian) {
    secondary_meridian = null;
  }

  // --------------------------------------------------
  // yin_yang_score (2-value)
  // accel 主: qi_stagnation
  // brake 主: fluid_damp
  // qi_deficiency / startup_heavy は弱い brake 補助
  // thermo は境界補助のみ
  // --------------------------------------------------
  const accelCore =
    1.00 * qi_stagnation;

  const brakeCore =
    1.00 * fluid_damp +
    0.28 * qi_deficiency +
    0.32 * startup_heavy;

  const yinYangBase =
    1.40 * ((accelCore - brakeCore) / (accelCore + brakeCore + 1));

  const yin_yang_score = clamp11(
    yinYangBase + thermoAssistBoundaryOnly(thermoAnswer, yinYangBase)
  );

  // --------------------------------------------------
  // drive_score
  // --------------------------------------------------
  const drive_score = computeDriveScore({
    qi_deficiency,
    blood_deficiency,
    fluid_deficiency,
    carryoverFreqKey: answers.carryover ?? answers.resilience,
    envSensitivity: env_sensitivity,
  });

  // --------------------------------------------------
  // obstruction_score
  // --------------------------------------------------
  const obstruction_score = computeObstructionScore({
    qi_stagnation,
    blood_stasis,
    fluid_damp,
  });

  const yy = labelYinYangBinary(yin_yang_score);
  const dr = labelDrive(drive_score);

  const materialScores = {
    qi_deficiency,
    qi_stagnation,
    blood_deficiency,
    blood_stasis,
    fluid_deficiency,
    fluid_damp,
  };

  const sub_labels = pickSubLabels(materialScores, dr.key);
  const core_code = buildCoreCode(yy.key, dr.key);

  return {
    symptom_focus,

    // DB-compatible tri-state columns
    qi: clampTri(qi),
    blood: clampTri(blood),
    fluid: clampTri(fluid),

    // schema compatibility
    thermo: yy.tri,       // now = yin_yang tri
    resilience: dr.tri,   // now = drive tri
    is_mixed: false,

    primary_meridian,
    secondary_meridian,

    core_code,
    sub_labels,

    split_scores: {
      qi: {
        deficiency: qi_deficiency,
        stagnation: qi_stagnation,
        startup_heavy,
      },
      blood: {
        deficiency: blood_deficiency,
        stasis: blood_stasis,
      },
      fluid: {
        deficiency: fluid_deficiency,
        damp: fluid_damp,
      },
      total: {
        deficiency: qi_deficiency + blood_deficiency + fluid_deficiency,
        obstruction: qi_stagnation + blood_stasis + fluid_damp,
      },
    },

    env: {
      sensitivity: env_sensitivity,
      vectors: env_vectors,
    },

    axes: {
      yin_yang_score,
      drive_score,
      obstruction_score,
      yin_yang_label: yy.key,   // accel / brake
      drive_label: dr.key,      // batt_small / batt_standard / batt_large
      thermo_answer: thermoAnswer,
    },

    version: "v2",
    engine_version: "v2",
  };
}

export function buildConstitutionProfilePayload(userId, answers) {
  const computed = scoreDiagnosis(answers);

  return {
    user_id: userId,
    symptom_focus: computed.symptom_focus,

    qi: computed.qi,
    blood: computed.blood,
    fluid: computed.fluid,

    // schema compatibility
    cold_heat: computed.thermo,
    resilience: computed.resilience,

    primary_meridian: computed.primary_meridian,
    secondary_meridian: computed.secondary_meridian,

    organs: computed.primary_meridian ? [computed.primary_meridian] : [],

    answers,
    computed,

    thermo: computed.thermo,
    is_mixed: computed.is_mixed,
    core_code: computed.core_code,
    sub_labels: computed.sub_labels,
    engine_version: "v2",

    version: "v2",
  };
}
