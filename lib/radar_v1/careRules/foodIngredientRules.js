// lib/radar_v1/careRules/foodIngredientRules.js

import { DRINK_ITEMS, SUB_LABEL_CODES, normalizeSubLabelValues, getSubLabelFlags, buildDrinkActionCard, formatDrinkLeadNames } from "./drinkRules";
export { DRINK_ITEMS, DRINK_AUDIT } from "./drinkRules";

import { FOOD_ITEMS, buildDailyCareTheme, enhanceFoodContext } from "./dailyCareV2";

// Kept dependency-free because this rules file is also evaluated as a data
// module by ingredient regression tests.
function hasExplicitPressureResponseDirection(source = null) {
  return Boolean(
    source?.pressure_response_direction || source?.reaction_direction ||
    source?.summary?.pressure_response_direction || source?.summary?.reaction_direction ||
    source?.forecast?.pressure_response_direction || source?.forecast?.reaction_direction ||
    source?.meta?.manifestation?.reaction_direction ||
    source?.meta?.personalized_meta?.manifestation?.reaction_direction
  );
}

function getLegacyCareTriggerKey(exact, source = null) {
  if (!["pressure_down", "pressure_up", "pressure_shift"].includes(String(exact || ""))) return exact || "default";
  const direction = source?.pressure_response_direction || source?.reaction_direction ||
    source?.summary?.pressure_response_direction || source?.summary?.reaction_direction ||
    source?.forecast?.pressure_response_direction || source?.forecast?.reaction_direction ||
    source?.meta?.manifestation?.reaction_direction ||
    source?.meta?.personalized_meta?.manifestation?.reaction_direction || "balanced";
  return direction === "accel" ? "pressure_up" : direction === "brake" ? "pressure_down" : "default";
}

export const TRIGGER_LABELS = {
  temp_shift: "寒暖差",
  damp: "湿気",
  cold: "低温",
  heat: "高温",
  dry: "乾燥",
  pressure_down: "気圧変化（重さ側）",
  pressure_up: "気圧変化（張り側）",
  default: "天気変化",
};

const ALLOWED_SECONDARY_FOOD_TRIGGER_PAIR_KEYS = new Set([
  "damp+heat",
  "cold+damp",
  "dry+heat",
  "cold+dry",
  "damp+pressure_down",
  "heat+pressure_up",
]);

function getFoodTriggerPairKey(primaryKey, secondaryKey) {
  const primary = normalizeFoodTriggerKey(primaryKey);
  const secondary = normalizeFoodTriggerKey(secondaryKey);

  if (!primary || !secondary || primary === "default" || secondary === "default" || primary === secondary) {
    return null;
  }

  return [primary, secondary].sort().join("+");
}

export function canUseSecondaryFoodTrigger(primaryKey, secondaryKey) {
  const pairKey = getFoodTriggerPairKey(primaryKey, secondaryKey);
  return !!pairKey && ALLOWED_SECONDARY_FOOD_TRIGGER_PAIR_KEYS.has(pairKey);
}

export const SYMPTOM_LABELS = {
  fatigue: "だるさ",
  sleep: "睡眠",
  digestion: "胃腸",
  neck_shoulder: "首肩",
  low_back_pain: "腰",
  swelling: "むくみ",
  headache: "頭痛",
  dizziness: "めまい",
  mood: "気分",
};

const ROLE_LABELS = {
  staple: "主食",
  protein: "主菜",
  bean: "豆類",
  vegetable: "野菜",
  mushroom: "きのこ",
  seaweed: "海藻",
  fruit: "果物",
  drink: "飲み物",
  seasoning: "ちょい足し",
};

const MEAL_GROUP_LABELS = {
  staple: "主食",
  main: "主菜",
  side: "副菜",
};

function getMealGroup(food) {
  if (!food) return "side";
  if (food.mealGroup) return food.mealGroup;
  if (food.role === "staple") return "staple";
  if (food.role === "protein" || food.role === "bean") return "main";
  return "side";
}

const MODE_LABELS = {
  today: {
    badge: "今日の食べ方",
    detail_title: "別案・飲み物・選んだ理由",
    how_to_label: "今日使いやすい候補",
    avoid_label: "避けたい食べ方",
    reason_label: "理由",
    lifestyle_tip_label: "食後に一緒に",
    titlePrefix: "今日は",
    contextSignalLow: "安定",
    contextSignalMiddle: "いたわり",
    contextSignalHigh: "守り",
  },
  tomorrow: {
    badge: "明日の食べ方",
    detail_title: "別案・飲み物・明日の理由",
    how_to_label: "明日のために用意しやすい候補",
    avoid_label: "寝る前から明日の朝までに避けたいもの",
    reason_label: "理由",
    lifestyle_tip_label: "今夜から明日の朝に一緒に",
    titlePrefix: "明日は",
    contextSignalLow: "安定",
    contextSignalMiddle: "いたわり",
    contextSignalHigh: "守り",
  },
};

const SIGNAL_COPY = {
  today: {
    low: "大きく変えなくても、食材の選び方を少し合わせれば十分な日です。",
    middle: "午後から夜に体調が変わりやすいので、食べものを少し選びたい日です。",
    high: "今日は食べ方の影響が体感に出やすい日です。辛い物や食べすぎを避け、今の体調に合う食材を選びます。",
  },
  tomorrow: {
    low: "明日は安定寄り。食材は大きく変えすぎなくて大丈夫です。",
    middle: "明日はいたわり寄りの見込み。今夜から明日の朝の食べものと飲みものを少し選びます。",
    high: "明日は守り寄りの見込み。寝る前から明日の朝までの飲みものと食べものを選びます。",
  },
};

