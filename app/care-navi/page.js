"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { getCoreLabel, getSubLabels, SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";
import { buildBaseCarePreferences } from "@/lib/diagnosis/v2/carePreferences";
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
  { key: "eat", label: "食べる", icon: IconFood, lead: "飲み物・汁物・軽めの食べ方候補" },
  { key: "point", label: "ほぐす", icon: IconTsubo, lead: "首肩・足元・ツボまわりの候補" },
];

const BASIS_OPTIONS = [
  { key: "karte", label: "カルテ", lead: "体質チェックで見えた崩れ方のクセを手がかりにします。" },
  { key: "tomorrow", label: "明日の予報", lead: "明日の崩れやすさに備える想定で候補を寄せます。" },
  { key: "season", label: "季節", lead: "今の季節に起きやすい波に合わせます。" },
  { key: "life", label: "最近の生活", lead: "最近の生活のクセを追加条件にします。" },
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
      { title: "光と通知を減らすセット", query: "アイマスク 遮光 睡眠", reason: "頭の冴えや刺激を夜まで残しにくくします。", tags: ["睡眠前", "刺激を減らす"] },
      { title: "リラックス入浴まわり", query: "入浴剤 リラックス 無香料", reason: "高ぶりを一度落として、休む準備に入る候補です。", tags: ["入浴", "夜ケア"] },
    ],
    eat: [
      { title: "ノンカフェインの温かい飲み物", query: "ノンカフェイン お茶 リラックス", reason: "カフェインで押し切らず、落ち着く時間を作ります。", tags: ["飲み物", "夜向き"] },
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
      { title: "睡眠と回復を削らない環境", query: "睡眠 グッズ アイマスク 耳栓", reason: "無理に押し切らず、休む余白を作ります。", tags: ["睡眠", "回復"] },
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

function pickCandidates(policyKeys, categoryKey) {
  const rows = [];
  for (const policyKey of policyKeys) {
    for (const item of CARE_ITEM_LIBRARY[policyKey]?.[categoryKey] || []) {
      rows.push({ ...item, policyKey, category: categoryKey });
    }
  }
  return rows.slice(0, 8);
}

function getCategoryMeta(key) {
  return CATEGORY_OPTIONS.find((item) => item.key === key) || CATEGORY_OPTIONS[0];
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
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-black text-[var(--accent-ink)] ring-1 ring-[#BFD9CC] shadow-[0_12px_24px_-18px_rgba(37,95,79,0.35)]">
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

function ResultCard({ item }) {
  const policy = POLICY_META[item.policyKey] || {};
  const meta = getCategoryMeta(item.category);
  const Icon = meta.icon;

  return (
    <div className="relative overflow-hidden rounded-[26px] bg-white p-4 ring-1 ring-[var(--ring)] shadow-[0_14px_34px_-24px_rgba(40,55,48,0.24)]">
      <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-[var(--accent)]/55" />

      <div className="flex gap-3 pl-1">
        <div className="grid h-[70px] w-[70px] shrink-0 place-items-center overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#F7FCF9_0%,#FFF8E5_100%)] text-[var(--accent-ink)] ring-1 ring-[#D8E7DC] shadow-sm">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Icon className="h-8 w-8 opacity-85" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[15px] font-black leading-6 text-slate-900">{item.title}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-black text-[#5F8D75]">
                <img src={getPolicyIconPath(item.policyKey)} alt="" className="h-5 w-5 shrink-0" loading="lazy" />
                {policy.label || item.policyKey}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#F4F9F6] px-2.5 py-1 text-[10px] font-black text-[var(--accent-ink)] ring-1 ring-[#D3E1D5]">
              候補
            </span>
          </div>

          <p className="mt-2 text-[12px] font-bold leading-6 text-slate-600">{item.reason}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 pl-1">
        {(item.tags || []).map((tag) => (
          <span key={tag} className="rounded-full bg-[#F8FCF9] px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-[#E3ECE5]">
            {tag}
          </span>
        ))}
      </div>

      <a
        href={makeRakutenSearchUrl(item.query)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center rounded-[18px] bg-[var(--accent)] px-4 py-2.5 text-[12px] font-black text-white shadow-[0_14px_28px_-18px_rgba(53,95,82,0.58)] hover:bg-[var(--accent-ink)]"
      >
        楽天で探す
      </a>
    </div>
  );
}

export default function CareNaviPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [tomorrowBundle, setTomorrowBundle] = useState(null);

  const [basis, setBasis] = useState("karte");
  const [category, setCategory] = useState("live");
  const [selectedSymptom, setSelectedSymptom] = useState("");
  const [lifeKeys, setLifeKeys] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setProfileError("");

        if (!supabase?.auth) {
          setProfile(null);
          setProfileError("未病カルテ未適用です。");
          return;
        }

        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;

        if (!token) {
          setProfile(null);
          setProfileError("ログインすると未病カルテを反映できます。");
          return;
        }

        const res = await fetch("/api/care-navi/context", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));

        if (!cancelled && res.ok && json?.profile) {
          setProfile(json.profile);
          setSelectedSymptom(json.profile.active_symptom_focus || "");
        } else if (!cancelled) {
          setProfile(null);
          setProfileError(json?.error || "未病カルテがまだありません。");
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
          setProfileError(error?.message || "未病カルテ情報を読み込めませんでした。");
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

  const policyKeys = useMemo(() => {
    const baseScores = karteCarePreferences?.scores || {};

    if (basis === "tomorrow" && tomorrowBundle?.forecast) {
      const derived = deriveCarePolicies({
        forecast: tomorrowBundle.forecast,
        triggerFactors: getForecastTriggerFactors(tomorrowBundle.forecast),
        riskContext: getRiskContext(tomorrowBundle),
        mode: "tomorrow",
        symptomFocus: symptomKey,
      });

      const forecastKeys = safeArray(derived?.policies).map((policy) => policy.key).filter(Boolean);
      if (forecastKeys.length) return forecastKeys;
    }

    if (basis === "season") {
      return buildConditionPolicyKeys({
        baseScores,
        extraPolicyKeys: SEASON_POLICY_HINTS[getSeasonKey()],
        extraWeight: 1.22,
        baseWeight: 0.52,
        fallbackKeys: ["sasaeru", "meguraseru"],
      });
    }

    if (basis === "life") {
      return getLifePolicyKeys(lifeKeys, baseScores);
    }

    return selectPolicyKeysFromScores(baseScores, ["sasaeru", "yurumeru"]);
  }, [basis, karteCarePreferences, tomorrowBundle, symptomKey, lifeKeys]);

  const items = useMemo(() => pickCandidates(policyKeys, category), [policyKeys, category]);

  const coreLabel = profileLike.core_code ? getCoreLabel(profileLike.core_code) : null;
  const coreTitle = coreLabel?.title || coreLabel?.short || "";
  const coreIconPath = getCoreIconPath(profileLike.core_code);
  const subLabels = getSubLabels(profileLike.sub_labels).slice(0, 2);
  const subText = subLabels.map((s) => s.short || s.title).filter(Boolean).join("・");
  const seasonKey = getSeasonKey();
  const seasonLabel = SEASON_LABELS[seasonKey] || "季節";
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
      <Module className="relative !bg-[#fbfcf8] p-4 sm:p-5">
        <CheckOrbitMark />

        <div className="relative z-10">
          <ModuleHeader
            icon={<IconCare className="h-6 w-6" />}
            title="ケアアイテムナビ"
            sub="体質・条件・コンディションに合わせたケアアイテムを探す"
          />

          <div className="px-1 pb-1 pt-4">
          <div className="rounded-[26px] bg-[#E2F1EA]/55 p-4 ring-1 ring-white/80 shadow-[inset_0_2px_8px_rgba(37,95,79,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
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
                  {profile ? "未病カルテ反映済み" : "未病カルテ未適用"}
                </div>
                <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                  {loading
                    ? "カルテ情報を確認しています。"
                    : profile
                      ? `${coreTitle || "体質傾向"}${subText ? ` / ${subText}` : ""} を手がかりにしています。`
                      : profileError || "条件だけでも候補を出せます。"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-2 text-[11px] font-black tracking-[0.12em] text-slate-400">合わせ方</div>
              <div className="grid grid-cols-4 gap-1.5">
                {BASIS_OPTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setBasis(item.key)}
                    className={[
                      "rounded-[16px] px-2 py-2 text-center text-[11px] font-black ring-1 transition-all",
                      basis === item.key
                        ? "bg-[var(--accent)] text-white ring-[var(--accent)] shadow-[0_12px_24px_-16px_rgba(53,95,82,0.55)]"
                        : "bg-white text-slate-600 ring-[var(--ring)] hover:bg-[#F9FCFA] hover:text-slate-900",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[11px] font-bold leading-5 text-slate-500">
                {BASIS_OPTIONS.find((item) => item.key === basis)?.lead}
                {basis === "season" ? ` 現在は「${seasonLabel}」として見ています。` : ""}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11px] font-black tracking-[0.12em] text-slate-400">気になること</div>
                <div className="text-[10px] font-bold text-slate-400">このページだけ反映</div>
              </div>
              <div className="flex flex-wrap gap-2">
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

            <div className="rounded-[26px] bg-[#E2F1EA]/55 p-4 ring-1 ring-white/80 shadow-[inset_0_2px_8px_rgba(37,95,79,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black tracking-[0.14em] text-[#255F4F]/65">今回の方針</div>
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
            </div>

            <CategoryTabs value={category} onChange={setCategory} />
          </div>
        </div>
      </div>
      </Module>

      <Module className="!bg-[#fbfcf8] p-4 sm:p-5">
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
          {items.map((item, index) => (
            <ResultCard key={`${category}-${item.policyKey}-${item.title}-${index}`} item={item} />
          ))}
        </div>
      </Module>
    </AppShell>
  );
}
