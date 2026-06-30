"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { getCoreLabel, getSubLabels, SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";
import { buildBaseCarePreferences } from "@/lib/diagnosis/v2/carePreferences";
import { buildApproachTags, scorePartnerOffers } from "@/lib/care-navi/partnerOffers";
import {
  deriveCarePolicies,
  getForecastTriggerFactors,
  getJstTodayTomorrow,
  getRiskContext,
} from "@/app/radar/utils";
import {
  IconCare,
  IconFood,
  IconKarte,
  IconLifestyle,
  IconRadar,
  IconTsubo,
} from "@/components/illust/icons/app";

const CARE_NAVI_THEME = {
  "--bg": "#F7FAF6",
  "--bg-soft": "#E3F3EE",
  "--panel": "#FFFFFF",
  "--mint": "#DCEFEA",
  // Buttons and primary actions use the original app accent, not the darker care-navi teal.
  "--accent": "#349B83",
  "--accent-dark": "#2F8F79",
  "--accent-ink": "#24564C",
  "--gold": "#e2aa3b",
  "--gold-soft": "#f6ebc7",
  "--ring": "rgba(36, 86, 76, 0.13)",
  "--ring-strong": "rgba(36, 86, 76, 0.22)",
};

const CATEGORY_OPTIONS = [
  { key: "live", label: "暮らす", icon: IconLifestyle, lead: "睡眠・入浴・空気・温度湿度まわり" },
  { key: "eat", label: "食べる", icon: IconFood, lead: "食事・飲み物・栄養の整え方" },
  { key: "point", label: "ほぐす", icon: IconTsubo, lead: "首肩・腰・手足など、体に直接使うケア" },
];

const CATEGORY_ORDER = CATEGORY_OPTIONS.map((item) => item.key);

const SET_MODE_OPTIONS = [
  {
    key: "starter",
    label: "軽く試せるセット",
    band: "light",
    lead: "まずは3つの候補から、今の生活に足しやすいものを選べます。",
  },
  {
    key: "steady",
    label: "しっかり整えるセット",
    band: "standard",
    lead: "暮らす・食べる・ほぐすを一緒にそろえて、数日続けやすい組み合わせです。",
  },
  {
    key: "environment",
    label: "環境から見直すセット",
    band: "deep",
    lead: "寝具・空気・食事サービス・ケア機器まで含めて、生活環境から整える組み合わせです。",
  },
];

const SET_MODE_PRICE_BAND = Object.fromEntries(SET_MODE_OPTIONS.map((item) => [item.key, item.band]));

const PRICE_BAND_OPTIONS = [
  { key: "all", label: "すべて" },
  { key: "light", label: "お手軽" },
  { key: "standard", label: "標準" },
  { key: "deep", label: "しっかり" },
];

const CARE_NAVI_INITIAL_LIMIT = 12;
const CARE_NAVI_EXPANDED_LIMIT = 24;
const CARE_NAVI_TOTAL_LIMIT = 48;
const CARE_SET_INITIAL_LIMIT = 4;
const CARE_SET_EXPANDED_LIMIT = 5;

const PRICE_BAND_RANGES = {
  live: {
    light: { max: 2000, label: "〜2,000円" },
    standard: { min: 2000, max: 5000, label: "2,000〜5,000円" },
    deep: { min: 5000, label: "5,000円〜" },
  },
  eat: {
    light: { max: 1800, label: "〜1,800円" },
    standard: { min: 1800, max: 5000, label: "1,800〜5,000円" },
    deep: { min: 5000, label: "5,000円〜" },
  },
  point: {
    light: { max: 2500, label: "〜2,500円" },
    standard: { min: 2500, max: 8000, label: "2,500〜8,000円" },
    deep: { min: 8000, label: "8,000円〜" },
  },
};

const WEATHER_FILTER_OPTIONS = [
  { key: "tomorrow", label: "明日の予報", lead: "明日の崩れやすさに備える条件を重ねます。" },
  { key: "season", label: "季節の天候", lead: "今の季節に起きやすい波を重ねます。" },
];

const LIFE_OPTIONS = [
  { key: "screen", label: "画面作業が多い", policies: ["yurumeru", "meguraseru"] },
  { key: "sleep_short", label: "寝不足ぎみ", policies: ["shizumeru", "sasaeru"] },
  { key: "cold_drinks", label: "冷たいものが多い", policies: ["nukumeru", "sasaeru"] },
  { key: "overeating", label: "食べすぎぎみ", policies: ["nagasu", "sasaeru"] },
  { key: "no_bath", label: "湯船に入れていない", policies: ["meguraseru", "yurumeru"] },
  { key: "low_activity", label: "運動不足ぎみ", policies: ["meguraseru", "nagasu"] },
  { key: "tense", label: "緊張が続いた", policies: ["yurumeru", "shizumeru"] },
  { key: "outdoor", label: "外出が多い", policies: ["uruosu", "sasaeru"] },
];

const POLICY_META = {
  shizumeru: { label: "しずめる", short: "刺激を減らす" },
  yurumeru: { label: "ゆるめる", short: "力みをほどく" },
  meguraseru: { label: "めぐらせる", short: "巡りを作る" },
  nagasu: { label: "ながす", short: "湿気・だるさを残しにくくする" },
  uruosu: { label: "うるおす", short: "乾きを補う" },
  nukumeru: { label: "ぬくめる", short: "冷やさない" },
  sasaeru: { label: "ささえる", short: "余力を守る" },
};

const PRODUCT_TYPE_LABELS = {
  teaBlend: "ブレンド茶",
  tea: "お茶・ハーブティー",
  yakuzenIngredient: "和漢素材",
  soupMeal: "軽い食事",
  supplement: "栄養補助",
  drinkware: "持ち歩き",
  foodOther: "食品候補",
};

const INTENT_LABELS = {
  warm_drink: "温かい飲み物",
  light_meal: "軽めの食事",
  nutrition_support: "栄養補助",
  ingredient: "素材を足す",
};

const PRODUCT_ROLE_LABELS = {
  reduce_light: "光・刺激を減らす",
  sleep_environment: "眠る環境づくり",
  warm_body: "冷やさない暮らし",
  bath_shift: "入浴で切り替える",
  humidity_control: "湿気をためない",
  moisture_air: "乾燥を守る",
  warm_drink: "温かい飲み物",
  caffeine_shift: "香りの一杯",
  light_meal: "軽めの食事",
  pantry_soup: "常備しやすい汁物",
  nutrition_support: "栄養補助",
  ingredient: "素材を足す",
  drinkware: "温かい一杯の道具",
  neck_shoulder_release: "首肩をほぐす",
  heat_release: "温めてゆるめる",
  posture_release: "姿勢を切り替える",
  foot_leg_release: "足・ふくらはぎをほぐす",
  gentle_stretch: "やさしく伸ばす",
  tsubo_support: "ツボケアを続ける",
  general: "ケア用品",
};

const SOURCE_TYPE_LABELS = {
  life: "生活サインから",
  symptom: "不調フォーカスから",
  policy: "今回の方針から",
  partner: "編集候補",
  a8: "編集候補",
};

const SYMPTOM_POLICY_HINTS = {
  fatigue: ["sasaeru", "nagasu"],
  sleep: ["shizumeru", "sasaeru"],
  digestion: ["sasaeru", "nukumeru", "nagasu"],
  neck_shoulder: ["yurumeru", "meguraseru"],
  low_back_pain: ["nukumeru", "meguraseru", "sasaeru"],
  swelling: ["nagasu", "meguraseru"],
  headache: ["yurumeru", "meguraseru", "shizumeru"],
  dizziness: ["sasaeru", "meguraseru"],
  mood: ["yurumeru", "shizumeru"],
};

const SUB_POLICY_HINTS = {
  qi_stagnation: ["yurumeru", "meguraseru"],
  qi_deficiency: ["sasaeru", "nukumeru"],
  blood_deficiency: ["uruosu", "sasaeru"],
  blood_stasis: ["meguraseru", "yurumeru"],
  fluid_damp: ["nagasu", "sasaeru"],
  fluid_deficiency: ["uruosu", "shizumeru"],
};

const SEASON_POLICY_HINTS = {
  spring: ["yurumeru", "meguraseru"],
  rainy: ["nagasu", "meguraseru"],
  summer: ["shizumeru", "uruosu"],
  autumn: ["uruosu", "shizumeru"],
  winter: ["nukumeru", "meguraseru"],
};

const SEASON_LABELS = {
  spring: "春",
  rainy: "梅雨",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};


const CARE_ITEM_LIBRARY = {
  shizumeru: {
    live: [
      { title: "光の刺激を減らすセット", query: "アイマスク 遮光 睡眠", reason: "頭の冴えや刺激を夜まで残しにくくします。", tags: ["睡眠前", "刺激を減らす"] },
      { title: "リラックス入浴まわり", query: "入浴剤 リラックス 無香料", reason: "高ぶりを一度落として、休む準備に入る候補です。", tags: ["入浴", "夜ケア"] },
    ],
    eat: [
      { title: "ノンカフェインの温かい飲み物", query: "ノンカフェイン お茶 リラックス", reason: "カフェインで無理に上げず、落ち着く時間を作ります。", tags: ["飲み物", "夜向き"] },
    ],
    point: [
      { title: "頭皮・こめかみまわりのセルフケア", query: "頭皮ブラシ マッサージ シリコン", reason: "頭や目まわりに残る力みを軽く逃がします。", tags: ["頭まわり", "ほぐす"] },
    ],
  },
  yurumeru: {
    live: [
      { title: "首肩を温めてゆるめるもの", query: "首肩 温熱 ネックウォーマー", reason: "首元の冷えや力みをほどきやすくします。", tags: ["首肩", "温める"] },
      { title: "目元を休ませるアイテム", query: "ホットアイマスク 目元 温熱", reason: "画面作業のあと、目と首肩の緊張を一度切ります。", tags: ["画面作業", "目元"] },
    ],
    eat: [
      { title: "ノンカフェインの温かい一杯", query: "ノンカフェイン ハーブティー リラックス", reason: "甘いものやカフェインだけで粘らず、切り替える時間を作ります。", tags: ["飲み物", "温かい"] },
    ],
    point: [
      { title: "首肩用のマッサージボール", query: "マッサージボール 首 肩", reason: "肩甲骨まわりや首肩のこわばりを逃がします。", tags: ["首肩", "ピンポイント"] },
      { title: "耳・側頭部まわりのほぐし", query: "頭皮 マッサージ グッズ 側頭部", reason: "気圧や画面姿勢で詰まりやすい頭〜耳まわりに。", tags: ["気圧", "耳まわり"] },
    ],
  },
  meguraseru: {
    live: [
      { title: "温浴でめぐらせる入浴まわり", query: "炭酸 入浴剤 温浴", reason: "湯船の時間で、巡りのきっかけを作ります。", tags: ["入浴", "温浴"] },
      { title: "湯船・足湯まわり", query: "足湯 バケツ 折りたたみ 入浴", reason: "足元を温めて、重さをためにくくします。", tags: ["入浴", "足元"] },
    ],
    eat: [
      { title: "温かい飲み物・香味系", query: "しょうが湯 ノンカフェイン", reason: "冷たさや停滞を増やしにくく、動き出しを助けます。", tags: ["温かい", "香味"] },
    ],
    point: [
      { title: "ふくらはぎ・足裏ケア", query: "ふくらはぎ ローラー 足裏 ツボ", reason: "下半身の重さや同じ姿勢の停滞を切ります。", tags: ["足元", "巡り"] },
    ],
  },
  nagasu: {
    live: [
      { title: "湿気をためない部屋まわり", query: "除湿 ルームドライ 防湿", reason: "湿気の日の重だるさを部屋のこもりから減らします。", tags: ["湿気", "部屋"] },
      { title: "足元を軽く保つもの", query: "レッグウォーマー 薄手 足首", reason: "冷やしすぎず、下半身の重さをためにくくします。", tags: ["足元", "冷え対策"] },
    ],
    eat: [
      { title: "はとむぎ茶・黒豆茶系", query: "はとむぎ茶 黒豆茶 ノンカフェイン", reason: "冷たい甘い飲み物に偏らず、重さを残しにくくします。", tags: ["お茶", "ノンカフェイン"] },
      { title: "はとむぎ・小豆茶系", query: "はとむぎ 小豆 とうもろこし茶 ノンカフェイン", reason: "冷たい甘い飲み物に偏らず、重さを残しにくい一杯です。", tags: ["お茶", "湿気"] },
    ],
    point: [
      { title: "足首・ふくらはぎを流す道具", query: "ふくらはぎ マッサージ ローラー", reason: "むくみ感や下半身の重さを足元から逃がします。", tags: ["むくみ", "足元"] },
    ],
  },
  uruosu: {
    live: [
      { title: "乾燥を減らす環境づくり", query: "卓上 加湿器 寝室", reason: "乾燥で目・喉・肌が疲れやすい日に備えます。", tags: ["乾燥", "寝室"] },
      { title: "のど・口元を守るもの", query: "保湿 マスク 就寝用", reason: "乾きが夜〜朝に残りやすい人の候補です。", tags: ["喉", "保湿"] },
    ],
    eat: [
      { title: "ルイボス・黒豆茶系", query: "ルイボス 黒豆茶 ノンカフェイン", reason: "乾いた菓子やコーヒーだけに偏らない一杯です。", tags: ["お茶", "乾燥"] },
    ],
    point: [
      { title: "やさしいストレッチ補助", query: "ストレッチ バンド やわらかい", reason: "強く流すより、こわばりをやさしくほどきます。", tags: ["やさしく", "伸ばす"] },
    ],
  },
  nukumeru: {
    live: [
      { title: "腹巻き・お腹まわりの温め", query: "腹巻き 薄手 温活", reason: "お腹や腰腹まわりの冷えを守ります。", tags: ["お腹", "温活"] },
      { title: "湯たんぽ・足元温熱", query: "湯たんぽ 足元 温熱", reason: "足元や下腹部から冷えを残しにくくします。", tags: ["足元", "冷え"] },
    ],
    eat: [
      { title: "しょうが湯・温かい飲み物", query: "しょうが湯 ノンカフェイン 温活", reason: "内側を冷やしっぱなしにしない一杯です。", tags: ["温かい", "胃腸"] },
    ],
    point: [
      { title: "腰腹・足元をゆるめるセルフケア", query: "足裏 ツボ 押し グッズ", reason: "冷えで縮こまりやすい足元から整えます。", tags: ["足裏", "冷え"] },
    ],
  },
  sasaeru: {
    live: [
      { title: "睡眠と回復を削らない環境", query: "睡眠 グッズ アイマスク 耳栓", reason: "無理を重ねず、休む時間を先に確保します。", tags: ["睡眠", "回復"] },
      { title: "胃腸を冷やさない暮らし用品", query: "腹巻き 薄手 お腹 冷え", reason: "胃腸や下腹部の冷えを守ります。", tags: ["胃腸", "お腹"] },
    ],
    eat: [
      { title: "なつめ・黒豆・穀物茶系", query: "なつめ 黒豆 穀物茶 ノンカフェイン", reason: "無理に食べ物を増やさず、日々の一杯から余力を支えます。", tags: ["お茶", "支える"] },
      { title: "栄養補助・食生活サポート", query: "ビタミンB群 サプリ", reason: "食事が乱れがちな日に、不足しやすい栄養を見直します。", tags: ["補う", "食生活"] },
    ],
    point: [
      { title: "足三里・胃腸まわりのセルフケア", query: "足三里 ツボ押し グッズ", reason: "だるさ・胃腸の重さ・下半身の重さをまとめて見たい時に。", tags: ["胃腸", "足三里"] },
    ],
  },
};

function getPolicyIconPath(policyKey) {
  return `/illust/policy/policy-${policyKey}.svg`;
}

function getCoreIconPath(coreCode) {
  const fileMap = {
    accel_batt_small: "cheetah.webp",
    accel_batt_standard: "wolf.webp",
    accel_batt_large: "orca.webp",
    brake_batt_small: "hedgehog.webp",
    brake_batt_standard: "penguin.webp",
    brake_batt_large: "elephant.webp",
  };

  return fileMap[coreCode] ? `/illust/core/${fileMap[coreCode]}` : "";
}

function makeRakutenSearchUrl(query) {
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(query)}/`;
}

function getCareNaviAnonId() {
  if (typeof window === "undefined") return "";

  const key = "totonoucare_care_navi_anon_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `anon_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(key, generated);
  return generated;
}

function compactForecastSummary(bundle) {
  const forecast = bundle?.forecast || {};
  const riskContext = getRiskContext(bundle || {});

  return {
    date: bundle?.date || forecast?.date || null,
    riskLevel: riskContext?.level || riskContext?.riskLevel || forecast?.risk_level || null,
    triggerFactors: getForecastTriggerFactors(forecast).slice(0, 6),
  };
}

