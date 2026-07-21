// lib/radar_v1/careRules/foodIngredientRules.js

import { buildDailyCareTheme, enhanceFoodContext } from "./dailyCareV2";

export const TRIGGER_LABELS = {
  temp_shift: "気温差",
  damp: "湿気",
  cold: "冷え込み",
  heat: "暑さ",
  dry: "乾燥",
  pressure_down: "低気圧",
  pressure_up: "気圧上昇",
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
    high: "今日は食べ方の影響が体感に出やすい日です。刺激や量より、合う食材を選びます。",
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
    label: "冷え込み",
    title: "冷え込みが強い日の食べ方",
    needs: ["warm", "support_spleen", "qi", "kidney"],
    anti: ["cold", "raw", "cooling_strong"],
    lead: "冷え込みが強い日は、温かい料理や火を通したものを選びます。",
    avoid: ["冷たい飲み物だけで流し込む", "生もの・サラダだけで済ませる", "冷たい乳製品を続ける"],
    reason: "冷え込みが強い日は、冷たい料理だけで済ませず、火を通したものを入れる方が合います。",
  },
  heat: {
    label: "気温上昇",
    title: "暑さが強い日の食べ方",
    needs: ["clear_heat", "fluids", "light", "cool"],
    anti: ["warm", "warm_hot", "spicy", "greasy", "alcohol_like"],
    lead: "暑さが強い日は、辛いもの・濃い味のもの・脂っこいものを食べすぎないようにします。",
    avoid: ["辛いものと濃い味のものを続けて食べる", "お酒を飲みながら脂っこいものを食べる", "甘いドリンクで済ませる"],
    reason: "暑さが強い日は、辛いもの・濃い味のもの・脂っこいものを食べすぎると、体が熱く感じやすくなります。豆腐、白身魚、トマトなどを候補にします。",
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
    avoid: ["食事を抜いてカフェインだけで押し切る", "揚げ物と甘いものばかり食べる", "お酒を飲みながら脂っこいものを食べる"],
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
    avoid: ["甘いもので食事を済ませる", "食事を抜いてカフェインだけで押し切る"],
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
    avoid: ["甘いものとカフェインだけで無理に持ち上げる", "食事を抜いて刺激物で済ませる"],
  },
};

