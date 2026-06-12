// lib/radar_v1/careRules/foodIngredientRules.js

export const TRIGGER_LABELS = {
  damp: "湿気",
  cold: "冷え込み",
  heat: "暑さ",
  dry: "乾燥",
  pressure_down: "低気圧",
  pressure_up: "気圧上昇",
  default: "天気変化",
};

const ALLOWED_SECONDARY_FOOD_TRIGGER_PAIR_KEYS = new Set([
  // 暑湿・湿熱寄り
  "damp+heat",
  // 寒湿寄り
  "cold+damp",
  // 燥熱・傷津寄り
  "dry+heat",
  // 寒燥寄り
  "cold+dry",
  // 低気圧 + 湿の重だるさ
  "damp+pressure_down",
  // 気圧上昇 + 暑さの上衝・高ぶり
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
    detail_title: "なぜこの食材？",
    how_to_label: "今日の食材ヒント",
    avoid_label: "避けたい食べ方",
    reason_label: "食材を選んだ理由",
    lifestyle_tip_label: "食後に一緒に",
    titlePrefix: "今日は",
    contextSignalLow: "安定",
    contextSignalMiddle: "いたわり",
    contextSignalHigh: "守り",
  },
  tomorrow: {
    badge: "明日の食べ方",
    detail_title: "なぜこの準備？",
    how_to_label: "明日の食材ヒント",
    avoid_label: "今夜〜明朝に避けたい食べ方",
    reason_label: "食材を選んだ理由",
    lifestyle_tip_label: "今夜一緒に",
    titlePrefix: "明日は",
    contextSignalLow: "安定",
    contextSignalMiddle: "いたわり",
    contextSignalHigh: "守り",
  },
};

const SIGNAL_COPY = {
  today: {
    low: "大きく変えなくても、食材の選び方を少し合わせれば十分な日です。",
    middle: "午後〜夜に残りやすいので、食材の性質を少し寄せたい日です。",
    high: "今日は食べ方の影響が体感に出やすい日です。刺激や量より、合う食材を選びます。",
  },
  tomorrow: {
    low: "明日は安定寄り。食材は大きく変えすぎなくて大丈夫です。",
    middle: "明日はいたわり寄りの見込み。今夜〜明日の食材を少し寄せておきます。",
    high: "明日は守り寄りの見込み。刺激や量より、合う食材を選びます。",
  },
};

