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

const CATEGORY_OPTIONS = [
  { key: "live", label: "暮らす", icon: IconLifestyle, lead: "環境・温め方・休み方の候補" },
  { key: "eat", label: "食べる", icon: IconFood, lead: "飲む・補う・軽めに食べる候補" },
  { key: "point", label: "ほぐす", icon: IconTsubo, lead: "ツボ押し・お灸・温熱・道具ケア候補" },
];

const PRICE_BAND_OPTIONS = [
  { key: "all", label: "すべて" },
  { key: "light", label: "お手軽" },
  { key: "standard", label: "標準" },
  { key: "deep", label: "しっかり" },
];

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
  { key: "overeating", label: "食べすぎぎみ", policies: ["sasaeru", "nagasu"] },
  { key: "no_bath", label: "湯船に入れていない", policies: ["meguraseru", "yurumeru"] },
  { key: "low_activity", label: "運動不足ぎみ", policies: ["meguraseru", "nagasu"] },
  { key: "tense", label: "緊張が続いた", policies: ["yurumeru", "shizumeru"] },
  { key: "outdoor", label: "外出が多い", policies: ["sasaeru", "uruosu"] },
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
  rainy: ["nagasu", "sasaeru"],
  summer: ["shizumeru", "uruosu"],
  autumn: ["uruosu", "sasaeru"],
  winter: ["nukumeru", "sasaeru"],
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
      { title: "入浴・足湯まわり", query: "足湯 バケツ 折りたたみ 入浴", reason: "軽く温めて巡りのきっかけを作ります。", tags: ["入浴", "足元"] },
      { title: "姿勢リセット用品", query: "ストレッチポール ハーフポール", reason: "座りっぱなしや固まった姿勢を一度切ります。", tags: ["姿勢", "リセット"] },
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

function selectPolicyKeysFromScores(scores, fallbackKeys = ["sasaeru", "yurumeru"]) {
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

function buildConditionPolicyKeys({ baseScores, extraPolicyKeys = [], extraWeight = 1, baseWeight = 0.55, fallbackKeys = ["sasaeru", "yurumeru"] } = {}) {
  const scores = createPolicyScoreMap();

  Object.entries(baseScores || {}).forEach(([key, value]) => {
    addPolicyScore(scores, key, Number(value || 0) * baseWeight);
  });

  addPolicyKeys(scores, extraPolicyKeys, extraWeight);

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
      <circle cx="82" cy="78" r="46" fill="none" stroke="#d7e8dd" strokeWidth="1.8" />
      <circle cx="82" cy="78" r="68" fill="none" stroke="#edf2ee" strokeWidth="1.5" />
      <path d="M38 110 A68 68 0 0 1 72 12" fill="none" stroke="#6bb69a" strokeWidth="3" strokeLinecap="round" opacity="0.62" />
      <path d="M94 13 A68 68 0 0 1 145 80" fill="none" stroke="#dfa42d" strokeWidth="3" strokeLinecap="round" opacity="0.58" />
      <circle cx="122" cy="32" r="5" fill="#dfa42d" opacity="0.48" />
      <circle cx="45" cy="109" r="4" fill="#4ea789" opacity="0.58" />
    </svg>
  );
}


function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-full px-3.5 py-2 text-[12px] font-black transition-all ring-1",
        active
          ? "bg-[var(--accent)] text-white ring-[var(--accent)] shadow-[0_12px_24px_-16px_rgba(53,95,82,0.55)]"
          : "bg-white text-slate-600 ring-[var(--ring)] hover:bg-[#F9FCFA] hover:text-slate-900",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PolicyPill({ policyKey }) {
  const policy = POLICY_META[policyKey] || {};
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-black text-[var(--accent-ink)] ring-1 ring-[#CFE3DA] shadow-[0_12px_24px_-18px_rgba(37,95,79,0.35)]">
      <img src={getPolicyIconPath(policyKey)} alt="" className="h-6 w-6 shrink-0" loading="lazy" />
      {policy.label || policyKey}
    </span>
  );
}

