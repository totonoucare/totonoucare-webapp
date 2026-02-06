// app/result/[id]/page.js
"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

/**
 * ------------------------------------------------------------
 *  Assets (仮)
 *  - 本番は /public に置いて置換推奨（remotePatterns不要になる）
 * ------------------------------------------------------------
 */
const ASSETS = {
  // Section icons
  memo: "https://placehold.co/96x96/E9EDDD/31543a?text=LOG&font=roboto",
  compass: "https://placehold.co/96x96/E9EDDD/31543a?text=TCM&font=roboto",
  robot: "https://placehold.co/96x96/E9EDDD/31543a?text=AI&font=roboto",
  bolt: "https://placehold.co/96x96/E9EDDD/31543a?text=GO&font=roboto",

  // Panel icons
  brain: "https://placehold.co/48x48/E9EDDD/31543a?text=1&font=roboto",
  radar: "https://placehold.co/48x48/E9EDDD/31543a?text=2&font=roboto",
  point: "https://placehold.co/48x48/E9EDDD/31543a?text=P&font=roboto",
  main: "https://placehold.co/48x48/E9EDDD/31543a?text=M&font=roboto",
  sub: "https://placehold.co/48x48/E9EDDD/31543a?text=S&font=roboto",
};

// ✅ Next.js の useSearchParams 対策：中身を Suspense 内に移す
export default function ResultPageWrapper({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-app">
          <div className="mx-auto w-full max-w-[440px] px-4 pt-10">
            <div className="rounded-[22px] bg-[var(--panel)] p-5 shadow-sm ring-1 ring-black/5">
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

/* ------------------------------------------------------------
 *  Small UI primitives (このページ内で完結)
 * ------------------------------------------------------------ */

function AppBar({ title, onBack }) {
  return (
    <div className="sticky top-0 z-20 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="mx-auto w-full max-w-[440px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-black/5 active:scale-[0.99]"
          >
            <span className="text-slate-400">←</span>
            もどる
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
        "rounded-[26px] bg-[var(--panel)] shadow-sm ring-1 ring-black/5",
        "overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function ModuleHeader({ icon, title, sub, right }) {
  return (
    <div className="px-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[var(--mint)] ring-1 ring-black/5">
            <Image src={icon} alt="" width={32} height={32} className="h-8 w-8" />
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

function Tag({ children, tone = "mint" }) {
  const map = {
    mint: "bg-[var(--mint)] text-[var(--accent-ink)]",
    plain: "bg-slate-100 text-slate-700",
    ok: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${map[tone]}`}>
      {children}
    </span>
  );
}

/**
 * “アプリっぽい”パネル
 * - 小見出し＋左アクセント
 * - 背景をほんのり色分け
 */
function Panel({ icon, title, tone = "mint", children }) {
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
  };

  const t = tones[tone] || tones.mint;

  return (
    <div className={`relative rounded-[20px] ${t.wrap} ring-1 ring-black/5`}>
      <div className={`absolute left-0 top-0 h-full w-1.5 rounded-l-[20px] ${t.bar}`} />
      <div className="px-4 py-4 pl-5">
        <div className="flex items-center gap-3">
          {icon ? (
            <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-white/70 ring-1 ring-black/5">
              <Image src={icon} alt="" width={22} height={22} className="h-[22px] w-[22px]" />
            </div>
          ) : null}
          <div className={`text-sm font-extrabold tracking-tight ${t.title}`}>{title}</div>
        </div>
        <div className="mt-3 text-sm leading-7 text-slate-800">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
 *  AI split: 見出し「」/ ## / 余計な装飾に強くする
 * ------------------------------------------------------------ */
function splitExplain(text) {
  const raw = (text || "").trim();
  if (!raw) return { p1: "", p2: "" };

  // normalize:
  // - markdown heading '##' を除去
  // - 全角引用「」が混じっても一致できるように見出し検出を柔らかく
  const normalize = (s) =>
    s
      .replace(/^#+\s*/gm, "") // markdown ##
      .replace(/\r\n/g, "\n")
      .trim();

  const t = normalize(raw);

  const h1 = "いまの体のクセ（今回のまとめ）";
  const h2 = "体調の揺れを予報で先回り（未病レーダー）";

  const idx1 = t.indexOf(h1);
  const idx2 = t.indexOf(h2);

  // 両方見つからない → 全文をp1扱い
  if (idx1 === -1 && idx2 === -1) return { p1: t, p2: "" };

  // 片方だけ → それ以外は全文扱い（破綻回避）
  if (idx1 !== -1 && idx2 === -1) {
    const p1 = t.slice(idx1 + h1.length).trim() || t;
    return { p1, p2: "" };
  }
  if (idx1 === -1 && idx2 !== -1) {
    const p2 = t.slice(idx2 + h2.length).trim() || "";
    return { p1: t, p2 };
  }

  // 両方ある
  const part1 = t.slice(idx1 + h1.length, idx2).trim();
  const part2 = t.slice(idx2 + h2.length).trim();

  return {
    p1: part1 || t.slice(0, idx2).trim(),
    p2: part2 || t.slice(idx2).trim(),
  };
}

/* ------------------------------------------------------------
 *  Page
 * ------------------------------------------------------------ */

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

  // --- AI explain state ---
  const [explainText, setExplainText] = useState("");
  const [explainModel, setExplainModel] = useState("");
  const [explainCreatedAt, setExplainCreatedAt] = useState("");
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainError, setExplainError] = useState("");

  // 多重生成防止
  const explainRequestedRef = useRef(false);

  // legacy support
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

        // if /events/[id] returns ai_explain_*, set it directly
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
  // Auto-generate / load AI explain (first view only)
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
      <div className="min-h-screen bg-app">
        <div className="mx-auto w-full max-w-[440px] px-4 pt-10">
          <div className="rounded-[22px] bg-[var(--panel)] p-5 shadow-sm ring-1 ring-black/5">
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

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="min-h-screen bg-app pb-14">
      <AppBar title="診断結果" onBack={() => router.push("/check")} />

      {toast ? (
        <div className="fixed left-1/2 top-3 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-[18px] bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-lg ring-1 ring-black/5">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-5 pb-3">
          {/* 1) Hero */}
          <Module className="relative">
            <ModuleHeader
              icon={ASSETS.memo}
              title="あなたのお悩み"
              sub="チェック時の記録"
              right={<Tag tone="mint">無料で閲覧OK</Tag>}
            />
            <div className="px-5 pb-5 pt-4">
              <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-black/5">
                <div className="text-xs font-bold text-[var(--accent-ink)]/80">フォーカス</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{symptomLabel}</div>
              </div>
            </div>
          </Module>

          {/* 2) Constitution */}
          <Module>
            <ModuleHeader icon={ASSETS.compass} title="体質の見立て" sub="軸・整えポイント・張りやすい場所" />

            <div className="px-5 pb-5 pt-4 space-y-4">
              <Panel title="今の体質の軸" tone="mint">
                <div className="text-base font-extrabold tracking-tight text-slate-900">{core.title}</div>
                <div className="mt-2 text-sm leading-7 text-slate-700">{core.tcm_hint}</div>
              </Panel>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-extrabold text-slate-900">整えポイント（最大2つ）</div>
                  <Tag tone="plain">優先</Tag>
                </div>

                {subLabels?.length ? (
                  <div className="space-y-3">
                    {subLabels.map((s) => (
                      <Panel
                        key={s.title}
                        icon={ASSETS.point}
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
                  <div className="rounded-[18px] bg-white p-4 text-sm text-slate-600 ring-1 ring-black/5">
                    今回は強い偏りは見られませんでした（バランス良好）。
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-extrabold text-slate-900">体の張りやすい場所</div>
                  <Tag tone="plain">サイン</Tag>
                </div>

                <Panel icon={ASSETS.main} title="（主）出やすいライン" tone="violet">
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

                <Panel icon={ASSETS.sub} title="（副）補助ライン" tone="teal">
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

          {/* 3) AI Explain (1 module, 2 panels) */}
          <Module>
            <ModuleHeader
              icon={ASSETS.robot}
              title="あなたの体質解説"
              sub="トトノウくん（AI）が、今回の結果を“つなげて”解説します"
              right={<Tag tone="mint">初回生成</Tag>}
            />

            <div className="px-5 pb-5 pt-4 space-y-4">
              {loadingExplain ? (
                <div className="rounded-[20px] bg-white p-5 ring-1 ring-black/5">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
                    <div>
                      <div className="text-sm font-extrabold text-slate-800">解説文を生成中…</div>
                      <div className="mt-1 text-xs text-slate-500">初回のみ生成して保存します。</div>
                    </div>
                  </div>
                </div>
              ) : explainText ? (
                <div className="rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_55%)] p-4 text-xs font-bold text-[var(--accent-ink)] ring-1 ring-black/5">
                  ※この解説は初回だけ生成して保存されます
                </div>
              ) : (
                <div className="rounded-[20px] bg-white p-5 ring-1 ring-black/5">
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

              {/* AI panels */}
              {explainText ? (
                <div className="space-y-3">
                  {explainParts.p1 ? (
                    <Panel icon={ASSETS.brain} title="いまの体のクセ（今回のまとめ）" tone="violet">
                      <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800">{explainParts.p1}</div>
                    </Panel>
                  ) : null}

                  {explainParts.p2 ? (
                    <Panel icon={ASSETS.radar} title="体調の揺れを予報で先回り（未病レーダー）" tone="teal">
                      <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800">{explainParts.p2}</div>
                    </Panel>
                  ) : null}

                  {/* split失敗時 */}
                  {!explainParts.p1 && !explainParts.p2 ? (
                    <Panel title="AI解説" tone="mint">
                      <div className="whitespace-pre-wrap text-sm leading-8 text-slate-800">{explainText}</div>
                    </Panel>
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
            <ModuleHeader icon={ASSETS.bolt} title="次の一歩（おすすめ）" sub="保存 → 今日の予報と対策（無料）へ" />

            <div className="px-5 pb-6 pt-4 space-y-4">
              {loadingAuth ? (
                <div className="rounded-[20px] bg-white p-5 ring-1 ring-black/5">
                  <div className="text-sm font-bold text-slate-700">ログイン状態を確認中…</div>
                </div>
              ) : isLoggedIn ? (
                <>
                  <div className="rounded-[20px] bg-white p-5 ring-1 ring-black/5">
                    <div className="text-sm font-bold text-slate-800">
                      ログイン中：<span className="font-extrabold">{session.user?.email}</span>
                    </div>
                    <div className="mt-2 text-xs font-bold text-slate-500">
                      今日の「予報と対策」は無料で見られます。
                    </div>
                  </div>

                  {isAttached ? (
                    <div className="rounded-[20px] bg-[color-mix(in_srgb,#d1fae5,white_35%)] p-5 ring-1 ring-black/5">
                      <div className="text-sm font-extrabold text-emerald-800">この結果は保存済みです ✅</div>
                      <div className="mt-3">
                        <Button onClick={() => router.push("/radar")}>今日の予報と対策へ</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-black/5">
                      <div className="text-sm font-extrabold text-slate-900">
                        この結果を保存して、今日の未病レーダーへ進みましょう。
                      </div>
                      <div className="mt-2 text-xs font-bold text-slate-600">
                        まずは「今日だけ」無料で予報と基本対策が見られます。
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
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_40%)] p-5 ring-1 ring-black/5">
                    <div className="text-base font-extrabold tracking-tight text-slate-900">
                      無料で結果を保存して、今日の「予報と対策」へ。
                    </div>
                    <div className="mt-2 text-xs font-bold text-slate-600">
                      ※登録だけでは課金されません（無料の範囲で使えます）
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
          </Module>

          <div className="pb-6 text-center text-[11px] font-bold text-slate-400">
            診断作成日時：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