const TRIGGER_PROFILES = {
  damp: {
    label: "湿気",
    title: "湿気で胃腸に残りにくい食べ方",
    needs: ["drain_damp", "support_spleen", "light", "digest"],
    anti: ["cold", "greasy", "sweet_heavy", "dairy_heavy"],
    lead: "湿気が強い日は、冷たさ・甘さ・脂っこさを重ねず、胃に残りにくい食材を優先します。",
    avoid: ["冷たい飲み物と甘いものを重ねる", "脂っこいものを続ける", "パン・麺だけで済ませる"],
    reason: "湿気の日は、冷たいもの・甘いもの・脂っこいものが重なると胃に残りやすくなります。大根、きのこ、海藻のような食材を入れると組み立てやすくなります。",
  },
  cold: {
    label: "冷え込み",
    title: "内側を冷やしすぎない食べ方",
    needs: ["warm", "support_spleen", "qi", "kidney"],
    anti: ["cold", "raw", "cooling_strong"],
    lead: "冷え込みが背景にある日は、温める性質と胃腸を支える食材を優先します。",
    avoid: ["冷たい飲み物だけで流し込む", "生もの・サラダだけで済ませる", "冷たい乳製品を続ける"],
    reason: "寒はめぐりを固めやすいので、温める食材や火を通したものを少し入れる方が合います。",
  },
  heat: {
    label: "気温上昇",
    title: "暑さで熱を足しすぎない食べ方",
    needs: ["clear_heat", "fluids", "light", "cool"],
    anti: ["warm", "warm_hot", "spicy", "greasy", "alcohol_like"],
    lead: "暑さが強い日は、辛味・濃い味・脂っこさでさらに熱を足しすぎない食材を優先します。",
    avoid: ["辛いものと濃い味を重ねる", "お酒と脂っこいものを重ねる", "甘いドリンクで済ませる"],
    reason: "暑さが強い日は、辛味・濃い味・脂っこさでさらに熱を足しやすくなります。豆腐、白身魚、トマトのような、食後に重くなりにくい食材を選びます。",
  },
  dry: {
    label: "乾燥",
    title: "乾きを残しにくい食べ方",
    needs: ["moisten", "fluids", "lung", "yin"],
    anti: ["drying", "spicy", "caffeine_like"],
    lead: "乾燥が背景にある日は、のど・目・肌の乾きを助ける食材を優先します。",
    avoid: ["乾いた菓子だけで済ませる", "コーヒーだけで空腹をつなぐ", "辛いものを重ねる"],
    reason: "燥は津液を減らしやすいので、潤す食材や汁気のある食べ方が合います。",
  },
  pressure_down: {
    label: "低気圧",
    title: "重だるさを持ち越しにくい食べ方",
    needs: ["qi", "support_spleen", "drain_damp", "light"],
    anti: ["greasy", "alcohol_like", "sweet_heavy"],
    lead: "低気圧が背景にある日は、気を落としすぎず、重だるさを残しにくい食材を優先します。",
    avoid: ["食事を抜いてカフェインだけで動く", "揚げ物と甘いものを重ねる", "お酒と脂っこいものを重ねる"],
    reason: "気が沈みやすい日は、脾胃を支えつつ重くしすぎない食材が使いやすくなります。",
  },
  pressure_up: {
    label: "気圧上昇",
    title: "張りつめを強めにくい食べ方",
    needs: ["move_qi", "calm", "clear_heat", "light"],
    anti: ["warm", "spicy", "warm_hot", "caffeine_like", "greasy"],
    lead: "気圧上昇が背景にある日は、張りつめや高ぶりを強めにくい食材を優先します。",
    avoid: ["辛味とカフェインを重ねる", "濃い味を早食いする", "お酒と塩気を重ねる"],
    reason: "気が上へ張りやすい日は、香味野菜で食べやすくしつつ、辛味・カフェイン・濃い味を増やしすぎない選び方が合います。",
  },
  default: {
    label: "天気変化",
    title: "負担を増やしにくい食べ方",
    needs: ["support_spleen", "light", "qi"],
    anti: ["greasy", "sweet_heavy"],
    lead: "今日は大きく攻めるより、胃腸を重くしすぎない食材を優先します。",
    avoid: ["甘いものとカフェインだけで済ませる", "食べすぎてすぐ座りっぱなしになる", "お酒と脂っこいものを重ねる"],
    reason: "体感が読みにくい日は、まず脾胃を支える食材に寄せると崩れにくくなります。",
  },
};

