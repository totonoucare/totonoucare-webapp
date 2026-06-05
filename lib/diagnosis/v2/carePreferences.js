const CARE_POLICY_DEFINITIONS = {
  shizumeru: {
    key: "shizumeru",
    label: "しずめる",
    guide: "熱・冴え・高ぶりを落ち着ける",
    body: "熱っぽさや頭の冴えが続くときに、刺激や高ぶりを落ち着ける整え方です。",
    icon: "/illust/policy/policy-shizumeru.svg",
  },
  yurumeru: {
    key: "yurumeru",
    label: "ゆるめる",
    guide: "力み・こわばり・緊張をほどく",
    body: "首肩・呼吸・気持ちの張りをゆるめて、こわばりを残しにくくします。",
    icon: "/illust/policy/policy-yurumeru.svg",
  },
  meguraseru: {
    key: "meguraseru",
    label: "めぐらせる",
    guide: "滞りやこもりに逃げ道を作る",
    body: "詰まり感やこもり感に、軽い動きや呼吸の余白を作ります。",
    icon: "/illust/policy/policy-meguraseru.svg",
  },
  nagasu: {
    key: "nagasu",
    label: "ながす",
    guide: "湿気・重だるさ・水っぽさをためない",
    body: "湿気や重だるさ、水っぽさをため込まず、体の重さを抜きやすくします。",
    icon: "/illust/policy/policy-nagasu.svg",
  },
  uruosu: {
    key: "uruosu",
    label: "うるおす",
    guide: "乾き・消耗を残さない",
    body: "乾きや消耗を重ねず、うるおいと余力を残しやすくします。",
    icon: "/illust/policy/policy-uruosu.svg",
  },
  nukumeru: {
    key: "nukumeru",
    label: "ぬくめる",
    guide: "冷えの入口を守る",
    body: "足元・お腹・腰まわりを冷やしすぎず、縮こまりを残しにくくします。",
    icon: "/illust/policy/policy-nukumeru.svg",
  },
  sasaeru: {
    key: "sasaeru",
    label: "ささえる",
    guide: "胃腸・回復力・余力を削らない",
    body: "無理に押し切らず、胃腸・回復力・毎日の余力を守ります。",
    icon: "/illust/policy/policy-sasaeru.svg",
  },
};

const SUB_LABEL_POLICY_SCORES = {
  qi_stagnation: { yurumeru: 1.35, meguraseru: 1.1 },
  qi_deficiency: { sasaeru: 1.45, nukumeru: 0.7 },
  blood_deficiency: { uruosu: 1.35, sasaeru: 0.9 },
  blood_stasis: { meguraseru: 1.45, yurumeru: 0.65 },
  fluid_damp: { nagasu: 1.55, sasaeru: 0.9 },
  fluid_deficiency: { uruosu: 1.45, shizumeru: 0.85 },
};

const SYMPTOM_POLICY_SCORES = {
  fatigue: { sasaeru: 1.0, nagasu: 0.45 },
  sleep: { shizumeru: 0.95, sasaeru: 0.75, uruosu: 0.55 },
  neck_shoulder: { yurumeru: 1.1, meguraseru: 0.85 },
  low_back_pain: { nukumeru: 1.0, meguraseru: 0.6, sasaeru: 0.55 },
  swelling: { nagasu: 1.25 },
  headache: { yurumeru: 0.95, meguraseru: 0.85, shizumeru: 0.5 },
  dizziness: { sasaeru: 0.85, meguraseru: 0.65, uruosu: 0.45 },
  mood: { yurumeru: 0.95, shizumeru: 0.85, meguraseru: 0.55 },
};

const ENV_VECTOR_POLICY_SCORES = {
  pressure_shift: { yurumeru: 0.55, meguraseru: 0.55 },
  temp_swing: { nukumeru: 0.4, sasaeru: 0.35, uruosu: 0.2 },
  humidity_up: { nagasu: 0.65, sasaeru: 0.3 },
  dryness_up: { uruosu: 0.65, sasaeru: 0.3 },
  wind_strong: { yurumeru: 0.4, shizumeru: 0.3 },
};

const CORE_POLICY_HINTS = [
  {
    test: (coreCode) => String(coreCode || "").includes("batt_small"),
    scores: { sasaeru: 0.95, nukumeru: 0.4 },
    reason: "余力を削りすぎず、回復しやすい余白を残すことが大切なタイプです。",
  },
  {
    test: (coreCode) => String(coreCode || "").includes("batt_large"),
    scores: { yurumeru: 0.35, meguraseru: 0.35 },
    reason: "頑張りすぎをため込まず、軽く動いて巡りを止めないことが合いやすいタイプです。",
  },
  {
    test: (coreCode) => String(coreCode || "").startsWith("accel_"),
    scores: { yurumeru: 0.45, shizumeru: 0.35 },
    reason: "気持ちや予定が前のめりになりやすいため、力みや高ぶりを早めに落とすことが合いやすいです。",
  },
  {
    test: (coreCode) => String(coreCode || "").startsWith("brake_"),
    scores: { nagasu: 0.45, meguraseru: 0.3 },
    reason: "重さや停滞感をため込まず、動き出しを軽くしておくことが合いやすいです。",
  },
];

