// Existing v67 inventory, enriched by ingredient. No nutrient-to-TCM inference.
// Theory fields are an expert-review draft, not clinical effect estimates.
export const FOOD_TCM_VERSION = "food_tcm_v68_rebuilt_2026-09-20";
const LEGACY_FOOD_ITEMS = [
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
const FOOD_THEORY = {
  "ごはん": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾",
      "補気",
      "生津"
    ],
    "channels": [
      "脾",
      "胃"
    ],
    "examples": [
      "ごはん",
      "少量のごはんを汁物に添える"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "玄米": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾",
      "補気"
    ],
    "channels": [
      "脾",
      "胃"
    ],
    "examples": [
      "やわらかく炊いた玄米",
      "玄米入りのおかゆ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "もち麦": {
    "nature": "涼",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾"
    ],
    "channels": [],
    "examples": [
      "もち麦入りごはん",
      "やわらかく煮たもち麦のスープ"
    ],
    "review": "variable",
    "note": "大麦系の整理。もち性・精麦・加工差を要確認。"
  },
  "うどん": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気"
    ],
    "channels": [],
    "examples": [
      "やわらかいうどん",
      "卵を添えたうどん"
    ],
    "review": "variable",
    "note": "小麦の加工食品。小麦・浮小麦の薬用作用や提供温度を流用しない。"
  },
  "そば": {
    "nature": "涼",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾",
      "消食"
    ],
    "channels": [
      "脾",
      "胃"
    ],
    "examples": [
      "そば",
      "温かいつゆのそば"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      9,
      10,
      11
    ]
  },
  "オートミール": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾",
      "補気"
    ],
    "channels": [],
    "examples": [
      "オートミールがゆ",
      "やわらかく煮たオートミール"
    ],
    "review": "variable",
    "note": "現代食材の分類には資料差。健脾・補気は暫定的整理。"
  },
  "さつまいも": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾",
      "補気",
      "潤腸"
    ],
    "channels": [
      "脾",
      "胃",
      "大腸"
    ],
    "examples": [
      "蒸したさつまいも",
      "さつまいもの煮物"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      9,
      10,
      11,
      12
    ]
  },
  "じゃがいも": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾",
      "補気",
      "和胃"
    ],
    "channels": [
      "脾",
      "胃"
    ],
    "examples": [
      "じゃがいもの煮物",
      "じゃがいものスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "鶏肉": {
    "nature": "温",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気",
      "温中"
    ],
    "channels": [
      "脾",
      "胃"
    ],
    "examples": [
      "鶏肉の蒸し物",
      "鶏肉のスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "豚肉": {
    "nature": "平",
    "flavors": [
      "甘",
      "鹹"
    ],
    "functions": [
      "滋陰",
      "潤燥",
      "養血"
    ],
    "channels": [
      "脾",
      "胃",
      "腎"
    ],
    "examples": [
      "豚肉のしゃぶしゃぶ",
      "豚肉の蒸し物"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "牛肉": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気",
      "養血",
      "健脾"
    ],
    "channels": [],
    "examples": [
      "牛肉の煮物",
      "牛肉と野菜のスープ"
    ],
    "review": "variable",
    "note": "平性を基本に採用。温性とする資料もあるため寒熱加点には使わない。"
  },
  "羊肉": {
    "nature": "温",
    "flavors": [
      "甘"
    ],
    "functions": [
      "温中",
      "補気",
      "補腎"
    ],
    "channels": [
      "脾",
      "腎"
    ],
    "examples": [
      "羊肉の煮込み",
      "羊肉のスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "鴨肉": {
    "nature": "涼",
    "flavors": [
      "甘",
      "鹹"
    ],
    "functions": [
      "滋陰",
      "養胃"
    ],
    "channels": [
      "肺",
      "胃",
      "腎"
    ],
    "examples": [
      "鴨肉のスープ",
      "鴨肉の煮物"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "卵": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "養血",
      "滋陰",
      "安神"
    ],
    "channels": [
      "心",
      "脾",
      "腎"
    ],
    "examples": [
      "卵の茶碗蒸し",
      "卵スープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "鮭": {
    "nature": "温",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気",
      "温中"
    ],
    "channels": [],
    "examples": [
      "鮭の蒸し焼き",
      "鮭の汁物"
    ],
    "review": "variable",
    "note": "魚種の地域差・資料差を専門家確認。",
    "season": [
      9,
      10,
      11
    ]
  },
  "鯖": {
    "nature": "温",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気",
      "健脾"
    ],
    "channels": [],
    "examples": [
      "鯖の煮物",
      "鯖の焼き物"
    ],
    "review": "variable",
    "note": "青魚の脂肪酸から活血へ類推しない。"
  },
  "いわし": {
    "nature": "温",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気",
      "養血"
    ],
    "channels": [],
    "examples": [
      "いわしの煮物",
      "いわしのつみれ汁"
    ],
    "review": "variable",
    "note": "魚種に関する現代食養生の整理。"
  },
  "さんま": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気"
    ],
    "channels": [],
    "examples": [
      "さんまの焼き物",
      "さんまの煮物"
    ],
    "review": "variable",
    "note": "地域食材。資料差を確認。脂肪酸から活血へ類推しない。",
    "season": [
      9,
      10,
      11
    ]
  },
  "あじ": {
    "nature": "温",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気",
      "健脾"
    ],
    "channels": [],
    "examples": [
      "あじの焼き物",
      "あじのつみれ汁"
    ],
    "review": "variable",
    "note": "地域食材。資料差を確認。",
    "season": [
      5,
      6,
      7
    ]
  },
  "まぐろ": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気",
      "養血"
    ],
    "channels": [],
    "examples": [
      "まぐろの加熱した切り身",
      "まぐろの煮物"
    ],
    "review": "variable",
    "note": "魚種・部位・資料差を確認。"
  },
  "鱈": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気"
    ],
    "channels": [],
    "examples": [
      "鱈の蒸し物",
      "鱈のスープ"
    ],
    "review": "variable",
    "note": "魚種の地域差・資料差を確認。",
    "season": [
      12,
      1,
      2
    ]
  },
  "鯛": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気",
      "健脾"
    ],
    "channels": [],
    "examples": [
      "鯛の蒸し物",
      "鯛の汁物"
    ],
    "review": "variable",
    "note": "日本のマダイ想定。台湾の鯛魚等とは区別する。"
  },
  "しらす": {
    "nature": "平",
    "flavors": [
      "甘",
      "鹹"
    ],
    "functions": [],
    "channels": [],
    "examples": [
      "しらすをごはんに添える",
      "しらす入りの卵焼き"
    ],
    "review": "limited",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "えび": {
    "nature": "温",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補腎"
    ],
    "channels": [
      "腎"
    ],
    "examples": [
      "えびの蒸し物",
      "えびのスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "あさり": {
    "nature": "寒",
    "flavors": [
      "甘",
      "鹹"
    ],
    "functions": [
      "滋陰",
      "清熱"
    ],
    "channels": [
      "肝",
      "腎"
    ],
    "examples": [
      "あさりの汁物",
      "あさりの蒸し煮"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "牡蠣": {
    "nature": "平",
    "flavors": [
      "甘",
      "鹹"
    ],
    "functions": [
      "滋陰",
      "養血"
    ],
    "channels": [
      "肝",
      "腎"
    ],
    "examples": [
      "牡蠣を十分加熱した鍋",
      "牡蠣を十分加熱したスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      11,
      12,
      1,
      2,
      3
    ]
  },
  "豆腐": {
    "nature": "涼",
    "flavors": [
      "甘"
    ],
    "functions": [
      "清熱",
      "生津",
      "和胃"
    ],
    "channels": [
      "脾",
      "胃",
      "大腸"
    ],
    "examples": [
      "豆腐のスープ",
      "豆腐の蒸し物"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "納豆": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [],
    "channels": [],
    "examples": [
      "納豆を少量添える",
      "納豆をごはんに添える"
    ],
    "review": "limited",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "味噌": {
    "nature": "温",
    "flavors": [
      "甘",
      "鹹"
    ],
    "functions": [],
    "channels": [],
    "examples": [
      "薄味の味噌汁",
      "味噌を少量使った煮物"
    ],
    "review": "limited",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "小豆": {
    "nature": "平",
    "flavors": [
      "甘",
      "酸"
    ],
    "functions": [
      "利水",
      "健脾"
    ],
    "channels": [],
    "examples": [
      "甘くしない小豆の煮豆",
      "小豆入りごはん"
    ],
    "review": "variable",
    "note": "日本の食用小豆。赤小豆の薬用量・効能をそのまま適用しない。"
  },
  "黒豆": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補腎",
      "養血",
      "利水"
    ],
    "channels": [
      "脾",
      "腎"
    ],
    "examples": [
      "甘さ控えめの黒豆",
      "黒豆入りごはん"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "緑豆": {
    "nature": "寒",
    "flavors": [
      "甘"
    ],
    "functions": [
      "清熱",
      "利水"
    ],
    "channels": [
      "心",
      "胃"
    ],
    "examples": [
      "緑豆のスープ",
      "緑豆の煮豆"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "にんじん": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾",
      "消食"
    ],
    "channels": [
      "肺",
      "脾"
    ],
    "examples": [
      "にんじんの蒸し煮",
      "にんじんのスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "玉ねぎ": {
    "nature": "温",
    "flavors": [
      "甘",
      "辛"
    ],
    "functions": [
      "理気",
      "和胃"
    ],
    "channels": [
      "肺",
      "胃"
    ],
    "examples": [
      "玉ねぎのスープ",
      "玉ねぎの蒸し焼き"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "ねぎ": {
    "nature": "温",
    "flavors": [
      "辛"
    ],
    "functions": [
      "散寒"
    ],
    "channels": [],
    "examples": [
      "ねぎを汁物に少量添える",
      "ねぎの蒸し煮"
    ],
    "review": "variable",
    "note": "食用のねぎ。葱白に由来する作用を参考に少量の薬味として扱う。"
  },
  "にら": {
    "nature": "温",
    "flavors": [
      "辛"
    ],
    "functions": [
      "温中",
      "理気"
    ],
    "channels": [
      "肝",
      "胃",
      "腎"
    ],
    "examples": [
      "にらの卵とじ",
      "にらのスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "生姜": {
    "nature": "温",
    "flavors": [
      "辛"
    ],
    "functions": [
      "散寒",
      "和胃"
    ],
    "channels": [],
    "examples": [
      "生姜を汁物に少量添える",
      "生姜を少量使った煮物"
    ],
    "review": "variable",
    "note": "生の生姜を料理に使う想定。乾姜の熱性とは区別する。"
  },
  "大根": {
    "nature": "涼",
    "flavors": [
      "甘",
      "辛"
    ],
    "functions": [
      "消食",
      "理気",
      "生津"
    ],
    "channels": [
      "肺",
      "胃"
    ],
    "examples": [
      "大根の煮物",
      "大根のスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "かぼちゃ": {
    "nature": "温",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気",
      "健脾"
    ],
    "channels": [
      "脾",
      "胃"
    ],
    "examples": [
      "かぼちゃの煮物",
      "かぼちゃの蒸し物"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      7,
      8,
      9,
      10,
      11,
      12
    ]
  },
  "キャベツ": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾",
      "和胃"
    ],
    "channels": [
      "脾",
      "胃"
    ],
    "examples": [
      "キャベツの蒸し煮",
      "キャベツのスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "白菜": {
    "nature": "涼",
    "flavors": [
      "甘"
    ],
    "functions": [
      "清熱",
      "生津"
    ],
    "channels": [
      "胃",
      "大腸"
    ],
    "examples": [
      "白菜の煮物",
      "白菜のスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      11,
      12,
      1,
      2
    ]
  },
  "レタス": {
    "nature": "涼",
    "flavors": [
      "甘",
      "苦"
    ],
    "functions": [
      "清熱",
      "利水"
    ],
    "channels": [
      "胃",
      "小腸"
    ],
    "examples": [
      "レタスのスープ",
      "レタスを軽く炒める"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "もやし": {
    "nature": "涼",
    "flavors": [
      "甘"
    ],
    "functions": [
      "清熱",
      "利水"
    ],
    "channels": [],
    "examples": [
      "もやしの蒸し物",
      "もやしのスープ"
    ],
    "review": "variable",
    "note": "一般の緑豆もやし想定。大豆もやしとは分けて考える。"
  },
  "ほうれん草": {
    "nature": "涼",
    "flavors": [
      "甘"
    ],
    "functions": [
      "養血",
      "潤燥",
      "潤腸"
    ],
    "channels": [
      "肝",
      "胃",
      "大腸"
    ],
    "examples": [
      "ほうれん草のおひたし",
      "ほうれん草のスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      11,
      12,
      1,
      2
    ]
  },
  "小松菜": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [],
    "channels": [],
    "examples": [
      "小松菜の煮びたし",
      "小松菜のスープ"
    ],
    "review": "limited",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "ピーマン": {
    "nature": "平",
    "flavors": [
      "甘",
      "辛"
    ],
    "functions": [
      "理気",
      "和胃"
    ],
    "channels": [],
    "examples": [
      "ピーマンの蒸し焼き",
      "ピーマンを軽く炒める"
    ],
    "review": "variable",
    "note": "辛くない甘味種。唐辛子の辛熱を流用しない。"
  },
  "トマト": {
    "nature": "涼",
    "flavors": [
      "甘",
      "酸"
    ],
    "functions": [
      "生津",
      "清熱",
      "健脾"
    ],
    "channels": [
      "肝",
      "胃"
    ],
    "examples": [
      "トマトを添える",
      "トマトのスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      6,
      7,
      8,
      9
    ]
  },
  "きゅうり": {
    "nature": "涼",
    "flavors": [
      "甘"
    ],
    "functions": [
      "清熱",
      "生津",
      "利水"
    ],
    "channels": [
      "脾",
      "胃",
      "大腸"
    ],
    "examples": [
      "きゅうりを少量添える",
      "きゅうりの和え物"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      6,
      7,
      8,
      9
    ]
  },
  "なす": {
    "nature": "涼",
    "flavors": [
      "甘"
    ],
    "functions": [
      "清熱",
      "活血"
    ],
    "channels": [
      "脾",
      "胃",
      "大腸"
    ],
    "examples": [
      "なすの蒸し物",
      "なすの煮物"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      6,
      7,
      8,
      9,
      10
    ]
  },
  "れんこん": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾",
      "養血"
    ],
    "channels": [],
    "examples": [
      "れんこんの煮物",
      "れんこんのスープ"
    ],
    "review": "variable",
    "note": "加熱したものを採用。生の清熱・涼血の説明を加熱品に共用しない。"
  },
  "山芋": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "健脾",
      "補気",
      "滋陰",
      "補腎"
    ],
    "channels": [
      "肺",
      "脾",
      "腎"
    ],
    "examples": [
      "山芋の蒸し物",
      "山芋のスープ"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "ごぼう": {
    "nature": "涼",
    "flavors": [
      "甘",
      "苦"
    ],
    "functions": [
      "潤腸"
    ],
    "channels": [],
    "examples": [
      "ごぼうをやわらかく煮る",
      "ごぼうの汁物"
    ],
    "review": "variable",
    "note": "食用の根。牛蒡子の疏風・清熱を流用しない。"
  },
  "セロリ": {
    "nature": "涼",
    "flavors": [
      "甘",
      "苦"
    ],
    "functions": [
      "清熱",
      "平肝"
    ],
    "channels": [
      "肝",
      "胃"
    ],
    "examples": [
      "セロリのスープ",
      "セロリを軽く炒める"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "ブロッコリー": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [],
    "channels": [],
    "examples": [
      "ブロッコリーの蒸し物",
      "ブロッコリーのスープ"
    ],
    "review": "limited",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "しそ": {
    "nature": "温",
    "flavors": [
      "辛"
    ],
    "functions": [
      "理気",
      "散寒"
    ],
    "channels": [
      "肺",
      "脾"
    ],
    "examples": [
      "しそを薬味に少量添える",
      "しそを和え物に添える"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "みょうが": {
    "nature": "温",
    "flavors": [
      "辛"
    ],
    "functions": [
      "理気"
    ],
    "channels": [],
    "examples": [
      "みょうがを薬味に少量添える",
      "みょうがを汁物に添える"
    ],
    "review": "variable",
    "note": "日本の食養生での香味野菜としての整理。細かな帰経は暫定。",
    "season": [
      6,
      7,
      8,
      9
    ]
  },
  "梅干し": {
    "nature": "平",
    "flavors": [
      "酸",
      "鹹"
    ],
    "functions": [
      "生津"
    ],
    "channels": [],
    "examples": [
      "梅干しを少量添える",
      "梅干しをおかゆに少量添える"
    ],
    "review": "variable",
    "note": "塩漬け食品。烏梅の薬用作用とは分ける。塩分に配慮。"
  },
  "しいたけ": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補気",
      "健脾"
    ],
    "channels": [
      "脾",
      "胃"
    ],
    "examples": [
      "しいたけの煮物",
      "しいたけの蒸し焼き"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "しめじ": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [],
    "channels": [],
    "examples": [
      "しめじのスープ",
      "しめじの蒸し煮"
    ],
    "review": "limited",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "えのき": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [],
    "channels": [],
    "examples": [
      "えのきのスープ",
      "えのきの蒸し煮"
    ],
    "review": "limited",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "まいたけ": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [],
    "channels": [],
    "examples": [
      "まいたけのスープ",
      "まいたけの蒸し焼き"
    ],
    "review": "limited",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "なめこ": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [],
    "channels": [],
    "examples": [
      "なめこの汁物",
      "なめこの煮物"
    ],
    "review": "limited",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "黒きくらげ": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "養血",
      "潤腸"
    ],
    "channels": [],
    "examples": [
      "戻した黒きくらげの炒め物",
      "戻した黒きくらげのスープ"
    ],
    "review": "variable",
    "note": "食用子実体。薬理的な抗凝固効果へ言い換えない。"
  },
  "わかめ": {
    "nature": "涼",
    "flavors": [
      "甘",
      "鹹"
    ],
    "functions": [
      "利水",
      "清熱"
    ],
    "channels": [
      "肝",
      "胃",
      "腎"
    ],
    "examples": [
      "わかめの汁物",
      "わかめを少量添える"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "昆布": {
    "nature": "寒",
    "flavors": [
      "鹹"
    ],
    "functions": [
      "利水",
      "清熱"
    ],
    "channels": [],
    "examples": [
      "昆布を少量使った煮物",
      "昆布だしの汁物"
    ],
    "review": "variable",
    "note": "少量の食用・だし。多量摂取を勧めない。だしと固形の摂取は同一としない。"
  },
  "ひじき": {
    "nature": "涼",
    "flavors": [
      "甘",
      "鹹"
    ],
    "functions": [
      "利水"
    ],
    "channels": [
      "肝",
      "腎"
    ],
    "examples": [
      "ひじきの煮物",
      "ひじきを少量添える"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "のり": {
    "nature": "涼",
    "flavors": [
      "甘",
      "鹹"
    ],
    "functions": [
      "清熱"
    ],
    "channels": [
      "肺",
      "腎"
    ],
    "examples": [
      "のりをごはんに添える",
      "のりを汁物に添える"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "りんご": {
    "nature": "平",
    "flavors": [
      "甘",
      "酸"
    ],
    "functions": [
      "生津",
      "健脾"
    ],
    "channels": [],
    "examples": [
      "りんごを少量添える",
      "りんごの煮物"
    ],
    "review": "variable",
    "note": "平〜涼の資料差。寒熱加点には使わない。",
    "season": [
      9,
      10,
      11,
      12
    ]
  },
  "梨": {
    "nature": "涼",
    "flavors": [
      "甘",
      "微酸"
    ],
    "functions": [
      "生津",
      "潤肺"
    ],
    "channels": [
      "肺",
      "胃"
    ],
    "examples": [
      "梨を少量添える",
      "梨の煮物"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      8,
      9,
      10
    ]
  },
  "みかん": {
    "nature": "涼",
    "flavors": [
      "甘",
      "酸"
    ],
    "functions": [
      "生津",
      "和胃"
    ],
    "channels": [],
    "examples": [
      "みかんを少量添える",
      "みかんを食後に少量"
    ],
    "review": "variable",
    "note": "果肉を対象にする。陳皮の燥湿・理気をそのまま移さない。",
    "season": [
      10,
      11,
      12,
      1
    ]
  },
  "レモン": {
    "nature": "涼",
    "flavors": [
      "酸"
    ],
    "functions": [
      "生津",
      "和胃"
    ],
    "channels": [
      "肺",
      "胃"
    ],
    "examples": [
      "レモンを料理に少量添える",
      "レモンを魚料理に添える"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "キウイ": {
    "nature": "寒",
    "flavors": [
      "甘",
      "酸"
    ],
    "functions": [
      "清熱",
      "生津"
    ],
    "channels": [
      "胃"
    ],
    "examples": [
      "キウイを少量添える",
      "キウイを食後に少量"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "バナナ": {
    "nature": "寒",
    "flavors": [
      "甘"
    ],
    "functions": [
      "潤腸",
      "清熱"
    ],
    "channels": [
      "肺",
      "大腸"
    ],
    "examples": [
      "バナナを少量添える",
      "バナナを朝食に少量添える"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "ぶどう": {
    "nature": "平",
    "flavors": [
      "甘",
      "酸"
    ],
    "functions": [
      "補気",
      "養血",
      "生津"
    ],
    "channels": [
      "肺",
      "脾",
      "腎"
    ],
    "examples": [
      "ぶどうを少量添える",
      "ぶどうを食後に少量"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      8,
      9,
      10
    ]
  },
  "桃": {
    "nature": "温",
    "flavors": [
      "甘",
      "酸"
    ],
    "functions": [
      "生津",
      "潤腸"
    ],
    "channels": [
      "肺",
      "大腸"
    ],
    "examples": [
      "桃を少量添える",
      "桃を食後に少量"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。",
    "season": [
      6,
      7,
      8
    ]
  },
  "白ごま": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "潤燥",
      "潤腸"
    ],
    "channels": [
      "肺",
      "脾",
      "大腸"
    ],
    "examples": [
      "白ごまを少量添える",
      "白ごまを和え物に使う"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "黒ごま": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補腎",
      "養血",
      "潤腸"
    ],
    "channels": [
      "肝",
      "腎",
      "大腸"
    ],
    "examples": [
      "黒ごまを少量添える",
      "すった黒ごまをおかゆに添える"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "くるみ": {
    "nature": "温",
    "flavors": [
      "甘"
    ],
    "functions": [
      "補腎",
      "潤腸"
    ],
    "channels": [
      "肺",
      "腎",
      "大腸"
    ],
    "examples": [
      "くるみを少量添える",
      "砕いたくるみをおかずに添える"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "はちみつ": {
    "nature": "平",
    "flavors": [
      "甘"
    ],
    "functions": [
      "潤肺",
      "潤腸",
      "補気"
    ],
    "channels": [
      "肺",
      "脾",
      "大腸"
    ],
    "examples": [
      "はちみつを少量添える",
      "はちみつを少量使う"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "酢": {
    "nature": "温",
    "flavors": [
      "酸",
      "苦"
    ],
    "functions": [
      "消食"
    ],
    "channels": [
      "肝",
      "胃"
    ],
    "examples": [
      "酢を少量使った和え物",
      "酢を料理に少量添える"
    ],
    "review": "common_synthesis",
    "note": "中医学の一般的な食養生知識を整理。専門家確認前。"
  },
  "シナモン": {
    "nature": "温",
    "flavors": [
      "辛",
      "甘"
    ],
    "functions": [
      "温中"
    ],
    "channels": [],
    "examples": [
      "シナモンを料理にごく少量添える",
      "シナモンを煮りんごに少量添える"
    ],
    "review": "variable",
    "note": "市販の食用香辛料。肉桂と桂枝、品種・用量の差があり補腎陽の強い作用を付けない。"
  }
};
export const FOOD_ITEMS = LEGACY_FOOD_ITEMS.map((food,index) => ({...food,
 id: `food-${String(index+1).padStart(3,"0")}`,
 tcm: FOOD_THEORY[food.name] || {nature:null,flavors:[],functions:[],channels:[],review:"drink_catalog",note:"飲み物専用カタログで選定"},
}));

const NATURE = {寒:-2,涼:-1,平:0,温:1,熱:2};
const ALIASES = {気虚:'qi_deficiency',気滞:'qi_stagnation',血虚:'blood_deficiency',瘀血:'blood_stasis',痰湿:'fluid_damp',水滞:'fluid_damp',dampness:'fluid_damp',陰虚:'fluid_deficiency',津液不足:'fluid_deficiency'};
const SUB = {qi_deficiency:['補気','健脾'],blood_deficiency:['養血','滋陰'],qi_stagnation:['理気','和胃'],blood_stasis:['活血','理気'],fluid_damp:['健脾','利水'],fluid_deficiency:['滋陰','生津','潤燥','潤肺']};
const POLICY = {sasaeru:['補気','健脾','養血'],nukumeru:['温中','散寒'],uruosu:['生津','滋陰','潤燥','潤肺'],nagasu:['健脾','利水'],meguraseru:['理気','活血'],yurumeru:['理気','和胃'],shizumeru:['清熱','安神','平肝']};
const SYMPTOM = {digestion:['健脾','和胃','消食'],swelling:['利水','健脾'],fatigue:['補気','健脾'],sleep:['安神'],mood:['理気'],neck_shoulder:['理気'],low_back_pain:['補腎'],headache:[],dizziness:[]};
const WORDS = {
 補気:'疲れが気になるとき、食事から元気を補う',健脾:'食後の重さが気になるとき、胃腸の働きを支える',
 養血:'消耗しがちな体を食事で養う',滋陰:'乾きと消耗が重なるとき、うるおいを補う',生津:'口や喉の乾きに合わせ、うるおいを補う',
 潤燥:'乾燥が気になる体にうるおいを補う',潤肺:'喉の乾きが気になるときにうるおいを補う',潤腸:'便が硬くなりがちなとき、うるおいを補う',
 理気:'張りつめた感じやお腹の張りを整える',和胃:'食事のあとにお腹が重くなりやすいときに整える',養胃:'乾きが気になるとき、胃腸を養う',
 消食:'食べすぎでお腹が重いときに整える',利水:'水分をため込みやすいときの食事に取り入れる',温中:'冷えやすいお腹を温める',散寒:'冷えが気になるときに温める',
 清熱:'ほてりが気になるとき、熱を落ち着ける',安神:'休息に向けて落ち着きを養う',平肝:'高ぶりが気になるときに落ち着ける',
 補腎:'疲れが抜けにくいとき、体を養う',活血:'巡りを整える',
};
const arr = x => Array.isArray(x) ? x : [];
const hash = x => Array.from(String(x)).reduce((n,c)=>(n*31+c.codePointAt(0))>>>0,0);
const ordinal = d => {const t=Date.parse(`${d}T00:00:00Z`);return Number.isFinite(t)?Math.floor(t/86400000):0;};
export function foodTcmNeeds({theme={},subLabels=[],symptomFocus=null}={}) {
 const labels=[...new Set([...arr(theme?.sub_labels),...arr(subLabels)].map(x=>typeof x==='object'?(x.code||x.key||x.label):x).map(x=>ALIASES[x]||x))];
 const needs={};const add=(keys,weight,reason)=>arr(keys).forEach(k=>{if(!needs[k]||needs[k].weight<weight)needs[k]={weight,reason};});
 const labelReason={qi_deficiency:'疲れやすい傾向',blood_deficiency:'消耗しやすい傾向',qi_stagnation:'張りつめやすい傾向',blood_stasis:'巡りを整える方針',fluid_damp:'重だるさをためやすい傾向',fluid_deficiency:'乾きやすい傾向'};
 labels.forEach(k=>add(SUB[k],4,labelReason[k]||'体質の傾向'));
 arr(theme?.policies).slice(0,2).forEach((p,i)=>add(POLICY[p.key],i?2:3,'今回のケア方針'));
 add(SYMPTOM[symptomFocus||theme?.symptom_focus],2.5,'気になる不調');
 const triggers=[theme?.trigger_key,theme?.secondary_trigger_key];
 if(triggers.includes('damp'))add(['健脾','利水'],2,'湿気の負担');
 if(triggers.includes('dry'))add(['生津','潤燥','潤肺'],2.5,'乾燥の負担');
 const cold=triggers.includes('cold')||labels.some(x=>/冷|寒|yang_deficiency|cold_pattern/.test(x||''));
 const heat=triggers.includes('heat')||labels.some(x=>/熱|ほて|heat_pattern/.test(x||''));
 const warming=arr(theme?.policies).some(x=>x.key==='nukumeru');
 if(cold)add(['温中','散寒'],2.5,'冷えへの備え');
 if(heat)add(['清熱','生津'],2.5,'暑さへの備え');
 const thermal=(cold||warming)&&heat?'mixed':heat?'cool':cold||warming?'warm':'neutral';
 if(!Object.keys(needs).length)add(['健脾','補気'],1,'普段の食事');
 return {needs,labels,triggers,thermal,symptom:symptomFocus||theme?.symptom_focus||null};
}
export function rankTcmFoods(options={}) {
 const context=foodTcmNeeds(options); const month=Number(String(options.targetDate||'').slice(5,7));
 return FOOD_ITEMS.filter(f=>f.role!=='drink').map(food=>{
  const t=food.tcm,n=NATURE[t.nature]??0;
  const uncertainThermal=['牛肉','りんご'].includes(food.name)||t.review==='limited';
  const eligible=!(context.thermal==='warm'&&n<=-1||context.thermal==='cool'&&n>=1||context.thermal==='mixed'&&Math.abs(n)>0);
  const matches=t.functions.filter(k=>context.needs[k]).map(key=>({key,...context.needs[key]})).sort((a,b)=>b.weight-a.weight);
  const reliability=t.review==='variable'?0.8:1;
  const fit=((matches[0]?.weight||0)+(matches[1]?.weight||0)*0.35)*reliability;
  const thermal=uncertainThermal?0:(context.thermal==='warm'&&n>0||context.thermal==='cool'&&n<0?1.5:n===0?0.5:0);
  const seasonal=arr(t.season).includes(month)?0.35:0;
  const weakDigestion=context.symptom==='digestion'||context.labels.includes('qi_deficiency');
  const rough=weakDigestion&&['玄米','もち麦','ごぼう'].includes(food.name)?1.5:0;
  const seasoning=food.role==='seasoning'?0.6:0;
  return {...food,eligible,score:fit+thermal+seasonal-rough-seasoning,matches,context};
 }).filter(f=>f.eligible).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
export function selectTcmFoods(options={}) {
 const ranked=rankTcmFoods(options);const best=ranked[0]?.score||0;
 let pool=ranked.filter(f=>f.score>=best-1.5);
 const day=ordinal(options.targetDate);
 const recent=new Set(arr(options.theme?.completed_care).filter(r=>{
  const actual=r.source_date||(r.source_mode==='tomorrow'?new Date((ordinal(r.target_date)-1)*86400000).toISOString().slice(0,10):r.target_date);
  const delta=day-ordinal(actual);return delta>0&&delta<=3&&r.item_snapshot?.meta?.record_semantics==='ingredient_consumed';
 }).map(r=>r.item_snapshot.meta.consumed_id));
 const fresh=pool.filter(f=>!recent.has(f.id));if(fresh.length)pool=fresh;
 const offset=(day+hash(JSON.stringify(foodTcmNeeds(options))))%Math.max(pool.length,1);
 const mainPool=pool.filter(f=>f.role!=="staple"&&f.role!=="seasoning");
 const mainChoices=mainPool.length?mainPool:pool;
 const primary=mainChoices[(day+hash(JSON.stringify(foodTcmNeeds(options))))%mainChoices.length]||ranked[0];
 const rest=[...pool.slice(offset+1),...pool.slice(0,offset),...ranked.filter(f=>f.score>=best-2)];
 const selected=[primary];
 for(const f of rest){if(selected.length>=3)break;if(!selected.some(s=>s.id===f.id)&&!selected.some(s=>s.role===f.role))selected.push(f);}
 for(const f of rest){if(selected.length>=3)break;if(!selected.some(s=>s.id===f.id))selected.push(f);}
 return selected.filter(Boolean);
}
export function tcmFoodDetail(food,{targetDate,slot='today'}={}) {
 const t=food.tcm; const matched=food.matches[0];
 const timing=slot==='breakfast'?'明日の食事':slot==='tonight'?'今夜の食事':'今日の食事';
 const why=matched?`${matched.reason}に合わせて選びました。食養生では、${food.name}を「${WORDS[matched.key]||'体を養う'}」食材として使います。`
  :`${timing}に取り入れやすい候補です。量や調理方法を、いつもの食事に合わせて選べます。`;
 const example=t.examples[ordinal(targetDate)%t.examples.length];
 return {label:food.name,focus_ingredients:[food.name],meal_example:example,public_reason:why,
  reasons:[{label:'選んだ理由',text:why}],preparation:'',
  record_semantics:'ingredient_consumed',record_label:`${food.name}を食べた`,consumed_id:food.id,consumed_name:food.name,
  consumption_slot:slot,recordable:slot!=='breakfast',
  selection_basis:{version:FOOD_TCM_VERSION,nature:t.nature,functions:t.functions,matched_functions:food.matches.map(x=>x.key),matched_context:matched?.reason||null,review:t.review,thermal:food.context.thermal},
 };
}
export function tcmEveningCaution(options={}) {
 const c=foodTcmNeeds(options); const focus=c.symptom;
 if(focus==='sleep')return {id:'night-caffeine',items:['夕方以降のコーヒー・濃いお茶'],reason:'眠りが気になる日は、夜にカフェインを重ねない選び方にします。',alternative:'飲みたいときは、カフェインを控えたお茶を少量。',basis:'caffeine_timing'};
 if(c.triggers.includes('damp')||c.labels.includes('fluid_damp'))return {id:'night-heavy',items:['夜遅い揚げ物・クリームたっぷりの菓子'],reason:'湿気で重だるくなりやすい日は、食養生では油や甘さの重なる食べ方を控えめにします。',alternative:'小腹が空いたら、油や甘さを足しすぎないものを少量。',basis:'湿・滋膩'};
 if(c.thermal==='warm'||focus==='digestion')return {id:'night-cold',items:['氷入りの飲み物・アイスを続けて摂ること'],reason:'冷えや胃腸の負担が気になる日は、夜に冷たいものを重ねないようにします。',alternative:'飲み物は常温〜温かめに。食べるなら少量ずつ。',basis:'寒涼・胃腸負担'};
 if(c.triggers.includes('dry')||c.labels.includes('fluid_deficiency'))return {id:'night-dry',items:['辛いおつまみとお酒の組み合わせ'],reason:'乾きが気になる日は、食養生では辛味やお酒を重ねすぎないようにします。',alternative:'小腹が空いたら、辛くない汁物などを少量。',basis:'辛温・傷津'};
 if(c.thermal==='cool')return {id:'night-hot',items:['辛い夜食・お酒の飲み足し'],reason:'暑さやほてりが気になる日は、食養生では辛味やお酒で熱を重ねる食べ方を控えます。',alternative:'小腹が空いたら、辛味の少ないものを少量。',basis:'辛温・助熱'};
 return {id:'night-portion',items:['寝る直前の大盛り・脂っこい夜食'],reason:'明日に備え、今夜は胃が重くなるほど食べ足さないようにします。',alternative:'空腹が気になるときは、軽いものを少量に。',basis:'飲食不節・食積'};
}
export function buildTcmFoodPlan({theme={},targetDate,subLabels=[],symptomFocus,mode='today',drinkCard=null}={}) {
 const tomorrow=mode==='tomorrow';const options={theme,targetDate,subLabels,symptomFocus};
 const foods=selectTcmFoods(options);const main=foods[0];
 const detail=f=>tcmFoodDetail(f,{targetDate,slot:tomorrow?'breakfast':'today'});
 const caution=tcmEveningCaution(options);
 const cautionCard={key:'caution',label:tomorrow?'今夜、控えめにしたいもの':'今日は重ねすぎない',items:caution.items,
  body:`${caution.reason} ${caution.alternative}`,primary:tomorrow,prominent:tomorrow,selection_basis:{rule_id:caution.id,reason:caution.reason}};
 const choice={key:'choice',label:tomorrow?'明日の朝に取り入れるなら':'今日取り入れたい食材',items:[main.name],item_details:[detail(main)],primary:!tomorrow,prominent:!tomorrow};
 const alternative={key:'alternative',label:'別の食材を選ぶなら',items:foods.slice(1).map(f=>f.name),item_details:foods.slice(1).map(detail)};
 // A snack is optional. Choose a light staple from the same audited inventory;
 // never use tomorrow breakfast's record slot for something eaten tonight.
 const snack=rankTcmFoods(options).find(f=>['ごはん','じゃがいも','卵'].includes(f.name));
 const snackDetail=tcmFoodDetail(snack,{targetDate,slot:'tonight'});
 snackDetail.meal_example=snack.name==='ごはん'?'少量のおかゆ':snack.name==='卵'?'小さめの茶碗蒸し':'少量のじゃがいものスープ';
 const night={key:'night',label:'小腹が空いたときだけ',body:'食べるなら少量に。満腹なら追加する必要はありません。',items:[snack.name],item_details:[snackDetail]};
 const drinks=drinkCard?{...drinkCard,prominent:!tomorrow,primary:false,body:null}:null;
 const cards=tomorrow?[cautionCard,night,choice,drinks,alternative]:[choice,drinks,cautionCard,alternative];
 return {version:FOOD_TCM_VERSION,selected_foods:foods.map(f=>({id:f.id,name:f.name,basis:detail(f).selection_basis})),
  action_cards:cards.filter(c=>c&&(!Array.isArray(c.items)||c.items.length)),title:main.name,
  primary_action:{id:main.id,label:main.name,reason:detail(main).public_reason},
  alternatives:foods.slice(1).map(f=>({id:f.id,label:f.name,reason:detail(f).public_reason})),
  subtraction_action:{id:caution.id,label:caution.items.join('・'),reason:caution.reason},
  add_items:foods.map(f=>f.name),ingredient_suggestions:foods.map(f=>f.name),caution_items:caution.items,
  detail_eyebrow:'ほかの選び方',
  detail_title:tomorrow?'小腹が空いたとき・明日の朝食':'別の食材・控えめにしたいもの',
  practical_tip:detail(main).meal_example,reason:null,how_to:null,avoid:null,lifestyle_tip:null,display_compact:true};
}
