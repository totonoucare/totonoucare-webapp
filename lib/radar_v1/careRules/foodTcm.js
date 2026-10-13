import { FOOD_COMBINATION_RECIPES, FOOD_COMBINATION_VERSION } from "./foodCombinationRecipes";

// Existing v67 inventory, enriched by ingredient. No nutrient-to-TCM inference.
// Theory fields are an expert-review draft, not clinical effect estimates.
export const FOOD_TCM_VERSION = "food_tcm_v95_2026-10-13";
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
const ALIASES = {気虚:'qi_deficiency',気滞:'qi_stagnation',血虚:'blood_deficiency',瘀血:'blood_stasis',血瘀:'blood_stasis',痰湿:'fluid_damp',水滞:'fluid_damp',dampness:'fluid_damp',陰虚:'fluid_deficiency',津液不足:'fluid_deficiency'};
const SUB = {qi_deficiency:['補気','健脾'],blood_deficiency:['養血','滋陰'],qi_stagnation:['理気','和胃'],blood_stasis:['活血','理気'],fluid_damp:['健脾','利水'],fluid_deficiency:['滋陰','生津','潤燥','潤肺']};
const POLICY = {sasaeru:['補気','健脾','養血'],nukumeru:['温中','散寒'],uruosu:['生津','滋陰','潤燥','潤肺'],nagasu:['健脾','利水'],meguraseru:['理気','活血'],yurumeru:['理気','和胃'],shizumeru:['清熱','安神','平肝']};
const SYMPTOM = {digestion:['健脾','和胃','消食'],swelling:['利水','健脾'],fatigue:['補気','健脾'],sleep:['安神'],mood:['理気'],neck_shoulder:['理気'],low_back_pain:['補腎'],headache:[],dizziness:[]};
// Describe the care direction without asserting an unreported symptom.
const WORDS = {
 補気:'食事から元気を補う',健脾:'消化・吸収の働きを支える',養血:'体を養う',滋陰:'うるおいを補い、体を養う',
 生津:'うるおいを補う',潤燥:'乾燥への備えにうるおいを補う',潤肺:'喉をいたわり、うるおいを補う',潤腸:'腸をうるおす',
 理気:'巡りを整える',和胃:'胃腸の働きを整える',養胃:'胃腸を養う',消食:'消化を助ける',利水:'水分の偏りを整える',
 温中:'温める方向で食事を整える',散寒:'冷えへの備えに取り入れる',清熱:'熱を落ち着ける方向で食事を整える',
 安神:'休息に向けて落ち着きを養う',平肝:'落ち着きを養う',補腎:'体を養う',活血:'巡りを整える',
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
 if(heat)add(['清熱','生津'],2.5,triggers.includes('heat')?'暑さへの備え':'熱がこもりやすい傾向');
 const thermal=(cold||warming)&&heat?'mixed':heat?'cool':cold||warming?'warm':'neutral';
 if(!Object.keys(needs).length)add(['健脾','補気'],1,'普段の食事');
 return {needs,labels,triggers,thermal,cold,heat,warming,symptom:symptomFocus||theme?.symptom_focus||null};
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
 // Keep a positive matching function and thermal eligibility; rotate within a bounded fit range.
 let pool=ranked.filter(f=>f.matches.length&&f.score>=best-2.7);
 if(!pool.length)pool=ranked.filter(f=>f.score>=best-1.5);
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
 const rest=[...pool.slice(offset),...pool.slice(0,offset)];
 const selected=[primary];
 for(const f of rest){if(selected.length>=3)break;if(!selected.some(s=>s.id===f.id)&&!selected.some(s=>s.role===f.role))selected.push(f);}
 for(const f of rest){if(selected.length>=3)break;if(!selected.some(s=>s.id===f.id))selected.push(f);}
 return selected.filter(Boolean);
}
export function tcmFoodDetail(food,{targetDate,slot='today'}={}) {
 const t=food.tcm; const matched=food.matches[0];
 const timing=slot==='breakfast'?'明日の食事':slot==='tonight'?'今夜の食事':'今日の食事';
 const symptomLabel={headache:'頭痛',dizziness:'めまい',fatigue:'疲れ',sleep:'眠り',digestion:'胃腸の不調',swelling:'むくみ',mood:'気分',neck_shoulder:'首・肩のこり',low_back_pain:'腰の不調'}[food.context.symptom];
 const reason=matched?.reason==='気になる不調'&&symptomLabel?`${symptomLabel}が気になるときの食事として`:matched?`${matched.reason}に合わせて`:'';
 const context=food.context;
 let why;
 if(matched?.key==='健脾'&&context.symptom!=='digestion'&&(context.labels.includes('fluid_damp')||context.triggers.includes('damp'))){
  const basis=context.labels.includes('fluid_damp')?'重だるさをためやすい体質':'湿気への備え';
  why=`${food.name}は、${basis}に合わせた候補です。食養生では、消化・吸収を支えることも重だるさへのケアに取り入れます。`;
 } else if(matched?.key==='健脾'&&context.symptom!=='digestion'&&(context.labels.includes('qi_deficiency')||context.symptom==='fatigue')){
  why=`${food.name}は、${context.symptom==='fatigue'?'疲れが気になるとき':'消耗しやすい体質'}の候補です。食養生では、消化・吸収を支えることも元気を補うケアに取り入れます。`;
 } else if(matched?.key==='和胃'&&context.symptom!=='digestion'){
  why=`${food.name}を${reason}選びました。食養生では、胃腸の働きを整えることも、緊張をゆるめるケアに取り入れます。`;
 } else if(matched){
  why=`${food.name}を${reason}選びました。食養生では、${WORDS[matched.key]||'体を養う'}食材として取り入れます。`;
 } else {
  why=`${food.name}は${timing}に取り入れやすい候補です。量や調理方法を、いつもの食事に合わせて選べます。`;
 }
 const example=t.examples[ordinal(targetDate)%t.examples.length];
 return {label:food.name,focus_ingredients:[food.name],meal_example:example,public_reason:why,
  reasons:[{label:'選んだ理由',text:why}],preparation:'',
  record_semantics:'ingredient_consumed',record_label:`${food.name}を食べた`,consumed_id:food.id,consumed_name:food.name,
  consumption_slot:slot,recordable:slot!=='breakfast',
  selection_basis:{version:FOOD_TCM_VERSION,nature:t.nature,functions:t.functions,matched_functions:food.matches.map(x=>x.key),matched_context:matched?.reason||null,review:t.review,thermal:food.context.thermal},
 };
}
export function tcmEveningCaution(options={}) {
 const c=foodTcmNeeds(options),focus=c.symptom,tomorrow=options.mode==='tomorrow';
 const when=tomorrow?'明日の':'今日の',late=tomorrow?'今夜の':'夜遅い';
 const rule=(id,items,reason,alternative,basis,source)=>({id,items,reason,alternative,basis,source});
 if(focus==='sleep')return rule('night-caffeine',['夕方以降のコーヒー・濃いお茶'],'眠りが気になるため、夕方以降のカフェインは控えめに。','飲みたいときは、カフェインを控えた一杯に。','caffeine_timing','symptom');
 if(focus==='digestion')return rule('night-digestion',[`${late}脂っこいもの・食べすぎ`],'胃腸の不調に合わせ、脂っこいものや一度に食べる量を控えめに。','小腹が空いたら、油の少ないものを少量。','digestive_load','symptom');
 const heavy=(reason,source)=>rule('night-heavy',[`${late}揚げ物・クリームたっぷりの菓子`],reason,'小腹が空いたら、油や甘さを足しすぎないものを少量。','湿・滋膩',source);
 const dry=(reason,source)=>rule('night-dry',['辛いおつまみとお酒の組み合わせ'],reason,'小腹が空いたら、辛味の少ない汁物などを少量。','辛温・傷津',source);
 const heat=(reason,source)=>rule('night-hot',['辛い料理の重ね食い・お酒の飲み足し'],reason,'食べるなら、辛味を足しすぎないものに。','辛温・助熱',source);
 const cold=(reason,source)=>rule('night-cold',['氷入りの飲み物・アイスを続けて摂ること'],reason,'飲み物は常温〜温かめで、飲みやすい温度に。','寒涼',source);
 if(focus==='swelling')return heavy('むくみが気になるときの食養生として、油や甘さの重なる食べ方を控えめに。','symptom');
 // Respect the target day's weather order before falling back to constitution.
 for(const trigger of c.triggers){
  if(trigger==='heat')return heat(`${when}暑さに備え、食養生では辛味やお酒を重ねすぎないようにします。`,'weather');
  if(trigger==='cold'&&!c.heat)return cold(`${when}冷えに備え、冷たいものを続けて摂ることを控えめに。`,'weather');
  if(trigger==='dry')return dry(`${when}乾燥に備え、食養生では辛味やお酒を重ねすぎないようにします。`,'weather');
  if(trigger==='damp')return heavy(`${when}湿気への備えとして、油や甘さの重なる食べ方を控えめに。`,'weather');
 }
 if(c.labels.includes('fluid_damp'))return heavy('重だるさをためやすい体質に合わせ、油や甘さの重なる食べ方を控えめに。','constitution');
 if(c.labels.includes('fluid_deficiency'))return dry('乾きやすい体質に合わせ、食養生では辛味やお酒を重ねすぎないようにします。','constitution');
 if(c.heat)return heat('熱がこもりやすい傾向に合わせ、食養生では辛味やお酒を重ねすぎないようにします。','constitution');
 if(c.cold)return cold('冷えやすい傾向に合わせ、冷たいものを続けて摂ることを控えめに。','constitution');
 if(c.warming)return cold('温めるケア方針に合わせ、冷たいものを続けて摂ることを控えめに。','policy');
 return rule('night-portion',['寝る直前の大盛り・脂っこい夜食'],tomorrow?'明日に備え、今夜は寝る直前の食べすぎを控えめに。':'食後の負担を増やさないよう、寝る直前の食べすぎを控えめに。','空腹が気になるときは、軽いものを少量に。','飲食不節・食積','everyday');
}
export function buildTcmFoodPlan({theme={},targetDate,subLabels=[],symptomFocus,mode='today',drinkCard=null}={}) {
 const tomorrow=mode==='tomorrow';const options={theme,targetDate,subLabels,symptomFocus,mode};
 const combinations=selectFoodCombinations(options);
 const main=combinations[0];
 const caution=tcmEveningCaution(options);
 const cautionCard={key:'caution',label:tomorrow?'今夜、控えめにしたいもの':'今日は重ねすぎない',items:caution.items,
  body:`${caution.reason} ${caution.alternative}`,primary:tomorrow,prominent:tomorrow,selection_basis:{rule_id:caution.id,reason:caution.reason,source:caution.source,target_date:targetDate||null}};
 const choice=foodCombinationCard(main,options,'choice',tomorrow?'明日の食事に取り入れるなら':'今日取り入れたい組み合わせ');
 choice.primary=!tomorrow;choice.prominent=!tomorrow;
 const alternatives=combinations.slice(1).map((combination,i)=>foodCombinationCard(combination,options,i?'alternative_2':'alternative',i?'もう一つの組み合わせ':'別の組み合わせを選ぶなら'));
 // A snack is optional. Choose a light staple from the same audited inventory;
 // never use tomorrow breakfast's record slot for something eaten tonight.
 const snack=rankTcmFoods(options).find(f=>['ごはん','じゃがいも','卵'].includes(f.name));
 const snackDetail=tcmFoodDetail(snack,{targetDate,slot:'tonight'});
 snackDetail.meal_example=snack.name==='ごはん'?'少量のおかゆ':snack.name==='卵'?'小さめの茶碗蒸し':'少量のじゃがいものスープ';
 const night={key:'night',label:'小腹が空いたときだけ',body:'食べるなら少量に。満腹なら追加する必要はありません。',items:[snack.name],item_details:[snackDetail]};
 const drinks=drinkCard?{...drinkCard,prominent:!tomorrow,primary:false,body:null}:null;
 const cards=tomorrow?[cautionCard,night,choice,drinks,...alternatives]:[choice,drinks,cautionCard,...alternatives];
 const foods=[...new Map(combinations.flatMap(c=>c.foods).map(f=>[f.id,f])).values()];
 return {version:FOOD_TCM_VERSION,combination_version:FOOD_COMBINATION_VERSION,
  selected_foods:foods.map(f=>({id:f.id,name:f.name,basis:combinationIngredientDetail(f,combinations.find(c=>c.foods.some(g=>g.id===f.id)),options).selection_basis})),
  selected_combinations:combinations.map(c=>({id:c.id,ingredients:c.foods.map(f=>f.name),selection_basis:foodCombinationDetail(c,options).selection_basis})),
  action_cards:cards.filter(c=>c&&(!Array.isArray(c.items)||c.items.length)),title:main.name,
  primary_action:{id:main.id,label:main.name,reason:foodCombinationDetail(main,options).public_reason},
  alternatives:combinations.slice(1).map(c=>({id:c.id,label:c.name,reason:foodCombinationDetail(c,options).public_reason})),
  subtraction_action:{id:caution.id,label:caution.items.join('・'),reason:caution.reason},
  add_items:foods.map(f=>f.name),ingredient_suggestions:foods.map(f=>f.name),caution_items:caution.items,
  detail_eyebrow:'ほかの選び方',
  detail_title:tomorrow?'明日の食事・飲み物・小腹が空いたとき':'別の組み合わせ・控えめにしたいもの',
  practical_tip:main.title,reason:null,how_to:null,avoid:null,lifestyle_tip:null,display_compact:true};
}

