// app/result/[id]/page.js
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

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
 * Inline SVG Icons
 * ---------------------------- */
function IconChevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 transition-transform group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function IconMemo() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 7h10M8 11h10M8 15h7" />
      <path d="M6 3h14a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2z" />
    </svg>
  );
}
function IconCompass() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 22a10 10 0 1 1 10-10 10 10 0 0 1-10 10z" />
      <path d="M14.5 9.5l-2 5-5 2 2-5 5-2z" />
      <path d="M12 7v2M17 12h-2M12 17v-2M7 12h2" />
    </svg>
  );
}
function IconRobot() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3v3" />
      <path d="M8 6h8" />
      <rect x="5" y="8" width="14" height="11" rx="4" />
      <path d="M9 13h0M15 13h0" />
      <path d="M9 16c1 .8 5 .8 6 0" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function IconBrain() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 7a3 3 0 0 1 6 0v10a3 3 0 0 1-6 0" />
      <path d="M8 9a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3" />
      <path d="M14 9a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3" />
    </svg>
  );
}
function IconRadar() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 12l7-7" />
      <path d="M12 12a7 7 0 1 0 7 7" />
      <path d="M12 12V3" />
      <path d="M12 12h9" />
      <path d="M5 19l2-2" />
    </svg>
  );
}
function IconResult() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M7 3h10v18H7z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
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
    mint: { wrap: "bg-[color-mix(in_srgb,var(--mint),white_55%)]", bar: "bg-[var(--accent)]", title: "text-[var(--accent-ink)]" },
    violet: { wrap: "bg-[color-mix(in_srgb,#ede9fe,white_35%)]", bar: "bg-[#6d5bd0]", title: "text-[#3b2f86]" },
    teal: { wrap: "bg-[color-mix(in_srgb,#d1fae5,white_35%)]", bar: "bg-[#0f766e]", title: "text-[#115e59]" },
    amber: { wrap: "bg-[color-mix(in_srgb,#fef3c7,white_35%)]", bar: "bg-[#b45309]", title: "text-[#7c2d12]" },
    slate: { wrap: "bg-[color-mix(in_srgb,#eef2ff,white_40%)]", bar: "bg-slate-700", title: "text-slate-800" },
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
    { key: "explain", label: "解説" },
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
                    active ? "bg-[var(--mint)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)]" : "text-slate-600",
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

function CoreIllustration() {
  return (
    <svg viewBox="0 0 200 120" className="h-20 w-32 opacity-85" aria-hidden="true">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9EDDD" />
          <stop offset="1" stopColor="#6a9770" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <path
        d="M12,70 C30,18 92,8 120,30 C150,52 176,42 188,24 C192,66 168,104 120,110 C72,116 24,100 12,70Z"
        fill="url(#g)"
      />
      <circle cx="52" cy="52" r="8" fill="#6a9770" fillOpacity="0.35" />
      <circle cx="146" cy="54" r="10" fill="#6a9770" fillOpacity="0.25" />
    </svg>
  );
}

/* -----------------------------
 * Explain split（互換維持）
 * ---------------------------- */
