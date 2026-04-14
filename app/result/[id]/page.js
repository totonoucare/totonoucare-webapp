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
    { key: "overview", label: "概要" },
    { key: "compat", label: "天気との相性" },
    { key: "save", label: "保存" },
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
  const envSensitivity = clamp(Number(answers?.env_sensitivity ?? 0) || 0, 0, 3);
  const envVectors = Array.isArray(answers?.env_vectors)
    ? answers.env_vectors.filter((x) => x && x !== "none")
    : [];

  const scores = {
    pressure_down: 0,
    pressure_up: 0,
    cold: 0,
    heat: 0,
    damp: 0,
    dry: 0,
  };

  // ★ personalizeForecast.js と同じロジックに完全同期 ★
  for (const label of subCodes) {
    switch (label) {
      case "qi_stagnation":
        scores.pressure_down += 0.10; 
        scores.pressure_up += 0.08; 
        scores.heat += 0.06; 
        scores.damp += 0.04; 
        break;
      case "qi_deficiency":
        scores.pressure_down += 0.10; 
        scores.cold += 0.14; 
        scores.damp += 0.10; 
        break;
      case "blood_deficiency":
        scores.cold += 0.12; 
        scores.dry += 0.10; 
        scores.pressure_down += 0.06; 
        break;
      case "blood_stasis":
        scores.pressure_down += 0.10; 
        scores.cold += 0.08; 
        scores.damp += 0.05; 
        scores.pressure_up += 0.03; 
        break;
      case "fluid_damp":
        scores.damp += 0.22; 
        scores.cold += 0.06; 
        scores.pressure_down += 0.04; 
        break;
      case "fluid_deficiency":
        scores.dry += 0.22; 
        scores.heat += 0.18; 
        scores.pressure_up += 0.05; 
        break;
      default: break;
    }
  }

  if (coreCode.includes("batt_small")) { for (const k of Object.keys(scores)) scores[k] += 0.08; }
  if (coreCode.includes("batt_large")) { for (const k of Object.keys(scores)) scores[k] -= 0.03; }
  if (coreCode.startsWith("accel")) { scores.pressure_down += 0.06; scores.pressure_up += 0.05; scores.heat += 0.05; }
  if (coreCode.startsWith("brake")) { scores.cold += 0.08; scores.damp += 0.10; scores.pressure_down += 0.03; }

  if (envVectors.includes("pressure_shift")) { scores.pressure_down += 0.12; scores.pressure_up += 0.12; }
  if (envVectors.includes("temp_swing")) { scores.cold += 0.14; scores.heat += 0.14; }
  if (envVectors.includes("humidity_up")) { scores.damp += 0.12; }
  if (envVectors.includes("dryness_up")) { scores.dry += 0.10; }
  if (envVectors.includes("wind_strong")) { scores.pressure_down += 0.03; scores.pressure_up += 0.03; }

  for (const k of Object.keys(scores)) {
    scores[k] += envSensitivity * 0.03;
    scores[k] = round2(Math.max(0, scores[k]));
  }

  const items = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key], index) => ({
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
      return "気圧が下がり外圧が緩む日に、体内の巡りが滞りやすく、下半身や全体の重だるさにつながりやすい方向です。";
    }
    return "気圧が下がり外圧が緩む日に、体内の圧力が相対的に高まり、緊張や巡りの詰まり、だるさが出やすくなります。";
  }

  if (key === "pressure_up") {
    if (symptomKey === "mood" || symptomKey === "sleep") {
      return "外からの圧力が強まり、体がギュッと締め付けられることで、リラックスしにくく切り替えが難しくなる方向です。";
    }
    return "外からの圧力が強まり、体がギュッと締め付けられる方向です。無理に詰め込まず、少しゆるめる意識が合います。";
  }

  if (key === "cold") {
    if (symptomKey === "neck_shoulder" || symptomKey === "low_back_pain") {
      return "冷え込む日は、血管や筋肉が縮こまり、首肩や腰のこわばり・痛みとして出やすい方向です。";
    }
    if (hasBloodDef || isBattSmall || symptomKey === "fatigue") {
      return "冷え込む日は、血管や筋肉が縮こまり、体を支える余力が削れやすく、消耗やだるさとして出やすい方向です。";
    }
    return "冷え込む日は、体がギュッと縮こまりやすく、こわばりやだるさとして出やすい方向です。";
  }

  if (key === "heat") {
    if (symptomKey === "headache" || symptomKey === "dizziness" || symptomKey === "sleep") {
      return "気温が上がる日は、熱がこもりやすくのぼせ気味になり、上半身の張りや睡眠の質低下につながりやすい方向です。";
    }
    if (hasFluidDef || isAccel) {
      return "気温が上がる日は、熱や刺激がこもりやすく、消耗やのぼせ感につながりやすい方向です。";
    }
    return "暑さや熱こもりで、体力が奪われてだるさや疲れが出やすい方向です。";
  }

  if (key === "damp") {
    if (symptomKey === "swelling" || symptomKey === "fatigue" || symptomKey === "headache" || symptomKey === "dizziness") {
      return "湿っぽい日は、体に余分な水分が溜まって重みが加わり、だるさやむくみ、頭の重さにつながりやすくなります。";
    }
    if (hasFluidDamp) {
      return "湿っぽい日は、水分が停滞して重だるさやむくみ感が出やすく、体の軽さを保ちにくい方向です。";
    }
    return "湿っぽい日は、重さが増して動き出しにくくなりやすい方向です。";
  }

  if (key === "dry") {
    if (hasFluidDef || hasBloodDef || symptomKey === "sleep" || symptomKey === "dizziness") {
      return "乾燥しやすい日は、潤い不足が強まり、目・喉・皮膚の乾きや、睡眠の質低下として出やすい方向です。";
    }
    return "乾燥しやすい日は、こわばりや疲れが残りやすい方向です。";
  }

  return "この方向の天気変化で体調が揺れやすい傾向があります。";
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

  const symptomKey = answers?.symptom_focus || event?.symptom_focus || "fatigue";
  const symptomLabel = useMemo(() => SYMPTOM_LABELS[symptomKey] || "だるさ・疲労", [symptomKey]);

  const core = useMemo(() => getCoreLabel(computed?.core_code), [computed?.core_code]);
  const subLabels = useMemo(() => getSubLabels(computed?.sub_labels), [computed?.sub_labels]);
  const meridianPrimary = useMemo(() => getMeridianLine(computed?.primary_meridian), [computed?.primary_meridian]);
  const meridianSecondary = useMemo(() => getMeridianLine(computed?.secondary_meridian), [computed?.secondary_meridian]);

  const isLoggedIn = !!session;
  const isAttached = !!event?.is_attached;

  const weatherCompat = useMemo(() => {
    return buildWeatherCompatibility({ answers, computed, symptomKey, core, subLabels });
  }, [answers, computed, symptomKey, core, subLabels]);

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
      <AppShell title="診断結果" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
        <Module className="border-none shadow-none">
          <ModuleHeader icon={<IconResult />} title="結果を読み込み中…" sub="少し待ってください" />
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
      <AppShell title="診断結果" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
        <Module>
          <ModuleHeader icon={<IconResult />} title="結果が見つかりません" sub="期限切れ/削除、または保存失敗の可能性" />
          <div className="px-5 pb-6 pt-4 space-y-5">
            <div className="rounded-[28px] bg-rose-50 p-6 ring-1 ring-rose-200 text-center shadow-sm">
              <div className="text-[15px] leading-relaxed text-rose-800 font-bold">
                診断結果を取得できませんでした。<br/>恐れ入りますが、再度チェックをお願いします。
              </div>
            </div>
            <Button onClick={() => router.push("/check")} className="w-full shadow-md py-4">体質チェックをやり直す</Button>
          </div>
        </Module>
      </AppShell>
    );
  }

  return (
    <AppShell title="体質チェック結果" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-[100] w-[92%] max-w-md -translate-x-1/2 rounded-full bg-slate-900/95 backdrop-blur-md px-5 py-3.5 text-[14px] font-extrabold text-white shadow-[0_16px_32px_-12px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      ) : null}

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
                    お困りの不調：{symptomLabel}
                  </span>
                </div>
              </div>

              {/* 体質の軸を堂々と表示 */}
              <div className="flex flex-col items-center text-center">
                <div className="text-[12px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">
                  あなたの体質の軸
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

      <SegmentedTabs value={tab} onChange={setTab} />

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-6 pb-8 mt-3">
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
                <CardHeader icon={<IconBolt />} title="次の一歩" sub="保存 → 今日の予報と対策へ" />
                <div className="px-6 pb-8 pt-5 space-y-5">
                  {isLoggedIn ? (
                    <>
                      <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-200 font-bold text-[13px] text-slate-700 text-center shadow-sm">
                        ログイン：{session.user?.email}
                      </div>
                      {isAttached ? (
                        <div className="rounded-[28px] bg-emerald-50 p-6 ring-1 ring-emerald-200 text-center shadow-sm">
                          <div className="text-[16px] font-black text-emerald-800">保存済み ✅</div>
                          <Button onClick={() => router.push("/radar")} className="mt-5 w-full shadow-md py-4">今日の予報と対策へ</Button>
                        </div>
                      ) : (
                        <Button onClick={() => attachToAccount(false)} disabled={attaching} className="w-full shadow-md py-4 text-[15px]">
                          {attaching ? "保存中…" : "結果を保存して予報を見る（無料）"}
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-[28px] bg-[color-mix(in_srgb,var(--mint),white_40%)] p-6 ring-1 ring-[var(--ring)] shadow-sm">
                         <div className="text-[16px] font-black tracking-tight text-slate-900">無料で保存して予報を見ましょう</div>
                         <div className="mt-2 text-[13px] font-bold text-slate-600 leading-relaxed">アカウント作成後、今日のあなたの崩れやすさをチェックできるようになります。</div>
                      </div>
                      <Button onClick={goSignupToRadar} className="w-full shadow-md py-4 text-[15px]">無料で保存して予報を見る</Button>
                      <Button variant="secondary" onClick={goLoginToRadar} className="w-full bg-white shadow-sm py-4">ログインはこちら</Button>
                    </div>
                  )}
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
                  <Button onClick={() => setTab("save")} className="w-full shadow-md py-4">保存して予報へ進む</Button>
                </div>
              </div>
            </Card>
          ) : null}

          {tab === "save" && (
            <Card>
              <CardHeader icon={<IconBolt />} title="結果を保存する" sub="今後の予報精度が向上します" />
              <div className="px-6 pb-8 pt-5 space-y-5 text-center">
                {isLoggedIn ? (
                   isAttached ? (
                     <div className="rounded-[28px] bg-emerald-50 p-6 ring-1 ring-emerald-200 shadow-sm">
                       <div className="text-[16px] font-black text-emerald-800">保存済みです ✅</div>
                       <Button onClick={() => router.push("/radar")} className="mt-5 w-full shadow-md py-4">今日の予報と対策へ</Button>
                     </div>
                   ) : (
                     <Button onClick={() => attachToAccount(false)} disabled={attaching} className="w-full shadow-[0_8px_16px_-6px_rgba(0,0,0,0.2)] py-4 text-[15px]">
                       {attaching ? "保存中…" : "この結果を保存して移動する"}
                     </Button>
                   )
                ) : (
                  <div className="space-y-5">
                    <div className="text-[13px] font-bold text-slate-600 leading-relaxed px-2">
                      アカウントを作成して保存すると、毎日の「体調予報」と「先回りケア」を無料で確認できるようになります。
                    </div>
                    <Button onClick={goSignupToRadar} className="w-full shadow-[0_8px_16px_-6px_rgba(0,0,0,0.2)] py-4 text-[15px]">無料で保存して予報を見る</Button>
                  </div>
                )}
                <div className="pt-2">
                  <Button variant="ghost" onClick={() => router.push("/check")} className="w-full py-4 text-[13px]">もう一度チェックし直す</Button>
                </div>
              </div>
            </Card>
          )}

          <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-300 pb-4">
            Result ID: {id}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
