// app/result/[id]/page.js
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image"; // ✅ next/image を導入
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

// --- 開発用ダミー画像URL ---
// 本番画像に差し替える際は、publicフォルダに置いて import staticImage from '...' がベストです
const DUMMY_IMAGES = {
  memo: "https://placehold.co/96x96/f1f5f9/475569?text=Memo&font=roboto", // Slate
  compass: "https://placehold.co/96x96/ecfdf5/047857?text=Compass&font=roboto", // Emerald
  robot: "https://placehold.co/96x96/f0fdf4/15803d?text=AI&font=roboto", // Green
  lightning: "https://placehold.co/96x96/fffbeb/b45309?text=Action&font=roboto", // Amber
  corePlaceholder: "https://placehold.co/320x320/f8fafc/94a3b8?text=Core+Image",
  pointIcon: "https://placehold.co/64x64/fff7ed/ea580c?text=!", 
  bodyIconMain: "https://placehold.co/64x64/f0fdfa/0d9488?text=Main",
  bodyIconSub: "https://placehold.co/64x64/f8fafc/64748b?text=Sub",
  brainSmall: "https://placehold.co/48x48/f0fdf4/166534?text=Brain",
  radarSmall: "https://placehold.co/48x48/f0f9ff/0369a1?text=Radar",
};

export default function ResultPageWrapper({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="space-y-3 text-center">
             <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-200 border-r-emerald-600 align-[-0.125em]"></div>
            <h1 className="text-xl font-bold text-slate-700">結果を読み込み中…</h1>
          </div>
        </div>
      }
    >
      <ResultPage params={params} />
    </Suspense>
  );
}

/** ---------------------------
 * UI Components (Green Brand Unified)
 * -------------------------- */