const FOOD_ITEMS = [
  // 主食
  { name: "ごはん", role: "staple", tags: ["support_spleen", "qi", "neutral", "easy", "fluids"], note: "食事の土台にしやすい" },
  { name: "玄米", role: "staple", tags: ["support_spleen", "fiber", "drain_damp"], anti: ["digestion_weak", "dry"], note: "重くなりすぎない主食に" },
  { name: "もち麦", role: "staple", tags: ["fiber", "drain_damp", "light"], anti: ["dry"], note: "湿気の日の主食に" },
  { name: "うどん", role: "staple", tags: ["support_spleen", "easy", "warm"], note: "温かい主食にしたい時に" },
  { name: "そば", role: "staple", tags: ["move_qi", "light", "cool"], anti: ["cold"], note: "さっぱりした主食に" },
  { name: "オートミール", role: "staple", tags: ["fiber", "support_spleen", "light"], note: "朝に取り入れやすい" },
  { name: "さつまいも", role: "staple", tags: ["qi", "support_spleen", "fiber", "neutral"], note: "やさしい甘みを足したい時に" },
  { name: "じゃがいも", role: "staple", tags: ["qi", "support_spleen", "neutral"], note: "食べごたえを軽めに足したい時に" },

  // 肉・卵
  { name: "鶏肉", role: "protein", tags: ["warm", "qi", "support_spleen", "protein"], note: "胃もたれしにくい主菜に" },
  { name: "豚肉", role: "protein", tags: ["moisten", "yin", "protein", "blood"], anti: ["damp"], note: "乾きや疲れが気になる時に" },
  { name: "牛肉", role: "protein", tags: ["qi", "blood", "protein", "support"], anti: ["heat"], note: "しっかり食べたい日の主菜に" },
  { name: "羊肉", role: "protein", tags: ["warm_hot", "kidney", "qi", "protein"], anti: ["heat", "pressure_up", "dry"], note: "冷える日の主菜に" },
  { name: "鴨肉", role: "protein", tags: ["moisten", "yin", "cool", "protein"], anti: ["cold"], note: "熱っぽい日に重くなりにくい主菜に" },
  { name: "卵", role: "protein", tags: ["blood", "yin", "support", "protein", "easy"], note: "一品足したい時に" },

  // 魚介
  { name: "鮭", role: "protein", tags: ["warm", "qi", "support_spleen", "protein"], note: "重くなりにくい魚の主菜に" },
  { name: "鯖", role: "protein", tags: ["move_blood", "protein", "oily_fish"], anti: ["digestion_weak"], note: "青魚を入れたい時に" },
  { name: "いわし", role: "protein", tags: ["move_blood", "qi", "protein", "oily_fish"], note: "疲れた日の魚の主菜に" },
  { name: "さんま", role: "protein", tags: ["move_blood", "protein", "oily_fish"], anti: ["heat"], note: "体のこわばりが気になる時に" },
  { name: "あじ", role: "protein", tags: ["qi", "protein", "light"], note: "軽めの魚の主菜に" },
  { name: "まぐろ", role: "protein", tags: ["blood", "qi", "protein"], anti: ["heat"], note: "しっかり魚を食べたい時に" },
  { name: "鱈", role: "protein", tags: ["qi", "protein", "light", "easy"], note: "胃が重い日の白身魚に" },
  { name: "鯛", role: "protein", tags: ["qi", "support_spleen", "protein", "easy"], note: "やさしい魚の主菜に" },
  { name: "しらす", role: "protein", tags: ["support", "protein", "easy", "topping"], note: "たんぱく質を少し足したい時に" },
  { name: "えび", role: "protein", tags: ["warm", "kidney", "protein"], anti: ["heat"], note: "しっかりめの魚介を入れたい時に" },
  { name: "あさり", role: "protein", tags: ["sea", "drain_damp", "clear_heat", "protein"], anti: ["cold"], note: "湿気や暑さが気になる時に" },
  { name: "牡蠣", role: "protein", tags: ["yin", "blood", "calm", "sea", "protein"], note: "疲れや落ち着かなさがある時に" },

  // 豆・大豆
  { name: "豆腐", role: "bean", tags: ["cool", "moisten", "clear_heat", "protein", "easy"], anti: ["cold"], note: "暑さや乾きが気になる時に" },
  { name: "納豆", role: "bean", tags: ["move_blood", "protein", "support_spleen"], anti: ["digestion_weak"], note: "発酵大豆を少し足したい時に" },
  { name: "味噌", role: "seasoning", tags: ["support_spleen", "warm", "fermented", "easy"], note: "汁物に使いやすい" },
  { name: "豆乳", role: "drink", tags: ["moisten", "yin", "protein", "cool"], anti: ["cold", "damp"], note: "乾きや疲れが気になる時の飲み物に" },
  { name: "小豆", role: "bean", mealGroup: "side", tags: ["drain_damp", "light", "sea"], note: "重だるさが気になる時に" },
  { name: "黒豆", role: "bean", mealGroup: "side", tags: ["kidney", "blood", "support", "neutral"], note: "香ばしく足したい時に" },
  { name: "緑豆", role: "bean", mealGroup: "side", tags: ["clear_heat", "drain_damp", "cool"], anti: ["cold"], note: "湿気と暑さの日に少し" },

  // 野菜
  { name: "にんじん", role: "vegetable", tags: ["blood", "support_spleen", "neutral"], note: "目まわりが疲れる日に" },
  { name: "玉ねぎ", role: "vegetable", tags: ["move_qi", "warm", "digest"], note: "食後の重さが気になる時に" },
  { name: "ねぎ", role: "seasoning", tags: ["warm", "move_qi", "surface"], note: "冷える日に少し足す" },
  { name: "にら", role: "vegetable", tags: ["warm", "kidney", "move_blood"], anti: ["heat"], note: "冷える日の副菜に" },
  { name: "生姜", role: "seasoning", tags: ["warm_hot", "digest", "support_spleen"], anti: ["heat", "dry"], note: "冷える日に少量" },
  { name: "大根", role: "vegetable", tags: ["digest", "light", "drain_damp", "cool"], anti: ["cold"], note: "食べすぎた日の副菜に" },
  { name: "かぼちゃ", role: "vegetable", tags: ["qi", "support_spleen", "warm", "sweet_mild"], note: "ほっとする副菜に" },
  { name: "キャベツ", role: "vegetable", tags: ["support_spleen", "digest", "neutral"], note: "胃にやさしい日常野菜に" },
  { name: "白菜", role: "vegetable", tags: ["moisten", "cool", "support_spleen", "light"], anti: ["cold"], note: "乾きや熱っぽさに" },
  { name: "レタス", role: "vegetable", tags: ["cool", "light", "calm"], anti: ["cold"], note: "暑さや緊張感がある時に" },
  { name: "もやし", role: "vegetable", tags: ["cool", "drain_damp", "light"], anti: ["cold"], note: "湿気と暑さの日に" },
  { name: "ほうれん草", role: "vegetable", tags: ["blood", "moisten", "yin"], note: "目や体の疲れが気になる時に" },
  { name: "小松菜", role: "vegetable", tags: ["blood", "clear_heat", "support"], note: "さっぱりめに野菜を足したい時に" },
  { name: "ピーマン", role: "vegetable", tags: ["move_qi", "light", "digest"], note: "食欲が重い時のアクセントに" },
  { name: "トマト", role: "vegetable", tags: ["clear_heat", "fluids", "cool"], anti: ["cold"], note: "暑さや乾きが気になる時に" },
  { name: "きゅうり", role: "vegetable", tags: ["clear_heat", "fluids", "drain_damp", "cooling_strong"], anti: ["cold", "digestion_weak"], note: "湿気と暑さの日に少し" },
  { name: "なす", role: "vegetable", tags: ["cool", "clear_heat", "move_blood"], anti: ["cold"], note: "暑さで体が重い時に" },
  { name: "れんこん", role: "vegetable", tags: ["moisten", "lung", "blood", "neutral"], note: "のどの乾きが気になる時に" },
  { name: "山芋", role: "vegetable", tags: ["qi", "yin", "support_spleen", "kidney"], note: "疲れと乾きが気になる時に" },
  { name: "ごぼう", role: "vegetable", tags: ["fiber", "move_qi", "drain_damp"], anti: ["digestion_weak"], note: "すっきり食べたい時に" },
  { name: "セロリ", role: "vegetable", tags: ["move_qi", "clear_heat", "calm", "cool"], anti: ["cold"], note: "さっぱりした香味野菜に" },
  { name: "ブロッコリー", role: "vegetable", tags: ["support", "qi", "neutral"], note: "日常の野菜として使いやすい" },
  { name: "しそ", role: "seasoning", tags: ["move_qi", "warm", "aromatic", "digest"], note: "香りで食べやすくしたい時に" },
  { name: "みょうが", role: "seasoning", tags: ["move_qi", "aromatic", "light"], note: "香りを少し足したい時に" },
  { name: "梅干し", role: "seasoning", tags: ["astringe", "fluids", "digest", "light"], note: "食欲が落ちる日に" },

  // きのこ・海藻
  { name: "しいたけ", role: "mushroom", tags: ["qi", "support_spleen", "drain_damp"], note: "汁物に入れやすいきのこに" },
  { name: "しめじ", role: "mushroom", tags: ["support_spleen", "drain_damp", "light"], note: "汁物や炒め物に足しやすい" },
  { name: "えのき", role: "mushroom", tags: ["light", "drain_damp", "support_spleen"], note: "重だるい日の汁物に" },
  { name: "まいたけ", role: "mushroom", tags: ["qi", "drain_damp", "support_spleen"], note: "湿気の日のきのこに" },
  { name: "なめこ", role: "mushroom", tags: ["moisten", "support_spleen", "light"], note: "汁物にとろみを足したい時に" },
  { name: "黒きくらげ", role: "mushroom", tags: ["blood", "move_blood", "moisten"], note: "きくらげを足したい時に" },
  { name: "わかめ", role: "seaweed", tags: ["sea", "drain_damp", "cool", "light"], anti: ["cold"], note: "軽めの海藻副菜に" },
  { name: "昆布", role: "seaweed", tags: ["sea", "drain_damp", "cool"], anti: ["cold"], note: "汁物の土台に" },
  { name: "ひじき", role: "seaweed", tags: ["sea", "blood", "drain_damp"], note: "海藻副菜を足したい時に" },
  { name: "のり", role: "seaweed", tags: ["sea", "light", "topping"], note: "主食に少し足しやすい" },

  // 果物
  { name: "りんご", role: "fruit", tags: ["fluids", "support_spleen", "neutral"], note: "乾きや胃の重さが気になる時に" },
  { name: "梨", role: "fruit", tags: ["moisten", "lung", "cool", "fluids"], anti: ["cold"], note: "のどの乾きが気になる時に" },
  { name: "みかん", role: "fruit", tags: ["move_qi", "fluids", "digest"], note: "香りで食べやすくしたい時に" },
  { name: "レモン", role: "fruit", tags: ["fluids", "astringe", "move_qi"], note: "暑さで食欲が落ちる時に" },
  { name: "キウイ", role: "fruit", tags: ["clear_heat", "fluids", "cool"], anti: ["cold"], note: "熱っぽさと乾きに" },
  { name: "バナナ", role: "fruit", tags: ["moisten", "cool", "fluids"], anti: ["cold", "damp"], note: "乾きや熱っぽさに" },
  { name: "ぶどう", role: "fruit", tags: ["qi", "blood", "fluids"], note: "疲れと乾きに" },
  { name: "桃", role: "fruit", tags: ["fluids", "warm", "blood"], note: "乾きが気になる日の果物に" },

  // 飲み物・ちょい足し
  { name: "白ごま", role: "seasoning", tags: ["moisten", "yin", "lung"], note: "乾く日のちょい足しに" },
  { name: "黒ごま", role: "seasoning", tags: ["blood", "kidney", "moisten"], note: "乾きが気になる日のちょい足しに" },
  { name: "くるみ", role: "seasoning", tags: ["warm", "kidney", "moisten"], anti: ["heat"], note: "冷えやすい日の少量使いに" },
  { name: "はちみつ", role: "seasoning", tags: ["moisten", "lung", "support_spleen", "sweet_mild"], anti: ["damp"], note: "のどが乾く日の少量使いに" },
  { name: "酢", role: "seasoning", tags: ["move_blood", "move_qi", "astringe"], anti: ["digestion_weak"], note: "さっぱりさせたい時に" },
  { name: "シナモン", role: "seasoning", tags: ["warm_hot", "kidney", "move_blood"], anti: ["heat", "pressure_up", "dry"], note: "冷える日に少量" },
  { name: "麦茶", role: "drink", tags: ["clear_heat", "fluids", "cool"], anti: ["cold"], note: "暑い日の飲み物に" },
  { name: "ほうじ茶", role: "drink", tags: ["warm", "light", "support_spleen"], note: "冷やしすぎない飲み物に" },
  { name: "黒豆茶", role: "drink", tags: ["kidney", "blood", "support", "neutral"], note: "香ばしい飲み物に" },
  { name: "はとむぎ茶", role: "drink", tags: ["drain_damp", "light", "cool"], anti: ["cold"], note: "湿気で重だるい時に" },
  { name: "小豆茶", role: "drink", tags: ["drain_damp", "light"], note: "重だるさが気になる日に" },
  { name: "とうもろこし茶", role: "drink", tags: ["drain_damp", "support_spleen", "light"], note: "湿気の日に飲みやすい" },
  { name: "ルイボスティー", role: "drink", tags: ["moisten", "calm", "fluids"], note: "乾きや夜の飲み物に" },
  { name: "生姜湯", role: "drink", tags: ["warm_hot", "digest", "support_spleen"], anti: ["heat", "dry"], note: "冷える日の飲み物に" },
  { name: "葛湯", role: "drink", tags: ["warm", "fluids", "support_spleen", "easy"], note: "冷える日やのどが気になる時に" },
];