async function postCareItemClick({ item, itemPosition, context }) {
  if (!item) return;

  const anonId = getCareNaviAnonId();
  const { data: sessionData } = supabase?.auth
    ? await supabase.auth.getSession()
    : { data: { session: null } };

  await fetch("/api/care-navi/click", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionData?.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {}),
    },
    body: JSON.stringify({
      anonId,
      item,
      itemPosition,
      context,
    }),
    keepalive: true,
  }).catch(() => {});
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function unique(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function createPolicyScoreMap(initial = {}) {
  const scores = Object.fromEntries(Object.keys(POLICY_META).map((key) => [key, 0]));
  Object.entries(initial || {}).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(scores, key)) {
      scores[key] = Number(value || 0);
    }
  });
  return scores;
}

function addPolicyScore(scores, key, value = 1) {
  if (!key || !Object.prototype.hasOwnProperty.call(scores, key)) return;
  scores[key] += Number(value || 0);
}

function addPolicyKeys(scores, keys, weight = 1) {
  safeArray(keys).forEach((key, index) => {
    addPolicyScore(scores, key, Number(weight || 0) * (index === 0 ? 1 : 0.82));
  });
}

function selectPolicyKeysFromScores(scores, fallbackKeys = ["yurumeru", "nagasu"]) {
  const ranked = Object.entries(scores || {})
    .map(([key, score]) => ({ key, score: Number(score || 0) }))
    .filter((item) => item.score > 0 && POLICY_META[item.key])
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return safeArray(fallbackKeys).filter((key) => POLICY_META[key]).slice(0, 2);

  const selected = [ranked[0]];
  const second = ranked.find((item) => item.key !== ranked[0].key);

  if (second) selected.push(second);

  const third = ranked.find((item) => !selected.some((selectedItem) => selectedItem.key === item.key));
  const shouldShowThird =
    third &&
    second &&
    (
      third.score >= second.score * 0.9 ||
      Math.abs(second.score - third.score) <= 0.28
    );

  if (shouldShowThird) selected.push(third);

  return selected.map((item) => item.key).slice(0, 3);
}

function softenSupportPolicy(scores, { hasDirectSupport = false } = {}) {
  if (!scores || !Number(scores.sasaeru || 0)) return scores;

  const topOther = Math.max(
    0,
    ...Object.entries(scores)
      .filter(([key]) => key !== "sasaeru")
      .map(([, value]) => Number(value || 0))
  );

  // 「ささえる」は回復土台として便利だが、何にでも出ると商品棚の意味がぼやける。
  // 明確に必要な時以外は少しだけ緩衝し、ゆるめる/ながす/ぬくめる等の主方針を前に出す。
  if (topOther > 0 && Number(scores.sasaeru || 0) < topOther * 1.22) {
    scores.sasaeru *= hasDirectSupport ? 0.9 : 0.74;
  }

  return scores;
}

function getSeasonKey() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 4) return "spring";
  if (month >= 5 && month <= 6) return "rainy";
  if (month >= 7 && month <= 8) return "summer";
  if (month >= 9 && month <= 10) return "autumn";
  return "winter";
}

function buildKarteCarePreferences(profile, symptomKey) {
  const computed = profile?.computed || {};

  return buildBaseCarePreferences({
    answers: {
      symptom_focus: symptomKey,
      env_vectors: safeArray(computed?.env?.vectors),
    },
    computed: {
      ...computed,
      core_code: profile?.core_code || computed?.core_code || null,
      sub_labels: safeArray(profile?.sub_labels || computed?.sub_labels),
      symptom_focus: symptomKey,
    },
    symptomKey,
  });
}

function buildConditionPolicyKeys({ baseScores, extraPolicyKeys = [], extraWeight = 1, baseWeight = 0.55, fallbackKeys = ["yurumeru", "nagasu"] } = {}) {
  const scores = createPolicyScoreMap();

  Object.entries(baseScores || {}).forEach(([key, value]) => {
    addPolicyScore(scores, key, Number(value || 0) * baseWeight);
  });

  addPolicyKeys(scores, extraPolicyKeys, extraWeight);
  softenSupportPolicy(scores, { hasDirectSupport: safeArray(extraPolicyKeys).includes("sasaeru") });

  return selectPolicyKeysFromScores(scores, fallbackKeys);
}

function getLifePolicyKeys(lifeKeys, baseScores) {
  const selectedLife = LIFE_OPTIONS.filter((item) => lifeKeys.includes(item.key));
  const lifePolicyKeys = selectedLife.flatMap((item) => item.policies);

  return buildConditionPolicyKeys({
    baseScores,
    extraPolicyKeys: lifePolicyKeys,
    extraWeight: 1.25,
    baseWeight: 0.52,
    fallbackKeys: ["sasaeru", "yurumeru"],
  });
}

function mergePolicyKeysWithLife(policyKeys, lifeKeys, baseScores) {
  if (!lifeKeys?.length) return policyKeys;

  const selectedLife = LIFE_OPTIONS.filter((item) => lifeKeys.includes(item.key));
  const lifePolicyKeys = selectedLife.flatMap((item) => item.policies);
  const scores = createPolicyScoreMap();

  Object.entries(baseScores || {}).forEach(([key, value]) => {
    addPolicyScore(scores, key, Number(value || 0) * 0.32);
  });

  addPolicyKeys(scores, policyKeys, 1.45);
  addPolicyKeys(scores, lifePolicyKeys, 1.25);
  softenSupportPolicy(scores, { hasDirectSupport: safeArray(policyKeys).includes("sasaeru") || lifePolicyKeys.includes("sasaeru") });

  return selectPolicyKeysFromScores(scores, policyKeys?.length ? policyKeys : ["sasaeru", "yurumeru"]);
}

function pickCandidates(policyKeys, categoryKey) {
  const rows = [];
  for (const policyKey of policyKeys) {
    for (const item of CARE_ITEM_LIBRARY[policyKey]?.[categoryKey] || []) {
      rows.push({ ...item, policyKey, category: categoryKey });
    }
  }
  return rows.slice(0, 8);
}

function getPriceBandRange(categoryKey, priceBand) {
  if (priceBand === "all") return null;
  return PRICE_BAND_RANGES[categoryKey]?.[priceBand] || null;
}

function itemMatchesPriceBand(item, categoryKey, priceBand) {
  if (priceBand === "all") return true;

  const price = Number(item?.price || 0);
  if (!price) return false;

  const range = getPriceBandRange(categoryKey, priceBand);
  if (!range) return true;

  if (range.min && price < range.min) return false;
  if (range.max && price > range.max) return false;
  return true;
}

function getPriceBandLabel(categoryKey, priceBand) {
  if (priceBand === "all") return "おすすめ順";
  return getPriceBandRange(categoryKey, priceBand)?.label || "";
}

function getCategoryMeta(key) {
  return CATEGORY_OPTIONS.find((item) => item.key === key) || CATEGORY_OPTIONS[0];
}

function polishCareReason(reason) {
  let text = String(reason || "").trim();
  if (!text) return "今の条件に合わせて選びやすいアイテムです。";

  const exact = {
    "胃腸まわりの重さを直接商品名にせず、足元から整える候補です。": "胃腸の重さが気になる日に、足元から軽く整えます。",
    "甘いものやカフェインだけで粘らないための候補です。": "甘いものやカフェインだけで粘らず、温かく軽く整えます。",
    "活動量が落ちやすい日の補う候補です。": "活動量が落ちやすい日に、不足しやすい栄養を補いやすくします。",
    "乾きが夜〜朝に残りやすい人の候補です。": "夜〜朝に乾きが残りやすいとき、口元や喉を守りやすくします。",
    "冷えや重さを残しにくい軽い温かい候補です。": "冷えや重さを残しにくい、軽く温かい選択です。",
    "冷えで腰が重くなりやすい日の温かい候補です。": "冷えで腰が重くなりやすい日に、温かく整えます。",
    "眠る前に体の張りをほどく入浴候補です。": "眠る前の体の張りを、入浴でほどきやすくします。",
  };
  if (exact[text]) return exact[text];

  text = text
    .replace(/飲み物候補です。/g, "飲み物として選びやすいです。")
    .replace(/入浴候補です。/g, "入浴まわりの選択肢です。")
    .replace(/セルフケア候補です。/g, "セルフケアとして選びやすいです。")
    .replace(/ケア候補です。/g, "ケアとして選びやすいです。")
    .replace(/食事候補です。/g, "食事として選びやすいです。")
    .replace(/休息習慣に合わせる候補です。/g, "休息習慣に合わせやすいです。")
    .replace(/休息習慣へ寄せる候補です。/g, "休息習慣へ寄せやすいです。")
    .replace(/休む環境づくりに向いた候補です。/g, "休む環境づくりに向いています。")
    .replace(/選びやすい候補です。/g, "選びやすいです。")
    .replace(/足しやすい候補です。/g, "足しやすいです。")
    .replace(/使いやすい候補です。/g, "使いやすいです。")
    .replace(/残しにくくする候補です。/g, "残しにくくします。")
    .replace(/増やしにくい候補です。/g, "増やしにくい選択です。")
    .replace(/偏りにくくする候補です。/g, "偏りにくくします。")
    .replace(/冷やしにくくする候補です。/g, "冷やしにくくします。")
    .replace(/守りやすい候補です。/g, "守りやすくします。")
    .replace(/温める候補です。/g, "温めやすくします。")
    .replace(/整える候補です。/g, "整えやすくします。")
    .replace(/作る候補です。/g, "作りやすくします。")
    .replace(/切り替える候補です。/g, "切り替えやすくします。")
    .replace(/逃がす候補です。/g, "逃がしやすくします。")
    .replace(/ほどく候補です。/g, "ほどきやすくします。")
    .replace(/補う候補です。/g, "補いやすくします。")
    .replace(/足す候補です。/g, "足しやすくします。")
    .replace(/減らす候補です。/g, "減らしやすくします。")
    .replace(/高ぶりを残しにくくする候補です。/g, "高ぶりを残しにくくします。")
    .replace(/候補です。/g, "選択肢です。");

  return text;
}

function CheckOrbitMark() {
  return (
    <svg viewBox="0 0 160 160" className="absolute -right-5 -top-6 h-40 w-40 opacity-90" aria-hidden="true">
      <circle cx="82" cy="78" r="46" fill="none" stroke="#B6D8CF" strokeWidth="1.8" />
      <circle cx="82" cy="78" r="68" fill="none" stroke="#E3F3EE" strokeWidth="1.5" />
      <path d="M38 110 A68 68 0 0 1 72 12" fill="none" stroke="#138A73" strokeWidth="3" strokeLinecap="round" opacity="0.62" />
      <path d="M94 13 A68 68 0 0 1 145 80" fill="none" stroke="#E0A22A" strokeWidth="3" strokeLinecap="round" opacity="0.58" />
      <circle cx="122" cy="32" r="5" fill="#E0A22A" opacity="0.48" />
      <circle cx="45" cy="109" r="4" fill="#138A73" opacity="0.58" />
    </svg>
  );
}


function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-black transition-all ring-1",
        active
          ? "border-[var(--accent-dark)] bg-[var(--accent)] text-white ring-[var(--accent)] shadow-[0_12px_24px_-16px_rgba(52,155,131,0.30)]"
          : "border-[#9CCFC4] bg-white text-[#2E6863] ring-[#B6D8CF] shadow-[0_6px_16px_-14px_rgba(19,80,56,0.45)] hover:border-[var(--accent)] hover:bg-[#EAF6F3] hover:text-[var(--accent-dark)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PolicyPill({ policyKey }) {
  const policy = POLICY_META[policyKey] || {};
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#9CCFC4] bg-[#EAF6F3] px-3.5 py-2 text-[13px] font-black text-[var(--accent-ink)] ring-1 ring-[#B6D8CF] shadow-[0_12px_24px_-18px_rgba(52,155,131,0.24)]">
      <img src={getPolicyIconPath(policyKey)} alt="" className="h-6 w-6 shrink-0" loading="lazy" />
      {policy.label || policyKey}
    </span>
  );
}

