"use client";
// app/result/[id]/page.js
import { trackFunnel } from "@/lib/funnelClient";
import {ResultFeedback} from '@/components/experience/ExperienceProvider';


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
  buildConstitutionWeatherAffinityV2,
  rankConstitutionWeatherAffinityV2,
} from "@/lib/radar_v1/personalizeForecastV2";
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
} from "@/components/illust/icons/app";
import { WeatherIcon } from "@/components/illust/icons/weather";
import { buildBaseCarePreferences } from "@/lib/diagnosis/v2/carePreferences";
import { buildResultCareExample } from "@/lib/diagnosis/v2/resultCareExample";
import ResultCareExample from "@/components/diagnosis/ResultCareExample";
import CarePolicyCard from "@/components/diagnosis/ResultCarePolicyCard";
import { observeResultSaveCtaScroll, resultCtaDismissed, dismissResultCta, shouldShowResultIntroCta } from "@/lib/resultSaveCta";
import ConstitutionUpdateDialog from "@/components/diagnosis/ConstitutionUpdateDialog";

const BODY_LINE_OPTIONS = [
  { value: "A", label: "前屈する" },
  { value: "B", label: "上体を反らす" },
  { value: "C", label: "体をひねる・横へ倒す" },
  { value: "D", label: "首をうつむける" },
  { value: "E", label: "首を反らす・横を向く" },
  { value: "F", label: "腕を横から上げる" },
];

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
        <div className="mt-1 text-[12px] font-extrabold text-slate-500">
          {line.body_area}（{line.meridians.join("・")}）
        </div>
        <div className="mt-2 text-[13px] font-bold leading-relaxed text-slate-700">{line.organs_hint}</div>
      </div>
    </div>
  );
}