// v7.35: 飲み物は食材とは別枠で扱う。
// 「コーヒー＝注意物」ではなく、食性・五味・カフェイン・時間帯・体質/天気との相性で
// ◎/○/△ を出し分ける。
const DRINK_ITEMS = [
  {
    name: "水",
    nature: "平",
    flavors: ["甘"],
    caffeine: false,
    tags: ["fluids", "neutral", "base", "light"],
    goodFor: ["heat", "dry", "default"],
    cautionFor: ["cold", "damp"],
    note: "常温なら、いちばんクセの少ない土台",
  },
  {
    name: "白湯",
    nature: "温",
    flavors: ["甘"],
    caffeine: false,
    tags: ["warm", "fluids", "support_spleen", "easy"],
    goodFor: ["cold", "dry", "digestion", "dizziness"],
    cautionFor: ["heat"],
    note: "冷えや胃腸の省エネ感がある日に",
  },
  {
    name: "麦茶",
    nature: "涼",
    flavors: ["甘"],
    caffeine: false,
    tags: ["clear_heat", "fluids", "cool", "light"],
    goodFor: ["heat", "dry", "pressure_up"],
    cautionFor: ["cold", "digestion_weak"],
    note: "熱をこもらせたくない日の定番",
  },
  {
    name: "ほうじ茶",
    nature: "温寄り",
    flavors: ["苦", "甘"],
    caffeine: true,
    caffeineLevel: "low",
    tags: ["warm", "light", "support_spleen", "aromatic"],
    goodFor: ["cold", "damp", "pressure_down", "digestion"],
    cautionFor: ["sleep"],
    note: "冷やしすぎず、胃腸を重くしにくい香ばしい一杯",
  },
  {
    name: "緑茶",
    nature: "涼",
    flavors: ["苦", "甘"],
    caffeine: true,
    caffeineLevel: "middle",
    tags: ["clear_heat", "cool", "light", "aromatic", "wake"],
    goodFor: ["heat", "damp", "pressure_up", "headache"],
    cautionFor: ["cold", "sleep", "digestion_weak", "dry"],
    note: "暑さ・湿気のぼんやりをすっきりさせたい時に",
  },
  {
    name: "コーヒー",
    nature: "温寄り",
    flavors: ["苦"],
    caffeine: true,
    caffeineLevel: "high",
    tags: ["move_qi", "wake", "drain_damp", "aromatic", "bitter_settle", "antioxidant", "polyphenol", "drying"],
    goodFor: ["damp", "pressure_down", "fatigue", "mood", "neck_shoulder", "pressure_up"],
    cautionFor: ["sleep", "dry", "heat", "dizziness", "digestion_weak"],
    note: "起動スイッチだけでなく、苦味で上がった感じを少し沈める一杯",
  },
  {
    name: "デカフェコーヒー",
    nature: "温寄り",
    flavors: ["苦"],
    caffeine: false,
    caffeineLevel: "none",
    tags: ["move_qi", "drain_damp", "aromatic", "bitter_settle", "antioxidant", "polyphenol", "low_stimulus"],
    goodFor: ["damp", "pressure_up", "mood", "sleep", "dry"],
    cautionFor: ["digestion_weak"],
    note: "苦味と香りは使いたいけれど、刺激は増やしたくない時に",
  },
  {
    name: "ルイボスティー",
    nature: "平",
    flavors: ["甘"],
    caffeine: false,
    tags: ["moisten", "calm", "fluids", "neutral", "antioxidant", "polyphenol"],
    goodFor: ["dry", "heat", "sleep", "mood", "pressure_up"],
    cautionFor: [],
    note: "乾きや夜の落ち着きに寄せたい時に",
  },
  {
    name: "はとむぎ茶",
    nature: "涼",
    flavors: ["甘", "淡"],
    caffeine: false,
    tags: ["drain_damp", "light", "cool"],
    goodFor: ["damp", "swelling", "heat"],
    cautionFor: ["cold", "dry"],
    note: "湿気・むくみの重さを軽く流したい時に",
  },
  {
    name: "とうもろこし茶",
    nature: "平",
    flavors: ["甘"],
    caffeine: false,
    tags: ["drain_damp", "support_spleen", "light", "neutral"],
    goodFor: ["damp", "swelling", "pressure_down", "digestion"],
    cautionFor: [],
    note: "湿気の日に、冷やしすぎず軽く流す候補",
  },
  {
    name: "小豆茶",
    nature: "平",
    flavors: ["甘", "淡"],
    caffeine: false,
    tags: ["drain_damp", "light", "neutral"],
    goodFor: ["damp", "swelling"],
    cautionFor: ["cold"],
    note: "水分の重さが気になる時の候補",
  },
  {
    name: "黒豆茶",
    nature: "平",
    flavors: ["甘"],
    caffeine: false,
    tags: ["kidney", "blood", "support", "neutral"],
    goodFor: ["cold", "low_back_pain", "fatigue", "dry"],
    cautionFor: [],
    note: "冷え・腰まわり・疲れを見ている時に",
  },
  {
    name: "生姜湯",
    nature: "熱",
    flavors: ["辛"],
    caffeine: false,
    tags: ["warm_hot", "digest", "support_spleen", "move_qi"],
    goodFor: ["cold", "digestion"],
    cautionFor: ["heat", "dry", "pressure_up", "sleep"],
    note: "冷えで胃腸が止まりそうな時に少量",
  },
  {
    name: "葛湯",
    nature: "温",
    flavors: ["甘"],
    caffeine: false,
    tags: ["warm", "fluids", "support_spleen", "easy"],
    goodFor: ["cold", "dry", "sleep", "digestion"],
    cautionFor: ["damp"],
    note: "冷えと乾き、夜の小腹にやさしく寄せる候補",
  },
];

