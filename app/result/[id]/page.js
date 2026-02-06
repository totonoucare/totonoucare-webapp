// app/result/[id]/page.js
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
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
 * Inline SVG Icons（本番前提）
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
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconMemo() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 7h10M8 11h10M8 15h7" />
      <path d="M6 3h14a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2z" />
    </svg>
  );
}
function IconCompass() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22a10 10 0 1 1 10-10 10 10 0 0 1-10 10z" />
      <path d="M14.5 9.5l-2 5-5 2 2-5 5-2z" />
      <path d="M12 7v2M17 12h-2M12 17v-2M7 12h2" />
    </svg>
  );
}
function IconRobot() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
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
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function IconBrain() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 7a3 3 0 0 1 6 0v10a3 3 0 0 1-6 0" />
      <path d="M8 9a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3" />
      <path d="M14 9a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3" />
    </svg>
  );
}
function IconRadar() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 12l7-7" />
      <path d="M12 12a7 7 0 1 0 7 7" />
      <path d="M12 12V3" />
      <path d="M12 12h9" />
      <path d="M5 19l2-2" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function IconResult() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M7 3h10v18H7z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
function IconRadarTab() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 12l8-4" />
      <path d="M12 12a8 8 0 1 0 8 8" />
      <path d="M12 12V4" />
    </svg>
  );
}

/* -----------------------------
 * UI primitives
 * ---------------------------- */