const COMBINATION_POLICY_LABELS = {sasaeru:'ささえる',nukumeru:'ぬくめる',uruosu:'うるおす',nagasu:'ながす',meguraseru:'めぐらせる',yurumeru:'ゆるめる',shizumeru:'しずめる'};
const COMBINATION_BODY_LABELS = {qi_deficiency:'疲れやすい傾向',qi_stagnation:'張りつめやすい傾向',blood_deficiency:'消耗しやすい傾向',blood_stasis:'巡りを整える方針',fluid_damp:'重だるさをためやすい傾向',fluid_deficiency:'乾きやすい傾向'};
const COMBINATION_WEATHER_FUNCTIONS = {damp:['健脾','利水'],dry:['生津','潤燥','潤肺'],cold:['温中','散寒'],heat:['清熱','生津']};
const COMBINATION_WEATHER_LABELS = {damp:'湿気',dry:'乾燥',cold:'寒さ',heat:'暑さ',pressure_down:'気圧変化',pressure_up:'気圧変化',pressure_shift:'気圧変化',temp_shift:'寒暖差'};
const COMBINATION_SYMPTOM_LABELS = {digestion:'胃腸の調子',swelling:'むくみ・重だるさ',fatigue:'疲れ・だるさ',sleep:'眠りの調子',mood:'気分の浮き沈み',neck_shoulder:'首・肩のつらさ',low_back_pain:'腰のつらさ',headache:'頭のつらさ',dizziness:'ふらつき・めまい'};
const clamp = (value,lo,hi) => Math.min(hi,Math.max(lo,Number(value)||0));

