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
 * UI Components (プレミアム・リファイン)
 * ---------------------------- */

// 子カード（Moduleの中で情報を区切るための枠）
function SubItemCard({ title, icon, children, tone = "slate" }) {
  const toneClasses = {
    slate: "bg-slate-50/50 ring-slate-100",
    amber: "bg-amber-50/40 ring-amber-100/50",
    violet: "bg-violet-50/40 ring-violet-100/50",
    teal: "bg-teal-50/40 ring-teal-100/50",
    mint: "bg-[color-mix(in_srgb,var(--mint),white_90%)] ring-[var(--ring)]",
  };

  return (
    <div className={`rounded-[24px] p-5 ring-1 ring-inset ${toneClasses[tone] || toneClasses.slate}`}>
      {title && (
        <div className="flex items-center gap-2.5 mb-4">
          {icon && <div className="text-slate-400">{icon}</div>}
          <div className="text-[14px] font-black tracking-tight text-slate-900">{title}</div>
        </div>
      )}
      {children}
    </div>
  );
}

function MeridianItem({ line, label, tone = "violet" }) {
  const toneColor = {
    violet: "text-[#6d5bd0]",
    teal: "text-[#0f766e]",
  };

  if (!line) return null;

  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <div className="grid h-16 w-16 place-items-center rounded-[18px] bg-white ring-1 ring-black/5 shadow-sm overflow-hidden">
          <MeridianIllust code={line.code} size="lg" className={toneColor[tone]} />
        </div>
      </div>
      <div className="min-w-0 pt-0.5">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</div>
        <div className="text-[16px] font-black text-slate-900 leading-tight">{line.title}</div>
        <div className="mt-1 text-[11px] font-bold text-slate-500 leading-relaxed">
          {line.body_area}
        </div>
        <div className="mt-2 text-[12px] font-medium leading-5 text-slate-600">
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

  if (key === "pressure_down") return "外気圧が下がる際、体内の膨張感が強まりやすく、巡りの詰まりから不調につながりやすい方向です。";
  if (key === "pressure_up") return "外からの圧力が強まり、体がギュッと締め付けられる方向です。無理に詰め込まず、少しゆるめる意識が合います。";
  if (key === "cold") return (hasBloodDef || isBattSmall) ? "冷え込む日は血管や筋肉が縮こまり、支える余力が削れやすく消耗として出やすい方向です。" : "冷え込む日は体がギュッと縮こまりやすく、こわばりやだるさが出やすい方向です。";
  if (key === "heat") return (hasFluidDef || isAccel) ? "気温が上がる日は熱がこもりやすくのぼせ気味になり、上半身の張りにつながりやすい方向です。" : "暑さや熱こもりで、詰まりや疲れが出やすい方向です。";
  if (key === "damp") return "湿っぽい日は、体に余分な水分が溜まって重みが加わり、巡りが滞りやすくなる方向です。";
  if (key === "dry") return "乾燥しやすい日は、潤い不足が強まり、喉や皮膚、頭の疲れとして出やすい方向です。";
  return "この方向の天気変化で体調が揺れやすい傾向があります。";
}

function buildCompatIntro({ core, subLabels, symptomKey }) {
  const subShorts = Array.isArray(subLabels) ? subLabels.map((s) => s.short).filter(Boolean) : [];
  const subText = subShorts.length ? subShorts.join("・") : "大きな偏りなし";
  return `${core?.title || "今回の体質"}は、${subText}の傾向が重なることで、天気の変化を受けた時の崩れ方に特徴が出やすいタイプです。特に「${SYMPTOM_LABELS[symptomKey] || symptomKey}」では、外の変化が首肩・頭まわりや全身の重さとして現れやすくなります。`;
}

function buildLikelySigns({ symptomKey, subCodes }) {
  if (symptomKey === "headache") return ["首肩〜こめかみが張ってくる", "頭が重い・すっきりしない", "呼吸が浅い感じになる"];
  if (symptomKey === "sleep") return ["夜に切り替えにくい", "頭や体が緩みにくい"];
  if (subCodes.includes("fluid_damp")) return ["体が重い", "朝が動きにくい", "むくみっぽさが出る"];
  return ["だるさが出る", "こわばりや重さが残る", "切り替えにくくなる"];
}