const DRINK_TRIGGER_NEEDS = {
  damp: ["drain_damp", "support_spleen", "light"],
  cold: ["warm", "support_spleen", "easy"],
  heat: ["clear_heat", "fluids", "cool", "antioxidant"],
  dry: ["moisten", "fluids", "neutral"],
  pressure_down: ["wake", "light", "support_spleen", "drain_damp"],
  pressure_up: ["calm", "clear_heat", "light", "bitter_settle", "antioxidant"],
  default: ["fluids", "light", "neutral"],
};

const DRINK_SYMPTOM_NEEDS = {
  fatigue: ["wake", "qi", "support_spleen"],
  sleep: ["calm", "moisten", "caffeine_free"],
  digestion: ["support_spleen", "easy", "warm"],
  neck_shoulder: ["move_qi", "warm", "light"],
  low_back_pain: ["kidney", "warm", "support"],
  swelling: ["drain_damp", "light"],
  headache: ["clear_heat", "calm", "light", "bitter_settle"],
  dizziness: ["qi", "support_spleen", "fluids"],
  mood: ["move_qi", "calm", "support_spleen", "bitter_settle"],
};

const SUB_LABEL_CODES = {
  qi_stagnation: ["qi_stagnation", "気滞"],
  qi_deficiency: ["qi_deficiency", "気虚"],
  blood_deficiency: ["blood_deficiency", "血虚"],
  blood_stasis: ["blood_stasis", "瘀血", "お血"],
  fluid_damp: ["fluid_damp", "痰湿", "水滞"],
  fluid_deficiency: ["fluid_deficiency", "陰虚", "津液不足"],
};