// Weights are bounded product-design values, not effect estimates. Preserve
// evidence by source: a weather match must not erase the constitution match.
export function foodCombinationContext(options={}) {
 const {theme={}}=options;
 const legacy=foodTcmNeeds(options);
 const when=options.mode==='tomorrow'?'明日の':'今日の';
 const signal=clamp(theme.signal,0,2);
 const weatherWeight=signal>=2?4.2:signal>=1?2.5:1;
 const policies=arr(theme.policies).slice(0,2);
 const sources=[];
 const add=(source,key,functions,weight,reason,via='ingredient')=>{
  if(functions?.length)sources.push({source,key,functions:[...new Set(functions)],weight,reason,via});
 };
 legacy.labels.forEach((label,i)=>{
  const profile=theme.constitution_profile;
  const raw=Number(profile?.material?.[label]);
  const strength=profile?.available&&Number.isFinite(raw)
   ? (profile.score_scale==='0_100'?clamp(raw/100,0,1):clamp(raw/(raw+2.5),0,1)):1;
  add('constitution',label,SUB[label],(i?2.6:3.2)*(0.75+strength*0.25),COMBINATION_BODY_LABELS[label]||'体質の傾向');
 });
 const symptom=legacy.symptom;
 if(SYMPTOM[symptom]?.length)add('symptom',symptom,SYMPTOM[symptom],2,`気になる${COMBINATION_SYMPTOM_LABELS[symptom]||'不調'}`);
 else if(symptom&&policies[0])add('symptom',symptom,POLICY[policies[0].key],1.4,`気になる${COMBINATION_SYMPTOM_LABELS[symptom]||'不調'}に合わせたケア方針`,'care_policy');
 policies.forEach((p,i)=>add('policy',p.key,POLICY[p.key],i?0.35:0.75,`「${COMBINATION_POLICY_LABELS[p.key]||p.label||'整える'}」方針`,'care_policy'));
 [...new Set(legacy.triggers.filter(Boolean))].forEach((trigger,i)=>{
  if(COMBINATION_WEATHER_FUNCTIONS[trigger])add('weather',trigger,COMBINATION_WEATHER_FUNCTIONS[trigger],weatherWeight*(i?0.5:1),`${when}${COMBINATION_WEATHER_LABELS[trigger]}への備え`);
  else if(COMBINATION_WEATHER_LABELS[trigger]&&policies.length){
   // Pressure and temperature swings act through the actual care policy. Do
   // not invent a food that treats pressure or turn pressure rise into heat.
   add('weather',trigger,policies.flatMap(p=>POLICY[p.key]||[]),weatherWeight*(i?0.3:0.65),`${when}${COMBINATION_WEATHER_LABELS[trigger]}に合わせたケア方針`,'care_policy');
  }
 });
 if(!sources.length)add('policy','everyday',['健脾','補気'],1,'普段の食事');
 return {...legacy,sources,signal,weather_weight:weatherWeight,when,target_date:options.targetDate||null};
}

