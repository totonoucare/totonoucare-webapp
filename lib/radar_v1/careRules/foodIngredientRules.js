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

const MODE_LABELS = {
  today: {
    badge: "今日の食べ方",
    detail_title: "なぜこの食材？",
    how_to_label: "今日の食材ヒント",
    avoid_label: "避けたい食べ方",
    examples_label: "迷ったらこの組み合わせ",
    reason_label: "食材を選んだ理由",
    lifestyle_tip_label: "食後に一緒に",
    titlePrefix: "今日は",
    contextSignalLow: "シグナル低め",
    contextSignalMiddle: "シグナル中くらい",
    contextSignalHigh: "シグナル強め",
  },
  tomorrow: {
    badge: "明日の食べ方",
    detail_title: "なぜこの準備？",
    how_to_label: "明日の食材ヒント",
    avoid_label: "今夜〜明朝に避けたい食べ方",
    examples_label: "明日迷ったらこの組み合わせ",
    reason_label: "食材を選んだ理由",
    lifestyle_tip_label: "今夜一緒に",
    titlePrefix: "明日は",
    contextSignalLow: "影響少なめ",
    contextSignalMiddle: "少し響きやすい",
    contextSignalHigh: "強めに響きやすい",
  },
};

const SIGNAL_COPY = {
  today: {
    low: "大きく変えなくても、食材の選び方を少し合わせれば十分な日です。",
    middle: "午後〜夜に残りやすいので、食材の性質を少し寄せたい日です。",
    high: "今日は食べ方の影響が体感に出やすい日です。刺激や量より、合う食材を選びます。",
  },
  tomorrow: {
    low: "明日の天気の影響は少なめ。食材を少し合わせるくらいで大丈夫です。",
    middle: "明日は少し響きやすい見込み。今夜〜明日の食材を少し寄せておきます。",
    high: "明日は食べ方の影響が体感に出やすい見込み。刺激や量より、合う食材を選びます。",
  },
};

