const CARE_POLICY_DEFINITIONS = {
  shizumeru: {
    key: "shizumeru",
    label: "しずめる",
    guide: "余分な熱や高ぶりを落ち着ける",
    body: "体にこもった余分な熱や、気持ち・体の高ぶりを落ち着かせる方針です。ほてりや落ち着きにくさにつながる状態を整えます。",
    icon: "/illust/policy/policy-shizumeru.svg",
  },
  yurumeru: {
    key: "yurumeru",
    label: "ゆるめる",
    guide: "力み・こわばり・緊張をほどく",
    body: "緊張して力が入り続けている状態をほどく方針です。筋肉のこわばりや、ストレスで張りつめた心身をゆるめます。",
    icon: "/illust/policy/policy-yurumeru.svg",
  },
  meguraseru: {
    key: "meguraseru",
    label: "めぐらせる",
    guide: "気・血の滞りを整え、巡りを促す",
    body: "東洋医学でいう「気・血」の滞りを整える方針です。体を働かせる力や、栄養を届ける巡りが、すみずみまで行き渡ることを目指します。",
    icon: "/illust/policy/policy-meguraseru.svg",
  },
  nagasu: {
    key: "nagasu",
    label: "ながす",
    guide: "余分な水分をため込まない",
    body: "体に余分な水分がたまり、重だるさやむくみにつながる状態を整える方針です。水分を必要な場所へ運び、余分な分を排出する働きを助けます。",
    icon: "/illust/policy/policy-nagasu.svg",
  },
  uruosu: {
    key: "uruosu",
    label: "うるおす",
    guide: "体を養うものと潤いを補う",
    body: "体を養い、潤いを保つために不足しているものを補う方針です。東洋医学でいう「血・津液」を補い、乾燥やほてりが生じやすい状態を整えます。",
    icon: "/illust/policy/policy-uruosu.svg",
  },
  nukumeru: {
    key: "nukumeru",
    label: "ぬくめる",
    guide: "体を温め、冷えで鈍った働きを助ける",
    body: "冷えた体を温め、冷えによって鈍りやすい働きを助ける方針です。手足の冷たさだけでなく、お腹などの冷えにも目を向けます。",
    icon: "/illust/policy/policy-nukumeru.svg",
  },
  sasaeru: {
    key: "sasaeru",
    label: "ささえる",
    guide: "体を働かせる力を補う",
    body: "体を動かしたり、食事から必要なものを取り込んだりする力を補う方針です。東洋医学でいう「気」を補い、疲れやすい体の働きを支えます。",
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
  digestion: { sasaeru: 1.35, nukumeru: 0.75, nagasu: 0.55 },
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
    reason: "疲れがたまりやすい傾向があるため、体を働かせる力を補い、負担をかけすぎない方針を重視します。",
  },
  {
    test: (coreCode) => String(coreCode || "").includes("batt_large"),
    scores: { yurumeru: 0.35, meguraseru: 0.35 },
    reason: "頑張った後の張りをためず、軽く動いて巡りを保つことが合いやすいタイプです。",
  },
  {
    test: (coreCode) => String(coreCode || "").startsWith("accel_"),
    scores: { yurumeru: 0.45, shizumeru: 0.35 },
    reason: "力みや高ぶりが残りやすいため、張りつめる前にゆるめることが合いやすいタイプです。",
  },
  {
    test: (coreCode) => String(coreCode || "").startsWith("brake_"),
    scores: { nagasu: 0.45, meguraseru: 0.3 },
    reason: "重さや停滞感をため込まず、動き出しを軽くしておくことが合いやすいです。",
  },
];