const POLICY_PAIR_SUMMARIES = {
  "yurumeru+meguraseru": "首肩や呼吸を固めすぎず、巡りの逃げ道を作る整え方が合いやすいです。",
  "meguraseru+yurumeru": "首肩や呼吸を固めすぎず、巡りの逃げ道を作る整え方が合いやすいです。",
  "nagasu+sasaeru": "重さをため込まず、胃腸と回復力を守る整え方が合いやすいです。",
  "sasaeru+nagasu": "重さをため込まず、胃腸と回復力を守る整え方が合いやすいです。",
  "nukumeru+sasaeru": "冷えの入口を守りながら、消耗を増やしすぎない整え方が合いやすいです。",
  "sasaeru+nukumeru": "冷えの入口を守りながら、消耗を増やしすぎない整え方が合いやすいです。",
  "shizumeru+uruosu": "熱をこもらせず、乾きや消耗を残しにくい整え方が合いやすいです。",
  "uruosu+shizumeru": "熱をこもらせず、乾きや消耗を残しにくい整え方が合いやすいです。",
  "nagasu+meguraseru": "重さを逃がしながら、巡りを止めにくい整え方が合いやすいです。",
  "meguraseru+nagasu": "重さを逃がしながら、巡りを止めにくい整え方が合いやすいです。",
  "yurumeru+shizumeru": "力みと高ぶりをためにくい整え方が合いやすいです。",
  "shizumeru+yurumeru": "力みと高ぶりをためにくい整え方が合いやすいです。",
  "uruosu+sasaeru": "乾かしすぎず、回復力を残しやすい整え方が合いやすいです。",
  "sasaeru+uruosu": "乾かしすぎず、回復力を残しやすい整え方が合いやすいです。",
};

function addPolicyScores(scores, weights, multiplier = 1) {
  Object.entries(weights || {}).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(scores, key)) return;
    scores[key] += Number(value || 0) * multiplier;
  });
}

export function getCarePolicyDefinition(key) {
  return CARE_POLICY_DEFINITIONS[key] || null;
}

export function buildBaseCarePreferences({ answers = {}, computed = {}, symptomKey = null } = {}) {
  const scores = Object.fromEntries(Object.keys(CARE_POLICY_DEFINITIONS).map((key) => [key, 0]));
  const reasons = [];

  const subLabels = Array.isArray(computed?.sub_labels) ? computed.sub_labels : [];
  subLabels.forEach((label, index) => {
    addPolicyScores(scores, SUB_LABEL_POLICY_SCORES[label], index === 0 ? 1 : 0.68);
  });

  const envVectors = Array.isArray(answers?.env_vectors) ? answers.env_vectors.filter(Boolean) : [];
  envVectors.forEach((vector) => addPolicyScores(scores, ENV_VECTOR_POLICY_SCORES[vector], 0.85));

  const activeSymptom = symptomKey || answers?.symptom_focus || computed?.symptom_focus || null;
  addPolicyScores(scores, SYMPTOM_POLICY_SCORES[activeSymptom], 1);

  const coreCode = String(computed?.core_code || "");
  CORE_POLICY_HINTS.forEach((hint) => {
    if (hint.test(coreCode)) {
      addPolicyScores(scores, hint.scores, 1);
      if (hint.reason) reasons.push(hint.reason);
    }
  });

  let ranked = Object.entries(scores)
    .map(([key, score]) => ({ key, score }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) ranked = [{ key: "sasaeru", score: 1 }];

  const selected = ranked.slice(0, 3).map((item, index) => {
    const def = CARE_POLICY_DEFINITIONS[item.key];
    return {
      ...def,
      score: item.score,
      rank: index + 1,
      rankLabel: index === 0 ? "まず合いやすい" : index === 1 ? "次に意識したい" : "補助として合いやすい",
    };
  });

  const summary = (() => {
    const keys = selected.map((item) => item.key).filter(Boolean);
    if (keys.length >= 2) return POLICY_PAIR_SUMMARIES[`${keys[0]}+${keys[1]}`] || `${selected[0].guide}整え方が合いやすいです。`;
    return selected[0]?.body || "回復力を削らない整え方が合いやすいです。";
  })();

  const background = [];
  if (subLabels.length) background.push("気血水の偏り");
  if (envVectors.length) background.push("天気の相性");
  if (activeSymptom) background.push("今気になる不調");

  return {
    items: selected,
    scores,
    summary,
    reasons: reasons.slice(0, 2),
    background,
  };
}

export { CARE_POLICY_DEFINITIONS };
