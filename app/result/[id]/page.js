// app/result/[id]/page.js
"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

/** ---------------------------
 * dummy images (swap later)
 * -------------------------- */
const IMG = {
  hero: "https://placehold.co/560x240/e9eddd/6a9770?text=TOTONOUCARE&font=roboto",
  core: "https://placehold.co/240x240/e0e4e0/6a9770?text=Core&font=roboto",
  point: "https://placehold.co/96x96/e9eddd/6a9770?text=Point&font=roboto",
  bodyMain: "https://placehold.co/96x96/e9eddd/C1A875?text=Main&font=roboto",
  bodySub: "https://placehold.co/96x96/e0e4e0/6a9770?text=Sub&font=roboto",
};

/** ---------------------------
 * SVG icons (inline)
 * - 絵文字じゃなく“アプリっぽい”線画
 * -------------------------- */
function Icon({ children, tone = "mint" }) {
  const toneClass =
    tone === "mint"
      ? "bg-[color:var(--tc-surface)] text-[color:var(--tc-ink)]"
      : tone === "gold"
        ? "bg-[color:var(--tc-gold-soft)] text-[color:var(--tc-gold-ink)]"
        : "bg-[color:var(--tc-surface)] text-[color:var(--tc-ink)]";

  return (
    <div
      className={`grid h-10 w-10 place-items-center rounded-2xl border border-white/40 ${toneClass}
                  shadow-[0_8px_22px_-14px_rgba(0,0,0,0.25)] backdrop-blur-md`}
    >
      {children}
    </div>
  );
}

function SvgMemo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 4h10a2 2 0 0 1 2 2v12l-4-2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 8h8M9 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SvgCompass() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M14.6 9.4 13 13l-3.6 1.6L11 11l3.6-1.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 7v1.2M12 15.8V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SvgRobot() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 3h6M12 3v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 10a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v6a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M10 13h.01M14 13h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M10 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SvgBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Header({ icon, title, sub, right }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0">
          <div className="text-[15px] font-bold tracking-tight text-[color:var(--tc-ink)]">{title}</div>
          {sub ? <div className="mt-0.5 text-xs text-[color:var(--tc-ink-soft)]">{sub}</div> : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function Chip({ children, tone = "mint" }) {
  const cls =
    tone === "mint"
      ? "bg-[color:var(--tc-mint-soft)] text-[color:var(--tc-mint-ink)]"
      : tone === "gold"
        ? "bg-[color:var(--tc-gold-soft)] text-[color:var(--tc-gold-ink)]"
        : "bg-white/60 text-[color:var(--tc-ink)]";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${cls} backdrop-blur-md`}>
      {children}
    </span>
  );
}

function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-[28px] border border-white/45 bg-white/55 backdrop-blur-xl
                  shadow-[0_14px_40px_-28px_rgba(0,0,0,0.35)] ${className}`}
    >
      <div className="p-5">{children}</div>
    </div>
  );
}

function SoftPanel({ children, tone = "mint" }) {
  const bg =
    tone === "mint"
      ? "bg-[color:var(--tc-surface)]"
      : tone === "gold"
        ? "bg-[color:var(--tc-gold-soft)]"
        : "bg-white/60";
  const br =
    tone === "mint"
      ? "border-[color:var(--tc-mint-line)]"
      : tone === "gold"
        ? "border-[color:var(--tc-gold-line)]"
        : "border-white/40";
  return (
    <div className={`rounded-3xl border ${br} ${bg} p-5`}>
      {children}
    </div>
  );
}

// ---------------------------
// AI text split into 2 parts
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

  return {
    p1: part1 || n.slice(0, i2).trim(),
    p2: part2 || n.slice(i2 + h2.length).trim(),
  };
}

