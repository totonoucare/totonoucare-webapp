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
  const subs = unique(profile?.sub_labels || computed.sub_labels || []);
  const core = String(profile?.core_code || computed.core_code || "");
  return {
    reserve: core.includes("small") ? "low" : core.includes("large") ? "high" : "standard",
    thermal: computed.thermo === -1 ? "cold" : computed.thermo === 1 ? "heat" : "neutral",
    sub_labels: subs,
    symptom_key: profile?.active_symptom_focus || profile?.symptom_focus || computed.symptom_focus || "",
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
  if (input.thermal === "mixed") { bump(scores, "cold", 1); bump(scores, "heat", 1); }
  if (input.moisture === "damp") bump(scores, "damp", 4);
  if (input.moisture === "dry") bump(scores, "dry", 4);
  if (input.moisture === "mixed") { bump(scores, "damp", 1); bump(scores, "dry", 1); }
  if (input.reserve === "low") { bump(scores, "energy_low", 4); bump(scores, "recovery_low", 2); }
  if (input.reserve === "high") bump(scores, "tension", 1);
  if (["appetite_low", "postmeal_heavy", "bowel_change"].includes(input.digestion)) bump(scores, "digestive_weak", 3);
  if (input.digestion === "postmeal_heavy") bump(scores, "damp", 2);
  if (input.response === "warm_better") bump(scores, "cold", 2);
  if (input.response === "move_better") bump(scores, "stagnation", 2);
  if (input.response === "rest_better") { bump(scores, "energy_low", 2); bump(scores, "recovery_low", 2); }
  if (input.intensity === "strong" || input.intensity === "worsening") bump(scores, "recovery_low", 1);

  if (baseline.reserve === "low") bump(scores, "energy_low", 1);
  if (baseline.thermal === "cold") bump(scores, "cold", 1);
  if (baseline.thermal === "heat") bump(scores, "heat", 1);
  baseline.sub_labels.forEach((key) => {
    if (key === "qi_deficiency" || key === "blood_deficiency") bump(scores, "energy_low", 1);
    if (key === "qi_stagnation") bump(scores, "tension", 1);
    if (key === "blood_stasis") bump(scores, "stagnation", 1);
    if (key === "fluid_damp") bump(scores, "damp", 1);
    if (key === "fluid_deficiency") bump(scores, "dry", 1);
  });

  const stateLabels = {
    energy_low: "余力が少なめ", recovery_low: "回復を優先", tension: "緊張が残りやすい",
    stagnation: "こわばり・滞り", damp: "重さ・水分の偏り", dry: "乾きやすい",
    cold: "冷えが関係", heat: "熱感が関係", digestive_weak: "胃腸の負担",
  };
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const stateKeys = ranked.filter(([, score]) => score >= 2).map(([key]) => key);
  const topLabels = ranked.filter(([, score]) => score >= 2).slice(0, 3).map(([key]) => stateLabels[key]);
  const summary = topLabels.length
    ? `今は「${topLabels.join("・")}」を先に確認する状態です。`
    : "はっきりした偏りは少なく、症状と使いやすさを中心に比べます。";

  return { concerns, scores, stateKeys, stateLabels, summary, baseline };
}

export function assessGuidedSafety(input = {}, normalized = null) {
  const freeTextResult = normalized || normalizeConcernText(input.freeText);
  const selectedFlags = unique([...(input.redFlags || []), ...(freeTextResult.red_flags || [])]);
  const oral = input.scope === "all" || GUIDED_SCOPE_OPTIONS.find((item) => item.key === input.scope)?.oral;
  if (selectedFlags.length) {
    return {
      level: "stop",
      label: "セルフケアの商品探しより、相談・受診を優先",
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
    label: oral ? "比較候補を見られます" : "生活ケアの候補を見られます",
    reasons: oral ? ["選択した安全確認では大きな該当なし"] : ["内服しない候補を表示"],
  };
}

function candidateScore(candidate, currentState, concerns, activeIngredientIds) {
  const symptomMatches = candidate.symptoms.filter((key) => concerns.includes(key)).length;
  if (!symptomMatches && concerns.length && !concerns.includes("other")) return -999;
  const stateMatches = candidate.states.filter((key) => currentState.stateKeys.includes(key)).length;
  const contradictions = candidate.avoidStates.filter((key) => currentState.stateKeys.includes(key)).length;
  if (contradictions) return -999;
  if (stateMatches < candidate.minStateMatches) return -999;
  const duplicateMatches = candidate.ingredientIds.filter((id) => activeIngredientIds.includes(id)).length;
  return symptomMatches * 8 + stateMatches * 3 - duplicateMatches * 2 + (candidate.type === "selfcare" ? 1 : 0);
}

export function buildGuidedSearchResult(input = {}, profile = null, activeEntries = []) {
  const normalized = normalizeConcernText(input.freeText);
  const currentState = deriveCurrentState(input, profile);
  const safety = assessGuidedSafety(input, normalized);
  const activeIngredientIds = unique(activeEntries.flatMap((entry) => entry?.item?.activeUse ? entry.item.ingredientIds || [] : []));
  if (safety.level === "stop") {
    return { normalized, currentState, safety, groups: [], activeIngredientIds, directions: [] };
  }

  const types = input.scope && input.scope !== "all"
    ? [input.scope]
    : ["selfcare", "food", "supplement", "kampo", "otc"];
  const groups = types.map((type) => {
    const candidates = GUIDED_CANDIDATES
      .filter((candidate) => candidate.type === type)
      .map((candidate) => ({
        ...candidate,
        duplicateIngredients: candidate.ingredientIds.filter((id) => activeIngredientIds.includes(id)),
        score: candidateScore(candidate, currentState, currentState.concerns, activeIngredientIds),
      }))
      .filter((candidate) => candidate.score > -999)
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
