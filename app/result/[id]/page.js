// app/result/[id]/page.js
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card"; // ※既存のCardがどのようなものか不明ですが、今回は下のModuleで代用します
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

// --- 開発用ダミー画像URL（本番では適切なアセットに置き換えてください） ---
const DUMMY_IMAGES = {
  // Section Headers
  memo: "https://placehold.co/96x96/e0f2fe/0284c7?text=Memo&font=roboto", // 薄青
  compass: "https://placehold.co/96x96/ffedd5/c2410c?text=Compass&font=roboto", // 薄オレンジ
  robot: "https://placehold.co/96x96/dcfce7/15803d?text=AI&font=roboto", // 薄緑
  lightning: "https://placehold.co/96x96/fef9c3/854d0e?text=Action&font=roboto", // 薄黄
  // Core Identity
  corePlaceholder: "https://placehold.co/160x160/f8fafc/64748b?text=Core+Image",
  // Sub Items
  pointIcon: "https://placehold.co/48x48/fff7ed/ea580c?text=Point",
  bodyIconMain: "https://placehold.co/64x64/fee2e2/dc2626?text=Main",
  bodyIconSub: "https://placehold.co/64x64/ffedd5/ea580c?text=Sub",
  // AI Parts
  brainSmall: "https://placehold.co/48x48/f3e8ff/7e22ce?text=Brain",
  radarSmall: "https://placehold.co/48x48/ecfdf5/059669?text=Radar",
};

