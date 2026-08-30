import { GUIDED_CANDIDATES, GUIDED_SCOPE_OPTIONS, INGREDIENT_LINKS } from "./guidedCatalog.js";

const SYMPTOM_ALIASES = {
  fatigue: ["疲れ", "だる", "倦怠", "しんど", "体力"],
  sleep: ["眠れ", "不眠", "睡眠", "寝つき", "夜中", "早朝覚醒"],
  digestion: ["胃", "腹", "食欲", "胸やけ", "もたれ", "下痢", "便秘", "吐き気"],
  neck_shoulder: ["首", "肩", "肩こり", "肩凝り"],
  low_back_pain: ["腰", "腰痛"],
  swelling: ["むく", "浮腫", "腫れ"],
  headache: ["頭痛", "頭が痛", "片頭痛", "偏頭痛"],
  dizziness: ["めまい", "ふらつ", "立ちくらみ"],
  mood: ["気分", "不安", "イライラ", "落ち込", "憂うつ", "焦り"],
};

const SYMPTOM_LABELS = {
  fatigue: "疲れ・だるさ", sleep: "睡眠の乱れ", digestion: "胃腸の不調",
  neck_shoulder: "首肩の不調", low_back_pain: "腰の不調", swelling: "むくみ",
  headache: "頭痛", dizziness: "めまい・ふらつき", mood: "気分の負担", other: "入力した悩み",
};

const STATE_LABELS = {
  energy_low: "体力が落ち気味", recovery_low: "回復を優先したい", tension: "力が抜けにくい",
  stagnation: "こわばり・滞り", damp: "重さ・水分の偏り", dry: "乾きやすい",
  cold: "冷え", heat: "熱感", digestive_weak: "胃腸の負担",
};

const BASELINE_LABELS = {
  energy_low: "体力を消耗しやすい", tension: "緊張をためやすい", stagnation: "こわばりが残りやすい",
  damp: "重さが出やすい", dry: "乾きやすい", cold: "冷えやすい", heat: "熱がこもりやすい",
};

const RED_FLAG_PATTERNS = [
  { key: "chest_breath", pattern: /(胸.*(痛|締め)|息(が|を)?.*(苦|でき)|呼吸.*苦)/, label: "胸の痛み・強い息苦しさ" },
  { key: "neuro", pattern: /(片側.*(動か|しび)|ろれつ|言葉.*出ない|顔.*ゆが|意識.*(失|もうろう))/, label: "麻痺・言葉・意識の異常" },
  { key: "sudden_headache", pattern: /(突然|急).*(激しい|最悪).*(頭痛|頭が痛)/, label: "突然の激しい頭痛" },
  { key: "bleeding", pattern: /(吐血|血便|黒い便|下血)/, label: "吐血・血便・黒い便" },
  { key: "dehydration", pattern: /(水分.*取れない|何度も吐|尿.*出ない)/, label: "水分が取れない・繰り返す嘔吐" },
  { key: "one_leg", pattern: /(片脚|片足).*(急|突然).*(腫|痛|熱)/, label: "片脚だけの急な腫れ・痛み" },
  { key: "hearing", pattern: /(急|突然).*(聞こえ|聴力).*(悪|低下)/, label: "急な聞こえの低下" },
  { key: "self_harm", pattern: /(死にたい|消えたい|自傷|自殺)/, label: "自分を傷つけたい気持ち" },
];

function compactText(value, limit = 600) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, limit);
}

function bump(scores, key, value = 1) {
  scores[key] = (scores[key] || 0) + value;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function rankedKeys(scores, minimum = 2) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).filter(([, score]) => score >= minimum).map(([key]) => key);
}

