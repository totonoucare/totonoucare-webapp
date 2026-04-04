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

// ★ 追加：天気アイコン
import {
  IconPressureUp,
  IconPressureDown,
  IconTempUp,
  IconTempDown,
  IconHumidUp,
  IconHumidDown,
} from "@/components/illust/icons/weather";

// ✅ Next.js の useSearchParams 対策
export default function ResultPageWrapper({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-app">
          <div className="mx-auto w-full max-w-[440px] px-4 pt-10">
            <div className="rounded-[22px] bg-[var(--panel)] p-5 shadow-sm ring-1 ring-[var(--ring)]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
                <div>
                  <div className="text-base font-bold text-slate-900">結果を読み込み中…</div>
                  <div className="mt-1 text-xs text-slate-500">少し待ってください。</div>
                </div>
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
 * UI Components (Refined)
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
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_30%)] shadow-sm ring-1 ring-[var(--ring)] text-[var(--accent-ink)]">
            {icon}
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="text-[19px] font-black tracking-tight text-slate-900 leading-tight">{title}</div>
            {sub ? <div className="mt-1 text-[12px] font-bold text-slate-500">{sub}</div> : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-5 h-px w-full bg-slate-100" />
    </div>
  );
}

function SoftPanel({ tone = "mint", title, icon, children }) {
  const tones = {
    mint: {
      wrap: "bg-white",
      bar: "bg-[var(--accent)]",
      title: "text-[var(--accent-ink)]",
      iconBg: "bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)]",
    },
    violet: {
      wrap: "bg-white",
      bar: "bg-[#6d5bd0]",
      title: "text-[#3b2f86]",
      iconBg: "bg-[#ede9fe] text-[#6d5bd0]",
    },
    teal: {
      wrap: "bg-white",
      bar: "bg-[#0f766e]",
      title: "text-[#115e59]",
      iconBg: "bg-[#ccfbf1] text-[#0f766e]",
    },
    amber: {
      wrap: "bg-white",
      bar: "bg-[#b45309]",
      title: "text-[#92400e]",
      iconBg: "bg-[#fef3c7] text-[#b45309]",
    },
  };
  const t = tones[tone] || tones.mint;

  return (
    <div className={`relative rounded-[24px] ${t.wrap} ring-1 ring-[var(--ring)] overflow-hidden shadow-sm`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${t.bar}`} />
      <div className="p-5 pl-6">
        <div className="flex items-center gap-3">
          {icon ? (
            <div className={`grid h-8 w-8 place-items-center rounded-[10px] ${t.iconBg}`}>
              {icon}
            </div>
          ) : null}
          <div className={`text-[15px] font-extrabold tracking-tight ${t.title}`}>{title}</div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function MeridianPanelContent({ line, tone = "violet" }) {
  const toneClass = {
    violet: "text-[#5b4bb7]",
    teal: "text-[#0f766e]",
    mint: "text-[var(--accent)]",
  };

  if (!line) {
    return <div className="text-[13px] font-bold text-slate-500">今回は強い偏りなし</div>;
  }

  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <div className="grid h-16 w-16 place-items-center rounded-[16px] bg-slate-50 ring-1 ring-[var(--ring)] overflow-hidden">
          <MeridianIllust code={line.code} size="lg" className={toneClass[tone] || toneClass.violet} />
        </div>
      </div>
      <div className="min-w-0 py-0.5">
        <div className="text-[15px] font-extrabold text-slate-900">{line.title}</div>
        <div className="mt-1 text-[11px] font-extrabold text-slate-500">
          {line.body_area}（{line.meridians.join("・")}）
        </div>
        <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">{line.organs_hint}</div>
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
    <div className="sticky top-[60px] z-20 bg-app/90 backdrop-blur-md supports-[backdrop-filter]:bg-app/70 py-3">
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
                  "flex-1 h-[34px] rounded-full text-[13px] font-black tracking-tight transition-all duration-200",
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
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

// ★ 追加：キーからアイコンを取得するヘルパー
function getWeatherTriggerIcon(key, className) {
  switch (key) {
    case "pressure_up": return <IconPressureUp className={className} />;
    case "pressure_down": return <IconPressureDown className={className} />;
    case "heat": return <IconTempUp className={className} />;
    case "cold": return <IconTempDown className={className} />;
    case "damp": return <IconHumidUp className={className} />;
    case "dry": return <IconHumidDown className={className} />;
    default: return <IconPressureDown className={className} />;
  }
}

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

  const thermoAnswer = answers?.thermo || answers?.cold_heat || "neutral";

  const scores = {
    pressure_down: 0,
    pressure_up: 0,
    cold: 0,
    heat: 0,
    damp: 0,
    dry: 0,
  };

  for (const label of subCodes) {
    switch (label) {
      case "qi_stagnation":
        scores.pressure_down += 0.14; scores.pressure_up += 0.08; scores.heat += 0.06; scores.damp += 0.04; break;
      case "qi_deficiency":
        scores.pressure_down += 0.1; scores.cold += 0.14; scores.damp += 0.1; break;
      case "blood_deficiency":
        scores.cold += 0.12; scores.dry += 0.1; scores.pressure_down += 0.06; break;
      case "blood_stasis":
        scores.pressure_down += 0.1; scores.pressure_up += 0.04; scores.cold += 0.08; scores.damp += 0.05; break;
      case "fluid_damp":
        scores.damp += 0.22; scores.cold += 0.06; scores.pressure_down += 0.04; break;
      case "fluid_deficiency":
        scores.dry += 0.22; scores.heat += 0.16; scores.pressure_up += 0.05; break;
      default: break;
    }
  }

  if (coreCode.includes("batt_small")) { for (const k of Object.keys(scores)) scores[k] += 0.08; }
  if (coreCode.includes("batt_large")) { for (const k of Object.keys(scores)) scores[k] -= 0.03; }
  if (coreCode.startsWith("accel")) { scores.pressure_down += 0.06; scores.pressure_up += 0.05; scores.heat += 0.05; }
  if (coreCode.startsWith("brake")) { scores.cold += 0.08; scores.damp += 0.1; scores.pressure_down += 0.03; }

  if (thermoAnswer === "heat") scores.heat += 0.08;
  if (thermoAnswer === "cold") scores.cold += 0.08;

  if (envVectors.includes("pressure_shift")) { scores.pressure_down += 0.12; scores.pressure_up += 0.12; }
  if (envVectors.includes("temp_swing")) { scores.cold += 0.1; scores.heat += 0.1; }
  if (envVectors.includes("humidity_up")) { scores.damp += 0.12; }
  if (envVectors.includes("dryness_up")) { scores.dry += 0.1; }
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

  if (key === "pressure_down") return symptomKey === "headache" ? "変化に押される日に、首肩やこめかみの緊張が強まりやすく、巡りの詰まりから頭痛につながりやすくなります。" : "変化に押される日に、切り替えがうまくいかず、緊張や巡りの詰まりが出やすくなります。";
  if (key === "pressure_up") return "張りつめた感じや、頭や上半身の詰まりが出やすい方向です。無理に詰め込まず、少しゆるめる意識が合います。";
  if (key === "cold") return (hasBloodDef || isBattSmall) ? "冷え込む日は、支える余力が削れやすく、首肩のこわばりや消耗として出やすい方向です。" : "冷え込む日は、体が縮こまりやすく、こわばりやだるさとして出やすい方向です。";
  if (key === "heat") return (hasFluidDef || isAccel) ? "気温が上がる日は、熱や刺激がこもりやすく、上半身の張りやのぼせ感につながりやすい方向です。" : "暑さや熱こもりで、詰まりや疲れが出やすい方向です。";
  if (key === "damp") {
    if (symptomKey === "headache") return "湿っぽい日は、重さが加わって巡りの悪さが増し、頭や体が重く感じやすくなります。";
    if (hasFluidDamp) return "湿っぽい日は、重だるさやむくみ感が出やすく、体の軽さを保ちにくい方向です。";
    return "湿っぽい日は、重さが増して動き出しにくくなりやすい方向です。";
  }
  if (key === "dry") return (hasFluidDef || hasBloodDef) ? "乾燥しやすい日は、潤い不足が強まり、目・喉・皮膚や頭の疲れとして出やすい方向です。" : "乾燥しやすい日は、こわばりや疲れが残りやすい方向です。";
  return "この方向の天気変化で体調が揺れやすい傾向があります。";
}

function buildCompatIntro({ core, subLabels, symptomKey }) {
  const subShorts = Array.isArray(subLabels) ? subLabels.map((s) => s.short).filter(Boolean) : [];
  const subText = subShorts.length ? subShorts.join("・") : "大きな偏りなし";
  return `${core?.title || "今回の体質"}は、${subText}の傾向が重なることで、天気の変化を受けた時の崩れ方に特徴が出やすいタイプです。特に「${SYMPTOM_LABELS[symptomKey] || symptomKey}」では、外の変化が首肩・頭まわりや全身の重さとして現れやすくなります。`;
}

function buildLikelySigns({ symptomKey, subCodes }) {
  if (symptomKey === "headache") return ["首肩〜こめかみが張ってくる", "頭が重い・すっきりしない", "呼吸が浅い感じになる", "朝の立ち上がりが重い"];
  if (symptomKey === "sleep") return ["夜に切り替えにくい", "頭や体が緩みにくい", "眠っても疲れが残る"];
  if (symptomKey === "mood") return ["気分が詰まる", "切り替えに時間がかかる", "重さやだるさが先に来る"];
  if (subCodes.includes("fluid_damp")) return ["体が重い", "朝が動きにくい", "むくみっぽさが出る"];
  return ["だるさが出る", "こわばりや重さが残る", "切り替えにくくなる"];
}

function buildRadarBridge({ symptomKey }) {
  const symptomText = SYMPTOM_LABELS[symptomKey] || symptomKey;
  return `未病レーダーでは、その日の天気の変化とあなたの体質を組み合わせて、「今日はどの要素が響きやすいか」「日中のどの時間帯に気をつけたいか」「${symptomText}に対してどんなツボや食養生が合いやすいか」を先回りして見られます。`;
}

/* -----------------------------
 * Main Page
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
    if (attachAfterLogin) return "/check";
    return "/check";
  }, [from, attachAfterLogin]);

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
    let mounted = true;
    (async () => {
      try {
        setLoadingEvent(true);
        const res = await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(id)}`);
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
  }, [id]);

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
    router.push(`/login?result=${encodeURIComponent(id)}&next=${encodeURIComponent(`/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`)}`);
  }

  const headerLeft = (
    <button
      type="button"
      onClick={() => router.push(backHref)}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
    >
      ← 戻る
    </button>
  );

  const headerRight = (
    <button
      type="button"
      onClick={() => router.push("/")}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
    >
      ホーム
    </button>
  );

  if (loadingEvent) {
    return (
      <AppShell title="診断結果" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
        <Module>
          <ModuleHeader icon={<IconResult />} title="結果を読み込み中…" sub="少し待ってください" />
          <div className="px-5 pb-6 pt-4">
            <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
                <div className="text-sm font-bold text-slate-700">読み込み中…</div>
              </div>
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
          <div className="px-5 pb-6 pt-4 space-y-4">
            <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
              <div className="text-sm leading-7 text-slate-700">
                期限切れ/削除、または保存に失敗した可能性があります。
              </div>
            </div>
            <Button onClick={() => router.push("/check")}>体質チェックをやり直す</Button>
          </div>
        </Module>
      </AppShell>
    );
  }

  return (
    <AppShell title="体質チェック結果" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
      {toast ? (
        <div className="fixed left-1/2 top-3 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-[18px] bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-lg ring-1 ring-[var(--ring)]">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="pt-4 pb-3">
          <div className="relative rounded-[32px] bg-white ring-1 ring-[var(--ring)] shadow-[0_16px_32px_-12px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[140px] bg-[color-mix(in_srgb,var(--mint),white_50%)]" />
            
            <div className="relative z-10 px-6 pt-6 pb-5">
              <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">
                あなたのお悩み
              </div>
              <div className="mt-1 text-[26px] font-black tracking-tight text-slate-900 truncate">
                {symptomLabel}
              </div>
              <div className="mt-1.5 text-[11px] font-bold text-[var(--accent-ink)]/60">
                チェック作成：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
              </div>
            </div>

            <div className="relative z-10 px-5 pb-5">
              <div className="rounded-[24px] bg-white/90 backdrop-blur-md ring-1 ring-[var(--ring)] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      あなたの体質の軸
                    </div>
                    <div className="mt-1 text-[22px] font-black tracking-tight text-slate-900 leading-[1.1]">
                      {core?.title || "—"}
                    </div>
                    {core?.short ? (
                      <div className="mt-2.5">
                        <span className="inline-flex items-center rounded-md bg-slate-50 px-2.5 py-1 text-[11px] font-extrabold text-slate-600 ring-1 ring-inset ring-slate-200/50">
                          {core.short}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    <div className="grid h-[88px] w-[88px] place-items-center overflow-hidden rounded-[20px] bg-[#fdfefc] ring-1 ring-[var(--ring)] shadow-sm">
                      <CoreIllust
                        code={computed?.core_code}
                        title={core?.title || "体質タイプ"}
                        className="h-full w-full scale-[1.25] translate-y-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[13px] font-bold leading-6 text-slate-600">
                  {core?.tcm_hint || ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SegmentedTabs value={tab} onChange={setTab} />

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-6 pb-6 mt-3">
          {tab === "overview" ? (
            <>
              <Card>
                <CardHeader icon={<IconAnalysis />} title="詳しい見立て" sub="整えポイント・張りやすい場所" />
                <div className="px-6 pb-7 pt-5 space-y-4">
                  <SoftPanel tone="amber" title="整えポイント（最大2つ）" icon={<IconMemo />}>
                    {subLabels?.length ? (
                      <div className="space-y-3">
                        {subLabels.map((s) => (
                          <div
                            key={s.code || s.title}
                            className="rounded-[20px] bg-slate-50/50 ring-1 ring-slate-100 p-4"
                          >
                            <div className="flex gap-4">
                              <div className="shrink-0 pt-0.5">
                                <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-white ring-1 ring-[var(--ring)] shadow-sm text-[var(--accent)]">
                                  <SubIllust code={s.code} size="md" />
                                </div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[15px] font-extrabold text-slate-900">
                                  {s.title}
                                </div>
                                <div className="mt-2 text-[13px] leading-6 font-bold text-slate-600">
                                  {s.action_hint || "（ヒントなし）"}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[18px] bg-slate-50/50 ring-1 ring-slate-100 p-4 text-[13px] font-bold text-slate-600">
                        今回は強い偏りは見られませんでした（バランス良好）。
                      </div>
                    )}
                  </SoftPanel>

                  <SoftPanel tone="violet" title="体の張りやすい場所（主）" icon={<IconBody />}>
                    <MeridianPanelContent line={meridianPrimary ? { ...meridianPrimary, code: computed?.primary_meridian } : null} tone="violet" />
                  </SoftPanel>

                  <SoftPanel tone="teal" title="体の張りやすい場所（副）" icon={<IconBody />}>
                    <MeridianPanelContent line={meridianSecondary ? { ...meridianSecondary, code: computed?.secondary_meridian } : null} tone="teal" />
                  </SoftPanel>
                </div>
              </Card>

              <Card>
                <CardHeader icon={<IconBolt />} title="次の一歩" sub="保存 → 今日の予報と対策へ" />
                <div className="px-6 pb-7 pt-5 space-y-4">
                  {loadingAuth ? (
                    <div className="rounded-[20px] bg-slate-50 p-5 ring-1 ring-slate-100">
                      <div className="text-[13px] font-bold text-slate-600">ログイン状態を確認中…</div>
                    </div>
                  ) : isLoggedIn ? (
                    <>
                      <div className="rounded-[20px] bg-slate-50 p-5 ring-1 ring-slate-100">
                        <div className="text-[13px] font-bold text-slate-800">
                          ログイン中：<span className="font-extrabold">{session.user?.email}</span>
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-500">
                          今日の「予報と対策」は無料で見られます。
                        </div>
                      </div>

                      {isAttached ? (
                        <div className="rounded-[22px] bg-[#ecfdf5] p-5 ring-1 ring-[#a7f3d0]">
                          <div className="text-[14px] font-extrabold text-[#065f46]">
                            この結果は保存済みです ✅
                          </div>
                          <div className="mt-4">
                            <Button onClick={() => router.push("/radar")}>今日の予報と対策へ</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
                          <div className="text-[14px] font-extrabold text-slate-900">
                            この結果を保存して、今日の未病レーダーへ進みましょう。
                          </div>
                          <div className="mt-2 text-[11px] font-bold text-slate-600">
                            登録だけでは課金されません（無料の範囲で使えます）
                          </div>
                          <div className="mt-4">
                            <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                              {attaching ? "保存して移動中…" : "保存して、今日の予報と対策を見る（無料）"}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button variant="ghost" onClick={() => router.push("/check")}>
                          もう一度チェック
                        </Button>
                        <Button variant="ghost" onClick={() => setTab("compat")}>
                          天気との相性を見る
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_40%)] p-5 ring-1 ring-[var(--ring)]">
                        <div className="text-[15px] font-extrabold tracking-tight text-slate-900">
                          無料で保存して、今日の「予報と対策」へ。
                        </div>
                        <div className="mt-2 text-[11px] font-bold text-slate-600">
                          登録だけでは課金されません（無料の範囲で使えます）
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <Button onClick={goSignupToRadar}>
                          無料で保存して、今日の予報と対策を見る
                        </Button>
                        <Button variant="secondary" onClick={goLoginToRadar}>
                          すでに登録済みの方はこちら（ログイン）
                        </Button>
                        <Button variant="ghost" onClick={() => router.push("/check")}>
                          もう一度チェックする
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </>
          ) : null}

          {tab === "compat" ? (
            <>
              <Card>
                <CardHeader
                  icon={<IconCloud />}
                  title="天気との相性"
                  sub="体質と天気の変化が重なると、どんな崩れ方をしやすいか"
                />
                <div className="px-6 pb-7 pt-5 space-y-4">
                  <SoftPanel tone="teal" title="影響を受けやすい天気変化" icon={<IconRadar />}>
                    <div className="text-[13px] leading-7 font-bold text-slate-700">{weatherCompat.intro}</div>

                    <div className="mt-5 space-y-3">
                      {weatherCompat.items.map((item) => (
                        <div
                          key={item.key}
                          className="rounded-[18px] bg-white/80 ring-1 ring-[var(--ring)] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              {/* ★ 気象アイコンを配置 */}
                              <div className="text-[var(--accent-ink)] opacity-80">
                                {getWeatherTriggerIcon(item.key, "h-6 w-6")}
                              </div>
                              <div className="text-[14px] font-extrabold text-slate-900">{item.label}</div>
                            </div>
                            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-600 ring-1 ring-black/5 shadow-sm">
                              {item.rankLabel}
                            </div>
                          </div>
                          <div className="mt-2.5 text-[13px] leading-6 font-bold text-slate-700">{item.body}</div>
                        </div>
                      ))}
                    </div>
                  </SoftPanel>

                  <SoftPanel tone="amber" title="天気が重なると出やすいサイン" icon={<IconBolt />}>
                    <ul className="space-y-2">
                      {weatherCompat.signs.map((s, idx) => (
                        <li
                          key={`${s}-${idx}`}
                          className="rounded-[16px] bg-white/80 ring-1 ring-[var(--ring)] px-4 py-3"
                        >
                          <div className="text-[13px] font-extrabold text-slate-700">・{s}</div>
                        </li>
                      ))}
                    </ul>
                  </SoftPanel>

                  <SoftPanel tone="mint" title="未病レーダーで分かること" icon={<IconCompass />}>
                    <div className="text-[13px] leading-7 font-bold text-slate-700">{weatherCompat.radarBridge}</div>
                  </SoftPanel>

                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setTab("overview")}>
                      概要に戻る
                    </Button>
                    <Button onClick={() => setTab("save")}>保存へ進む</Button>
                  </div>
                </div>
              </Card>
            </>
          ) : null}

          {tab === "save" ? (
            <>
              <Card>
                <CardHeader
                  icon={<IconBolt />}
                  title="保存してレーダーへ"
                  sub="結果は“今後の予報”の精度に効きます"
                />
                <div className="px-6 pb-7 pt-5 space-y-4">
                  {loadingAuth ? (
                    <div className="rounded-[20px] bg-slate-50 p-5 ring-1 ring-slate-100">
                      <div className="text-[13px] font-bold text-slate-600">ログイン状態を確認中…</div>
                    </div>
                  ) : isLoggedIn ? (
                    <>
                      <div className="rounded-[22px] bg-white ring-1 ring-slate-200 p-5 shadow-sm">
                        <div className="text-[13px] font-bold text-slate-800">
                          ログイン中：<span className="font-extrabold">{session.user?.email}</span>
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-500">
                          保存すると、今日の「予報と対策」にすぐ進めます。
                        </div>
                      </div>

                      {isAttached ? (
                        <div className="rounded-[22px] bg-[#ecfdf5] p-5 ring-1 ring-[#a7f3d0]">
                          <div className="text-[14px] font-extrabold text-[#065f46]">
                            この結果は保存済みです ✅
                          </div>
                          <div className="mt-4">
                            <Button onClick={() => router.push("/radar")}>今日の予報と対策へ</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
                          <div className="text-[14px] font-extrabold text-slate-900">
                            この結果を保存しますか？
                          </div>
                          <div className="mt-2 text-[11px] font-bold text-slate-600">
                            登録だけでは課金されません（無料の範囲で使えます）
                          </div>
                          <div className="mt-4">
                            <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                              {attaching ? "保存して移動中…" : "保存して、今日の予報と対策を見る（無料）"}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button variant="ghost" onClick={() => router.push("/check")}>
                          もう一度チェックする
                        </Button>
                        <Button variant="ghost" onClick={() => setTab("compat")}>
                          天気との相性を見る
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_40%)] p-5 ring-1 ring-[var(--ring)]">
                        <div className="text-[15px] font-extrabold tracking-tight text-slate-900">
                          無料で保存して、今日の「予報と対策」へ。
                        </div>
                        <div className="mt-2 text-[11px] font-bold text-slate-600">
                          登録だけでは課金されません（無料の範囲で使えます）
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <Button onClick={goSignupToRadar}>
                          無料で保存して、今日の予報と対策を見る
                        </Button>
                        <Button variant="secondary" onClick={goLoginToRadar}>
                          すでに登録済みの方はこちら（ログイン）
                        </Button>
                        <Button variant="ghost" onClick={() => router.push("/check")}>
                          もう一度チェックする
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </>
          ) : null}

          <div className="text-center text-[10px] font-extrabold text-slate-300">ID：{id}</div>
        </div>
      </div>
    </AppShell>
  );
}