function buildRadarBridge({ symptomKey }) {
  const symptomText = SYMPTOM_LABELS[symptomKey] || symptomKey;
  return `未病レーダーでは、天気の変化と体質を組み合わせ、「どの要素が響きやすいか」「${symptomText}に対してどんなケアが合うか」を先回りして見られます。`;
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
        <Module>
          <ModuleHeader icon={<IconResult />} title="結果を読み込み中…" sub="少し待ってください" />
          <div className="px-6 pb-8 pt-4">
             <div className="h-40 animate-pulse rounded-[24px] bg-slate-100" />
          </div>
        </Module>
      </AppShell>
    );
  }

  return (
    <AppShell title="体質チェック結果" noTabs={true} headerLeft={headerLeft} headerRight={headerRight}>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      ) : null}

      {/* ヒーローエリア */}
      <div className="mx-auto w-full max-w-[440px] px-4 pt-4 pb-2">
        <div className="relative rounded-[32px] bg-white ring-1 ring-[var(--ring)] shadow-[0_16px_32px_-12px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[140px] bg-[color-mix(in_srgb,var(--mint),white_50%)]" />
          <div className="relative z-10 px-6 pt-6 pb-5">
            <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">あなたのお悩み</div>
            <div className="mt-1 text-[26px] font-black tracking-tight text-slate-900 truncate">{symptomLabel}</div>
            <div className="mt-1.5 text-[11px] font-bold text-[var(--accent-ink)]/60">
              {event.created_at ? new Date(event.created_at).toLocaleDateString("ja-JP") : "—"} 作成
            </div>
          </div>
          <div className="relative z-10 px-5 pb-5">
            <div className="rounded-[24px] bg-white/90 backdrop-blur-md ring-1 ring-[var(--ring)] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">あなたの体質の軸</div>
                  <div className="mt-1 text-[22px] font-black tracking-tight text-slate-900 leading-[1.1]">{core?.title || "—"}</div>
                  {core?.short && (
                    <div className="mt-2.5">
                      <span className="inline-flex items-center rounded-md bg-slate-50 px-2.5 py-1 text-[11px] font-extrabold text-slate-600 ring-1 ring-inset ring-slate-200/50">{core.short}</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <div className="grid h-[88px] w-[88px] place-items-center overflow-hidden rounded-[20px] bg-[#fdfefc] ring-1 ring-[var(--ring)] shadow-sm">
                    <CoreIllust code={computed?.core_code} title={core?.title} className="h-full w-full scale-[1.25] translate-y-1" />
                  </div>
                </div>
              </div>
              <div className="mt-4 text-[13px] font-bold leading-6 text-slate-600">{core?.tcm_hint}</div>
            </div>
          </div>
        </div>
      </div>

      <SegmentedTabs value={tab} onChange={setTab} />

      <div className="mx-auto w-full max-w-[440px] px-4 space-y-6 pb-12 mt-3">
        {tab === "overview" && (
          <>
            <Module>
              <ModuleHeader icon={<IconAnalysis />} title="詳しい見立て" sub="あなたの心身の状態を分析しました" />
              <div className="px-6 pb-8 pt-5 space-y-5">
                
                {/* 1. 整えポイント・グループ */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pl-1">
                    <IconMemo className="h-4 w-4 text-amber-500" />
                    <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">整えポイント</span>
                  </div>
                  {subLabels?.length ? (
                    <div className="grid gap-3">
                      {subLabels.map((s) => (
                        <SubItemCard key={s.code} tone="amber">
                          <div className="flex gap-4">
                            <div className="shrink-0 pt-0.5 text-[var(--accent)]">
                              <SubIllust code={s.code} size="md" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[15px] font-black text-slate-900">{s.title}</div>
                              <div className="mt-2 text-[13px] leading-6 font-bold text-slate-600">{s.action_hint}</div>
                            </div>
                          </div>
                        </SubItemCard>
                      ))}
                    </div>
                  ) : (
                    <SubItemCard tone="slate"><div className="text-[13px] font-bold text-slate-500">良好なバランスです。</div></SubItemCard>
                  )}
                </div>

                {/* 2. 張りやすい場所・グループ（主・副を1つのセクションに） */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 pl-1">
                    <IconBody className="h-4 w-4 text-violet-500" />
                    <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">体の張りやすいライン</span>
                  </div>
                  <div className="grid gap-3">
                    <SubItemCard tone="violet">
                      <MeridianItem line={meridianPrimary ? { ...meridianPrimary, code: computed?.primary_meridian } : null} label="メインライン（主）" tone="violet" />
                    </SubItemCard>
                    {meridianSecondary && (
                      <SubItemCard tone="teal">
                        <MeridianItem line={{ ...meridianSecondary, code: computed?.secondary_meridian }} label="サブライン（副）" tone="teal" />
                      </SubItemCard>
                    )}
                  </div>
                </div>

              </div>
            </Module>

            <Module>
              <ModuleHeader icon={<IconBolt />} title="次の一歩" sub="保存して、今日の「予報」へ" />
              <div className="px-6 pb-8 pt-5 space-y-4">
                {isLoggedIn ? (
                  isAttached ? (
                    <SubItemCard tone="mint">
                      <div className="text-[14px] font-black text-emerald-800">保存済み ✅</div>
                      <Button onClick={() => router.push("/radar")} className="mt-4 w-full shadow-md">今日の予報と対策へ</Button>
                    </SubItemCard>
                  ) : (
                    <Button onClick={() => attachToAccount(false)} disabled={attaching} className="w-full shadow-md py-4">
                      {attaching ? "保存中…" : "結果を保存して予報を見る（無料）"}
                    </Button>
                  )
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-[24px] bg-[color-mix(in_srgb,var(--mint),white_40%)] p-5 ring-1 ring-[var(--ring)]">
                       <div className="text-[15px] font-black text-slate-900">無料で保存して予報を見ましょう</div>
                       <div className="mt-1.5 text-[12px] font-bold text-slate-600 leading-5">アカウント作成後、今日のあなたの崩れやすさをチェックできます。</div>
                    </div>
                    <Button onClick={() => router.push("/signup")} className="w-full shadow-md py-4">無料で保存して予報を見る</Button>
                  </div>
                )}
              </div>
            </Module>
          </>
        )}

        {tab === "compat" && (
          <Module>
            <ModuleHeader icon={<IconCloud />} title="天気との相性" sub="気象変化による崩れやすさの傾向" />
            <div className="px-6 pb-8 pt-5 space-y-6">
              <div className="text-[13px] leading-7 font-bold text-slate-700 bg-slate-50/50 p-5 rounded-[24px] ring-1 ring-slate-100">{weatherCompat.intro}</div>
              <div className="space-y-3">
                {weatherCompat.items.map((item) => (
                  <SubItemCard key={item.key}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-white ring-1 ring-slate-200 text-[var(--accent-ink)] shadow-sm">
                         <WeatherIcon triggerKey={item.key} className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-[15px] font-black text-slate-900">{item.label}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.rankLabel}</div>
                      </div>
                    </div>
                    <div className="text-[13px] leading-6 font-bold text-slate-600">{item.body}</div>
                  </SubItemCard>
                ))}
              </div>
              <SubItemCard tone="amber" title="天気が重なると出やすいサイン">
                <ul className="grid gap-2">
                  {weatherCompat.signs.map((s, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 rounded-[14px] bg-white/60 px-4 py-2 text-[13px] font-bold text-slate-700 ring-1 ring-inset ring-amber-100">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </SubItemCard>
              <SubItemCard tone="mint" title="未病レーダーで分かること">
                <div className="text-[13px] leading-7 font-bold text-slate-700">{weatherCompat.radarBridge}</div>
                <Button onClick={() => setTab("save")} className="mt-5 w-full shadow-sm">保存して予報へ進む</Button>
              </SubItemCard>
            </div>
          </Module>
        )}

        {tab === "save" && (
          <Module>
            <ModuleHeader icon={<IconBolt />} title="結果を保存する" sub="今後の予報精度が向上します" />
            <div className="px-6 pb-8 pt-5 space-y-4 text-center">
              <div className="text-sm font-bold text-slate-600 leading-6 px-2 mb-4">
                アカウントを作成して保存すると、毎日の「体調予報」と「先回りケア」を無料で確認できるようになります。
              </div>
              <Button onClick={() => router.push("/signup")} className="w-full shadow-md py-4">無料で保存して予報を見る</Button>
              <Button variant="ghost" onClick={() => router.push("/check")} className="w-full">もう一度チェックし直す</Button>
            </div>
          </Module>
        )}

        <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-300">Result ID: {id}</div>
      </div>
    </AppShell>
  );
}