const TRIGGER_PROFILES = {
  damp: {
    label: "湿気",
    title: "湿気が強い日の食べ方",
    needs: ["drain_damp", "support_spleen", "light", "digest"],
    anti: ["cold", "greasy", "sweet_heavy", "dairy_heavy"],
    lead: "湿気が強い日は、冷たい飲み物・甘い飲み物・脂っこいものばかりにならないようにします。",
    avoid: ["冷たい飲み物と甘いものばかりになる", "脂っこいものを続けて食べる", "パン・麺だけで済ませる"],
    reason: "湿気の日は、冷たいもの・甘いもの・脂っこいものが続くと、胃が重く感じやすくなります。大根、きのこ、海藻などを候補にします。",
  },
  cold: {
    label: "低温",
    title: "気温が低い日の食べ方",
    needs: ["warm", "support_spleen", "qi", "kidney"],
    anti: ["cold", "raw", "cooling_strong"],
    lead: "気温が低い日は、温かい料理や火を通したものを選びます。",
    avoid: ["冷たい飲み物だけで流し込む", "生もの・サラダだけで済ませる", "冷たい乳製品を続ける"],
    reason: "気温が低い日は、冷たい料理だけで済ませず、火を通したものを入れる方が合います。",
  },
  heat: {
    label: "高温",
    title: "気温が高い日の食べ方",
    needs: ["clear_heat", "fluids", "light", "cool"],
    anti: ["warm", "warm_hot", "spicy", "greasy", "alcohol_like"],
    lead: "気温が高い日は、辛いもの・濃い味のもの・脂っこいものを食べすぎないようにします。",
    avoid: ["辛いものと濃い味のものを続けて食べる", "お酒を飲みながら脂っこいものを食べる", "甘いドリンクで済ませる"],
    reason: "気温が高い日は、辛いもの・濃い味のもの・脂っこいものを食べすぎると、体が熱く感じやすくなります。豆腐、白身魚、トマトなどを候補にします。",
  },
  dry: {
    label: "乾燥",
    title: "乾燥が気になる日の食べ方",
    needs: ["moisten", "fluids", "lung", "yin"],
    anti: ["drying", "spicy", "caffeine_like"],
    lead: "乾燥が強い日は、のどや口の乾きが気になる時に食べやすいものを選びます。",
    avoid: ["乾いた菓子だけで済ませる", "空腹でコーヒーだけを流し込む", "辛いものを続けて食べる"],
    reason: "乾燥が強い日は、乾いた菓子だけで済ませず、汁物や水分のある食べものを入れる方が合います。",
  },
  pressure_down: {
    label: "低気圧",
    title: "低気圧の日の食べ方",
    needs: ["qi", "support_spleen", "drain_damp", "light"],
    anti: ["greasy", "alcohol_like", "sweet_heavy"],
    lead: "低気圧の日は、食後に胃が重くなりやすい食べ方を避けます。",
    avoid: ["食事を抜いてカフェインだけで乗り切ろうとする", "揚げ物と甘いものばかり食べる", "お酒を飲みながら脂っこいものを食べる"],
    reason: "低気圧の日は、食事を抜いてカフェインだけで済ませず、胃が重くなりにくい食べものを候補にします。",
  },
  pressure_up: {
    label: "気圧上昇",
    title: "気圧上昇の日の食べ方",
    needs: ["move_qi", "calm", "clear_heat", "light"],
    anti: ["warm", "spicy", "warm_hot", "caffeine_like", "greasy"],
    lead: "気圧上昇の日は、辛いものやカフェインをとりすぎないようにします。",
    avoid: ["辛いものを食べたあとにコーヒーを飲む", "濃い味を早食いする", "お酒を飲みながら塩辛いものを食べる"],
    reason: "気圧上昇の日は、辛いもの・カフェイン・濃い味のものをとりすぎないようにします。香味野菜など、食べやすいものを候補にします。",
  },
  default: {
    label: "天気変化",
    title: "天気が変わりやすい日の食べ方",
    needs: ["support_spleen", "light", "qi"],
    anti: ["greasy", "sweet_heavy"],
    lead: "天気が変わりやすい日は、胃が重くなりやすい食べ方を避けます。",
    avoid: ["甘いものとカフェインだけで済ませる", "食べすぎてすぐ座りっぱなしになる", "お酒を飲みながら脂っこいものを食べる"],
    reason: "体調が読みにくい日は、まず食べすぎず、胃が重くなりにくい食べものを候補にします。",
  },
};

const PAIR_FOOD_PROFILES = {
  "damp+heat": {
    label: "暑さと湿気",
    title: "暑さと湿気がある日の食べ方",
    needs: ["clear_heat", "drain_damp", "digest", "support_spleen", "light"],
    anti: ["warm_hot", "spicy", "greasy", "sweet_heavy", "cold"],
    lead: "暑さと湿気がある日は、冷たい飲み物ばかり飲まず、胃が重くなりにくい食べものを選びます。",
    avoid: ["冷たい甘い飲み物ばかり飲む", "辛いものと脂っこいものを続けて食べる", "濃い味で食欲を無理に出す"],
    reason: "暑さと湿気がある日は、冷たい飲み物ばかり飲むと胃が重く感じやすくなります。白身魚、豆腐、大根、きのこ、海藻などを候補にします。",
  },
  "cold+damp": {
    label: "冷えと湿気",
    title: "冷え込みと湿気がある日の食べ方",
    needs: ["warm", "drain_damp", "support_spleen", "digest"],
    anti: ["cold", "raw", "sweet_heavy", "greasy"],
    lead: "冷え込みと湿気がある日は、冷たいものばかりにせず、温かい料理を選びます。",
    avoid: ["冷たい飲み物を食事中に続ける", "甘いものと乳製品ばかり食べる", "生ものだけで済ませる"],
    reason: "冷え込みと湿気がある日は、冷たいものや甘いものが続くと胃が重く感じやすくなります。温かい主食、汁物、きのこ類を候補にします。",
  },
  "dry+heat": {
    label: "暑さと乾燥",
    title: "暑さと乾燥がある日の食べ方",
    needs: ["clear_heat", "moisten", "fluids", "yin", "light"],
    anti: ["warm_hot", "spicy", "drying", "alcohol_like"],
    lead: "暑さと乾燥がある日は、辛いものや濃い味のものを食べすぎず、汁物や水分のある食べものを選びます。",
    avoid: ["辛いものを続けて食べる", "乾いた菓子だけで済ませる", "空腹でコーヒーだけを流し込む"],
    reason: "暑さと乾燥がある日は、辛いものや濃い味のものを食べすぎると、のどや口の乾きが気になりやすくなります。豆腐、トマト、梨、白ごまなどを候補にします。",
  },
  "cold+dry": {
    label: "冷えと乾燥",
    title: "冷え込みと乾燥がある日の食べ方",
    needs: ["warm", "moisten", "support_spleen", "yin"],
    anti: ["cold", "raw", "spicy", "drying"],
    lead: "冷え込みと乾燥がある日は、冷たいものばかりにせず、温かい汁物も入れます。",
    avoid: ["冷たい飲み物で済ませる", "乾いた菓子だけで済ませる", "辛いものを続けて食べる"],
    reason: "冷え込みと乾燥がある日は、冷たいものや乾いた菓子だけで済ませないようにします。温かい汁物、卵、れんこん、白ごまなどを候補にします。",
  },
  "damp+pressure_down": {
    label: "低気圧と湿気",
    title: "低気圧と湿気がある日の食べ方",
    needs: ["qi", "support_spleen", "drain_damp", "digest", "light"],
    anti: ["greasy", "sweet_heavy", "cold", "alcohol_like"],
    lead: "低気圧と湿気がある日は、食後に眠くなりやすい食べ方を避けます。",
    avoid: ["揚げ物と甘いものばかり食べる", "冷たい飲み物を一気に飲む", "お酒を飲みながら脂っこいものを食べる"],
    reason: "低気圧と湿気がある日は、甘いもの・脂っこいもの・冷たい飲み物が続くと胃が重く感じやすくなります。白身魚、大根、きのこ、海藻などを候補にします。",
  },
  "heat+pressure_up": {
    label: "暑さと気圧上昇",
    title: "暑さと気圧上昇がある日の食べ方",
    needs: ["clear_heat", "move_qi", "calm", "light", "digest"],
    anti: ["warm", "warm_hot", "spicy", "caffeine_like", "greasy"],
    lead: "暑さと気圧上昇がある日は、辛いもの・カフェイン・濃い味のものをとりすぎないようにします。",
    avoid: ["辛いものを食べたあとにコーヒーを飲む", "濃い味を早食いする", "お酒を飲みながら塩辛いものを食べる"],
    reason: "暑さと気圧上昇がある日は、辛いものやカフェインをとりすぎると、頭や肩に力が入りやすくなることがあります。香味野菜など、食べやすいものを候補にします。",
  },
};