function normalizeSubLabelValues(subLabels = []) {
  return uniq(subLabels.map((item) => {
    if (item && typeof item === "object") return item.code || item.key || item.value || item.label || "";
    return item;
  }).map((item) => String(item || "").trim()).filter(Boolean));
}

function getSubLabelFlags(subLabels = []) {
  const values = normalizeSubLabelValues(subLabels);
  const text = values.join(" ");
  const hasCode = (code) => (SUB_LABEL_CODES[code] || []).some((alias) => values.includes(alias) || text.includes(alias));
  return {
    values,
    text,
    qiStagnation: hasCode("qi_stagnation") || /気滞/.test(text),
    qiDeficiency: hasCode("qi_deficiency") || /気虚/.test(text),
    bloodDeficiency: hasCode("blood_deficiency") || /血虚/.test(text),
    bloodStasis: hasCode("blood_stasis") || /瘀血|お血/.test(text),
    fluidDamp: hasCode("fluid_damp") || /痰湿|水滞/.test(text),
    fluidDeficiency: hasCode("fluid_deficiency") || /陰虚|津液不足/.test(text),
    cold: /冷|寒/.test(text),
    heat: /熱|ほて|暑/.test(text),
  };
}

const DRINK_WEATHER_BODY = {
  damp: "飲み物は、体の重さを増やすか、軽く流すかに出やすい枠です。冷たい甘いものだけに寄せず、湿気をためにくい一杯を候補にします。",
  cold: "冷えの日は、飲み物で内側からこわばりを足さないことが大事です。温かい一杯をひとつ混ぜるだけでも、体の入口を守りやすくなります。",
  heat: "暑さの日は、刺激で押すより熱を逃がす一杯を選びたい日です。冷やしすぎず、こもった熱を軽くする候補を見ます。",
  dry: "のど・目・肌がカサつく日は、飲み物がそのまま“うるおいの補助輪”になります。カフェインだけでつなぐより、乾いた感じを置き去りにしない一杯を候補にします。",
  pressure_down: "低気圧の日は、ぼんやりを持ち上げたい気持ちが出やすい日。コーヒーも悪者ではなく、朝〜昼の少量なら、香りでめぐらせ苦味で少し沈める候補です。",
  pressure_up: "気圧上昇の日は、体が前のめりになりやすい日。苦味で少し沈める一杯は候補になりますが、カフェイン刺激は足しすぎないように見ます。",
  default: "飲み物は、食事より小さく調整できるケアです。今日の天気に合わせて、重さ・冷え・カサつき感を増やしにくい一杯を選びます。",
};

function drinkContextFlags({ triggerKey, secondaryKey, symptomFocus, subLabels = [], mode = "today" }) {
  const keys = [triggerKey, secondaryKey].filter(Boolean);
  const sub = getSubLabelFlags(subLabels);
  return {
    keys,
    symptomFocus,
    mode,
    hasCold: keys.includes("cold") || sub.cold,
    hasHeat: keys.includes("heat") || keys.includes("pressure_up") || sub.heat,
    hasDamp: keys.includes("damp") || keys.includes("pressure_down") || sub.fluidDamp,
    hasDry: keys.includes("dry") || sub.fluidDeficiency,
    qiStagnation: sub.qiStagnation || symptomFocus === "mood" || symptomFocus === "neck_shoulder",
    weakDigestion: sub.qiDeficiency || sub.fluidDamp || /脾|胃/.test(sub.text) || symptomFocus === "digestion",
  };
}