const PAIR_FOOD_PROFILES = {
  "damp+heat": {
    label: "暑湿",
    title: "湿気と暑さを重ねにくい食べ方",
    needs: ["clear_heat", "drain_damp", "digest", "support_spleen", "light"],
    anti: ["warm_hot", "spicy", "greasy", "sweet_heavy", "cold"],
    lead: "湿気と暑さが重なる日は、水分をただ足すより、熱と湿気を増やしにくい食材を優先します。",
    avoid: ["冷たい甘い飲み物を続ける", "辛いものと脂っこいものを重ねる", "濃い味で食欲を無理に出す"],
    reason: "暑さだけなら潤いも見ますが、湿気もある日は水分を足しすぎるより、胃に残りにくい食材を選ぶ方が合います。白身魚、豆腐、大根、きのこ、海藻などを使いやすくします。",
  },
  "cold+damp": {
    label: "寒湿",
    title: "冷えと湿気を残しにくい食べ方",
    needs: ["warm", "drain_damp", "support_spleen", "digest"],
    anti: ["cold", "raw", "sweet_heavy", "greasy"],
    lead: "冷えと湿気が重なる日は、冷たいものを避け、温かく食べやすいものを優先します。",
    avoid: ["冷たい飲み物を食事中に続ける", "甘いものと乳製品を重ねる", "生ものだけで済ませる"],
    reason: "冷えと湿気が重なる日は、冷たさで胃腸を止めず、温かい主食・汁物・きのこ類を使う方が組み立てやすくなります。",
  },
  "dry+heat": {
    label: "燥熱",
    title: "暑さと乾きを残しにくい食べ方",
    needs: ["clear_heat", "moisten", "fluids", "yin", "light"],
    anti: ["warm_hot", "spicy", "drying", "alcohol_like"],
    lead: "暑さと乾きが重なる日は、辛味や濃い味で熱を足しすぎず、汁気のある食材を優先します。",
    avoid: ["辛いものを重ねる", "乾いた菓子だけで済ませる", "コーヒーだけで空腹をつなぐ"],
    reason: "暑さと乾きが重なる日は、熱を冷ましながら、のどや口の乾きに合う食材を選びます。豆腐、トマト、梨、白ごまなどを使いやすくします。",
  },
  "cold+dry": {
    label: "寒燥",
    title: "冷えと乾きを残しにくい食べ方",
    needs: ["warm", "moisten", "support_spleen", "yin"],
    anti: ["cold", "raw", "spicy", "drying"],
    lead: "冷えと乾きが重なる日は、冷たいものを避けながら、汁気や潤いのある食材を優先します。",
    avoid: ["冷たい飲み物で済ませる", "乾いた菓子だけで済ませる", "辛いものを重ねる"],
    reason: "冷えと乾きが同時にある日は、温かく食べながら乾きを残しにくい組み立てにします。温かい汁物、卵、れんこん、白ごまなどを使いやすくします。",
  },
  "damp+pressure_down": {
    label: "湿重",
    title: "低気圧と湿気で胃に残しにくい食べ方",
    needs: ["qi", "support_spleen", "drain_damp", "digest", "light"],
    anti: ["greasy", "sweet_heavy", "cold", "alcohol_like"],
    lead: "低気圧と湿気が重なる日は、食後に眠くなりすぎない組み立てを優先します。",
    avoid: ["揚げ物と甘いものを重ねる", "冷たい飲み物を一気に飲む", "お酒と脂っこいものを重ねる"],
    reason: "低気圧と湿気が重なる日は、甘さ・脂っこさ・冷たさが残りやすくなります。白身魚、大根、きのこ、海藻などを使いやすくします。",
  },
  "heat+pressure_up": {
    label: "上衝",
    title: "暑さと高ぶりを増やしにくい食べ方",
    needs: ["clear_heat", "move_qi", "calm", "light", "digest"],
    anti: ["warm", "warm_hot", "spicy", "caffeine_like", "greasy"],
    lead: "暑さと気圧上昇が重なる日は、辛味・カフェイン・濃い味で高ぶりを増やしすぎない食材を優先します。",
    avoid: ["辛味とカフェインを重ねる", "濃い味を早食いする", "お酒と塩気を重ねる"],
    reason: "暑さと気圧上昇が重なる日は、上へ張る感じが出やすいので、香味野菜で食べやすくしつつ、刺激を増やしすぎない組み立てにします。",
  },
};

