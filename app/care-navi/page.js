"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { getCoreLabel, getSubLabels, SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";
import {
  IconCare,
  IconFood,
  IconLifestyle,
  IconTsubo,
} from "@/components/illust/icons/app";
import {
  deriveCarePolicies,
  getForecastTriggerFactors,
  getJstTodayTomorrow,
  getRiskContext,
  safeArray,
} from "@/app/radar/utils";

const CATEGORY_OPTIONS = [
  { key: "live", label: "暮らす" },
  { key: "eat", label: "食べる" },
  { key: "point", label: "ほぐす" },
];

const BASIS_OPTIONS = [
  {
    key: "karte",
    label: "カルテ",
    title: "未病カルテに合わせる",
    lead: "体質チェックで見えた崩れ方のクセから、普段から備えやすい候補を出します。",
  },
  {
    key: "tomorrow",
    label: "明日の予報",
    title: "明日の崩れやすさに合わせる",
    lead: "明日の天気と体質の重なりから、次に同じ条件の日にも使いやすい常備候補を出します。",
  },
  {
    key: "season",
    label: "季節",
    title: "季節の変化に合わせる",
    lead: "今の季節に起きやすい冷え・湿気・暑さ・乾燥の波に合わせて候補を出します。",
  },
  {
    key: "life",
    label: "最近の生活",
    title: "最近の生活に合わせる",
    lead: "寝不足・画面作業・食べすぎなど、最近の生活のクセから候補を少し寄せます。",
  },
];

const LIFE_OPTIONS = [
  { key: "screen", label: "画面作業が多い", policies: ["yurumeru", "meguraseru"], categories: ["point", "live"] },
  { key: "sleep_short", label: "寝不足ぎみ", policies: ["shizumeru", "sasaeru"], categories: ["live", "eat"] },
  { key: "cold_drinks", label: "冷たいものが多い", policies: ["nukumeru", "sasaeru"], categories: ["eat", "live"] },
  { key: "overeating", label: "食べすぎぎみ", policies: ["sasaeru", "nagasu"], categories: ["eat", "live"] },
  { key: "no_bath", label: "湯船に入れていない", policies: ["meguraseru", "yurumeru"], categories: ["live", "point"] },
  { key: "low_activity", label: "運動不足ぎみ", policies: ["meguraseru", "nagasu"], categories: ["point", "live"] },
  { key: "tense", label: "緊張が続いた", policies: ["yurumeru", "shizumeru"], categories: ["point", "live"] },
  { key: "outdoor", label: "外出が多い", policies: ["sasaeru", "uruosu"], categories: ["live", "eat"] },
];

const POLICY_META = {
  shizumeru: {
    label: "しずめる",
    short: "高ぶり・刺激をしずめる",
    body: "頭の冴え、焦り、刺激の上乗せを減らす方向です。",
  },
  yurumeru: {
    label: "ゆるめる",
    short: "首肩・呼吸・力みをゆるめる",
    body: "こわばりや張りつめをほどき、力を抜きやすくする方向です。",
  },
  meguraseru: {
    label: "めぐらせる",
    short: "巡りの逃げ道をつくる",
    body: "固まった姿勢や滞りを切り、軽く動ける状態に戻す方向です。",
  },
  nagasu: {
    label: "ながす",
    short: "重さ・湿気をためない",
    body: "湿気・重だるさ・むくみ感をため込まない方向です。",
  },
  uruosu: {
    label: "うるおす",
    short: "乾きと消耗を補う",
    body: "乾燥、目・喉の乾き、消耗感をゆるやかに補う方向です。",
  },
  nukumeru: {
    label: "ぬくめる",
    short: "足元・お腹を冷やさない",
    body: "冷えからくるこわばりや胃腸の重さを守る方向です。",
  },
  sasaeru: {
    label: "ささえる",
    short: "胃腸・回復力を削らない",
    body: "無理に押し切らず、胃腸と毎日の余力を守る方向です。",
  },
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
  transition: ["sasaeru", "meguraseru"],
};