function sourceMatch(source,foods) {
 const matches=foods.map(food=>{
  const functions=food.tcm.functions.filter(f=>source.functions.includes(f));
  const nature=source.source==='weather'&&food.tcm.review!=='limited'
   &&(source.key==='cold'&&['温','熱'].includes(food.tcm.nature)||source.key==='heat'&&['涼','寒'].includes(food.tcm.nature))?food.tcm.nature:null;
  return {food,functions,nature,reliability:(food.tcm.review==='variable'?0.8:1)*(food.role==='seasoning'?0.65:1)};
 }).filter(m=>m.functions.length||m.nature);
 const functions=[...new Set(matches.flatMap(m=>m.functions))];
 const reliability=matches.length?Math.max(...matches.map(m=>m.reliability)):0;
 const fit=reliability*(functions.length>1?1.15:functions.length?1:0.8);
 return {...source,via:functions.length?source.via:'food_nature',matched_functions:functions,
  matched_foods:matches.map(m=>({id:m.food.id,name:m.food.name,functions:m.functions,nature_match:m.nature})),score:source.weight*fit};
}

function combinationScore(recipe,foods,context) {
 const evidence=context.sources.map(s=>sourceMatch(s,foods)).filter(s=>s.matched_foods.length);
 const scoreOf=(source)=>{const scored=evidence.filter(s=>s.source===source).map(s=>s.score).sort((a,b)=>b-a);return (scored[0]||0)+(scored[1]||0)*0.4;};
 const basis={constitution:scoreOf('constitution'),weather:scoreOf('weather'),symptom:scoreOf('symptom'),policy:scoreOf('policy')};
 let practical=recipe.effort==='low'?0.2:0;
 if(recipe.served_warm&&context.triggers.includes('cold'))practical+=0.3;
 if(['soup','rice','stew'].includes(recipe.format)&&context.triggers.includes('dry'))practical+=0.15;
 const weakDigestion=context.symptom==='digestion'||context.labels.includes('qi_deficiency');
 let penalty=weakDigestion&&recipe.format==='salad'?0.65:0;
 if(weakDigestion&&foods.some(f=>['玄米','もち麦','ごぼう'].includes(f.name)))penalty+=1.1;
 for(const food of foods){
  if(arr(food.anti).some(key=>context.triggers.includes(key)||key==='damp'&&context.labels.includes('fluid_damp')||key==='dry'&&context.labels.includes('fluid_deficiency')))penalty+=0.7;
 }
 const month=Number(String(context.target_date||'').slice(5,7));
 const seasonal=foods.some(f=>arr(f.tcm.season).includes(month))?0.2:0;
 // A culinary companion with unreviewed functions does not contribute a
 // traditional-function score. Its role is explained as cooking compatibility.
 return {score:Math.max(0,Object.values(basis).reduce((a,b)=>a+b,0)+practical+seasonal-penalty),evidence,basis,penalty};
}

