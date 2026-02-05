// app/result/[id]/page.js
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

/** ---------------------------
 * Dummy assets (replace later)
 * -------------------------- */
const ASSETS = {
  // header / section icons (SVGでも画像でもOK)
  iconMemo: "/assets/ui/memo.png",
  iconCompass: "/assets/ui/compass.png",
  iconAI: "/assets/ui/ai.png",
  iconBolt: "/assets/ui/bolt.png",
  iconBrain: "/assets/ui/brain.png",
  iconRadar: "/assets/ui/radar.png",

  // illustration placeholders (later: core_code / meridian etcで差し替え)
  illusCore: "/assets/illus/core.png",
  illusMeridianMain: "/assets/illus/body-main.png",
  illusMeridianSub: "/assets/illus/body-sub.png",
  illusPoint: "/assets/illus/point.png",
};

// ✅ Next.js の useSearchParams 対策
export default function ResultPageWrapper({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 grid place-items-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-r-emerald-500 inline-block" />
            <div className="text-slate-700 font-semibold">結果を読み込み中…</div>
          </div>
        </div>
      }
    >
      <ResultPage params={params} />
    </Suspense>
  );
}

/** ---------------------------
 * SVG icons (emoji禁止)
 * -------------------------- */
function IconChevronLeft(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M12.78 15.53a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L8.31 10l4.47 4.47a.75.75 0 0 1 0 1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function IconSpark(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M10 1.5 12 7l5.5 2-5.5 2L10 16.5 8 11 2.5 9 8 7 10 1.5Z" />
    </svg>
  );
}
function IconShield(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M10 1.5c2.2 1.9 4.9 2.7 7 3v6.2c0 4.6-3.4 7.2-7 8.8-3.6-1.6-7-4.2-7-8.8V4.5c2.1-.3 4.8-1.1 7-3Zm3.2 7.1a.75.75 0 0 1 .1 1.06l-3.6 4.4a.75.75 0 0 1-1.1.07L6.8 12.5a.75.75 0 1 1 1-1.1l1.2 1.1 3-3.9a.75.75 0 0 1 1.06-.1Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** ---------------------------
 * UI primitives for Bento
 * -------------------------- */
function BentoCard({ children, className = "" }) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[28px] border border-slate-100 bg-white",
        "shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]",
        "backdrop-blur supports-[backdrop-filter]:bg-white/90",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function BentoHeader({ icon, title, sub, right }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-11 w-11 rounded-2xl border border-slate-100 bg-slate-50 grid place-items-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-extrabold tracking-tight text-slate-900 truncate">{title}</div>
          {sub ? <div className="text-xs font-medium text-slate-500">{sub}</div> : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function Badge({ tone = "emerald", children }) {
  const toneCls = {
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    indigo: "bg-indigo-50 text-indigo-800 ring-indigo-100",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${toneCls}`}>
      {children}
    </span>
  );
}

function SoftPanel({ tone = "emerald", children, className = "" }) {
  const toneCls = {
    emerald: "bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border-emerald-100",
    indigo: "bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 border-indigo-100",
    amber: "bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-100",
    slate: "bg-gradient-to-br from-slate-50 via-white to-slate-50 border-slate-100",
    rose: "bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30 border-rose-100",
  }[tone];
  return (
    <div className={`rounded-[22px] border p-4 ${toneCls} ${className}`}>{children}</div>
  );
}

// ---------------------------
// AI text split
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

  const p1 = n.slice(i1 + h1.length, i2).trim();
  const p2 = n.slice(i2 + h2.length).trim();
  return { p1, p2 };
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

  // AI
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

  // legacy auto attach
  useEffect(() => {
    if (!attachAfterLogin) return;
    if (loadingAuth) return;
    if (!session) return;
    if (!event || event?.notFound) return;

    attachToAccount(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachAfterLogin, loadingAuth, session, event?.id]);

  // auto generate explain
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
      <div className="min-h-screen bg-slate-50 grid place-items-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-r-emerald-500 inline-block" />
          <div className="text-slate-700 font-semibold">結果を読み込み中…</div>
        </div>
      </div>
    );
  }

  if (!event || event?.notFound) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="text-xl font-extrabold text-slate-900">結果が見つかりません</div>
          <div className="text-sm text-slate-600">
            期限切れ/削除、または保存に失敗した可能性があります。
          </div>
          <Button onClick={() => router.push("/check")}>体質チェックをやり直す</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 pb-14">
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[980px] px-4 pt-6">
        {/* App header */}
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/check")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <IconChevronLeft className="h-4 w-4 text-slate-500" />
            もどる
          </button>

          <div className="text-sm font-extrabold tracking-tight text-slate-700">診断結果</div>

          <div className="hidden sm:flex items-center gap-2">
            <Badge tone="emerald">
              <IconShield className="h-3.5 w-3.5" />
              結果は無料で閲覧OK
            </Badge>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          {/* Hero (span 7) */}
          <BentoCard className="sm:col-span-7">
            <div className="p-5">
              <BentoHeader
                icon={
                  <div className="relative h-8 w-8">
                    <Image src={ASSETS.iconMemo} alt="" fill className="object-contain" />
                  </div>
                }
                title="あなたのお悩み"
                sub="チェック時の記録"
                right={<Badge tone="indigo">無料閲覧</Badge>}
              />

              <div className="mt-4">
                <SoftPanel tone="indigo" className="flex items-center justify-between gap-3">
                  <div className="text-[20px] sm:text-[22px] font-extrabold tracking-tight text-indigo-950">
                    {symptomLabel}
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-indigo-800 font-semibold">
                    <IconSpark className="h-4 w-4" />
                    保存するとレーダーに連携
                  </div>
                </SoftPanel>
              </div>
            </div>
          </BentoCard>

          {/* CTA (span 5) */}
          <BentoCard className="sm:col-span-5">
            <div className="p-5">
              <BentoHeader
                icon={
                  <div className="relative h-8 w-8">
                    <Image src={ASSETS.iconBolt} alt="" fill className="object-contain" />
                  </div>
                }
                title="次の一歩"
                sub="保存 → 今日の予報と対策へ"
                right={<Badge tone="emerald">おすすめ</Badge>}
              />

              <div className="mt-4 space-y-3">
                {loadingAuth ? (
                  <SoftPanel tone="slate">
                    <div className="text-sm text-slate-600">ログイン状態を確認中…</div>
                  </SoftPanel>
                ) : isLoggedIn ? (
                  <>
                    <SoftPanel tone="slate">
                      <div className="text-sm text-slate-800">
                        ログイン中：<span className="font-bold">{session.user?.email}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">今日の「予報と対策」は無料で見られます。</div>
                    </SoftPanel>

                    {isAttached ? (
                      <SoftPanel tone="emerald">
                        <div className="text-sm font-bold text-emerald-900">この結果は保存済みです ✅</div>
                      </SoftPanel>
                    ) : (
                      <div className="space-y-2">
                        <Button onClick={() => attachToAccount(false)} disabled={attaching} className="w-full">
                          {attaching ? "保存して移動中…" : "保存して、今日の予報と対策を見る（無料）"}
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => router.push("/radar")} className="flex-1">
                            /radarへ
                          </Button>
                          <Button variant="ghost" onClick={() => router.push("/check")} className="flex-1">
                            やり直す
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <SoftPanel tone="emerald">
                      <div className="text-sm font-extrabold text-emerald-950">
                        無料で結果を保存して、今日の「予報と対策」へ進めます。
                      </div>
                      <div className="mt-1 text-xs text-emerald-800/80">
                        ※登録だけでは課金されません（無料の範囲で使えます）
                      </div>
                    </SoftPanel>

                    <Button onClick={goSignupToRadar} className="w-full">
                      無料で保存して、今日の予報と対策を見る
                    </Button>
                    <Button variant="ghost" onClick={goLoginToRadar} className="w-full">
                      すでに登録済みの方はこちら（ログイン）
                    </Button>
                    <Button variant="ghost" onClick={() => router.push("/check")} className="w-full">
                      保存せずにもう一度チェックする
                    </Button>
                  </>
                )}
              </div>
            </div>
          </BentoCard>

          {/* Constitution BIG (span 12) */}
          <BentoCard className="sm:col-span-12">
            <div className="p-5">
              <BentoHeader
                icon={
                  <div className="relative h-8 w-8">
                    <Image src={ASSETS.iconCompass} alt="" fill className="object-contain" />
                  </div>
                }
                title="体質の見立て"
                sub="軸 / 整えポイント / 張りやすい場所"
                right={<Badge tone="slate">診断ベース</Badge>}
              />

              {/* bento inner grid */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12">
                {/* core (span 6) */}
                <div className="sm:col-span-6">
                  <SoftPanel tone="emerald" className="relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-6 opacity-20 pointer-events-none">
                      <Image src={ASSETS.illusCore} alt="" width={160} height={160} className="object-contain" />
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge tone="emerald">今の体質の軸</Badge>
                      <span className="text-xs font-semibold text-emerald-900/70">安定度の目安</span>
                    </div>
                    <div className="mt-3 text-[22px] sm:text-[26px] font-extrabold tracking-tight text-slate-900">
                      {core.title}
                    </div>
                    <div className="mt-2 text-sm leading-7 font-medium text-slate-700">{core.tcm_hint}</div>
                  </SoftPanel>
                </div>

                {/* points (span 6) */}
                <div className="sm:col-span-6">
                  <SoftPanel tone="amber">
                    <div className="flex items-center justify-between">
                      <Badge tone="amber">整えポイント</Badge>
                      <span className="text-xs font-semibold text-amber-900/70">最大2つ</span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {subLabels?.length ? (
                        subLabels.slice(0, 2).map((s) => (
                          <div key={s.title} className="rounded-[18px] border border-amber-100 bg-white/70 p-4">
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0">
                                <Image src={ASSETS.illusPoint} alt="" fill className="object-contain" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900">{s.title}</div>
                                <div className="text-xs font-medium text-slate-500">{s.short}</div>
                              </div>
                            </div>
                            {s.action_hint ? (
                              <div className="mt-2 text-sm leading-7 text-slate-700">{s.action_hint}</div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[18px] border border-dashed border-amber-200 bg-white/60 p-4 text-sm text-slate-600">
                          今回は強い偏りは出ませんでした。
                        </div>
                      )}
                    </div>
                  </SoftPanel>
                </div>

                {/* meridian main (span 6) */}
                <div className="sm:col-span-6">
                  <SoftPanel tone="rose">
                    <div className="flex items-center justify-between">
                      <Badge tone="slate">張りやすい場所（主）</Badge>
                      <span className="text-xs font-semibold text-slate-600">出やすいサイン</span>
                    </div>

                    <div className="mt-3 flex gap-3">
                      <div className="relative h-14 w-14 shrink-0">
                        <Image src={ASSETS.illusMeridianMain} alt="" fill className="object-contain" />
                      </div>
                      <div className="min-w-0">
                        {meridianPrimary ? (
                          <>
                            <div className="text-base font-extrabold text-slate-900">{meridianPrimary.title}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
                            </div>
                            <div className="mt-2 text-sm leading-7 text-slate-700">{meridianPrimary.organs_hint}</div>
                          </>
                        ) : (
                          <div className="text-sm text-slate-600">今回は強い偏りなし</div>
                        )}
                      </div>
                    </div>
                  </SoftPanel>
                </div>

                {/* meridian sub (span 6) */}
                <div className="sm:col-span-6">
                  <SoftPanel tone="slate">
                    <div className="flex items-center justify-between">
                      <Badge tone="slate">張りやすい場所（副）</Badge>
                      <span className="text-xs font-semibold text-slate-600">補助ライン</span>
                    </div>

                    <div className="mt-3 flex gap-3">
                      <div className="relative h-14 w-14 shrink-0">
                        <Image src={ASSETS.illusMeridianSub} alt="" fill className="object-contain" />
                      </div>
                      <div className="min-w-0">
                        {meridianSecondary ? (
                          <>
                            <div className="text-base font-extrabold text-slate-900">{meridianSecondary.title}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
                            </div>
                            <div className="mt-2 text-sm leading-7 text-slate-700">{meridianSecondary.organs_hint}</div>
                          </>
                        ) : (
                          <div className="text-sm text-slate-600">今回は強い偏りなし</div>
                        )}
                      </div>
                    </div>
                  </SoftPanel>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* AI explain (two bento cards) */}
          <BentoCard className="sm:col-span-12">
            <div className="p-5">
              <BentoHeader
                icon={
                  <div className="relative h-8 w-8">
                    <Image src={ASSETS.iconAI} alt="" fill className="object-contain" />
                  </div>
                }
                title="あなたの体質解説（AI）"
                sub="文章は初回だけ生成して保存されます"
                right={<Badge tone="emerald">トトノウくん</Badge>}
              />

              <div className="mt-4">
                {loadingExplain ? (
                  <SoftPanel tone="slate" className="text-sm text-slate-600">
                    生成中…
                  </SoftPanel>
                ) : explainText ? null : (
                  <SoftPanel tone="slate">
                    <div className="text-sm text-slate-700">
                      {explainError ? `生成に失敗しました：${explainError}` : "まだ文章がありません。"}
                    </div>
                    <div className="mt-3">
                      <Button onClick={retryExplain} disabled={loadingExplain}>
                        {loadingExplain ? "生成中…" : "もう一度生成する"}
                      </Button>
                    </div>
                  </SoftPanel>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12">
                {explainParts.p1 ? (
                  <div className="sm:col-span-6">
                    <SoftPanel tone="indigo">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="relative h-6 w-6">
                            <Image src={ASSETS.iconBrain} alt="" fill className="object-contain" />
                          </div>
                          <div className="text-sm font-extrabold text-indigo-950">いまの体のクセ（まとめ）</div>
                        </div>
                        <Badge tone="indigo">Summary</Badge>
                      </div>

                      <div className="mt-3 rounded-[18px] bg-white/70 p-4 border border-indigo-100">
                        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                          {explainParts.p1}
                        </div>
                      </div>
                    </SoftPanel>
                  </div>
                ) : null}

                {explainParts.p2 ? (
                  <div className="sm:col-span-6">
                    <SoftPanel tone="emerald">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="relative h-6 w-6">
                            <Image src={ASSETS.iconRadar} alt="" fill className="object-contain" />
                          </div>
                          <div className="text-sm font-extrabold text-emerald-950">体調の揺れを予報で先回り</div>
                        </div>
                        <Badge tone="emerald">Radar</Badge>
                      </div>

                      <div className="mt-3 rounded-[18px] bg-white/70 p-4 border border-emerald-100">
                        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                          {explainParts.p2}
                        </div>
                      </div>
                    </SoftPanel>
                  </div>
                ) : null}

                {explainText && !explainParts.p1 && !explainParts.p2 ? (
                  <div className="sm:col-span-12">
                    <SoftPanel tone="slate">
                      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{explainText}</div>
                    </SoftPanel>
                  </div>
                ) : null}
              </div>

              {(explainCreatedAt || explainModel) ? (
                <div className="mt-3 text-right text-xs font-semibold text-slate-400">
                  {explainCreatedAt ? `生成日時：${new Date(explainCreatedAt).toLocaleString("ja-JP")}` : ""}
                  {explainModel ? `　/　model: ${explainModel}` : ""}
                </div>
              ) : null}
            </div>
          </BentoCard>
        </div>

        <div className="mt-6 text-center text-xs font-medium text-slate-400">
          作成日時：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
        </div>
      </div>
    </div>
  );
}
