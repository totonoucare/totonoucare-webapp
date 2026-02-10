// lib/radar/constitution.js

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * constitution_profiles row から computed を取り、
 * 「揺れ（変化ストレス）に反応しやすいか」を 0..2 に落とす。
 *
 * susceptibility:
 * 0 = 強い（受けにくい）
 * 1 = 普通
 * 2 = 弱い（受けやすい）
 */
export function computeSusceptibility(profileRow) {
  const computed = profileRow?.computed || {};
  const axes = computed?.axes || {};
  const env = computed?.env || {};
  const subLabels = safeArr(computed?.sub_labels || profileRow?.sub_labels);

  const recovery = safeNum(axes?.recovery_score); // -1..+1
  const defEx = safeNum(axes?.def_ex_score); // -1..+1
  const envSens = safeNum(env?.sensitivity); // 0..(想定:0-2 or 0-3)

  // ---- 判定用の特徴量（ブール） ----
  // 引きずりやすい（回復低い）
  const isRecoveryLow = recovery != null ? recovery <= -0.15 : false;

  // 偏りが強い（虚実の偏り）
  const isImbalanceHigh = defEx != null ? Math.abs(defEx) >= 0.45 : false;

  // 自己申告の環境感受性
  const isEnvSensitive = envSens != null ? envSens >= 2 : false;

  // 弱点が複数（sub_labels 最大2）
  const weakCount = subLabels.length;
  const hasMultiWeakness = weakCount >= 2;

  // ---- スコア化（0..4くらいの雑な合算） ----
  let s = 0;
  if (isRecoveryLow) s += 2;          // いちばん効く
  if (isImbalanceHigh) s += 1;
  if (isEnvSensitive) s += 1;
  if (hasMultiWeakness) s += 1;

  // ---- 0..2 に落とす ----
  // 0-1:強い / 2-3:普通 / 4+:弱い
  const susceptibility = s >= 4 ? 2 : s >= 2 ? 1 : 0;

  // ---- ユーザー向けに「何が効いてるか」短文材料 ----
  const reasons = [];
  if (isRecoveryLow) reasons.push("引きずりやすい");
  if (isImbalanceHigh) reasons.push("偏りが強め");
  if (hasMultiWeakness) reasons.push("弱点が複数");
  if (isEnvSensitive) reasons.push("環境変化に反応しやすい");

  return {
    susceptibility,
    score: s,
    reasons,
    debug: {
      recovery,
      defEx,
      envSens,
      weakCount,
      flags: { isRecoveryLow, isImbalanceHigh, isEnvSensitive, hasMultiWeakness },
    },
  };
}

export function susceptibilityLabel(s) {
  if (s === 2) return "受けやすい";
  if (s === 1) return "ふつう";
  return "受けにくい";
}