// ✅ Next.js の useSearchParams 対策
export default function ResultPageWrapper({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-[#E9EDDD]">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/70 border-r-[#6a9770]" />
            <div className="text-sm font-bold text-[#334]">結果を読み込み中…</div>
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

  // ---------------------------
  // Auth state
  // ---------------------------
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

  // ---------------------------
  // Fetch event
  // ---------------------------
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

  // ---------------------------
  // Auto-attach after login (legacy)
  // ---------------------------
  useEffect(() => {
    if (!attachAfterLogin) return;
    if (loadingAuth) return;
    if (!session) return;
    if (!event || event?.notFound) return;

    attachToAccount(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachAfterLogin, loadingAuth, session, event?.id]);

  // ---------------------------
  // Auto-generate / load AI explain
  // ---------------------------
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

  // ---------------------------
  // Derived labels
  // ---------------------------
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

  // ---------------------------
  // Actions
  // ---------------------------
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

  // ---------------------------
  // UI states
  // ---------------------------
  if (loadingEvent) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#E9EDDD]">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/70 border-r-[#6a9770]" />
          <div className="text-sm font-bold text-[#334]">結果を読み込み中…</div>
        </div>
      </div>
    );
  }

  if (!event || event?.notFound) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#E9EDDD] p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-xl font-extrabold text-[#223]">結果が見つかりません</div>
          <div className="text-sm text-[#556]">
            期限切れ/削除、または保存に失敗した可能性があります。
          </div>
          <Button onClick={() => router.push("/check")}>体質チェックをやり直す</Button>
        </div>
      </div>
    );
  }

  // ---------------------------
  // Theming (CSS vars) + font class
  // ---------------------------
  const themeStyle = {
    "--tc-bg": "#E9EDDD",
    "--tc-mint": "#6a9770",
    "--tc-silver": "#e0e4e0",
    "--tc-gold": "#C1A875",

    "--tc-ink": "#1f2a24",
    "--tc-ink-soft": "#4a5a50",

    "--tc-surface": "rgba(224,228,224,0.55)", // e0e4e0 glass
    "--tc-mint-soft": "rgba(106,151,112,0.16)",
    "--tc-mint-ink": "#2f5a3b",
    "--tc-mint-line": "rgba(106,151,112,0.22)",

    "--tc-gold-soft": "rgba(193,168,117,0.20)",
    "--tc-gold-ink": "#5f4b1d",
    "--tc-gold-line": "rgba(193,168,117,0.28)",
  };

  return (
    <div
      style={themeStyle}
      className="min-h-screen bg-[color:var(--tc-bg)] font-zenkaku"
    >
      {/* toast */}
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-white/50 bg-white/70 px-4 py-3 text-sm font-semibold text-[color:var(--tc-ink)] backdrop-blur-xl shadow-lg">
          {toast}
        </div>
      ) : null}

      {/* iOS widget-like background ornaments */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[color:var(--tc-mint)]/20 blur-3xl" />
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-[color:var(--tc-gold)]/18 blur-3xl" />
        <div className="absolute left-1/2 bottom-[-140px] h-80 w-80 -translate-x-1/2 rounded-full bg-white/35 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[440px] px-4 pb-20 pt-6">
        {/* top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/check")}
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/55 px-4 py-2 text-xs font-bold text-[color:var(--tc-ink)] backdrop-blur-xl shadow-sm"
          >
            ← もどる
          </button>
          <div className="text-xs font-extrabold tracking-tight text-[color:var(--tc-ink-soft)]">
            診断結果
          </div>
          <div className="w-[78px]" />
        </div>

        {/* HERO (image + symptom) */}
        <GlassCard className="overflow-hidden">
          <div className="relative -mx-5 -mt-5 mb-4 h-[140px] overflow-hidden">
            <Image
              src={IMG.hero}
              alt="header"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-white/10 to-transparent" />
          </div>

          <Header
            icon={
              <Icon>
                <SvgMemo />
              </Icon>
            }
            title="あなたのお悩み"
            sub="チェック時の記録"
            right={<Chip tone="mint">無料で閲覧OK</Chip>}
          />

          <div className="mt-4">
            <SoftPanel tone="mint">
              <div className="text-[20px] font-extrabold tracking-tight text-[color:var(--tc-ink)]">
                {symptomLabel}
              </div>
              <div className="mt-1 text-xs font-semibold text-[color:var(--tc-ink-soft)]">
                このページはログイン不要で見られます（保存はログイン後）
              </div>
            </SoftPanel>
          </div>
        </GlassCard>

        {/* Constitution */}
        <div className="mt-4">
          <GlassCard>
            <Header
              icon={
                <Icon tone="gold">
                  <SvgCompass />
                </Icon>
              }
              title="体質の見立て"
              sub="今回の結果から見える“軸”とポイント"
              right={<Chip tone="gold">Bento</Chip>}
            />

            {/* Core */}
            <div className="mt-4">
              <SoftPanel tone="mint">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[color:var(--tc-mint-ink)]">
                      今の体質の軸
                    </div>
                    <div className="mt-1 text-[22px] font-extrabold tracking-tight text-[color:var(--tc-ink)]">
                      {core.title}
                    </div>
                  </div>
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/45 bg-white/55 backdrop-blur-xl">
                    <Image src={IMG.core} alt="core" fill className="object-cover opacity-90" />
                  </div>
                </div>

                <div className="mt-3 text-sm leading-7 text-[color:var(--tc-ink)]/90">
                  {core.tcm_hint}
                </div>
              </SoftPanel>
            </div>

            {/* Points */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-[color:var(--tc-ink)]">
                  整えポイント（最大2つ）
                </div>
                <Chip tone="gold">優先</Chip>
              </div>

              <div className="mt-2 space-y-3">
                {subLabels?.length ? (
                  subLabels.slice(0, 2).map((s) => (
                    <SoftPanel key={s.title} tone="gold">
                      <div className="flex gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/45 bg-white/55 backdrop-blur-xl">
                          <Image src={IMG.point} alt="point" fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[16px] font-extrabold text-[color:var(--tc-ink)]">
                            {s.title}
                          </div>
                          {s.short ? (
                            <div className="text-xs font-semibold text-[color:var(--tc-ink-soft)]">
                              {s.short}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {s.action_hint ? (
                        <div className="mt-3 text-sm leading-7 text-[color:var(--tc-ink)]/90">
                          {s.action_hint}
                        </div>
                      ) : null}
                    </SoftPanel>
                  ))
                ) : (
                  <SoftPanel>
                    <div className="text-sm font-semibold text-[color:var(--tc-ink-soft)]">
                      今回は該当なし（バランスが良い状態です）
                    </div>
                  </SoftPanel>
                )}
              </div>
            </div>

            {/* Body areas */}
            <div className="mt-4">
              <div className="text-sm font-extrabold text-[color:var(--tc-ink)]">体の張りやすい場所</div>
              <div className="mt-2 space-y-3">
                <SoftPanel tone="mint">
                  <div className="flex items-start gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/45 bg-white/55 backdrop-blur-xl">
                      <Image src={IMG.bodyMain} alt="main" fill className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[color:var(--tc-mint-ink)]">（主）</div>
                      {meridianPrimary ? (
                        <>
                          <div className="text-[16px] font-extrabold text-[color:var(--tc-ink)]">
                            {meridianPrimary.title}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-[color:var(--tc-ink-soft)]">
                            {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
                          </div>
                          <div className="mt-2 text-sm leading-7 text-[color:var(--tc-ink)]/90">
                            {meridianPrimary.organs_hint}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm font-semibold text-[color:var(--tc-ink-soft)]">
                          今回は強い偏りなし
                        </div>
                      )}
                    </div>
                  </div>
                </SoftPanel>

                <SoftPanel tone="gold">
                  <div className="flex items-start gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/45 bg-white/55 backdrop-blur-xl">
                      <Image src={IMG.bodySub} alt="sub" fill className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[color:var(--tc-gold-ink)]">（副）</div>
                      {meridianSecondary ? (
                        <>
                          <div className="text-[16px] font-extrabold text-[color:var(--tc-ink)]">
                            {meridianSecondary.title}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-[color:var(--tc-ink-soft)]">
                            {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
                          </div>
                          <div className="mt-2 text-sm leading-7 text-[color:var(--tc-ink)]/90">
                            {meridianSecondary.organs_hint}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm font-semibold text-[color:var(--tc-ink-soft)]">
                          今回は強い偏りなし
                        </div>
                      )}
                    </div>
                  </div>
                </SoftPanel>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* AI explain */}
        <div className="mt-4">
          <GlassCard>
            <Header
              icon={
                <Icon>
                  <SvgRobot />
                </Icon>
              }
              title="あなたの体質解説"
              sub="トトノウくん（AI）が文章で整理します"
              right={<Chip tone="mint">初回のみ生成</Chip>}
            />

            <div className="mt-4">
              {loadingExplain ? (
                <SoftPanel>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/70 border-r-[color:var(--tc-mint)]" />
                    <div className="text-sm font-semibold text-[color:var(--tc-ink-soft)]">
                      解説文を生成中…
                    </div>
                  </div>
                </SoftPanel>
              ) : explainText ? (
                <div className="text-xs font-semibold text-[color:var(--tc-ink-soft)]">
                  ※この解説は初回だけ生成して保存されます
                </div>
              ) : (
                <SoftPanel>
                  <div className="text-sm font-semibold text-[color:var(--tc-ink)]">
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

            {/* Part 1 */}
            {explainParts.p1 ? (
              <div className="mt-4">
                <SoftPanel tone="mint">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-[color:var(--tc-ink)]">
                      いまの体のクセ（今回のまとめ）
                    </div>
                    <Chip tone="mint">まとめ</Chip>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white/55 p-4 backdrop-blur-xl border border-white/45">
                    <div className="border-l-4 border-[color:var(--tc-mint-line)] pl-4">
                      <div className="whitespace-pre-wrap text-sm leading-8 text-[color:var(--tc-ink)]/95">
                        {explainParts.p1}
                      </div>
                    </div>
                  </div>
                </SoftPanel>
              </div>
            ) : null}

            {/* Part 2 */}
            {explainParts.p2 ? (
              <div className="mt-3">
                <SoftPanel tone="gold">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-[color:var(--tc-ink)]">
                      体調の揺れを予報で先回り（未病レーダー）
                    </div>
                    <Chip tone="gold">予報</Chip>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white/55 p-4 backdrop-blur-xl border border-white/45">
                    <div className="border-l-4 border-[color:var(--tc-gold-line)] pl-4">
                      <div className="whitespace-pre-wrap text-sm leading-8 text-[color:var(--tc-ink)]/95">
                        {explainParts.p2}
                      </div>
                    </div>
                  </div>
                </SoftPanel>
              </div>
            ) : null}

            {(explainCreatedAt || explainModel) ? (
              <div className="mt-3 text-right text-xs font-semibold text-[color:var(--tc-ink-soft)]">
                {explainCreatedAt ? `生成：${new Date(explainCreatedAt).toLocaleString("ja-JP")}` : ""}
                {explainModel ? ` / model: ${explainModel}` : ""}
              </div>
            ) : null}
          </GlassCard>
        </div>

        {/* CTA */}
        <div className="mt-4">
          <GlassCard>
            <Header
              icon={
                <Icon tone="gold">
                  <SvgBolt />
                </Icon>
              }
              title="次の一歩（おすすめ）"
              sub="結果を保存して、今日の予報と対策へ"
              right={<Chip tone="mint">無料あり</Chip>}
            />

            <div className="mt-4">
              {loadingAuth ? (
                <SoftPanel>
                  <div className="text-sm font-semibold text-[color:var(--tc-ink-soft)]">
                    ログイン状態を確認中…
                  </div>
                </SoftPanel>
              ) : isLoggedIn ? (
                <>
                  <SoftPanel>
                    <div className="text-sm font-semibold text-[color:var(--tc-ink)]">
                      ログイン中：<span className="font-extrabold">{session.user?.email}</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[color:var(--tc-ink-soft)]">
                      今日の「予報と対策」は無料で見られます。
                    </div>
                  </SoftPanel>

                  <div className="mt-3">
                    {isAttached ? (
                      <SoftPanel tone="mint">
                        <div className="text-sm font-extrabold text-[color:var(--tc-mint-ink)]">
                          この結果は保存済みです ✅
                        </div>
                      </SoftPanel>
                    ) : (
                      <SoftPanel tone="gold">
                        <div className="text-sm font-extrabold text-[color:var(--tc-ink)]">
                          この結果を保存して、今日の未病レーダーへ進みましょう。
                        </div>
                        <div className="mt-3">
                          <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                            {attaching ? "保存して移動中…" : "保存して、今日の予報と対策を見る（無料）"}
                          </Button>
                        </div>
                      </SoftPanel>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" onClick={() => router.push("/radar")}>
                      今日の予報と対策へ
                    </Button>
                    <Button variant="ghost" onClick={() => router.push("/check")}>
                      もう一度チェック
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <SoftPanel tone="mint">
                    <div className="text-sm font-extrabold text-[color:var(--tc-ink)]">
                      無料で結果を保存して、今日の「予報と対策」へ進めます。
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[color:var(--tc-ink-soft)]">
                      ※登録だけでは課金されません（無料の範囲で使えます）
                    </div>
                  </SoftPanel>

                  <div className="mt-3 flex flex-col gap-2">
                    <Button onClick={goSignupToRadar}>無料で保存して、今日の予報と対策を見る</Button>
                    <Button variant="ghost" onClick={goLoginToRadar}>
                      すでに登録済みの方はこちら（ログイン）
                    </Button>
                    <Button variant="ghost" onClick={() => router.push("/check")}>
                      保存せずにもう一度チェック
                    </Button>
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="mt-6 text-center text-xs font-semibold text-[color:var(--tc-ink-soft)]">
          作成日時：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
        </div>
      </div>
    </div>
  );
}