function splitExplain(text) {
  const raw = (text || "").trim();
  if (!raw) return { p1: "", p2: "" };

  const normalize = (s) =>
    s
      .replace(/^#+\s*/gm, "")
      .replace(/[「」]/g, "")
      .replace(/\r\n/g, "\n")
      .trim();

  const t = normalize(raw);

  const h1 = "いまの体のクセ（今回のまとめ）";
  const h2 = "体調の揺れを予報で先回り（未病レーダー）";

  const i1 = t.indexOf(h1);
  const i2 = t.indexOf(h2);

  if (i1 === -1 && i2 === -1) return { p1: t, p2: "" };
  if (i1 !== -1 && i2 === -1) return { p1: t.slice(i1 + h1.length).trim() || t, p2: "" };
  if (i1 === -1 && i2 !== -1) return { p1: t, p2: t.slice(i2 + h2.length).trim() || "" };

  const p1 = t.slice(i1 + h1.length, i2).trim();
  const p2 = t.slice(i2 + h2.length).trim();

  return { p1: p1 || t.slice(0, i2).trim(), p2: p2 || "" };
}

/* -----------------------------
 * Rule-based explain（即表示）
 * ---------------------------- */
function buildRuleExplainClient({ symptomLabel, core, subLabels, meridianPrimary, meridianSecondary, answers, computed }) {
  const envSensitivityJa = (n) => {
    if (n <= 0) return "ほとんど影響なし";
    if (n === 1) return "たまに影響を受ける";
    if (n === 2) return "わりと影響を受ける";
    return "かなり影響を受ける";
  };
  const envVectorJa = (v) => {
    const map = {
      pressure_shift: "気圧の変化",
      temp_swing: "寒暖差",
      humidity_up: "湿度が上がる変化",
      dryness_up: "乾燥が強まる変化",
      wind_strong: "強風・冷風",
    };
    return map[v] || v;
  };

  const obs = Number(computed?.axes?.obstruction_score);
  const obsLevel = Number.isFinite(obs) ? (obs >= 0.7 ? "強め" : obs >= 0.4 ? "中くらい" : "軽め") : "—";

  const envSens = Math.max(0, Math.min(3, Number(answers?.env_sensitivity ?? 0) || 0));
  const envVecRaw = Array.isArray(answers?.env_vectors)
    ? answers.env_vectors.filter((x) => x && x !== "none").slice(0, 2)
    : [];
  const envVecJa = envVecRaw.length ? envVecRaw.map(envVectorJa).join("・") : "特になし";

  const subLine = subLabels?.length
    ? subLabels
        .map((s) => `・${s.title}${s.short ? `（${s.short}）` : ""}：${(s.action_hint || "").trim()}`.trim())
        .join("\n")
    : "・今回は強い偏りは見られませんでした（バランス良好）。";

  const meridianLine = [
    meridianPrimary ? `主：${meridianPrimary.title}（${meridianPrimary.body_area}）` : "主：今回は強い偏りなし",
    meridianSecondary ? `副：${meridianSecondary.title}（${meridianSecondary.body_area}）` : "副：今回は強い偏りなし",
  ].join("\n");

  const p1 = [
    `今回のお悩みは「${symptomLabel}」でした。`,
    `体質の軸は「${core?.title || "—"}」です。`,
    core?.tcm_hint || "",
    `整えポイントは次の方向です：\n${subLine}`,
    `張りやすい場所の傾向：\n${meridianLine}`,
    `詰まり・重さの出やすさ：${obsLevel}`,
  ]
    .filter(Boolean)
    .join("\n");

  const p2 = [
    `環境変化の影響は「${envSensitivityJa(envSens)}」で、引き金になりやすい方向は「${envVecJa}」です。`,
    `未病レーダーでは、日々の気象の変化とあなたの結果を組み合わせて「揺れやすい日」を予報として先回りできます。`,
    `予報に合わせて【今日の生活・食養生ヒント】や【監修ケア（ツボ・ストレッチ）】の提案につなげられます（ここでは中身は出しません）。`,
  ].join("\n");

  return { p1, p2 };
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

  const [explainText, setExplainText] = useState("");
  const [explainModel, setExplainModel] = useState("");
  const [explainCreatedAt, setExplainCreatedAt] = useState("");
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainError, setExplainError] = useState("");

  const attachAfterLogin = searchParams?.get("attach") === "1";
  const autoAttachRan = useRef(false);

  // ✅ “来た元” 判定（from が無い直リンクでも破綻しない）
  const from = (searchParams?.get("from") || "").toLowerCase();
  const backHref = useMemo(() => {
    // from は「遷移元で明示」が最強
    if (from === "history") return "/history";
    if (from === "check_run") return "/check/run";
    if (from === "check") return "/check";
    if (from === "home") return "/";
    if (from === "radar") return "/radar";

    // attach=1（ログイン後に保存フロー）なら check に戻すのが無難
    if (attachAfterLogin) return "/check";

    // デフォルト（直リンク/不明）：check に返す（診断の文脈を維持）
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

        // cached explain
        const t = json.data?.ai_explain_text || "";
        if (t) {
          setExplainText(t);
          setExplainModel(json.data?.ai_explain_model || "");
          setExplainCreatedAt(json.data?.ai_explain_created_at || "");
        }
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

  const symptomLabel = useMemo(() => {
    const k = answers?.symptom_focus || event?.symptom_focus || "fatigue";
    return SYMPTOM_LABELS[k] || "だるさ・疲労";
  }, [answers?.symptom_focus, event?.symptom_focus]);

  const core = useMemo(() => getCoreLabel(computed?.core_code), [computed?.core_code]);
  const subLabels = useMemo(() => getSubLabels(computed?.sub_labels), [computed?.sub_labels]);
  const meridianPrimary = useMemo(() => getMeridianLine(computed?.primary_meridian), [computed?.primary_meridian]);
  const meridianSecondary = useMemo(() => getMeridianLine(computed?.secondary_meridian), [computed?.secondary_meridian]);

  const isLoggedIn = !!session;
  const isAttached = !!event?.is_attached;

  const ruleExplain = useMemo(() => {
    return buildRuleExplainClient({
      symptomLabel,
      core,
      subLabels,
      meridianPrimary,
      meridianSecondary,
      answers,
      computed,
    });
  }, [symptomLabel, core, subLabels, meridianPrimary, meridianSecondary, answers, computed]);

  const aiParts = useMemo(() => splitExplain(explainText), [explainText]);

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

  async function requestExplain() {
    if (loadingExplain) return;
    setExplainError("");
    setLoadingExplain(true);

    try {
      const res = await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(id)}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "AI補足の生成に失敗しました");

      const text = json?.data?.text || json?.data?.ai_explain_text || "";
      if (!text) throw new Error("AI補足が空でした");

      setExplainText(text);
      setExplainModel(json?.data?.model || json?.data?.ai_explain_model || "");
      setExplainCreatedAt(json?.data?.created_at || json?.data?.ai_explain_created_at || "");
    } catch (e) {
      setExplainError(e?.message || String(e));
    } finally {
      setLoadingExplain(false);
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

  // UI states
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

  // Main UI
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-[var(--accent-ink)]/80">フォーカス</div>
            <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 truncate">
              {symptomLabel}
            </div>
            <div className="mt-2 text-xs font-bold text-slate-600">
              診断作成：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
            </div>
          </div>
          <div className="shrink-0">
            <CoreIllustration />
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="rounded-[22px] bg-white/70 ring-1 ring-[var(--ring)] p-4">
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

          <div className="mt-3 text-sm leading-7 text-slate-700">{core?.tcm_hint || ""}</div>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* Segmented tabs */}
      <SegmentedTabs value={tab} onChange={setTab} />

      {/* Content */}
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
                            key={s.title}
                            className="rounded-[18px] bg-white/75 ring-1 ring-[var(--ring)] p-4"
                          >
                            <div className="text-sm font-extrabold text-slate-900">
                              {s.title}
                              {s.short ? <span className="text-slate-500">（{s.short}）</span> : null}
                            </div>
                            <div className="mt-2 text-sm leading-7 text-slate-700">
                              {s.action_hint || "（ヒントなし）"}
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
                        <div className="text-base font-extrabold text-slate-900">{meridianPrimary.title}</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
                        </div>
                        <div className="mt-2 text-sm leading-7 text-slate-700">{meridianPrimary.organs_hint}</div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-700">今回は強い偏りなし</div>
                    )}
                  </SoftPanel>

                  <SoftPanel tone="teal" title="体の張りやすい場所（副）" icon={<IconCompass />}>
                    {meridianSecondary ? (
                      <>
                        <div className="text-base font-extrabold text-slate-900">{meridianSecondary.title}</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
                        </div>
                        <div className="mt-2 text-sm leading-7 text-slate-700">{meridianSecondary.organs_hint}</div>
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
                        <div className="mt-2 text-xs font-bold text-slate-500">今日の「予報と対策」は無料で見られます。</div>
                      </div>

                      {isAttached ? (
                        <div className="rounded-[22px] bg-[color-mix(in_srgb,#d1fae5,white_35%)] p-5 ring-1 ring-[var(--ring)]">
                          <div className="text-sm font-extrabold text-emerald-800">この結果は保存済みです ✅</div>
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
                        <Button variant="ghost" onClick={() => setTab("explain")}>
                          解説を見る
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
                        <Button onClick={goSignupToRadar}>無料で保存して、今日の予報と対策を見る</Button>
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
           * TAB: Explain
           * -------------------- */}
          {tab === "explain" ? (
            <>
              <Card>
                <CardHeader icon={<IconRobot />} title="体質の解説" sub="まずは確定の説明 → 必要ならAI補足（任意）" />
                <div className="px-5 pb-6 pt-4 space-y-4">
                  {/* Rule explain (always) */}
                  <details open className="group rounded-[22px] ring-1 ring-[var(--ring)] bg-white overflow-hidden">
                    <summary className="cursor-pointer select-none px-4 py-4 list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-[color-mix(in_srgb,#ede9fe,white_35%)] text-[#3b2f86] ring-1 ring-[var(--ring)]">
                            <IconBrain />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900">いまの体のクセ（確定の説明）</div>
                            <div className="mt-1 text-[11px] font-medium text-slate-500">AIなし・即表示</div>
                          </div>
                        </div>
                        <div className="text-slate-500">
                          <IconChevron />
                        </div>
                      </div>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                      <div className="rounded-[18px] bg-[color-mix(in_srgb,#ede9fe,white_55%)] ring-1 ring-[var(--ring)] p-4">
                        <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800">{ruleExplain.p1}</div>
                      </div>
                    </div>
                  </details>

                  <details open className="group rounded-[22px] ring-1 ring-[var(--ring)] bg-white overflow-hidden">
                    <summary className="cursor-pointer select-none px-4 py-4 list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-[color-mix(in_srgb,#d1fae5,white_35%)] text-[#115e59] ring-1 ring-[var(--ring)]">
                            <IconRadar />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900">揺れの先回り（確定の説明）</div>
                            <div className="mt-1 text-[11px] font-medium text-slate-500">環境変化の見方</div>
                          </div>
                        </div>
                        <div className="text-slate-500">
                          <IconChevron />
                        </div>
                      </div>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                      <div className="rounded-[18px] bg-[color-mix(in_srgb,#d1fae5,white_55%)] ring-1 ring-[var(--ring)] p-4">
                        <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800">{ruleExplain.p2}</div>
                      </div>
                    </div>
                  </details>

                  {/* Optional AI */}
                  <Card className="bg-white">
                    <div className="px-5 py-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900">AIの短い補足（任意）</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">
                            読みやすい“つなぎ”だけ。具体的な対策は出しません。
                          </div>
                        </div>
                        <div className="grid h-10 w-10 place-items-center rounded-[16px] bg-[color-mix(in_srgb,var(--mint),white_55%)] ring-1 ring-[var(--ring)] text-[var(--accent-ink)]">
                          <IconRobot />
                        </div>
                      </div>

                      {explainText ? (
                        <div className="mt-4 space-y-3">
                          <div className="rounded-[18px] bg-[color-mix(in_srgb,var(--mint),white_55%)] ring-1 ring-[var(--ring)] p-4">
                            <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800">
                              {`${aiParts.p1}\n\n${aiParts.p2}`.trim()}
                            </div>
                          </div>

                          {(explainCreatedAt || explainModel) ? (
                            <div className="text-right text-[11px] font-bold text-slate-400">
                              {explainCreatedAt ? `生成：${new Date(explainCreatedAt).toLocaleString("ja-JP")}` : ""}
                              {explainModel ? ` / model: ${explainModel}` : ""}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-4">
                          {loadingExplain ? (
                            <div className="flex items-center gap-3 rounded-[18px] bg-white ring-1 ring-[var(--ring)] p-4">
                              <div className="h-7 w-7 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
                              <div className="text-sm font-bold text-slate-700">AI補足を生成中…</div>
                            </div>
                          ) : (
                            <>
                              {explainError ? (
                                <div className="rounded-[18px] bg-white ring-1 ring-[var(--ring)] p-4">
                                  <div className="text-sm font-bold text-rose-700">生成に失敗しました：{explainError}</div>
                                </div>
                              ) : null}
                              <div className="mt-3">
                                <Button onClick={requestExplain} disabled={loadingExplain}>
                                  AI補足を生成する（任意）
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>

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
                <CardHeader icon={<IconBolt />} title="保存してレーダーへ" sub="結果は“今後の予報”の精度に効きます" />
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
                          <div className="text-sm font-extrabold text-emerald-800">この結果は保存済みです ✅</div>
                          <div className="mt-4">
                            <Button onClick={() => router.push("/radar")}>今日の予報と対策へ</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
                          <div className="text-sm font-extrabold text-slate-900">この結果を保存しますか？</div>
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
                        <Button variant="ghost" onClick={() => setTab("explain")}>
                          解説を見る
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
                        <Button onClick={goSignupToRadar}>無料で保存して、今日の予報と対策を見る</Button>
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

          <div className="pb-6 text-center text-[11px] font-bold text-slate-400">
            ID：{id}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
