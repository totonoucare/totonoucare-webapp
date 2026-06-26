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
    label: "まず試すセット",
    band: "light",
    lead: "小さく始める2〜3点。今日から置き換えやすい組み合わせ。",
  },
  {
    key: "steady",
    label: "しっかり整えるセット",
    band: "standard",
    lead: "暮らす・食べる・ほぐすをそろえて、数日続ける前提の組み合わせ。",
  },
  {
    key: "environment",
    label: "環境から見直すセット",
    band: "deep",
    lead: "寝具・空気・宅食・ケア機器など、土台ごと変える候補。サービス導線も含みます。",
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
const CARE_SET_INITIAL_LIMIT = 3;
const CARE_SET_EXPANDED_LIMIT = 6;

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
  nagasu: { label: "ながす", short: "重さをためない" },
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
  caffeine_shift: "カフェインを減らす",
  light_meal: "軽めの食事",
  pantry_soup: "常備しやすい汁物",
  nutrition_support: "栄養補助",
  ingredient: "素材を足す",
  drinkware: "温かい一杯の道具",
  neck_shoulder_release: "首肩をほぐす",
  posture_release: "姿勢を切り替える",
  foot_leg_release: "足元を軽くする",
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
      { title: "温かいお茶・軽いスープ", query: "温かい お茶 スープ セット", reason: "甘いものやカフェインだけで粘らないための候補です。", tags: ["温かい", "軽め"] },
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
      { title: "軽い汁物・スープ", query: "具だくさん スープ 常温 保存", reason: "食べすぎず、温かさと軽さを両立しやすい候補です。", tags: ["スープ", "軽め"] },
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
      { title: "温かいお茶・汁物", query: "ノンカフェイン お茶 温活", reason: "乾いた菓子やコーヒーだけに偏らない候補です。", tags: ["温かい", "乾燥"] },
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
      { title: "しょうが湯・温かい汁物", query: "しょうが湯 スープ 温活", reason: "内側を冷やしっぱなしにしない候補です。", tags: ["温かい", "胃腸"] },
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
      { title: "味噌汁・軽いスープ系", query: "味噌汁 フリーズドライ スープ", reason: "食べすぎず、温かく軽く足しやすい候補です。", tags: ["胃腸", "軽め"] },
      { title: "温かいお茶・白湯まわり", query: "温かい お茶 ノンカフェイン 胃腸", reason: "冷たい飲み物やカフェインに偏らない候補です。", tags: ["飲み物", "胃腸"] },
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

function RakutenStatusCard({ error, queries }) {
  if (error) {
    return (
      <div className="rounded-[22px] bg-[#FFF7E8] p-4 text-[12px] font-bold leading-6 text-[#77540B] ring-1 ring-[#E4C56B]/70">
        {error}
        <div className="mt-1 text-[11px] text-[#A36E14]">
          APIキー未設定の場合は、Vercelの環境変数に RAKUTEN_APPLICATION_ID / RAKUTEN_ACCESS_KEY を入れてください。
        </div>
      </div>
    );
  }

  if (!queries?.length) return null;

  return (
    <div className="rounded-[18px] bg-[#F5FBF8] px-3 py-2 text-[10px] font-bold leading-5 text-slate-500 ring-1 ring-[#B6D8CF]">
      検索軸：{queries.slice(0, 3).join(" / ")}
    </div>
  );
}


function getSetModeMeta(mode) {
  return SET_MODE_OPTIONS.find((item) => item.key === mode) || SET_MODE_OPTIONS[0];
}

function getSetItemKey(item) {
  return item?.itemUrl || item?.clickUrl || item?.itemCode || `${item?.source || "item"}:${item?.title || ""}:${item?.shopName || ""}`;
}

function itemText(item) {
  return `${item?.title || ""} ${item?.query || ""} ${safeArray(item?.tags).join(" ")} ${item?.shopName || ""}`.toLowerCase();
}

function hasAnyText(item, keywords = []) {
  const text = itemText(item);
  return safeArray(keywords).some((keyword) => text.includes(String(keyword || "").toLowerCase()));
}

function inferRoleLabelFromItem(item) {
  const roleLabel = getProductRoleLabel(item);
  if (roleLabel && roleLabel !== "ケア候補") return roleLabel;

  const category = item?.category;
  if (category === "live") return "暮らしを整える";
  if (category === "eat") return "食べ方を整える";
  if (category === "point") return "体をほぐす";
  return "ケア候補";
}

function scoreKitCandidate(item, slot, { mode, policyKeys = [] } = {}) {
  if (!item) return -999;
  let score = 0;
  if (item.category === slot.category) score += 20;
  if (safeArray(slot.roles).includes(item.productRole) || safeArray(slot.roles).includes(item.intentType)) score += 8;
  if (safeArray(slot.productTypes).includes(item.productType)) score += 4;
  if (hasAnyText(item, slot.keywords)) score += 5;
  if (hasAnyText(item, slot.avoidKeywords)) score -= 8;
  if (safeArray(policyKeys).includes(item.policyKey)) score += 3;
  if (item.source === "a8" || item.sourceType === "partner") score += mode === "environment" ? 5 : 1.2;
  if (mode === "starter" && item.price && Number(item.price) <= 2500) score += 2;
  if (mode === "environment" && item.price && Number(item.price) >= 5000) score += 1.5;
  score += Math.min(Number(item.score || 0), 20) * 0.04;
  return score;
}

function pickKitItem(candidates, slot, used, context) {
  const ranked = safeArray(candidates)
    .filter((item) => item?.category === slot.category)
    .filter((item) => {
      const key = getSetItemKey(item);
      return key && !used.has(key);
    })
    .map((item) => ({ item, score: scoreKitCandidate(item, slot, context) }))
    .filter((entry) => entry.score > -20)
    .sort((a, b) => b.score - a.score);

  const picked = ranked[0]?.item || null;
  if (picked) used.add(getSetItemKey(picked));
  return picked;
}

function makeSlot(category, roles = [], keywords = [], extra = {}) {
  return { category, roles, keywords, ...extra };
}

function getKitDefinitions(mode, { symptomLabel = "", policyKeys = [] } = {}) {
  const primaryPolicy = POLICY_META[policyKeys?.[0]]?.label || "今の方針";
  if (mode === "environment") {
    return [
      {
        key: "sleep-environment",
        title: "環境から見直す：休む土台セット",
        lead: "寝具・睡眠環境・夜の切り替えをまとめて見直す組み合わせです。",
        slots: [
          makeSlot("live", ["sleep_environment", "reduce_light", "warm_body"], ["睡眠", "枕", "マットレス", "寝具", "アイマスク"]),
          makeSlot("point", ["neck_shoulder_release", "posture_release", "tsubo_support"], ["首", "肩", "腰", "温熱", "リカバリー"]),
          makeSlot("eat", ["caffeine_shift", "warm_drink", "nutrition_support"], ["カフェインレス", "ハーブ", "温かい", "宅食", "スープ"]),
        ],
        tags: [primaryPolicy, symptomLabel, "睡眠環境", "高単価候補"],
      },
      {
        key: "meal-outsourcing",
        title: "環境から見直す：食事を外に預けるセット",
        lead: "食べる余力が少ない時に、食事準備そのものを軽くする発想です。",
        slots: [
          makeSlot("eat", ["nutrition_support", "light_meal", "pantry_soup"], ["宅食", "ミール", "冷凍", "惣菜", "スープ", "食事"]),
          makeSlot("live", ["sleep_environment", "bath_shift", "warm_body"], ["入浴", "睡眠", "腹巻", "温熱", "リカバリー"]),
          makeSlot("point", ["gentle_stretch", "foot_leg_release", "neck_shoulder_release"], ["ストレッチ", "ローラー", "足", "首", "肩"]),
        ],
        tags: [primaryPolicy, "食事負担", "サービス候補"],
      },
      {
        key: "air-room",
        title: "環境から見直す：空気・湿度セット",
        lead: "湿気・乾燥・寝室のこもりを、部屋側から変える組み合わせです。",
        slots: [
          makeSlot("live", ["humidity_control", "moisture_air", "sleep_environment"], ["除湿", "加湿", "空気", "サーキュレーター", "寝室"]),
          makeSlot("eat", ["warm_drink", "drinkware", "caffeine_shift"], ["ボトル", "白湯", "カフェインレス", "お茶"]),
          makeSlot("point", ["neck_shoulder_release", "foot_leg_release", "posture_release"], ["首", "肩", "ふくらはぎ", "足", "ローラー"]),
        ],
        tags: [primaryPolicy, "空気環境", "湿度"],
      },
    ];
  }

  if (mode === "steady") {
    return [
      {
        key: "night-routine",
        title: "しっかり整える：夜の切り替えセット",
        lead: "入浴・飲み物・首肩ケアをつなげて、夜の力みを残しにくくします。",
        slots: [
          makeSlot("live", ["bath_shift", "reduce_light", "sleep_environment"], ["入浴", "アイマスク", "睡眠", "温浴"]),
          makeSlot("eat", ["caffeine_shift", "warm_drink"], ["カフェインレス", "ハーブ", "ルイボス", "しょうが"]),
          makeSlot("point", ["neck_shoulder_release", "tsubo_support"], ["首", "肩", "頭皮", "温熱", "ツボ"]),
        ],
        tags: [primaryPolicy, "夜ケア", symptomLabel],
      },
      {
        key: "heavy-damp",
        title: "しっかり整える：重だるさ対策セット",
        lead: "湿気・食べすぎ・動かなさが重なる日に、ため込まない方向へ寄せます。",
        slots: [
          makeSlot("live", ["humidity_control", "bath_shift"], ["除湿", "入浴", "足湯", "サーキュレーター"]),
          makeSlot("eat", ["light_meal", "pantry_soup", "warm_drink"], ["味噌汁", "スープ", "雑炊", "はとむぎ"]),
          makeSlot("point", ["foot_leg_release", "gentle_stretch"], ["ふくらはぎ", "足", "ローラー", "ストレッチ"]),
        ],
        tags: [primaryPolicy, "重だるさ", "生活セット"],
      },
      {
        key: "screen-neck",
        title: "しっかり整える：画面作業リセットセット",
        lead: "目・首肩・カフェインの偏りをまとめて切り替える組み合わせです。",
        slots: [
          makeSlot("live", ["reduce_light", "sleep_environment"], ["ホットアイマスク", "アイマスク", "光", "目元"]),
          makeSlot("point", ["neck_shoulder_release", "posture_release"], ["首", "肩", "頭皮", "マッサージ"]),
          makeSlot("eat", ["caffeine_shift", "warm_drink"], ["カフェインレス", "ルイボス", "ハーブ", "温かい"]),
        ],
        tags: [primaryPolicy, "画面作業", "首肩"],
      },
    ];
  }

  return [
    {
      key: "warm-small",
      title: "まず試す：温かく切り替えるセット",
      lead: "冷たい飲み物・軽食・首肩のこわばりを、小さく切り替える組み合わせです。",
      slots: [
        makeSlot("eat", ["warm_drink", "light_meal", "pantry_soup"], ["しょうが", "味噌汁", "スープ", "カフェインレス"]),
        makeSlot("point", ["neck_shoulder_release", "tsubo_support"], ["首", "肩", "頭皮", "ツボ", "ボール"]),
      ],
      tags: [primaryPolicy, "まず試す", symptomLabel],
    },
    {
      key: "mini-night",
      title: "まず試す：夜の余白セット",
      lead: "寝る前に刺激を減らして、温かい一杯へ置き換える軽めのセットです。",
      slots: [
        makeSlot("live", ["reduce_light", "sleep_environment"], ["アイマスク", "目元", "睡眠", "耳栓"]),
        makeSlot("eat", ["caffeine_shift", "warm_drink"], ["ノンカフェイン", "カフェインレス", "ハーブ", "ルイボス"]),
      ],
      tags: [primaryPolicy, "夜ケア", "低負担"],
    },
    {
      key: "mini-heavy",
      title: "まず試す：重さをためないセット",
      lead: "食べすぎ・湿気・足元の重さが気になる日に、軽く逃がす組み合わせです。",
      slots: [
        makeSlot("eat", ["light_meal", "pantry_soup", "warm_drink"], ["味噌汁", "スープ", "雑炊", "はとむぎ"]),
        makeSlot("point", ["foot_leg_release", "gentle_stretch"], ["ふくらはぎ", "足裏", "ローラー", "ストレッチ"]),
        makeSlot("live", ["bath_shift", "humidity_control"], ["入浴", "足湯", "除湿", "湿気"]),
      ],
      tags: [primaryPolicy, "重だるさ", "小さく整える"],
    },
  ];
}

function buildCareSetCards({ mode, itemsByCategory, partnerItemsByCategory, policyKeys, symptomLabel, approachTags }) {
  const used = new Set();
  const byCategory = Object.fromEntries(
    CATEGORY_ORDER.map((category) => {
      const partner = safeArray(partnerItemsByCategory?.[category]).map((item) => ({ ...item, category, source: item.source || "a8", sourceType: item.sourceType || "partner" }));
      const rakuten = safeArray(itemsByCategory?.[category]).map((item) => ({ ...item, category, source: item.source || "rakuten", sourceType: item.sourceType || "rakuten", buttonText: item.buttonText || "楽天で見る" }));
      return [category, [...partner, ...rakuten]];
    })
  );

  return getKitDefinitions(mode, { symptomLabel, policyKeys })
    .map((definition) => {
      const localUsed = new Set(used);
      const items = definition.slots
        .map((slot) => pickKitItem(byCategory[slot.category], slot, localUsed, { mode, policyKeys }))
        .filter(Boolean);

      if (items.length >= 2) {
        items.forEach((item) => used.add(getSetItemKey(item)));
      }

      return {
        ...definition,
        items,
        tags: unique([...safeArray(definition.tags), ...safeArray(approachTags).slice(0, 2)]).filter(Boolean).slice(0, 6),
      };
    })
    .filter((card) => card.items.length >= 2);
}

function SetModeFilter({ value, onChange }) {
  return (
    <div className="rounded-[22px] bg-[#EAF6F3] p-3 ring-1 ring-[#9CCFC4]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[10px] font-black tracking-[0.14em] text-slate-400">セットの深さ</div>
        <div className="text-[10px] font-bold text-slate-400">単品ではなく組み合わせで提案</div>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {SET_MODE_OPTIONS.map((option) => {
          const active = value === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={[
                "rounded-[18px] px-3 py-2.5 text-left transition-all ring-1",
                active
                  ? "bg-[var(--accent)] text-white ring-[var(--accent)] shadow-[0_12px_24px_-16px_rgba(52,155,131,0.30)]"
                  : "bg-white text-slate-600 ring-[var(--ring)] hover:bg-[#EAF6F3] hover:text-slate-900",
              ].join(" ")}
            >
              <div className="text-[12px] font-black leading-4">{option.label}</div>
              <div className={["mt-1 text-[9px] font-bold leading-4", active ? "text-white/80" : "text-slate-400"].join(" ")}>{option.lead}</div>
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
            {isPartner ? <span>提携/サービス候補</span> : null}
          </div>
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
      <div className="absolute right-4 top-4 flex -space-x-1 opacity-90">
        {safeArray(trackingContext?.policyKeys).slice(0, 3).map((policyKey) => (
          <img key={policyKey} src={getPolicyIconPath(policyKey)} alt="" className="h-8 w-8 rounded-full bg-white p-1 ring-1 ring-[#B6D8CF]" loading="lazy" />
        ))}
      </div>
      <div className="pr-20">
        <div className="text-[11px] font-black tracking-[0.14em] text-[#2F8F79]/70">CARE SET {cardPosition}</div>
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
            trackingContext={trackingContext}
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

  useEffect(() => {
    if (!policyKeys.length) {
      setRakutenItemsByCategory({ live: [], eat: [], point: [] });
      setRakutenQueries([]);
      setRakutenError("");
      setRakutenLoading(false);
      return;
    }

    const controller = new AbortController();

    async function searchRakutenItems() {
      setRakutenLoading(true);
      setRakutenError("");

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
          const first = apiErrors[0] || {};
          setRakutenError(
            `楽天APIから商品候補を取得できませんでした。${first.status ? ` status: ${first.status}` : ""}${first.message ? ` / ${first.message}` : ""}`
          );
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        setRakutenItemsByCategory({ live: [], eat: [], point: [] });
        setRakutenQueries([]);
        setRakutenError(error?.message || "楽天の商品候補を取得できませんでした。");
      } finally {
        if (!controller.signal.aborted) setRakutenLoading(false);
      }
    }

    searchRakutenItems();

    return () => {
      controller.abort();
    };
  }, [kitMode, kitPriceBand, policyKeySignature, symptomKey, basis, lifeKeySignature]);

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
            limit: kitMode === "environment" ? 6 : 4,
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
        symptomLabel,
        approachTags,
      }),
    [kitMode, rakutenItemsByCategory, partnerItemsByCategory, policyKeys, symptomLabel, approachTags]
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
      title="ケアナビ"
      subtitle="ケアセットナビ"
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
            title="ケアセットナビ"
            sub="体質・天気・生活サインに合わせて、暮らす・食べる・ほぐすを組み合わせる"
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
            <div className="mt-0.5 text-[11px] font-bold leading-5 text-slate-500">{kitModeMeta.lead}</div>
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          <RakutenStatusCard error={rakutenError} queries={rakutenQueries} />
          <div className="rounded-[18px] bg-[#F5FBF8] px-3 py-2 text-[10px] font-bold leading-5 text-slate-500 ring-1 ring-[#B6D8CF]">
            このページには広告リンクを含みます。ここでのセットは、医療的な効果を保証するものではなく、体質・天気・生活サインからセルフケアの買い方パターンを整理した候補です。
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
              表示できるケアセットが見つかりませんでした。生活サインを減らすか、セットの深さを変えてください。
            </div>
          )}
        </div>
      </Module>
      </AppShell>
    </div>
  );
}

