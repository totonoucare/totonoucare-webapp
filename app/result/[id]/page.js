// app/result/[id]/page.js
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

/** ---------------------------
 * Inline SVG Icons (no emoji)
 * -------------------------- */
function IconMemo(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M7 3h8l2 2v16H7V3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 3v3h3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconCompass(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14.8 9.2 13 13l-3.8 1.8L11 11l3.8-1.8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconRobot(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M9 3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5" y="6" width="14" height="12" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12h.01M15 12h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 19v2M17 19v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconBolt(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M13 2 4 14h7l-1 8 10-14h-7l1-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconBrain(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M9.5 6.5a3 3 0 0 1 5 0 2.5 2.5 0 0 1 2 4 3 3 0 0 1-.5 5.5H8A3 3 0 0 1 7.5 10.5a2.5 2.5 0 0 1 2-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 7v9" stroke="currentColor" strokeWidth="1.2" opacity=".6" />
    </svg>
  );
}
function IconRadar(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 12l6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 3v9" stroke="currentColor" strokeWidth="1.2" opacity=".6" />
      <path d="M3 12h9" stroke="currentColor" strokeWidth="1.2" opacity=".6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** ---------------------------
 * UI tokens
 * -------------------------- */
const T = {
  // brand accent: green
  accentBg: "bg-emerald-50",
  accentText: "text-emerald-700",
  accentBorder: "border-emerald-100",
  shadow: "shadow-[0_6px_24px_-10px_rgba(2,6,23,0.22)]",
};

function Pill({ children, tone = "slate", className = "" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

function SectionHeader({ icon, title, sub, tone = "slate" }) {
  const toneMap = {
    slate: "text-slate-700 bg-white border-slate-100",
    emerald: "text-emerald-700 bg-white border-emerald-100",
    amber: "text-amber-700 bg-white border-amber-100",
  };
  return (
    <div className="flex items-center gap-4">
      <div className={`grid h-14 w-14 place-items-center rounded-2xl border ${toneMap[tone]} ${T.shadow}`}>
        <div className="h-7 w-7">{icon}</div>
      </div>
      <div className="min-w-0">
        <div className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</div>
        {sub ? <div className="text-xs font-semibold text-slate-500">{sub}</div> : null}
      </div>
    </div>
  );
}

function Module({ children, className = "" }) {
  return (
    <div className={`rounded-[2rem] border border-slate-100 bg-white ${T.shadow} ${className}`}>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-5 h-px w-full bg-slate-100" />;
}

// ---------------------------
// AI text split (keep)
// ---------------------------
function splitExplain(text) {
  const t = (text || "").trim();
  if (!t) return { p1: "", p2: "" };
  const h1 = "いまの体のクセ（今回のまとめ）";
  const h2 = "体調の揺れを予報で先回り（未病レーダー）";
  const normalize = (s) => s.replace(/^#+\s*/gm, "").trim();
  const n = normalize(t);
  const i1 = n.indexOf(h1);
  const i2 = n.indexOf(h2);
  if (i1 === -1 && i2 === -1) return { p1: n, p2: "" };
  if (i1 !== -1 && i2 === -1) return { p1: n.slice(i1 + h1.length).trim() || n, p2: "" };
  if (i1 === -1 && i2 !== -1) return { p1: n, p2: n.slice(i2 + h2.length).trim() || "" };
  const part1 = n.slice(i1 + h1.length, i2).trim();
  const part2 = n.slice(i2 + h2.length).trim();
  const p1 = part1 || n.slice(0, i2).trim();
  const p2 = part2 || n.slice(i2 + h2.length).trim();
  return { p1, p2 };
}

// ✅ Next.js の useSearchParams 対策
export default function ResultPageWrapper({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="space-y-3 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-200 border-r-slate-500" />
            <h1 className="text-xl font-bold text-slate-700">結果を読み込み中…</h1>
          </div>
        </div>
      }
    >
      <ResultPage params={params} />
    </Suspense>
  );
}

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

  // Fetch
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

  // Auto attach (legacy)
  useEffect(() => {
    if (!attachAfterLogin || loadingAuth || !session || !event || event?.notFound) return;
    attachToAccount(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachAfterLogin, loadingAuth, session, event?.id]);

  // AI explain
  useEffect(() => {
    if (!event || event?.notFound || loadingEvent || explainText || explainRequestedRef.current) return;
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="space-y-3 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-200 border-r-slate-500" />
          <h1 className="text-xl font-bold text-slate-700">結果を読み込み中…</h1>
        </div>
      </div>
    );
  }

  if (!event || event?.notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-extrabold text-slate-800">結果が見つかりません</h1>
          <div className="text-slate-600">期限切れ、または削除された可能性があります。</div>
          <Button onClick={() => router.push("/check")}>体質チェックをやり直す</Button>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 pb-16">
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[440px] px-4 pt-6">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/check")}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-3 pr-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span className="text-slate-400 group-hover:text-slate-600 transition">←</span> もどる
          </button>
          <div className="text-sm font-extrabold text-slate-700">未病レーダー</div>
          <div className="w-[88px]" />
        </div>

        <div className="space-y-6">
          {/* Hero */}
          <Module className="relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-50 blur-2xl opacity-70 pointer-events-none" />
            <SectionHeader
              icon={<IconMemo className="h-full w-full" />}
              title="あなたのお悩み"
              sub="チェック時の記録"
              tone="emerald"
            />
            <Divider />
            <div className={`mt-4 rounded-2xl p-5 border ${T.accentBorder} ${T.accentBg} flex items-center justify-between gap-4`}>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight">{symptomLabel}</div>
              <Pill tone="emerald" className="shrink-0">無料閲覧OK</Pill>
            </div>
          </Module>

          {/* Constitution */}
          <Module className="relative overflow-hidden">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-50 blur-2xl opacity-60 pointer-events-none" />
            <SectionHeader
              icon={<IconCompass className="h-full w-full" />}
              title="体質の見立て"
              sub="今回の結果から見える“軸”とポイント"
              tone="emerald"
            />
            <Divider />

            {/* Core */}
            <div className={`relative rounded-[1.5rem] border ${T.accentBorder} bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-6 shadow-sm overflow-hidden`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <Pill tone="emerald">今の体質の軸</Pill>
                <span className="text-xs font-semibold text-slate-500">安定度の目安</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{core.title}</div>
              <div className="mt-3 text-sm leading-7 font-semibold text-slate-700">{core.tcm_hint}</div>
            </div>

            {/* Sub labels */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="text-base font-extrabold text-slate-900">整えポイント（最大2つ）</div>
                <Pill tone="amber">優先度</Pill>
              </div>

              <div className="grid gap-3">
                {subLabels?.length ? (
                  subLabels.map((s) => (
                    <div key={s.title} className="rounded-2xl border border-slate-100 bg-white p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-lg font-extrabold text-slate-900">{s.title}</span>
                        <span className="text-xs font-semibold text-slate-500">({s.short})</span>
                      </div>
                      {s.action_hint ? (
                        <div className="text-sm leading-7 text-slate-700 font-semibold">{s.action_hint}</div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 font-semibold">
                    今回は強い偏りは見られませんでした。
                  </div>
                )}
              </div>
            </div>

            {/* Meridians */}
            <div className="mt-8">
              <div className="text-base font-extrabold text-slate-900 mb-4 px-1">体の張りやすい場所</div>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-5">
                  <div className="text-sm font-extrabold text-slate-800">（主）出やすいサイン</div>
                  {meridianPrimary ? (
                    <>
                      <div className="mt-1 text-lg font-extrabold text-slate-900">{meridianPrimary.title}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
                      </div>
                      <div className="mt-2 text-sm leading-7 text-slate-700 font-semibold">{meridianPrimary.organs_hint}</div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-slate-500 font-semibold">今回は強い偏りなし</div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5">
                  <div className="text-sm font-extrabold text-slate-800">（副）補助ライン</div>
                  {meridianSecondary ? (
                    <>
                      <div className="mt-1 text-lg font-extrabold text-slate-900">{meridianSecondary.title}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
                      </div>
                      <div className="mt-2 text-sm leading-7 text-slate-700 font-semibold">{meridianSecondary.organs_hint}</div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-slate-500 font-semibold">今回は強い偏りなし</div>
                  )}
                </div>
              </div>
            </div>
          </Module>

          {/* AI explain */}
          <Module className="relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-50 blur-2xl opacity-70 pointer-events-none" />
            <div className="flex items-center justify-between gap-2">
              <SectionHeader
                icon={<IconRobot className="h-full w-full" />}
                title="あなたの体質解説"
                sub="トトノウくん（AI）による分析"
                tone="emerald"
              />
              <Pill tone="emerald" className="shrink-0">保存されます</Pill>
            </div>

            <Divider />

            {loadingExplain ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-slate-300 border-r-slate-600 mb-2" />
                <div className="text-sm font-semibold text-slate-600">トトノウくんが書いています…</div>
              </div>
            ) : explainText ? (
              <div className="text-xs text-center text-slate-500 font-semibold mb-4">▼ 以下はAIが生成した解説文です ▼</div>
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-center">
                <div className="text-sm font-semibold text-amber-900 mb-4">
                  {explainError ? `生成エラー: ${explainError}` : "まだ文章がありません。"}
                </div>
                <Button onClick={retryExplain} disabled={loadingExplain}>
                  {loadingExplain ? "生成中…" : "もう一度生成してみる"}
                </Button>
              </div>
            )}

            {explainParts.p1 ? (
              <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-white overflow-hidden">
                <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 border-b border-slate-100">
                  <div className={`h-6 w-6 ${T.accentText}`}><IconBrain className="h-full w-full" /></div>
                  <div className="text-base font-extrabold text-slate-900">いまの体のクセ（まとめ）</div>
                </div>
                <div className="p-6">
                  <div className={`pl-5 border-l-4 border-emerald-200`}>
                    <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800 font-semibold">
                      {explainParts.p1}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {explainParts.p2 ? (
              <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-white overflow-hidden">
                <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 border-b border-slate-100">
                  <div className={`h-6 w-6 ${T.accentText}`}><IconRadar className="h-full w-full" /></div>
                  <div className="text-base font-extrabold text-slate-900">体調の揺れ予報（未病レーダー）</div>
                </div>
                <div className="p-6">
                  <div className={`pl-5 border-l-4 border-emerald-200`}>
                    <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800 font-semibold">
                      {explainParts.p2}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {explainText && !explainParts.p2 && !explainParts.p1 ? (
              <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-white p-6">
                <div className="pl-5 border-l-4 border-slate-200">
                  <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800 font-semibold">{explainText}</div>
                </div>
              </div>
            ) : null}

            {(explainCreatedAt || explainModel) ? (
              <div className="mt-4 text-right text-xs font-semibold text-slate-400">
                生成:{" "}
                {explainCreatedAt
                  ? new Date(explainCreatedAt).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })
                  : ""}
                {explainModel ? ` (model: ${explainModel})` : ""}
              </div>
            ) : null}
          </Module>

          {/* CTA */}
          <Module className="relative overflow-hidden ring-4 ring-emerald-50 ring-offset-2">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-50 blur-2xl opacity-70 pointer-events-none" />
            <SectionHeader
              icon={<IconBolt className="h-full w-full" />}
              title="次の一歩（おすすめ）"
              sub="結果を保存して、今日の対策へ"
              tone="emerald"
            />
            <Divider />

            {loadingAuth ? (
              <div className="py-4 text-center text-sm text-slate-500 font-semibold">ログイン状態を確認中…</div>
            ) : isLoggedIn ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-5">
                  <div className="text-sm text-slate-800">
                    ログイン中：<span className="font-extrabold">{session.user?.email}</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">今日の「予報と対策」は無料で見られます。</div>
                </div>

                {isAttached ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-base font-extrabold text-emerald-900">
                    この結果は保存済みです ✅
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-base font-extrabold text-slate-900 text-center">
                      この結果を保存して、<br />今日の未病レーダーへ進みましょう。
                    </p>
                    <Button onClick={() => attachToAccount(false)} disabled={attaching} className="w-full">
                      {attaching ? "保存して移動中…" : "保存して、今日の対策を見る（無料）"}
                    </Button>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={() => router.push("/radar")}>
                    今日の予報へ移動
                  </Button>
                  <Button variant="ghost" onClick={() => router.push("/check")}>
                    もう一度チェック
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-6 border border-emerald-100 text-center mb-6 shadow-sm">
                  <div className="text-lg font-extrabold text-slate-900 mb-2">
                    無料で結果を保存して、<br />今日の「予報と対策」へ。
                  </div>
                  <div className="text-sm font-semibold text-slate-600">
                    ※登録だけでは課金されません（無料の範囲で使えます）
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button onClick={goSignupToRadar} className="w-full">
                    無料で保存して始める
                  </Button>
                  <Button variant="secondary" onClick={goLoginToRadar} className="w-full">
                    すでに登録済みの方（ログイン）
                  </Button>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => router.push("/check")}
                    className="text-sm font-extrabold text-slate-500 hover:text-slate-700 transition underline underline-offset-4"
                  >
                    保存せずにもう一度チェックする
                  </button>
                </div>
              </>
            )}
          </Module>
        </div>

        <div className="mt-8 text-center text-xs font-semibold text-slate-400">
          診断作成日時：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
          <br />
          ID: {String(id).slice(0, 8)}...
        </div>
      </div>
    </div>
  );
}