const CARE_ITEM_LIBRARY = {
  shizumeru: {
    live: [
      {
        title: "光と通知を減らすセット",
        query: "アイマスク 遮光 睡眠",
        reason: "頭の冴えや刺激を夜まで引きずりにくくする候補です。",
        tags: ["睡眠前", "刺激を減らす"],
      },
      {
        title: "リラックス入浴まわり",
        query: "入浴剤 リラックス 無香料",
        reason: "高ぶりを一度落として、休む準備に入りやすくする候補です。",
        tags: ["入浴", "夜ケア"],
      },
    ],
    eat: [
      {
        title: "ノンカフェインの温かい飲み物",
        query: "ノンカフェイン お茶 リラックス",
        reason: "カフェインで押し切らず、ゆっくり落ち着く時間を作る候補です。",
        tags: ["飲み物", "夜向き"],
      },
    ],
    point: [
      {
        title: "頭皮・こめかみまわりのセルフケア",
        query: "頭皮ブラシ マッサージ シリコン",
        reason: "頭や目まわりに残る力みを軽く逃がす候補です。",
        tags: ["頭まわり", "ほぐす"],
      },
    ],
  },
  yurumeru: {
    live: [
      {
        title: "首肩を温めてゆるめるもの",
        query: "首肩 温熱 ネックウォーマー",
        reason: "首元の冷えや力みをほどきやすくする候補です。",
        tags: ["首肩", "温める"],
      },
      {
        title: "目元を休ませるアイテム",
        query: "ホットアイマスク 目元 温熱",
        reason: "画面作業のあと、目と首肩の緊張を一度切る候補です。",
        tags: ["画面作業", "目元"],
      },
    ],
    eat: [
      {
        title: "温かいお茶・軽いスープ",
        query: "温かい お茶 スープ セット",
        reason: "甘いものやカフェインだけで粘らず、力みを増やしにくい候補です。",
        tags: ["温かい", "軽め"],
      },
    ],
    point: [
      {
        title: "首肩用のマッサージボール",
        query: "マッサージボール 首 肩",
        reason: "肩甲骨まわりや首肩のこわばりをピンポイントで逃がす候補です。",
        tags: ["首肩", "ピンポイント"],
      },
      {
        title: "耳・側頭部まわりのほぐし",
        query: "頭皮 マッサージ グッズ 側頭部",
        reason: "気圧や画面姿勢で詰まりやすい頭〜耳まわりに使いやすい候補です。",
        tags: ["気圧", "耳まわり"],
      },
    ],
  },
  meguraseru: {
    live: [
      {
        title: "入浴・足湯まわり",
        query: "足湯 バケツ 折りたたみ 入浴",
        reason: "軽く温めて巡りのきっかけを作る候補です。",
        tags: ["入浴", "足元"],
      },
      {
        title: "姿勢リセット用品",
        query: "ストレッチポール ハーフポール",
        reason: "座りっぱなしや固まった姿勢を一度切る候補です。",
        tags: ["姿勢", "リセット"],
      },
    ],
    eat: [
      {
        title: "温かい飲み物・香味系",
        query: "しょうが湯 ノンカフェイン",
        reason: "冷たさや停滞を増やしにくく、軽く動き出す助けになる候補です。",
        tags: ["温かい", "香味"],
      },
    ],
    point: [
      {
        title: "ふくらはぎ・足裏ケア",
        query: "ふくらはぎ ローラー 足裏 ツボ",
        reason: "下半身の重さや同じ姿勢の停滞を切る候補です。",
        tags: ["足元", "巡り"],
      },
    ],
  },
  nagasu: {
    live: [
      {
        title: "湿気をためない部屋まわり",
        query: "除湿 ルームドライ 防湿",
        reason: "湿気の日の重だるさを、部屋のこもりから減らす候補です。",
        tags: ["湿気", "部屋"],
      },
      {
        title: "足元を軽く保つもの",
        query: "レッグウォーマー 薄手 足首",
        reason: "冷やしすぎず、下半身の重さをためにくくする候補です。",
        tags: ["足元", "冷え対策"],
      },
    ],
    eat: [
      {
        title: "はとむぎ茶・黒豆茶系",
        query: "はとむぎ茶 黒豆茶 ノンカフェイン",
        reason: "冷たい甘い飲み物に偏らず、重さを残しにくい候補です。",
        tags: ["お茶", "ノンカフェイン"],
      },
      {
        title: "軽い汁物・スープ",
        query: "具だくさん スープ 常温 保存",
        reason: "食べすぎず、温かさと軽さを両立しやすい候補です。",
        tags: ["スープ", "軽め"],
      },
    ],
    point: [
      {
        title: "足首・ふくらはぎを流す道具",
        query: "ふくらはぎ マッサージ ローラー",
        reason: "むくみ感や下半身の重さを、足元から逃がす候補です。",
        tags: ["むくみ", "足元"],
      },
    ],
  },
  uruosu: {
    live: [
      {
        title: "乾燥を減らす環境づくり",
        query: "卓上 加湿器 寝室",
        reason: "乾燥で目・喉・肌が疲れやすい日に備える候補です。",
        tags: ["乾燥", "寝室"],
      },
      {
        title: "のど・口元を守るもの",
        query: "保湿 マスク 就寝用",
        reason: "乾きが夜〜朝に残りやすい人の候補です。",
        tags: ["喉", "保湿"],
      },
    ],
    eat: [
      {
        title: "温かいお茶・汁物",
        query: "ノンカフェイン お茶 温活",
        reason: "乾いた菓子やコーヒーだけに偏らない候補です。",
        tags: ["温かい", "乾燥"],
      },
    ],
    point: [
      {
        title: "やさしいストレッチ補助",
        query: "ストレッチ バンド やわらかい",
        reason: "強く流すより、こわばりをやさしくほどく候補です。",
        tags: ["やさしく", "伸ばす"],
      },
    ],
  },
  nukumeru: {
    live: [
      {
        title: "腹巻き・お腹まわりの温め",
        query: "腹巻き 薄手 温活",
        reason: "お腹や腰腹まわりの冷えを守りやすい候補です。",
        tags: ["お腹", "温活"],
      },
      {
        title: "湯たんぽ・足元温熱",
        query: "湯たんぽ 足元 温熱",
        reason: "足元や下腹部から冷えを残しにくくする候補です。",
        tags: ["足元", "冷え"],
      },
    ],
    eat: [
      {
        title: "しょうが湯・温かい汁物",
        query: "しょうが湯 スープ 温活",
        reason: "冷たいものが続いた時に、内側を冷やしっぱなしにしない候補です。",
        tags: ["温かい", "胃腸"],
      },
    ],
    point: [
      {
        title: "腰腹・足元をゆるめるセルフケア",
        query: "足裏 ツボ 押し グッズ",
        reason: "冷えで縮こまりやすい足元から整える候補です。",
        tags: ["足裏", "冷え"],
      },
    ],
  },
  sasaeru: {
    live: [
      {
        title: "睡眠と回復を削らない環境",
        query: "睡眠 グッズ アイマスク 耳栓",
        reason: "無理に押し切らず、休む余白を作る候補です。",
        tags: ["睡眠", "回復"],
      },
      {
        title: "胃腸を冷やさない暮らし用品",
        query: "腹巻き 薄手 お腹 冷え",
        reason: "胃腸や下腹部の冷えを守り、翌日に重さを残しにくくする候補です。",
        tags: ["胃腸", "お腹"],
      },
    ],
    eat: [
      {
        title: "味噌汁・軽いスープ系",
        query: "味噌汁 フリーズドライ スープ",
        reason: "食べすぎず、温かく軽く足しやすい候補です。",
        tags: ["胃腸", "軽め"],
      },
      {
        title: "温かいお茶・白湯まわり",
        query: "温かい お茶 ノンカフェイン 胃腸",
        reason: "冷たい飲み物やカフェインに偏らず、胃腸の余白を守る候補です。",
        tags: ["飲み物", "胃腸"],
      },
    ],
    point: [
      {
        title: "足三里・胃腸まわりのセルフケア",
        query: "足三里 ツボ押し グッズ",
        reason: "だるさ・胃腸の重さ・下半身の重さをまとめて見たい時の候補です。",
        tags: ["胃腸", "足三里"],
      },
    ],
  },
};

