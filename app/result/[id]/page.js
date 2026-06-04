// app/result/[id]/page.js
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";
import {
  SYMPTOM_LABELS,
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
} from "@/lib/diagnosis/v2/labels";
import {
  buildPersonalWeatherAffinityProfile,
  rankExactWeatherAffinity,
} from "@/lib/radar_v1/weatherAffinityProfile";
import { CoreIllust } from "@/components/illust/core";
import { SubIllust } from "@/components/illust/sub";
import { MeridianIllust } from "@/components/illust/meridian";
import {
  IconMemo,
  IconCompass,
  IconBolt,
  IconRadar,
  IconResult,
  IconAnalysis,
  IconBody,
  IconCloud,
} from "@/components/illust/icons/result";
import { WeatherIcon } from "@/components/illust/icons/weather";
import { buildBaseCarePreferences } from "@/lib/diagnosis/v2/carePreferences";

export default function ResultPageWrapper({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-app">
          <div className="mx-auto w-full max-w-[440px] px-4 pt-10">
            <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-[var(--ring)] flex items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-100 border-t-[var(--accent)]" />
              <div>
                <div className="text-[15px] font-black tracking-tight text-slate-900">読み込み中…</div>
                <div className="mt-1 text-[12px] font-bold text-slate-500">少しお待ちください</div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ResultPage params={params} />
    </Suspense>
  );
}

/* -----------------------------
 * UI Components (Flat & Clean)
 * ---------------------------- */
