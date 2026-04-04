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
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-black/10 border-t-[var(--accent)]" />
              <div>
                <div className="text-base font-bold text-slate-900">結果を読み込み中…</div>
                <div className="mt-1 text-xs text-slate-500">少し待ってください。</div>
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
        "rounded-[32px] bg-white shadow-[0_16px_32px_-16px_rgba(0,0,0,0.06)] ring-1 ring-[var(--ring)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

/**
 * 改良版 SoftPanel:
 * 垂直アクセントを中央から浮かせることで「インデックス感」を出し、
 * 背景にほんの少しのトーンを乗せて情報のまとまりを強化
 */
function SoftPanel({ tone = "mint", title, icon, children }) {
  const tones = {
    mint: {
      wrap: "bg-[color-mix(in_srgb,var(--mint),white_94%)]",
      bar: "bg-[var(--accent)]",
      title: "text-[var(--accent-ink)]",
      iconBg: "bg-white text-[var(--accent-ink)]",
    },
    violet: {
      wrap: "bg-[#f8f7ff]",
      bar: "bg-[#7c3aed]",
      title: "text-[#4c1d95]",
      iconBg: "bg-white text-[#7c3aed]",
    },
    teal: {
      wrap: "bg-[#f0fdfa]",
      bar: "bg-[#0d9488]",
      title: "text-[#134e4a]",
      iconBg: "bg-white text-[#0d9488]",
    },
    amber: {
      wrap: "bg-[#fffbeb]",
      bar: "bg-[#d97706]",
      title: "text-[#78350f]",
      iconBg: "bg-white text-[#d97706]",
    },
  };
  const t = tones[tone] || tones.mint;

  return (
    <div className={`relative rounded-[28px] ${t.wrap} ring-1 ring-inset ring-slate-200/40 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md`}>
      {/* 垂直フラッグをピル形状に変更し、上下を浮かせて洗練 */}
      <div className={`absolute left-0 top-7 bottom-7 w-1.5 rounded-r-full ${t.bar} opacity-90`} />
      <div className="p-6 pl-7">
        <div className="flex items-center gap-3">
          {icon ? (
            <div className={`grid h-9 w-9 place-items-center rounded-[12px] ring-1 ring-black/5 shadow-sm ${t.iconBg}`}>
              {icon}
            </div>
          ) : null}
          <div className={`text-[16px] font-black tracking-tight ${t.title}`}>{title}</div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function MeridianPanelContent({ line, tone = "violet" }) {
  const toneClass = {
    violet: "text-[#6d28d9]",
    teal: "text-[#0f766e]",
    mint: "text-[var(--accent)]",
  };

  if (!line) {
    return <div className="text-[13px] font-bold text-slate-500">今回は強い偏りなし</div>;
  }

  return (
    <div className="flex items-start gap-5">
      <div className="shrink-0 pt-0.5">
        <div className="grid h-[72px] w-[72px] place-items-center rounded-[20px] bg-white ring-1 ring-black/5 shadow-sm overflow-hidden">
          <MeridianIllust code={line.code} size="lg" className={toneClass[tone] || toneClass.violet} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-black tracking-tight text-slate-900 leading-tight">{line.title}</div>
        <div className="mt-1.5 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
           {line.body_area}
        </div>
        <div className="mt-2 text-[12px] font-bold text-slate-400 leading-relaxed">
          関連：{line.meridians.join("・")}
        </div>
        <div className="mt-2.5 text-[13px] font-bold leading-relaxed text-slate-700">
          {line.organs_hint}
        </div>
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
                  "flex-1 h-[34px] rounded-full text-[13px] font-extrabold tracking-tight transition-all duration-200",
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
      case "qi_stagnation": scores.pressure_down += 0.14; scores.pressure_up += 0.08; scores.heat += 0.06; scores.damp += 0.04; break;
      case "qi_deficiency": scores.pressure_down += 0.1; scores.cold += 0.14; scores.damp += 0.1; break;
      case "blood_deficiency": scores.cold += 0.12; scores.dry += 0.1; scores.pressure_down += 0.06; break;
      case "blood_stasis": scores.pressure_down += 0.1; scores.pressure_up += 0.04; scores.cold += 0.08; scores.damp += 0.05; break;
      case "fluid_damp": scores.damp += 0.22; scores.cold += 0.06; scores.pressure_down += 0.04; break;
      case "fluid_deficiency": scores.dry += 0.22; scores.heat += 0.16; scores.pressure_up += 0.05; break;
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
  if (key === "pressure_down") return symptomKey === "headache" ? "気圧が下がり外圧が緩む日に、体内の膨張感が強まりやすく、巡りの詰まりから頭痛につながりやすくなります。" : "外圧が緩む日に、体内の圧力が相対的に高まり、緊張や巡りの詰まりが出やすくなります。";
  if (key === "pressure_up") return "外からの圧力が強まり、体がギュッと締め付けられる方向です。無理に詰め込まず、少しゆるめる意識が合います。";
  if (key === "cold") return "冷え込む日は、血管や筋肉が縮こまり、支える余力が削れやすく、こわばりやだるさとして出やすい方向です。";
  if (key === "heat") return "気温が上がる日は、熱がこもりやすくのぼせ気味になり、上半身の張りにつながりやすい方向です。";
  if (key === "damp") return "湿っぽい日は、水分が停滞して重だるさやむくみ感が出やすく、体の軽さを保ちにくい方向です。";
  if (key === "dry") return "乾燥しやすい日は、潤い不足が強まり、目・喉・皮膚の乾きや、疲れが残りやすい方向です。";
  return "この方向の天気変化で体調が揺れやすい傾向があります。";
}

function buildCompatIntro({ core, subLabels, symptomKey }) {
  const subShorts = Array.isArray(subLabels) ? subLabels.map((s) => s.short).filter(Boolean) : [];
  const subText = subShorts.length ? subShorts.join("・") : "大きな偏りなし";
  return `${core?.title || "今回の体質"}は、${subText}の傾向が重なることで、天気の変化を受けた時の崩れ方に特徴が出やすいタイプです。`;
}

function buildLikelySigns({ symptomKey, subCodes }) {
  if (symptomKey === "headache") return ["首肩〜こめかみが張ってくる", "頭が重い・すっきりしない", "朝の立ち上がりが重い"];
  return ["だるさが出る", "こわばりや重さが残る", "切り替えにくくなる"];
}

function buildRadarBridge({ symptomKey }) {
  return `未病レーダーでは、その日の天気の変化とあなたの体質を組み合わせて、崩れやすさを先回りして予報します。`;
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

  const computed = event?.computed || {};
  const answers = event?.answers || {};
  const symptomKey = answers?.symptom_focus || event?.symptom_focus || "fatigue";
  const symptomLabel = SYMPTOM_LABELS[symptomKey] || "だるさ・疲労";
  const core = getCoreLabel(computed?.core_code);
  const subLabels = getSubLabels(computed?.sub_labels);
  const meridianPrimary = getMeridianLine(computed?.primary_meridian);
  const meridianSecondary = getMeridianLine(computed?.secondary_meridian);
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
      if (!res.ok) throw new Error("保存に失敗しました");
      router.push(`/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`);
    } catch (e) {
      setToast(e?.message || String(e));
      setTimeout(() => setToast(""), 2500);
    } finally {
      setAttaching(false);
    }
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
        <div className="px-5 pt-10">
          <div className="rounded-[32px] bg-white p-8 ring-1 ring-[var(--ring)] flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[var(--accent)]" />
            <div className="text-[15px] font-black text-slate-900">結果を読み込み中…</div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="体質チェック結果" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-[100] w-[92%] max-w-md -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3.5 text-center text-sm font-black text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="pt-4 pb-3">
          <div className="relative rounded-[32px] bg-white ring-1 ring-[var(--ring)] shadow-[0_20px_40px_-16px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[140px] bg-gradient-to-b from-[color-mix(in_srgb,var(--mint),white_40%)] to-white" />
            
            <div className="relative z-10 px-6 pt-7 pb-6">
              <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/60">
                あなたのお悩み
              </div>
              <div className="mt-1 text-[28px] font-black tracking-tighter text-slate-900 leading-tight">
                {symptomLabel}
              </div>
              <div className="mt-2 text-[11px] font-extrabold text-slate-400">
                作成日：{event.created_at ? new Date(event.created_at).toLocaleDateString("ja-JP") : "—"}
              </div>
            </div>

            <div className="relative z-10 px-5 pb-5">
              <div className="rounded-[24px] bg-white/90 backdrop-blur-md ring-1 ring-inset ring-slate-100 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      体質の軸
                    </div>
                    <div className="mt-1 text-[24px] font-black tracking-tight text-slate-900 leading-tight">
                      {core?.title || "—"}
                    </div>
                    {core?.short ? (
                      <div className="mt-3">
                        <span className="inline-flex items-center rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-inset ring-slate-200/50 shadow-sm">
                          {core.short}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    <div className="grid h-[92px] w-[92px] place-items-center overflow-hidden rounded-[22px] bg-white ring-1 ring-[var(--ring)] shadow-sm">
                      <CoreIllust
                        code={computed?.core_code}
                        className="h-full w-full scale-[1.3] translate-y-1.5"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 text-[13px] font-bold leading-relaxed text-slate-600">
                  {core?.tcm_hint || ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SegmentedTabs value={tab} onChange={setTab} />

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-6 pb-12 mt-3">
          {tab === "overview" ? (
            <>
              <Card>
                <CardHeader icon={<IconAnalysis />} title="詳しい見立て" sub="専門的な視点からの分析" />
                <div className="px-6 pb-8 pt-6 space-y-5">
                  
                  {/* 整えポイント: Amberトーン */}
                  <SoftPanel tone="amber" title="整えポイント" icon={<IconMemo />}>
                    {subLabels?.length ? (
                      <div className="space-y-3.5">
                        {subLabels.map((s) => (
                          <div key={s.code || s.title} className="rounded-[22px] bg-white/60 ring-1 ring-inset ring-slate-200/30 p-4 shadow-sm transition-transform hover:scale-[1.01]">
                            <div className="flex gap-4">
                              <div className="shrink-0 pt-0.5 text-[var(--accent)]">
                                <SubIllust code={s.code} size="md" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[15px] font-black tracking-tight text-slate-900">{s.title}</div>
                                <div className="mt-1.5 text-[12px] leading-relaxed font-bold text-slate-600">{s.action_hint}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[13px] font-bold text-slate-500 text-center py-4 bg-slate-50/50 rounded-2xl">
                        バランスは非常に良好です。
                      </div>
                    )}
                  </SoftPanel>

                  {/* 張りやすい場所（主）: Violetトーン */}
                  <SoftPanel tone="violet" title="体の張りやすい場所（主）" icon={<IconBody />}>
                    <MeridianPanelContent line={meridianPrimary ? { ...meridianPrimary, code: computed?.primary_meridian } : null} tone="violet" />
                  </SoftPanel>

                  {/* 張りやすい場所（副）: Tealトーン */}
                  {meridianSecondary && (
                    <SoftPanel tone="teal" title="体の張りやすい場所（副）" icon={<IconBody />}>
                      <MeridianPanelContent line={{ ...meridianSecondary, code: computed?.secondary_meridian }} tone="teal" />
                    </SoftPanel>
                  )}
                </div>
              </Card>

              {/* 保存 / 次の一歩 */}
              <Card className="bg-slate-900 text-white border-none shadow-xl">
                 <CardHeader icon={<IconBolt className="text-[var(--accent)]" />} title="次の一歩" sub="保存して毎日の予報へ" />
                 <div className="px-6 pb-8 pt-4">
                    {isLoggedIn ? (
                        <div className="space-y-4">
                           <div className="rounded-[20px] bg-white/10 p-5 ring-1 ring-white/10">
                              <div className="text-[11px] font-black uppercase tracking-widest text-white/50">ログイン中</div>
                              <div className="mt-1 text-[15px] font-black">{session.user?.email}</div>
                           </div>
                           {isAttached ? (
                             <Button onClick={() => router.push("/radar")} className="w-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-lg py-4">
                               今日の予報と対策へ ✅
                             </Button>
                           ) : (
                             <Button onClick={() => attachToAccount(false)} disabled={attaching} className="w-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-lg py-4">
                               {attaching ? "保存中…" : "結果を保存して移動する"}
                             </Button>
                           )}
                        </div>
                    ) : (
                        <div className="space-y-5">
                           <div className="text-[14px] font-black leading-relaxed">
                              無料で結果を保存して、毎日の「体調予報」と「先回りケア」を確認しましょう。
                           </div>
                           <div className="grid gap-3">
                              <Button onClick={goSignupToRadar} className="w-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-lg py-4">
                                無料で保存して予報を見る
                              </Button>
                              <Button variant="ghost" onClick={() => router.push("/check")} className="text-white/60 hover:text-white">
                                もう一度チェックし直す
                              </Button>
                           </div>
                        </div>
                    )}
                 </div>
              </Card>
            </>
          ) : null}

          {/* 天気との相性タブ */}
          {tab === "compat" ? (
            <Card>
              <CardHeader icon={<IconCloud />} title="天気との相性" sub="気象変化による崩れやすさの傾向" />
              <div className="px-6 pb-10 pt-6 space-y-6">
                <div className="text-[14px] leading-7 font-bold text-slate-700 bg-slate-50 p-6 rounded-[28px] ring-1 ring-inset ring-slate-100 shadow-sm">
                  {weatherCompat.intro}
                </div>

                <div className="space-y-4">
                  {weatherCompat.items.map((item) => (
                    <div key={item.key} className="rounded-[28px] bg-white ring-1 ring-slate-200 p-6 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-4 mb-4">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-slate-50 ring-1 ring-slate-100 text-[var(--accent-ink)] shadow-sm">
                             <WeatherIcon triggerKey={item.key} className="h-7 w-7" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[16px] font-black tracking-tight text-slate-900 truncate">{item.label}</div>
                            <div className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">{item.rankLabel}</div>
                          </div>
                      </div>
                      <div className="text-[13px] leading-7 font-bold text-slate-600">{item.body}</div>
                    </div>
                  ))}
                </div>

                <SoftPanel tone="amber" title="出やすいサイン" icon={<IconBolt />}>
                  <ul className="grid gap-3">
                    {weatherCompat.signs.map((s, idx) => (
                      <li key={idx} className="flex items-center gap-3 rounded-[16px] bg-white px-5 py-3.5 text-[14px] font-black text-slate-700 ring-1 ring-inset ring-slate-100 shadow-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </SoftPanel>

                <div className="rounded-[28px] bg-[color-mix(in_srgb,var(--mint),white_90%)] p-6 ring-1 ring-[var(--ring)] shadow-inner">
                   <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/60">未病レーダーができること</div>
                   <div className="mt-2 text-[14px] leading-7 font-bold text-slate-700">{weatherCompat.radarBridge}</div>
                   <Button onClick={() => setTab("save")} className="mt-6 w-full shadow-lg">保存して予報へ進む</Button>
                </div>
              </div>
            </Card>
          ) : null}

          {/* 保存タブ (fallback) */}
          {tab === "save" && (
            <Card>
              <CardHeader icon={<IconBolt />} title="結果を保存する" sub="今後の予報精度が向上します" />
              <div className="px-6 pb-10 pt-6 space-y-6 text-center">
                <div className="text-[14px] font-bold text-slate-600 leading-relaxed px-2">
                  アカウントを作成して保存すると、毎日の「体調予報」と「先回りケア」を無料で確認できるようになります。
                </div>
                <div className="grid gap-3">
                   <Button onClick={goSignupToRadar} className="w-full shadow-lg py-4">無料で保存して予報を見る</Button>
                   <Button variant="ghost" onClick={() => router.push("/check")} className="w-full">もう一度チェックし直す</Button>
                </div>
              </div>
            </Card>
          )}

          <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-300 opacity-50 pb-8">
            Diagnostic ID: {id}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