function drinkScore(drink, { triggerKey, secondaryKey, symptomFocus, subLabels = [], mode = "today" }) {
  const flags = drinkContextFlags({ triggerKey, secondaryKey, symptomFocus, subLabels, mode });
  const needs = uniq([
    ...(DRINK_TRIGGER_NEEDS[triggerKey] || DRINK_TRIGGER_NEEDS.default),
    ...(secondaryKey ? (DRINK_TRIGGER_NEEDS[secondaryKey] || []).slice(0, 2) : []),
    ...(DRINK_SYMPTOM_NEEDS[symptomFocus] || []),
  ]);

  let score = Number(drink.base || 1);
  const tags = drink.tags || [];

  needs.forEach((need) => {
    if (need === "caffeine_free" && !drink.caffeine) score += 3;
    if (tags.includes(need)) score += 3;
  });

  if ((drink.goodFor || []).includes(triggerKey)) score += 4;
  if (secondaryKey && (drink.goodFor || []).includes(secondaryKey)) score += 2;
  if (symptomFocus && (drink.goodFor || []).includes(symptomFocus)) score += 3;

  if (flags.hasCold && (tags.includes("cool") || tags.includes("clear_heat"))) score -= 3;
  if (flags.hasHeat && tags.includes("warm_hot")) score -= 3;
  if (flags.hasHeat && drink.name === "コーヒー") score -= 1; // 苦味の沈める面は残すが、刺激の分だけ少し控えめ
  if (flags.hasDry && tags.includes("drying")) score -= 4;
  if (flags.hasDamp && (drink.name === "葛湯" || drink.name === "豆乳")) score -= 2;
  if (flags.weakDigestion && (tags.includes("cool") || drink.name === "コーヒー")) score -= 2;

  if (drink.caffeine) {
    if (symptomFocus === "sleep" || mode === "tomorrow") score -= 3;
    if (symptomFocus === "dizziness") score -= 2;
  }

  // コーヒーは「起動スイッチ」だけではなく、苦味・香り・ポリフェノールで
  // 上にのぼった感じを少し沈める面も見る。ただしカフェイン刺激は別で減点する。
  if (drink.name === "コーヒー") {
    if (flags.hasDamp || triggerKey === "pressure_down" || flags.qiStagnation) score += 3;
    if (triggerKey === "pressure_up" || symptomFocus === "headache" || symptomFocus === "mood") score += 1;
    if (symptomFocus === "fatigue") score += 1;
    if (symptomFocus === "sleep" || flags.hasDry || flags.weakDigestion) score -= 5;
    if (flags.hasHeat) score -= 2;
  }

  if (drink.name === "デカフェコーヒー") {
    if (triggerKey === "pressure_up" || symptomFocus === "mood" || symptomFocus === "sleep") score += 3;
    if (flags.hasDamp || flags.qiStagnation) score += 2;
    if (flags.weakDigestion) score -= 2;
  }

  (drink.cautionFor || []).forEach((bad) => {
    if (bad === triggerKey || bad === secondaryKey || bad === symptomFocus) score -= 4;
    if (bad === "digestion_weak" && flags.weakDigestion) score -= 3;
  });

  return score;
}

function getDrinkMark(score, drink, context) {
  if (drink.name === "コーヒー") {
    const flags = drinkContextFlags(context);
    const hasPositiveContext = flags.hasDamp || context.triggerKey === "pressure_down" || context.triggerKey === "pressure_up" || flags.qiStagnation;
    if (hasPositiveContext && score >= 4 && context.symptomFocus !== "sleep") return "○";
    return "△";
  }
  if (drink.name === "デカフェコーヒー") {
    if (score >= 7) return "◎";
    if (score >= 3) return "○";
    return "△";
  }
  if (score >= 8) return "◎";
  if (score >= 4) return "○";
  return "△";
}

function getDrinkNoteByContext(drink, context, mark) {
  const { triggerKey, symptomFocus, mode } = context;
  if (drink.name === "コーヒー") {
    if (mark === "△") {
      if (symptomFocus === "sleep" || mode === "tomorrow") return "苦味は使える一方、夜は刺激が残りやすい。飲むなら朝〜昼に少量";
      if (triggerKey === "dry") return "苦味とポリフェノールは魅力。ただし、のど・目・肌がカサつく日は水や汁物とセットで少量";
      if (triggerKey === "heat" || triggerKey === "pressure_up") return "苦味で少し沈める面もあるが、刺激を足しすぎない量で";
      return "空腹で流し込まず、朝〜昼に少量";
    }
    if (triggerKey === "pressure_up") return "苦味で上がった感じを少し沈めつつ、香りでめぐらせる候補";
    return "朝〜昼に少量なら、重さを動かしつつ苦味で少し沈める候補";
  }
  if (drink.name === "デカフェコーヒー") {
    if (triggerKey === "pressure_up" || symptomFocus === "sleep") return "苦味と香りは使いながら、カフェイン刺激を増やしにくい候補";
    return "コーヒーの苦味・香りを使いたいけれど、刺激は控えたい時に";
  }
  if (drink.name === "緑茶") {
    if (mark === "△") return "冷え・胃弱・夜は控えめ。暑さや湿気のぼんやりに短く";
    return "暑さ・湿気のぼんやりをすっきりさせたい時に";
  }
  if (drink.name === "水") {
    if (triggerKey === "cold" || triggerKey === "damp") return "冷水より常温で。まず土台の水分として";
    return "常温ならクセの少ない土台";
  }
  return drink.note;
}

function isCoffeeFamily(drink) {
  return drink?.name === "コーヒー" || drink?.name === "デカフェコーヒー";
}