function CategoryTabs({ value, onChange }) {
  return (
    <div className="rounded-[22px] bg-slate-200/60 p-1 ring-1 ring-inset ring-slate-200/75 shadow-inner">
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
                  ? "bg-[var(--accent)] text-white shadow-[0_12px_24px_-16px_rgba(53,95,82,0.55)]"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
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

function ResultCard({ item, itemPosition, trackingContext }) {
  const policy = POLICY_META[item.policyKey] || {};
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
    <div className="relative overflow-hidden rounded-[26px] bg-white p-4 ring-1 ring-[var(--ring)] shadow-[0_14px_34px_-24px_rgba(40,55,48,0.24)]">
      <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-[var(--accent)]/55" />

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
            "grid shrink-0 place-items-center overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#F7FCF9_0%,#FFF8E5_100%)] text-[var(--accent-ink)] ring-1 ring-[#D8E7DC] shadow-sm",
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
              <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-black text-[#5F8D75]">
                <img src={getPolicyIconPath(item.policyKey)} alt="" className="h-5 w-5 shrink-0" loading="lazy" />
                {policy.label || item.policyKey}
              </div>
            </div>
          </div>

          <p className="mt-2 text-[11px] font-bold leading-5 text-slate-600">{polishCareReason(item.reason)}</p>

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
        {(item.tags || []).map((tag) => {
          const label = POLICY_META[tag]?.label || tag;
          return (
            <span key={tag} className="rounded-full bg-[#F8FCF9] px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-[#E3ECE5]">
              {label}
            </span>
          );
        })}
        {!isPartner && item.query ? (
          <span className="rounded-full bg-[#FFF8E8] px-2.5 py-1 text-[10px] font-black text-[#8A6417] ring-1 ring-[#EFE0AC]">
            {item.query}
          </span>
        ) : null}
      </div>

      <a
        href={itemUrl}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        onClick={handleClick}
        className="mt-3 inline-flex w-full items-center justify-center rounded-[18px] bg-[var(--accent)] px-4 py-2.5 text-[12px] font-black text-white shadow-[0_14px_28px_-18px_rgba(53,95,82,0.58)] hover:bg-[var(--accent-ink)]"
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
          className="relative overflow-hidden rounded-[26px] bg-white p-4 ring-1 ring-[var(--ring)] shadow-[0_14px_34px_-24px_rgba(40,55,48,0.24)]"
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
    <div className="rounded-[22px] bg-[#F8FCF9] p-3 ring-1 ring-[#E3ECE5]">
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
                  ? "bg-[var(--accent)] text-white ring-[var(--accent)] shadow-[0_12px_24px_-16px_rgba(53,95,82,0.55)]"
                  : "bg-white text-slate-600 ring-[var(--ring)] hover:bg-[#F9FCFA] hover:text-slate-900",
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
      <div className="rounded-[22px] bg-[#FFF9ED] p-4 text-[12px] font-bold leading-6 text-[#7B5619] ring-1 ring-[#EAD8A6]/70">
        {error}
        <div className="mt-1 text-[11px] text-[#AD7A18]">
          APIキー未設定の場合は、Vercelの環境変数に RAKUTEN_APPLICATION_ID / RAKUTEN_ACCESS_KEY を入れてください。
        </div>
      </div>
    );
  }

  if (!queries?.length) return null;

  return (
    <div className="rounded-[18px] bg-[#F8FCF9] px-3 py-2 text-[10px] font-bold leading-5 text-slate-500 ring-1 ring-[#E3ECE5]">
      検索軸：{queries.slice(0, 3).join(" / ")}
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
  const [category, setCategory] = useState("live");
  const [priceBand, setPriceBand] = useState("all");
  const [selectedSymptom, setSelectedSymptom] = useState("");
  const [lifeKeys, setLifeKeys] = useState([]);

  const [rakutenItems, setRakutenItems] = useState([]);
  const [rakutenQueries, setRakutenQueries] = useState([]);
  const [rakutenLoading, setRakutenLoading] = useState(false);
  const [rakutenError, setRakutenError] = useState("");

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
    const nextCategoryRaw = params.get("category");
    const nextCategory = nextCategoryRaw === "loosen" ? "point" : nextCategoryRaw;
    const weather = params.get("weather") || params.get("basis");
    const nextSymptom = params.get("symptom");
    const nextLifeKeys = String(params.get("life") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (CATEGORY_OPTIONS.some((option) => option.key === nextCategory)) {
      setCategory(nextCategory);
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

  useEffect(() => {
    setPriceBand("all");
  }, [category]);

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
        fallbackKeys: ["sasaeru", "meguraseru"],
      });
    }

    if (!keys.length) {
      keys = selectPolicyKeysFromScores(baseScores, ["sasaeru", "yurumeru"]);
    }

    return mergePolicyKeysWithLife(keys, lifeKeys, baseScores);
  }, [basis, karteCarePreferences, forecastCarePolicies, lifeKeys]);

  const policyKeySignature = policyKeys.join("|");
  const lifeKeySignature = lifeKeys.join("|");
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

  useEffect(() => {
    if (!policyKeys.length) {
      setRakutenItems([]);
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
        const res = await fetch("/api/care-navi/rakuten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            category,
            policyKeys,
            symptomKey,
            basis,
            lifeKeys,
            priceBand,
            limit: 8,
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "楽天の商品候補を取得できませんでした。");
        }

        const nextItems = Array.isArray(json.items) ? json.items : [];
        const apiErrors = Array.isArray(json.errors) ? json.errors.filter(Boolean) : [];

        setRakutenItems(nextItems);
        setRakutenQueries(Array.isArray(json.queries) ? json.queries : []);

        if (!nextItems.length && apiErrors.length) {
          const first = apiErrors[0] || {};
          setRakutenError(
            `楽天APIから商品候補を取得できませんでした。${first.status ? ` status: ${first.status}` : ""}${first.message ? ` / ${first.message}` : ""}`
          );
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        setRakutenItems([]);
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
  }, [category, priceBand, policyKeySignature, symptomKey, basis, lifeKeySignature]);

  const partnerItems = useMemo(
    () =>
      scorePartnerOffers({
        category,
        policyKeys,
        symptomKey,
        symptomLabel,
        profile: profileLike,
        environmentMode: basis,
        triggerFactors: tomorrowTriggerFactors,
        seasonKey,
        seasonLabel,
        lifeKeys,
        priceBand,
        limit: 4,
      }),
    [category, policyKeys, symptomKey, symptomLabel, profileLike, basis, tomorrowTriggerFactors, seasonKey, seasonLabel, lifeKeys, priceBand]
  );

  const visibleItems = useMemo(() => {
    const rakutenVisible = rakutenItems
      .filter((item) => itemMatchesPriceBand(item, category, priceBand))
      .map((item) => ({ ...item, source: item.source || "rakuten", sourceType: item.sourceType || "rakuten", buttonText: "楽天で見る" }));

    const mixed = [];
    if (partnerItems[0]) mixed.push(partnerItems[0]);
    if (rakutenVisible[0]) mixed.push(rakutenVisible[0]);
    if (partnerItems[1]) mixed.push(partnerItems[1]);
    if (rakutenVisible[1]) mixed.push(rakutenVisible[1]);
    if (partnerItems[2]) mixed.push(partnerItems[2]);

    for (let i = 2; i < rakutenVisible.length && mixed.length < 8; i += 1) {
      mixed.push(rakutenVisible[i]);
    }

    for (let i = 3; i < partnerItems.length && mixed.length < 8; i += 1) {
      mixed.push(partnerItems[i]);
    }

    return mixed.slice(0, 8);
  }, [partnerItems, rakutenItems, category, priceBand]);
  const priceBandLabel = getPriceBandLabel(category, priceBand);

  const trackingContext = useMemo(() => {
    const weatherSummary = compactForecastSummary(tomorrowBundle);

    return {
      basis,
      category,
      priceBand,
      symptomKey,
      coreCode: profileLike.core_code || null,
      subCodes: safeArray(profileLike.sub_labels),
      policyKeys,
      lifeKeys,
      weatherDate: weatherSummary.date,
      weatherRiskLevel: weatherSummary.riskLevel,
      weatherSummary,
    };
  }, [basis, category, priceBand, symptomKey, profileLike, policyKeys, lifeKeys, tomorrowBundle]);

  const coreLabel = profileLike.core_code ? getCoreLabel(profileLike.core_code) : null;
  const coreTitle = coreLabel?.title || coreLabel?.short || "";
  const coreIconPath = getCoreIconPath(profileLike.core_code);
  const subLabels = getSubLabels(profileLike.sub_labels).slice(0, 2);
  const subText = subLabels.map((s) => s.short || s.title).filter(Boolean).join("・");
  const categoryMeta = getCategoryMeta(category);
  const CategoryIcon = categoryMeta.icon;

  function toggleLifeKey(key) {
    setLifeKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key].slice(-3)
    );
  }

  return (
    <AppShell
      title="ケアナビ"
      subtitle="ケアアイテムナビ"
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
            title="ケアアイテムナビ"
            sub="体質・条件・コンディションに合わせたケアアイテムを探す"
          />

          <div className="px-1 pb-1 pt-4">
          <div className="rounded-[26px] bg-[#EAF5EF]/55 p-4 ring-1 ring-white/80 shadow-[inset_0_2px_8px_rgba(37,95,79,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[18px] bg-white text-[var(--accent-ink)] ring-1 ring-[#CFE0D3] shadow-sm">
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
            <div className="rounded-[22px] bg-white/85 p-3 ring-1 ring-[#DDE9E1]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black tracking-[0.12em] text-slate-400">基準</div>
                  <div className="mt-1 text-[13px] font-black text-slate-900">体質トリセツ ＋ 登録中の不調</div>
                  <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                    ここを土台に、必要なときだけ天候・生活・別の不調を重ねます。
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-[#F8FCF9] px-2.5 py-1 text-[10px] font-black text-[#24564C] ring-1 ring-[#D3E1D5]">
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
                          ? "bg-[var(--accent)] text-white ring-[var(--accent)] shadow-[0_12px_24px_-16px_rgba(53,95,82,0.55)]"
                          : "bg-white text-slate-600 ring-[var(--ring)] hover:bg-[#F9FCFA] hover:text-slate-900",
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

            <div className="rounded-[26px] bg-[#EAF5EF]/55 p-4 ring-1 ring-white/80 shadow-[inset_0_2px_8px_rgba(37,95,79,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black tracking-[0.14em] text-[#24564C]/65">今回の方針</div>
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
                  <span key={tag} className="rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-black text-[#24564C]/75 ring-1 ring-[#D3E1D5]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <CategoryTabs value={category} onChange={setCategory} />
          </div>
        </div>
      </div>
      </Module>

      <Module className="!bg-white p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[18px] bg-[color-mix(in_srgb,var(--mint),white_30%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm">
            <CategoryIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[16px] font-black tracking-tight text-slate-900">{categoryMeta.label}の候補</div>
            <div className="mt-0.5 text-[11px] font-bold text-slate-500">{categoryMeta.lead}</div>
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          <RakutenStatusCard error={rakutenError} queries={rakutenQueries} />
          <PriceBandFilter value={priceBand} onChange={setPriceBand} categoryKey={category} />
          <div className="rounded-[18px] bg-[#F8FCF9] px-3 py-2 text-[10px] font-bold leading-5 text-slate-500 ring-1 ring-[#E3ECE5]">
            このページには広告リンクを含みます。体質・天気・気になるサインとの関連性をもとに、ケア候補を並べています。
          </div>

          {rakutenLoading ? (
            <RakutenLoadingCards />
          ) : visibleItems.length ? (
            visibleItems.map((item, index) => (
              <ResultCard
                key={`${category}-${item.source || "item"}-${item.itemCode || item.sourceKey || item.policyKey}-${item.title}-${index}`}
                item={item}
                itemPosition={index + 1}
                trackingContext={trackingContext}
              />
            ))
          ) : rakutenItems.length && priceBand !== "all" ? (
            <div className="rounded-[22px] bg-white p-4 text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[var(--ring)]">
              {priceBandLabel}で表示できる候補は見つかりませんでした。「すべて」に戻すか、別の価格帯を選んでください。
            </div>
          ) : (
            <div className="rounded-[22px] bg-white p-4 text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[var(--ring)]">
              表示できるケア候補が見つかりませんでした。条件を変えるか、価格帯を「すべて」に戻してください。
            </div>
          )}
        </div>
      </Module>
    </AppShell>
  );
}