// ✅ Next.js の useSearchParams 対策
export default function ResultPageWrapper({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="space-y-3 text-center">
             {/* ローディングも少しリッチに */}
             <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-200 border-r-slate-500 align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
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
 * UI helpers (Upgraded)
 * -------------------------- */
function Pill({ children, tone = "slate", className = "" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    indigo: "bg-indigo-100 text-indigo-800",
  };
  // ボーダーをなくし、少しフラットでモダンな印象に
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

// 画像URLを受け取るように変更し、デザインをリッチ化
function SectionHeader({ iconUrl, title, sub }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden shrink-0">
        <img src={iconUrl} alt={title} className="h-10 w-10 object-contain" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold text-slate-900 tracking-tight">{title}</div>
        {sub ? <div className="text-xs font-medium text-slate-500">{sub}</div> : null}
      </div>
    </div>
  );
}

// 影を強くし、角丸を大きくした豪華なカードコンテナ
function Module({ children, className = "" }) {
  return (
    <div className={`rounded-[2rem] border border-slate-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] ${className}`}>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-5 h-px w-full bg-slate-100" />;
}

// ---------------------------
// AI text split logic (そのま維持)
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

  // --- Hooks (ロジックそのまま) ---
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

  // --- Derived data ---
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

  // --- UI States ---
  if (loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="space-y-3 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-200 border-r-slate-500 align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
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
          <div className="text-slate-600">
            期限切れ、または削除された可能性があります。<br/>もう一度チェックをお試しください。
          </div>
          <div className="mt-6">
            <Button onClick={() => router.push("/check")}>体質チェックをやり直す</Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // Main UI (豪華版)
  // ---------------------------
  return (
    // 背景を少しリッチなグラデーションに
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 pb-16">
      {/* toast */}
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium shadow-lg">
          {toast}
        </div>
      ) : null}

      {/* Main container */}
      <div className="mx-auto w-full max-w-[440px] px-4 pt-6">
        {/* Top Navigation bar */}
        <div className="mb-6 flex items-center justify-between relative z-10">
          <button
            type="button"
            onClick={() => router.push("/check")}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-3 pr-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span className="text-slate-400 group-hover:text-slate-600 transition">←</span> もどる
          </button>
          <div className="text-sm font-bold text-slate-700">未病レーダー</div>
          <div className="w-[88px]" /> {/* balance spacer */}
        </div>

        <div className="space-y-6">
          {/* 1. Hero module (お悩み) */}
          <Module className="relative overflow-hidden">
            {/* 背景装飾 */}
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-blue-50 opacity-50 blur-2xl pointer-events-none"></div>
            
            <SectionHeader iconUrl={DUMMY_IMAGES.memo} title="あなたのお悩み" sub="チェック時の記録" />
            <Divider />
            <div className="mt-4 rounded-2xl bg-indigo-50/60 p-5 border border-indigo-100 flex items-center justify-between gap-4 relative z-10">
              <div className="text-xl font-bold text-indigo-900 tracking-tight">{symptomLabel}</div>
              <Pill tone="indigo" className="shrink-0">無料閲覧OK</Pill>
            </div>
          </Module>

          {/* 2. Constitution module (体質) */}
          <Module className="relative overflow-hidden">
             <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-orange-50 opacity-50 blur-2xl pointer-events-none"></div>
            <SectionHeader iconUrl={DUMMY_IMAGES.compass} title="体質の見立て" sub="今回の結果から見える“軸”とポイント" />
            <Divider />

            {/* Core panel (リッチ化) */}
            <div className="relative rounded-[1.5rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6 shadow-sm overflow-hidden z-10">
              {/* Core用ダミーイラスト（背景として配置） */}
              <img src={DUMMY_IMAGES.corePlaceholder} alt="" className="absolute right-0 bottom-0 h-32 w-32 object-contain opacity-20 pointer-events-none -mr-4 -mb-4" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Pill tone="slate">今の体質の軸</Pill>
                  <span className="text-xs font-medium text-slate-500">安定度の目安</span>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{core.title}</div>
                <div className="mt-3 text-sm leading-7 font-medium text-slate-700">{core.tcm_hint}</div>
              </div>
            </div>

            {/* Sub labels (カードリスト化) */}
            <div className="mt-8 relative z-10">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="text-base font-bold text-slate-900">整えポイント（最大2つ）</div>
                <Pill tone="amber">優先度</Pill>
              </div>

              <div className="grid gap-3">
                {subLabels?.length ? (
                  subLabels.map((s) => (
                    <div key={s.title} className="flex gap-4 rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
                      {/* アイコン追加 */}
                      <div className="shrink-0">
                        <img src={DUMMY_IMAGES.pointIcon} alt="" className="h-10 w-10 rounded-full bg-amber-100 p-1.5 object-contain" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-lg font-bold text-slate-900">{s.title}</span>
                          <span className="text-xs font-medium text-slate-500">({s.short})</span>
                        </div>
                        {s.action_hint ? (
                          <div className="text-sm leading-6 text-slate-700 font-medium">{s.action_hint}</div>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 font-medium">
                    今回は強い偏りは見られませんでした。<br/>バランスが良い状態です。
                  </div>
                )}
              </div>
            </div>

            {/* Meridians (カード化) */}
            <div className="mt-8 relative z-10">
              <div className="text-base font-bold text-slate-900 mb-4 px-1">体の張りやすい場所</div>

              <div className="grid gap-3">
                {/* Primary */}
                <div className="rounded-2xl border border-red-100 bg-red-50/30 p-5 flex gap-4">
                  <div className="shrink-0">
                    <img src={DUMMY_IMAGES.bodyIconMain} alt="Main" className="h-12 w-12 object-contain rounded-xl bg-red-100 p-1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-bold text-red-900">（主）出やすいサイン</div>
                    </div>
                    {meridianPrimary ? (
                      <>
                        <div className="text-lg font-bold text-slate-900">{meridianPrimary.title}</div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">{meridianPrimary.organs_hint}</div>
                      </>
                    ) : (
                      <div className="mt-1 text-sm text-slate-500 font-medium">今回は強い偏りなし</div>
                    )}
                  </div>
                </div>

                {/* Secondary */}
                 <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-5 flex gap-4">
                  <div className="shrink-0">
                    <img src={DUMMY_IMAGES.bodyIconSub} alt="Sub" className="h-12 w-12 object-contain rounded-xl bg-orange-100 p-1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-bold text-orange-900">（副）補助ライン</div>
                    </div>
                    {meridianSecondary ? (
                      <>
                        <div className="text-lg font-bold text-slate-900">{meridianSecondary.title}</div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">{meridianSecondary.organs_hint}</div>
                      </>
                    ) : (
                      <div className="mt-1 text-sm text-slate-500 font-medium">今回は強い偏りなし</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Module>

          {/* 3. AI explain module */}
          <Module className="relative overflow-hidden">
             <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-green-50 opacity-50 blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between gap-2 relative z-10">
              <SectionHeader iconUrl={DUMMY_IMAGES.robot} title="あなたの体質解説" sub="トトノウくん（AI）による分析" />
              <Pill tone="emerald" className="shrink-0">保存されます</Pill>
            </div>
            <Divider />

            <div className="relative z-10">
              {loadingExplain ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
                   <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-slate-300 border-r-slate-600 align-[-0.125em] mb-2"></div>
                  <div className="text-sm font-medium text-slate-600">トトノウくんが一生懸命書いています…</div>
                </div>
              ) : explainText ? (
                // 解説が生成済みの場合の表示（ここはシンプルに）
                 <div className="text-xs text-center text-slate-500 mb-4">
                  ▼ 以下はAIが生成した解説文です ▼
                </div>
              ) : (
                // エラー時
                <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
                  <div className="text-sm font-medium text-red-800 mb-4">
                    {explainError ? `生成エラー: ${explainError}` : "まだ文章がありません。"}
                  </div>
                  <Button onClick={retryExplain} disabled={loadingExplain} variant="secondary">
                    {loadingExplain ? "生成中…" : "もう一度生成してみる"}
                  </Button>
                </div>
              )}
            </div>

            {/* AI Part 1 (まとめ) */}
            {explainParts.p1 ? (
              <div className="mt-6 rounded-[1.5rem] border border-purple-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between bg-purple-50/50 px-6 py-4 border-b border-purple-50">
                  <div className="flex items-center gap-3">
                    <img src={DUMMY_IMAGES.brainSmall} alt="" className="h-6 w-6 object-contain" />
                    <div className="text-base font-bold text-purple-900">いまの体のクセ（まとめ）</div>
                  </div>
                </div>
                <div className="p-6 bg-white">
                  {/* 引用風のデザイン */}
                  <div className="pl-5 border-l-4 border-purple-200">
                    <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800 font-medium">
                      {explainParts.p1}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* AI Part 2 (予報) */}
            {explainParts.p2 ? (
              <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between bg-emerald-50/50 px-6 py-4 border-b border-emerald-50">
                  <div className="flex items-center gap-3">
                    <img src={DUMMY_IMAGES.radarSmall} alt="" className="h-6 w-6 object-contain" />
                    <div className="text-base font-bold text-emerald-900">体調の揺れ予報（未病レーダー）</div>
                  </div>
                </div>
                <div className="p-6 bg-white">
                  <div className="pl-5 border-l-4 border-emerald-200">
                    <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800 font-medium">
                      {explainParts.p2}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* fallback (分割できなかった場合) */}
            {explainText && !explainParts.p2 && !explainParts.p1 ? (
               <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-white shadow-sm p-6">
                <div className="pl-5 border-l-4 border-slate-200">
                  <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800 font-medium">{explainText}</div>
                </div>
              </div>
            ) : null}

            {(explainCreatedAt || explainModel) ? (
              <div className="mt-4 text-right text-xs font-medium text-slate-400">
                生成: {explainCreatedAt ? new Date(explainCreatedAt).toLocaleString("ja-JP", {dateStyle:"short", timeStyle:"short"}) : ""}
                {explainModel ? ` (model: ${explainModel})` : ""}
              </div>
            ) : null}
          </Module>

          {/* 4. CTA module (アクション) */}
          <Module className="relative overflow-hidden ring-4 ring-yellow-50 ring-offset-2">
             <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-yellow-50 opacity-70 blur-2xl pointer-events-none"></div>
            <SectionHeader iconUrl={DUMMY_IMAGES.lightning} title="次の一歩（おすすめ）" sub="結果を保存して、今日の対策へ" />
            <Divider />

            <div className="relative z-10">
              {loadingAuth ? (
                <div className="py-4 text-center text-sm text-slate-500 font-medium">ログイン状態を確認中…</div>
              ) : isLoggedIn ? (
                // ログイン済みの場合
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-5">
                    <div className="text-sm text-slate-800">
                      ログイン中：<span className="font-bold">{session.user?.email}</span>
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">今日の「予報と対策」は無料で見られます。</div>
                  </div>

                  <div>
                    {isAttached ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-base font-bold text-emerald-800 flex items-center justify-center gap-2">
                        <span>✅</span> この結果は保存済みです
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-base font-bold text-slate-900 text-center">
                          この結果を保存して、<br/>今日の未病レーダーへ進みましょう。
                        </p>
                        <Button onClick={() => attachToAccount(false)} disabled={attaching} size="lg" className="w-full shadow-md">
                          {attaching ? "保存して移動中…" : "保存して、今日の対策を見る（無料）"}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* サブアクション */}
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
                // 未ログインの場合 (ここを一番リッチに)
                <>
                  <div className="rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 p-6 border border-yellow-100 text-center mb-6 shadow-sm">
                    <div className="text-lg font-bold text-slate-900 mb-2">
                      無料で結果を保存して、<br/>今日の「予報と対策」へ。
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      ※登録だけでは課金されません（ずっと無料の範囲で使えます）
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button onClick={goSignupToRadar} size="lg" className="w-full shadow-md bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border-0">
                      ✨ 無料で保存して始める
                    </Button>
                    <Button variant="secondary" onClick={goLoginToRadar} className="w-full">
                      すでに登録済みの方（ログイン）
                    </Button>
                  </div>

                  <div className="mt-6 text-center">
                    <button onClick={() => router.push("/check")} className="text-sm font-bold text-slate-500 hover:text-slate-700 transition underline underline-offset-4">
                      保存せずにもう一度チェックする
                    </button>
                  </div>
                </>
              )}
            </div>
          </Module>
        </div>

        <div className="mt-8 text-center text-xs font-medium text-slate-400">
          診断作成日時：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}<br/>
          ID: {id.slice(0, 8)}...
        </div>
      </div>
    </div>
  );
}