function Card({ children, className = "" }) {
  return (
    <section
      className={[
        "rounded-[32px] bg-white shadow-[0_12px_32px_-12px_rgba(0,0,0,0.06)] ring-1 ring-[var(--ring)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function CardHeader({ icon, title, sub, right }) {
  return (
    <div className="px-6 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <div className="grid h-14 w-14 place-items-center rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_30%)] ring-1 ring-[var(--ring)] text-[var(--accent-ink)] shadow-sm">
            {icon}
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="text-[19px] font-black tracking-tight text-slate-900 leading-tight">{title}</div>
            {sub ? <div className="mt-1 text-[12px] font-bold text-slate-500">{sub}</div> : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-6 h-px w-full bg-slate-100" />
    </div>
  );
}

// 主・副をまとめたシンプルな経絡リスト用コンポーネント
function MeridianPanelContent({ line, tone = "violet" }) {
  const toneClass = {
    violet: "text-[#5b4bb7]",
    teal: "text-[#0f766e]",
    mint: "text-[var(--accent)]",
  };

  if (!line) return null;

  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <div className="grid h-[68px] w-[68px] place-items-center rounded-[18px] bg-white ring-1 ring-black/5 shadow-sm overflow-hidden">
          <MeridianIllust code={line.code} size="lg" className={`${toneClass[tone] || toneClass.violet} scale-110`} />
        </div>
      </div>
      <div className="min-w-0 pt-1">
        {/* 見切れ防止のため truncate は使わず leading-snug で自然に折り返す */}
        <div className="text-[16px] font-black tracking-tight text-slate-900 leading-snug">{line.title}</div>
        <div className="mt-1 text-[11px] font-extrabold text-slate-500">
          {line.body_area}（{line.meridians.join("・")}）
        </div>
        <div className="mt-2 text-[13px] font-bold leading-relaxed text-slate-700">{line.organs_hint}</div>
      </div>
    </div>
  );
}

function SegmentedTabs({ value, onChange }) {
  const tabs = [
    { key: "overview", label: "カルテ概要" },
    { key: "compat", label: "天気相性" },
    { key: "care", label: "整え方" },
  ];

  return (
    <div className="sticky top-[60px] z-30 bg-[#fdfefc]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#fdfefc]/60 py-3 transition-all">
      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="flex rounded-full bg-slate-200/50 p-1 ring-1 ring-inset ring-slate-200/50">
          {tabs.map((t) => {
            const active = value === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onChange(t.key)}
                className={[
                  "flex-1 h-[36px] rounded-full text-[13px] font-black tracking-tight transition-all duration-300",
                  active
                    ? "bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] ring-1 ring-black/5 scale-[1.02]"
                    : "text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SavePromptCard({ isLoggedIn, isAttached, session, attaching, onSave, onSignup, onLogin, compact = false, title, body }) {
  if (isAttached) {
    return (
      <div className={compact ? "rounded-[24px] bg-emerald-50 p-5 ring-1 ring-emerald-200 text-center shadow-sm" : "rounded-[28px] bg-emerald-50 p-6 ring-1 ring-emerald-200 text-center shadow-sm"}>
        <div className="text-[16px] font-black text-emerald-800">保存済み ✅</div>
        <div className="mt-2 text-[13px] font-bold leading-relaxed text-emerald-700">このカルテは保存されています。今日・明日の未病予報に反映できます。</div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="space-y-4">
        <div className={compact ? "rounded-[24px] bg-[color-mix(in_srgb,var(--mint),white_42%)] p-5 ring-1 ring-[var(--ring)] shadow-sm" : "rounded-[28px] bg-[color-mix(in_srgb,var(--mint),white_40%)] p-6 ring-1 ring-[var(--ring)] shadow-sm"}>
          <div className="text-[16px] font-black tracking-tight text-slate-900">{title || "このカルテはまだ保存されていません"}</div>
          <div className="mt-2 text-[13px] font-bold text-slate-600 leading-relaxed">{body || "保存すると、今日・明日の未病予報とケア提案に反映できます。"}</div>
          {session?.user?.email ? (
            <div className="mt-3 rounded-[18px] bg-white/80 px-4 py-3 text-[12px] font-bold text-slate-600 ring-1 ring-black/5">
              ログイン中：{session.user.email}
            </div>
          ) : null}
        </div>
        <Button onClick={onSave} disabled={attaching} className="w-full shadow-md py-4 text-[15px]">
          {attaching ? "保存中…" : "結果を保存して予報を見る（無料）"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={compact ? "rounded-[24px] bg-[color-mix(in_srgb,var(--mint),white_42%)] p-5 ring-1 ring-[var(--ring)] shadow-sm" : "rounded-[28px] bg-[color-mix(in_srgb,var(--mint),white_40%)] p-6 ring-1 ring-[var(--ring)] shadow-sm"}>
        <div className="text-[16px] font-black tracking-tight text-slate-900">{title || "このカルテはまだ保存されていません"}</div>
        <div className="mt-2 text-[13px] font-bold text-slate-600 leading-relaxed">{body || "無料で保存すると、今日・明日の未病予報とケア提案に進めます。"}</div>
      </div>
      <Button onClick={onSignup} className="w-full shadow-md py-4 text-[15px]">無料で保存して予報を見る</Button>
      <Button variant="secondary" onClick={onLogin} className="w-full bg-white shadow-sm py-4">ログインはこちら</Button>
    </div>
  );
}

function SaveStickyBar({ isLoggedIn, isAttached, attaching, onSave, onSignup }) {
  if (isAttached) return null;
  const ctaLabel = isLoggedIn ? (attaching ? "保存中…" : "保存して予報へ") : "無料で保存して予報へ";
  const onClick = isLoggedIn ? onSave : onSignup;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
      <div className="mx-auto flex w-full max-w-[440px] items-center gap-3 rounded-[24px] border border-[#d7e6df] bg-white/96 px-4 py-3 shadow-[0_18px_34px_-14px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-black tracking-[0.14em] text-[var(--accent-ink)]">SAVE KARTE</div>
          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-600">保存すると、今日・明日の未病予報に反映できます。</div>
        </div>
        <Button onClick={onClick} disabled={isLoggedIn && attaching} className="h-11 shrink-0 rounded-full px-5 text-[13px] shadow-md">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}

function CarePolicyCard({ item }) {
  if (!item) return null;
  return (
    <div className="rounded-[24px] bg-slate-50 ring-1 ring-slate-100 p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-[68px] w-[68px] shrink-0 place-items-center overflow-hidden rounded-[20px] bg-white ring-1 ring-slate-200 shadow-sm p-2">
          <img src={item.icon} alt={item.label} className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black tracking-wide text-[var(--accent-ink)] ring-1 ring-inset ring-slate-200 shadow-sm">
            {item.rankLabel}
          </div>
          <div className="mt-3 text-[18px] font-black tracking-tight text-slate-900">{item.label}</div>
          <div className="mt-1 text-[12px] font-black uppercase tracking-wider text-slate-500">{item.guide}</div>
          <div className="mt-3 text-[13px] font-bold leading-relaxed text-slate-600">{item.body}</div>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
 * Weather compatibility Logic
 * ---------------------------- */
function clamp(v, min, max) {
  if (!Number.isFinite(v)) return min;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function getImpactRankLabel(index) {
  if (index === 0) return "特に影響しやすい";
  if (index === 1) return "影響しやすい";
  return "やや影響しやすい";
}

function buildWeatherCompatibility({ answers, computed, symptomKey, core, subLabels }) {
  const subCodes = Array.isArray(computed?.sub_labels) ? computed.sub_labels : [];
  const coreCode = computed?.core_code || "";

  const affinityProfile = buildPersonalWeatherAffinityProfile({
    coreType: coreCode,
    subRiskWeights: subCodes,
    envVectors: Array.isArray(answers?.env_vectors)
      ? answers.env_vectors.filter((x) => x && x !== "none")
      : [],
    sensitivity:
      Number(answers?.env_sensitivity ?? 1) >= 2
        ? "high"
        : Number(answers?.env_sensitivity ?? 1) <= 0
          ? "low"
          : "normal",
  });

  const items = rankExactWeatherAffinity(affinityProfile.weights)
    .slice(0, 3)
    .map(({ key }, index) => ({
      key,
      label: weatherLabel(key),
      rankLabel: getImpactRankLabel(index),
      body: weatherBody(key, symptomKey, coreCode, subCodes),
    }));

  return {
    intro: buildCompatIntro({ core, subLabels, symptomKey }),
    items,
    signs: buildLikelySigns({ symptomKey, subCodes }),
    radarBridge: buildRadarBridge({ symptomKey }),
  };
}

function weatherLabel(key) {
  const map = { pressure_down: "気圧が下がる日", pressure_up: "気圧が上がる日", cold: "冷え込む日", heat: "気温が上がりやすい日", damp: "湿っぽい日", dry: "乾燥しやすい日" };
  return map[key] || key;
}

function weatherBody(key, symptomKey, coreCode, subCodes) {
  const hasBloodDef = subCodes.includes("blood_deficiency");
  const hasFluidDef = subCodes.includes("fluid_deficiency");
  const hasFluidDamp = subCodes.includes("fluid_damp");
  const isBattSmall = coreCode.includes("batt_small");
  const isAccel = coreCode.startsWith("accel");

  if (key === "pressure_down") {
    if (symptomKey === "headache" || symptomKey === "dizziness" || symptomKey === "neck_shoulder") {
      return "気圧が下がり外圧が緩む日に、体内の膨張感が強まりやすく、巡りの詰まりから頭や首肩の不調につながりやすくなります。";
    }
    if (symptomKey === "swelling" || symptomKey === "low_back_pain") {
      return "気圧が下がり外圧が緩む日に、体内の巡りが滞りやすく、下半身や全体の重だるさにつながりやすくなります。";
    }
    return "気圧が下がり外圧が緩む日に、体内の圧力が相対的に高まり、緊張や巡りの詰まり、だるさが出やすくなります。";
  }

  if (key === "pressure_up") {
    if (symptomKey === "mood" || symptomKey === "sleep") {
      return "外からの圧力が強まる日は、体がギュッと締まりやすく、リラックスや気持ちの切り替えに時間がかかりやすくなります。";
    }
    return "外からの圧力が強まる日は、体がギュッと締まりやすくなります。無理に詰め込まず、少しゆるめる意識が合います。";
  }

  if (key === "cold") {
    if (symptomKey === "neck_shoulder" || symptomKey === "low_back_pain") {
      return "冷え込む日は、血管や筋肉が縮こまり、首肩や腰のこわばり・痛みとして出やすくなります。";
    }
    if (hasBloodDef || isBattSmall || symptomKey === "fatigue") {
      return "冷え込む日は、血管や筋肉が縮こまり、体を支える余力が削れやすく、消耗やだるさとして出やすくなります。";
    }
    return "冷え込む日は、体がギュッと縮こまりやすく、こわばりやだるさが残りやすくなります。";
  }

  if (key === "heat") {
    if (symptomKey === "headache" || symptomKey === "dizziness" || symptomKey === "sleep") {
      return "気温が上がる日は、熱がこもりやすくのぼせ気味になり、上半身の張りや睡眠の質低下につながりやすくなります。";
    }
    if (hasFluidDef || isAccel) {
      return "気温が上がる日は、熱や刺激がこもりやすく、消耗やのぼせ感につながりやすくなります。";
    }
    return "暑さや熱こもりで体力が奪われ、だるさや疲れが出やすくなります。";
  }

  if (key === "damp") {
    if (symptomKey === "swelling" || symptomKey === "fatigue" || symptomKey === "headache" || symptomKey === "dizziness") {
      return "湿っぽい日は、体に余分な水分が溜まって重みが加わり、だるさやむくみ、頭の重さにつながりやすくなります。";
    }
    if (hasFluidDamp) {
      return "湿っぽい日は、水分が停滞して重だるさやむくみ感が出やすく、体の軽さを保ちにくくなります。";
    }
    return "湿っぽい日は、体の重さが増して、動き出しにくくなりやすいです。";
  }

  if (key === "dry") {
    if (hasFluidDef || hasBloodDef || symptomKey === "sleep" || symptomKey === "dizziness") {
      return "乾燥しやすい日は、うるおい不足が強まり、目・喉・皮膚の乾きや睡眠の質低下として出やすくなります。";
    }
    return "乾燥しやすい日は、こわばりや疲れが残りやすくなります。";
  }

  return "この天気変化で、体調が揺れやすい傾向があります。";
}

function buildCompatIntro({ core, subLabels, symptomKey }) {
  const subShorts = Array.isArray(subLabels) ? subLabels.map((s) => s.short).filter(Boolean) : [];
  const subText = subShorts.length ? subShorts.join("・") : "大きな偏りなし";
  return `${core?.title || "今回の体質"}は、${subText}の傾向が重なることで、天気の変化を受けた時の崩れ方に特徴が出やすいタイプです。特に「${SYMPTOM_LABELS[symptomKey] || symptomKey}」では、天候の影響がストレートに現れやすくなります。`;
}

function buildLikelySigns({ symptomKey, subCodes }) {
  let signs = [];

  switch (symptomKey) {
    case "fatigue":
      signs = ["だるさが抜けない", "体が重く感じる", "動くのがおっくうになる"];
      break;
    case "sleep":
      signs = ["夜に切り替えにくい", "眠りが浅く感じる", "朝起きても疲れが残る"];
      break;
    case "neck_shoulder":
      signs = ["首から肩にかけて張る", "背中までこわばる", "力が入りっぱなしになる"];
      break;
    case "low_back_pain":
      signs = ["腰のあたりが重だるい", "立ち上がりにこわばる", "下半身が冷えやすい"];
      break;
    case "swelling":
      signs = ["足や顔がむくみやすい", "体が水を含んだように重い", "靴や指輪がきつく感じる"];
      break;
    case "headache":
      signs = ["首肩〜こめかみが張ってくる", "頭が重い・すっきりしない", "呼吸が浅い感じになる"];
      break;
    case "dizziness":
      signs = ["フワフワ・ぐるぐるする", "目の奥が疲れる", "立ちくらみがしやすい"];
      break;
    case "mood":
      signs = ["気分が詰まる・沈む", "イライラしやすくなる", "切り替えに時間がかかる"];
      break;
    default:
      signs = ["だるさが出る", "こわばりや重さが残る", "切り替えにくくなる"];
  }

  if (subCodes.includes("fluid_damp") && !signs.includes("むくみっぽさが出る")) signs.push("胃腸が重く感じる");
  if (subCodes.includes("qi_stagnation") && !signs.includes("ため息が出やすくなる")) signs.push("ため息が出やすくなる");
  if (subCodes.includes("blood_deficiency") && !signs.includes("目が疲れやすくなる")) signs.push("目が疲れやすくなる");

  return signs.slice(0, 4);
}

function buildRadarBridge({ symptomKey }) {
  const symptomText = SYMPTOM_LABELS[symptomKey] || symptomKey;
  return `未病レーダーでは、その日の天気の変化とあなたの体質を組み合わせて、「今日はどの要素が響きやすいか」「日中のどの時間帯に気をつけたいか」「${symptomText}に対してどんなツボや食養生が合いやすいか」を先回りして見られます。`;
}


function PersonalKarteTeaser({ coreTitle, symptomLabel }) {
  const focusLabel = symptomLabel || "今気になる不調";

  return (
    <section className="overflow-hidden rounded-[34px] border border-[#d7e6df] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="relative p-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-[#f7e8b9] opacity-70" />
        <div className="pointer-events-none absolute right-12 top-24 h-24 w-24 rounded-full border border-[#d7e6df]" />
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] border border-[#d7e6df] bg-[#eff8f4] text-[24px] shadow-sm">
              🗺️
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black tracking-[0.18em] text-[#2f7567]">COMING SOON</div>
              <h2 className="mt-2 text-[25px] font-black leading-[1.35] tracking-[-0.05em] text-[#10182d]">
                未病カルテ Plus を準備中
              </h2>
              <p className="mt-2 text-[14px] font-black leading-7 text-[#64748b]">
                {focusLabel}が、どの条件が重なり、どの天気・季節で強まりやすいかを読み解く保存版カルテを準備しています。
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-[#e6eee9] bg-[#f8fbf9] p-5">
            <div className="text-[12px] font-black tracking-[0.16em] text-[#2f7567]">無料カルテの先で見えること</div>
            <p className="mt-3 text-[14px] font-bold leading-7 text-[#475569]">
              無料カルテでは、{coreTitle || "あなたの体質"}としての崩れやすさと天気相性を確認できます。Plusではさらに、「{focusLabel}」を主役にして、前触れ・天気・生活負荷・NG組み合わせ・身体ライン・相談時に伝えることまで、ひとつながりのループとして整理する予定です。
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {[
              "私の未病トリセツカード",
              "不調が強くなる前の前触れサイン",
              "重ねすぎ注意カード",
              "からだの負担ラインとツボ候補",
              "今日・明日の予報ページの使いどころ",
              "専門家に相談するときの共有メモ",
            ].map((title) => (
              <div key={title} className="flex items-center gap-3 rounded-[22px] border border-[#e6eee9] bg-white/80 px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-[#dfa42d] shadow-[0_0_8px_rgba(223,164,45,0.35)]" />
                <span className="text-[13px] font-black leading-6 text-[#334155]">{title}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[26px] border border-[#ead7a5] bg-[#fffaf0] p-4">
            <div className="text-[12px] font-black tracking-[0.16em] text-[#b17425]">ただいま準備中</div>
            <p className="mt-2 text-[13px] font-black leading-7 text-[#8a4b1d]">
              体質を知って終わりではなく、「自分の不調がどうくり返されるか」を見返せる形にします。公開までしばらくお待ちください。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -----------------------------
 * Main Page Component
 * ---------------------------- */
function ResultPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = params;

  const [tab, setTab] = useState("overview");

  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [attaching, setAttaching] = useState(false);
  const [toast, setToast] = useState("");

  const attachAfterLogin = searchParams?.get("attach") === "1";
  const autoAttachRan = useRef(false);

  const from = (searchParams?.get("from") || "").toLowerCase();
  const backHref = useMemo(() => {
    if (from === "history") return "/history";
    if (from === "check_run") return "/check/run";
    if (from === "check") return "/check";
    if (from === "home") return "/";
    if (from === "radar") return "/radar";
    return "/check";
  }, [from]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      setLoadingAuth(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoadingAuth(false);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (loadingAuth) return;

    let mounted = true;
    (async () => {
      try {
        setLoadingEvent(true);
        const token = session?.access_token;
        const res = await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(id)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const json = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok || !json?.data) { setEvent({ notFound: true }); return; }
        setEvent(json.data);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setEvent({ notFound: true });
      } finally {
        if (!mounted) return;
        setLoadingEvent(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, loadingAuth, session?.access_token]);

  useEffect(() => {
    if (!attachAfterLogin || loadingAuth || !session || !event || event?.notFound || autoAttachRan.current) return;
    autoAttachRan.current = true;
    attachToAccount(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachAfterLogin, loadingAuth, session, event?.id]);

  const computed = event?.computed || {};
  const answers = event?.answers || {};

  const diagnosisSymptomKey = event?.diagnosis_symptom_focus || answers?.symptom_focus || event?.symptom_focus || "fatigue";
  const activeSymptomKey = event?.active_symptom_focus || diagnosisSymptomKey;
  const symptomKey = activeSymptomKey;
  const diagnosisSymptomLabel = useMemo(() => SYMPTOM_LABELS[diagnosisSymptomKey] || "だるさ・疲労", [diagnosisSymptomKey]);
  const symptomLabel = useMemo(() => SYMPTOM_LABELS[symptomKey] || "だるさ・疲労", [symptomKey]);
  const symptomChanged = diagnosisSymptomKey && symptomKey && diagnosisSymptomKey !== symptomKey;

  const core = useMemo(() => getCoreLabel(computed?.core_code), [computed?.core_code]);
  const subLabels = useMemo(() => getSubLabels(computed?.sub_labels), [computed?.sub_labels]);
  const meridianPrimary = useMemo(() => getMeridianLine(computed?.primary_meridian), [computed?.primary_meridian]);
  const meridianSecondary = useMemo(() => getMeridianLine(computed?.secondary_meridian), [computed?.secondary_meridian]);

  const isLoggedIn = !!session;
  const isAttached = !!event?.is_attached;

  const weatherCompat = useMemo(() => {
    return buildWeatherCompatibility({ answers, computed, symptomKey, core, subLabels });
  }, [answers, computed, symptomKey, core, subLabels]);

  const carePreferences = useMemo(() => {
    return buildBaseCarePreferences({ answers, computed, symptomKey });
  }, [answers, computed, symptomKey]);

  async function attachToAccount(silent = false) {
    if (attaching) return;
    setAttaching(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) { if (!silent) setToast("先にログインが必要です"); return; }

      const res = await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(id)}/attach`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "保存に失敗しました");

      router.push(`/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`);
    } catch (e) {
      setToast(e?.message || String(e));
      setTimeout(() => setToast(""), 2500);
    } finally {
      setAttaching(false);
    }
  }

  function goSignupToRadar() {
    router.push(`/signup?result=${encodeURIComponent(id)}&next=${encodeURIComponent(`/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`)}`);
  }

  function goLoginToRadar() {
    router.push(`/signup?result=${encodeURIComponent(id)}&next=${encodeURIComponent(`/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`)}`);
  }

  const headerLeft = (
    <button
      type="button"
      onClick={() => router.push(backHref)}
      className="inline-flex items-center gap-2 rounded-full bg-[#fdfefc]/90 backdrop-blur-md px-4 py-2 text-[12px] font-extrabold text-slate-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] ring-1 ring-[var(--ring)] transition-all hover:bg-white active:scale-95"
    >
      ← 戻る
    </button>
  );

  const headerRight = (
    <button
      type="button"
      onClick={() => router.push("/")}
      className="inline-flex items-center gap-2 rounded-full bg-[#fdfefc]/90 backdrop-blur-md px-4 py-2 text-[12px] font-extrabold text-slate-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] ring-1 ring-[var(--ring)] transition-all hover:bg-white active:scale-95"
    >
      ホーム
    </button>
  );

  if (loadingEvent) {
    return (
      <AppShell title="未病カルテ" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
        <Module className="border-none shadow-none">
          <ModuleHeader icon={<IconResult />} title="カルテを読み込み中…" sub="少し待ってください" />
          <div className="px-5 pb-6 pt-4">
            <div className="rounded-[32px] bg-white p-8 ring-1 ring-[var(--ring)] flex flex-col items-center gap-4 shadow-sm text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[var(--accent)]" />
              <div className="text-[15px] font-black text-slate-400 tracking-widest">読み込み中…</div>
            </div>
          </div>
        </Module>
      </AppShell>
    );
  }

  if (!event || event?.notFound) {
    return (
      <AppShell title="未病カルテ" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
        <Module>
          <ModuleHeader icon={<IconResult />} title="カルテが見つかりません" sub="期限切れ/削除、または保存失敗の可能性" />
          <div className="px-5 pb-6 pt-4 space-y-5">
            <div className="rounded-[28px] bg-rose-50 p-6 ring-1 ring-rose-200 text-center shadow-sm">
              <div className="text-[15px] leading-relaxed text-rose-800 font-bold">
                未病カルテを取得できませんでした。<br/>恐れ入りますが、再度チェックをお願いします。
              </div>
            </div>
            <Button onClick={() => router.push("/check")} className="w-full shadow-md py-4">未病カルテを作り直す</Button>
          </div>
        </Module>
      </AppShell>
    );
  }

  return (
    <AppShell title="未病カルテ" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-[100] w-[92%] max-w-md -translate-x-1/2 rounded-full bg-slate-900/95 backdrop-blur-md px-5 py-3.5 text-[14px] font-extrabold text-white shadow-[0_16px_32px_-12px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      ) : null}

      <SaveStickyBar
        isLoggedIn={isLoggedIn}
        isAttached={isAttached}
        attaching={attaching}
        onSave={() => attachToAccount(false)}
        onSignup={goSignupToRadar}
      />

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="pt-4 pb-3">
          {/* ★ ヒーローカード：入れ子をなくし、主役の「体質」を最大化 */}
          <div className="relative rounded-[36px] bg-white ring-1 ring-[var(--ring)] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[220px] bg-gradient-to-b from-[color-mix(in_srgb,var(--mint),white_30%)] to-white" />
            
            <div className="relative z-10 px-6 pt-8 pb-8 sm:px-8">
              
              {/* お困りの不調はバッジ化して邪魔にならないように */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-md px-3.5 py-1.5 ring-1 ring-black/5 shadow-sm">
                  <span className="text-[10px] font-extrabold text-slate-500">
                    現在の不調：{symptomLabel}{symptomChanged ? `（チェック時：${diagnosisSymptomLabel}）` : ""}
                  </span>
                </div>
              </div>

              {/* 体質の軸を堂々と表示 */}
              <div className="flex flex-col items-center text-center">
                <div className="text-[12px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">
                  あなたの未病カルテ
                </div>
                <div className="mt-2 text-[32px] font-black tracking-tight text-slate-900 leading-[1.15]">
                  {core?.title || "—"}
                </div>
                {core?.short ? (
                  <div className="mt-3">
                    <span className="inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-[var(--accent-ink)] ring-1 ring-inset ring-[var(--ring)] shadow-sm">
                      {core.short}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="shrink-0">
                  <div className="grid h-[132px] w-[132px] place-items-center overflow-hidden rounded-[26px] bg-[#fdfefc] ring-1 ring-[var(--ring)] shadow-sm transition-transform hover:scale-105 p-2">
                    <CoreIllust
                      code={computed?.core_code}
                      title={core?.title || "体質タイプ"}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                <div className="text-[14px] font-bold leading-relaxed text-slate-600 text-center sm:text-left pt-2">
                  {core?.tcm_hint || ""}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {!isAttached ? (
        <div className="mx-auto w-full max-w-[440px] px-4 pb-1">
          <div className="rounded-[24px] border border-[#d7e6df] bg-[color-mix(in_srgb,var(--mint),white_50%)] px-5 py-4 shadow-sm">
            <div className="text-[12px] font-black tracking-[0.16em] text-[var(--accent-ink)]">まだ保存されていません</div>
            <div className="mt-2 text-[13px] font-bold leading-6 text-slate-700">このカルテは一時結果です。保存すると、今日・明日の未病予報やケア提案に反映できます。</div>
          </div>
        </div>
      ) : null}

      <SegmentedTabs value={tab} onChange={setTab} />

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-6 pb-28 mt-3">
          {tab === "overview" ? (
            <>
              <Card>
                <CardHeader icon={<IconAnalysis />} title="詳しい見立て" sub="整えポイント・張りやすい場所" />
                
                {/* ★ 概要タブ：SoftPanelの入れ子を廃止し、フラットで広々とした構成へ */}
                <div className="px-5 sm:px-6 pb-8 pt-6 space-y-8">
                  
                  {/* セクション1：気血水 */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <IconMemo className="h-5 w-5 text-amber-600" />
                      <h3 className="text-[16px] font-black text-slate-900">整えたいバランス（気血水）</h3>
                    </div>
                    {subLabels?.length ? (
                      <div className="space-y-3">
                        {subLabels.map((s) => (
                          <div key={s.code || s.title} className="rounded-[24px] bg-slate-50 ring-1 ring-slate-100 p-5">
                            <div className="flex gap-4 items-start">
                              <div className="shrink-0 pt-0.5 text-[var(--accent)]">
                                <SubIllust code={s.code} size="md" />
                              </div>
                              <div className="min-w-0">
                                {/* 見切れ防止のため truncate を使わず leading-snug を指定 */}
                                <div className="text-[16px] font-black tracking-tight text-slate-900 leading-snug">{s.title}</div>
                                <div className="mt-2 text-[13px] leading-relaxed font-bold text-slate-600">{s.action_hint}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[13px] font-bold text-slate-500">良好なバランスです。</div>
                    )}
                  </div>

                  <div className="h-px w-full bg-slate-100" />

                  {/* セクション2：経絡（主・副を一つのカード空間に統合） */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <IconBody className="h-5 w-5 text-violet-600" />
                      <h3 className="text-[16px] font-black text-slate-900">負担がかかりやすい場所（経絡）</h3>
                    </div>
                    <div className="rounded-[24px] bg-slate-50 ring-1 ring-slate-100 p-5 space-y-5">
                      {meridianPrimary ? (
                        <MeridianPanelContent line={{ ...meridianPrimary, code: computed?.primary_meridian }} tone="violet" />
                      ) : (
                        <div className="text-[13px] font-bold text-slate-500">今回は強い偏りなし</div>
                      )}
                      
                      {meridianSecondary && (
                        <>
                          <div className="h-px w-full bg-slate-200/60" />
                          <MeridianPanelContent line={{ ...meridianSecondary, code: computed?.secondary_meridian }} tone="teal" />
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </Card>

              <Card>
                <CardHeader icon={<IconBolt />} title="次の一歩" sub="保存すると、今日・明日の未病予報に反映されます" />
                <div className="px-6 pb-8 pt-5 space-y-5">
                  <SavePromptCard
                    isLoggedIn={isLoggedIn}
                    isAttached={isAttached}
                    session={session}
                    attaching={attaching}
                    onSave={() => attachToAccount(false)}
                    onSignup={goSignupToRadar}
                    onLogin={goLoginToRadar}
                    title={isLoggedIn ? "このカルテを保存して予報につなげましょう" : "無料で保存して予報を見ましょう"}
                    body={isLoggedIn
                      ? "保存すると、今日・明日の未病予報や暮らす・食べる・ほぐす提案に反映できます。"
                      : "アカウント作成後、今日・明日の崩れやすさと先回りケアを見られるようになります。"}
                  />
                  {isAttached ? (
                    <Button onClick={() => router.push("/radar")} className="w-full shadow-md py-4">今日の予報と対策へ</Button>
                  ) : null}
                </div>
              </Card>
            </>
          ) : null}

          {tab === "compat" ? (
            <Card>
              <CardHeader icon={<IconCloud />} title="天気との相性" sub="気象変化による崩れやすさの傾向" />
              
              {/* ★ 相性タブ：SoftPanelの入れ子を廃止し、フラットな構成へ */}
              <div className="px-5 sm:px-6 pb-8 pt-6 space-y-8">
                <div className="text-[14px] leading-relaxed font-bold text-slate-700 bg-slate-50 p-6 rounded-[24px] ring-1 ring-slate-100">
                  {weatherCompat.intro}
                </div>

                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <IconRadar className="h-5 w-5 text-teal-600" />
                    <h3 className="text-[16px] font-black text-slate-900">影響を受けやすい天気変化</h3>
                  </div>
                  <div className="space-y-3">
                    {weatherCompat.items.map((item) => (
                      <div key={item.key} className="rounded-[24px] bg-slate-50 ring-1 ring-slate-100 p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-white ring-1 ring-slate-200 text-[var(--accent-ink)] shadow-sm">
                               <WeatherIcon triggerKey={item.key} className="h-7 w-7" />
                            </div>
                            <div className="min-w-0">
                              {/* 見切れ防止のため truncate なし */}
                              <div className="text-[16px] font-black tracking-tight text-slate-900 leading-snug">{item.label}</div>
                              <div className="mt-1 text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/80">{item.rankLabel}</div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 text-[13px] leading-relaxed font-bold text-slate-600">
                          {item.body}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <IconBolt className="h-5 w-5 text-amber-500" />
                    <h3 className="text-[16px] font-black text-slate-900">天気が重なると出やすいサイン</h3>
                  </div>
                  <ul className="grid gap-2">
                    {weatherCompat.signs.map((s, idx) => (
                      <li key={idx} className="flex items-center gap-3 rounded-[16px] bg-slate-50 px-5 py-3.5 text-[14px] font-bold text-slate-700 ring-1 ring-inset ring-slate-100">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <IconCompass className="h-5 w-5 text-[var(--accent)]" />
                    <h3 className="text-[16px] font-black text-slate-900">未病レーダーで分かること</h3>
                  </div>
                  <div className="text-[13px] leading-relaxed font-bold text-slate-700 mb-6">{weatherCompat.radarBridge}</div>
                  <Button onClick={() => setTab("care")} className="w-full shadow-md py-4">整え方を見る</Button>
                </div>


                <div className="h-px w-full bg-slate-100" />

                <SavePromptCard
                  isLoggedIn={isLoggedIn}
                  isAttached={isAttached}
                  session={session}
                  attaching={attaching}
                  onSave={() => attachToAccount(false)}
                  onSignup={goSignupToRadar}
                  onLogin={goLoginToRadar}
                  compact={true}
                  title="このカルテを保存すると、予報で使えます"
                  body="保存すると、今日・明日の未病予報やケア提案にこのカルテが反映されます。"
                />
              </div>
            </Card>
          ) : null}

          {tab === "care" ? (
            <>
              <Card>
                <CardHeader icon={<IconCompass />} title="整え方" sub="体質ベースで見た、合いやすいケア方針" />
                <div className="px-5 sm:px-6 pb-8 pt-6 space-y-8">
                  <div className="rounded-[24px] bg-slate-50 p-6 ring-1 ring-slate-100 text-[14px] leading-relaxed font-bold text-slate-700">
                    {carePreferences.summary}
                    <div className="mt-3 text-[12px] font-bold leading-6 text-slate-500">
                      これは体質チェック結果から見た、基本の整え方です。実際に今日どれを優先するかは、その日の天気や今の不調に合わせて未病レーダーで調整します。
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <IconBolt className="h-5 w-5 text-amber-500" />
                      <h3 className="text-[16px] font-black text-slate-900">体質から見た3つの整え方</h3>
                    </div>
                    <div className="space-y-3">
                      {carePreferences.items.map((item) => (
                        <CarePolicyCard key={item.key} item={item} />
                      ))}
                    </div>
                  </div>

                  {carePreferences.reasons?.length ? (
                    <div>
                      <div className="flex items-center gap-2.5 mb-4">
                        <IconMemo className="h-5 w-5 text-amber-600" />
                        <h3 className="text-[16px] font-black text-slate-900">見立ての補足</h3>
                      </div>
                      <div className="grid gap-2">
                        {carePreferences.reasons.map((reason, idx) => (
                          <div key={idx} className="rounded-[18px] bg-white px-5 py-4 text-[13px] font-bold leading-6 text-slate-700 ring-1 ring-slate-200 shadow-sm">
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border border-[#d7e6df] bg-[color-mix(in_srgb,var(--mint),white_55%)] p-5">
                    <div className="text-[12px] font-black tracking-[0.16em] text-[var(--accent-ink)]">この先につながること</div>
                    <div className="mt-2 text-[13px] font-bold leading-6 text-slate-700">
                      7つの整え方は、未病レーダーの日々のケア提案、今後の整うアイテム検索、読みもの、相談先探しを横断して使う目印です。
                    </div>
                  </div>

                  <SavePromptCard
                    isLoggedIn={isLoggedIn}
                    isAttached={isAttached}
                    session={session}
                    attaching={attaching}
                    onSave={() => attachToAccount(false)}
                    onSignup={goSignupToRadar}
                    onLogin={goLoginToRadar}
                    compact={true}
                    title="保存すると、その日の天気に合わせた整え方が見られます"
                    body="未病レーダーでは、今日・明日の天気や今の不調に合わせて、7つの整え方から優先度を絞って提案します。"
                  />
                </div>
              </Card>

              <PersonalKarteTeaser coreTitle={core.title} symptomLabel={symptomLabel} />
            </>
          ) : null}

          <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-300 pb-4">
            Result ID: {id}
          </div>
        </div>
      </div>
    </AppShell>
  );
}