function AppBar({ title, onBack }) {
  return (
    <div className="sticky top-0 z-20 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="mx-auto w-full max-w-[440px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
          >
            <span className="text-slate-400">←</span>もどる
          </button>
          <div className="text-sm font-extrabold tracking-tight text-slate-800">{title}</div>
          <div className="w-[88px]" />
        </div>
      </div>
    </div>
  );
}

function Module({ children, className = "" }) {
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

function ModuleHeader({ icon, title, sub }) {
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
      </div>
      <div className="mt-4 h-px w-full bg-black/5" />
    </div>
  );
}

function Panel({ icon, title, tone = "mint", children, right }) {
  const tones = {
    mint: { wrap: "bg-[color-mix(in_srgb,var(--mint),white_55%)]", bar: "bg-[var(--accent)]", title: "text-[var(--accent-ink)]" },
    violet: { wrap: "bg-[color-mix(in_srgb,#ede9fe,white_35%)]", bar: "bg-[#6d5bd0]", title: "text-[#3b2f86]" },
    teal: { wrap: "bg-[color-mix(in_srgb,#d1fae5,white_35%)]", bar: "bg-[#0f766e]", title: "text-[#115e59]" },
    amber: { wrap: "bg-[color-mix(in_srgb,#fef3c7,white_35%)]", bar: "bg-[#b45309]", title: "text-[#7c2d12]" },
  };
  const t = tones[tone] || tones.mint;

  return (
    <div className={`relative rounded-[20px] ${t.wrap} ring-1 ring-[var(--ring)]`}>
      <div className={`absolute left-0 top-0 h-full w-1.5 rounded-l-[20px] ${t.bar}`} />
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

/* -----------------------------
 * AI split（「」や ## が混ざっても耐える）
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
 * Bottom Tab Bar（アプリ感の核）
 * ---------------------------- */
function BottomTabs({ active, onGo }) {
  const item = (key, label, Icon) => {
    const isActive = active === key;
    return (
      <button
        type="button"
        onClick={() => onGo(key)}
        className={[
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-[16px] py-2",
          isActive ? "text-[var(--accent-ink)]" : "text-slate-500",
        ].join(" ")}
      >
        <span
          className={[
            "grid h-9 w-9 place-items-center rounded-[14px] transition",
            isActive ? "bg-[var(--mint)] ring-1 ring-[var(--ring)]" : "bg-transparent",
          ].join(" ")}
        >
          <Icon />
        </span>
        <span className={`text-[11px] font-extrabold ${isActive ? "" : "font-bold"}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-white/92 backdrop-blur supports-[backdrop-filter]:bg-white/75 ring-1 ring-[var(--ring)]">
      <div className="mx-auto w-full max-w-[440px] px-4 py-2">
        <div className="flex items-stretch gap-2 rounded-[20px] bg-white ring-1 ring-[var(--ring)] p-1 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.35)]">
          {item("check", "チェック", IconCheck)}
          {item("result", "結果", IconResult)}
          {item("radar", "レーダー", IconRadarTab)}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
 * 体質イラスト（差し替え口）
 * - 今は抽象SVGで成立
 * - 後で core_code に応じて画像 or SVGに差し替え可能
 * ---------------------------- */
function CoreIllustration({ coreCode }) {
  // 例：coreCodeで分岐したいならここにmapを作る
  // if (coreCode === "cold_slow") return <img ... />
  return (
    <svg viewBox="0 0 200 120" className="h-20 w-32 opacity-80" aria-hidden="true">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9EDDD" />
          <stop offset="1" stopColor="#6a9770" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <path d="M12,70 C30,18 92,8 120,30 C150,52 176,42 188,24 C192,66 168,104 120,110 C72,116 24,100 12,70Z" fill="url(#g)" />
      <circle cx="52" cy="52" r="8" fill="#6a9770" fillOpacity="0.35" />
      <circle cx="146" cy="54" r="10" fill="#6a9770" fillOpacity="0.25" />
    </svg>
  );
}

/* -----------------------------
 * Main Page
 * ---------------------------- */
function ResultPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = params;

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

  const explainRequestedRef = useRef(false);
  const attachAfterLogin = searchParams?.get("attach") === "1";

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

  // Auto-attach legacy
  useEffect(() => {
    if (!attachAfterLogin) return;
    if (loadingAuth) return;
    if (!session) return;
    if (!event || event?.notFound) return;

    attachToAccount(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachAfterLogin, loadingAuth, session, event?.id]);

  // Auto-generate explain
  useEffect(() => {
    if (!event || event?.notFound) return;
    if (loadingEvent) return;
    if (explainText) return;
    if (explainRequestedRef.current) return;
    explainRequestedRef.current = true;

    const ac = new AbortController();

    (async () => {
      try {
        setExplainError("");
        setLoadingExplain(true);

        const res = await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(id)}/explain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "AI解説の生成に失敗しました");

        const text = json?.data?.text || json?.data?.ai_explain_text || "";
        if (!text) throw new Error("AI解説が空でした");

        setExplainText(text);
        setExplainModel(json?.data?.model || json?.data?.ai_explain_model || "");
        setExplainCreatedAt(json?.data?.created_at || json?.data?.ai_explain_created_at || "");
      } catch (e) {
        if (ac.signal.aborted) return;
        setExplainError(e?.message || String(e));
      } finally {
        if (ac.signal.aborted) return;
        setLoadingExplain(false);
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, loadingEvent]);

  async function retryExplain() {
    setExplainError("");
    setLoadingExplain(true);

    try {
      const res = await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(id)}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "AI解説の生成に失敗しました");

      const text = json?.data?.text || json?.data?.ai_explain_text || "";
      if (!text) throw new Error("AI解説が空でした");

      setExplainText(text);
      setExplainModel(json?.data?.model || json?.data?.ai_explain_model || "");
      setExplainCreatedAt(json?.data?.created_at || json?.data?.ai_explain_created_at || "");
    } catch (e) {
      setExplainError(e?.message || String(e));
    } finally {
      setLoadingExplain(false);
    }
  }

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

  const explainParts = useMemo(() => splitExplain(explainText), [explainText]);

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

  // UI states
  if (loadingEvent) {
    return (
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
    );
  }

  if (!event || event?.notFound) {
    return (
      <div className="min-h-screen bg-app">
        <div className="mx-auto w-full max-w-[440px] px-4 pt-10">
          <Module>
            <div className="px-5 py-6">
              <div className="text-lg font-extrabold text-slate-900">結果が見つかりません</div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                期限切れ/削除、または保存に失敗した可能性があります。
              </div>
              <div className="mt-5">
                <Button onClick={() => router.push("/check")}>体質チェックをやり直す</Button>
              </div>
            </div>
          </Module>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-app pb-24">
      <AppBar title="診断結果" onBack={() => router.push("/check")} />

      {toast ? (
        <div className="fixed left-1/2 top-3 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-[18px] bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-lg ring-1 ring-[var(--ring)]">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-5 pb-3">
          {/* 1) Hero */}
          <Module>
            <ModuleHeader icon={<IconMemo />} title="あなたのお悩み" sub="チェック時の記録" />
            <div className="px-5 pb-5 pt-4">
              <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
                <div className="text-xs font-bold text-[var(--accent-ink)]/80">フォーカス</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{symptomLabel}</div>
              </div>
            </div>
          </Module>

          {/* 2) Constitution */}
          <Module>
            <ModuleHeader icon={<IconCompass />} title="体質の見立て" sub="軸・整えポイント・張りやすい場所" />
            <div className="px-5 pb-5 pt-4 space-y-4">
              <Panel
                title="今の体質の軸"
                tone="mint"
                right={<CoreIllustration coreCode={computed?.core_code} />}
              >
                <div className="text-base font-extrabold tracking-tight text-slate-900">{core.title}</div>
                <div className="mt-2 text-sm leading-7 text-slate-700">{core.tcm_hint}</div>
              </Panel>

              <div className="space-y-3">
                <div className="text-sm font-extrabold text-slate-900">整えポイント（最大2つ）</div>

                {subLabels?.length ? (
                  <div className="space-y-3">
                    {subLabels.map((s) => (
                      <Panel
                        key={s.title}
                        icon={<span className="text-slate-700"><IconMemo /></span>}
                        title={`${s.title}${s.short ? `（${s.short}）` : ""}`}
                        tone="amber"
                      >
                        {s.action_hint ? (
                          <div className="text-sm leading-7 text-slate-800">{s.action_hint}</div>
                        ) : (
                          <div className="text-sm text-slate-600">（ヒントなし）</div>
                        )}
                      </Panel>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] bg-white p-4 text-sm text-slate-600 ring-1 ring-[var(--ring)]">
                    今回は強い偏りは見られませんでした（バランス良好）。
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-extrabold text-slate-900">体の張りやすい場所</div>

                <Panel icon={<span className="text-slate-700"><IconCompass /></span>} title="（主）出やすいライン" tone="violet">
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
                </Panel>

                <Panel icon={<span className="text-slate-700"><IconCompass /></span>} title="（副）補助ライン" tone="teal">
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
                </Panel>
              </div>
            </div>
          </Module>

          {/* 3) AI Explain（アコーディオン） */}
          <Module>
            <ModuleHeader
              icon={<IconRobot />}
              title="あなたの体質解説"
              sub="トトノウくん（AI）が、今回の結果を“つなげて”解説します"
            />
            <div className="px-5 pb-5 pt-4 space-y-4">
              {loadingExplain ? (
                <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
                    <div className="text-sm font-bold text-slate-700">解説文を生成中…</div>
                  </div>
                </div>
              ) : explainText ? null : (
                <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
                  <div className="text-sm font-bold text-slate-800">
                    {explainError ? `生成に失敗しました：${explainError}` : "まだ文章がありません。"}
                  </div>
                  <div className="mt-4">
                    <Button onClick={retryExplain} disabled={loadingExplain}>
                      {loadingExplain ? "生成中…" : "もう一度生成する"}
                    </Button>
                  </div>
                </div>
              )}

              {explainText ? (
                <div className="space-y-3">
                  {/* Accordion 1 */}
                  {explainParts.p1 ? (
                    <details className="group rounded-[20px] ring-1 ring-[var(--ring)] bg-white overflow-hidden">
                      <summary className="cursor-pointer select-none px-4 py-4 list-none [&::-webkit-details-marker]:hidden">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-[color-mix(in_srgb,#ede9fe,white_35%)] text-[#3b2f86] ring-1 ring-[var(--ring)]">
                              <IconBrain />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-slate-900">いまの体のクセ（今回のまとめ）</div>
                              <div className="mt-1 text-[11px] font-medium text-slate-500">
                                今回の結果を「一本の流れ」で整理します
                              </div>
                            </div>
                          </div>
                          <div className="text-slate-500">
                            <IconChevron />
                          </div>
                        </div>
                      </summary>
                      <div className="px-5 pb-5 pt-0">
                        <div className="rounded-[18px] bg-[color-mix(in_srgb,#ede9fe,white_55%)] ring-1 ring-[var(--ring)] p-4">
                          <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800">
                            {explainParts.p1}
                          </div>
                        </div>
                      </div>
                    </details>
                  ) : null}

                  {/* Accordion 2 */}
                  {explainParts.p2 ? (
                    <details className="group rounded-[20px] ring-1 ring-[var(--ring)] bg-white overflow-hidden">
                      <summary className="cursor-pointer select-none px-4 py-4 list-none [&::-webkit-details-marker]:hidden">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-[color-mix(in_srgb,#d1fae5,white_35%)] text-[#115e59] ring-1 ring-[var(--ring)]">
                              <IconRadar />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-slate-900">体調の揺れを予報で先回り（未病レーダー）</div>
                              <div className="mt-1 text-[11px] font-medium text-slate-500">
                                “揺れやすい日”の先回りと備えの方向
                              </div>
                            </div>
                          </div>
                          <div className="text-slate-500">
                            <IconChevron />
                          </div>
                        </div>
                      </summary>
                      <div className="px-5 pb-5 pt-0">
                        <div className="rounded-[18px] bg-[color-mix(in_srgb,#d1fae5,white_55%)] ring-1 ring-[var(--ring)] p-4">
                          <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800">
                            {explainParts.p2}
                          </div>
                        </div>
                      </div>
                    </details>
                  ) : null}

                  {(explainCreatedAt || explainModel) ? (
                    <div className="text-right text-[11px] font-bold text-slate-400">
                      {explainCreatedAt ? `生成：${new Date(explainCreatedAt).toLocaleString("ja-JP")}` : ""}
                      {explainModel ? ` / model: ${explainModel}` : ""}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Module>

          {/* 4) CTA */}
          <Module>
            <ModuleHeader icon={<IconBolt />} title="次の一歩（おすすめ）" sub="保存 → 今日の予報と対策（無料）へ" />
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
                    <div className="rounded-[20px] bg-[color-mix(in_srgb,#d1fae5,white_35%)] p-5 ring-1 ring-[var(--ring)]">
                      <div className="text-sm font-extrabold text-emerald-800">この結果は保存済みです ✅</div>
                      <div className="mt-4">
                        <Button onClick={() => router.push("/radar")}>今日の予報と対策へ</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
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
                    <Button variant="ghost" onClick={() => router.push("/check")}>もう一度チェックする</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_40%)] p-5 ring-1 ring-[var(--ring)]">
                    <div className="text-base font-extrabold tracking-tight text-slate-900">
                      無料で結果を保存して、今日の「予報と対策」へ。
                    </div>
                    <div className="mt-2 text-xs font-bold text-slate-600">
                      登録だけでは課金されません（無料の範囲で使えます）
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button onClick={goSignupToRadar}>無料で保存して、今日の予報と対策を見る</Button>
                    <Button variant="ghost" onClick={goLoginToRadar}>すでに登録済みの方はこちら（ログイン）</Button>
                    <Button variant="ghost" onClick={() => router.push("/check")}>もう一度チェックする</Button>
                  </div>
                </>
              )}
            </div>
          </Module>

          <div className="pb-6 text-center text-[11px] font-bold text-slate-400">
            診断作成日時：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
          </div>
        </div>
      </div>

      <BottomTabs
        active="result"
        onGo={(key) => {
          if (key === "check") router.push("/check");
          if (key === "radar") router.push("/radar");
          if (key === "result") router.push(`/result/${encodeURIComponent(id)}`);
        }}
      />
    </div>
  );
}