// 配色を「ブランドカラー(Green)」中心に再定義
function Pill({ children, tone = "default", className = "" }) {
  const tones = {
    default: "bg-slate-100 text-slate-600 border border-slate-200", // 通常
    brand: "bg-emerald-50 text-emerald-700 border border-emerald-100", // 推奨・メイン
    accent: "bg-amber-50 text-amber-700 border border-amber-100", // 注意・強調
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tones[tone] || tones.default} ${className}`}>
      {children}
    </span>
  );
}

function SectionHeader({ iconUrl, title, sub }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {/* ✅ next/image の使用 */}
        <Image src={iconUrl} alt={title} width={48} height={48} className="object-contain p-1" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold text-slate-800 tracking-tight">{title}</div>
        {sub ? <div className="text-xs font-medium text-slate-500">{sub}</div> : null}
      </div>
    </div>
  );
}

function Module({ children, className = "", noPadding = false }) {
  return (
    <div className={`rounded-[1.5rem] border border-slate-100 bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] ${className}`}>
      <div className={noPadding ? "" : "p-5 sm:p-6"}>{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-5 h-px w-full bg-slate-100" />;
}

// ---------------------------
// AI Logic (Keep as is)
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

// ---------------------------
// Main Component
// ---------------------------
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
  const [explainText, setExplainText] = useState("");
  const [explainModel, setExplainModel] = useState("");
  const [explainCreatedAt, setExplainCreatedAt] = useState("");
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainError, setExplainError] = useState("");
  const explainRequestedRef = useRef(false);
  const attachAfterLogin = searchParams?.get("attach") === "1";

  // --- Effects (Logic unchanged) ---
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
        const t = json.data?.ai_explain_text || "";
        if (t) {
          setExplainText(t);
          setExplainModel(json.data?.ai_explain_model || "");
          setExplainCreatedAt(json.data?.ai_explain_created_at || "");
        }
      } catch (e) {
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
    if (!attachAfterLogin || loadingAuth || !session || !event || event?.notFound) return;
    attachToAccount(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachAfterLogin, loadingAuth, session, event?.id]);

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

  // --- Computed ---
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

  // --- Loading / Not Found ---
  if (loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="space-y-3 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-200 border-r-emerald-500 align-[-0.125em]"></div>
          <h1 className="text-xl font-bold text-slate-700">結果を読み込み中…</h1>
        </div>
      </div>
    );
  }
  if (!event || event?.notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-slate-800">結果が見つかりません</h1>
          <Button onClick={() => router.push("/check")}>体質チェックをやり直す</Button>
        </div>
      </div>
    );
  }

  // --- Main UI (Green Brand Optimized) ---
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium shadow-lg text-slate-700 flex items-center gap-2">
          <span className="text-lg">ℹ️</span> {toast}
        </div>
      )}

      <div className="mx-auto w-full max-w-[440px] px-4 pt-6">
        {/* Nav */}
        <div className="mb-6 flex items-center justify-between relative z-10">
          <button
            onClick={() => router.push("/check")}
            className="group inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 pl-3 pr-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-100"
          >
            ← もどる
          </button>
          <div className="text-sm font-bold text-slate-500 tracking-wider">UNBYO RADAR</div>
          <div className="w-[76px]" />
        </div>

        <div className="space-y-6">
          
          {/* 1. Hero: お悩み (Neutral/Slate) */}
          <Module>
            <SectionHeader iconUrl={DUMMY_IMAGES.memo} title="あなたのお悩み" sub="チェック時の記録" />
            <Divider />
            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-5 border border-slate-100">
              <div className="text-xl font-bold text-slate-800 tracking-tight">{symptomLabel}</div>
              <Pill tone="default">閲覧中</Pill>
            </div>
          </Module>

          {/* 2. Core: 体質 (Brand Green/Emerald) */}
          <Module className="relative overflow-hidden border-emerald-100/50">
             {/* 背景に薄いグリーンのグラデーション */}
             <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/50 opacity-60 pointer-events-none" />
            
            <div className="relative z-10">
              <SectionHeader iconUrl={DUMMY_IMAGES.compass} title="体質の見立て" sub="あなたの身体の「軸」" />
              <Divider />

              {/* Core Result */}
              <div className="relative rounded-3xl border border-emerald-100 bg-white/80 p-6 shadow-sm overflow-hidden">
                {/* 背景画像 (Next/Imageで薄く配置) */}
                <div className="absolute right-[-20px] bottom-[-20px] w-40 h-40 opacity-10 pointer-events-none">
                  <Image src={DUMMY_IMAGES.corePlaceholder} alt="" width={160} height={160} className="object-contain" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Pill tone="brand">今の体質タイプ</Pill>
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-950 tracking-tight leading-tight mb-3">
                    {core.title}
                  </div>
                  <div className="text-sm leading-7 text-slate-700 font-medium">
                    {core.tcm_hint}
                  </div>
                </div>
              </div>

              {/* Sub Points (Tone down colors) */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="text-base font-bold text-slate-800">整えポイント</div>
                  <Pill tone="accent">優先度高</Pill>
                </div>

                <div className="grid gap-3">
                  {subLabels?.length ? (
                    subLabels.map((s) => (
                      <div key={s.title} className="flex gap-4 rounded-2xl border border-amber-100 bg-amber-50/30 p-5">
                        <div className="shrink-0 pt-1">
                          <Image src={DUMMY_IMAGES.pointIcon} alt="" width={32} height={32} className="object-contain opacity-80" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-slate-800">{s.title}</span>
                          </div>
                          {s.action_hint && (
                            <div className="text-sm leading-6 text-slate-600">{s.action_hint}</div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      特筆すべき偏りはありません。
                    </div>
                  )}
                </div>
              </div>

              {/* Meridians (Simple Cards) */}
              <div className="mt-8">
                <div className="text-base font-bold text-slate-800 mb-4 px-1">サインが出やすい場所</div>
                <div className="grid gap-3">
                  {[meridianPrimary, meridianSecondary].map((m, idx) => {
                    if (!m) return null;
                    const isMain = idx === 0;
                    return (
                      <div key={m.title} className={`rounded-2xl border p-5 flex gap-4 ${isMain ? "bg-teal-50/30 border-teal-100" : "bg-slate-50/50 border-slate-100"}`}>
                         <div className="shrink-0 pt-1">
                           <Image 
                             src={isMain ? DUMMY_IMAGES.bodyIconMain : DUMMY_IMAGES.bodyIconSub} 
                             alt="" width={40} height={40} className="object-contain" 
                           />
                         </div>
                         <div className="min-w-0 flex-1">
                           <div className="text-xs font-bold text-slate-400 mb-1">{isMain ? "MAIN" : "SUB"}</div>
                           <div className="text-lg font-bold text-slate-800">{m.title}</div>
                           <div className="mt-1 text-sm text-slate-600">{m.body_area}</div>
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Module>

          {/* 3. AI Analysis (Smart/Neutral Green) */}
          <Module>
            <div className="flex items-center justify-between gap-2">
              <SectionHeader iconUrl={DUMMY_IMAGES.robot} title="AI分析レポート" sub="トトノウくんの解説" />
              <Pill tone="brand">保存対象</Pill>
            </div>
            <Divider />

            {loadingExplain ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center border border-slate-100">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 mb-2" />
                <div className="text-sm text-slate-500">解説を生成しています...</div>
              </div>
            ) : explainText ? (
              <div className="space-y-4">
                {explainParts.p1 && (
                  <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100">
                    <div className="flex items-center gap-2 mb-4 text-emerald-800 font-bold text-sm uppercase tracking-wider">
                      <Image src={DUMMY_IMAGES.brainSmall} alt="" width={20} height={20} />
                      Summary
                    </div>
                    <div className="text-sm leading-8 text-slate-700 whitespace-pre-wrap">
                      {explainParts.p1}
                    </div>
                  </div>
                )}
                {explainParts.p2 && (
                  <div className="rounded-2xl bg-emerald-50/40 p-6 border border-emerald-100">
                     <div className="flex items-center gap-2 mb-4 text-teal-800 font-bold text-sm uppercase tracking-wider">
                      <Image src={DUMMY_IMAGES.radarSmall} alt="" width={20} height={20} />
                      Forecast
                    </div>
                    <div className="text-sm leading-8 text-slate-800 whitespace-pre-wrap">
                      {explainParts.p2}
                    </div>
                  </div>
                )}
                {(!explainParts.p1 && !explainParts.p2) && (
                   <div className="text-sm leading-8 text-slate-700 whitespace-pre-wrap">{explainText}</div>
                )}
              </div>
            ) : (
               <div className="text-center py-6">
                 <div className="text-sm text-slate-500 mb-4">{explainError || "解説がありません"}</div>
                 <Button onClick={retryExplain} variant="secondary">再生成する</Button>
               </div>
            )}
          </Module>

          {/* 4. Action (Strong Green Gradient) */}
          <Module className="relative overflow-hidden ring-1 ring-emerald-100">
            <SectionHeader iconUrl={DUMMY_IMAGES.lightning} title="次のアクション" sub="対策を保存してスタート" />
            <Divider />
            
            {loadingAuth ? (
               <div className="py-4 text-center text-sm text-slate-400">Loading...</div>
            ) : isLoggedIn ? (
              <>
                 <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    ログイン中: <span className="font-bold text-slate-800">{session.user?.email}</span>
                 </div>
                 {isAttached ? (
                   <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center text-emerald-800 font-bold mb-4">
                     ✅ 保存済みです
                   </div>
                 ) : (
                   <Button onClick={() => attachToAccount(false)} disabled={attaching} className="w-full mb-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
                     {attaching ? "保存中..." : "結果を保存して対策を見る"}
                   </Button>
                 )}
                 <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={() => router.push("/radar")}>今日の予報</Button>
                    <Button variant="ghost" onClick={() => router.push("/check")}>再チェック</Button>
                 </div>
              </>
            ) : (
              <div className="text-center">
                 <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-5 mb-5">
                   <p className="font-bold text-emerald-900 mb-1">無料で結果を保存できます</p>
                   <p className="text-xs text-emerald-700">毎日の予報機能もずっと無料です</p>
                 </div>
                 <Button onClick={goSignupToRadar} className="w-full mb-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 border-0">
                   無料で保存して始める
                 </Button>
                 <Button variant="ghost" onClick={goLoginToRadar} className="w-full text-slate-500">
                   ログインはこちら
                 </Button>
              </div>
            )}
          </Module>
          
          <div className="mt-8 text-center pb-8">
             <button onClick={() => router.push("/check")} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition">
               トップに戻る
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}
