// app/result/[id]/page.js
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";     // ※既存コンポーネントがあれば使用、なければ下部のスタイルが適用されます
import Button from "@/components/ui/Button"; // ※既存コンポーネントを使用
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

// ------------------------------------------------------------------
// Main Export & Suspense Wrapper
// ------------------------------------------------------------------
export default function ResultPageWrapper({ params }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mb-4 text-3xl animate-pulse">📡</div>
            <h1 className="text-lg font-semibold text-slate-700">結果を分析中...</h1>
            <p className="text-sm text-slate-500 mt-2">AIがあなたの体質を読み解いています</p>
          </div>
        </div>
      }
    >
      <ResultPage params={params} />
    </Suspense>
  );
}

// ------------------------------------------------------------------
// UI Components (Local for luxurious styling)
// ------------------------------------------------------------------

function Pill({ children, tone = "slate", className = "" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

function SectionIcon({ icon, color = "bg-slate-100" }) {
  return (
    <div className={`grid h-10 w-10 place-items-center rounded-2xl ${color} text-lg shadow-sm border border-white/50`}>
      {icon}
    </div>
  );
}

function Module({ children, className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${className}`}>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-5 h-px w-full bg-slate-100" />;
}

// ------------------------------------------------------------------
// Logic Helper: Split AI Text
// ------------------------------------------------------------------
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

  return { 
    p1: part1 || n.slice(0, i2).trim(), 
    p2: part2 || n.slice(i2 + h2.length).trim() 
  };
}

// ------------------------------------------------------------------
// Main Page Component
// ------------------------------------------------------------------
function ResultPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = params;

  // --- States ---
  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [attaching, setAttaching] = useState(false);
  const [toast, setToast] = useState("");

  // --- AI States ---
  const [explainText, setExplainText] = useState("");
  const [explainModel, setExplainModel] = useState("");
  const [explainCreatedAt, setExplainCreatedAt] = useState("");
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainError, setExplainError] = useState("");
  const explainRequestedRef = useRef(false);

  const attachAfterLogin = searchParams?.get("attach") === "1";

  // --- Auth & Data Fetching ---
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

        // Load existing explanation
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
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (!attachAfterLogin) return;
    if (loadingAuth) return;
    if (!session) return;
    if (!event || event?.notFound) return;
    attachToAccount(true);
  }, [attachAfterLogin, loadingAuth, session, event?.id]);

  // --- Auto Generate AI Explain ---
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

  // --- Computed Values ---
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

  // --- Actions ---
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
    router.push(`/signup?result=${encodeURIComponent(id)}&next=${encodeURIComponent(`/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`)}`);
  }
  function goLoginToRadar() {
    router.push(`/login?result=${encodeURIComponent(id)}&next=${encodeURIComponent(`/radar?saved=1&from_result=1&result=${encodeURIComponent(id)}`)}`);
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  
  if (loadingEvent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500"></div>
        <div className="text-sm font-medium text-slate-600">結果を読み込んでいます...</div>
      </div>
    );
  }

  if (!event || event?.notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <h1 className="mb-2 text-xl font-bold text-slate-800">結果が見つかりません 😢</h1>
          <p className="mb-6 text-sm text-slate-500">期限切れ、または削除された可能性があります。</p>
          <Button onClick={() => router.push("/check")}>もう一度診断する</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FC] pb-24">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed left-1/2 top-6 z-50 w-[90%] max-w-sm -translate-x-1/2 transform rounded-2xl bg-slate-900/90 px-6 py-3 text-center text-sm font-medium text-white shadow-2xl backdrop-blur-md transition-all">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-md px-4 pt-6">
        
        {/* Header Navigation */}
        <nav className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push("/check")}
            className="group flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all active:scale-95"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">←</span>
            戻る
          </button>
          <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">UNBYO RADAR</span>
        </nav>

        {/* 1. Hero / Core Result Section */}
        <section className="space-y-4">
          <Module className="bg-gradient-to-br from-white to-slate-50">
            <div className="flex items-start justify-between">
              <div>
                <Pill tone="blue" className="mb-3">今回のお悩み</Pill>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                  {symptomLabel}
                </h2>
              </div>
              <div className="text-4xl">🤔</div>
            </div>
            
            <Divider />

            <div>
              <div className="flex items-center gap-2 mb-2">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DIAGNOSIS RESULT</span>
              </div>
              
              {/* Core Type Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg transition-transform hover:scale-[1.01]">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="text-xs font-medium text-slate-300 mb-1">あなたの体質の「軸」</div>
                  <div className="text-3xl font-bold tracking-tight mb-3 text-white">
                    {core.title}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed opacity-90">
                    {core.tcm_hint}
                  </p>
                </div>
              </div>
            </div>
          </Module>

          {/* 2. Sub Labels & Action Points */}
          <div className="grid grid-cols-1 gap-3">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-slate-900">整えるポイント</h3>
                <span className="text-xs text-slate-500">優先度順</span>
             </div>

             {subLabels?.length > 0 ? (
               subLabels.map((s, i) => (
                <div key={s.title} className="flex flex-col gap-2 rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                          {i + 1}
                        </span>
                        <h4 className="font-bold text-slate-800">{s.title}</h4>
                      </div>
                      <span className="text-xs font-medium text-slate-400">{s.short}</span>
                   </div>
                   {s.action_hint && (
                     <div className="mt-1 ml-8 rounded-xl bg-amber-50/50 p-3 text-sm leading-relaxed text-amber-900">
                       {s.action_hint}
                     </div>
                   )}
                </div>
               ))
             ) : (
                <div className="rounded-3xl bg-white p-6 text-center text-sm text-slate-500 border border-slate-100 border-dashed">
                  今回は特筆すべき偏りはありませんでした ✨
                </div>
             )}
          </div>
        </section>

        {/* 3. AI Analysis Section (Bento Grid style) */}
        <section className="mt-8 space-y-4">
          <div className="flex items-center gap-2 px-2">
             <div className="h-1 w-1 rounded-full bg-emerald-500"></div>
             <h3 className="text-sm font-bold text-slate-900">AI トトノウくんの分析</h3>
          </div>

          <div className="space-y-3">
            {loadingExplain ? (
              <Module className="animate-pulse">
                <div className="h-4 w-3/4 rounded bg-slate-100 mb-3"></div>
                <div className="h-4 w-full rounded bg-slate-100 mb-2"></div>
                <div className="h-4 w-5/6 rounded bg-slate-100"></div>
              </Module>
            ) : explainError ? (
               <Module className="border-red-100 bg-red-50">
                 <p className="text-red-600 text-sm mb-3">解説の生成に失敗しました。</p>
                 <Button size="sm" onClick={retryExplain} variant="outline" className="bg-white">再試行する</Button>
               </Module>
            ) : (
              <>
                 {/* Part 1: Current State */}
                 {explainParts.p1 && (
                   <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100">
                     <div className="mb-4 flex items-center gap-3">
                        <SectionIcon icon="🧠" color="bg-indigo-50 text-indigo-600" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">今の体のクセ</h4>
                          <p className="text-[10px] text-slate-400">今回の診断まとめ</p>
                        </div>
                     </div>
                     <div className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                       {explainParts.p1}
                     </div>
                   </div>
                 )}

                 {/* Part 2: Future Forecast */}
                 {explainParts.p2 && (
                   <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-emerald-100 ring-4 ring-emerald-50/50">
                     <div className="mb-4 flex items-center gap-3">
                        <SectionIcon icon="🔮" color="bg-emerald-100 text-emerald-600" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">未病予報</h4>
                          <p className="text-[10px] text-slate-400">これからの対策</p>
                        </div>
                     </div>
                     <div className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                       {explainParts.p2}
                     </div>
                   </div>
                 )}
                 
                 {/* Fallback for unstructured text */}
                 {(!explainParts.p1 && !explainParts.p2 && explainText) && (
                    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                      <div className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                        {explainText}
                      </div>
                    </div>
                 )}
              </>
            )}
          </div>
        </section>

        {/* 4. Body Map / Meridians (Grid Layout) */}
        <section className="mt-8">
           <div className="flex items-center gap-2 px-2 mb-3">
             <h3 className="text-sm font-bold text-slate-900">体のサインが出やすい場所</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             {/* Primary */}
             <div className="col-span-1 rounded-3xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase">PRIMARY</div>
                  <div className="text-lg font-bold text-slate-800 leading-tight">
                    {meridianPrimary ? meridianPrimary.title : "特になし"}
                  </div>
                </div>
                {meridianPrimary && (
                   <div className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                     {meridianPrimary.body_area}
                   </div>
                )}
             </div>
             
             {/* Secondary */}
             <div className="col-span-1 rounded-3xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between opacity-80">
                <div>
                  <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase">SECONDARY</div>
                  <div className="text-sm font-bold text-slate-700 leading-tight">
                    {meridianSecondary ? meridianSecondary.title : "なし"}
                  </div>
                </div>
                {meridianSecondary && (
                   <div className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                     {meridianSecondary.body_area}
                   </div>
                )}
             </div>
          </div>
        </section>

        {/* 5. CTA Section (Sticky Bottom friendly design) */}
        <section className="mt-10 mb-6">
           <Module className="bg-gradient-to-b from-slate-900 to-slate-800 text-white border-none ring-4 ring-slate-200 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                 <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl backdrop-blur-sm">⚡️</div>
                 <div>
                   <h3 className="font-bold text-white">次の一歩（おすすめ）</h3>
                   <p className="text-xs text-slate-300">結果を保存して継続ケア</p>
                 </div>
              </div>

              {loadingAuth ? (
                 <div className="h-10 w-full animate-pulse rounded-xl bg-white/10"></div>
              ) : isLoggedIn ? (
                 <div className="space-y-4">
                    <p className="text-sm text-slate-300">
                       ログイン中：<span className="text-white font-medium">{session.user?.email}</span>
                    </p>
                    
                    {isAttached ? (
                       <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/50 p-3 text-center text-sm font-bold text-emerald-300">
                          保存済みです ✅
                       </div>
                    ) : (
                       <Button 
                         onClick={() => attachToAccount(false)} 
                         disabled={attaching}
                         className="w-full bg-white text-slate-900 hover:bg-slate-100 border-none font-bold"
                       >
                         {attaching ? "保存中..." : "結果を保存する（無料）"}
                       </Button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                       <button onClick={() => router.push("/radar")} className="rounded-xl bg-white/10 py-3 text-xs font-bold text-white hover:bg-white/20 transition-colors">
                          今日の予報を見る
                       </button>
                       <button onClick={() => router.push("/check")} className="rounded-xl bg-transparent border border-white/20 py-3 text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors">
                          再チェック
                       </button>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-slate-300">
                       今の状態を保存して、日々の変化を記録しませんか？<br/>
                       <span className="text-xs opacity-70">※無料でご利用いただけます</span>
                    </p>
                    
                    <Button 
                      onClick={goSignupToRadar}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-white border-none font-bold shadow-lg shadow-emerald-900/20"
                    >
                      保存してスタート（無料）
                    </Button>
                    
                    <button 
                       onClick={goLoginToRadar} 
                       className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors"
                    >
                       すでにアカウントをお持ちの方はこちら
                    </button>
                 </div>
              )}
           </Module>
        </section>

        <div className="text-center pb-8">
           <p className="text-[10px] text-slate-400">
             Diagnosis ID: {id?.slice(0, 8)}... <br/>
             {event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : ""}
           </p>
        </div>

      </div>
    </div>
  );
}