const SYMPTOM_PROFILES = {
  fatigue: {
    label: "だるさ",
    needs: ["qi", "support_spleen", "protein", "light"],
    anti: ["sweet_heavy", "greasy"],
    avoid: ["甘いもので食事を済ませる", "食事を抜いてカフェインだけで動く"],
  },
  sleep: {
    label: "睡眠",
    needs: ["calm", "yin", "moisten", "light"],
    anti: ["caffeine_like", "spicy", "greasy"],
    avoid: ["夜にカフェインを入れる", "寝る直前に濃い味・脂っこさを重ねる"],
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
    avoid: ["塩気と甘い飲み物を重ねる", "冷たい飲み物を一気に飲む"],
  },
  headache: {
    label: "頭痛",
    needs: ["move_qi", "clear_heat", "light", "calm"],
    anti: ["alcohol_like", "caffeine_like", "greasy"],
    avoid: ["お酒と脂っこいものを重ねる", "空腹のままカフェインを入れる"],
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
    avoid: ["甘いものとカフェインだけで持ち上げる", "食事を抜いて刺激物で済ませる"],
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

  const subLabelText = subLabels.join(" ");
  const subNeeds = [];
  const subAnti = [];

  if (/冷|寒/.test(subLabelText)) subNeeds.push("warm", "support_spleen");
  if (/熱|ほて|暑/.test(subLabelText)) subNeeds.push("clear_heat", "fluids");
  if (/湿|水|痰|むく/.test(subLabelText)) subNeeds.push("drain_damp", "support_spleen");
  if (/乾|燥|陰/.test(subLabelText)) subNeeds.push("moisten", "yin");
  if (/気虚|疲|虚/.test(subLabelText)) subNeeds.push("qi", "support_spleen");
  if (/血/.test(subLabelText)) subNeeds.push("blood", "moisten");
  if (/気滞|巡|肝/.test(subLabelText)) subNeeds.push("move_qi", "calm");

  if (subNeeds.includes("warm")) subAnti.push("cold", "raw");
  if (subNeeds.includes("clear_heat")) subAnti.push("warm_hot", "spicy");
  if (subNeeds.includes("drain_damp")) subAnti.push("sweet_heavy", "dairy_heavy", "greasy");

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

  // 乾燥が主背景の時は、水はけ食材に寄りすぎない。
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

function getActionBody({ mode, triggerProfile, symptomProfile }) {
  const symptomPart = symptomProfile ? `${symptomProfile.label}の出方も見ながら、` : "";
  if (mode === "tomorrow") {
    return `${symptomPart}明日は${triggerProfile.label}に合わせて、主食・主菜・副菜を少し選び分けます。`;
  }
  return `${symptomPart}今日は${triggerProfile.label}に合わせて、主食・主菜・副菜を少し選び分けます。`;
}

function buildAvoidItems({ triggerKey, secondaryKey, symptomFocus }) {
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

function buildLifestyleTip(mode, triggerKey) {
  if (mode === "tomorrow") {
    if (triggerKey === "cold") return "今夜は冷たい飲み物で締めず、明朝に温かいものを入れやすい形にしておきます。";
    if (triggerKey === "damp") return "今夜は食べすぎたまま座りっぱなしにせず、数分だけ立つか歩く時間を作ります。";
    if (triggerKey === "heat") return "今夜は辛味・濃い味を重ねすぎず、明日に熱っぽさを持ち越しにくくします。";
    if (triggerKey === "dry") return "今夜は乾いた間食だけで済ませず、汁気か飲み物を一つ入れておきます。";
    return "今夜の食べ方を少し軽くして、明日の始まりを重くしない形にします。";
  }

  if (triggerKey === "cold") return "食後は首元・足首・腰腹まわりを冷やしたままにしないようにします。";
  if (triggerKey === "damp") return "食後すぐ座りっぱなしにせず、2〜3分だけ歩くと重さを残しにくくなります。";
  if (triggerKey === "heat") return "食後すぐに動き切らず、汗や熱が少し引く時間を作ると楽です。";
  if (triggerKey === "dry") return "乾いた間食だけで終えず、汁気や飲み物を一緒に入れます。";
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
  const foodItems = formatFoodGroupItems(selectedFoods);
  const avoidItems = buildAvoidItems({ triggerKey: key, secondaryKey: secondary, symptomFocus });

  const title = `${labels.titlePrefix}${triggerProfile.title}`;
  const howTo = getActionBody({
    mode: normalizedMode,
    triggerProfile,
    symptomProfile,
  });
  const avoid = avoidItems.join(" / ");
  const reason = `${triggerProfile.reason}${symptomProfile ? ` ${symptomProfile.label}が気になる時は、${symptomProfile.needs.includes("move_qi") ? "気の巡り" : symptomProfile.needs.includes("blood") ? "血や消耗" : symptomProfile.needs.includes("drain_damp") ? "水はけ" : "胃腸の受け止めやすさ"}も一緒に見ます。` : ""}`;
  const lifestyleTip = buildLifestyleTip(normalizedMode, key);

  const actionCards = [
    {
      key: "add",
      label: labels.how_to_label,
      body: howTo,
      items: foodItems,
    },
    {
      key: "caution",
      label: labels.avoid_label,
      body: "合わない食べ方を減らす方が、食材を足すより効く日もあります。",
      items: avoidItems,
    },
  ];

  return {
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
  };
}

export const FOOD_INGREDIENT_COUNT = FOOD_ITEMS.length;