export function rankFoodCombinations(options={}) {
 const context=foodCombinationContext(options);
 const eligible=new Map(rankTcmFoods(options).map(f=>[f.name,f]));
 return FOOD_COMBINATION_RECIPES.map(recipe=>{
  const foods=recipe.foods.map(name=>eligible.get(name));
  if(foods.some(f=>!f)||new Set(foods.map(f=>f.id)).size!==2)return null;
  const evaluation=combinationScore(recipe,foods,context);
  if(!evaluation.evidence.length)return null;
  return {...recipe,id:`pair-${hash(recipe.foods.slice().sort().join('|')+'|'+recipe.format).toString(36)}`,name:recipe.foods.join('＋'),foods,context,...evaluation};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}

function recentConsumedFoods(options) {
 const day=ordinal(options.targetDate);
 return new Set(arr(options.theme?.completed_care).filter(row=>{
  const actual=row.source_date||(row.source_mode==='tomorrow'?new Date((ordinal(row.target_date)-1)*86400000).toISOString().slice(0,10):row.target_date);
  const age=day-ordinal(actual);
  return age>0&&age<=3&&row.item_snapshot?.meta?.record_semantics==='ingredient_consumed';
 }).map(row=>row.item_snapshot.meta.consumed_id));
}

export function selectFoodCombinations(options={}) {
 const ranked=rankFoodCombinations(options);
 if(!ranked.length)throw new Error('No eligible food combination');
 const best=ranked[0].score;
 let pool=ranked.filter(r=>r.score>=best-Math.max(2.4,best*0.25));
 const context=ranked[0].context;
 if(context.signal>=1&&pool.some(r=>r.basis.weather>0)){
  const bestWeather=Math.max(...pool.map(r=>r.basis.weather));
  pool=pool.filter(r=>context.signal>=2?r.basis.weather>=bestWeather*0.65:r.basis.weather>0);
 }
 const recent=recentConsumedFoods(options);
 const fresh=pool.filter(r=>r.foods.every(f=>!recent.has(f.id)));
 if(fresh.length>=3)pool=fresh;
 else if(fresh.length)pool=[...fresh,...pool.filter(r=>!fresh.includes(r))];
 const signature=JSON.stringify({labels:context.labels,triggers:context.triggers,signal:context.signal,symptom:context.symptom,policies:arr(options.theme?.policies).map(p=>p.key)});
 const offset=(ordinal(options.targetDate)+hash(signature))%pool.length;
 const ordered=[...pool.slice(offset),...pool.slice(0,offset)];
 // Prefer genuinely fresh food if any remains, then rotate within the fit band.
 const main=(fresh.length?ordered.find(r=>fresh.includes(r)):null)||ordered[0];
 const selected=[main];
 const take=(predicate)=>{
  for(const r of ordered){if(selected.length>=3)break;if(!selected.some(s=>s.id===r.id)&&predicate(r))selected.push(r);}
 };
 take(r=>selected.every(s=>s.format!==r.format&&s.foods.every(f=>!r.foods.some(g=>g.id===f.id))));
 take(r=>selected.every(s=>s.foods.every(f=>!r.foods.some(g=>g.id===f.id))));
 take(()=>true);
 return selected;
}

function roleForIngredient(food,combination,usedFunction=null,preferredSource=null) {
 const matching=combination.evidence.flatMap(s=>{
  const matches=food.tcm.functions.filter(key=>s.matched_functions.includes(key)).map(key=>({key,source:s.source,reason:s.reason,score:s.score,via:s.via}));
  const nature=s.matched_foods.find(f=>f.id===food.id)?.nature_match;
  if(nature&&!matches.length)matches.push({key:null,kind:'nature',nature,source:s.source,reason:s.reason,score:s.score,via:'food_nature'});
  return matches;
 }).sort((a,b)=>b.score-a.score);
 const preferred=preferredSource?matching.filter(m=>m.source===preferredSource):matching;
 return preferred.find(m=>m.key!==usedFunction)||preferred[0]||matching.find(m=>m.key!==usedFunction)||matching[0]||null;
}

function recipeRoles(combination) {
 const weather=combination.context.signal>=1?combination.evidence.filter(e=>e.source==='weather'):[];
 let weatherFood=-1;
 if(weather.length){
  const matches=combination.foods.map((food,index)=>({index,fit:weather.reduce((score,e)=>score+(e.matched_foods.some(f=>f.id===food.id)?e.score:0),0)})).sort((a,b)=>b.fit-a.fit);
  weatherFood=matches[0]?.fit>0?matches[0].index:-1;
 }
 const weatherRole=weatherFood>=0?roleForIngredient(combination.foods[weatherFood],combination,null,'weather'):null;
 let previous=weatherRole?.key||null;
 return combination.foods.map(food=>{
  const index=combination.foods.indexOf(food);
  const match=index===weatherFood?weatherRole:roleForIngredient(food,combination,previous,'constitution');previous=match?.key||previous;
  const text=match?.kind==='nature'?(['温','熱'].includes(match.nature)?'温める方向の食材として':'熱を落ち着ける方向の食材として')
   :match?`${WORDS[match.key]||'体を養う'}食材として`:'一緒に調理しやすい食材として';
  return {name:food.name,function:match?.key||null,nature_match:match?.nature||null,source:match?.source||'culinary',text,review:food.tcm.review};
 });
}

export function foodCombinationDetail(combination,options={}) {
 const roles=recipeRoles(combination);
 const relevant=combination.evidence.filter(e=>['constitution','weather','symptom'].includes(e.source));
 const bySource=new Map();
 relevant.sort((a,b)=>b.score-a.score).forEach(e=>{if(!bySource.has(e.source))bySource.set(e.source,e);});
 const weather=bySource.get('weather');
 const body=bySource.get('constitution');
 const chosen=combination.context.signal>=1&&weather
  ? [weather,body||bySource.get('symptom')].filter(Boolean)
  : [...bySource.values()].slice(0,2);
 const reasons=chosen.length?chosen:combination.evidence.slice(0,1);
 const basis=reasons.map(e=>e.reason).join('と');
 const shared=roles[0].function&&roles[0].function===roles[1].function;
 const rolesText=shared?`${combination.foods.map(f=>f.name).join('と')}は、食養生で${WORDS[roles[0].function]||'体を養う'}食材として組み合わせます。`
  :roles.map(r=>`${r.name}を${r.text}`).join('、')+'組み合わせます。';
 const public_reason=`${basis}を踏まえて選びました。${rolesText}`;
 return {id:combination.id,label:combination.name,focus_ingredients:combination.foods.map(f=>f.name),meal_example:combination.title,preparation:combination.preparation,public_reason,
  ingredient_roles:roles,reasons:[...bySource.values()].map(e=>({label:{constitution:'体質',weather:'天気',symptom:'気になる不調',policy:'ケア方針'}[e.source],text:e.reason})),
  selection_basis:{version:FOOD_COMBINATION_VERSION,weather_weight:combination.context.weather_weight,signal:combination.context.signal,thermal:combination.context.thermal,source_scores:combination.basis,
   evidence:combination.evidence.map(({source,key,reason,via,weight,score,matched_functions,matched_foods})=>({source,key,reason,via,weight,score,matched_functions,matched_foods})),
   ingredients:combination.foods.map(f=>({id:f.id,name:f.name,nature:f.tcm.nature,review:f.tcm.review})),target_date:options.targetDate||null},
 };
}

function combinationIngredientDetail(food,combination,options) {
 const detail=tcmFoodDetail(food,{targetDate:options.targetDate,slot:options.mode==='tomorrow'?'breakfast':'today'});
 const ownEvidence=combination.evidence.filter(e=>e.matched_foods.some(f=>f.id===food.id));
 const role=roleForIngredient(food,combination);
 const direction=role?.kind==='nature'?(['温','熱'].includes(role.nature)?'温める方向に取り入れる':'熱を落ち着ける方向に取り入れる'):(WORDS[role?.key]||'体を養う');
 const reason=role?`${role.reason}に合わせて選びました。食養生では、${food.name}を${direction}食材として取り入れます。`:`${food.name}は、${combination.foods.find(f=>f.id!==food.id)?.name||'ほかの食材'}と一緒に調理しやすい食材として組ませました。`;
 return {...detail,consumption_slot:options.mode==='tomorrow'?'next_day':'today',public_reason:reason,reasons:[{label:'選んだ理由',text:reason}],meal_example:combination.title,combination_id:combination.id,
  selection_basis:{...detail.selection_basis,version:FOOD_TCM_VERSION,matched_functions:[...new Set(ownEvidence.flatMap(e=>e.matched_foods.find(f=>f.id===food.id)?.functions||[]))],matched_context:role?.reason||'料理としての組み合わせ',combination_id:combination.id,evidence:ownEvidence.map(({source,key,reason,via,weight,score,matched_foods})=>({source,key,reason,via,weight,score,matched_functions:matched_foods.find(f=>f.id===food.id)?.functions||[],nature_match:matched_foods.find(f=>f.id===food.id)?.nature_match||null}))},
 };
}

function foodCombinationCard(combination,options,key,label) {
 return {key,label,items:combination.foods.map(f=>f.name),item_details:combination.foods.map(f=>combinationIngredientDetail(f,combination,options)),proposal:foodCombinationDetail(combination,options)};
}