function makeRakutenSearchUrl(query) {
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(query)}/`;
}

function getSeasonKey() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 4) return "spring";
  if (month >= 5 && month <= 6) return "rainy";
  if (month >= 7 && month <= 8) return "summer";
  if (month >= 9 && month <= 10) return "autumn";
  if (month >= 11 || month <= 2) return "winter";
  return "transition";
}

function uniqueTake(items, limit = 4) {
  return Array.from(new Set((items || []).filter(Boolean))).slice(0, limit);
}

function mergePolicyKeys(...groups) {
  const out = [];
  for (const group of groups) {
    for (const key of group || []) {
      if (key && POLICY_META[key] && !out.includes(key)) out.push(key);
    }
  }
  return out.slice(0, 3);
}

function getProfilePolicyKeys(profile, symptomKey) {
  const subs = safeArray(profile?.sub_labels);
  const fromSubs = subs.flatMap((key) => SUB_POLICY_HINTS[key] || []);
  const fromSymptom = SYMPTOM_POLICY_HINTS[symptomKey] || [];
  const coreCode = String(profile?.core_code || "");
  const fromCore = [];
  if (coreCode.includes("batt_small")) fromCore.push("sasaeru", "nukumeru");
  if (coreCode.startsWith("accel_")) fromCore.push("yurumeru", "shizumeru");
  if (coreCode.startsWith("brake_")) fromCore.push("nagasu", "meguraseru");
  return mergePolicyKeys(fromSymptom, fromSubs, fromCore, ["sasaeru"]);
}

function getSeasonPolicyKeys() {
  return SEASON_POLICY_HINTS[getSeasonKey()] || ["sasaeru"];
}

function getLifePolicyKeys(lifeKeys) {
  const selected = LIFE_OPTIONS.filter((item) => lifeKeys.includes(item.key));
  return mergePolicyKeys(selected.flatMap((item) => item.policies), ["sasaeru"]);
}

function getLifePreferredCategories(lifeKeys) {
  const selected = LIFE_OPTIONS.filter((item) => lifeKeys.includes(item.key));
  return uniqueTake(selected.flatMap((item) => item.categories), 3);
}

function pickCandidates(policyKeys, categoryKey, lifeKeys = []) {
  const preferredCategories = getLifePreferredCategories(lifeKeys);
  const categories = categoryKey === "all" ? ["live", "eat", "point"] : [categoryKey];

  const result = {};
  for (const category of categories) {
    const rows = [];
    const sortedPolicies = [...policyKeys].sort((a, b) => {
      const aBoost = preferredCategories.includes(category) ? 0 : 0;
      const bBoost = preferredCategories.includes(category) ? 0 : 0;
      return bBoost - aBoost;
    });

    for (const policyKey of sortedPolicies) {
      const items = CARE_ITEM_LIBRARY[policyKey]?.[category] || [];
      for (const item of items) {
        rows.push({ ...item, policyKey, category });
      }
    }

    result[category] = rows.slice(0, categoryKey === "all" ? 3 : 8);
  }
  return result;
}

function getCategoryMeta(key) {
  if (key === "live") return { label: "暮らす", icon: IconLifestyle, lead: "環境・温め方・休み方の候補" };
  if (key === "eat") return { label: "食べる", icon: IconFood, lead: "飲み物・汁物・軽めの食べ方候補" };
  return { label: "ほぐす", icon: IconTsubo, lead: "首肩・足元・ツボまわりの候補" };
}

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3.5 py-2 text-[12px] font-black transition-all ring-1",
        active
          ? "bg-[#255F4F] text-white ring-[#255F4F] shadow-[0_12px_28px_-18px_rgba(37,95,79,0.6)]"
          : "bg-white text-slate-600 ring-[#DDE8DF] hover:bg-[#F7FBF8]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}


function getPolicyIconPath(policyKey) {
  return `/illust/policy/policy-${policyKey}.svg`;
}

function PolicyPill({ policyKey, compact = false }) {
  const policy = POLICY_META[policyKey] || {};
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-white text-[#255F4F] ring-1 ring-[#D5E7DB]",
        compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-[12px]",
        "font-black",
      ].join(" ")}
    >
      <img
        src={getPolicyIconPath(policyKey)}
        alt=""
        className={compact ? "h-4 w-4 shrink-0" : "h-5 w-5 shrink-0"}
        loading="lazy"
      />
      {policy.label || policyKey}
    </span>
  );
}

function CategoryTabs({ value, onChange }) {
  return (
    <div className="rounded-[24px] bg-white/80 p-1.5 ring-1 ring-[#DDE8DF]">
      <div className="grid grid-cols-3 gap-1.5">
        {CATEGORY_OPTIONS.map((item) => {
          const meta = getCategoryMeta(item.key);
          const Icon = meta.icon;
          const active = value === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={[
                "flex items-center justify-center gap-1.5 rounded-[18px] px-2 py-2.5 text-[12px] font-black transition-all",
                active
                  ? "bg-[#255F4F] text-white shadow-[0_14px_28px_-20px_rgba(37,95,79,0.75)]"
                  : "text-slate-500 hover:bg-[#F7FBF8]",
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

function ResultCard({ item }) {
  const policy = POLICY_META[item.policyKey] || {};
  const meta = getCategoryMeta(item.category);
  const Icon = meta.icon;

  return (
    <div className="rounded-[24px] bg-white p-3.5 ring-1 ring-[#E4EEE7] shadow-[0_12px_30px_-24px_rgba(15,23,42,0.22)]">
      <div className="flex gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[18px] bg-[#F4F8F5] ring-1 ring-[#E1EBE3]">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#F7FCF9_0%,#FFF8E5_100%)] text-[#255F4F]">
              <Icon className="h-7 w-7 opacity-80" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[13px] font-black leading-5 text-slate-900">{item.title}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-black text-[#5F8D75]">
                <img src={getPolicyIconPath(item.policyKey)} alt="" className="h-3.5 w-3.5" loading="lazy" />
                {policy.label || item.policyKey}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#F3F8F4] px-2 py-1 text-[10px] font-black text-[#255F4F] ring-1 ring-[#D9E8DE]">
              候補
            </span>
          </div>

          <p className="mt-2 line-clamp-2 text-[11px] font-bold leading-5 text-slate-600">{item.reason}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(item.tags || []).map((tag) => (
          <span key={tag} className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-100">
            {tag}
          </span>
        ))}
      </div>

      <a
        href={makeRakutenSearchUrl(item.query)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center rounded-[16px] bg-[#255F4F] px-4 py-2.5 text-[12px] font-black text-white shadow-[0_14px_30px_-18px_rgba(37,95,79,0.75)]"
      >
        楽天で「{item.query}」を探す
      </a>
    </div>
  );
}

function CategorySection({ category, items }) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  if (!items?.length) return null;

  return (
    <Module className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-[#EAF5EE] text-[#255F4F] ring-1 ring-[#D5E7DB]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[16px] font-black tracking-tight text-slate-900">{meta.label}の候補</div>
          <div className="mt-0.5 text-[11px] font-bold text-slate-500">{meta.lead}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        {items.map((item, index) => (
          <ResultCard key={`${category}-${item.policyKey}-${item.title}-${index}`} item={item} />
        ))}
      </div>
    </Module>
  );
}

export default function CareNaviPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [tomorrowBundle, setTomorrowBundle] = useState(null);

  const [category, setCategory] = useState("live");
  const [basis, setBasis] = useState("karte");
  const [selectedSymptom, setSelectedSymptom] = useState("");
  const [lifeKeys, setLifeKeys] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setProfileError("");

      const { data } = await supabase.auth.getSession();
      const nextSession = data?.session || null;
      if (cancelled) return;

      setSession(nextSession);

      if (!nextSession?.access_token) {
        setLoading(false);
        return;
      }

      try {
        const profileRes = await fetch("/api/care-navi/context", {
          headers: { Authorization: `Bearer ${nextSession.access_token}` },
          cache: "no-store",
        });
        const profileJson = await profileRes.json().catch(() => ({}));

        if (profileRes.ok && profileJson?.profile) {
          setProfile(profileJson.profile);
          setSelectedSymptom(profileJson.profile.active_symptom_focus || profileJson.profile.diagnosis_symptom_focus || "");
        } else {
          setProfile(null);
          setProfileError(profileJson?.error || "未病カルテがまだありません。");
        }
      } catch (error) {
        setProfile(null);
        setProfileError(error?.message || "未病カルテ情報を読み込めませんでした。");
      }

      try {
        const { tomorrow } = getJstTodayTomorrow();
        const qs = new URLSearchParams({ date: tomorrow });
        const forecastRes = await fetch(`/api/radar/v1/forecast?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${nextSession.access_token}` },
          cache: "no-store",
        });
        const forecastJson = await forecastRes.json().catch(() => ({}));
        if (forecastRes.ok) setTomorrowBundle(forecastJson);
      } catch {
        // ケアナビでは予報連動は任意。地域未設定・取得失敗時はカルテ/条件ベースで表示する。
      }

      if (!cancelled) setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const symptomKey = selectedSymptom || profile?.active_symptom_focus || profile?.diagnosis_symptom_focus || "fatigue";
  const symptomLabel = SYMPTOM_LABELS[symptomKey] || "今気になること";
  const basisMeta = BASIS_OPTIONS.find((item) => item.key === basis) || BASIS_OPTIONS[0];

  const profileLike = useMemo(() => {
    const raw = profile || {};
    const computed = raw.computed || raw.raw?.computed || {};
    return {
      core_code: raw.core_code || computed.core_code || null,
      sub_labels: safeArray(raw.sub_labels || computed.sub_labels),
      symptom_focus: symptomKey,
    };
  }, [profile, symptomKey]);

  const policyKeys = useMemo(() => {
    if (basis === "tomorrow" && tomorrowBundle?.forecast) {
      const riskContext = getRiskContext(tomorrowBundle);
      const forecast = tomorrowBundle.forecast;
      const derived = deriveCarePolicies({
        forecast,
        triggerFactors: getForecastTriggerFactors(forecast),
        riskContext,
        mode: "tomorrow",
        symptomFocus: symptomKey,
      });
      const fromForecast = safeArray(derived?.policies).map((item) => item.key);
      return mergePolicyKeys(fromForecast, getProfilePolicyKeys(profileLike, symptomKey));
    }

    if (basis === "season") {
      return mergePolicyKeys(getSeasonPolicyKeys(), getProfilePolicyKeys(profileLike, symptomKey));
    }

    if (basis === "life") {
      return mergePolicyKeys(getLifePolicyKeys(lifeKeys), getProfilePolicyKeys(profileLike, symptomKey));
    }

    return getProfilePolicyKeys(profileLike, symptomKey);
  }, [basis, tomorrowBundle, symptomKey, profileLike, lifeKeys]);

  const resultGroups = useMemo(() => pickCandidates(policyKeys, category, lifeKeys), [policyKeys, category, lifeKeys]);

  const coreLabel = profileLike.core_code ? getCoreLabel(profileLike.core_code) : null;
  const subLabels = getSubLabels(profileLike.sub_labels).slice(0, 2);

  function toggleLifeKey(key) {
    setLifeKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key].slice(-3)
    );
  }

  const activeItems = resultGroups[category] || [];

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
      <Module className="relative overflow-hidden p-4 sm:p-5">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#E2F1EA]/80 blur-2xl" />
        <div className="absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-amber-100/60 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black tracking-[0.16em] text-[#47786C] ring-1 ring-[#D4E6DA]">
                CARE NAVI
              </div>
              <h1 className="mt-3 text-[22px] font-black leading-tight tracking-tight text-slate-900">
                ケア候補を選ぶ。
              </h1>
              <p className="mt-2 text-[12px] font-bold leading-6 text-slate-600">
                カルテや条件から、暮らす・食べる・ほぐすの候補を出します。
              </p>
            </div>

            <div className="shrink-0 rounded-[18px] bg-white/85 px-3 py-2 text-right ring-1 ring-[#DDE8DF]">
              <div className="text-[10px] font-black text-slate-400">STATUS</div>
              <div className={`mt-0.5 text-[11px] font-black ${profile ? "text-[#255F4F]" : "text-amber-700"}`}>
                {profile ? "カルテ反映済み" : "カルテ未適用"}
              </div>
            </div>
          </div>

          {profile ? (
            <div className="mt-3 rounded-[18px] bg-white/75 px-3 py-2 text-[11px] font-bold leading-5 text-slate-500 ring-1 ring-white/90">
              {coreLabel || "体質傾向"}{subLabels.length ? ` / ${subLabels.map((s) => s.title).join("・")}` : ""} を手がかりにしています。
            </div>
          ) : (
            <div className="mt-3 rounded-[18px] bg-amber-50/90 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800 ring-1 ring-amber-100">
              {profileError || "条件だけでも探せます。体質チェックを保存すると、候補をさらに絞れます。"}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 text-[11px] font-black tracking-[0.12em] text-slate-400">合わせ方</div>
              <div className="grid grid-cols-4 gap-1.5">
                {BASIS_OPTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setBasis(item.key)}
                    className={[
                      "rounded-[16px] px-2 py-2 text-center ring-1 transition-all",
                      basis === item.key
                        ? "bg-[#255F4F] text-white ring-[#255F4F] shadow-[0_14px_30px_-22px_rgba(37,95,79,0.7)]"
                        : "bg-white text-slate-600 ring-[#DDE8DF] hover:bg-[#F7FBF8]",
                    ].join(" ")}
                  >
                    <div className="text-[11px] font-black leading-4">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11px] font-black tracking-[0.12em] text-slate-400">気になること</div>
                <div className="text-[10px] font-bold text-slate-400">ページ内だけ反映</div>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {Object.entries(SYMPTOM_LABELS).map(([key, label]) => (
                  <Chip key={key} active={symptomKey === key} onClick={() => setSelectedSymptom(key)}>
                    {label}
                  </Chip>
                ))}
              </div>
            </div>

            {basis === "life" ? (
              <div>
                <div className="mb-2 text-[11px] font-black tracking-[0.12em] text-slate-400">最近の生活（最大3つ）</div>
                <div className="flex flex-wrap gap-2">
                  {LIFE_OPTIONS.map((item) => (
                    <Chip key={item.key} active={lifeKeys.includes(item.key)} onClick={() => toggleLifeKey(item.key)}>
                      {item.label}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[22px] bg-[#F7FBF8] p-3 ring-1 ring-[#DDE8DF]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-black tracking-[0.14em] text-[#6B8B78]">今回の方針</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {policyKeys.map((key) => (
                      <PolicyPill key={key} policyKey={key} compact />
                    ))}
                  </div>
                </div>
                <div className="max-w-[132px] text-right text-[10px] font-bold leading-4 text-slate-500">
                  {basisMeta.label} × {symptomLabel}
                </div>
              </div>
            </div>

            <CategoryTabs value={category} onChange={setCategory} />
          </div>
        </div>
      </Module>

      <CategorySection category={category} items={activeItems} />
    </AppShell>
  );
}
