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
import {
  IconChevron,
  IconMemo,
  IconCompass,
  IconBolt,
  IconBrain,
  IconRadar,
  IconResult,
} from "@/components/illust/icons/result";

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
 * UI
 * ---------------------------- */
function Card({ children, className = "" }) {
  return (
    <section
      className={[
        "rounded-[26px] bg-[var(--panel)] shadow-sm ring-1 ring-[var(--ring)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function CardHeader({ icon, title, sub, right }) {
  return (
    <div className="px-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[var(--mint)] ring-1 ring-[var(--ring)] text-[var(--accent-ink)]">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-extrabold tracking-tight text-slate-900">{title}</div>
            {sub ? <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div> : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4 h-px w-full bg-black/5" />
    </div>
  );
}

function SoftPanel({ tone = "mint", title, icon, right, children }) {
  const tones = {
    mint: {
      wrap: "bg-[color-mix(in_srgb,var(--mint),white_55%)]",
      bar: "bg-[var(--accent)]",
      title: "text-[var(--accent-ink)]",
    },
    violet: {
      wrap: "bg-[color-mix(in_srgb,#ede9fe,white_35%)]",
      bar: "bg-[#6d5bd0]",
      title: "text-[#3b2f86]",
    },
    teal: {
      wrap: "bg-[color-mix(in_srgb,#d1fae5,white_35%)]",
      bar: "bg-[#0f766e]",
      title: "text-[#115e59]",
    },
    amber: {
      wrap: "bg-[color-mix(in_srgb,#fef3c7,white_35%)]",
      bar: "bg-[#b45309]",
      title: "text-[#7c2d12]",
    },
    slate: {
      wrap: "bg-[color-mix(in_srgb,#eef2ff,white_40%)]",
      bar: "bg-slate-700",
      title: "text-slate-800",
    },
  };
  const t = tones[tone] || tones.mint;

  return (
    <div className={`relative rounded-[22px] ${t.wrap} ring-1 ring-[var(--ring)]`}>
      <div className={`absolute left-0 top-0 h-full w-1.5 rounded-l-[22px] ${t.bar}`} />
      <div className="px-4 py-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {icon ? (
              <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-white/70 ring-1 ring-[var(--ring)] text-slate-700">
                {icon}
              </div>
            ) : null}
            <div className={`text-sm font-extrabold tracking-tight ${t.title}`}>{title}</div>
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
        <div className="mt-3 text-sm leading-8 text-slate-800">{children}</div>
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
    <div className="sticky top-[72px] z-20 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-3">
        <div className="rounded-[18px] bg-white ring-1 ring-[var(--ring)] p-1 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.35)]">
          <div className="grid grid-cols-3 gap-1">
            {tabs.map((t) => {
              const active = value === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onChange(t.key)}
                  className={[
                    "h-10 rounded-[14px] text-sm font-extrabold tracking-tight transition active:scale-[0.99]",
                    active
                      ? "bg-[var(--mint)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)]"
                      : "text-slate-600",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
 * Rule-based explain（即表示）
 * ---------------------------- */
function buildRuleExplainClient({
  symptomLabel,
  core,
  subLabels,
  meridianPrimary,
  meridianSecondary,
  computed,
}) {
  const obs = Number(computed?.axes?.obstruction_score);
  const obsLevel = Number.isFinite(obs)
    ? obs >= 0.7
      ? "強め"
      : obs >= 0.4
      ? "中くらい"
      : "軽め"
    : "—";

  const subLine = subLabels?.length
    ? subLabels
        .map(
          (s) =>
            `・${s.title}${s.short ? `（${s.short}）` : ""}：${(s.action_hint || "").trim()}`.trim()
        )
        .join("\n")
    : "・今回は強い偏りは見られませんでした（バランス良好）。";

  const meridianLine = [
    meridianPrimary ? `主：${meridianPrimary.title}（${meridianPrimary.body_area}）` : "主：今回は強い偏りなし",
    meridianSecondary
      ? `副：${meridianSecondary.title}（${meridianSecondary.body_area}）`
      : "副：今回は強い偏りなし",
  ].join("\n");

  return [
    `今回のお悩みは「${symptomLabel}」でした。`,
    `体質の軸は「${core?.title || "—"}」です。`,
    core?.tcm_hint || "",
    `整えポイントは次の方向です：\n${subLine}`,
    `張りやすい場所の傾向：\n${meridianLine}`,
    `詰まり・重さの出やすさ：${obsLevel}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* -----------------------------
 * Weather compatibility
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

function buildWeatherCompatibility({
  answers,
  computed,
  symptomKey,
  core,
  subLabels,
}) {
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

  // sub label contributions (Radar寄り)
  for (const label of subCodes) {
    switch (label) {
      case "qi_stagnation":
        scores.pressure_down += 0.14;
        scores.pressure_up += 0.08;
        scores.heat += 0.06;
        scores.damp += 0.04;
        break;
      case "qi_deficiency":
        scores.pressure_down += 0.1;
        scores.cold += 0.14;
        scores.damp += 0.1;
        break;
      case "blood_deficiency":
        scores.cold += 0.12;
        scores.dry += 0.1;
        scores.pressure_down += 0.06;
        break;
      case "blood_stasis":
        scores.pressure_down += 0.1;
        scores.pressure_up += 0.04;
        scores.cold += 0.08;
        scores.damp += 0.05;
        break;
      case "fluid_damp":
        scores.damp += 0.22;
        scores.cold += 0.06;
        scores.pressure_down += 0.04;
        break;
      case "fluid_deficiency":
        scores.dry += 0.22;
        scores.heat += 0.16;
        scores.pressure_up += 0.05;
        break;
      default:
        break;
    }
  }

  // core nuance
  if (coreCode.includes("batt_small")) {
    for (const k of Object.keys(scores)) scores[k] += 0.08;
  }
  if (coreCode.includes("batt_large")) {
    for (const k of Object.keys(scores)) scores[k] -= 0.03;
  }
  if (coreCode.startsWith("accel")) {
    scores.pressure_down += 0.06;
    scores.pressure_up += 0.05;
    scores.heat += 0.05;
  }
  if (coreCode.startsWith("brake")) {
    scores.cold += 0.08;
    scores.damp += 0.1;
    scores.pressure_down += 0.03;
  }

  // thermo self-report is intentionally weak
  if (thermoAnswer === "heat") scores.heat += 0.08;
  if (thermoAnswer === "cold") scores.cold += 0.08;

  // env vectors
  if (envVectors.includes("pressure_shift")) {
    scores.pressure_down += 0.12;
    scores.pressure_up += 0.12;
  }
  if (envVectors.includes("temp_swing")) {
    scores.cold += 0.1;
    scores.heat += 0.1;
  }
  if (envVectors.includes("humidity_up")) {
    scores.damp += 0.12;
  }
  if (envVectors.includes("dryness_up")) {
    scores.dry += 0.1;
  }
  if (envVectors.includes("wind_strong")) {
    scores.pressure_down += 0.03;
    scores.pressure_up += 0.03;
  }

  // overall sensitivity
  for (const k of Object.keys(scores)) {
    scores[k] += envSensitivity * 0.03;
    scores[k] = round2(Math.max(0, scores[k]));
  }

  const items = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, score]) => ({
      key,
      score,
      label: weatherLabel(key),
      body: weatherBody(key, symptomKey, coreCode, subCodes),
    }));

  return {
    intro: buildCompatIntro({ core, subLabels, symptomKey }),
    items,
    signs: buildLikelySigns({ symptomKey, coreCode, subCodes }),
    radarBridge: buildRadarBridge({ symptomKey }),
  };
}

function weatherLabel(key) {
  const map = {
    pressure_down: "気圧が下がる日",
    pressure_up: "気圧が上がる日",
    cold: "冷え込む日",
    heat: "気温が上がりやすい日",
    damp: "湿っぽい日",
    dry: "乾燥しやすい日",
  };
  return map[key] || key;
}

function weatherBody(key, symptomKey, coreCode, subCodes) {
  const hasQiStag = subCodes.includes("qi_stagnation");
  const hasBloodDef = subCodes.includes("blood_deficiency");
  const hasFluidDef = subCodes.includes("fluid_deficiency");
  const hasFluidDamp = subCodes.includes("fluid_damp");
  const isBattSmall = coreCode.includes("batt_small");
  const isAccel = coreCode.startsWith("accel");

  if (key === "pressure_down") {
    if (symptomKey === "headache") {
      return "変化に押される日に、首肩やこめかみの緊張が強まりやすく、巡りの詰まりから頭痛につながりやすくなります。";
    }
    return "変化に押される日に、切り替えがうまくいかず、緊張や巡りの詰まりが出やすくなります。";
  }

  if (key === "pressure_up") {
    return "張りつめた感じや、頭や上半身の詰まりが出やすい方向です。無理に詰め込まず、少しゆるめる意識が合います。";
  }

  if (key === "cold") {
    if (hasBloodDef || isBattSmall) {
      return "冷え込む日は、支える余力が削れやすく、首肩のこわばりや消耗として出やすい方向です。";
    }
    return "冷え込む日は、体が縮こまりやすく、こわばりやだるさとして出やすい方向です。";
  }

  if (key === "heat") {
    if (hasFluidDef || isAccel) {
      return "気温が上がる日は、熱や刺激がこもりやすく、上半身の張りやのぼせ感につながりやすい方向です。";
    }
    return "暑さや熱こもりで、詰まりや疲れが出やすい方向です。";
  }

  if (key === "damp") {
    if (symptomKey === "headache") {
      return "湿っぽい日は、重さが加わって巡りの悪さが増し、頭や体が重く感じやすくなります。";
    }
    if (hasFluidDamp) {
      return "湿っぽい日は、重だるさやむくみ感が出やすく、体の軽さを保ちにくい方向です。";
    }
    return "湿っぽい日は、重さが増して動き出しにくくなりやすい方向です。";
  }

  if (key === "dry") {
    if (hasFluidDef || hasBloodDef) {
      return "乾燥しやすい日は、潤い不足が強まり、目・喉・皮膚や頭の疲れとして出やすい方向です。";
    }
    return "乾燥しやすい日は、こわばりや疲れが残りやすい方向です。";
  }

  return "この方向の天気変化で体調が揺れやすい傾向があります。";
}

function buildCompatIntro({ core, subLabels, symptomKey }) {
  const subShorts = Array.isArray(subLabels) ? subLabels.map((s) => s.short).filter(Boolean) : [];
  const subText = subShorts.length ? subShorts.join("・") : "大きな偏りなし";

  return `${core?.title || "今回の体質"}は、${subText}の傾向が重なることで、天気の変化を受けた時の崩れ方に特徴が出やすいタイプです。特に「${SYMPTOM_LABELS[symptomKey] || symptomKey}」では、外の変化が首肩・頭まわりや全身の重さとして現れやすくなります。`;
}

function buildLikelySigns({ symptomKey, subCodes }) {
  if (symptomKey === "headache") {
    return [
      "首肩〜こめかみが張ってくる",
      "頭が重い・すっきりしない",
      "呼吸が浅い感じになる",
      "朝の立ち上がりが重い",
    ];
  }
  if (symptomKey === "sleep") {
    return [
      "夜に切り替えにくい",
      "頭や体が緩みにくい",
      "眠っても疲れが残る",
    ];
  }
  if (symptomKey === "mood") {
    return [
      "気分が詰まる",
      "切り替えに時間がかかる",
      "重さやだるさが先に来る",
    ];
  }

  if (subCodes.includes("fluid_damp")) {
    return ["体が重い", "朝が動きにくい", "むくみっぽさが出る"];
  }

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

  // ✅ “来た元” 判定（from が無い直リンクでも破綻しない）
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

  // Auth
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

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Fetch event
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingEvent(true);
        const res = await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(id)}`);
        const json = await res.json().catch(() => ({}));
        if (!mounted) return;

        if (!res.ok || !json?.data) {
          setEvent({ notFound: true });
          return;
        }

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

    return () => {
      mounted = false;
    };
  }, [id]);

  // Auto-attach legacy (attach=1 after login)
  useEffect(() => {
    if (!attachAfterLogin) return;
    if (loadingAuth) return;
    if (!session) return;
    if (!event || event?.notFound) return;
    if (autoAttachRan.current) return;

    autoAttachRan.current = true;
    attachToAccount(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachAfterLogin, loadingAuth, session, event?.id]);

  // Derived
  const computed = event?.computed || {};
  const answers = event?.answers || {};

  const symptomKey = answers?.symptom_focus || event?.symptom_focus || "fatigue";

  const symptomLabel = useMemo(() => {
    return SYMPTOM_LABELS[symptomKey] || "だるさ・疲労";
  }, [symptomKey]);

  const core = useMemo(() => getCoreLabel(computed?.core_code), [computed?.core_code]);
  const subLabels = useMemo(() => getSubLabels(computed?.sub_labels), [computed?.sub_labels]);
  const meridianPrimary = useMemo(
    () => getMeridianLine(computed?.primary_meridian),
    [computed?.primary_meridian]
  );
  const meridianSecondary = useMemo(
    () => getMeridianLine(computed?.secondary_meridian),
    [computed?.secondary_meridian]
  );

  const isLoggedIn = !!session;
  const isAttached = !!event?.is_attached;

  const ruleExplain = useMemo(() => {
    return buildRuleExplainClient({
      symptomLabel,
      core,
      subLabels,
      meridianPrimary,
      meridianSecondary,
      computed,
    });
  }, [symptomLabel, core, subLabels, meridianPrimary, meridianSecondary, computed]);

  const weatherCompat = useMemo(() => {
    return buildWeatherCompatibility({
      answers,
      computed,
      symptomKey,
      core,
      subLabels,
    });
  }, [answers, computed, symptomKey, core, subLabels]);

  // Actions
  async function attachToAccount(silent = false) {
    if (attaching) return;
    setAttaching(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        if (!silent) setToast("先にログインが必要です");
        return;
      }

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
    router.push(
      `/signup?result=${encodeURIComponent(id)}&next=${encodeURIComponent(
        `/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`
      )}`
    );
  }

  function goLoginToRadar() {
    router.push(
      `/login?result=${encodeURIComponent(id)}&next=${encodeURIComponent(
        `/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`
      )}`
    );
  }

  const headerLeft = (
    <button
      type="button"
      onClick={() => router.push(backHref)}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
    >
      ← 戻る
    </button>
  );

  const headerRight = (
    <button
      type="button"
      onClick={() => router.push("/")}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
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
          <ModuleHeader
            icon={<IconResult />}
            title="結果が見つかりません"
            sub="期限切れ/削除、または保存失敗の可能性"
          />
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

      {/* Hero */}
      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="pt-2 pb-3">
          <div className="rounded-[28px] bg-[color-mix(in_srgb,var(--mint),white_45%)] ring-1 ring-[var(--ring)] shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-[var(--accent-ink)]/80">あなたのお悩み</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 truncate">
                  {symptomLabel}
                </div>
                <div className="mt-2 text-xs font-bold text-slate-600">
                  チェック作成：
                  {event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="rounded-[22px] bg-white/70 ring-1 ring-[var(--ring)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-slate-500">あなたの体質の軸</div>

                    <div className="mt-1 text-xl font-black tracking-tight text-slate-900 leading-tight">
                      {core?.title || "—"}
                    </div>

                    {core?.short ? (
                      <div className="mt-2">
                        <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-[var(--ring)]">
                          {core.short}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    <div className="grid aspect-square w-[92px] place-items-center overflow-hidden rounded-[18px] bg-white ring-1 ring-[var(--ring)]">
                      <CoreIllust
                        code={computed?.core_code}
                        title={core?.title || "体質タイプ"}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-sm leading-7 text-slate-700">{core?.tcm_hint || ""}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SegmentedTabs value={tab} onChange={setTab} />

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-5 pb-3">
          {/* --------------------
           * TAB: Overview
           * -------------------- */}
          {tab === "overview" ? (
            <>
              <Card>
                <CardHeader icon={<IconCompass />} title="詳しい見立て" sub="整えポイント・張りやすい場所" />
                <div className="px-5 pb-6 pt-4 space-y-4">
                  <SoftPanel tone="amber" title="整えポイント（最大2つ）" icon={<IconMemo />}>
                    {subLabels?.length ? (
                      <div className="space-y-3">
                        {subLabels.map((s) => (
                          <div
                            key={s.code || s.title}
                            className="rounded-[18px] bg-white/75 ring-1 ring-[var(--ring)] p-4"
                          >
                            <div className="flex gap-3">
                              <div className="shrink-0 pt-0.5 text-[var(--accent)]">
                                <SubIllust code={s.code} size="sm" />
                              </div>

                              <div className="min-w-0">
                                <div className="text-sm font-extrabold text-slate-900">
                                  {s.title}
                                  {s.short ? <span className="text-slate-500">（{s.short}）</span> : null}
                                </div>
                                <div className="mt-2 text-sm leading-7 text-slate-700">
                                  {s.action_hint || "（ヒントなし）"}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[18px] bg-white/75 ring-1 ring-[var(--ring)] p-4 text-sm text-slate-700">
                        今回は強い偏りは見られませんでした（バランス良好）。
                      </div>
                    )}
                  </SoftPanel>

                  <SoftPanel tone="violet" title="体の張りやすい場所（主）" icon={<IconCompass />}>
                    {meridianPrimary ? (
                      <>
                        <div className="text-base font-extrabold text-slate-900">
                          {meridianPrimary.title}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
                        </div>
                        <div className="mt-2 text-sm leading-7 text-slate-700">
                          {meridianPrimary.organs_hint}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-700">今回は強い偏りなし</div>
                    )}
                  </SoftPanel>

                  <SoftPanel tone="teal" title="体の張りやすい場所（副）" icon={<IconCompass />}>
                    {meridianSecondary ? (
                      <>
                        <div className="text-base font-extrabold text-slate-900">
                          {meridianSecondary.title}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
                        </div>
                        <div className="mt-2 text-sm leading-7 text-slate-700">
                          {meridianSecondary.organs_hint}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-700">今回は強い偏りなし</div>
                    )}
                  </SoftPanel>
                </div>
              </Card>

              <Card>
                <CardHeader icon={<IconBolt />} title="次の一歩" sub="保存 → 今日の予報と対策へ" />
                <div className="px-5 pb-6 pt-4 space-y-4">
                  {loadingAuth ? (
                    <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
                      <div className="text-sm font-bold text-slate-700">ログイン状態を確認中…</div>
                    </div>
                  ) : isLoggedIn ? (
                    <>
                      <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
                        <div className="text-sm font-bold text-slate-800">
                          ログイン中：<span className="font-extrabold">{session.user?.email}</span>
                        </div>
                        <div className="mt-2 text-xs font-bold text-slate-500">
                          今日の「予報と対策」は無料で見られます。
                        </div>
                      </div>

                      {isAttached ? (
                        <div className="rounded-[22px] bg-[color-mix(in_srgb,#d1fae5,white_35%)] p-5 ring-1 ring-[var(--ring)]">
                          <div className="text-sm font-extrabold text-emerald-800">
                            この結果は保存済みです ✅
                          </div>
                          <div className="mt-4">
                            <Button onClick={() => router.push("/radar")}>今日の予報と対策へ</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
                          <div className="text-sm font-extrabold text-slate-900">
                            この結果を保存して、今日の未病レーダーへ進みましょう。
                          </div>
                          <div className="mt-2 text-xs font-bold text-slate-600">
                            登録だけでは課金されません（無料の範囲で使えます）
                          </div>
                          <div className="mt-4">
                            <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                              {attaching ? "保存して移動中…" : "保存して、今日の予報と対策を見る（無料）"}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
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
                        <div className="text-base font-extrabold tracking-tight text-slate-900">
                          無料で保存して、今日の「予報と対策」へ。
                        </div>
                        <div className="mt-2 text-xs font-bold text-slate-600">
                          登録だけでは課金されません（無料の範囲で使えます）
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button onClick={goSignupToRadar}>
                          無料で保存して、今日の予報と対策を見る
                        </Button>
                        <Button variant="ghost" onClick={goLoginToRadar}>
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

          {/* --------------------
           * TAB: Compatibility
           * -------------------- */}
          {tab === "compat" ? (
            <>
              <Card>
                <CardHeader
                  icon={<IconRadar />}
                  title="天気との相性"
                  sub="体質と天気の変化が重なると、どんな崩れ方をしやすいか"
                />
                <div className="px-5 pb-6 pt-4 space-y-4">
                  <SoftPanel tone="violet" title="この体質が揺れやすい理由" icon={<IconBrain />}>
                    <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800">
                      {ruleExplain}
                    </div>
                  </SoftPanel>

                  <SoftPanel tone="teal" title="影響を受けやすい天気変化" icon={<IconRadar />}>
                    <div className="text-sm leading-8 text-slate-800">{weatherCompat.intro}</div>

                    <div className="mt-4 space-y-3">
                      {weatherCompat.items.map((item) => (
                        <div
                          key={item.key}
                          className="rounded-[18px] bg-white/80 ring-1 ring-[var(--ring)] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-extrabold text-slate-900">{item.label}</div>
                            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-600">
                              反応しやすさ {item.score}
                            </div>
                          </div>
                          <div className="mt-2 text-sm leading-7 text-slate-700">{item.body}</div>
                        </div>
                      ))}
                    </div>
                  </SoftPanel>

                  <SoftPanel tone="amber" title="天気が重なると出やすいサイン" icon={<IconMemo />}>
                    <ul className="space-y-2">
                      {weatherCompat.signs.map((s, idx) => (
                        <li key={`${s}-${idx}`} className="rounded-[16px] bg-white/80 ring-1 ring-[var(--ring)] px-4 py-3">
                          <div className="text-sm font-bold text-slate-800">・{s}</div>
                        </li>
                      ))}
                    </ul>
                  </SoftPanel>

                  <SoftPanel tone="mint" title="未病レーダーで分かること" icon={<IconBolt />}>
                    <div className="text-sm leading-8 text-slate-800">{weatherCompat.radarBridge}</div>
                  </SoftPanel>

                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setTab("overview")}>
                      概要に戻る
                    </Button>
                    <Button onClick={() => setTab("save")}>保存へ</Button>
                  </div>
                </div>
              </Card>
            </>
          ) : null}

          {/* --------------------
           * TAB: Save
           * -------------------- */}
          {tab === "save" ? (
            <>
              <Card>
                <CardHeader
                  icon={<IconBolt />}
                  title="保存してレーダーへ"
                  sub="結果は“今後の予報”の精度に効きます"
                />
                <div className="px-5 pb-6 pt-4 space-y-4">
                  {loadingAuth ? (
                    <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
                      <div className="text-sm font-bold text-slate-700">ログイン状態を確認中…</div>
                    </div>
                  ) : isLoggedIn ? (
                    <>
                      <div className="rounded-[22px] bg-white ring-1 ring-[var(--ring)] p-5">
                        <div className="text-sm font-bold text-slate-800">
                          ログイン中：<span className="font-extrabold">{session.user?.email}</span>
                        </div>
                        <div className="mt-2 text-xs font-bold text-slate-500">
                          保存すると、今日の「予報と対策」にすぐ進めます。
                        </div>
                      </div>

                      {isAttached ? (
                        <div className="rounded-[22px] bg-[color-mix(in_srgb,#d1fae5,white_35%)] p-5 ring-1 ring-[var(--ring)]">
                          <div className="text-sm font-extrabold text-emerald-800">
                            この結果は保存済みです ✅
                          </div>
                          <div className="mt-4">
                            <Button onClick={() => router.push("/radar")}>今日の予報と対策へ</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
                          <div className="text-sm font-extrabold text-slate-900">
                            この結果を保存しますか？
                          </div>
                          <div className="mt-2 text-xs font-bold text-slate-600">
                            登録だけでは課金されません（無料の範囲で使えます）
                          </div>
                          <div className="mt-4">
                            <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                              {attaching ? "保存して移動中…" : "保存して、今日の予報と対策を見る（無料）"}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
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
                        <div className="text-base font-extrabold tracking-tight text-slate-900">
                          無料で保存して、今日の「予報と対策」へ。
                        </div>
                        <div className="mt-2 text-xs font-bold text-slate-600">
                          登録だけでは課金されません（無料の範囲で使えます）
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button onClick={goSignupToRadar}>
                          無料で保存して、今日の予報と対策を見る
                        </Button>
                        <Button variant="ghost" onClick={goLoginToRadar}>
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

          <div className="pb-6 text-center text-[11px] font-bold text-slate-400">ID：{id}</div>
        </div>
      </div>
    </AppShell>
  );
}
