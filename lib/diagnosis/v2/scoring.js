// lib/diagnosis/v2/scoring.js

/**
 * Diagnosis v2 Scoring Engine (FINAL SHAPE)
 *
 * ✅ Outputs fields required by:
 * - result page UI (core_code, sub_labels, primary_meridian ...)
 * - attach API (constitution_events insert needs core_code, thermo, is_mixed ...)
 *
 * Core (8 types):
 *   cold_low, cold_high, neutral_low, neutral_high,
 *   heat_low, heat_high, mixed_low, mixed_high
 *
 * Sub labels (max 2):
 *   slot1 = symptom_focus
 *   slot2 = strongest material (qi/blood/fluid) chosen by rules (NOT weather)
 *
 * Meridian groups (A-E):
 *   lung_li, heart_si, kidney_bl, liver_gb, spleen_st
 */

const MERIDIAN_GROUP_MAP = {
  A: ["lung_li", "large_intestine"],
  B: ["heart_si", "small_intestine"],
  C: ["kidney_bl", "bladder"],
  D: ["liver_gb", "gallbladder"],
  E: ["spleen_st", "stomach"],
};

function toTriState(v) {
  return v === -1 || v === 0 || v === 1 ? v : 0;
}

function coldHeatToNum(coldHeat) {
  if (coldHeat === "cold") return -1;
  if (coldHeat === "heat") return +1;
  // neutral / mixed は 0（mixedは別フラグで持つ）
  return 0;
}

function resilienceToNum(res) {
  if (res === "low") return -1;
  if (res === "high") return +1;
  return 0; // medium
}

function computeCoreCode({ cold_heat_num, resilience_num, is_mixed }) {
  const hi = resilience_num === 1; // high だけ「high」扱い
  if (is_mixed) return hi ? "mixed_high" : "mixed_low";
  if (cold_heat_num === -1) return hi ? "cold_high" : "cold_low";
  if (cold_heat_num === +1) return hi ? "heat_high" : "heat_low";
  return hi ? "neutral_high" : "neutral_low";
}

function materialCandidates({ qi, blood, fluid }) {
  const cands = [];
  if (qi === -1) cands.push({ code: "qi_deficiency", key: "qi", dir: -1 });
  if (qi === +1) cands.push({ code: "qi_stagnation", key: "qi", dir: +1 });

  if (blood === -1) cands.push({ code: "blood_deficiency", key: "blood", dir: -1 });
  if (blood === +1) cands.push({ code: "blood_stasis", key: "blood", dir: +1 });

  if (fluid === -1) cands.push({ code: "fluid_deficiency", key: "fluid", dir: -1 });
  if (fluid === +1) cands.push({ code: "fluid_damp", key: "fluid", dir: +1 });

  return cands;
}

/**
 * 2枠目（素材ラベル）の重み付け
 * - 天気では選ばない（説明の増幅に使う）
 * - 主訴 / 寒熱 / 回復力で tie-break
 */