export function normalizeConcernText(value) {
  const text = compactText(value);
  const symptomKeys = Object.entries(SYMPTOM_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => text.includes(alias)))
    .map(([key]) => key);
  const redFlags = RED_FLAG_PATTERNS.filter((rule) => rule.pattern.test(text)).map((rule) => rule.key);
  return {
    summary: text ? `「${text.slice(0, 80)}${text.length > 80 ? "…" : ""}」として確認します。` : "",
    symptom_keys: symptomKeys,
    terms: symptomKeys.flatMap((key) => SYMPTOM_ALIASES[key].filter((term) => text.includes(term))).slice(0, 8),
    duration_hint: /半年|年単位|数か月|ヶ月/.test(text) ? "months" : /数週|週間/.test(text) ? "weeks" : /数日|日前/.test(text) ? "days" : /今日|今朝|さっき/.test(text) ? "today" : "unknown",
    location_terms: ["頭", "首", "肩", "胸", "胃", "腹", "腰", "脚", "足"].filter((term) => text.includes(term)),
    quality_terms: ["痛い", "重い", "だるい", "冷える", "熱い", "張る", "しびれ", "むくむ"].filter((term) => text.includes(term)),
    uncertain_terms: [],
    red_flags: redFlags,
  };
}

export function buildBaselineFromProfile(profile) {
  const computed = profile?.computed || {};
  const subLabels = unique(profile?.sub_labels || computed.sub_labels || []);
  const core = String(profile?.core_code || computed.core_code || "");
  const reserve = core.includes("small") ? "low" : core.includes("large") ? "high" : "standard";
  const thermal = computed.thermo === -1 ? "cold" : computed.thermo === 1 ? "heat" : "neutral";
  const scores = {};
  if (reserve === "low") bump(scores, "energy_low", 2);
  if (thermal === "cold") bump(scores, "cold", 2);
  if (thermal === "heat") bump(scores, "heat", 2);
  subLabels.forEach((key) => {
    if (key === "qi_deficiency" || key === "blood_deficiency") bump(scores, "energy_low", 2);
    if (key === "qi_stagnation") bump(scores, "tension", 2);
    if (key === "blood_stasis") bump(scores, "stagnation", 2);
    if (key === "fluid_damp") bump(scores, "damp", 2);
    if (key === "fluid_deficiency") bump(scores, "dry", 2);
  });
  const stateKeys = rankedKeys(scores, 2);
  const labels = stateKeys.slice(0, 3).map((key) => BASELINE_LABELS[key]).filter(Boolean);
  return {
    reserve,
    thermal,
    sub_labels: subLabels,
    symptom_key: profile?.active_symptom_focus || profile?.symptom_focus || computed.symptom_focus || "",
    scores,
    stateKeys,
    labels,
    summary: labels.length ? `体質チェックでは「${labels.join("・")}」傾向があります。` : "体質チェックの偏りは小さめです。",
  };
}