function buildDrinkRecommendations({ mode, triggerKey, secondaryKey, symptomFocus, subLabels = [] }) {
  const context = { mode, triggerKey, secondaryKey, symptomFocus, subLabels };
  const scored = DRINK_ITEMS
    .map((drink, index) => {
      const score = drinkScore(drink, context);
      return {
        ...drink,
        _index: index,
        _score: score,
        _mark: getDrinkMark(score, drink, context),
      };
    })
    .filter((drink) => drink._score > 0)
    .sort((a, b) => b._score - a._score || a._index - b._index);

  const selected = [];
  const names = new Set();
  let coffeeFamilyUsed = false;

  const push = (drink) => {
    if (!drink || names.has(drink.name)) return;
    if (selected.length >= 3) return;

    // v7.39: コーヒー贔屓に見えないよう、通常コーヒーとデカフェは同時に出さない。
    // 出す場合も、他の飲み物候補と同じスコア競争で勝った時だけ。
    if (isCoffeeFamily(drink)) {
      if (coffeeFamilyUsed) return;
      if (drink._score < 5 && drink._mark !== "○" && drink._mark !== "◎") return;
      coffeeFamilyUsed = true;
    }

    selected.push(drink);
    names.add(drink.name);
  };

  // まず◎/○を優先。コーヒー系もここで自然に勝った時だけ入る。
  scored.filter((d) => d._mark !== "△").forEach(push);

  // 3枠に足りない時だけ△も含める。ただしコーヒー系の条件つき差し込みはしない。
  scored.forEach(push);

  return selected.slice(0, 3).map((drink) => {
    const note = getDrinkNoteByContext(drink, context, drink._mark);
    return `${drink._mark} ${drink.name}：${note}`;
  });
}

function buildDrinkActionCard({ mode, triggerKey, secondaryKey, symptomFocus, subLabels = [] }) {
  const items = buildDrinkRecommendations({ mode, triggerKey, secondaryKey, symptomFocus, subLabels });
  if (!items.length) return null;
  const body = mode === "tomorrow"
    ? "明日の朝に迷わないよう、今夜のうちに飲み物を一つ候補にしておきます。コーヒーや緑茶も、合う/合わないを時間帯込みで見ます。"
    : (DRINK_WEATHER_BODY[triggerKey] || DRINK_WEATHER_BODY.default);

  return {
    key: "drink",
    label: mode === "tomorrow" ? "明日の飲み物候補" : "今日の飲み物候補",
    body,
    items,
  };
}

function formatDrinkLeadNames({ mode, triggerKey, secondaryKey, symptomFocus, subLabels = [] }) {
  return buildDrinkRecommendations({ mode, triggerKey, secondaryKey, symptomFocus, subLabels })
    .map((item) => item.replace(/^[◎○△]\s*/, "").split("：")[0])
    .slice(0, 2);
}

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
  if (exact) return normalizeFoodTriggerKey(exact);

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
  const primary = normalizeFoodTriggerKey(
    riskContext?.summary?.main_trigger_exact || riskContext?.summary?.personal_main_trigger_exact
  );
  const secondaryRaw =
    riskContext?.summary?.secondary_trigger_exact ||
    riskContext?.summary?.personal_secondary_trigger_exact ||
    null;
  const secondary = normalizeFoodTriggerKey(secondaryRaw);

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
    if (tags.includes(need)) score += 3;
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
  damp: "湿気の日は、胃腸が水を含んだスポンジみたいに重く感じやすい日です。冷たいもの・甘いもの・脂っこいものが続くと、胃腸の重さが気分やだるさまで引っぱりやすくなります。今日は、軽く流れる食べ方に寄せます。",
  cold: "冷え込みの日は、胃腸が省エネ運転になりやすい日です。冷たいものだけで済ませると、内側からこわばりや重さが残りやすくなります。今日は、温かいものを一つ足して、体の入口を守ります。",
  heat: "暑さの日は、体の熱を逃がしたいのに、刺激でさらに火を足しやすい日です。辛いもの・濃い味・脂っこいものが重なると、だるさやそわつきに回りやすくなります。今日は、熱をこもらせない食べ方に寄せます。",
  dry: "乾燥の日は、体の内側が少しカサつきやすい日です。乾いた菓子やコーヒーだけでつなぐと、のど・目・首肩の疲れに変わりやすくなります。今日は、汁気とうるおいを少し足します。",
  pressure_down: "低気圧の日は、頭や体だけでなく胃腸の動きもゆっくりになりやすい日です。揚げ物・甘いもの・食事抜きのカフェインだけで押し切ると、あとで重さが残りやすくなります。今日は、食後に動き出せる軽さを目安にします。",
  pressure_up: "気圧上昇の日は、体が前のめりになりやすい日です。辛いもの・カフェイン・濃い味でさらに押すと、頭や肩に力が集まりやすくなります。今日は、刺激で急かさず、軽くめぐる食べ方にします。",
  default: "体調が読みにくい日は、食べもので正解を狙いすぎるより、重くする組み合わせを減らすのが近道です。今日は、食後に動き出しやすい軽さを目安にします。",
};

const FOOD_VOICE_AVOID = {
  damp: ["甘いものとキンキンの飲み物だけで、今日を乗り切ろうとする", "脂っこいもので、体の重さにさらに荷物を積む", "パン・麺だけで済ませて、胃腸をさらにもたつかせる"],
  cold: ["冷たい飲み物で、内側からこわばりを足す", "生もの・サラダだけで済ませて、胃腸を冷やしっぱなしにする", "冷たい乳製品を続けて、お腹まわりを重くする"],
  heat: ["辛いものと濃い味で、体の熱にさらに火を足す", "お酒と脂っこいものを重ねて、熱と重さをこもらせる", "甘いドリンクで一瞬だけ元気を借りる"],
  dry: ["乾いたお菓子だけで、内側のカサつきを増やす", "空腹でコーヒーだけを流し込んで、のどと目の乾きを置き去りにする", "辛いもので乾きに刺激を足す"],
  pressure_down: ["食事を抜いてカフェインだけで、ぼんやりを押し切る", "揚げ物と甘いものばかりで、重さに追い打ちをかける", "お酒と脂っこいもので、頭と胃腸をさらに重くする"],
  pressure_up: ["辛いもののあとにコーヒーで、前のめりを加速させる", "濃い味を早食いして、胃腸を置き去りにする", "塩辛いものとお酒で、力みを長引かせる"],
  default: ["甘いものとカフェインだけで体を起こす", "食べすぎてすぐ座りっぱなしになる", "お酒と脂っこいものを重ねる"],
};