function CategoryTabs({ value, onChange }) {
  return (
    <div className="rounded-[22px] bg-[#DDF1EC] p-1 ring-1 ring-inset ring-[#9CCFC4] shadow-inner">
      <div className="grid grid-cols-3 gap-1">
        {CATEGORY_OPTIONS.map((item) => {
          const Icon = item.icon;
          const active = value === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={[
                "h-[40px] rounded-[18px] text-[13px] font-black tracking-tight transition-all duration-200 inline-flex items-center justify-center gap-1.5",
                active
                  ? "bg-[var(--accent)] text-white shadow-[0_12px_24px_-16px_rgba(52,155,131,0.30)]"
                  : "bg-white/65 text-[#54726E] hover:bg-white hover:text-[var(--accent-dark)]",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getProductRoleLabel(item) {
  return item?.productRoleLabel || PRODUCT_ROLE_LABELS[item?.productRole] || INTENT_LABELS[item?.intentType] || PRODUCT_TYPE_LABELS[item?.productType] || "ケア候補";
}

function getItemContextLabel(item) {
  const roleLabel = getProductRoleLabel(item);
  if (roleLabel) return `役割：${roleLabel}`;
  const sourceLabel = SOURCE_TYPE_LABELS[item?.sourceType] || SOURCE_TYPE_LABELS[item?.sourceKey];
  if (sourceLabel) return sourceLabel;
  const policy = POLICY_META[item?.policyKey];
  return policy?.label ? `方針：${policy.label}` : "ケア候補";
}

function getReasonPills(item) {
  const pills = [];
  const sourceLabel = SOURCE_TYPE_LABELS[item?.sourceType] || SOURCE_TYPE_LABELS[item?.sourceKey];
  const roleLabel = getProductRoleLabel(item);
  const productLabel = PRODUCT_TYPE_LABELS[item?.productType];
  const policyLabel = POLICY_META[item?.policyKey]?.label;

  if (sourceLabel) pills.push(sourceLabel);
  if (roleLabel) pills.push(roleLabel);
  if (productLabel && productLabel !== roleLabel) pills.push(productLabel);
  if (policyLabel) pills.push(`方針：${policyLabel}`);
  safeArray(item?.tags).forEach((tag) => pills.push(POLICY_META[tag]?.label || tag));

  return unique(pills).slice(0, 6);
}

function ResultCard({ item, itemPosition, trackingContext }) {
  const contextLabel = getItemContextLabel(item);
  const reasonPills = getReasonPills(item);
  const meta = getCategoryMeta(item.category);
  const Icon = meta.icon;
  const isPartner = item.source === "a8" || item.sourceType === "partner";
  const itemUrl = item.itemUrl || item.clickUrl || makeRakutenSearchUrl(item.query);
  const priceText = item.price ? `${Number(item.price).toLocaleString("ja-JP")}円` : "";
  const reviewText = item.reviewAverage && item.reviewCount
    ? `★${Number(item.reviewAverage).toFixed(1)} / ${Number(item.reviewCount).toLocaleString("ja-JP")}件`
    : "";
  const buttonText = item.buttonText || (isPartner ? "公式サイトで詳しく見る" : "楽天で見る");

  function handleClick() {
    postCareItemClick({
      item: { ...item, itemUrl },
      itemPosition,
      context: trackingContext,
    });
  }

  return (
    <div className="relative overflow-hidden rounded-[26px] bg-white p-4 ring-1 ring-[var(--ring-strong)] shadow-[0_16px_38px_-24px_rgba(15,35,35,0.28)]">
      <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-[var(--accent)]/75" />

      {isPartner && item.impressionUrl ? (
        <img
          src={item.impressionUrl}
          alt=""
          width="1"
          height="1"
          className="pointer-events-none absolute h-px w-px opacity-0"
          loading="lazy"
        />
      ) : null}

      <div className="flex gap-3 pl-1">
        <div
          className={[
            "grid shrink-0 place-items-center overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#F5FBF8_0%,#FFF2CF_100%)] text-[var(--accent-ink)] ring-1 ring-[#B6D8CF] shadow-sm",
            isPartner ? "h-[92px] w-[112px]" : "h-[88px] w-[88px]",
          ].join(" ")}
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className={isPartner ? "h-full w-full object-contain" : "h-full w-full object-cover"}
              loading="lazy"
            />
          ) : (
            <Icon className="h-8 w-8 opacity-85" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="line-clamp-2 text-[14px] font-black leading-6 text-slate-900">{item.title}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-black text-[#356D68]">
                <img src={getPolicyIconPath(item.policyKey)} alt="" className="h-5 w-5 shrink-0" loading="lazy" />
                {contextLabel}
              </div>
            </div>
          </div>

          {priceText || item.shopName || reviewText ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black text-slate-500">
              {priceText ? <span className="text-[var(--accent-ink)]">{priceText}</span> : null}
              {item.shopName ? <span>{item.shopName}</span> : null}
              {reviewText ? <span>{reviewText}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 pl-1">
        {reasonPills.map((tag) => {
          const label = tag;
          return (
            <span key={tag} className="rounded-full border border-[#B6D8CF] bg-[#F5FBF8] px-2.5 py-1 text-[10px] font-black text-[#4B6B67] ring-1 ring-[#C6E1DA]">
              {label}
            </span>
          );
        })}
        {!isPartner && item.query ? (
          <span className="rounded-full bg-[#FFF2CC] px-2.5 py-1 text-[10px] font-black text-[#8B640C] ring-1 ring-[#E4C56B]">
            {item.query}
          </span>
        ) : null}
      </div>

      <a
        href={itemUrl}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        onClick={handleClick}
        className="mt-3 inline-flex w-full items-center justify-center rounded-[18px] bg-[var(--accent)] px-4 py-2.5 text-[12px] font-black text-white shadow-[0_14px_28px_-18px_rgba(52,155,131,0.28)] hover:bg-[var(--accent-ink)]"
      >
        {buttonText}
      </a>
    </div>
  );
}

function RakutenLoadingCards() {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-[26px] bg-white p-4 ring-1 ring-[var(--ring-strong)] shadow-[0_16px_38px_-24px_rgba(15,35,35,0.28)]"
        >
          <div className="flex gap-3">
            <div className="h-[78px] w-[78px] shrink-0 animate-pulse rounded-[20px] bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function PriceBandFilter({ value, onChange, categoryKey }) {
  return (
    <div className="rounded-[22px] bg-[#EAF6F3] p-3 ring-1 ring-[#9CCFC4]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[10px] font-black tracking-[0.14em] text-slate-400">価格帯</div>
        <div className="text-[10px] font-bold text-slate-400">おすすめ順はそのまま</div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {PRICE_BAND_OPTIONS.map((option) => {
          const active = value === option.key;
          const rangeLabel = getPriceBandLabel(categoryKey, option.key);

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={[
                "rounded-[16px] px-2 py-2 text-center transition-all ring-1",
                active
                  ? "bg-[var(--accent)] text-white ring-[var(--accent)] shadow-[0_12px_24px_-16px_rgba(52,155,131,0.30)]"
                  : "bg-white text-slate-600 ring-[var(--ring)] hover:bg-[#EAF6F3] hover:text-slate-900",
              ].join(" ")}
            >
              <div className="text-[11px] font-black leading-4">{option.label}</div>
              {option.key !== "all" ? (
                <div className={["mt-0.5 text-[8px] font-black leading-3", active ? "text-white/80" : "text-slate-400"].join(" ")}>
                  {rangeLabel}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RakutenStatusCard({ error, onRetry, loading }) {
  if (error) {
    return (
      <div className="rounded-[22px] bg-[#FFF7E8] p-4 text-[12px] font-bold leading-6 text-[#77540B] ring-1 ring-[#E4C56B]/70">
        <div>商品候補の読み込みがうまくいきませんでした。</div>
        <div className="mt-1 text-[11px] leading-5 text-[#A36E14]">
          通信が混み合っている可能性があります。少し時間をおいて、もう一度検索してください。
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className={[
            "mt-3 rounded-full px-3 py-2 text-[11px] font-black ring-1 transition-all",
            loading
              ? "cursor-not-allowed bg-white/70 text-slate-400 ring-[#E4C56B]/60"
              : "bg-white text-[#77540B] ring-[#E4C56B] hover:bg-[#FFF1CB]",
          ].join(" ")}
        >
          {loading ? "再検索中..." : "もう一度検索する"}
        </button>
      </div>
    );
  }

  // 検索語は内部ログ用。ユーザー画面では紛らわしいため表示しない。
  return null;
}



function getSetModeMeta(mode) {
  return SET_MODE_OPTIONS.find((item) => item.key === mode) || SET_MODE_OPTIONS[0];
}

function getSetItemKey(item) {
  return item?.itemUrl || item?.clickUrl || item?.itemCode || `${item?.source || "item"}:${item?.title || ""}:${item?.shopName || ""}`;
}


function normalizeDiversityText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\[\]【】（）()〈〉<>「」『』]/g, " ")
    .replace(/\d+(個|袋|包|本|粒|g|kg|ml|l|箱|セット|日分|枚|回|杯|pc|pcs|cm|mm|円|%|％)?/gi, " ")
    .replace(/送料無料|送料込|メール便|ポイント|セール|限定|お試し|おためし|セット|まとめ買い|訳あり|新品|正規品|公式|ランキング|最安|特価|クーポン|レビュー/g, " ")
    .replace(/[|｜/／・,，.。:：;；!！?？~〜\-＿_+＋*＊#＃]/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

function getShopDiversityKey(item) {
  const shop = normalizeDiversityText(item?.shopName || item?.shop || "");
  // A8は provider が同じでも実際の提携先が異なるため、provider だけでは縛らない。
  return shop ? `shop:${shop.slice(0, 24)}` : "";
}

function getFamilyDiversityKey(item) {
  const family = normalizeDiversityText(item?.familyKey || "");
  if (family) return `family:${family.slice(0, 42)}`;
  const title = normalizeDiversityText(item?.title || item?.itemName || "");
  return title ? `family:${item?.category || "item"}:${item?.productType || item?.productRole || "general"}:${title.slice(0, 24)}` : "";
}

function getTitleSignatureKey(item) {
  const title = normalizeDiversityText(item?.title || item?.itemName || "");
  if (!title) return "";
  // 同一ショップではない近似商品も軽くばらすための署名。短すぎる語は誤判定しやすいので使わない。
  const signature = title.slice(0, title.length >= 18 ? 18 : 14);
  return signature.length >= 8 ? `sig:${item?.category || "item"}:${signature}` : "";
}

function createDiversityState() {
  return { shopCounts: new Map(), familyCounts: new Map(), signatureCounts: new Map() };
}

function cloneDiversityState(state) {
  return {
    shopCounts: new Map(state?.shopCounts || []),
    familyCounts: new Map(state?.familyCounts || []),
    signatureCounts: new Map(state?.signatureCounts || []),
  };
}

function incrementDiversityMap(map, key) {
  if (!key) return;
  map.set(key, Number(map.get(key) || 0) + 1);
}

function registerItemDiversity(item, diversity) {
  if (!diversity) return;
  incrementDiversityMap(diversity.shopCounts, getShopDiversityKey(item));
  incrementDiversityMap(diversity.familyCounts, getFamilyDiversityKey(item));
  incrementDiversityMap(diversity.signatureCounts, getTitleSignatureKey(item));
}

function scoreDiversityPenalty(item, diversity) {
  if (!diversity) return 0;
  const shopCount = Number(diversity.shopCounts?.get(getShopDiversityKey(item)) || 0);
  const familyCount = Number(diversity.familyCounts?.get(getFamilyDiversityKey(item)) || 0);
  const signatureCount = Number(diversity.signatureCounts?.get(getTitleSignatureKey(item)) || 0);

  let penalty = 0;
  // ブランドを加点するのではなく、同じ棚・同じような商品が続きすぎる時だけ抑える。
  if (familyCount >= 1) penalty -= familyCount >= 2 ? 44 : 30;
  if (signatureCount >= 1) penalty -= signatureCount >= 2 ? 34 : 16;
  if (shopCount >= 1) penalty -= shopCount >= 2 ? 28 : 7;
  return penalty;
}

function itemText(item) {
  return `${item?.title || ""} ${item?.itemName || ""} ${item?.itemCaption || ""} ${item?.query || ""} ${safeArray(item?.tags).join(" ")} ${item?.shopName || ""}`.toLowerCase();
}

function itemEvidenceText(item) {
  // 商品そのものの用途判定では、検索語・プラン由来タグを混ぜない。
  // ここを混ぜると、麦茶が生姜系扱いになる等の事故が起きる。
  return `${item?.title || ""} ${item?.itemName || ""} ${item?.itemCaption || ""} ${item?.reason || ""} ${item?.shopName || ""}`.toLowerCase();
}

function hasAnyText(item, keywords = []) {
  const text = itemEvidenceText(item);
  return safeArray(keywords).some((keyword) => text.includes(String(keyword || "").toLowerCase()));
}

const POINT_BEAUTY_REJECT_PATTERN = /(小顔|美顔|美容|フェイス|顔|表情筋|ほうれい線|リフトアップ|美肌|しわ|シワ|たるみ|かっさ|カッサ|フェイシャル)/;
const FIRST_AID_REJECT_PATTERN = /(絆創膏|ばんそうこう|バンドエイド|キズテープ|傷テープ|キズパワーパッド|ムヒのキズ|救急絆|創傷|傷口|切り傷|擦り傷|すり傷|靴ずれ|あかぎれ|ひび割れ|ガーゼ|包帯|消毒|殺菌|サージカルテープ|防水フィルム|防水タイプ)/i;
const MEDICAL_SUPPORT_REJECT_PATTERN = /(腱鞘炎|ドケルバン|ばね指|バネ指|サポーター|リストガード|手首ガード|固定|矯正|コルセット|ギプス|外反母趾|テーピング|一般医療機器|管理医療機器|医療用|病院用|湿布|貼付|磁気治療|低周波治療器|EMS|膝用|手首用|足首用|腰痛ベルト|頚椎カラー|牽引|リハビリ|介護用品)/i;
// 楽天検索結果に紛れやすいが、MYケアセレクトの人向け導線からは外す。
const PET_PRODUCT_REJECT_PATTERN = /(ペット用品|ペットフード|犬用|猫用|犬猫|犬・猫|猫犬|犬\s*猫|ドッグフード|キャットフード|ドッグ|キャット|わんこ|ワンちゃん|にゃんこ|うさぎ用|ウサギ用|小動物用|鳥用|爬虫類用|愛犬|愛猫)/i;
const LOW_CONTEXT_OLIGO_REJECT_PATTERN = /(オリゴ糖|イヌリン|フラクトオリゴ糖|ガラクトオリゴ糖|難消化性デキストリン)/i;
const BEDDING_ITEM_PATTERN = /(枕|まくら|ピロー|pillow|マットレス|寝具|寝敷|敷布団|掛け布団|毛布|ブランケット|睡眠|寝返り)/i;
const WARMING_PAD_PATTERN = /(温熱|温め|あったか|ホット|発熱|遠赤外線|カイロ|貼るカイロ|貼って温|湿熱|温活)/i;
const TRUE_DRINKWARE_PATTERN = /(水筒|タンブラー|マグボトル|保温ボトル|真空断熱|ステンレスボトル|保冷ボトル)/i;
const READY_TO_DRINK_PATTERN = /(ペットボトル|500ml|350ml|280ml|飲料|清涼飲料|ボトル缶)/i;
const LOW_VALUE_SUPERMARKET_FOOD_PATTERN = /(味噌汁|みそ汁|インスタントスープ|フリーズドライ|雑炊|おかゆ|リゾット|レトルト|常温保存|常温 保存|備蓄用?スープ)/i;
const HIGH_CONTEXT_MEAL_PATTERN = /(プロテイン|たんぱく|タンパク|完全栄養|栄養補助|GREEN\s*SPOON|グリーンスプーン|宅食|ミール|メディミール|nosh|ナッシュ)/i;

function isLowValueSupermarketFoodItem(item) {
  if (item?.category !== "eat") return false;
  const text = itemEvidenceText(item);
  if (!text) return false;
  if (HIGH_CONTEXT_MEAL_PATTERN.test(text)) return false;
  const roleLooksMeal = ["light_meal", "pantry_soup"].includes(item?.productRole) || ["light_meal", "pantry_soup"].includes(item?.intentType) || item?.productType === "soupMeal";
  return roleLooksMeal && LOW_VALUE_SUPERMARKET_FOOD_PATTERN.test(text);
}

function isPointBeautyItem(item) {
  return item?.category === "point" && POINT_BEAUTY_REJECT_PATTERN.test(itemEvidenceText(item));
}

function isFirstAidItem(item) {
  return FIRST_AID_REJECT_PATTERN.test(itemEvidenceText(item));
}

function isMedicalSupportItem(item) {
  return MEDICAL_SUPPORT_REJECT_PATTERN.test(itemEvidenceText(item));
}

function isPetProductItem(item) {
  return PET_PRODUCT_REJECT_PATTERN.test(itemEvidenceText(item));
}

function isLowContextOligoItem(item) {
  return item?.category === "eat" && LOW_CONTEXT_OLIGO_REJECT_PATTERN.test(itemEvidenceText(item));
}

const POINT_AREA_RULES = [
  { key: "face", pattern: /(小顔|美顔|美容|フェイス|顔|表情筋|ほうれい線|リフトアップ|美肌|しわ|シワ|たるみ|かっさ|カッサ|フェイシャル)/ },
  { key: "neck_shoulder", pattern: /(首|肩|肩甲骨|ネック|ショルダー|僧帽筋|肩こり)/ },
  { key: "low_back", pattern: /(腰|背中|骨盤|仙骨|臀部|お尻|股関節|太もも|ハムストリング|フォームローラー|ストレッチポール)/ },
  { key: "foot_leg", pattern: /(足裏|足首|足元|足つぼ|足ツボ|ふくらはぎ|脚|レッグ|フット|土踏まず|ふみっぱ|青竹踏み)/ },
  { key: "eye_head", pattern: /(目元|アイマスク|こめかみ|頭皮|ヘッド|頭)/ },
  { key: "hand_arm", pattern: /(手首|手のひら|手元|指|腕|前腕|ハンド|リスト)/ },
];

function inferPointAreas(item) {
  if (item?.category !== "point") return [];
  const text = itemEvidenceText(item);
  return POINT_AREA_RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.key);
}

function inferRoleLabelFromItem(item) {
  const text = itemEvidenceText(item);

  if (item?.category === "eat") {
    if (TRUE_DRINKWARE_PATTERN.test(text) && !READY_TO_DRINK_PATTERN.test(text)) return "温かい一杯の道具";
    if (/味噌汁|みそ汁|スープ|雑炊|おかゆ|リゾット/.test(text)) return "軽めの食事";
    if (/茶|ティー|ルイボス|ハーブ|麦茶|はとむぎ|ハトムギ|しょうが湯|生姜湯/.test(text)) return "素材の一杯";
  }

  if (item?.category === "point") {
    if (WARMING_PAD_PATTERN.test(text)) return "温めてゆるめる";
    if (/ストレッチ|伸ばす|フォームローラー|ストレッチポール|ヨガマット/.test(text)) return "姿勢を切り替える";
  }

  const roleLabel = getProductRoleLabel(item);
  if (roleLabel && roleLabel !== "ケア候補") return roleLabel;

  const category = item?.category;
  if (category === "live") return "暮らしを整える";
  if (category === "eat") return "食べ方を整える";
  if (category === "point") return "体をほぐす";
  return "ケア候補";
}


const LIVE_KIND_RULES = [
  { key: "reduce_light", pattern: /(アイマスク|耳栓|遮光|遮音|ブルーライト|目元|ホットアイ)/i },
  { key: "sleep_environment", pattern: /(枕|まくら|ピロー|pillow|マットレス|寝具|寝敷|敷布団|掛け布団|毛布|ブランケット|睡眠|寝返り)/i },
  { key: "warm_body", pattern: /(腹巻|湯たんぽ|レッグウォーマー|ネックウォーマー|ウォーマー|カイロ|温熱|発熱|遠赤外線|毛布)/i },
  { key: "bath_shift", pattern: /(入浴剤|バスソルト|炭酸|温浴|足湯|浴用|バス)/i },
  { key: "humidity_control", pattern: /(除湿|湿気|防湿|ドライ|炭八|湿気取り|除湿剤|サーキュレーター)/i },
  { key: "moisture_air", pattern: /(加湿|乾燥|保湿|マスク|うるおい)/i },
];

function inferLiveKinds(item) {
  if (item?.category !== "live") return [];
  const text = itemEvidenceText(item);
  return LIVE_KIND_RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.key);
}

function liveItemHasSlotMeaning(item, slot) {
  const roles = safeArray(slot?.roles);
  const kinds = inferLiveKinds(item);
  const keywordMatched = safeArray(slot?.keywords).length && hasAnyText(item, slot.keywords);

  // 暮らす枠は「商品名がたまたまキーワードを含む」だけでは通さない。
  // 枕・寝具・入浴・温熱・湿度・光刺激など、暮らし側の用途が商品側から読めることを必須にする。
  if (roles.length && kinds.some((kind) => roles.includes(kind))) return true;
  if (keywordMatched && kinds.length) return true;
  if ((item.source === "a8" || item.sourceType === "partner") && roles.includes(item.productRole)) return true;
  return false;
}

function makeSlot(category, roles = [], keywords = [], extra = {}) {
  return { category, roles, keywords, ...extra };
}

function eatSlot(policyKey, subtypeKey = "default") {
  if (policyKey === "nukumeru") return makeSlot("eat", ["warm_drink", "ingredient"], ["生姜", "しょうが", "ジンジャー", "陳皮", "シナモン", "黒豆", "温かい"], { teaDirections: ["warming"] });
  if (policyKey === "meguraseru") return makeSlot("eat", ["warm_drink", "ingredient"], ["生姜", "黒豆", "陳皮", "シナモン", "穀物", "温かい"], { teaDirections: ["warming", "support"] });
  if (policyKey === "nagasu") return makeSlot("eat", ["warm_drink", "ingredient"], ["はとむぎ", "ハトムギ", "とうもろこし", "小豆", "黒豆", "どくだみ"], { teaDirections: ["light"] });
  if (policyKey === "uruosu") return makeSlot("eat", ["warm_drink", "caffeine_shift"], ["ルイボス", "黒豆", "なつめ", "麦茶", "ノンカフェイン"], { teaDirections: ["moist"] });
  if (policyKey === "sasaeru") return makeSlot("eat", ["nutrition_support", "warm_drink", "ingredient"], ["なつめ", "黒豆", "玄米", "穀物", "ルイボス", "ビタミン", "乳酸菌", "酪酸菌"], { teaDirections: ["support"] });
  if (policyKey === "shizumeru") return makeSlot("eat", ["warm_drink", "caffeine_shift"], ["カモミール", "ルイボス", "レモンバーム", "ラベンダー", "ノンカフェイン"], { teaDirections: ["calming"] });
  return makeSlot("eat", ["warm_drink", "caffeine_shift"], ["カモミール", "レモンバーム", "ルイボス", "黒豆", "なつめ", "ハーブ"], { teaDirections: ["calming", "support"] });
}

const SYMPTOM_SET_ANCHORS = {
  fatigue: {
    label: "疲れやすさ",
    pointSlot: () => makeSlot("point", ["gentle_stretch", "posture_release", "foot_leg_release", "neck_shoulder_release"], ["ストレッチ", "フォームローラー", "ストレッチポール", "足裏", "ふくらはぎ", "首", "肩", "背中"], {
      requiredAreas: ["neck_shoulder", "low_back", "foot_leg"],
      avoidKeywords: ["顔", "小顔", "美容", "フェイス", "強力", "電気", "EMS", "低周波"],
    }),
    liveSlot: () => makeSlot("live", ["sleep_environment", "bath_shift", "warm_body", "reduce_light"], ["寝具", "枕", "入浴", "アイマスク", "湯たんぽ", "腹巻", "温熱"]),
    eatSlot: (policyKey) => makeSlot("eat", ["nutrition_support", "warm_drink", "ingredient"], ["なつめ", "黒豆", "玄米", "穀物", "ルイボス", "ビタミン", "乳酸菌", "酪酸菌"], { teaDirections: policyKey === "nagasu" ? ["light", "support"] : ["support", "moist"] }),
    titles: {
      sasaeru: ["疲れやすさ対策", "忙しい日のケア継続セット"],
      shizumeru: ["休む前の刺激対策"],
      yurumeru: ["休む前のこわばり対策"],
      meguraseru: ["軽く動き出す対策"],
      nukumeru: ["冷えやすい日の立て直し対策"],
      nagasu: ["重だるさ対策"],
      uruosu: ["乾きやすい日の水分補給対策"],
    },
  },
  sleep: {
    label: "睡眠",
    pointSlot: () => makeSlot("point", ["neck_shoulder_release", "gentle_stretch", "foot_leg_release"], ["首", "肩", "足裏", "ふくらはぎ", "ストレッチ", "フォームローラー"], {
      requiredAreas: ["neck_shoulder", "foot_leg", "low_back"],
      avoidKeywords: ["顔", "小顔", "美容", "フェイス", "強力", "電気", "EMS", "低周波", "頭皮"]
    }),
    liveSlot: () => makeSlot("live", ["sleep_environment", "reduce_light", "bath_shift", "warm_body"], ["アイマスク", "耳栓", "寝具", "枕", "睡眠", "入浴", "湯たんぽ", "腹巻"]),
    eatSlot: (policyKey) => makeSlot("eat", ["warm_drink", "ingredient"], ["カモミール", "レモンバーム", "ルイボス", "なつめ", "黒豆"], { teaDirections: policyKey === "sasaeru" ? ["support", "calming"] : ["calming", "support"] }),
    titles: {
      shizumeru: ["寝る前の刺激対策", "夜の切り替え対策"],
      yurumeru: ["寝る前のこわばり対策"],
      sasaeru: ["睡眠不足の立て直し対策"],
      nukumeru: ["寝る前の冷え対策"],
      uruosu: ["乾く日の睡眠環境対策"],
      meguraseru: ["寝る前のこり対策"],
      nagasu: ["湿気がこもる日の寝室対策"],
    },
  },
  digestion: {
    label: "胃腸",
    pointSlot: () => makeSlot("point", ["foot_leg_release", "gentle_stretch"], ["足裏", "ふくらはぎ", "足元", "ストレッチ", "ローラー"], {
      requiredAreas: ["foot_leg"],
      avoidKeywords: ["顔", "小顔", "美容", "フェイス", "腹筋", "腹部マッサージ", "痩身", "ダイエット", "EMS", "電気"]
    }),
    liveSlot: () => makeSlot("live", ["bath_shift", "warm_body"], ["入浴", "腹巻", "温熱", "湯たんぽ", "足湯", "レッグウォーマー"]),
    eatSlot: (policyKey) => {
      if (policyKey === "nagasu") return makeSlot("eat", ["warm_drink", "ingredient"], ["はとむぎ", "とうもろこし", "小豆", "黒豆"], { teaDirections: ["light"] });
      if (policyKey === "nukumeru") return makeSlot("eat", ["warm_drink", "ingredient"], ["生姜", "しょうが", "陳皮", "シナモン", "黒豆"], { teaDirections: ["warming"] });
      return makeSlot("eat", ["warm_drink", "ingredient", "nutrition_support"], ["なつめ", "黒豆", "生姜", "しょうが", "ルイボス", "乳酸菌", "酪酸菌"], { teaDirections: ["support", "warming"] });
    },
    titles: {
      sasaeru: ["食事が乱れた日の補助セット"],
      nagasu: ["食べすぎ後の負担対策"],
      nukumeru: ["お腹まわりの冷え対策"],
      meguraseru: ["胃腸と足元のだるさ対策"],
      yurumeru: ["お腹まわりのこわばり対策"],
      shizumeru: ["食後の刺激を増やさない対策"],
      uruosu: ["乾く日の食事・水分補給対策"],
    },
  },
  neck_shoulder: {
    label: "首肩",
    pointSlot: () => makeSlot("point", ["neck_shoulder_release", "tsubo_support", "posture_release"], ["首", "肩", "肩甲骨", "ネック", "ショルダー", "マッサージボール"], { requiredAreas: ["neck_shoulder"], avoidKeywords: ["顔", "小顔", "美容", "フェイス"] }),
    liveSlot: () => makeSlot("live", ["bath_shift", "reduce_light", "sleep_environment", "warm_body"], ["入浴", "温熱", "アイマスク", "寝具", "首", "肩"]),
    eatSlot: (policyKey) => eatSlot(policyKey),
    titles: {
      yurumeru: ["首肩の力み対策", "目元と首肩の緊張対策"],
      meguraseru: ["肩首のこり対策", "画面作業後のこり対策"],
      nukumeru: ["首肩の冷えこわばり対策"],
      shizumeru: ["目と頭の刺激対策"],
      sasaeru: ["首肩に負担をかけにくい休息ケア"],
      nagasu: ["肩まわりの重だるさ対策"],
      uruosu: ["乾く日の目元・首肩ケア"],
    },
  },
  low_back_pain: {
    label: "腰",
    pointSlot: () => makeSlot("point", ["posture_release", "gentle_stretch", "tsubo_support"], ["腰", "背中", "骨盤", "お尻", "股関節", "太もも", "フォームローラー", "ストレッチポール"], { requiredAreas: ["low_back"], avoidKeywords: ["顔", "小顔", "美容", "フェイス", "首専用", "肩専用"] }),
    liveSlot: () => makeSlot("live", ["bath_shift", "warm_body", "sleep_environment"], ["入浴", "温熱", "湯たんぽ", "腹巻", "寝具", "腰", "骨盤"]),
    eatSlot: (policyKey) => eatSlot(policyKey),
    titles: {
      yurumeru: ["腰まわりのこわばり対策", "腰と背中の力み対策"],
      meguraseru: ["腰と背中のこり対策", "座りっぱなしの腰対策"],
      nukumeru: ["腰まわりの冷え対策"],
      sasaeru: ["腰に負担をかけにくい日常ケア"],
      shizumeru: ["寝る前の腰まわりケア"],
      nagasu: ["腰まわりの重だるさ対策"],
      uruosu: ["休む時間の腰まわりケア"],
    },
  },
  swelling: {
    label: "むくみ感",
    pointSlot: () => makeSlot("point", ["foot_leg_release", "gentle_stretch"], ["ふくらはぎ", "足裏", "足首", "足元", "ローラー"], { requiredAreas: ["foot_leg"], avoidKeywords: ["顔", "小顔", "美容", "フェイス", "頭皮"] }),
    liveSlot: () => makeSlot("live", ["humidity_control", "bath_shift", "warm_body"], ["除湿", "入浴", "足湯", "サーキュレーター", "レッグウォーマー"]),
    eatSlot: (policyKey) => policyKey === "nagasu" ? makeSlot("eat", ["warm_drink", "ingredient"], ["はとむぎ", "ハトムギ", "とうもろこし", "小豆", "黒豆"], { teaDirections: ["light"] }) : eatSlot(policyKey),
    titles: {
      nagasu: ["むくみ感対策", "湿気だるさ対策"],
      meguraseru: ["足元のだるさ対策"],
      nukumeru: ["足元の冷え対策"],
      sasaeru: ["足元が重い日のケア継続セット"],
      yurumeru: ["足元のこわばり対策"],
      uruosu: ["汗をかく日の水分補給対策"],
      shizumeru: ["暑さと重だるさ対策"],
    },
  },
  headache: {
    label: "頭・目元",
    pointSlot: (policyKey, context = {}) => {
      const suffix = String(context.titleSuffix || "");
      if (/目元|こめかみ|刺激|乾き/.test(suffix) || policyKey === "shizumeru" || policyKey === "yurumeru") {
        return makeSlot("point", ["tsubo_support", "neck_shoulder_release"], ["目元", "こめかみ", "頭皮", "ヘッド", "頭"], {
          requiredAreas: ["eye_head"],
          avoidKeywords: ["小顔", "美顔", "リフトアップ", "フェイシャル", "フォームローラー", "ストレッチポール", "ヨガポール", "ヨガマット", "体幹", "脚", "足", "腰", "背中", "肩甲骨"],
        });
      }
      return makeSlot("point", ["neck_shoulder_release", "tsubo_support"], ["首", "肩", "肩甲骨", "こめかみ", "頭皮", "ヘッド", "ネック", "ショルダー"], {
        requiredAreas: ["neck_shoulder", "eye_head"],
        avoidKeywords: ["小顔", "美顔", "リフトアップ", "フェイシャル", "腰専用", "脚専用", "足裏", "ふくらはぎ"],
      });
    },
    liveSlot: () => makeSlot("live", ["reduce_light", "sleep_environment", "warm_body"], ["アイマスク", "遮光", "目元", "耳栓", "枕", "まくら", "ピロー", "温熱"]),
    eatSlot: (policyKey) => policyKey === "shizumeru" || policyKey === "yurumeru"
      ? makeSlot("eat", ["warm_drink", "ingredient"], ["カモミール", "レモンバーム", "ルイボス", "黒豆", "菊花"], { teaDirections: ["calming", "moist"] })
      : eatSlot(policyKey),
    titles: {
      shizumeru: ["目と頭の刺激対策", "寝る前の光刺激対策"],
      yurumeru: ["目元とこめかみの緊張対策", "頭まわりのこわばり対策"],
      meguraseru: ["首肩からくる頭の重さ対策", "首肩まわりのこり対策"],
      sasaeru: ["頭が重い日の休息ケア", "休む環境の見直し対策"],
      uruosu: ["目の乾き対策", "乾く日の目元ケア"],
      nukumeru: ["首元の冷え対策", "首肩を冷やさない対策"],
      nagasu: ["湿気で頭が重い日の対策", "湿気と頭の重さ対策"],
    },
  },
  dizziness: {
    label: "めまい",
    pointSlot: (policyKey) => {
      if (["yurumeru", "meguraseru"].includes(policyKey)) {
        return makeSlot("point", ["neck_shoulder_release", "gentle_stretch"], ["首", "肩", "ネック", "ショルダー", "ストレッチ"], {
          requiredAreas: ["neck_shoulder"],
          avoidKeywords: ["強力", "電気", "EMS", "低周波", "首牽引", "矯正", "バランス", "体幹", "踏み台", "顔", "小顔", "美容", "フェイス"]
        });
      }
      return null;
    },
    liveSlot: () => makeSlot("live", ["reduce_light", "sleep_environment", "bath_shift"], ["アイマスク", "耳栓", "遮光", "寝具", "枕", "入浴"], { avoidKeywords: ["トレーニング", "バランス", "踏み台", "矯正"] }),
    eatSlot: (policyKey) => makeSlot("eat", ["warm_drink", "ingredient"], ["ルイボス", "麦茶", "黒豆", "なつめ"], { teaDirections: policyKey === "nagasu" ? ["light", "barley"] : ["moist", "support", "barley"] }),
    titles: {
      sasaeru: ["ふらつきやすい日の休息対策", "休みやすい環境づくり"],
      shizumeru: ["光刺激を減らす対策"],
      yurumeru: ["首肩のこわばりを軽くする対策"],
      meguraseru: ["首肩まわりのこり対策"],
      uruosu: ["水分補給を忘れやすい日の対策"],
      nukumeru: ["冷えやすい日の休息対策"],
      nagasu: ["湿気で重い日の休息対策"],
    },
  },
  mood: {
    label: "気分",
    pointSlot: () => makeSlot("point", ["neck_shoulder_release", "gentle_stretch"], ["首", "肩", "ストレッチ", "フォームローラー"], {
      requiredAreas: ["neck_shoulder", "low_back"],
      avoidKeywords: ["顔", "小顔", "美容", "フェイス", "強力", "電気", "EMS", "低周波"]
    }),
    liveSlot: () => makeSlot("live", ["bath_shift", "reduce_light", "sleep_environment"], ["入浴", "アイマスク", "照明", "睡眠", "寝具"]),
    eatSlot: (policyKey) => makeSlot("eat", ["warm_drink", "ingredient"], ["カモミール", "レモンバーム", "ルイボス", "なつめ", "黒豆"], { teaDirections: policyKey === "shizumeru" ? ["calming", "moist"] : ["calming", "support"] }),
    titles: {
      shizumeru: ["気持ちの高ぶり対策"],
      yurumeru: ["緊張が続いた日の切り替え対策"],
      meguraseru: ["気分が詰まりやすい日のこり対策"],
      sasaeru: ["忙しい日のケア継続セット"],
      nukumeru: ["冷えと緊張の切り替え対策"],
      nagasu: ["食べすぎ・気分の重さ対策"],
      uruosu: ["乾く日の気分切り替え対策"],
    },
  },
};

const DEFAULT_POLICY_TITLES = {
  shizumeru: ["刺激を減らす対策", "寝る前の刺激対策", "暑さと火照り対策", "気持ちの高ぶり対策", "目と頭の刺激対策"],
  yurumeru: ["こわばり対策", "首肩の力み対策", "目元とこめかみの緊張対策", "気圧変化の緊張対策", "入浴前後のこわばり対策"],
  meguraseru: ["こりと冷え対策", "肩首のこり対策", "座りっぱなし対策", "冷えこわばり対策", "気圧低下のだるさ対策"],
  nagasu: ["湿気とむくみ感対策", "湿気だるさ対策", "食べすぎ後の負担対策", "むくみ感対策", "水分バランス対策"],
  uruosu: ["乾燥対策", "のどと肌の乾燥対策", "目の乾き対策", "汗をかく日の水分補給対策", "室内の乾燥対策"],
  nukumeru: ["冷え対策", "冷たい飲み物対策", "足元の冷え対策", "お腹まわりの冷え対策", "寒暖差の冷え対策"],
  sasaeru: ["疲れやすさ対策", "睡眠不足の立て直し対策", "食事が乱れた日の補助セット", "忙しい日のケア継続セット", "季節の変わり目対策"],
};

const LIFE_TITLE_HINTS = {
  screen: { yurumeru: "首肩と目の緊張対策", meguraseru: "画面作業後のこり対策", shizumeru: "目と頭の刺激対策" },
  sleep_short: { shizumeru: "寝る前の刺激対策", sasaeru: "睡眠不足の立て直し対策", yurumeru: "寝る前のこわばり対策" },
  cold_drinks: { nukumeru: "冷たい飲み物対策", meguraseru: "冷えこわばり対策", sasaeru: "食事が乱れた日の補助セット" },
  overeating: { nagasu: "食べすぎ後の負担対策", sasaeru: "食事が乱れた日の補助セット" },
  no_bath: { meguraseru: "入浴前後のこり対策", yurumeru: "入浴前後のこわばり対策", nukumeru: "冷えこわばり対策" },
  low_activity: { meguraseru: "座りっぱなし対策", nagasu: "足元のだるさ対策" },
  tense: { yurumeru: "緊張が続いた日の切り替え対策", shizumeru: "気持ちの高ぶり対策" },
  outdoor: { uruosu: "汗をかく日の水分補給対策", sasaeru: "忙しい日のケア継続セット" },
};


// v7.8: 不調フォーカスを主アンカーにしたまま、生活サイン・天気・体質は「補正」として効かせる。
// ここでは通過条件を広げすぎず、商品選定スコアと茶素材の方向性を軽く補正する。
const LIFE_KIT_PROFILES = {
  screen: {
    live: { boostRoles: ["reduce_light", "sleep_environment"], boostKeywords: ["アイマスク", "遮光", "目元", "耳栓", "ブルーライト"] },
    eat: { teaDirections: ["calming", "moist"], boostKeywords: ["カモミール", "レモンバーム", "ルイボス", "黒豆", "ノンカフェイン"] },
    point: { boostRoles: ["neck_shoulder_release", "tsubo_support"], boostKeywords: ["首", "肩", "こめかみ", "頭皮", "目元", "ヘッド"] },
  },
  sleep_short: {
    live: { boostRoles: ["sleep_environment", "reduce_light", "bath_shift"], boostKeywords: ["枕", "寝具", "アイマスク", "耳栓", "入浴"] },
    eat: { teaDirections: ["calming", "support"], boostKeywords: ["カモミール", "レモンバーム", "なつめ", "黒豆", "ルイボス"] },
    point: { boostRoles: ["neck_shoulder_release", "foot_leg_release", "gentle_stretch"], boostKeywords: ["首", "肩", "足裏", "ふくらはぎ", "ストレッチ"] },
  },
  cold_drinks: {
    live: { boostRoles: ["warm_body", "bath_shift"], boostKeywords: ["腹巻", "湯たんぽ", "温熱", "入浴", "足湯", "ウォーマー"] },
    eat: { teaDirections: ["warming", "support"], boostKeywords: ["生姜", "しょうが", "ジンジャー", "陳皮", "シナモン", "黒豆"] },
    point: { boostRoles: ["foot_leg_release", "gentle_stretch"], boostKeywords: ["足裏", "ふくらはぎ", "足元", "ストレッチ"] },
  },
  overeating: {
    live: { boostRoles: ["bath_shift", "warm_body"], boostKeywords: ["入浴", "足湯", "腹巻", "湯たんぽ"] },
    eat: { teaDirections: ["light", "support"], boostKeywords: ["はとむぎ", "とうもろこし", "小豆", "黒豆"] },
    point: { boostRoles: ["foot_leg_release", "gentle_stretch"], boostKeywords: ["足裏", "ふくらはぎ", "ストレッチ"] },
  },
  no_bath: {
    live: { boostRoles: ["bath_shift", "warm_body"], boostKeywords: ["入浴", "炭酸", "バスソルト", "足湯", "温浴", "温熱"] },
    eat: { teaDirections: ["warming", "calming"], boostKeywords: ["生姜", "カモミール", "ルイボス", "温かい"] },
    point: { boostRoles: ["gentle_stretch", "neck_shoulder_release", "posture_release"], boostKeywords: ["ストレッチ", "首", "肩", "腰", "背中"] },
  },
  low_activity: {
    live: { boostRoles: ["bath_shift", "humidity_control"], boostKeywords: ["入浴", "足湯", "サーキュレーター"] },
    eat: { teaDirections: ["light", "warming"], boostKeywords: ["はとむぎ", "黒豆", "生姜", "しょうが"] },
    point: { boostRoles: ["foot_leg_release", "gentle_stretch", "posture_release"], boostKeywords: ["足裏", "ふくらはぎ", "ストレッチ", "フォームローラー"] },
  },
  tense: {
    live: { boostRoles: ["reduce_light", "bath_shift", "sleep_environment"], boostKeywords: ["アイマスク", "入浴", "耳栓", "寝具"] },
    eat: { teaDirections: ["calming", "support"], boostKeywords: ["カモミール", "レモンバーム", "ラベンダー", "なつめ", "ルイボス"] },
    point: { boostRoles: ["neck_shoulder_release", "tsubo_support"], boostKeywords: ["首", "肩", "こめかみ", "頭皮", "ヘッド"] },
  },
  outdoor: {
    live: { boostRoles: ["moisture_air", "warm_body", "reduce_light"], boostKeywords: ["マスク", "保湿", "乾燥", "腹巻", "アイマスク"] },
    eat: { teaDirections: ["moist", "barley", "support"], boostKeywords: ["麦茶", "ルイボス", "黒豆", "水筒", "タンブラー", "なつめ"] },
    point: { boostRoles: ["foot_leg_release", "neck_shoulder_release"], boostKeywords: ["足裏", "ふくらはぎ", "首", "肩"] },
  },
};

const WEATHER_KIT_PROFILES = {
  pressure_down: {
    live: { boostRoles: ["reduce_light", "sleep_environment"], boostKeywords: ["アイマスク", "耳栓", "遮光", "枕", "寝具"] },
    eat: { teaDirections: ["calming", "light"], boostKeywords: ["カモミール", "ルイボス", "はとむぎ", "黒豆"] },
    point: { boostRoles: ["neck_shoulder_release", "tsubo_support"], boostKeywords: ["首", "肩", "こめかみ", "頭皮", "耳"] },
  },
  pressure_up: {
    live: { boostRoles: ["reduce_light", "bath_shift"], boostKeywords: ["アイマスク", "耳栓", "入浴"] },
    eat: { teaDirections: ["calming", "moist"], boostKeywords: ["カモミール", "レモンバーム", "ルイボス"] },
    point: { boostRoles: ["neck_shoulder_release", "tsubo_support"], boostKeywords: ["首", "肩", "こめかみ", "頭皮"] },
  },
  damp: {
    live: { boostRoles: ["humidity_control", "bath_shift"], boostKeywords: ["除湿", "湿気", "防湿", "サーキュレーター", "入浴"] },
    eat: { teaDirections: ["light", "support"], boostKeywords: ["はとむぎ", "とうもろこし", "小豆", "黒豆"] },
    point: { boostRoles: ["foot_leg_release", "gentle_stretch"], boostKeywords: ["足裏", "ふくらはぎ", "足元", "ストレッチ"] },
  },
  dry: {
    live: { boostRoles: ["moisture_air", "reduce_light", "sleep_environment"], boostKeywords: ["加湿", "乾燥", "保湿", "マスク", "アイマスク"] },
    eat: { teaDirections: ["moist", "barley", "support"], boostKeywords: ["ルイボス", "黒豆", "なつめ", "麦茶", "水筒"] },
    point: { boostRoles: ["gentle_stretch", "neck_shoulder_release"], boostKeywords: ["ストレッチ", "首", "肩"] },
  },
  cold: {
    live: { boostRoles: ["warm_body", "bath_shift", "sleep_environment"], boostKeywords: ["腹巻", "湯たんぽ", "温熱", "入浴", "足湯", "毛布"] },
    eat: { teaDirections: ["warming", "support"], boostKeywords: ["生姜", "しょうが", "陳皮", "シナモン", "黒豆"] },
    point: { boostRoles: ["foot_leg_release", "posture_release", "neck_shoulder_release"], boostKeywords: ["足裏", "ふくらはぎ", "腰", "背中", "首", "肩"] },
  },
  heat: {
    live: { boostRoles: ["reduce_light", "moisture_air"], boostKeywords: ["アイマスク", "遮光", "加湿", "マスク"] },
    eat: { teaDirections: ["moist", "barley"], boostKeywords: ["麦茶", "ルイボス", "黒豆", "水筒", "タンブラー"] },
    point: { boostRoles: ["gentle_stretch", "tsubo_support"], boostKeywords: ["ストレッチ", "頭皮", "こめかみ"] },
  },
};

const SUB_LABEL_KIT_PROFILES = {
  qi_stagnation: { point: { boostRoles: ["neck_shoulder_release", "gentle_stretch"], boostKeywords: ["首", "肩", "ストレッチ"] }, eat: { teaDirections: ["calming", "warming"] } },
  qi_deficiency: { live: { boostRoles: ["sleep_environment", "warm_body"], boostKeywords: ["寝具", "腹巻", "湯たんぽ"] }, eat: { teaDirections: ["support", "warming"], boostKeywords: ["なつめ", "黒豆", "玄米", "穀物"] } },
  blood_deficiency: { live: { boostRoles: ["sleep_environment", "moisture_air"], boostKeywords: ["寝具", "加湿", "乾燥"] }, eat: { teaDirections: ["moist", "support"], boostKeywords: ["なつめ", "黒豆", "ルイボス"] } },
  blood_stasis: { point: { boostRoles: ["posture_release", "foot_leg_release", "neck_shoulder_release"], boostKeywords: ["腰", "背中", "ふくらはぎ", "首", "肩"] }, eat: { teaDirections: ["warming", "support"] } },
  fluid_damp: { live: { boostRoles: ["humidity_control", "bath_shift"], boostKeywords: ["除湿", "湿気", "入浴"] }, eat: { teaDirections: ["light", "support"], boostKeywords: ["はとむぎ", "とうもろこし", "黒豆"] } },
  fluid_deficiency: { live: { boostRoles: ["moisture_air", "reduce_light"], boostKeywords: ["加湿", "乾燥", "アイマスク"] }, eat: { teaDirections: ["moist", "barley"], boostKeywords: ["ルイボス", "麦茶", "黒豆", "なつめ"] } },
};

const CORE_KIT_PROFILES = {
  accel: { live: { boostRoles: ["reduce_light", "bath_shift"], boostKeywords: ["アイマスク", "耳栓", "入浴"] }, eat: { teaDirections: ["calming", "moist"] }, point: { boostRoles: ["neck_shoulder_release", "tsubo_support"] } },
  brake: { live: { boostRoles: ["warm_body", "bath_shift", "humidity_control"], boostKeywords: ["温熱", "入浴", "除湿"] }, eat: { teaDirections: ["warming", "light", "support"] }, point: { boostRoles: ["foot_leg_release", "posture_release", "gentle_stretch"] } },
  batt_small: { live: { boostRoles: ["sleep_environment", "warm_body"], boostKeywords: ["寝具", "腹巻", "湯たんぽ"] }, eat: { teaDirections: ["support", "moist"], boostKeywords: ["なつめ", "黒豆", "玄米", "穀物"] } },
  batt_large: { live: { boostRoles: ["humidity_control", "bath_shift"], boostKeywords: ["除湿", "入浴"] }, eat: { teaDirections: ["light", "warming"], boostKeywords: ["はとむぎ", "黒豆", "生姜"] }, point: { boostRoles: ["foot_leg_release", "posture_release"] } },
};

function mergeSlotBoosts(slot, boost = {}) {
  if (!slot || !boost) return slot;
  return {
    ...slot,
    contextBoostRoles: unique([...safeArray(slot.contextBoostRoles), ...safeArray(boost.boostRoles)]),
    contextBoostKeywords: unique([...safeArray(slot.contextBoostKeywords), ...safeArray(boost.boostKeywords)]),
    contextTeaDirections: unique([...safeArray(slot.contextTeaDirections), ...safeArray(boost.teaDirections)]),
  };
}

function triggerProfileKeys(triggerFactors = []) {
  return unique(safeArray(triggerFactors).map((factor) => factor?.exact || factor?.key || factor?.main_trigger).filter(Boolean));
}

function coreProfileKeys(profileLike) {
  const coreCode = String(profileLike?.core_code || "");
  const keys = [];
  if (coreCode.startsWith("accel")) keys.push("accel");
  if (coreCode.startsWith("brake")) keys.push("brake");
  if (coreCode.includes("batt_small")) keys.push("batt_small");
  if (coreCode.includes("batt_large")) keys.push("batt_large");
  return keys;
}

function applyContextSlotProfiles(slot, context = {}) {
  if (!slot) return slot;
  let next = slot;
  const category = slot.category;

  safeArray(context.lifeKeys).forEach((lifeKey) => {
    next = mergeSlotBoosts(next, LIFE_KIT_PROFILES[lifeKey]?.[category]);
  });

  triggerProfileKeys(context.triggerFactors).forEach((triggerKey) => {
    next = mergeSlotBoosts(next, WEATHER_KIT_PROFILES[triggerKey]?.[category]);
  });

  coreProfileKeys(context.profileLike).forEach((coreKey) => {
    next = mergeSlotBoosts(next, CORE_KIT_PROFILES[coreKey]?.[category]);
  });

  safeArray(context.profileLike?.sub_labels || context.profileLike?.computed?.sub_labels).forEach((subKey) => {
    next = mergeSlotBoosts(next, SUB_LABEL_KIT_PROFILES[subKey]?.[category]);
  });

  return next;
}

function getSymptomAnchor(symptomKey) {
  return SYMPTOM_SET_ANCHORS[symptomKey] || null;
}

function titleOptionsForPolicy(policyKey, { symptomKey, lifeKeys = [] } = {}) {
  const anchor = getSymptomAnchor(symptomKey);
  const options = [];
  if (anchor?.titles?.[policyKey]) options.push(...anchor.titles[policyKey]);
  safeArray(lifeKeys).forEach((lifeKey) => {
    const title = LIFE_TITLE_HINTS[lifeKey]?.[policyKey];
    if (title) options.push(title);
  });
  options.push(...safeArray(DEFAULT_POLICY_TITLES[policyKey]));
  return unique(options);
}

function eatSlotFor(policyKey, context, titleSuffix) {
  const anchor = getSymptomAnchor(context.symptomKey);
  if (anchor?.eatSlot) return anchor.eatSlot(policyKey, context, titleSuffix);
  return eatSlot(policyKey, titleSuffix);
}

function pointSlotFor(policyKey, context) {
  const anchor = getSymptomAnchor(context.symptomKey);
  if (anchor?.pointSlot) return anchor.pointSlot(policyKey, context);
  if (context.lifeKeys?.includes("screen") || policyKey === "yurumeru" || policyKey === "shizumeru") {
    return SYMPTOM_SET_ANCHORS.neck_shoulder.pointSlot(policyKey, context);
  }
  if (context.lifeKeys?.includes("low_activity") || policyKey === "nagasu") {
    return SYMPTOM_SET_ANCHORS.swelling.pointSlot(policyKey, context);
  }
  return makeSlot("point", ["gentle_stretch", "posture_release", "tsubo_support"], ["ストレッチ", "ローラー", "ツボ", "背中", "足", "肩"], { avoidKeywords: ["顔", "小顔", "美容", "フェイス"] });
}

function liveSlotFor(policyKey, context) {
  const anchor = getSymptomAnchor(context.symptomKey);
  if (anchor?.liveSlot) return anchor.liveSlot(policyKey, context);
  if (policyKey === "nagasu") return makeSlot("live", ["humidity_control", "bath_shift"], ["除湿", "湿気", "サーキュレーター", "入浴"]);
  if (policyKey === "uruosu") return makeSlot("live", ["moisture_air", "sleep_environment"], ["加湿", "乾燥", "マスク", "寝室"]);
  if (policyKey === "nukumeru") return makeSlot("live", ["warm_body", "bath_shift"], ["腹巻", "湯たんぽ", "足湯", "入浴", "温熱"]);
  if (policyKey === "shizumeru") return makeSlot("live", ["reduce_light", "sleep_environment"], ["アイマスク", "遮光", "耳栓", "寝室"]);
  if (policyKey === "sasaeru") return makeSlot("live", ["sleep_environment", "bath_shift"], ["寝具", "枕", "入浴", "休息"]);
  return makeSlot("live", ["bath_shift", "sleep_environment", "reduce_light"], ["入浴", "アイマスク", "睡眠", "温熱"]);
}

function slotsForPolicySet(policyKey, titleSuffix, context, variantIndex) {
  const slots = [];
  const mode = context.mode;
  const isEnvironment = mode === "environment";
  const isStarter = mode === "starter";
  const suffix = String(titleSuffix || "");

  const live = applyContextSlotProfiles(liveSlotFor(policyKey, context), context);
  const eat = applyContextSlotProfiles(eatSlotFor(policyKey, context, titleSuffix), context);
  const point = applyContextSlotProfiles(pointSlotFor(policyKey, { ...context, titleSuffix }), context);

  if (/食事|食べすぎ|胃腸|忙しい/.test(suffix)) {
    slots.push(eat, live, point);
  } else if (/室内|乾燥|湿気|寝室|環境/.test(suffix)) {
    slots.push(live, eat, point);
  } else if (/首|肩|腰|背中|足|こり|こわばり|力み|緊張/.test(suffix)) {
    slots.push(point, live, eat);
  } else if (/冷え|冷たい|寒暖差/.test(suffix)) {
    slots.push(live, eat, point);
  } else {
    slots.push(live, point, eat);
  }

  // 「軽く試せるセット」でも、暮らす・食べる・ほぐすの3枠を基本表示する。
  // 以前は2枠固定だったが、セット内の一部だけ買いたいユーザーの選択肢を減らすため廃止。
  // ただし重複スロットは統合するので、条件によっては安全上2枠になる場合がある。
  if (isStarter) return uniqueSlots(slots).slice(0, 3);
  if (isEnvironment) return uniqueSlots(slots).slice(0, 3);
  return uniqueSlots(slots).slice(0, 3);
}

function uniqueSlots(slots) {
  const seen = new Set();
  return safeArray(slots).filter(Boolean).filter((slot) => {
    const key = `${slot.category}:${safeArray(slot.roles).join("|")}:${safeArray(slot.requiredAreas).join("|")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shouldIncludeSupportPolicy(policyKey, context) {
  if (!policyKey) return false;
  if (policyKey !== "sasaeru") return true;
  const strongLife = ["sleep_short", "overeating", "outdoor", "cold_drinks"].some((key) => context.lifeKeys?.includes(key));
  const strongSymptom = ["fatigue", "sleep", "digestion", "dizziness", "low_back_pain"].includes(context.symptomKey);
  return strongLife || strongSymptom || context.mode === "environment";
}

function reorderPolicyKeysForCard(mainPolicyKey, policyKeys = []) {
  const rest = safeArray(policyKeys).filter((key) => key && key !== mainPolicyKey && POLICY_META[key]);
  return unique([mainPolicyKey, ...rest]).filter((key) => POLICY_META[key]);
}

function buildPolicySetDefinitions({ mode, policyKeys, symptomKey, lifeKeys, triggerFactors, profileLike }) {
  const keys = safeArray(policyKeys).filter((key) => POLICY_META[key]);
  const primary = keys[0] || "yurumeru";
  const secondary = keys.find((key) => key !== primary) || "meguraseru";
  const tertiary = keys.find((key) => key !== primary && key !== secondary) || null;
  const context = { mode, policyKeys: keys, symptomKey, lifeKeys: safeArray(lifeKeys), triggerFactors: safeArray(triggerFactors), profileLike };
  const plan = [];

  function push(policyKey, variantIndex, weight = "main") {
    if (!POLICY_META[policyKey]) return;
    const options = titleOptionsForPolicy(policyKey, context);
    const suffix = options[variantIndex % Math.max(options.length, 1)] || DEFAULT_POLICY_TITLES[policyKey]?.[0] || "今日のケア";
    const duplicate = plan.some((item) => item.policyKey === policyKey && item.titleSuffix === suffix);
    if (duplicate) return;
    const title = `${POLICY_META[policyKey].label}セット｜${suffix}`;
    plan.push({ policyKey, titleSuffix: suffix, title, weight });
  }

  push(primary, 0, "main");
  push(primary, 1, "main");
  push(secondary, 0, "sub");
  push(secondary, 1, "sub");
  if (tertiary && shouldIncludeSupportPolicy(tertiary, context)) push(tertiary, 0, "support");

  if (plan.length < 4) {
    ["nukumeru", "nagasu", "sasaeru", "shizumeru", "uruosu"].forEach((key) => {
      if (plan.length >= 4) return;
      if (!plan.some((item) => item.policyKey === key) && shouldIncludeSupportPolicy(key, context)) push(key, 0, "support");
    });
  }

  return plan.slice(0, 5).map((definition, index) => {
    const slots = slotsForPolicySet(definition.policyKey, definition.titleSuffix, context, index);
    return {
      key: `${mode}-${definition.policyKey}-${slugifyJa(definition.titleSuffix)}-${index}`,
      title: definition.title,
      lead: buildSetLead(definition.policyKey, definition.titleSuffix, slots),
      policyKey: definition.policyKey,
      policyKeys: reorderPolicyKeysForCard(definition.policyKey, keys),
      titleSuffix: definition.titleSuffix,
      slots,
      tags: unique([POLICY_META[definition.policyKey]?.label, definition.titleSuffix, getSymptomAnchor(symptomKey)?.label]).filter(Boolean).slice(0, 5),
    };
  });
}

function slugifyJa(value) {
  return String(value || "set").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "set";
}

function buildSetLead(policyKey, titleSuffix, slots) {
  const labels = safeArray(slots).map((slot) => getCategoryMeta(slot.category).label).join("・");
  const policyLabel = POLICY_META[policyKey]?.label || "ケア";
  return `${policyLabel}方針に合わせて、${labels}を組み合わせます。`;
}

function slotRequiresAreaMatch(slot) {
  return slot.category === "point" && safeArray(slot.requiredAreas).length > 0;
}

function eatItemHasSlotMeaning(item, slot) {
  const roles = safeArray(slot?.roles);
  if (!roles.length) return true;

  if (isLowValueSupermarketFoodItem(item) && !slot.allowRetailFood) return false;

  const roleMatched = roles.includes(item.productRole) || roles.includes(item.intentType);
  const contextRoleMatched = safeArray(slot.contextBoostRoles).includes(item.productRole) || safeArray(slot.contextBoostRoles).includes(item.intentType);
  const productTypeMatched = safeArray(slot.productTypes).includes(item.productType);
  const keywordMatched = hasAnyText(item, slot.keywords) || hasAnyText(item, slot.contextBoostKeywords);
  const desiredTeaDirections = unique([...safeArray(slot.teaDirections), ...safeArray(slot.contextTeaDirections)]);
  const materialMatched = Boolean(
    desiredTeaDirections.length &&
    detectTeaMaterialGroups(item).some((group) => desiredTeaDirections.includes(group.key))
  );

  // 食べる枠は候補数が多いため、カテゴリ一致だけでは通さない。
  // 役割・商品タイプ・素材方向・キーワードのどれかで、そのスロットに置く理由が読めるものだけ残す。
  if (!roleMatched && !contextRoleMatched && !productTypeMatched && !keywordMatched && !materialMatched) return false;

  // サプリ/機能性表示食品は、飲み物・軽食枠の穴埋めとして出ると納得感が落ちる。
  // 栄養補助枠として明示されている時だけ通す。
  if (item.productRole === "nutrition_support" || item.intentType === "nutrition_support" || item.productType === "supplement") {
    return roles.includes("nutrition_support") || safeArray(slot.contextBoostRoles).includes("nutrition_support");
  }

  return true;
}

function itemMatchesSlot(item, slot) {
  if (!item || item.category !== slot.category) return false;
  // 傷・救急処置系は、未病レーダーのMYケアセレクト文脈から外れるため全カテゴリで除外。
  // ここを通すと「暮らし側から整える枠」として絆創膏などが出る。
  if (isFirstAidItem(item) || isMedicalSupportItem(item) || isPetProductItem(item) || isLowContextOligoItem(item)) return false;
  if (item.category === "point" && BEDDING_ITEM_PATTERN.test(itemEvidenceText(item))) return false;
  if (isPointBeautyItem(item)) return false;
  if (hasAnyText(item, slot.avoidKeywords)) return false;

  if (slot.category === "live" && !liveItemHasSlotMeaning(item, slot)) return false;
  if (slot.category === "eat" && !eatItemHasSlotMeaning(item, slot)) return false;

  if (slot.category === "point") {
    const areas = inferPointAreas(item);
    const text = itemEvidenceText(item);
    const requiredAreas = safeArray(slot.requiredAreas);
    const genericMovementTool = /(ストレッチ|フォームローラー|ストレッチポール|ヨガマット|ヨガポール|ローラー|ボール|マッサージ)/.test(text);

    if (requiredAreas.length) {
      if (!areas.length) return false;
      if (!areas.some((area) => requiredAreas.includes(area))) return false;
      if (areas.includes("face") && !requiredAreas.includes("face")) return false;
    } else if (!areas.length && !genericMovementTool) {
      // 不調専用プロファイルがない時でも、用途が読めない雑貨・医療用品はほぐす枠に入れない。
      return false;
    }
  }

  return true;
}

function scoreAffiliatePriority(item) {
  const rate = Number(item?.affiliateRate || item?.affiliateRatePercent || 0);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  // 料率は「最後のひと押し」に限定。用途一致や方針一致を上書きしない。
  return Math.min(rate, 12) * 0.32;
}

function scoreTrustedCareBrand(item) {
  // v7.10: ブランド名だけで順位を押し上げない。
  // 用途一致・部位一致・レビュー・料率を優先し、定番/ニッチを同じ土俵で扱う。
  return 0;
}

function scorePartnerSlotPriority(item, slot, { mode, roleMatched, keywordMatched, contextRoleMatched, contextKeywordMatched } = {}) {
  if (!(item.source === "a8" || item.sourceType === "partner")) return 0;

  const slotFit = roleMatched || keywordMatched || contextRoleMatched || contextKeywordMatched;
  const environmentalRoles = new Set([
    "sleep_environment",
    "humidity_control",
    "moisture_air",
    "light_meal",
    "warm_body",
    "bath_shift",
  ]);

  if (mode === "environment") {
    let score = 0;
    if (roleMatched) score += 8;
    else if (contextRoleMatched) score += 5;
    else if (keywordMatched || contextKeywordMatched) score += 3;
    else score -= 6;

    if (safeArray(item.priceBands).includes("deep")) score += 2.5;
    if (environmentalRoles.has(item.productRole)) score += 2.5;
    return score;
  }

  // 通常モードではA8を広告枠として押し込まず、同等に合っている時の軽い後押しに留める。
  return slotFit ? 2 : 0.6;
}

function scoreKitCandidate(item, slot, { mode, policyKeys = [] } = {}) {
  if (!itemMatchesSlot(item, slot)) return -999;

  const slotRoles = safeArray(slot.roles);
  const roleMatched = slotRoles.includes(item.productRole) || slotRoles.includes(item.intentType);
  const keywordMatched = hasAnyText(item, slot.keywords);
  const contextRoleMatched = safeArray(slot.contextBoostRoles).includes(item.productRole) || safeArray(slot.contextBoostRoles).includes(item.intentType);
  const contextKeywordMatched = hasAnyText(item, slot.contextBoostKeywords);

  let score = 0;
  if (item.category === slot.category) score += 20;
  if (roleMatched) score += 14;
  if (safeArray(slot.productTypes).includes(item.productType)) score += 6;
  if (keywordMatched) score += 7;
  if (contextRoleMatched) score += 4;
  if (contextKeywordMatched) score += 4;
  if (hasAnyText(item, slot.avoidKeywords)) score -= 30;

  if (slotRoles.length && !roleMatched) score -= 6;

  if (slot.category === "point") {
    const areas = inferPointAreas(item);
    if (safeArray(slot.requiredAreas).some((area) => areas.includes(area))) score += 14;
  }

  if (item.category === "eat") {
    if (isLowValueSupermarketFoodItem(item)) score -= mode === "environment" ? 28 : 80;
    score += scoreTeaMaterialFit(item, slot, policyKeys);
  }

  score += scoreAffiliatePriority(item);
  score += scoreTrustedCareBrand(item);

  const orderedPolicies = safeArray(policyKeys);
  if (item.policyKey && orderedPolicies[0] === item.policyKey) score += 8;
  else if (item.policyKey && orderedPolicies.includes(item.policyKey)) score += 3;

  score += scorePartnerSlotPriority(item, slot, {
    mode,
    roleMatched,
    keywordMatched,
    contextRoleMatched,
    contextKeywordMatched,
  });

  if (mode === "starter" && item.price && Number(item.price) <= 2500) score += 2;
  if (mode === "environment" && item.price && Number(item.price) >= 5000) score += 1.5;
  score += Math.min(Number(item.score || 0), 20) * 0.04;
  return score;
}

const TEA_MATERIAL_GROUPS = [
  { key: "warming", label: "生姜・陳皮系", pattern: /(生姜|しょうが|ジンジャー|陳皮|シナモン|桂皮)/ },
  { key: "calming", label: "カモミール・レモンバーム系", pattern: /(カモミール|レモンバーム|ラベンダー|おやすみ)/ },
  { key: "light", label: "はとむぎ・とうもろこし系", pattern: /(はとむぎ|ハトムギ|とうもろこし|コーン|小豆|どくだみ)/ },
  { key: "barley", label: "麦茶系", pattern: /(麦茶|むぎ茶|ムギ茶)/ },
  { key: "moist", label: "ルイボス・黒豆・なつめ系", pattern: /(ルイボス|黒豆|なつめ|棗|クコ|枸杞)/ },
  { key: "support", label: "なつめ・黒豆・穀物系", pattern: /(なつめ|棗|黒豆|玄米|穀物|ルイボス)/ },
];

function detectTeaMaterialGroups(item) {
  const text = itemEvidenceText(item);
  return TEA_MATERIAL_GROUPS.filter((group) => group.pattern.test(text));
}

function scoreTeaMaterialFit(item, slot, policyKeys = []) {
  if (item.category !== "eat") return 0;
  const text = itemEvidenceText(item);
  const groups = detectTeaMaterialGroups(item).map((group) => group.key);
  const desired = unique([...safeArray(slot.teaDirections), ...safeArray(slot.contextTeaDirections)]);
  let score = groups.some((key) => desired.includes(key)) ? 10 : 0;

  // ぬくめる・めぐらせる等で「温かい素材」を探している時に、
  // 麦茶ペットボトル等が検索意図だけで上がるのを抑える。
  if (desired.includes("warming") && !groups.includes("warming")) {
    if (READY_TO_DRINK_PATTERN.test(text) || groups.includes("barley")) score -= 12;
    else if (/茶|ティー|飲料/.test(text)) score -= 5;
  }

  if (!groups.length) return score;
  const primaryPolicy = safeArray(policyKeys)[0];
  const policyDesired = {
    shizumeru: ["calming", "moist"],
    yurumeru: ["calming", "support"],
    meguraseru: ["warming", "support"],
    nagasu: ["light"],
    uruosu: ["moist", "barley"],
    nukumeru: ["warming"],
    sasaeru: ["support", "barley"],
  }[primaryPolicy] || [];
  if (groups.some((key) => policyDesired.includes(key))) score += 4;
  return score;
}

function pickKitItem(candidates, slot, used, context) {
  const ranked = safeArray(candidates)
    .filter((item) => itemMatchesSlot(item, slot))
    .filter((item) => {
      const key = getSetItemKey(item);
      return key && !used.has(key);
    })
    .map((item) => ({
      item,
      score: scoreKitCandidate(item, slot, context) + scoreDiversityPenalty(item, context?.diversity),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked = ranked[0]?.item || null;
  if (picked) {
    used.add(getSetItemKey(picked));
    registerItemDiversity(picked, context?.diversity);
  }
  return picked;
}

function buildItemUseGuide(item, slot, card) {
  if (!item || item.source === "a8" || item.sourceType === "partner") return "";

  if (item.category === "eat") return buildEatUseGuide(item, card);
  if (item.category === "point") return buildPointUseGuide(item, slot, card);
  if (item.category === "live") return buildLiveUseGuide(item);
  return "";
}

function buildEatUseGuide(item, card) {
  const text = itemEvidenceText(item);
  const group = detectTeaMaterialGroups(item)[0];
  const policyKey = card?.policyKey;

  if (/味噌汁|みそ汁|スープ|雑炊|おかゆ|リゾット/.test(text)) {
    if (policyKey === "nagasu") return "温かく軽めの一品。食べすぎ後や湿気で重い日に。";
    if (policyKey === "sasaeru") return "食事が乱れた日の戻しやすい一品に。";
    return "温かく軽めの一品。食事を考える余力が少ない日に。";
  }

  if (TRUE_DRINKWARE_PATTERN.test(text) && !READY_TO_DRINK_PATTERN.test(text)) {
    return "温かい一杯を持ち歩く道具。冷たい飲み物に寄りやすい日に。";
  }

  if (group) {
    if (group.key === "warming") return `${group.label}。冷たい飲み物が続いた日の切り替えに。`;
    if (group.key === "calming") return `${group.label}。作業後や寝る前の切り替えに。`;
    if (group.key === "light") return `${group.label}。湿気や食べすぎで重い日に。`;
    if (group.key === "barley") return `${group.label}。暑さや乾きやすい日の水分補給に。`;
    if (group.key === "moist") return `${group.label}。乾きやすい日の水分補給に。`;
    if (group.key === "support") return `${group.label}。食事や休憩が乱れた日の一杯に。`;
  }

  if (/茶|ティー|ルイボス|ハーブ|ノンカフェイン|カフェインレス/.test(text)) {
    if (policyKey === "shizumeru") return "刺激を足したくない日の温かい一杯に。";
    if (policyKey === "yurumeru") return "作業後や寝る前の切り替えの一杯に。";
    if (policyKey === "nukumeru") return "冷たい飲み物が続いた日の切り替えに。";
    return "今日の方針に合わせた温かい一杯に。";
  }

  if (/なつめ|棗|クコ|枸杞|陳皮|生姜|しょうが|黒豆|はとむぎ|ハトムギ/.test(text)) {
    return "お茶や汁物に少し足す素材枠として。";
  }

  return "このセットの食べる枠として。";
}

const POINT_ROLE_AREA_MAP = {
  neck_shoulder_release: "neck_shoulder",
  posture_release: "low_back",
  foot_leg_release: "foot_leg",
  eye_head_release: "eye_head",
};

const POINT_AREA_LABELS = {
  eye_head: "目元・こめかみ・頭皮",
  neck_shoulder: "首肩",
  low_back: "腰・背中",
  foot_leg: "足裏・ふくらはぎ",
};

function preferredPointArea(item, slot, areas = []) {
  const roleArea = POINT_ROLE_AREA_MAP[item?.productRole] || POINT_ROLE_AREA_MAP[item?.intentType];
  const required = safeArray(slot?.requiredAreas);
  if (roleArea && (!areas.length || areas.includes(roleArea) || /ツボ|つぼ|指圧|押し棒|ポイントきゅう|お灸|温灸|灸|マッサージガン|筋膜ガン|ハンディガン/i.test(itemEvidenceText(item)))) {
    return roleArea;
  }
  const requiredHit = required.find((area) => areas.includes(area));
  if (requiredHit) return requiredHit;
  return areas.find((area) => area !== "face" && POINT_AREA_LABELS[area]) || "";
}

function pointAreaLabel(area) {
  return POINT_AREA_LABELS[area] || "気になる部位";
}

function buildTsuboToolUseGuide(item, preferredArea) {
  const text = itemEvidenceText(item);
  const label = pointAreaLabel(preferredArea);
  const isOkyu = /お灸|温灸|台座灸|せんねん灸|灸/.test(text);
  const isTsuboStick = /ツボ|つぼ|指圧|押し棒|ポイントきゅう|突起/.test(text);
  const isMassageGun = /マッサージガン|筋膜ガン|ハンディガン|リカバリーガン/.test(text);

  if (isOkyu) return `体調予報ページのツボカードに合わせる枠。${label}まわりのツボケアに。`;
  if (isTsuboStick) return `体調予報ページのツボカードや、${label}まわりのポイントケアに。`;
  if (isMassageGun) return `体調予報ページのツボカードや、${label}まわりのケアに。`;
  return "";
}

function buildPointUseGuide(item, slot, card) {
  const text = itemEvidenceText(item);
  const areas = inferPointAreas(item);
  const required = safeArray(slot?.requiredAreas);
  if (areas.includes("face") || BEDDING_ITEM_PATTERN.test(text) || isMedicalSupportItem(item)) return "";

  const preferredArea = preferredPointArea(item, slot, areas);
  const hasPreferredEvidence = preferredArea && areas.includes(preferredArea);

  function has(area) {
    return area === preferredArea && areas.includes(area) && (!required.length || required.includes(area) || POINT_ROLE_AREA_MAP[item?.productRole] === area || POINT_ROLE_AREA_MAP[item?.intentType] === area);
  }

  const tsuboToolGuide = buildTsuboToolUseGuide(item, preferredArea);
  if (tsuboToolGuide) return tsuboToolGuide;

  if (WARMING_PAD_PATTERN.test(text)) {
    if (has("eye_head")) return "目元・こめかみ周辺を温める枠。休む前や画面作業後に。";
    if (has("neck_shoulder")) return "首肩まわりを温める枠。作業後や休む前に。";
    if (has("low_back")) return "腰・背中まわりを温める枠。休む前や冷えが気になる日に。";
    if (has("foot_leg")) return "足元を温める枠。冷えやすい日に。";
    return required.length ? "" : "気になる部位を温める枠として。";
  }

  if (/ローラー|ボール|マッサージ|ブラシ/.test(text)) {
    if (has("eye_head")) return "目元・こめかみ・頭皮まわりの切り替え枠。軽めに。";
    if (has("neck_shoulder")) return "首肩まわりを動かす枠。作業後や休む前に。";
    if (has("low_back")) return "腰・背中まわりを動かす枠。短時間で軽く。";
    if (has("foot_leg")) return "足裏やふくらはぎを動かす枠。座りっぱなしの日に。";
  }

  if (/ストレッチ|伸ばす|フォームローラー|ストレッチポール|ヨガマット/.test(text)) {
    if (has("neck_shoulder")) return "首肩まわりをゆっくり伸ばす枠。作業後の切り替えに。";
    if (has("low_back")) return "腰・背中まわりをゆっくり伸ばす枠。休む前の切り替えに。";
    if (has("foot_leg")) return "足まわりをゆっくり伸ばす枠。座りっぱなしの日に。";
  }

  // 商品から部位が読めず、ツボ・お灸・マッサージガンでもないものは、
  // スロット側の意図で用途文を上書きしない。
  if (required.length || !hasPreferredEvidence) return "";
  return "体を軽く動かす道具として。";
}

function buildLiveUseGuide(item) {
  const text = itemEvidenceText(item);
  if (FIRST_AID_REJECT_PATTERN.test(text) || MEDICAL_SUPPORT_REJECT_PATTERN.test(text)) return "";
  if (/枕|まくら|ピロー|pillow|マットレス|寝具|寝敷|睡眠|寝返り/.test(text)) return "休む環境を見直す枠。首肩・腰まわりが気になる日に。";
  if (/入浴剤|バスソルト|炭酸|温浴|足湯/.test(text)) return "湯船に切り替えるきっかけに。冷えやこわばりが気になる日に。";
  if (/アイマスク|耳栓|遮光|遮音|ブルーライト/.test(text)) return "光や音の刺激を減らす枠。寝る前や画面作業後に。";
  if (/腹巻|湯たんぽ|ウォーマー|カイロ|温熱|発熱|毛布/.test(text)) return "冷やしたくない部位を守る枠。外出前や休む前に。";
  if (/除湿|湿気|サーキュレーター|防湿/.test(text)) return "湿気がこもる日の室内環境づくりに。";
  if (/加湿|乾燥|保湿/.test(text)) return "乾きやすい日の室内環境づくりに。";
  return "";
}

function buildFallbackSlotsForDefinition(definition, context) {
  const originalSlots = safeArray(definition?.slots);
  const live = originalSlots.find((slot) => slot.category === "live") || applyContextSlotProfiles(liveSlotFor(definition.policyKey, context), context);
  const eat = originalSlots.find((slot) => slot.category === "eat") || applyContextSlotProfiles(eatSlotFor(definition.policyKey, context, definition.titleSuffix), context);
  const point = originalSlots.find((slot) => slot.category === "point");

  // 0件回避用の予備セット。用途ズレを起こしやすい「ほぐす」は、
  // 部位条件を満たせる時だけ残し、基本は暮らす＋食べるの2点セットで成立させる。
  const slots = [live, eat];
  if (point && !slotRequiresAreaMatch(point)) slots.push(point);
  return uniqueSlots(slots).slice(0, 3);
}

function buildGenericFallbackSlots(policyKey, context) {
  // 最後の予備。商品用途の上書きはせず、比較的安全な暮らす・食べる枠だけで組む。
  return uniqueSlots([
    applyContextSlotProfiles(liveSlotFor(policyKey, context), context),
    applyContextSlotProfiles(eatSlotFor(policyKey, context, "default"), context),
  ]).slice(0, 2);
}

function assembleCareSetCards({ definitions, byCategory, mode, policyKeys, approachTags, fallbackLevel = 0 }) {
  const used = new Set();
  let diversity = createDiversityState();
  const cards = [];

  for (const definition of safeArray(definitions)) {
    const localUsed = new Set(used);
    const localDiversity = cloneDiversityState(diversity);
    const cardPolicyKeys = definition.policyKeys?.length ? definition.policyKeys : reorderPolicyKeysForCard(definition.policyKey, policyKeys);
    const items = safeArray(definition.slots)
      .map((slot) => {
        const picked = pickKitItem(byCategory[slot.category], slot, localUsed, { mode, policyKeys: cardPolicyKeys, diversity: localDiversity });
        if (!picked) return null;
        return { ...picked, useGuide: buildItemUseGuide(picked, slot, { ...definition, policyKeys: cardPolicyKeys }), slotCategory: slot.category };
      })
      .filter(Boolean);

    if (items.length < 2) continue;

    items.forEach((item) => used.add(getSetItemKey(item)));
    diversity = localDiversity;
    cards.push({
      ...definition,
      fallbackLevel,
      items,
      tags: unique([...safeArray(definition.tags), ...safeArray(approachTags).slice(0, 2)]).filter(Boolean).slice(0, 6),
    });

    if (cards.length >= CARE_SET_EXPANDED_LIMIT) break;
  }

  return cards;
}

function buildCareSetCards({ mode, itemsByCategory, partnerItemsByCategory, policyKeys, symptomKey, lifeKeys, triggerFactors, symptomLabel, approachTags, profileLike }) {
  const byCategory = Object.fromEntries(
    CATEGORY_ORDER.map((category) => {
      const partner = safeArray(partnerItemsByCategory?.[category]).map((item) => ({ ...item, category, source: item.source || "a8", sourceType: item.sourceType || "partner" }));
      const rakuten = safeArray(itemsByCategory?.[category]).map((item) => ({ ...item, category, source: item.source || "rakuten", sourceType: item.sourceType || "rakuten", buttonText: item.buttonText || "楽天で見る" }));
      return [category, [...partner, ...rakuten]];
    })
  );

  const context = { mode, policyKeys: safeArray(policyKeys), symptomKey, lifeKeys: safeArray(lifeKeys), triggerFactors: safeArray(triggerFactors), symptomLabel, profileLike };
  const definitions = buildPolicySetDefinitions({ mode, policyKeys, symptomKey, lifeKeys, triggerFactors, profileLike });

  const strictCards = assembleCareSetCards({ definitions, byCategory, mode, policyKeys, approachTags, fallbackLevel: 0 });
  if (strictCards.length) return strictCards;

  const fallbackDefinitions = definitions.map((definition, index) => ({
    ...definition,
    key: `${definition.key}-fallback-${index}`,
    slots: buildFallbackSlotsForDefinition(definition, context),
    lead: `${POLICY_META[definition.policyKey]?.label || "ケア"}方針に合わせて、まず取り入れやすい2点で組みます。`,
    tags: unique([...safeArray(definition.tags), "2点セット"]).filter(Boolean).slice(0, 5),
  }));
  const fallbackCards = assembleCareSetCards({ definitions: fallbackDefinitions, byCategory, mode, policyKeys, approachTags, fallbackLevel: 1 });
  if (fallbackCards.length) return fallbackCards;

  const genericDefinitions = definitions.slice(0, 4).map((definition, index) => ({
    ...definition,
    key: `${definition.key}-generic-${index}`,
    slots: buildGenericFallbackSlots(definition.policyKey, context),
    lead: `${POLICY_META[definition.policyKey]?.label || "ケア"}方針に合わせて、暮らす・食べるから始める2点です。`,
    tags: unique([POLICY_META[definition.policyKey]?.label, definition.titleSuffix, getSymptomAnchor(symptomKey)?.label, "2点セット"]).filter(Boolean).slice(0, 5),
  }));
  return assembleCareSetCards({ definitions: genericDefinitions, byCategory, mode, policyKeys, approachTags, fallbackLevel: 2 });
}

function SetModeFilter({ value, onChange }) {
  return (
    <div className="rounded-[22px] bg-[#EAF6F3] p-3 ring-1 ring-[#9CCFC4]">
      <div className="mb-2 text-[10px] font-black tracking-[0.14em] text-slate-400">セットタイプ</div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {SET_MODE_OPTIONS.map((option) => {
          const active = value === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={[
                "rounded-[18px] px-3 py-2.5 text-center transition-all ring-1",
                active
                  ? "bg-[var(--accent)] text-white ring-[var(--accent)] shadow-[0_12px_24px_-16px_rgba(52,155,131,0.30)]"
                  : "bg-white text-slate-600 ring-[var(--ring)] hover:bg-[#EAF6F3] hover:text-slate-900",
              ].join(" ")}
            >
              <div className="text-[12px] font-black leading-4">{option.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
function KitItemRow({ item, itemPosition, setKey, trackingContext }) {
  const meta = getCategoryMeta(item.category);
  const Icon = meta.icon;
  const isPartner = item.source === "a8" || item.sourceType === "partner";
  const itemUrl = item.itemUrl || item.clickUrl || makeRakutenSearchUrl(item.query);
  const priceText = item.price ? `${Number(item.price).toLocaleString("ja-JP")}円` : "";
  const roleLabel = inferRoleLabelFromItem(item);
  const buttonText = item.buttonText || (isPartner ? "公式で見る" : "楽天で見る");

  function handleClick() {
    postCareItemClick({
      item: { ...item, itemUrl, kitSetKey: setKey },
      itemPosition,
      context: trackingContext,
    });
  }

  return (
    <div className="rounded-[20px] bg-white p-3 ring-1 ring-[#D9EAE5]">
      <div className="flex gap-3">
        <div className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#F5FBF8_0%,#FFF2CF_100%)] text-[var(--accent-ink)] ring-1 ring-[#B6D8CF]">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className={isPartner ? "h-full w-full object-contain" : "h-full w-full object-cover"} loading="lazy" />
          ) : (
            <Icon className="h-7 w-7 opacity-85" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[#EAF6F3] px-2 py-0.5 text-[9px] font-black text-[#28665F] ring-1 ring-[#B6D8CF]">{meta.label}</span>
            <span className="rounded-full bg-[#FFF2CC] px-2 py-0.5 text-[9px] font-black text-[#8B640C] ring-1 ring-[#E4C56B]">{roleLabel}</span>
          </div>
          <div className="mt-1 line-clamp-2 text-[13px] font-black leading-5 text-slate-900">{item.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-500">
            {priceText ? <span className="font-black text-[var(--accent-ink)]">{priceText}</span> : null}
            {item.shopName ? <span>{item.shopName}</span> : null}
            
          </div>
          {isPartner && item.reason ? (
            <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500">{item.reason}</p>
          ) : item.useGuide ? (
            <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500">{item.useGuide}</p>
          ) : null}
        </div>
      </div>
      <a
        href={itemUrl}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        onClick={handleClick}
        className="mt-2 inline-flex w-full items-center justify-center rounded-[16px] bg-[var(--accent)] px-3 py-2 text-[11px] font-black text-white hover:bg-[var(--accent-ink)]"
      >
        {buttonText}
      </a>
    </div>
  );
}

function CareSetCard({ card, cardPosition, trackingContext }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#F8FCFA] p-4 ring-1 ring-[#B6D8CF] shadow-[0_18px_44px_-28px_rgba(15,35,35,0.32)]">
      <div className="absolute right-4 top-4 flex opacity-90">
        <img src={getPolicyIconPath(card.policyKey)} alt="" className="h-8 w-8 rounded-full bg-white p-1 ring-1 ring-[#B6D8CF]" loading="lazy" />
      </div>
      <div className="pr-20">
        <div className="text-[11px] font-black tracking-[0.14em] text-[#2F8F79]/70">MYセレクト {cardPosition}</div>
        <h3 className="mt-1 text-[16px] font-black leading-6 text-slate-900">{card.title}</h3>
        <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">{card.lead}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {safeArray(card.tags).map((tag) => (
          <span key={tag} className="rounded-full border border-[#B6D8CF] bg-white px-2.5 py-1 text-[10px] font-black text-[#4B6B67] ring-1 ring-[#C6E1DA]">
            {POLICY_META[tag]?.label || tag}
          </span>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        {card.items.map((item, index) => (
          <KitItemRow
            key={`${card.key}-${getSetItemKey(item)}-${index}`}
            item={item}
            itemPosition={(cardPosition - 1) * 10 + index + 1}
            setKey={card.key}
            trackingContext={{ ...trackingContext, policyKeys: card.policyKeys || [card.policyKey], setPolicyKey: card.policyKey, setTitle: card.title }}
          />
        ))}
      </div>
    </div>
  );
}

export default function CareNaviPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [tomorrowBundle, setTomorrowBundle] = useState(null);

  const [basis, setBasis] = useState("base");
  const [kitMode, setKitMode] = useState("starter");
  const [selectedSymptom, setSelectedSymptom] = useState("");
  const [lifeKeys, setLifeKeys] = useState([]);

  const [rakutenItemsByCategory, setRakutenItemsByCategory] = useState({ live: [], eat: [], point: [] });
  const [rakutenQueries, setRakutenQueries] = useState([]);
  const [rakutenLoading, setRakutenLoading] = useState(false);
  const [rakutenError, setRakutenError] = useState("");
  const [rakutenRetryNonce, setRakutenRetryNonce] = useState(0);
  const [visibleLimit, setVisibleLimit] = useState(CARE_SET_INITIAL_LIMIT);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setProfileError("");

        if (!supabase?.auth) {
          setProfile(null);
          setProfileError("体質トリセツ未適用です。");
          return;
        }

        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;

        if (!token) {
          setProfile(null);
          setProfileError("ログインすると体質トリセツを反映できます。");
          return;
        }

        const res = await fetch("/api/care-navi/context", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));

        if (!cancelled && res.ok && json?.profile) {
          setProfile(json.profile);
          setSelectedSymptom((prev) => prev || json.profile.active_symptom_focus || "");
        } else if (!cancelled) {
          setProfile(null);
          setProfileError(json?.error || "体質トリセツがまだありません。");
        }

        try {
          const { tomorrow } = getJstTodayTomorrow();
          const qs = new URLSearchParams({ date: tomorrow });
          const forecastRes = await fetch(`/api/radar/v1/forecast?${qs.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          const forecastJson = await forecastRes.json().catch(() => ({}));
          if (!cancelled && forecastRes.ok) {
            setTomorrowBundle(forecastJson);
          }
        } catch {
          if (!cancelled) setTomorrowBundle(null);
        }
      } catch (error) {
        if (!cancelled) {
          setProfile(null);
          setProfileError(error?.message || "体質トリセツ情報を読み込めませんでした。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const nextMode = params.get("mode") || params.get("set") || params.get("depth");
    const weather = params.get("weather") || params.get("basis");
    const nextSymptom = params.get("symptom");
    const nextLifeKeys = String(params.get("life") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (SET_MODE_OPTIONS.some((option) => option.key === nextMode)) {
      setKitMode(nextMode);
    }

    if (weather === "tomorrow" || weather === "season") {
      setBasis(weather);
    } else if (weather === "none" || weather === "base") {
      setBasis("base");
    }

    if (nextSymptom && SYMPTOM_LABELS[nextSymptom]) {
      setSelectedSymptom(nextSymptom);
    }

    if (nextLifeKeys.length) {
      setLifeKeys(nextLifeKeys.filter((key) => LIFE_OPTIONS.some((item) => item.key === key)).slice(0, 3));
    }
  }, []);

  const symptomKey = selectedSymptom || profile?.active_symptom_focus || "fatigue";
  const symptomLabel = SYMPTOM_LABELS[symptomKey] || "今気になること";

  const profileLike = useMemo(() => {
    const computed = profile?.computed || {};
    return {
      core_code: profile?.core_code || computed.core_code || null,
      sub_labels: safeArray(profile?.sub_labels || computed.sub_labels),
      computed,
    };
  }, [profile]);

  const karteCarePreferences = useMemo(
    () => buildKarteCarePreferences(profileLike, symptomKey),
    [profileLike, symptomKey]
  );

  const forecastCarePolicies = useMemo(() => {
    if (!tomorrowBundle?.forecast) return null;
    return deriveCarePolicies({
      forecast: tomorrowBundle.forecast,
      triggerFactors: getForecastTriggerFactors(tomorrowBundle.forecast),
      riskContext: getRiskContext(tomorrowBundle),
      mode: "tomorrow",
      symptomFocus: symptomKey,
    });
  }, [tomorrowBundle, symptomKey]);

  const policyKeys = useMemo(() => {
    const baseScores = karteCarePreferences?.scores || {};
    let keys = [];

    if (basis === "tomorrow" && forecastCarePolicies) {
      keys = safeArray(forecastCarePolicies?.policies).map((policy) => policy.key).filter(Boolean);
    }

    if (!keys.length && basis === "season") {
      keys = buildConditionPolicyKeys({
        baseScores,
        extraPolicyKeys: SEASON_POLICY_HINTS[getSeasonKey()],
        extraWeight: 1.22,
        baseWeight: 0.52,
        fallbackKeys: ["nagasu", "meguraseru"],
      });
    }

    if (!keys.length) {
      keys = selectPolicyKeysFromScores(baseScores, ["yurumeru", "nagasu"]);
    }

    return mergePolicyKeysWithLife(keys, lifeKeys, baseScores);
  }, [basis, karteCarePreferences, forecastCarePolicies, lifeKeys]);

  const policyKeySignature = policyKeys.join("|");
  const lifeKeySignature = lifeKeys.join("|");
  useEffect(() => {
    setVisibleLimit(CARE_SET_INITIAL_LIMIT);
  }, [kitMode, basis, lifeKeySignature, symptomKey, policyKeySignature]);

  const seasonKey = getSeasonKey();
  const seasonLabel = SEASON_LABELS[seasonKey] || "季節";
  const tomorrowTriggerFactors = useMemo(
    () => (tomorrowBundle?.forecast ? getForecastTriggerFactors(tomorrowBundle.forecast) : []),
    [tomorrowBundle]
  );
  const registeredSymptomKey = profile?.active_symptom_focus || profile?.symptom_focus || profile?.diagnosis_symptom_focus || "";
  const symptomChanged = Boolean(registeredSymptomKey && symptomKey && symptomKey !== registeredSymptomKey);
  const approachTags = useMemo(
    () =>
      buildApproachTags({
        environmentMode: basis,
        triggerFactors: tomorrowTriggerFactors,
        seasonLabel,
        lifeKeys,
        symptomChanged,
        symptomLabel,
      }),
    [basis, tomorrowTriggerFactors, seasonLabel, lifeKeys, symptomChanged, symptomLabel]
  );

  const kitPriceBand = SET_MODE_PRICE_BAND[kitMode] || "light";
  const kitModeMeta = getSetModeMeta(kitMode);

  function retryRakutenSearch() {
    setRakutenRetryNonce((value) => value + 1);
  }

  useEffect(() => {
    if (!policyKeys.length) {
      setRakutenItemsByCategory({ live: [], eat: [], point: [] });
      setRakutenQueries([]);
      setRakutenError("");
      setRakutenLoading(false);
      return;
    }

    const controller = new AbortController();
    setRakutenLoading(true);
    setRakutenError("");

    async function searchRakutenItems() {

      try {
        const results = await Promise.all(
          CATEGORY_ORDER.map(async (categoryKey) => {
            const res = await fetch("/api/care-navi/rakuten", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              cache: "no-store",
              signal: controller.signal,
              body: JSON.stringify({
                category: categoryKey,
                policyKeys,
                symptomKey,
                basis,
                lifeKeys,
                priceBand: kitPriceBand,
                limit: 18,
                totalLimit: CARE_NAVI_TOTAL_LIMIT,
              }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json?.ok) {
              return { categoryKey, items: [], queries: [], errors: [{ status: res.status, message: json?.error || "取得できませんでした。" }] };
            }

            return {
              categoryKey,
              items: Array.isArray(json.items) ? json.items : [],
              queries: Array.isArray(json.queries) ? json.queries : [],
              errors: Array.isArray(json.errors) ? json.errors.filter(Boolean) : [],
            };
          })
        );

        const nextByCategory = { live: [], eat: [], point: [] };
        const nextQueries = [];
        const apiErrors = [];

        results.forEach((result) => {
          nextByCategory[result.categoryKey] = safeArray(result.items).map((item) => ({ ...item, category: result.categoryKey }));
          nextQueries.push(...safeArray(result.queries));
          apiErrors.push(...safeArray(result.errors));
        });

        setRakutenItemsByCategory(nextByCategory);
        setRakutenQueries(unique(nextQueries).slice(0, 8));

        const hasAnyItems = Object.values(nextByCategory).some((items) => items.length);
        if (!hasAnyItems && apiErrors.length) {
          setRakutenError("RAKUTEN_RETRYABLE_ERROR");
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        setRakutenItemsByCategory({ live: [], eat: [], point: [] });
        setRakutenQueries([]);
        setRakutenError("RAKUTEN_RETRYABLE_ERROR");
      } finally {
        if (!controller.signal.aborted) setRakutenLoading(false);
      }
    }

    const searchTimer = setTimeout(searchRakutenItems, 360);

    return () => {
      clearTimeout(searchTimer);
      controller.abort();
    };
  }, [kitMode, kitPriceBand, policyKeySignature, symptomKey, basis, lifeKeySignature, rakutenRetryNonce]);

  const partnerItemsByCategory = useMemo(
    () =>
      Object.fromEntries(
        CATEGORY_ORDER.map((categoryKey) => [
          categoryKey,
          scorePartnerOffers({
            category: categoryKey,
            policyKeys,
            symptomKey,
            symptomLabel,
            profile: profileLike,
            environmentMode: basis,
            triggerFactors: tomorrowTriggerFactors,
            seasonKey,
            seasonLabel,
            lifeKeys,
            priceBand: kitPriceBand,
            // 表示件数ではなく内部候補プール。A8側を先に絞りすぎると、
            // スロット別には合う提携商品がセット組み立て前に落ちるため少し広めに渡す。
            limit: kitMode === "environment" ? 12 : 8,
          }),
        ])
      ),
    [kitMode, kitPriceBand, policyKeys, symptomKey, symptomLabel, profileLike, basis, tomorrowTriggerFactors, seasonKey, seasonLabel, lifeKeys]
  );

  const careSetCards = useMemo(
    () =>
      buildCareSetCards({
        mode: kitMode,
        itemsByCategory: rakutenItemsByCategory,
        partnerItemsByCategory,
        policyKeys,
        symptomKey,
        lifeKeys,
        triggerFactors: tomorrowTriggerFactors,
        symptomLabel,
        approachTags,
        profileLike,
      }),
    [kitMode, rakutenItemsByCategory, partnerItemsByCategory, policyKeys, symptomKey, lifeKeys, tomorrowTriggerFactors, symptomLabel, approachTags, profileLike]
  );

  const displaySets = careSetCards.slice(0, visibleLimit);
  const canShowMore = careSetCards.length > visibleLimit;

  const trackingContext = useMemo(() => {
    const weatherSummary = compactForecastSummary(tomorrowBundle);

    return {
      basis,
      category: "set",
      kitMode,
      priceBand: kitPriceBand,
      symptomKey,
      coreCode: profileLike.core_code || null,
      subCodes: safeArray(profileLike.sub_labels),
      policyKeys,
      lifeKeys,
      weatherDate: weatherSummary.date,
      weatherRiskLevel: weatherSummary.riskLevel,
      weatherSummary,
    };
  }, [basis, kitMode, kitPriceBand, symptomKey, profileLike, policyKeys, lifeKeys, tomorrowBundle]);

  const coreLabel = profileLike.core_code ? getCoreLabel(profileLike.core_code) : null;
  const coreTitle = coreLabel?.title || coreLabel?.short || "";
  const coreIconPath = getCoreIconPath(profileLike.core_code);
  const subLabels = getSubLabels(profileLike.sub_labels).slice(0, 2);
  const subText = subLabels.map((s) => s.short || s.title).filter(Boolean).join("・");

  function toggleLifeKey(key) {
    setLifeKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key].slice(-3)
    );
  }

  return (
    <div style={CARE_NAVI_THEME}>
      <AppShell
      title="MYケアセレクト"
      subtitle="ケア用品・食品・サービス候補"
      headerRight={
        <Button size="sm" variant="ghost" onClick={() => router.push("/settings")}>
          設定
        </Button>
      }
    >
      <Module className="relative !bg-white p-4 sm:p-5">
        <CheckOrbitMark />

        <div className="relative z-10">
          <ModuleHeader
            icon={<IconCare className="h-6 w-6" />}
            title="MYケアセレクト"
            sub="体質・天気・生活サインに合わせて、ケア用品・食品・サービス候補を選ぶ"
          />

          <div className="px-1 pb-1 pt-4">
          <div className="rounded-[26px] bg-[#EAF6F3] p-4 ring-1 ring-[#B6D8CF] shadow-[inset_0_2px_8px_rgba(15,35,35,0.05),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[18px] bg-white text-[var(--accent-ink)] ring-1 ring-[#A7D4CB] shadow-sm">
                {coreIconPath ? (
                  <img src={coreIconPath} alt="" className="h-10 w-10 object-contain" loading="lazy" />
                ) : (
                  <IconKarte className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-black text-slate-900">
                  {profile ? "体質傾向を反映済み" : "体質トリセツ未適用"}
                </div>
                <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                  {loading
                    ? "トリセツ情報を確認しています。"
                    : profile
                      ? `${coreTitle || "体質傾向"}${subText ? ` / ${subText}` : ""} を手がかりにしています。`
                      : profileError || "条件だけでも候補を出せます。"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-[22px] bg-white p-3 ring-1 ring-[#B6D8CF]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black tracking-[0.12em] text-slate-400">基準</div>
                  <div className="mt-1 text-[13px] font-black text-slate-900">体質トリセツ ＋ 登録中の不調</div>
                  <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                    ここを土台に、必要なときだけ天候・生活・別の不調を重ねます。
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-[#EEF7F5] px-2.5 py-1 text-[10px] font-black text-[#173F3A] ring-1 ring-[#B6D8CF]">
                  常時反映
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11px] font-black tracking-[0.12em] text-slate-400">合わせる天候</div>
                <button
                  type="button"
                  onClick={() => setBasis("base")}
                  className="text-[10px] font-black text-slate-400 underline decoration-slate-300 underline-offset-2"
                >
                  外す
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {WEATHER_FILTER_OPTIONS.map((item) => {
                  const active = basis === item.key;
                  const label = item.key === "season" ? `季節（${seasonLabel}）の天候` : item.label;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setBasis(active ? "base" : item.key)}
                      className={[
                        "rounded-[16px] px-3 py-2 text-center text-[11px] font-black ring-1 transition-all",
                        active
                          ? "bg-[var(--accent)] text-white ring-[var(--accent)] shadow-[0_12px_24px_-16px_rgba(52,155,131,0.30)]"
                          : "bg-white text-slate-600 ring-[var(--ring)] hover:bg-[#EAF6F3] hover:text-slate-900",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-[11px] font-bold leading-5 text-slate-500">
                {basis === "tomorrow"
                  ? "予報ページの明日タブと同じ方針エンジンを使います。"
                  : basis === "season"
                    ? `${seasonLabel}に起きやすい天候の波を重ねます。`
                    : "未選択時は、天候に左右されすぎない通年の候補を優先します。"}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11px] font-black tracking-[0.12em] text-slate-400">気になる不調を変更</div>
                <div className="text-[10px] font-bold text-slate-400">このページだけ</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SYMPTOM_LABELS).map(([key, label]) => (
                  <Chip key={key} active={symptomKey === key} onClick={() => setSelectedSymptom(key)}>
                    {label}
                  </Chip>
                ))}
                {registeredSymptomKey && symptomChanged ? (
                  <Chip active={false} onClick={() => setSelectedSymptom(registeredSymptomKey)}>
                    登録中に戻す
                  </Chip>
                ) : null}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11px] font-black tracking-[0.12em] text-slate-400">最近の生活を足す</div>
                <div className="text-[10px] font-bold text-slate-400">任意・最大3つ</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {LIFE_OPTIONS.map((item) => (
                  <Chip key={item.key} active={lifeKeys.includes(item.key)} onClick={() => toggleLifeKey(item.key)}>
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] bg-[#EAF6F3] p-4 ring-1 ring-[#B6D8CF] shadow-[inset_0_2px_8px_rgba(15,35,35,0.05),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black tracking-[0.14em] text-[#173F3A]/65">今回の方針</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {policyKeys.map((key) => (
                      <PolicyPill key={key} policyKey={key} />
                    ))}
                  </div>
                </div>
                <div className="max-w-[120px] text-right text-[10px] font-bold leading-4 text-slate-500">
                  {symptomLabel}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {approachTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[#9CCFC4] bg-white px-2.5 py-1 text-[10px] font-black text-[#28665F] ring-1 ring-[#B6D8CF]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <SetModeFilter value={kitMode} onChange={setKitMode} />
          </div>
        </div>
      </div>
      </Module>

      <Module className="!bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[18px] bg-[color-mix(in_srgb,var(--mint),white_30%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm">
            <IconCare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[16px] font-black tracking-tight text-slate-900">{kitModeMeta.label}</div>
            <div className="mt-0.5 text-[11px] font-bold leading-5 text-slate-500">今回の方針から、暮らす・食べる・ほぐすを組み合わせます。</div>
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          <RakutenStatusCard error={rakutenError} onRetry={retryRakutenSearch} loading={rakutenLoading} />
          <div className="rounded-[18px] bg-[#F5FBF8] px-3 py-2 text-[10px] font-bold leading-5 text-slate-500 ring-1 ring-[#B6D8CF]">
            このページには紹介リンクを含みます。未病レーダーでは、体質・天気・生活サインをもとに、ケア用品・食品・サービス候補をあなた向けに選んでいます。医療的な治療ではなく、毎日のセルフケア選びとして活用してください。
          </div>

          {rakutenLoading ? (
            <RakutenLoadingCards />
          ) : displaySets.length ? (
            <>
              {displaySets.map((card, index) => (
                <CareSetCard
                  key={`${kitMode}-${card.key}-${index}`}
                  card={card}
                  cardPosition={index + 1}
                  trackingContext={trackingContext}
                />
              ))}
              {canShowMore ? (
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => Math.min(CARE_SET_EXPANDED_LIMIT, prev + 3))}
                  className="w-full rounded-[18px] bg-[#EAF6F3] px-4 py-3 text-[12px] font-black text-[var(--accent-ink)] ring-1 ring-[#B6D8CF] hover:bg-[#DDF1EC]"
                >
                  セットをもっと見る（{Math.min(CARE_SET_EXPANDED_LIMIT, careSetCards.length) - visibleLimit}件）
                </button>
              ) : null}
            </>
          ) : (
            <div className="rounded-[22px] bg-white p-4 text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[var(--ring)]">
              条件に合うMYケア候補を十分に組めませんでした。セットタイプや気になる不調、生活サインを少し変えてお試しください。
            </div>
          )}
        </div>
      </Module>
      </AppShell>
    </div>
  );
}