export function deriveCurrentState(input = {}, profile = null) {
  const scores = {};
  const concerns = unique([...(input.concerns || []), ...normalizeConcernText(input.freeText).symptom_keys]);
  const baseline = buildBaselineFromProfile(profile);

  concerns.forEach((key) => {
    if (key === "fatigue") { bump(scores, "energy_low", 3); bump(scores, "recovery_low", 2); }
    if (key === "sleep") { bump(scores, "tension", 2); bump(scores, "recovery_low", 3); }
    if (key === "digestion") { bump(scores, "digestive_weak", 3); bump(scores, "damp", 1); }
    if (key === "neck_shoulder" || key === "low_back_pain") { bump(scores, "tension", 2); bump(scores, "stagnation", 2); }
    if (key === "swelling") { bump(scores, "damp", 4); bump(scores, "stagnation", 1); }
    if (key === "headache") { bump(scores, "tension", 2); bump(scores, "stagnation", 2); }
    if (key === "dizziness") { bump(scores, "energy_low", 2); bump(scores, "damp", 1); }
    if (key === "mood") { bump(scores, "tension", 3); bump(scores, "stagnation", 2); }
  });

  if (input.thermal === "cold") bump(scores, "cold", 4);
  if (input.thermal === "heat") bump(scores, "heat", 4);
  if (input.thermal === "mixed") { bump(scores, "cold", 2); bump(scores, "heat", 2); }
  if (input.moisture === "damp") bump(scores, "damp", 4);
  if (input.moisture === "dry") bump(scores, "dry", 4);
  if (input.moisture === "mixed") { bump(scores, "damp", 2); bump(scores, "dry", 2); }
  if (input.reserve === "low") { bump(scores, "energy_low", 4); bump(scores, "recovery_low", 2); }
  if (input.reserve === "high") bump(scores, "tension", 2);
  if (["appetite_low", "postmeal_heavy", "bowel_change"].includes(input.digestion)) bump(scores, "digestive_weak", 3);
  if (input.digestion === "postmeal_heavy") bump(scores, "damp", 2);
  if (input.response === "warm_better") bump(scores, "cold", 2);
  if (input.response === "move_better") bump(scores, "stagnation", 2);
  if (input.response === "rest_better") { bump(scores, "energy_low", 2); bump(scores, "recovery_low", 2); }
  if (input.intensity === "strong" || input.intensity === "worsening") bump(scores, "recovery_low", 1);

  const stateKeys = rankedKeys(scores, 2);
  const labels = stateKeys.slice(0, 3).map((key) => STATE_LABELS[key]).filter(Boolean);
  const summary = labels.length
    ? `今日は「${labels.join("・")}」が表れています。`
    : "今日は、はっきりした偏りが少ない状態です。";

  return { concerns, scores, stateKeys, stateLabels: STATE_LABELS, labels, summary, baseline };
}

export function assessGuidedSafety(input = {}, normalized = null) {
  const freeTextResult = normalized || normalizeConcernText(input.freeText);
  const selectedFlags = unique([...(input.redFlags || []), ...(freeTextResult.red_flags || [])]);
  const oral = input.scope === "all" || GUIDED_SCOPE_OPTIONS.find((item) => item.key === input.scope)?.oral;
  if (selectedFlags.length) {
    return {
      level: "stop",
      label: "商品探しより、相談・受診を優先",
      reasons: selectedFlags.map((key) => RED_FLAG_PATTERNS.find((rule) => rule.key === key)?.label || key),
    };
  }
  const consultReasons = [];
  if (input.intensity === "worsening") consultReasons.push("急に悪化している・強くなっている");
  if (oral && input.ageBand === "under15") consultReasons.push("15歳未満");
  if (oral && input.ageBand === "unknown") consultReasons.push("年齢が未確認");
  if (oral && input.pregnancy === "yes") consultReasons.push("妊娠・授乳中、または可能性がある");
  if (oral && input.medication === "yes") consultReasons.push("治療中・服薬中");
  if (oral && input.allergy === "yes") consultReasons.push("薬・食品・生薬のアレルギー歴がある");
  if (consultReasons.length) {
    return { level: "consult", label: "購入前に医師・薬剤師・登録販売者へ確認", reasons: consultReasons };
  }
  return {
    level: "compare",
    label: oral ? "条件に合う比較候補です" : "今日使えるケア用品の候補です",
    reasons: oral ? ["選択した安全確認では大きな該当なし"] : ["内服しない候補を表示"],
  };
}

function findExplicitTerm(candidate, text) {
  return candidate.explicitTerms.find((term) => text.includes(String(term).normalize("NFKC"))) || "";
}

function answerConditionsMatch(candidate, input) {
  return candidate.answerConditions.every((condition) => condition.values.includes(input[condition.field]));
}