const FOOD_VOICE_SYMPTOM_REASONS = {
  fatigue: " だるさを見ている時は、“一瞬元気が出るもの”より、あとで重くならない食べ方を優先します。",
  sleep: " 睡眠を見ている時は、夜まで残るカフェイン・刺激・食後の重さも一緒に見ます。",
  digestion: " 胃腸を見ている時は、食材そのものより“冷たい・甘い・脂っこい”の重なりをほどくことが大事です。",
  neck_shoulder: " 首肩を見ている時は、内側の冷えや重さが肩まで荷物になることも見ています。",
  low_back_pain: " 腰を見ている時は、腰腹まわりを冷やしすぎない食べ方も一緒に見ます。",
  swelling: " むくみを見ている時は、冷たさ・甘さ・塩気の重ね着を減らすことも見ています。",
  headache: " 頭痛を見ている時は、首肩に力が集まりやすい刺激や重さも一緒に見ます。",
  dizziness: " めまいを見ている時は、食事抜きや冷たい飲み物だけで急に動く流れを避けます。",
  mood: " 気分を見ている時は、甘いものやカフェインで無理に持ち上げた後の落差も一緒に見ます。",
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
    if (triggerKey === "heat") return "今夜のうちに、麦茶・ルイボスティー・豆腐や軽い汁物など、明日の熱を足しにくい候補を決めておきます。";
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
  const key = normalizeFoodTriggerKey(triggerKey);
  const rawSecondary = secondaryKey ? normalizeFoodTriggerKey(secondaryKey) : null;
  const secondary = canUseSecondaryFoodTrigger(key, rawSecondary) ? rawSecondary : null;
  const labels = MODE_LABELS[normalizedMode];
  const pairKey = getFoodTriggerPairKey(key, secondary);
  const pairProfile = pairKey ? PAIR_FOOD_PROFILES[pairKey] : null;
  const triggerProfile = pairProfile || TRIGGER_PROFILES[key] || TRIGGER_PROFILES.default;
  const symptomProfile = SYMPTOM_PROFILES[symptomFocus] || null;
  const signalContext = getSignalFoodContext(signal, normalizedMode);
  const allSubLabels = uniq([
    ...subLabels,
    ...(riskContext?.constitution_context?.sub_labels || []),
    ...(riskContext?.care_tone?.sub_labels || []),
  ]);

  const selectedFoods = selectFoodItems({
    triggerKey: key,
    secondaryKey: secondary,
    symptomFocus,
    subLabels: allSubLabels,
  });
  const foodItems = normalizedMode === "tomorrow"
    ? formatTomorrowFoodItems({
        triggerKey: key,
        secondaryKey: secondary,
        selectedFoods,
        hasConstitutionAdjustment: allSubLabels.length > 0,
      })
    : formatFoodGroupItems(selectedFoods);
  const avoidItems = normalizedMode === "tomorrow"
    ? buildTomorrowAvoidItems({ triggerKey: key, secondaryKey: secondary, symptomFocus })
    : buildAvoidItems({ triggerKey: key, secondaryKey: secondary, symptomFocus });

  const title = `${labels.titlePrefix}${triggerProfile.title}`;
  const howTo = getActionBody({
    mode: normalizedMode,
    triggerProfile,
    symptomProfile,
  });
  const avoid = avoidItems.join(" / ");
  const reason = buildFoodReason({
    mode: normalizedMode,
    triggerKey: key,
    secondaryKey: secondary,
    triggerProfile,
    symptomFocus,
    subLabels: allSubLabels,
  });
  const lifestyleTip = buildLifestyleTip(normalizedMode, key);

  const drinkCard = buildDrinkActionCard({
    mode: normalizedMode,
    triggerKey: key,
    secondaryKey: secondary,
    symptomFocus,
    subLabels: allSubLabels,
  });

  const actionCards = [
    {
      key: "add",
      label: labels.how_to_label,
      body: howTo,
      items: foodItems,
    },
    drinkCard,
    {
      key: "caution",
      label: labels.avoid_label,
      body: normalizedMode === "tomorrow"
        ? "寝る前から明日の朝までに避けたいものです。候補を見る前に、まず“重くする組み合わせ”を外します。"
        : "合わない食べ方を減らす方が、食材を選ぶより大事な日もあります。",
      items: avoidItems,
    },
  ].filter(Boolean);

  const legacyContext = {
    ...labels,
    title,
    timing,
    recommendation: "",
    how_to: howTo,
    avoid,
    reason,
    lifestyle_tip: lifestyleTip,
    examples: [],
    add_items: foodItems,
    ingredient_suggestions: foodItems,
    caution_items: avoidItems,
    action_cards: actionCards,
    context_chips: buildContextChips({
      triggerKey: key,
      secondaryKey: secondary,
      signalContext,
      symptomFocus,
    }),
    symptom_focus: symptomFocus || null,
    trigger_key: key,
    secondary_trigger_key: secondary,
    intensity: signalContext.intensity,
    ingredient_count: FOOD_ITEMS.length,
    drink_count: DRINK_ITEMS.length,
    drink_model_version: "v7.39-drink-balance",
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