function pickSecondSubLabel({ symptom_focus, cold_heat_num, resilience_num, qi, blood, fluid }) {
  const cands = materialCandidates({ qi, blood, fluid });
  if (!cands.length) return null;

  // base score（全員同じ土台）
  const scores = new Map();
  for (const c of cands) scores.set(c.code, 1);

  // 主訴で寄せる（納得感）
  // ※ここは「強制」ではなく加点に留める
  if (symptom_focus === "mood") {
    if (qi === +1) scores.set("qi_stagnation", (scores.get("qi_stagnation") || 0) + 2);
  }
  if (symptom_focus === "swelling" || symptom_focus === "dizziness") {
    if (fluid === +1) scores.set("fluid_damp", (scores.get("fluid_damp") || 0) + 2);
  }
  if (symptom_focus === "headache") {
    if (blood === +1) scores.set("blood_stasis", (scores.get("blood_stasis") || 0) + 1);
    if (qi === +1) scores.set("qi_stagnation", (scores.get("qi_stagnation") || 0) + 1);
  }
  if (symptom_focus === "sleep") {
    if (blood === -1) scores.set("blood_deficiency", (scores.get("blood_deficiency") || 0) + 1);
    if (qi === -1) scores.set("qi_deficiency", (scores.get("qi_deficiency") || 0) + 1);
  }
  if (symptom_focus === "fatigue") {
    if (qi === -1) scores.set("qi_deficiency", (scores.get("qi_deficiency") || 0) + 1);
    if (fluid === +1) scores.set("fluid_damp", (scores.get("fluid_damp") || 0) + 1);
  }

  // 寒熱で寄せる
  if (cold_heat_num === -1) {
    if (fluid === +1) scores.set("fluid_damp", (scores.get("fluid_damp") || 0) + 1);
    if (qi === -1) scores.set("qi_deficiency", (scores.get("qi_deficiency") || 0) + 1);
  }
  if (cold_heat_num === +1) {
    if (fluid === -1) scores.set("fluid_deficiency", (scores.get("fluid_deficiency") || 0) + 1);
    if (blood === -1) scores.set("blood_deficiency", (scores.get("blood_deficiency") || 0) + 1);
    if (qi === +1) scores.set("qi_stagnation", (scores.get("qi_stagnation") || 0) + 1);
  }

  // 回復力で寄せる
  if (resilience_num === -1) {
    if (qi === -1) scores.set("qi_deficiency", (scores.get("qi_deficiency") || 0) + 1);
    if (blood === -1) scores.set("blood_deficiency", (scores.get("blood_deficiency") || 0) + 1);
  }
  if (resilience_num === +1) {
    if (qi === +1) scores.set("qi_stagnation", (scores.get("qi_stagnation") || 0) + 1);
    if (blood === +1) scores.set("blood_stasis", (scores.get("blood_stasis") || 0) + 1);
  }

  // max を返す（同点は deterministic に code 名で）
  const entries = Array.from(scores.entries());
  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  // candidates にない code がスコア上位になるのを防ぐ
  const candSet = new Set(cands.map((c) => c.code));
  for (const [code] of entries) {
    if (candSet.has(code)) return code;
  }
  return cands[0].code;
}

export function scoreDiagnosis(answers = {}) {
  // --- normalized vectors ---
  let qi = 0;
  let blood = 0;
  let fluid = 0;

  if (answers.qi_state === "deficiency") qi = -1;
  if (answers.qi_state === "stagnation") qi = +1;

  if (answers.blood_state === "deficiency") blood = -1;
  if (answers.blood_state === "stasis") blood = +1;

  if (answers.fluid_state === "deficiency") fluid = -1;
  if (answers.fluid_state === "damp") fluid = +1;

  // cold/neutral/heat/mixed
  const is_mixed = answers.cold_heat === "mixed";
  const cold_heat_num = toTriState(coldHeatToNum(answers.cold_heat));
  const thermo = cold_heat_num; // constitution_events.thermo 用（mixedは0で別フラグ）

  const resilience_num = toTriState(resilienceToNum(answers.resilience));

  // meridian group
  const mKey = answers.meridian_test;
  const m = MERIDIAN_GROUP_MAP[mKey] || [];
  const primary_meridian = m[0] || null;   // lung_li etc
  const secondary_meridian = m[1] || null; // ※今は参考情報（将来使う）

  // core code (8)
  const core_code = computeCoreCode({
    cold_heat_num,
    resilience_num,
    is_mixed,
  });

  // sub labels (max 2): slot1 symptom_focus, slot2 material
  const symptom_focus = answers.symptom_focus || "fatigue";
  const second = pickSecondSubLabel({
    symptom_focus,
    cold_heat_num,
    resilience_num,
    qi,
    blood,
    fluid,
  });

  const sub_labels = [];
  // 1枠目は symptom_focus をそのまま入れる（固定仕様）
  sub_labels.push(symptom_focus);
  // 2枠目（素材）が取れたら追加
  if (second) sub_labels.push(second);

  return {
    symptom_focus,

    qi,
    blood,
    fluid,

    resilience: resilience_num,

    // thermo は -1/0/1、mixed は別フラグ
    thermo,
    cold_heat: cold_heat_num,
    is_mixed,

    primary_meridian,
    secondary_meridian,

    core_code,
    sub_labels,

    version: "v2",
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

    cold_heat: computed.thermo, // profiles 側は cold_heat を -1/0/1 で保持
    resilience: computed.resilience,

    primary_meridian: computed.primary_meridian,
    secondary_meridian: computed.secondary_meridian,

    organs: computed.primary_meridian ? [computed.primary_meridian] : [],

    answers,
    computed,
    version: "v2",
  };
}