const SYMPTOM_PROFILES = {
  fatigue: {
    label: "だるさ",
    needs: ["qi", "support_spleen", "protein", "light"],
    anti: ["sweet_heavy", "greasy"],
    avoid: ["甘いもので食事を済ませる", "食事を抜いてカフェインだけで乗り切ろうとする"],
  },
  sleep: {
    label: "睡眠",
    needs: ["calm", "yin", "moisten", "light"],
    anti: ["caffeine_like", "spicy", "greasy"],
    avoid: ["夜にカフェインをとる", "寝る直前に濃い味のものや脂っこいものを食べる"],
  },
  digestion: {
    label: "胃腸",
    needs: ["support_spleen", "digest", "light"],
    anti: ["raw", "cold", "greasy", "sweet_heavy"],
    avoid: ["冷たい飲み物を食事中に続ける", "早食いで量を増やす"],
  },
  neck_shoulder: {
    label: "首肩",
    needs: ["move_qi", "move_blood", "warm", "light"],
    anti: ["caffeine_like", "greasy"],
    avoid: ["空腹のままカフェインを入れる", "濃い味を食べてすぐ長時間座る"],
  },
  low_back_pain: {
    label: "腰",
    needs: ["kidney", "warm", "support", "blood"],
    anti: ["cold", "raw"],
    avoid: ["冷たいものを続ける", "食べすぎて深く座りっぱなしになる"],
  },
  swelling: {
    label: "むくみ",
    needs: ["drain_damp", "light", "support_spleen", "sea"],
    anti: ["salty_heavy", "cold", "sweet_heavy"],
    avoid: ["塩辛いものを食べたあとに甘い飲み物を飲む", "冷たい飲み物を一気に飲む"],
  },
  headache: {
    label: "頭痛",
    needs: ["move_qi", "clear_heat", "light", "calm"],
    anti: ["alcohol_like", "caffeine_like", "greasy"],
    avoid: ["お酒を飲みながら脂っこいものを食べる", "空腹のままカフェインを入れる"],
  },
  dizziness: {
    label: "めまい",
    needs: ["qi", "blood", "support_spleen", "protein"],
    anti: ["cold", "skipping"],
    avoid: ["食事を抜く", "冷たい飲み物を一気に飲む"],
  },
  mood: {
    label: "気分",
    needs: ["move_qi", "calm", "support_spleen", "light"],
    anti: ["caffeine_like", "sweet_heavy", "alcohol_like"],
    avoid: ["甘いものとカフェインだけで乗り切ろうとする", "食事を抜いて刺激物で済ませる"],
  },
};




export function normalizeFoodTriggerKey(key) {
  if (!key) return "default";
  if (key === "humidity") return "damp";
  if (key === "temp") return "cold";
  if (key === "pressure") return "pressure_down";
  if (key === "humidity_up") return "damp";
  if (key === "humidity_down") return "dry";
  if (key === "temp_down") return "cold";
  if (key === "temp_up") return "heat";
  if (key === "pressure_down") return "pressure_down";
  if (key === "pressure_up") return "pressure_up";
  if (TRIGGER_PROFILES[key]) return key;
  return "default";
}

export function normalizeFoodTriggerKeyFromRiskContext(riskContext) {
  const exact = riskContext?.summary?.main_trigger_exact || riskContext?.summary?.personal_main_trigger_exact;
  if (exact) {
    const projected = hasExplicitPressureResponseDirection(riskContext)
      ? getLegacyCareTriggerKey(exact, riskContext)
      : exact;
    return normalizeFoodTriggerKey(projected);
  }

  const main = riskContext?.summary?.main_trigger;
  const dir = riskContext?.summary?.trigger_dir;

  if (main === "humidity" && dir === "up") return "damp";
  if (main === "humidity" && dir === "down") return "dry";
  if (main === "temp" && dir === "down") return "cold";
  if (main === "temp" && dir === "up") return "heat";
  if (main === "pressure" && dir === "down") return "pressure_down";
  if (main === "pressure" && dir === "up") return "pressure_up";

  return "default";
}

export function getSecondaryFoodTriggerKey(riskContext) {
  const primaryRaw = riskContext?.summary?.main_trigger_exact || riskContext?.summary?.personal_main_trigger_exact;
  const primary = normalizeFoodTriggerKey(
    hasExplicitPressureResponseDirection(riskContext)
      ? getLegacyCareTriggerKey(primaryRaw, riskContext)
      : primaryRaw
  );
  const secondaryRaw =
    riskContext?.summary?.secondary_trigger_exact ||
    riskContext?.summary?.personal_secondary_trigger_exact ||
    null;
  const secondary = normalizeFoodTriggerKey(
    hasExplicitPressureResponseDirection(riskContext)
      ? getLegacyCareTriggerKey(secondaryRaw, riskContext)
      : secondaryRaw
  );

  if (!canUseSecondaryFoodTrigger(primary, secondary)) return null;
  return secondary;
}