const TRIGGER_PROFILES = {
  damp: {
    label: "湿気",
    title: "湿気で重さを残しにくい食べ方",
    needs: ["drain_damp", "support_spleen", "light", "digest"],
    anti: ["cold", "greasy", "sweet_heavy", "dairy_heavy"],
    lead: "湿気が背景にある日は、胃腸まわりに重さを残しにくい食材を優先します。",
    avoid: ["冷たい飲み物と甘いものを重ねる", "脂っこいものを続ける", "パン・麺だけで済ませる"],
    reason: "湿が残りやすい日は、脾胃を重くしにくいもの・水はけを助けるものを選ぶと組み立てやすくなります。",
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
    title: "熱をこもらせにくい食べ方",
    needs: ["clear_heat", "fluids", "light", "cool"],
    anti: ["warm_hot", "spicy", "greasy", "alcohol_like"],
    lead: "暑さが背景にある日は、熱をこもらせにくく、軽く水分を支える食材を優先します。",
    avoid: ["辛いものと濃い味を重ねる", "お酒と脂っこいものを重ねる", "甘いドリンクで済ませる"],
    reason: "暑さが強い日は、刺激でさらに熱を足すより、軽さと潤いを作る食材が使いやすくなります。",
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
    anti: ["spicy", "warm_hot", "caffeine_like", "greasy"],
    lead: "気圧上昇が背景にある日は、張りつめや高ぶりを強めにくい食材を優先します。",
    avoid: ["辛味とカフェインを重ねる", "濃い味を早食いする", "お酒と塩気を重ねる"],
    reason: "気が上へ張りやすい日は、香りで軽く巡らせつつ、刺激を増やしすぎない選び方が合います。",
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
    needs: ["support_spleen", "digest", "light", "warm"],
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
  { name: "ごはん", role: "staple", tags: ["support_spleen", "qi", "neutral", "easy"], note: "胃腸を支える土台に" },
  { name: "玄米", role: "staple", tags: ["support_spleen", "fiber", "drain_damp"], anti: ["digestion_weak"], note: "重だるさの日の主食に" },
  { name: "もち麦", role: "staple", tags: ["fiber", "drain_damp", "light"], note: "湿気や重さが気になる時に" },
  { name: "うどん", role: "staple", tags: ["support_spleen", "easy", "warm"], note: "冷えや胃腸の重さに" },
  { name: "そば", role: "staple", tags: ["move_qi", "light", "cool"], anti: ["cold"], note: "重すぎない主食に" },
  { name: "オートミール", role: "staple", tags: ["fiber", "support_spleen", "light"], note: "朝に軽く足しやすい" },
  { name: "さつまいも", role: "staple", tags: ["qi", "support_spleen", "fiber", "neutral"], note: "胃腸を支える甘みとして" },
  { name: "じゃがいも", role: "staple", tags: ["qi", "support_spleen", "neutral"], note: "補いながら重すぎにくい" },

  // 肉・卵
  { name: "鶏肉", role: "protein", tags: ["warm", "qi", "support_spleen", "protein"], note: "冷えや疲れの日の主菜に" },
  { name: "豚肉", role: "protein", tags: ["moisten", "yin", "protein", "blood"], anti: ["damp"], note: "乾きや消耗が気になる時に" },
  { name: "牛肉", role: "protein", tags: ["qi", "blood", "protein", "support"], anti: ["heat"], note: "体力を戻したい日の主菜に" },
  { name: "羊肉", role: "protein", tags: ["warm_hot", "kidney", "qi", "protein"], anti: ["heat", "pressure_up"], note: "冷えが強い日の温めに" },
  { name: "鴨肉", role: "protein", tags: ["moisten", "yin", "cool", "protein"], anti: ["cold"], note: "熱っぽさと消耗がある時に" },
  { name: "卵", role: "protein", tags: ["blood", "yin", "support", "protein", "easy"], note: "疲れや乾きに足しやすい" },

  // 魚介
  { name: "鮭", role: "protein", tags: ["warm", "qi", "support_spleen", "protein"], note: "冷えや疲れの日の魚に" },
  { name: "鯖", role: "protein", tags: ["move_blood", "protein", "oily_fish"], anti: ["digestion_weak"], note: "巡りを意識した主菜に" },
  { name: "いわし", role: "protein", tags: ["move_blood", "qi", "protein", "oily_fish"], note: "疲れと巡りの両方に" },
  { name: "さんま", role: "protein", tags: ["move_blood", "protein", "oily_fish"], anti: ["heat"], note: "こわばりや巡りが気になる時に" },
  { name: "あじ", role: "protein", tags: ["qi", "protein", "light"], note: "重すぎない魚の主菜に" },
  { name: "まぐろ", role: "protein", tags: ["blood", "qi", "protein"], anti: ["heat"], note: "体力と血を補いたい時に" },
  { name: "鱈", role: "protein", tags: ["qi", "protein", "light", "easy"], note: "胃腸が重い日の白身魚に" },
  { name: "鯛", role: "protein", tags: ["qi", "support_spleen", "protein", "easy"], note: "回復食寄りの魚に" },
  { name: "しらす", role: "protein", tags: ["support", "protein", "easy", "topping"], note: "ちょい足しの主菜感に" },
  { name: "えび", role: "protein", tags: ["warm", "kidney", "protein"], anti: ["heat"], note: "冷えや足腰の弱さに" },
  { name: "あさり", role: "protein", tags: ["sea", "drain_damp", "clear_heat", "protein"], anti: ["cold"], note: "湿気や熱っぽさがある時に" },
  { name: "牡蠣", role: "protein", tags: ["yin", "blood", "calm", "sea", "protein"], note: "消耗や落ち着かなさに" },

  // 豆・大豆
  { name: "豆腐", role: "bean", tags: ["cool", "moisten", "clear_heat", "protein", "easy"], anti: ["cold"], note: "熱っぽさや乾きに" },
  { name: "納豆", role: "bean", tags: ["move_blood", "protein", "support_spleen"], anti: ["digestion_weak"], note: "巡りと補いを軽く足す" },
  { name: "味噌", role: "seasoning", tags: ["support_spleen", "warm", "fermented", "easy"], note: "汁物で胃腸を支える" },
  { name: "豆乳", role: "drink", tags: ["moisten", "yin", "protein", "cool"], anti: ["cold", "damp"], note: "乾きや消耗の飲み物に" },
  { name: "小豆", role: "bean", tags: ["drain_damp", "light", "sea"], note: "水はけを意識したい時に" },
  { name: "黒豆", role: "bean", tags: ["kidney", "blood", "support", "neutral"], note: "冷やしすぎず補う" },
  { name: "緑豆", role: "bean", tags: ["clear_heat", "drain_damp", "cool"], anti: ["cold"], note: "暑湿の日に軽く使う" },

  // 野菜
  { name: "にんじん", role: "vegetable", tags: ["blood", "support_spleen", "neutral"], note: "疲れや目まわりにも" },
  { name: "玉ねぎ", role: "vegetable", tags: ["move_qi", "warm", "digest"], note: "巡りと食後の重さに" },
  { name: "ねぎ", role: "seasoning", tags: ["warm", "move_qi", "surface"], note: "冷えやこわばりに少し足す" },
  { name: "にら", role: "vegetable", tags: ["warm", "kidney", "move_blood"], anti: ["heat"], note: "冷えと腰まわりに" },
  { name: "生姜", role: "seasoning", tags: ["warm_hot", "digest", "support_spleen"], anti: ["heat", "dry"], note: "冷えと胃の重さに少量" },
  { name: "大根", role: "vegetable", tags: ["digest", "light", "drain_damp", "cool"], anti: ["cold"], note: "食べすぎや胃の重さに" },
  { name: "かぼちゃ", role: "vegetable", tags: ["qi", "support_spleen", "warm", "sweet_mild"], note: "疲れと胃腸の支えに" },
  { name: "キャベツ", role: "vegetable", tags: ["support_spleen", "digest", "neutral"], note: "胃腸を整える日常野菜に" },
  { name: "白菜", role: "vegetable", tags: ["moisten", "cool", "support_spleen", "light"], anti: ["cold"], note: "乾きや熱っぽさに" },
  { name: "レタス", role: "vegetable", tags: ["cool", "light", "calm"], anti: ["cold"], note: "熱っぽさや張りつめに" },
  { name: "もやし", role: "vegetable", tags: ["cool", "drain_damp", "light"], anti: ["cold"], note: "湿気と暑さの日に" },
  { name: "ほうれん草", role: "vegetable", tags: ["blood", "moisten", "yin"], note: "乾きや疲れ、目まわりに" },
  { name: "小松菜", role: "vegetable", tags: ["blood", "clear_heat", "support"], note: "熱っぽさと補いの間に" },
  { name: "ピーマン", role: "vegetable", tags: ["move_qi", "light", "digest"], note: "気分や食欲の詰まりに" },
  { name: "トマト", role: "vegetable", tags: ["clear_heat", "fluids", "cool"], anti: ["cold"], note: "暑さと乾きに" },
  { name: "きゅうり", role: "vegetable", tags: ["clear_heat", "fluids", "drain_damp", "cooling_strong"], anti: ["cold", "digestion_weak"], note: "暑湿の日に少量" },
  { name: "なす", role: "vegetable", tags: ["cool", "clear_heat", "move_blood"], anti: ["cold"], note: "暑さやこわばりに" },
  { name: "れんこん", role: "vegetable", tags: ["moisten", "lung", "blood", "neutral"], note: "乾きとのどまわりに" },
  { name: "山芋", role: "vegetable", tags: ["qi", "yin", "support_spleen", "kidney"], note: "疲れと乾きの両方に" },
  { name: "ごぼう", role: "vegetable", tags: ["fiber", "move_qi", "drain_damp"], anti: ["digestion_weak"], note: "重だるさや詰まりに" },
  { name: "セロリ", role: "vegetable", tags: ["move_qi", "clear_heat", "calm", "cool"], anti: ["cold"], note: "張りつめや熱っぽさに" },
  { name: "ブロッコリー", role: "vegetable", tags: ["support", "qi", "neutral"], note: "日常の補い野菜に" },
  { name: "しそ", role: "seasoning", tags: ["move_qi", "warm", "aromatic", "digest"], note: "気分や胃の重さに" },
  { name: "みょうが", role: "seasoning", tags: ["move_qi", "aromatic", "light"], note: "気分の詰まりに少量" },
  { name: "梅干し", role: "seasoning", tags: ["astringe", "fluids", "digest", "light"], note: "暑さや食欲が落ちる日に" },

  // きのこ・海藻
  { name: "しいたけ", role: "mushroom", tags: ["qi", "support_spleen", "drain_damp"], note: "胃腸を支えるきのこに" },
  { name: "しめじ", role: "mushroom", tags: ["support_spleen", "drain_damp", "light"], note: "汁物や炒め物に足しやすい" },
  { name: "えのき", role: "mushroom", tags: ["light", "drain_damp", "support_spleen"], note: "重だるい日の汁物に" },
  { name: "まいたけ", role: "mushroom", tags: ["qi", "drain_damp", "support_spleen"], note: "湿気と疲れの両方に" },
  { name: "なめこ", role: "mushroom", tags: ["moisten", "support_spleen", "light"], note: "乾きと胃腸に" },
  { name: "黒きくらげ", role: "mushroom", tags: ["blood", "move_blood", "moisten"], note: "血と巡りの食材に" },
  { name: "わかめ", role: "seaweed", tags: ["sea", "drain_damp", "cool", "light"], anti: ["cold"], note: "水はけと軽さに" },
  { name: "昆布", role: "seaweed", tags: ["sea", "drain_damp", "cool"], anti: ["cold"], note: "汁物の土台に" },
  { name: "ひじき", role: "seaweed", tags: ["sea", "blood", "drain_damp"], note: "血と水はけの副菜に" },
  { name: "のり", role: "seaweed", tags: ["sea", "light", "topping"], note: "主食に少し足しやすい" },

  // 果物
  { name: "りんご", role: "fruit", tags: ["fluids", "support_spleen", "neutral"], note: "乾きや胃腸の支えに" },
  { name: "梨", role: "fruit", tags: ["moisten", "lung", "cool", "fluids"], anti: ["cold"], note: "乾燥とのどまわりに" },
  { name: "みかん", role: "fruit", tags: ["move_qi", "fluids", "digest"], note: "気分や胃の重さに" },
  { name: "レモン", role: "fruit", tags: ["fluids", "astringe", "move_qi"], note: "暑さや食欲の落ちに" },
  { name: "キウイ", role: "fruit", tags: ["clear_heat", "fluids", "cool"], anti: ["cold"], note: "熱っぽさと乾きに" },
  { name: "バナナ", role: "fruit", tags: ["moisten", "cool", "fluids"], anti: ["cold", "damp"], note: "乾きや熱っぽさに" },
  { name: "ぶどう", role: "fruit", tags: ["qi", "blood", "fluids"], note: "疲れと乾きに" },
  { name: "桃", role: "fruit", tags: ["fluids", "warm", "blood"], note: "冷やしすぎず潤す" },

  // 飲み物・ちょい足し
  { name: "白ごま", role: "seasoning", tags: ["moisten", "yin", "lung"], note: "乾きの日のちょい足しに" },
  { name: "黒ごま", role: "seasoning", tags: ["blood", "kidney", "moisten"], note: "疲れや乾きのちょい足しに" },
  { name: "くるみ", role: "seasoning", tags: ["warm", "kidney", "moisten"], anti: ["heat"], note: "冷えと乾きに少量" },
  { name: "はちみつ", role: "seasoning", tags: ["moisten", "lung", "support_spleen", "sweet_mild"], anti: ["damp"], note: "のどや乾きに少量" },
  { name: "酢", role: "seasoning", tags: ["move_blood", "move_qi", "astringe"], anti: ["digestion_weak"], note: "巡りとさっぱり感に" },
  { name: "シナモン", role: "seasoning", tags: ["warm_hot", "kidney", "move_blood"], anti: ["heat", "dry"], note: "冷えが強い日に少量" },
  { name: "麦茶", role: "drink", tags: ["clear_heat", "fluids", "cool"], anti: ["cold"], note: "暑さの日の飲み物に" },
  { name: "ほうじ茶", role: "drink", tags: ["warm", "light", "support_spleen"], note: "冷やしすぎない飲み物に" },
  { name: "黒豆茶", role: "drink", tags: ["kidney", "blood", "support", "neutral"], note: "補いながら重くしすぎない" },
  { name: "はとむぎ茶", role: "drink", tags: ["drain_damp", "light", "cool"], anti: ["cold"], note: "湿気や重だるさに" },
  { name: "小豆茶", role: "drink", tags: ["drain_damp", "light"], note: "水はけを意識したい日に" },
  { name: "とうもろこし茶", role: "drink", tags: ["drain_damp", "support_spleen", "light"], note: "湿気の日に飲みやすい" },
  { name: "ルイボスティー", role: "drink", tags: ["moisten", "calm", "fluids"], note: "乾きや夜の飲み物に" },
  { name: "生姜湯", role: "drink", tags: ["warm_hot", "digest", "support_spleen"], anti: ["heat", "dry"], note: "冷えと胃の重さに" },
  { name: "葛湯", role: "drink", tags: ["warm", "fluids", "support_spleen", "easy"], note: "冷えやのどまわりに" },
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

  if (!secondary || secondary === "default" || secondary === primary) return null;
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
  const trigger = TRIGGER_PROFILES[triggerKey] || TRIGGER_PROFILES.default;
  const secondary = secondaryKey ? TRIGGER_PROFILES[secondaryKey] : null;
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
      ...(trigger.needs || []),
      ...(secondary?.needs || []).slice(0, 2),
      ...(symptom?.needs || []),
      ...subNeeds,
    ]),
    anti: uniq([
      ...(trigger.anti || []),
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

  anti.forEach((bad) => {
    if (tags.includes(bad) || antiTags.includes(bad) || antiTags.includes(triggerKey) || antiTags.includes(symptomFocus)) {
      score -= 4;
    }
  });

  if (tags.includes("easy")) score += 1;
  if (tags.includes("light") && ["damp", "heat", "pressure_down", "pressure_up"].includes(triggerKey)) score += 1;
  if (tags.includes("warm") && triggerKey === "cold") score += 2;
  if (tags.includes("moisten") && triggerKey === "dry") score += 2;
  if (tags.includes("drain_damp") && triggerKey === "damp") score += 2;
  if (tags.includes("clear_heat") && triggerKey === "heat") score += 2;

  return score;
}

function selectFoodItems({ triggerKey, secondaryKey, symptomFocus, subLabels }) {
  const needSet = buildNeeds({ triggerKey, secondaryKey, symptomFocus, subLabels });
  const scored = FOOD_ITEMS
    .map((food, index) => ({ ...food, _index: index, _score: foodScore(food, { ...needSet, triggerKey, symptomFocus }) }))
    .filter((food) => food._score > 1)
    .sort((a, b) => b._score - a._score || a._index - b._index);

  const roleLimits = {
    protein: 2,
    bean: 1,
    vegetable: 3,
    mushroom: 1,
    seaweed: 1,
    staple: 1,
    drink: 1,
    fruit: 1,
    seasoning: 2,
  };

  const selected = [];
  const counts = {};

  for (const food of scored) {
    const role = food.role || "other";
    const limit = roleLimits[role] || 1;
    if ((counts[role] || 0) >= limit) continue;
    selected.push(food);
    counts[role] = (counts[role] || 0) + 1;
    if (selected.length >= 8) break;
  }

  if (selected.length < 6) {
    for (const food of scored) {
      if (selected.some((item) => item.name === food.name)) continue;
      selected.push(food);
      if (selected.length >= 8) break;
    }
  }

  return selected;
}

function formatFoodItem(food) {
  const role = ROLE_LABELS[food.role] || "食材";
  return `${role}：${food.name}（${food.note}）`;
}

function getByRoles(foods, roles) {
  return foods.find((food) => roles.includes(food.role));
}

function buildMenuItems(foods, triggerKey, symptomFocus, mode) {
  const protein = getByRoles(foods, ["protein", "bean"]) || FOOD_ITEMS.find((food) => food.name === "卵");
  const vegetable = getByRoles(foods, ["vegetable", "mushroom"]) || FOOD_ITEMS.find((food) => food.name === "大根");
  const seasoning = getByRoles(foods, ["seasoning"]) || FOOD_ITEMS.find((food) => food.name === "味噌");
  const drink = getByRoles(foods, ["drink"]) || FOOD_ITEMS.find((food) => food.name === "ほうじ茶");
  const sea = getByRoles(foods, ["seaweed"]);

  const staple =
    triggerKey === "cold" ? "ごはん" :
    symptomFocus === "digestion" ? "ごはん" :
    triggerKey === "heat" ? "おにぎり" :
    "ごはん";

  const soupBase = seasoning?.name === "味噌" ? "味噌汁" : "汁物";
  const vegName = vegetable?.name || "野菜";
  const proteinName = protein?.name || "卵";
  const seaName = sea?.name;

  const first = `${proteinName} + ${vegName}の${soupBase} + ${staple}`;
  const second = seaName
    ? `${proteinName} + ${seaName}の小鉢 + ${staple}`
    : `${proteinName} + ${vegName}の小鉢 + ${staple}`;
  const third = `${drink?.name || "温かいお茶"} + ${proteinName}を少し`;

  if (mode === "tomorrow") {
    return [`明日の朝：${first}`, `明日の昼：${second}`, `飲み物なら：${third}`];
  }

  return [`食事なら：${first}`, `外食なら：${second}`, `飲み物なら：${third}`];
}

function buildAvoidItems({ triggerKey, symptomFocus }) {
  const trigger = TRIGGER_PROFILES[triggerKey] || TRIGGER_PROFILES.default;
  const symptom = SYMPTOM_PROFILES[symptomFocus] || null;
  return uniq([...(symptom?.avoid || []), ...(trigger.avoid || [])]).slice(0, 4);
}

function getActionBody({ mode, triggerProfile, symptomProfile, selectedFoods }) {
  const names = selectedFoods.slice(0, 3).map((food) => food.name).join("・");
  const symptomPart = symptomProfile ? `${symptomProfile.label}の出方も見ながら、` : "";
  if (mode === "tomorrow") {
    return `${symptomPart}明日は${triggerProfile.label}に合わせて、${names}あたりを軸に選びます。`;
  }
  return `${symptomPart}今日は${triggerProfile.label}に合わせて、${names}あたりを軸に選びます。`;
}

function buildContextChips({ triggerKey, secondaryKey, signalContext, symptomFocus }) {
  return [
    TRIGGER_LABELS[triggerKey] || TRIGGER_LABELS.default,
    secondaryKey ? `${TRIGGER_LABELS[secondaryKey] || TRIGGER_LABELS.default}も背景` : null,
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
  const secondary = secondaryKey ? normalizeFoodTriggerKey(secondaryKey) : null;
  const labels = MODE_LABELS[normalizedMode];
  const triggerProfile = TRIGGER_PROFILES[key] || TRIGGER_PROFILES.default;
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
  const foodItems = selectedFoods.slice(0, 5).map(formatFoodItem);
  const avoidItems = buildAvoidItems({ triggerKey: key, symptomFocus });
  const menuItems = buildMenuItems(selectedFoods, key, symptomFocus, normalizedMode);

  const title = `${labels.titlePrefix}${triggerProfile.title}`;
  const howTo = getActionBody({
    mode: normalizedMode,
    triggerProfile,
    symptomProfile,
    selectedFoods,
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
    {
      key: "choice",
      label: labels.examples_label,
      body: "買い物・外食・家の食事のどれでも、近い組み合わせに置き換えて使えます。",
      items: menuItems,
    },
  ];

  return {
    ...labels,
    title,
    timing,
    recommendation: `${signalContext.lead} ${triggerProfile.lead}`,
    how_to: howTo,
    avoid,
    reason,
    lifestyle_tip: lifestyleTip,
    examples: menuItems,
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