function buildMatchReason(candidate, explicitTerm, symptomMatches, currentMatches, baselineMatches) {
  if (explicitTerm) return candidate.why;
  const symptoms = symptomMatches.map((key) => SYMPTOM_LABELS[key]).filter(Boolean).slice(0, 2);
  const current = currentMatches.map((key) => STATE_LABELS[key]).filter(Boolean).slice(0, 2);
  const evidence = unique([...symptoms, ...current]);
  const lead = evidence.length ? `選んだ「${evidence.join("・")}」が、この候補を見る条件と重なりました。` : "選んだ条件が、この候補を見る条件と重なりました。";
  const baselineNote = baselineMatches.length
    ? `体質チェックの「${baselineMatches.map((key) => BASELINE_LABELS[key]).filter(Boolean).slice(0, 2).join("・")}」も補助的に参照しています。`
    : "";
  return `${lead}${candidate.why}${baselineNote}`;
}

function evaluateCandidate(candidate, input, currentState, activeIngredientIds) {
  const text = compactText(input.freeText).normalize("NFKC");
  const explicitTerm = findExplicitTerm(candidate, text);
  const symptomMatches = candidate.symptoms.filter((key) => currentState.concerns.includes(key));
  const currentMatches = candidate.states.filter((key) => currentState.stateKeys.includes(key));
  const baselineMatches = candidate.states.filter((key) => currentState.baseline.stateKeys.includes(key));

  if (candidate.explicitOnly && !explicitTerm) return null;
  if (!explicitTerm && symptomMatches.length < candidate.minSymptomMatches) return null;
  if (!explicitTerm && candidate.persistentOnly && !["weeks", "months"].includes(input.duration)) return null;
  if (!explicitTerm && candidate.allowedDurations?.length && !candidate.allowedDurations.includes(input.duration)) return null;
  if (!explicitTerm && !answerConditionsMatch(candidate, input)) return null;
  if (!explicitTerm && candidate.requiredTextTerms.length && !candidate.requiredTextTerms.some((term) => text.includes(term))) return null;
  if (!explicitTerm && candidate.avoidStates.some((key) => currentState.stateKeys.includes(key))) return null;
  if (!explicitTerm && currentMatches.length < candidate.minCurrentStateMatches) return null;

  const duplicateIngredients = candidate.ingredientIds.filter((id) => activeIngredientIds.includes(id));
  const score = (explicitTerm ? 50 : 0) + symptomMatches.length * 8 + currentMatches.length * 4 + baselineMatches.length - duplicateIngredients.length * 2 + (candidate.type === "selfcare" ? 1 : 0);
  return {
    ...candidate,
    explicitTerm,
    symptomMatches,
    currentMatches,
    baselineMatches,
    duplicateIngredients,
    matchReason: buildMatchReason(candidate, explicitTerm, symptomMatches, currentMatches, baselineMatches),
    score,
  };
}

export function buildGuidedSearchResult(input = {}, profile = null, activeEntries = []) {
  const normalized = normalizeConcernText(input.freeText);
  const currentState = deriveCurrentState(input, profile);
  const safety = assessGuidedSafety(input, normalized);
  const activeIngredientIds = unique(activeEntries.flatMap((entry) => entry?.item?.activeUse ? entry.item.ingredientIds || [] : []));
  if (safety.level === "stop") {
    return { normalized, currentState, safety, groups: [], activeIngredientIds, directions: [] };
  }

  const types = input.scope && input.scope !== "all" ? [input.scope] : ["selfcare", "health", "kampo"];
  const groups = types.map((type) => {
    const candidates = GUIDED_CANDIDATES
      .filter((candidate) => candidate.type === type)
      .map((candidate) => evaluateCandidate(candidate, input, currentState, activeIngredientIds))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ja"))
      .slice(0, type === "kampo" ? 4 : 3);
    return { type, candidates };
  }).filter((group) => group.candidates.length);

  const directions = unique(groups.flatMap((group) => group.candidates.slice(0, 1).map((item) => item.direction))).slice(0, 3);
  return { normalized, currentState, safety, groups, activeIngredientIds, directions };
}

export function ingredientConnections(candidate) {
  return (candidate?.ingredientIds || []).map((id) => ({ id, ...INGREDIENT_LINKS[id] })).filter((item) => item.label);
}