function uniq(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function getSignalFoodContext(signal, mode = "today") {
  const level = Number(signal ?? 0);
  const labels = MODE_LABELS[mode] || MODE_LABELS.today;
  const copy = SIGNAL_COPY[mode] || SIGNAL_COPY.today;

  if (level >= 2) return { label: labels.contextSignalHigh, lead: copy.high, intensity: "high" };
  if (level >= 1) return { label: labels.contextSignalMiddle, lead: copy.middle, intensity: "middle" };
  return { label: labels.contextSignalLow, lead: copy.low, intensity: "low" };
}

function buildNeeds({ triggerKey, secondaryKey, symptomFocus, subLabels = [] }) {
  const pairKey = getFoodTriggerPairKey(triggerKey, secondaryKey);
  const pair = pairKey ? PAIR_FOOD_PROFILES[pairKey] : null;
  const trigger = TRIGGER_PROFILES[triggerKey] || TRIGGER_PROFILES.default;
  const secondary = pair ? null : secondaryKey ? TRIGGER_PROFILES[secondaryKey] : null;
  const symptom = SYMPTOM_PROFILES[symptomFocus] || null;

  const sub = getSubLabelFlags(subLabels);
  const subNeeds = [];
  const subAnti = [];

  if (sub.cold) subNeeds.push("warm", "support_spleen");
  if (sub.heat) subNeeds.push("clear_heat", "fluids");
  if (sub.fluidDamp) subNeeds.push("drain_damp", "support_spleen", "light");
  if (sub.fluidDeficiency) subNeeds.push("moisten", "yin", "fluids");
  if (sub.qiDeficiency) subNeeds.push("qi", "support_spleen", "protein");
  if (sub.bloodDeficiency) subNeeds.push("blood", "moisten", "protein");
  if (sub.bloodStasis) subNeeds.push("move_blood", "move_qi");
  if (sub.qiStagnation) subNeeds.push("move_qi", "calm");

  if (subNeeds.includes("warm")) subAnti.push("cold", "raw");
  if (subNeeds.includes("clear_heat")) subAnti.push("warm_hot", "spicy");
  if (subNeeds.includes("drain_damp")) subAnti.push("sweet_heavy", "dairy_heavy", "greasy");
  if (subNeeds.includes("moisten")) subAnti.push("drying");

  return {
    needs: uniq([
      ...(pair?.needs || trigger.needs || []),
      ...(secondary?.needs || []).slice(0, 2),
      ...(symptom?.needs || []),
      ...subNeeds,
    ]),
    anti: uniq([
      ...(pair?.anti || trigger.anti || []),
      ...(secondary?.anti || []).slice(0, 2),
      ...(symptom?.anti || []),
      ...subAnti,
    ]),
  };
}

function foodScore(food, { needs, anti, triggerKey, symptomFocus }) {
  const tags = food.tags || [];
  const antiTags = food.anti || [];
  let score = 0;

  score += Number(food.base || 1);

  needs.forEach((need) => {
    if (tags.includes(need)) score += (drink.inferredTags || []).includes(need) ? 1.5 : 3;
  });

  const antiMatches = new Set();

  anti.forEach((bad) => {
    if (tags.includes(bad) || antiTags.includes(bad)) {
      antiMatches.add(bad);
    }
  });

  if (triggerKey && antiTags.includes(triggerKey)) {
    antiMatches.add(`trigger:${triggerKey}`);
  }

  if (symptomFocus && antiTags.includes(symptomFocus)) {
    antiMatches.add(`symptom:${symptomFocus}`);
  }

  score -= antiMatches.size * 4;

  if (tags.includes("easy")) score += 1;
  if (tags.includes("light") && ["damp", "heat", "pressure_down", "pressure_up"].includes(triggerKey)) score += 1;
  if (tags.includes("warm") && triggerKey === "cold") score += 2;
  if (tags.includes("moisten") && triggerKey === "dry") score += 2;
  if (tags.includes("drain_damp") && triggerKey === "damp") score += 2;
  if (tags.includes("clear_heat") && triggerKey === "heat") score += 2;

  // 乾燥が主背景の時は、重だるさ食材に寄りすぎない。
  // ただし、むくみ文脈では必要なので残す。
  if (triggerKey === "dry" && symptomFocus !== "swelling" && tags.includes("drain_damp")) {
    score -= 2;
  }

  return score;
}

function getBestFood(scored, predicate, selectedNames = new Set()) {
  return scored.find((food) => predicate(food) && !selectedNames.has(food.name)) || null;
}

function selectFoodItems({ triggerKey, secondaryKey, symptomFocus, subLabels }) {
  const needSet = buildNeeds({ triggerKey, secondaryKey, symptomFocus, subLabels });
  const scored = FOOD_ITEMS
    .map((food, index) => ({ ...food, _index: index, _score: foodScore(food, { ...needSet, triggerKey, symptomFocus }) }))
    .filter((food) => food._score > 1)
    .sort((a, b) => b._score - a._score || a._index - b._index);

  const selected = [];
  const selectedNames = new Set();

  const push = (food) => {
    if (!food || selectedNames.has(food.name)) return;
    selected.push(food);
    selectedNames.add(food.name);
  };

  // 画面では「食材分類」ではなく、食事を組み立てるための
  // 主食・主菜・副菜で必ず見せる。豆類は主菜側に寄せる。
  push(getBestFood(scored, (food) => getMealGroup(food) === "staple", selectedNames));
  push(getBestFood(scored, (food) => food.role === "protein", selectedNames));
  push(getBestFood(scored, (food) => getMealGroup(food) === "main", selectedNames));

  const sidePredicates = [
    (food) => food.role === "vegetable",
    (food) => food.role === "mushroom",
    (food) => food.role === "seaweed",
    (food) => food.role === "seasoning",
    (food) => food.role === "fruit",
  ];

  for (const predicate of sidePredicates) {
    if (selected.filter((food) => getMealGroup(food) === "side").length >= 4) break;
    push(getBestFood(scored, predicate, selectedNames));
  }

  for (const food of scored) {
    if (selected.length >= 7) break;
    if (selectedNames.has(food.name)) continue;
    if (food.role === "drink") continue;
    push(food);
  }

  if (!selected.some((food) => getMealGroup(food) === "staple")) {
    push(FOOD_ITEMS.find((food) => food.name === "ごはん"));
  }

  if (!selected.some((food) => getMealGroup(food) === "main")) {
    push(FOOD_ITEMS.find((food) => food.name === "卵"));
  }

  return selected;
}

function formatFoodGroupItems(foods) {
  const groups = {
    staple: [],
    main: [],
    side: [],
  };

  foods.forEach((food) => {
    const group = getMealGroup(food);
    if (!groups[group]) groups.side.push(food);
    else groups[group].push(food);
  });

  return ["staple", "main", "side"]
    .map((group) => {
      const items = groups[group] || [];
      if (!items.length) return null;
      const names = items.slice(0, group === "side" ? 4 : 3).map((food) => food.name).join("、");
      const notes = items.slice(0, 2).map((food) => food.note).filter(Boolean);
      const noteText = notes.length ? `（${notes.join(" / ")}）` : "";
      return `${MEAL_GROUP_LABELS[group]}：${names}${noteText}`;
    })
    .filter(Boolean);
}

function getScoredFoodPool({ triggerKey, secondaryKey, symptomFocus, subLabels }) {
  const needSet = buildNeeds({ triggerKey, secondaryKey, symptomFocus, subLabels });

  return FOOD_ITEMS
    .map((food, index) => ({ ...food, _index: index, _score: foodScore(food, { ...needSet, triggerKey, symptomFocus }) }))
    .filter((food) => food._score > 1)
    .sort((a, b) => b._score - a._score || a._index - b._index);
}

const TOMORROW_FOOD_PREP_OPTIONS = {
  "damp+heat": {
    drink: ["麦茶", "とうもろこし茶"],
    night: ["豆腐", "大根入りの味噌汁", "バナナ半分"],
    morning: ["ごはん", "味噌汁", "豆腐"],
  },
  "cold+damp": {
    drink: ["白湯", "ほうじ茶"],
    night: ["温かい味噌汁", "豆腐", "卵スープ"],
    morning: ["温かいうどん", "味噌汁", "卵"],
  },
  "dry+heat": {
    drink: ["麦茶", "ルイボスティー"],
    night: ["豆腐", "梨", "白ごまを入れた汁物"],
    morning: ["ごはん", "味噌汁", "豆腐"],
  },
  "cold+dry": {
    drink: ["白湯", "ほうじ茶"],
    night: ["葛湯", "卵スープ", "温かい味噌汁"],
    morning: ["ごはん", "味噌汁", "卵"],
  },
  "damp+pressure_down": {
    drink: ["ほうじ茶", "とうもろこし茶"],
    night: ["豆腐", "きのこの味噌汁", "バナナ半分"],
    morning: ["ごはん", "味噌汁", "卵"],
  },
  "heat+pressure_up": {
    drink: ["麦茶", "ルイボスティー"],
    night: ["豆腐", "トマトを少し", "具を少なめにした味噌汁"],
    morning: ["ごはん", "味噌汁", "豆腐"],
  },
  damp: {
    drink: ["ほうじ茶", "とうもろこし茶"],
    night: ["豆腐", "きのこの味噌汁", "バナナ半分"],
    morning: ["ごはん", "味噌汁", "卵"],
  },
  cold: {
    drink: ["白湯", "ほうじ茶"],
    night: ["温かい味噌汁", "卵スープ", "豆腐"],
    morning: ["温かいうどん", "味噌汁", "卵"],
  },
  heat: {
    drink: ["麦茶", "ルイボスティー"],
    night: ["豆腐", "トマトを少し", "バナナ半分"],
    morning: ["ごはん", "味噌汁", "豆腐"],
  },
  dry: {
    drink: ["白湯", "ルイボスティー"],
    night: ["葛湯", "豆腐", "梨"],
    morning: ["ごはん", "味噌汁", "卵"],
  },
  pressure_down: {
    drink: ["ほうじ茶", "麦茶"],
    night: ["豆腐", "味噌汁", "バナナ半分"],
    morning: ["ごはん", "味噌汁", "卵"],
  },
  pressure_up: {
    drink: ["麦茶", "ルイボスティー"],
    night: ["豆腐", "具を少なめにした味噌汁", "バナナ半分"],
    morning: ["ごはん", "味噌汁", "卵"],
  },
  default: {
    drink: ["白湯", "ほうじ茶"],
    night: ["豆腐", "味噌汁", "バナナ半分"],
    morning: ["ごはん", "味噌汁", "卵"],
  },
};

function getTomorrowFoodPrepOptions(triggerKey, secondaryKey) {
  const pairKey = getFoodTriggerPairKey(triggerKey, secondaryKey);
  return TOMORROW_FOOD_PREP_OPTIONS[pairKey] ||
    TOMORROW_FOOD_PREP_OPTIONS[triggerKey] ||
    TOMORROW_FOOD_PREP_OPTIONS.default;
}

function getFallbackDrinkNames(triggerKey, secondaryKey) {
  const keys = [triggerKey, secondaryKey].filter(Boolean);

  if (keys.includes("cold")) return ["ほうじ茶", "生姜湯"];
  if (keys.includes("dry") && keys.includes("heat")) return ["麦茶", "ルイボスティー"];
  if (keys.includes("dry")) return ["ルイボスティー", "葛湯"];
  if (keys.includes("damp") || keys.includes("pressure_down")) return ["とうもろこし茶", "はとむぎ茶"];
  if (keys.includes("heat") || keys.includes("pressure_up")) return ["麦茶", "とうもろこし茶"];

  return ["ほうじ茶", "麦茶"];
}

function formatFoodNames(foods, limit = 3) {
  return foods
    .slice(0, limit)
    .map((food) => food.name)
    .join("、");
}

function formatTomorrowFoodItems({ triggerKey, secondaryKey, selectedFoods = [], hasConstitutionAdjustment = false }) {
  const options = getTomorrowFoodPrepOptions(triggerKey, secondaryKey);
  const sideRoles = new Set(["vegetable", "mushroom", "seaweed", "seasoning", "fruit"]);
  const rankedCandidates = [
    ...selectedFoods.filter((food) => sideRoles.has(food?.role)),
    ...selectedFoods.filter((food) => !sideRoles.has(food?.role)),
  ];
  const constitutionCandidates = hasConstitutionAdjustment
    ? rankedCandidates
        .filter((food) => food?.name && food.role !== "drink")
        .map((food) => food.name)
        .filter((name) => !options.night.includes(name) && !options.morning.includes(name))
        .slice(0, 2)
    : [];
  const night = uniq([...options.night, ...constitutionCandidates]).slice(0, 4);
  const morning = uniq([...options.morning, ...constitutionCandidates]).slice(0, 4);

  return [
    `寝る前に小腹が空いたら：${night.join("、")}`,
    `朝に食べるなら：${morning.join("、")}`,
  ].filter(Boolean);
}

function buildTomorrowAvoidItems({ triggerKey, secondaryKey, symptomFocus }) {
  const pairKey = getFoodTriggerPairKey(triggerKey, secondaryKey);
  const key = pairKey || triggerKey;
  const itemsByKey = {
    "damp+heat": [
      "寝る前に冷たい甘い飲み物ばかり飲む",
      "夜にアイスや菓子パンを食べる",
      "朝に冷たい飲み物だけを飲む",
      "朝食を抜いてコーヒーだけで動く",
    ],
    "cold+damp": [
      "夕食後に冷たい飲み物ばかり飲む",
      "夜にアイスやヨーグルトを食べる",
      "朝に冷たい飲み物だけを飲む",
      "朝食を抜く",
    ],
    "dry+heat": [
      "寝る前に辛いものを食べる",
      "寝る前にコーヒーや濃いお茶を飲む",
      "夜に乾いた菓子だけを食べる",
      "朝食を抜いてコーヒーだけで動く",
    ],
    "cold+dry": [
      "寝る前に冷たい飲み物ばかり飲む",
      "夜に乾いた菓子だけを食べる",
      "朝に冷たい飲み物だけを飲む",
      "朝食を抜く",
    ],
    "damp+pressure_down": [
      "夜に揚げ物と甘いものばかり食べる",
      "寝る前に冷たい飲み物を一気に飲む",
      "夜にお酒を飲みながら脂っこいものを食べる",
      "朝食を抜いてコーヒーだけで動く",
    ],
    "heat+pressure_up": [
      "寝る前に辛いものを食べる",
      "寝る前にコーヒーや濃いお茶を飲む",
      "夜に濃い味のものを急いで食べる",
      "朝食を抜いてコーヒーだけで動く",
    ],
    damp: [
      "夕食後に冷たい飲み物ばかり飲む",
      "夜に甘い飲み物を何度も飲む",
      "朝に冷たい飲み物だけを飲む",
    ],
    cold: [
      "寝る前に冷たい飲み物ばかり飲む",
      "夜にアイスを食べる",
      "朝に冷たい飲み物だけを飲む",
    ],
    heat: [
      "寝る前に辛いものを食べる",
      "寝る前にお酒を飲む",
      "朝食を抜いてコーヒーだけで動く",
    ],
    dry: [
      "夜に乾いた菓子だけを食べる",
      "寝る前にコーヒーや濃いお茶を飲む",
      "朝に飲み物だけで済ませる",
    ],
    pressure_down: [
      "夜に揚げ物と甘いものばかり食べる",
      "寝る前にお酒を飲む",
      "朝食を抜いてコーヒーだけで動く",
    ],
    pressure_up: [
      "寝る前に辛いものを食べる",
      "寝る前にコーヒーや濃いお茶を飲む",
      "夜に濃い味のものを急いで食べる",
    ],
    default: [
      "夜に食べすぎる",
      "寝る前に冷たい飲み物ばかり飲む",
      "朝食を抜いてコーヒーだけで動く",
    ],
  };

  const symptomItems = {
    digestion: ["夜に脂っこいものを食べすぎる", "朝に冷たい飲み物だけを飲む"],
    sleep: ["寝る前にコーヒーや濃いお茶を飲む", "寝る直前に夜食を食べる"],
    fatigue: ["朝食を甘い飲み物だけで済ませる"],
    swelling: ["夜に塩辛いものを食べすぎる", "寝る前に冷たい飲み物を一気に飲む"],
  };

  return uniq([...(symptomItems[symptomFocus] || []), ...(itemsByKey[key] || itemsByKey.default)]).slice(0, 4);
}

function getActionBody({ mode, triggerProfile, symptomProfile }) {
  if (mode === "tomorrow") {
    const symptomPart = symptomProfile ? `${symptomProfile.label}が気になる時は、` : "";
    return `${symptomPart}明日の予報に合わせて、今夜〜明朝に使いやすい汁物・素材を先に見ておきます。飲み物は下の候補で、コーヒーや緑茶も時間帯込みで見ます。`;
  }

  const symptomPart = symptomProfile ? `${symptomProfile.label}の出方も見ながら、` : "";
  return `${symptomPart}今日は“何を足すか”より、“重くする組み合わせを減らす”ところから。汁物・素材・飲み物を一つだけ合わせれば十分です。`;
}


// v7.30: 食べるケアも「食材の羅列」ではなく、今日の体感に結びつく文体へ寄せる。
const FOOD_VOICE_REASONS = {
  damp: "湿気の日は、冷たいもの・甘いもの・脂っこいものが続くと、食後の重さやだるさが残りやすくなります。今日は、油を控えた軽めの食事にします。",
  cold: "冷え込みの日は、胃腸の動きがゆっくりになりやすい日です。冷たいものだけで済ませず、温かい料理や飲み物を一つ加えます。",
  heat: "暑さの日は、辛いもの・濃い味・脂っこいものが重なると、熱っぽさやだるさ、そわつきが出やすくなります。今日は、こってりした食事を控え、さっぱり食べられる物を選びます。",
  dry: "乾燥の日は、口やのどの乾きが出やすい日です。乾いた菓子やコーヒーだけでつなぐと、のど・目・首肩の疲れにつながりやすくなります。今日は、汁気とうるおいを少し足します。",
  pressure_down: "低気圧の日は、頭や体だけでなく胃腸も重く感じることがあります。食事を抜いてカフェインだけに頼らず、食後に重さが残らない量を目安にします。",
  pressure_up: "気圧上昇の日は、気持ちが急ぎ、早食いになりやすいことがあります。辛味・カフェイン・濃い味を続けず、落ち着いて食べられる軽めの一食にします。",
  default: "体調が読みにくい日は、特別な食材を探すより、冷たい物・甘い物・脂っこい物を重ねない方が選びやすくなります。食後に動き出しやすい量を目安にします。",
};

const FOOD_VOICE_AVOID = {
  damp: ["甘いものとキンキンの飲み物だけで、今日を乗り切ろうとする", "脂っこいもので、体の重さをさらに増やす", "パン・麺だけで済ませて、胃腸をさらにもたつかせる"],
  cold: ["冷たい飲み物だけで済ませて、お腹まで冷やす", "生もの・サラダだけで済ませて、胃腸を冷やしっぱなしにする", "冷たい乳製品を続けて、お腹まわりを重くする"],
  heat: ["辛いものと濃い味を続けて、熱っぽさを強める", "お酒と脂っこいものを重ねて、胃もたれや寝苦しさを残す", "甘いドリンクだけで食事を済ませる"],
  dry: ["乾いたお菓子だけで済ませて、水分のある物を取らない", "空腹でコーヒーだけを流し込み、水分を補わない", "辛い物を続けて、のどや口の乾きを強める"],
  pressure_down: ["食事を抜いて、カフェインだけで乗り切ろうとする", "揚げ物と甘いものを一度に食べて、食後の重さを増やす", "お酒と脂っこいものを重ねて、翌朝まで重さを残す"],
  pressure_up: ["辛いもののあとにコーヒーを続ける", "濃い味の食事を急いで食べる", "塩辛いものとお酒を重ねる"],
  default: ["甘いものとカフェインだけで乗り切ろうとする", "食べすぎてすぐ座りっぱなしになる", "お酒と脂っこいものを重ねる"],
};

const FOOD_VOICE_SYMPTOM_REASONS = {
  fatigue: " だるさを見ている時は、“一瞬元気が出るもの”より、あとで重くならない食べ方を優先します。",
  sleep: " 睡眠が気になる時は、夜のカフェインや夜食、食後の重さも考えて選びます。",
  digestion: " 胃腸が気になる時は、食材そのものより、冷たい物・甘い物・脂っこい物を重ねないようにします。",
  neck_shoulder: " 首肩が気になる時は、お腹を冷やしすぎず、食後の重さを残さないことも意識します。",
  low_back_pain: " 腰が気になる時は、腰やお腹を冷やしすぎない食べ方にします。",
  swelling: " むくみが気になる時は、冷たい物・甘い物・塩辛い物を一度に重ねないようにします。",
  headache: " 頭痛が気になる時は、カフェインや辛味を増やしすぎず、食後の重さも残さないようにします。",
  dizziness: " めまいを見ている時は、食事抜きや冷たい飲み物だけで急に動く流れを避けます。",
  mood: " 気分の波が気になる時は、甘い物やカフェインを続けたあとの疲れも考えて選びます。",
};

function getFoodVoiceReason(triggerKey, symptomFocus) {
  const key = normalizeFoodTriggerKey(triggerKey);
  return `${FOOD_VOICE_REASONS[key] || FOOD_VOICE_REASONS.default}${FOOD_VOICE_SYMPTOM_REASONS[symptomFocus] || ""}`;
}

function getFoodVoiceAvoidItems(triggerKey, symptomFocus) {
  const key = normalizeFoodTriggerKey(triggerKey);
  const symptomAvoid = SYMPTOM_PROFILES[symptomFocus]?.avoid || [];
  return uniq([...(FOOD_VOICE_AVOID[key] || FOOD_VOICE_AVOID.default), ...symptomAvoid]).slice(0, 4);
}

function buildAvoidItems({ triggerKey, secondaryKey, symptomFocus }) {
  const voiceItems = getFoodVoiceAvoidItems(triggerKey, symptomFocus);
  if (voiceItems.length) return voiceItems;

  const pairKey = getFoodTriggerPairKey(triggerKey, secondaryKey);
  const trigger = pairKey && PAIR_FOOD_PROFILES[pairKey]
    ? PAIR_FOOD_PROFILES[pairKey]
    : TRIGGER_PROFILES[triggerKey] || TRIGGER_PROFILES.default;
  const symptom = SYMPTOM_PROFILES[symptomFocus] || null;
  return uniq([...(symptom?.avoid || []), ...(trigger.avoid || [])]).slice(0, 4);
}

function buildContextChips({ triggerKey, secondaryKey, signalContext, symptomFocus }) {
  return [
    TRIGGER_LABELS[triggerKey] || TRIGGER_LABELS.default,
    secondaryKey ? `${TRIGGER_LABELS[secondaryKey] || TRIGGER_LABELS.default}も影響` : null,
    signalContext?.label,
    symptomFocus ? `${SYMPTOM_LABELS[symptomFocus] || symptomFocus}に合わせる` : null,
  ].filter(Boolean);
}

function buildTomorrowReason({ triggerKey, secondaryKey, symptomFocus, subLabels = [] }) {
  const pairKey = getFoodTriggerPairKey(triggerKey, secondaryKey);
  const key = pairKey || triggerKey;
  const drinkNames = formatDrinkLeadNames({ mode: "tomorrow", triggerKey, secondaryKey, symptomFocus, subLabels });
  const drinkPhrase = drinkNames.length ? `飲み物なら${drinkNames.join("、")}などを候補にします。` : "";

  const reasonsByKey = {
    "damp+heat":
      "明日は暑さと湿気の影響が出る見込みです。寝る前に冷たい甘い飲み物ばかり飲むと、明日の朝に胃が重く感じやすくなります。今夜は麦茶やとうもろこし茶、豆腐や味噌汁などを候補にしています。",
    "cold+damp":
      "明日は冷え込みと湿気の影響が出る見込みです。夕食後に冷たい飲み物ばかり飲むと、明日の朝に胃が重く感じやすくなります。今夜は白湯、ほうじ茶、温かい味噌汁などを候補にしています。",
    "dry+heat":
      "明日は暑さと乾燥の影響が出る見込みです。寝る前に辛いものを食べたり、コーヒーや濃いお茶を飲んだりすると、のどや口の乾きが気になりやすくなります。今夜は麦茶、ルイボスティー、豆腐などを候補にしています。",
    "cold+dry":
      "明日は冷え込みと乾燥の影響が出る見込みです。寝る前に冷たい飲み物ばかり飲んだり、乾いた菓子だけを食べたりすると、明日の朝に冷えや乾きが気になりやすくなります。今夜は白湯、ほうじ茶、温かい汁物などを候補にしています。",
    "damp+pressure_down":
      "明日は低気圧と湿気の影響が出る見込みです。夜に揚げ物や甘いものばかり食べると、明日の朝に胃が重く感じやすくなります。今夜はほうじ茶、とうもろこし茶、豆腐や味噌汁などを候補にしています。",
    "heat+pressure_up":
      "明日は暑さと気圧上昇の影響が出る見込みです。寝る前に辛いものを食べたり、コーヒーや濃いお茶を飲んだりすると、頭や肩に力が入りやすくなることがあります。今夜は麦茶、ルイボスティー、豆腐や具の少ない味噌汁などを候補にしています。",
    damp:
      "明日は湿気の影響が出る見込みです。寝る前に冷たい飲み物や甘い飲み物ばかり飲むと、明日の朝に胃が重く感じやすくなります。今夜はほうじ茶、とうもろこし茶、豆腐や味噌汁などを候補にしています。",
    cold:
      "明日は冷え込みの影響が出る見込みです。寝る前に冷たい飲み物ばかり飲むと、明日の朝に体が冷えやすくなります。今夜は白湯、ほうじ茶、温かい味噌汁などを候補にしています。",
    heat:
      "明日は暑さの影響が出る見込みです。寝る前に辛いものを食べたり、お酒を飲んだりすると、明日に熱っぽさが残りやすくなります。今夜は麦茶、ルイボスティー、豆腐などを候補にしています。",
    dry:
      "明日は乾燥の影響が出る見込みです。夜に乾いた菓子だけを食べたり、寝る前にコーヒーや濃いお茶を飲んだりすると、のどや口の乾きが気になりやすくなります。今夜は白湯、ルイボスティー、豆腐や汁物などを候補にしています。",
    pressure_down:
      "明日は低気圧の影響が出る見込みです。夜に揚げ物や甘いものばかり食べると、明日の朝に胃が重く感じやすくなります。今夜はほうじ茶、麦茶、豆腐や味噌汁などを候補にしています。",
    pressure_up:
      "明日は気圧上昇の影響が出る見込みです。寝る前に辛いものを食べたり、コーヒーや濃いお茶を飲んだりすると、頭や肩に力が入りやすくなることがあります。今夜は麦茶、ルイボスティー、豆腐などを候補にしています。",
    default:
      "明日の朝に胃が重くならないように、寝る前から明日の朝までの飲みものと食べものを選びます。今夜は冷たい飲み物ばかりにせず、食べすぎないことを優先します。",
  };

  const symptomReasons = {
    digestion: " 胃腸が気になる時は、夜に脂っこいものを食べすぎないことも見ています。",
    sleep: " 睡眠が気になる時は、寝る前のカフェインと夜食も見ています。",
    fatigue: " だるさが気になる時は、朝食を甘い飲み物だけで済ませないことも見ています。",
    swelling: " むくみが気になる時は、夜に塩辛いものを食べすぎないことも見ています。",
  };

  return `${reasonsByKey[key] || reasonsByKey.default}${drinkPhrase ? ` ${drinkPhrase}` : ""}${symptomReasons[symptomFocus] || ""}`;
}

function buildFoodReason({ mode, triggerKey, secondaryKey, triggerProfile, symptomFocus, subLabels = [] }) {
  if (mode === "tomorrow") {
    return buildTomorrowReason({ triggerKey, secondaryKey, symptomFocus, subLabels });
  }

  return getFoodVoiceReason(triggerKey, symptomFocus);
}

function buildLifestyleTip(mode, triggerKey) {
  if (mode === "tomorrow") {
    if (triggerKey === "cold") return "今夜のうちに、白湯・ほうじ茶・温かい汁物など“明日の朝に選ぶ候補”を一つ決めておくと楽です。";
    if (triggerKey === "damp") return "今夜は、はとむぎ茶・とうもろこし茶・温かい汁物など、明日の重さを増やしにくい候補を一つ見ておきます。";
    if (triggerKey === "heat") return "今夜のうちに、麦茶・ルイボスティー・豆腐や軽い汁物など、明日に熱っぽさを残しにくい候補を決めておきます。";
    if (triggerKey === "dry") return "今夜は、白湯・ルイボスティー・汁物・ごま系など、明日のカサつき感を増やしにくい候補を一つ置いておきます。";
    return "今夜は食べすぎず、明日の朝に選びやすい飲み物・汁物・軽い主食を一つ候補にしておきます。";
  }

  if (triggerKey === "cold") return "食後は首元・足首・腰腹まわりを冷やしたままにしないようにします。温かい飲み物や腹巻き系の候補も相性が良い日です。";
  if (triggerKey === "damp") return "食後すぐに座りっぱなしにせず、2〜3分だけ歩きます。飲み物を選ぶなら冷たい甘いものより、軽いお茶や汁物が候補です。";
  if (triggerKey === "heat") return "食後すぐに動き切らず、汗や熱が少し引く時間を作ると楽です。麦茶や冷ましすぎない水分も候補になります。";
  if (triggerKey === "dry") return "乾いた菓子だけで済ませず、汁物か飲み物もとります。のどや目を守る候補も見ておきます。";
  return "食べた後は、量よりも次に動き出しやすいかを目安にします。";
}

export function buildIngredientFoodContext({
  mode = "today",
  triggerKey = "default",
  secondaryKey = null,
  signal = 0,
  symptomFocus = null,
  subLabels = [],
  timing = null,
  riskContext = null,
  targetDate = null,
} = {}) {
  const normalizedMode = mode === "tomorrow" ? "tomorrow" : "today";
  const responseAware = hasExplicitPressureResponseDirection(riskContext);
  const key = normalizeFoodTriggerKey(
    responseAware ? getLegacyCareTriggerKey(triggerKey, riskContext) : triggerKey
  );
  const rawSecondary = secondaryKey ? normalizeFoodTriggerKey(
    responseAware ? getLegacyCareTriggerKey(secondaryKey, riskContext) : secondaryKey
  ) : null;
  const secondary = canUseSecondaryFoodTrigger(key, rawSecondary) ? rawSecondary : null;
  const labels = MODE_LABELS[normalizedMode];
  const pairKey = getFoodTriggerPairKey(key, secondary);
  const pairProfile = pairKey ? PAIR_FOOD_PROFILES[pairKey] : null;
  const triggerProfile = pairProfile || TRIGGER_PROFILES[key] || TRIGGER_PROFILES.default;
  const symptomProfile = SYMPTOM_PROFILES[symptomFocus] || null;
  const signalContext = getSignalFoodContext(signal, normalizedMode);
  const allSubLabels = uniq(normalizeSubLabelValues([
    ...subLabels,
    ...(riskContext?.constitution_context?.sub_labels || []),
    ...(riskContext?.care_tone?.sub_labels || []),
  ]).map(value => Object.entries(SUB_LABEL_CODES).find(([, aliases]) => aliases.includes(value))?.[0] || value));
  const reactionDirection = riskContext?.summary?.reaction_direction
    || riskContext?.reaction_direction
    || riskContext?.constitution_context?.manifestation?.reaction_direction
    || null;

  const drinkCard = buildDrinkActionCard({
    mode: normalizedMode,
    triggerKey: key,
    secondaryKey: secondary,
    symptomFocus,
    subLabels: allSubLabels,
    reactionDirection,
  });

  // The dedicated drink ranking is retained; food ranking runs once in
  // enhanceFoodContext using the audited ingredient attributes.
  const legacyContext = {
    ...labels,
    timing,
    examples: [],
    action_cards: [drinkCard].filter(Boolean),
    symptom_focus: symptomFocus || null,
    trigger_key: key,
    secondary_trigger_key: secondary,
    intensity: signalContext.intensity,
    ingredient_count: FOOD_ITEMS.filter(item => item.role !== "drink").length,
    drink_count: DRINK_ITEMS.length,
    drink_model_version: "v7.79.70-drink-audit",
  };

  const theme = buildDailyCareTheme({
    mode: normalizedMode,
    targetDate,
    triggerKey: key,
    secondaryKey: secondary,
    signal,
    symptomFocus,
    riskContext,
    subLabels: allSubLabels,
  });

  return enhanceFoodContext({
    baseFood: legacyContext,
    theme,
    targetDate,
    symptomFocus,
    subLabels: allSubLabels,
    mode: normalizedMode,
  });
}

export const FOOD_INGREDIENT_COUNT = FOOD_ITEMS.length;