function SegmentedTabs({ value, onChange }) {
  const tabs = [
    { key: "overview", label: "トリセツ概要" },
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

function SavePromptCard({ isLoggedIn, isAttached, isCurrent, needsConfirmation, session, attaching, onSave, onSignup, onLogin, onRadar }) {
  const onContinue = isAttached ? onRadar : isLoggedIn ? onSave : onSignup;
  const ctaLabel = isAttached
    ? attaching ? "更新中…" : "予報とケアを見る"
    : isLoggedIn
      ? attaching ? "保存中…" : "予報とケアを見る"
      : "無料登録して予報へ";
  return (
    <div className="rounded-[24px] bg-[color-mix(in_srgb,var(--mint),white_50%)] p-5 ring-1 ring-[color-mix(in_srgb,var(--accent),white_74%)]">
      <h3 className="text-[17px] font-black leading-7 tracking-tight text-slate-900">この体質で、毎日の備えを</h3>
      <p className="mt-2 text-[13px] font-bold leading-6 text-slate-600">毎日の天気に合わせて、あなたの体質に合う予報と具体的なケアを見られます。</p>
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white/85 text-[var(--accent-ink)]"><IconRadar className="h-5 w-5" /></div>
          <div className="text-[13px] font-bold leading-5 text-slate-700">今日・明日の体調予報<span className="mt-0.5 block text-[12px] font-medium text-slate-500">警戒度と、気をつけたい時間帯</span></div>
        </div>
        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white/85 text-[var(--accent-ink)]"><IconCompass className="h-5 w-5" /></div>
          <div className="text-[13px] font-bold leading-5 text-slate-700">その日に合うセルフケア<span className="mt-0.5 block text-[12px] font-medium text-slate-500">食材・飲み物・ツボ・過ごし方</span></div>
        </div>
      </div>
      {!isLoggedIn && !isAttached ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {["無料登録", "支払い情報不要", "自動課金なし"].map((label) => <span key={label} className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[var(--accent-ink)] ring-1 ring-black/5">{label}</span>)}
        </div>
      ) : null}
      {needsConfirmation ? <p className="mt-3 text-[12px] font-bold leading-6 text-[#87662F]">{isAttached ? "この結果は履歴に保存済みです。" : "この結果をアカウントに保存できます。"}予報・ケアに反映するかは、次の画面で選べます。</p> : isAttached ? <p className="mt-3 text-[12px] font-bold text-emerald-700">{isCurrent ? "このトリセツを予報・ケアに反映中です。" : "この体質結果は保存済みです。"}</p> : isLoggedIn && session?.user?.email ? <p className="mt-3 break-all text-[11px] font-medium text-slate-500">ログイン中：{session.user.email}</p> : null}
      <Button onClick={onContinue} disabled={attaching} className="mt-4 w-full whitespace-nowrap !px-3 !text-[14px] shadow-md">{ctaLabel}</Button>
      {!isLoggedIn && !isAttached ? <button type="button" onClick={onLogin} className="mx-auto mt-2 block min-h-[44px] px-3 text-[12px] font-bold text-slate-500 underline underline-offset-4">登録済みの方はこちら</button> : null}
    </div>
  );
}

function SaveStickyBar({ id, isLoggedIn, isAttached, attaching, onSave, onSignup, onClose }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => resultCtaDismissed(id));
  const viewTracked = useRef(false);
  useEffect(() => {
    if (dismissed || visible) return;
    return observeResultSaveCtaScroll(window, () => setVisible(true));
  }, [dismissed, visible]);
  useEffect(() => {
    if (!visible || dismissed || isLoggedIn || isAttached || viewTracked.current) return;
    viewTracked.current = true;
    trackFunnel("signup_cta_view");
  }, [visible, dismissed, isLoggedIn, isAttached]);
  if (dismissed || !visible) return null;
  const ctaLabel = attaching ? "処理中…" : isLoggedIn || isAttached ? "予報とケアを見る" : "ログインして予報とケアへ";
  const onClick = isLoggedIn ? onSave : onSignup;
  return (
    <div className="result-save-cta-enter fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
      <div className="mx-auto w-full max-w-[440px] rounded-[20px] border border-[#d7e6df] bg-white/95 p-2.5 shadow-[0_18px_34px_-14px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5">
          <Button onClick={onClick} disabled={isLoggedIn && attaching} className="!h-11 min-w-0 flex-1 whitespace-nowrap rounded-full !px-3 !text-[14px] shadow-md">{ctaLabel}</Button>
          <button type="button" aria-label="予報とケアの案内を閉じる" onClick={() => { dismissResultCta(id); onClose?.(); setDismissed(true); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">×</button>
        </div>
        <p className="mt-1 text-center text-[12px] font-medium leading-5 text-slate-500">今日・明日の体調予報と、あなたに合うケア</p>
      </div>
    </div>
  );
}

/* -----------------------------
 * Weather compatibility Logic
 * ---------------------------- */
function buildForecastConstitution({ answers, computed }) {
  const answerVectors = Array.isArray(answers?.env_vectors)
    ? answers.env_vectors.filter((value) => value && value !== "none")
    : [];
  return {
    core_code: computed?.core_code || "",
    axes: {
      ...(computed?.axes || {}),
      thermo_answer: computed?.axes?.thermo_answer || "neutral",
    },
    split_scores: computed?.split_scores || {},
    material_scores: computed?.material_scores || {},
    score_scale: computed?.score_scale || computed?.split_scores?.scale || null,
    env: {
      sensitivity: Number(computed?.env?.sensitivity ?? 0),
      vectors: answerVectors.length ? answerVectors : (computed?.env?.vectors || []),
    },
  };
}

function getImpactRankLabel(index) {
  if (index === 0) return "特に影響しやすい";
  if (index === 1) return "影響しやすい";
  return "やや影響しやすい";
}

function buildWeatherCompatibility({ answers, computed, symptomKey, core, subLabels }) {
  const subCodes = Array.isArray(computed?.sub_labels) ? computed.sub_labels : [];
  const coreCode = computed?.core_code || "";

  const affinityProfile = buildConstitutionWeatherAffinityV2({
    constitution: buildForecastConstitution({ answers, computed }),
  });
  const reactionAxis = Number(affinityProfile?.normalized_constitution?.axes?.yin_yang_score || 0);
  const pressureResponseDirection = reactionAxis >= 0 ? "accel" : "brake";

  const items = rankConstitutionWeatherAffinityV2(affinityProfile.weights)
    .slice(0, 3)
    .map(({ key }, index) => ({
      key,
      label: weatherLabel(key),
      rankLabel: getImpactRankLabel(index),
      body: weatherBody(key, symptomKey, coreCode, subCodes, pressureResponseDirection),
    }));

  return {
    intro: buildCompatIntro(),
    items,
    signs: buildLikelySigns({ symptomKey, subCodes }),
    radarBridge: buildRadarBridge({ symptomKey }),
  };
}

function weatherLabel(key) {
  const map = { pressure_down: "気圧が下がる日", pressure_up: "気圧が上がる日", temp_shift: "寒暖差が大きい日", cold: "気温が低い日", heat: "気温が高い日", damp: "湿っぽい日", dry: "乾燥しやすい日" };
  return map[key] || key;
}

function weatherBody(key, symptomKey, coreCode, subCodes, pressureResponseDirection = "balanced") {
  const hasBloodDef = subCodes.includes("blood_deficiency");
  const hasFluidDef = subCodes.includes("fluid_deficiency");
  const hasFluidDamp = subCodes.includes("fluid_damp");
  const isBattSmall = coreCode.includes("batt_small");
  const isAccel = coreCode.startsWith("accel");

  if (key === "pressure_down" || key === "pressure_up") {
    const physical = key === "pressure_up" ? "気圧が上がる変化" : "気圧が下がる変化";
    if (pressureResponseDirection === "accel") {
      return `${physical}に揺さぶられた時、張り・力み・切り替えにくさとして表れやすい傾向です。気圧の向きではなく、あなたの体質による反応の仕方を重ねて見ています。`;
    }
    if (pressureResponseDirection === "brake") {
      return `${physical}に揺さぶられた時、重だるさ・動き出しにくさとして表れやすい傾向です。気圧の向きではなく、あなたの体質による反応の仕方を重ねて見ています。`;
    }
    return `${physical}に揺さぶられた時、環境変化へ適応する疲れとして表れやすい傾向です。`;
  }

  if (key === "temp_shift") {
    if (isBattSmall || hasBloodDef) {
      return "寒暖差が大きい日は、体温調節に余力を使いやすく、疲れやだるさが残りやすくなります。";
    }
    return "寒暖差が大きい日は、環境への切り替えが続き、張り・重さ・疲れとして揺れが表れやすくなります。";
  }

  if (key === "cold") {
    if (symptomKey === "neck_shoulder" || symptomKey === "low_back_pain") {
      return "気温が低い日は、血管や筋肉が縮こまり、首肩や腰のこわばり・痛みとして出やすくなります。";
    }
    if (hasBloodDef || isBattSmall || symptomKey === "fatigue") {
      return "気温が低い日は、血管や筋肉が縮こまり、体を支える余力が削れやすく、消耗やだるさとして出やすくなります。";
    }
    return "気温が低い日は、体がギュッと縮こまりやすく、こわばりやだるさが残りやすくなります。";
  }

  if (key === "heat") {
    if (symptomKey === "headache" || symptomKey === "dizziness" || symptomKey === "sleep") {
      return "気温が高い日は、熱がこもりやすくのぼせ気味になり、上半身の張りや睡眠の質低下につながりやすくなります。";
    }
    if (hasFluidDef || isAccel) {
      return "気温が高い日は、熱や刺激がこもりやすく、消耗やのぼせ感につながりやすくなります。";
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

function buildCompatIntro() {
  return "体質タイプだけでなく、寒さ・暑さへの感じ方、天気への感じやすさ、気・血・水の6つの傾向を合わせて、影響を受けやすい順に表示しています。";
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

function ResultPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = params;
  const activeResultIdRef = useRef(id);
  activeResultIdRef.current = id;

  const [tab, setTab] = useState("overview");
  useEffect(() => { trackFunnel({ overview: "result_view", compat: "compat_view", care: "care_view" }[tab], tab); }, [tab]);
  const tabStartRef = useRef(null);
  const tabScrollPending = useRef(false);
  const changeTab = (nextTab) => {
    if (nextTab === tab) return;
    tabScrollPending.current = true;
    setTab(nextTab);
  };
  useEffect(() => {
    if (!tabScrollPending.current) return;
    tabScrollPending.current = false;
    const frame = requestAnimationFrame(() => {
      const anchor = tabStartRef.current;
      if (!anchor) return;
      // Match the sticky tab strip offset; keep the new panel's first line visible.
      const strip = anchor.nextElementSibling;
      const offset = strip ? parseFloat(getComputedStyle(strip).top) || 60 : 60;
      window.scrollTo({ top: Math.max(0, window.scrollY + anchor.getBoundingClientRect().top - offset), behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab]);

  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [attaching, setAttaching] = useState(false);
  const attachingRef = useRef(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [appliedHere, setAppliedHere] = useState(false);
  const [bodyLineOpen, setBodyLineOpen] = useState(false);
  const [bodyLinePrimary, setBodyLinePrimary] = useState("none");
  const [bodyLineSecondary, setBodyLineSecondary] = useState("none");
  const [bodyLineSaving, setBodyLineSaving] = useState(false);
  const [toast, setToast] = useState("");

  const attachAfterLogin = searchParams?.get("attach") === "1";
  const autoAttachRan = useRef(false);

  useEffect(() => {
    setAppliedHere(false);
    setUpdateDialogOpen(false);
    setUpdateError("");
    autoAttachRan.current = false;
  }, [id]);

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
    if (!event?.answers) return;
    setBodyLinePrimary(event.answers.body_line_primary || "none");
    setBodyLineSecondary(event.answers.body_line_secondary || "none");
  }, [event?.id, event?.answers?.body_line_primary, event?.answers?.body_line_secondary]);

  useEffect(() => {
    if (!attachAfterLogin || loadingAuth || !session || !event || event?.notFound || autoAttachRan.current) return;
    autoAttachRan.current = true;
    continueToForecast();
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
  const needsConfirmation = isLoggedIn && !!event?.has_current_profile && !event?.is_current;
  const showIntroCta = shouldShowResultIntroCta({ isLoggedIn, event, from });

  const weatherCompat = useMemo(() => {
    return buildWeatherCompatibility({ answers, computed, symptomKey, core, subLabels });
  }, [answers, computed, symptomKey, core, subLabels]);

  const carePreferences = useMemo(() => {
    return buildBaseCarePreferences({ answers, computed, symptomKey });
  }, [answers, computed, symptomKey]);

  const careExample = useMemo(() => buildResultCareExample({
    answers,
    computed,
    symptomKey,
    createdAt: event?.created_at,
    carePreferences,
  }), [answers, computed, symptomKey, event?.created_at, carePreferences]);

  async function attachToAccount(confirmUpdate = false) {
    if (attachingRef.current) return;
    attachingRef.current = true;
    setAttaching(true);
    setUpdateError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("ログイン状態を確認できません。再度ログインしてからお試しください。");

      const res = await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(id)}/attach`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirm_update: confirmUpdate === true }),
      });
      const json = await res.json().catch(() => ({}));
      if (activeResultIdRef.current !== id) return;
      if (res.status === 409 && json?.code === "PROFILE_UPDATE_CONFIRMATION_REQUIRED") {
        setEvent(current => ({ ...current, has_current_profile: true, is_current: false }));
        setUpdateDialogOpen(true);
        return;
      }
      if (!res.ok) throw new Error(json?.error || "保存に失敗しました");
      if (!isAttached) trackFunnel("result_save_success");
      const saved = json?.data;
      if (typeof saved?.is_current !== "boolean") throw new Error("反映状態を確認できませんでした。ページを読み直してください。");
      setEvent(current => ({
        ...current,
        is_attached: true,
        has_current_profile: saved.has_current_profile === true,
        is_current: saved.is_current,
        current_core_code: saved.current_core_code || null,
        ...(saved.is_current ? { active_symptom_focus: diagnosisSymptomKey } : {}),
      }));
      if (confirmUpdate) {
        setUpdateDialogOpen(false);
        setAppliedHere(true);
        setToast("予報・ケアに反映しました。");
        setTimeout(() => setToast(""), 2500);
        // Applying a saved result never takes the reader away from this page.
      } else if (saved.is_current) {
        router.push(`/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`);
      } else {
        // Legacy guest-save/auth recovery also archives without auto-adoption.
        setUpdateDialogOpen(true);
      }
    } catch (e) {
      if (activeResultIdRef.current !== id) return;
      setUpdateError(e?.message || "更新できませんでした。もう一度お試しください。");
      setToast(e?.message || String(e));
      setTimeout(() => setToast(""), 2500);
    } finally {
      attachingRef.current = false;
      setAttaching(false);
    }
  }

  function continueToForecast(ctaLocation = "") {
    if (attachingRef.current) return;
    if (!isLoggedIn) { goSignupToRadar(ctaLocation); return; }
    if (needsConfirmation) {
      setUpdateError("");
      setUpdateDialogOpen(true);
      return;
    }
    if (isAttached) { router.push("/radar"); return; }
    attachToAccount(false);
  }

  function requestResultAdoption() {
    if (attachingRef.current) return;
    setUpdateError("");
    setUpdateDialogOpen(true);
  }

  async function saveBodyLines() {
    if (bodyLineSaving) return;
    setBodyLineSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const res = await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          body_line_primary: bodyLinePrimary,
          body_line_secondary: bodyLinePrimary === "none" ? "none" : bodyLineSecondary,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.data) throw new Error(json?.error || "保存に失敗しました");
      setEvent((current) => ({
        ...current,
        answers: json.data.answers,
        computed: json.data.computed,
      }));
      setBodyLineOpen(false);
      setToast("体のラインを保存しました");
      setTimeout(() => setToast(""), 2500);
    } catch (error) {
      setToast(error?.message || String(error));
      setTimeout(() => setToast(""), 2500);
    } finally {
      setBodyLineSaving(false);
    }
  }

  function goSignupToRadar(ctaLocation) {
    trackFunnel("signup_cta_click", tab, ctaLocation);
    router.push(`/signup?result=${encodeURIComponent(id)}&next=${encodeURIComponent(`/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`)}`);
  }

  function goLoginToRadar(ctaLocation) {
    goSignupToRadar(ctaLocation);
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
      <AppShell title="体質トリセツ" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
        <Module className="border-none shadow-none">
          <ModuleHeader icon={<IconResult />} title="トリセツを読み込み中…" sub="少し待ってください" />
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
      <AppShell title="体質トリセツ" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
        <Module>
          <ModuleHeader icon={<IconResult />} title="トリセツが見つかりません" sub="期限切れ/削除、または保存失敗の可能性" />
          <div className="px-5 pb-6 pt-4 space-y-5">
            <div className="rounded-[28px] bg-rose-50 p-6 ring-1 ring-rose-200 text-center shadow-sm">
              <div className="text-[15px] leading-relaxed text-rose-800 font-bold">
                体質トリセツを取得できませんでした。<br/>恐れ入りますが、再度チェックをお願いします。
              </div>
            </div>
            <Button onClick={() => router.push("/check")} className="w-full shadow-md py-4">体質トリセツを作り直す</Button>
          </div>
        </Module>
      </AppShell>
    );
  }

  if (event?.retake_required) {
    return (
      <AppShell title="体質トリセツ" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
        <Module>
          <ModuleHeader icon={<IconResult />} title="体質チェックが新しくなりました" sub="新しい質問でトリセツを作り直せます" />
          <div className="space-y-5 px-5 pb-6 pt-4">
            <div className="rounded-[28px] bg-[color-mix(in_srgb,var(--mint),white_62%)] p-6 text-center ring-1 ring-[color-mix(in_srgb,var(--accent),white_74%)]">
              <div className="text-[15px] font-bold leading-7 text-slate-700">
                以前のテスト結果は、新しい採点へ置き換えずに終了しました。今の質問へ答え直すと、6つの傾向と冷え・ほてりを分けた新しい結果が保存されます。
              </div>
            </div>
            <Button onClick={() => router.push("/check/run")} className="w-full py-4 shadow-md">新しい体質チェックを始める</Button>
          </div>
        </Module>
      </AppShell>
    );
  }

  return (
    <AppShell title="体質トリセツ" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-[100] w-[92%] max-w-md -translate-x-1/2 rounded-full bg-slate-900/95 backdrop-blur-md px-5 py-3.5 text-[14px] font-extrabold text-white shadow-[0_16px_32px_-12px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      ) : null}

      {showIntroCta ? <SaveStickyBar
        key={id}
        id={id}
        isLoggedIn={isLoggedIn}
        isAttached={isAttached}
        attaching={attaching}
        onSave={() => continueToForecast("floating_save")}
        onSignup={() => goSignupToRadar("floating_save")}
        onClose={() => { if (!isLoggedIn) trackFunnel("floating_save_close", tab); }}
      /> : null}

      {updateDialogOpen ? <ConstitutionUpdateDialog
        currentCode={event?.current_core_code}
        nextCode={computed?.core_code}
        busy={attaching}
        error={updateError}
        onUpdate={() => attachToAccount(true)}
        onKeep={() => { if (!attachingRef.current) setUpdateDialogOpen(false); }}
        onClose={() => { if (!attachingRef.current) setUpdateDialogOpen(false); }}
      /> : null}

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="pt-4 pb-3">
          {/* ★ ヒーローカード：結果を受け取った感が出るよう、白ベース＋薄い軌道円で主役感を強化 */}
          <div className="relative overflow-hidden rounded-[36px] bg-white ring-1 ring-[color-mix(in_srgb,var(--accent),white_76%)] shadow-[0_24px_52px_-22px_rgba(36,86,76,0.20)]">
            {/* 共通モチーフ：グレー円版で良かったティール円弧のサイズ・配置を基準に、塗りつぶしなしでアンバー要素を内側へ調整 */}
            <div className="pointer-events-none absolute -right-6 -top-4 h-[196px] w-[196px] opacity-74 sm:-right-5 sm:-top-3" aria-hidden="true">
              <svg viewBox="0 0 220 220" className="h-full w-full overflow-visible">
                <path
                  d="M 42 160 A 88 88 0 1 1 180 44"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  opacity="0.28"
                />
                <path
                  d="M 124 40 A 71 71 0 0 1 182 108"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="5.4"
                  strokeLinecap="round"
                  opacity="0.68"
                />
                <path
                  d="M 92 168 A 68 68 0 0 0 160 162"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.14"
                />
                <circle cx="152" cy="128" r="6.0" fill="var(--accent)" opacity="0.40" />
                <circle cx="165" cy="58" r="6.4" fill="var(--gold)" opacity="0.76" />
              </svg>
            </div>
            <div className="pointer-events-none absolute left-[-54px] bottom-[-62px] h-[150px] w-[150px] rounded-full bg-[color-mix(in_srgb,var(--mint),white_64%)] opacity-36" aria-hidden="true" />
            
            <div className="relative z-10 px-6 pt-8 pb-8 sm:px-8">
              
              {/* お困りの不調はバッジ化して邪魔にならないように */}
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.86)] px-3.5 py-1.5 ring-1 ring-[color-mix(in_srgb,var(--accent),white_76%)] shadow-sm backdrop-blur-md">
                  <span className="text-[12px] font-extrabold text-slate-500">
                    {event?.is_current ? "現在の不調" : "チェック時の不調"}：{symptomLabel}{symptomChanged ? `（チェック時：${diagnosisSymptomLabel}）` : ""}
                  </span>
                </div>
              </div>

              {/* 体質の軸を堂々と表示 */}
              <div className="flex flex-col items-center text-center">
                <div className="text-[12px] font-black uppercase tracking-widest text-[var(--accent-ink)]/72">
                  体質トリセツ
                </div>
                <div className="mt-2 text-[34px] font-black tracking-tight text-slate-900 leading-[1.12]">
                  {core?.title || "—"}
                </div>
                {core?.short ? (
                  <div className="mt-3">
                    <span className="inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-[var(--accent-ink)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--accent),white_70%)] shadow-sm">
                      {core.short}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-7 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <div className="shrink-0">
                  <div className="grid h-[138px] w-[138px] place-items-center overflow-hidden rounded-[28px] bg-white p-2 ring-1 ring-[color-mix(in_srgb,var(--accent),white_74%)] shadow-[0_16px_34px_-24px_rgba(36,86,76,0.38)] transition-transform hover:scale-105">
                    <CoreIllust
                      code={computed?.core_code}
                      title={core?.title || "体質タイプ"}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                <div className="w-full rounded-[26px] bg-[color-mix(in_srgb,var(--mint),white_64%)] px-4 py-4 text-center text-[14px] font-bold leading-relaxed text-slate-600 ring-1 ring-[color-mix(in_srgb,var(--accent),white_80%)] sm:text-left">
                  {core?.tcm_hint || ""}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div ref={tabStartRef} aria-hidden="true" />
      {needsConfirmation ? <section data-result-adoption-notice className="mx-auto mb-4 w-[calc(100%-2rem)] max-w-[408px] rounded-[22px] border border-[#E9DEC5] bg-[#FFFBF2] px-4 pb-3 pt-4 shadow-[0_10px_26px_-24px_rgba(102,80,40,0.28)]">
        <p className="text-[13px] font-bold leading-6 text-[#806539]">{isAttached ? "この結果は履歴に保存済みです。" : "この結果をアカウントに保存できます。"}</p>
        <p className="mt-1 text-[13px] font-medium leading-6 text-[#806539]">予報・ケアに反映するかを選べます。</p>
        <Button disabled={attaching} onClick={requestResultAdoption} className="mt-3 w-full !rounded-[15px] !text-[14px]">この結果を反映する</Button>
        <button type="button" disabled={attaching} onClick={() => router.push("/radar")} className="mx-auto mt-1 block min-h-[44px] px-2 text-[12px] font-bold text-[#6D7368] underline underline-offset-4 disabled:opacity-50">反映中のトリセツで予報へ</button>
      </section> : event?.is_current ? <p role="status" className="mx-auto mb-3 w-[calc(100%-2rem)] max-w-[408px] rounded-[18px] bg-[#EEF7F1] px-4 py-3 text-[13px] font-bold leading-6 text-[#426758]">{appliedHere ? "この結果を予報・ケアに反映しました。" : "このトリセツを予報・ケアに反映中です。"}</p> : null}
      <SegmentedTabs value={tab} onChange={changeTab} />

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="mt-3 space-y-6 pb-[calc(env(safe-area-inset-bottom)+128px)]">
          {tab === "overview" ? (
            <>
              <Card>
                <CardHeader icon={<IconAnalysis />} title="見立ての要点" sub="整えポイント・張りやすい場所" />
                
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

                  {/* 体のラインは体質判定と分離し、結果後に任意登録する。 */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <IconBody className="h-5 w-5 text-violet-600" />
                      <h3 className="text-[16px] font-black text-slate-900">負担が出やすい体のライン</h3>
                    </div>
                    <div className="rounded-[24px] bg-slate-50 ring-1 ring-slate-100 p-5 space-y-5">
                      {meridianPrimary ? (
                        <MeridianPanelContent line={{ ...meridianPrimary, code: computed?.primary_meridian }} tone="violet" />
                      ) : (
                        <div>
                          <div className="text-[14px] font-black text-slate-800">体のラインはまだ確認していません</div>
                          <div className="mt-2 text-[13px] font-bold leading-6 text-slate-500">
                            体質判定とは別の任意項目です。負担が出やすい動きを選ぶと、ほぐすケアの場所選びに使います。
                          </div>
                        </div>
                      )}
                      
                      {meridianSecondary && (
                        <>
                          <div className="h-px w-full bg-slate-200/60" />
                          <MeridianPanelContent line={{ ...meridianSecondary, code: computed?.secondary_meridian }} tone="teal" />
                        </>
                      )}

                      {!bodyLineOpen ? (
                        <button
                          type="button"
                          onClick={() => setBodyLineOpen(true)}
                          className="w-full rounded-[18px] bg-white px-4 py-3 text-[13px] font-black text-[var(--accent-ink)] ring-1 ring-[color-mix(in_srgb,var(--accent),white_72%)]"
                        >
                          {meridianPrimary ? "体のラインを変更する" : "体のラインも確認する"}
                        </button>
                      ) : (
                        <div className="space-y-5 rounded-[20px] bg-white p-4 ring-1 ring-slate-200">
                          <div>
                            <div className="text-[13px] font-black text-slate-800">一番、張りや違和感が出やすい動き</div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {[...BODY_LINE_OPTIONS, { value: "none", label: "特にない" }].map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    setBodyLinePrimary(option.value);
                                    if (option.value === "none" || option.value === bodyLineSecondary) setBodyLineSecondary("none");
                                  }}
                                  className={[
                                    "rounded-[15px] px-3 py-3 text-left text-[12px] font-extrabold ring-1",
                                    bodyLinePrimary === option.value
                                      ? "bg-[color-mix(in_srgb,var(--mint),white_66%)] text-[var(--accent-ink)] ring-[var(--accent)]"
                                      : "bg-white text-slate-650 ring-slate-200",
                                  ].join(" ")}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {bodyLinePrimary !== "none" ? (
                            <div>
                              <div className="text-[13px] font-black text-slate-800">次に気になる動き（任意）</div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {[...BODY_LINE_OPTIONS.filter((option) => option.value !== bodyLinePrimary), { value: "none", label: "選ばない" }].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setBodyLineSecondary(option.value)}
                                    className={[
                                      "rounded-[15px] px-3 py-3 text-left text-[12px] font-extrabold ring-1",
                                      bodyLineSecondary === option.value
                                        ? "bg-[color-mix(in_srgb,var(--mint),white_66%)] text-[var(--accent-ink)] ring-[var(--accent)]"
                                        : "bg-white text-slate-650 ring-slate-200",
                                    ].join(" ")}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setBodyLineOpen(false)}
                              className="flex-1 rounded-[16px] bg-slate-100 px-3 py-3 text-[12px] font-black text-slate-600"
                            >
                              閉じる
                            </button>
                            <button
                              type="button"
                              onClick={saveBodyLines}
                              disabled={bodyLineSaving}
                              className="flex-[1.5] rounded-[16px] bg-[var(--accent)] px-3 py-3 text-[12px] font-black text-white disabled:opacity-50"
                            >
                              {bodyLineSaving ? "保存中…" : "選択内容を保存"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </Card>

              <Card>
                <CardHeader icon={<IconBolt />} title="次の一歩" sub="今日・明日の予報と、その日に合うケアへ" />
                <div className="px-6 pb-8 pt-5 space-y-5">
                  <Button onClick={() => changeTab("compat")} className="w-full py-4">天気との相性を見る</Button>
                  <Button disabled={attaching} onClick={() => continueToForecast("overview_footer")} className="w-full shadow-md py-4">予報とケアを見る</Button>
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
                  <p className="mb-3 text-[12px] font-bold text-slate-500">影響を受けやすい順に並べています。</p>
                  <ol className="space-y-3">
                    {weatherCompat.items.map((item, index) => (
                      <li key={item.key} className="rounded-[24px] bg-slate-50 ring-1 ring-slate-100 p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-white ring-1 ring-slate-200 text-[var(--accent-ink)] shadow-sm">
                               <WeatherIcon triggerKey={item.key} className="h-7 w-7" />
                            </div>
                            <div className="min-w-0">
                              <div className="mb-1 flex flex-wrap items-center gap-2"><span className="inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-[var(--accent-ink)] ring-1 ring-slate-200">{index + 1}位</span><span className="text-[11px] font-bold text-[var(--accent-ink)]/80">{item.rankLabel}</span></div>
                              {/* 見切れ防止のため truncate なし */}
                              <div className="text-[16px] font-black tracking-tight text-slate-900 leading-snug">{item.label}</div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 text-[13px] leading-relaxed font-bold text-slate-600">
                          {item.body}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <IconBolt className="h-5 w-5 text-[#e2aa3b]" />
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
                  <Button onClick={() => changeTab("care")} className="w-full shadow-md py-4">整え方を見る</Button>
                </div>


                <div className="h-px w-full bg-slate-100" />

                <Button disabled={attaching} onClick={() => continueToForecast("compat_footer")} className="w-full shadow-md">予報とケアを見る</Button>
              </div>
            </Card>
          ) : null}

          {tab === "care" ? (
            <>
              <Card>
                <CardHeader icon={<IconCompass />} title="整え方" sub="あなたに合う方針と、取り入れ方の例" />
                <div className="space-y-6 px-5 pb-8 pt-6 sm:px-6">
                  <p className="text-[14px] font-bold leading-7 text-slate-700">
                    {carePreferences.summary}
                  </p>

                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <IconBolt className="h-5 w-5 text-[#e2aa3b]" />
                      <h3 className="text-[16px] font-black text-slate-900">あなたに合う{carePreferences.items.length}つの方針</h3>
                    </div>
                    <div className="space-y-3">
                      {carePreferences.items.map((item) => (
                        <CarePolicyCard key={item.key} item={item} />
                      ))}
                    </div>
                  </div>

                  {carePreferences.reasons?.length ? (
                    <details className="border-t border-slate-100 pt-3">
                      <summary className="cursor-pointer py-2 text-[13px] font-bold text-[var(--accent-ink)]">この整え方が合いやすい理由</summary>
                      <div className="mt-3 grid gap-2">
                        {carePreferences.reasons.map((reason, idx) => (
                          <div key={idx} className="rounded-[18px] bg-white px-5 py-4 text-[14px] font-bold leading-6 text-slate-700 ring-1 ring-slate-200 shadow-sm">
                            {reason}
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}

                  <ResultCareExample example={careExample} />

                  <SavePromptCard
                    isLoggedIn={isLoggedIn}
                    isAttached={isAttached}
                    isCurrent={!!event?.is_current}
                    needsConfirmation={needsConfirmation}
                    session={session}
                    attaching={attaching}
                    onSave={() => continueToForecast("care_footer")}
                    onSignup={() => goSignupToRadar("care_footer")}
                    onLogin={() => goLoginToRadar("care_footer")}
                    onRadar={() => continueToForecast("care_footer")}
                  />

                </div>
              </Card>

            </>
          ) : null}

          <ResultFeedback />
          <div className="text-center text-[12px] font-black uppercase tracking-widest text-slate-300 pb-4">
            Result ID: {id}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