const POLICY_PAIR_SUMMARIES = {
  "yurumeru+meguraseru": "力みやこわばりをやわらげ、巡りを保つ整え方が合いやすいです。",
  "meguraseru+yurumeru": "力みやこわばりをやわらげ、巡りを保つ整え方が合いやすいです。",
  "nagasu+sasaeru": "重だるさをためず、疲れを増やさない整え方が合いやすいです。",
  "sasaeru+nagasu": "重だるさをためず、疲れを増やさない整え方が合いやすいです。",
  "nukumeru+sasaeru": "冷えを防ぎ、疲れを増やさない整え方が合いやすいです。",
  "sasaeru+nukumeru": "冷えを防ぎ、疲れを増やさない整え方が合いやすいです。",
  "shizumeru+uruosu": "熱や高ぶりを落ち着け、目・のど・肌の乾きをいたわる整え方が合いやすいです。",
  "uruosu+shizumeru": "熱や高ぶりを落ち着け、目・のど・肌の乾きをいたわる整え方が合いやすいです。",
  "nagasu+meguraseru": "重だるさをためず、巡りを保つ整え方が合いやすいです。",
  "meguraseru+nagasu": "重だるさをためず、巡りを保つ整え方が合いやすいです。",
  "yurumeru+shizumeru": "熱や高ぶりを落ち着け、力みやこわばりをやわらげる整え方が合いやすいです。",
  "shizumeru+yurumeru": "熱や高ぶりを落ち着け、力みやこわばりをやわらげる整え方が合いやすいです。",
  "uruosu+sasaeru": "乾きと消耗を補い、疲れを増やさない整え方が合いやすいです。",
  "sasaeru+uruosu": "乾きと消耗を補い、疲れを増やさない整え方が合いやすいです。",
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
  const split = computed?.split_scores || {};
  const materialScores = computed?.material_scores || {
    qi_deficiency: split?.qi?.deficiency,
    qi_stagnation: split?.qi?.stagnation,
    blood_deficiency: split?.blood?.deficiency,
    blood_stasis: split?.blood?.stasis,
    fluid_deficiency: split?.fluid?.deficiency,
    fluid_damp: split?.fluid?.damp,
  };
  const hasMaterialScores = Object.values(materialScores).some((value) => Number(value) > 0);
  if (hasMaterialScores) {
    Object.entries(materialScores).forEach(([key, raw]) => {
      const normalized = computed?.score_scale === "0_100" || split?.scale === "0_100"
        ? Math.max(0, Math.min(1, Number(raw || 0) / 100))
        : Math.max(0, Number(raw || 0)) / (Math.max(0, Number(raw || 0)) + 2.5);
      addPolicyScores(scores, SUB_LABEL_POLICY_SCORES[key], normalized * 1.25);
    });
  } else {
    subLabels.forEach((label, index) => {
      addPolicyScores(scores, SUB_LABEL_POLICY_SCORES[label], index === 0 ? 1 : 0.68);
    });
  }

  const envVectors = Array.isArray(answers?.env_vectors) ? answers.env_vectors.filter(Boolean) : [];
  envVectors.forEach((vector) => addPolicyScores(scores, ENV_VECTOR_POLICY_SCORES[vector], 0.85));

  const activeSymptom = symptomKey || answers?.symptom_focus || computed?.symptom_focus || null;
  addPolicyScores(scores, SYMPTOM_POLICY_SCORES[activeSymptom], 1);

  const coreCode = String(computed?.core_code || "");
  const axes = computed?.axes || {};
  const reactionScore = Number(axes?.reaction_score ?? axes?.yin_yang_score);
  const reserveScore = Number(axes?.reserve_score ?? axes?.drive_score);
  if (Number.isFinite(reactionScore)) {
    if (reactionScore >= 0) addPolicyScores(scores, { yurumeru: 0.6, shizumeru: 0.35 }, Math.abs(reactionScore));
    else addPolicyScores(scores, { nagasu: 0.6, meguraseru: 0.45 }, Math.abs(reactionScore));
  }
  if (Number.isFinite(reserveScore) && reserveScore < 0) {
    addPolicyScores(scores, { sasaeru: 1.0 }, Math.abs(reserveScore));
  }
  addPolicyScores(scores, { nukumeru: 0.75 }, Math.max(0, Number(axes?.cold_score || 0)));
  addPolicyScores(scores, { shizumeru: 0.6, uruosu: 0.3 }, Math.max(0, Number(axes?.heat_score || 0)));

  if (!Number.isFinite(reactionScore) || !Number.isFinite(reserveScore)) {
    CORE_POLICY_HINTS.forEach((hint) => {
      if (hint.test(coreCode)) {
        addPolicyScores(scores, hint.scores, 1);
        if (hint.reason) reasons.push(hint.reason);
      }
    });
  }

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
      rankLabel: index === 0 ? "基本にしたい" : index === 1 ? "次に意識したい" : "補助として取り入れたい",
    };
  });

  const summary = (() => {
    const keys = selected.map((item) => item.key).filter(Boolean);
    if (keys.length >= 2) return POLICY_PAIR_SUMMARIES[`${keys[0]}+${keys[1]}`] || `${selected[0].guide}整え方が合いやすいです。`;
    return selected[0]?.body || "疲れを増やさない整え方が合いやすいです。";
  })();

  const background = [];
  if (hasMaterialScores) background.push("気・血・水の6つの傾向");
  else if (subLabels.length) background.push("気血水の偏り");
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
