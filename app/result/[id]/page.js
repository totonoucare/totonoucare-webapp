// app/result/[id]/page.js
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

// ✅ Next.js の useSearchParams 対策：中身を Suspense 内に移す
export default function ResultPageWrapper({ params }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">結果を読み込み中…</h1>
        </div>
      }
    >
      <ResultPage params={params} />
    </Suspense>
  );
}

/** ---------------------------
 * UI helpers (inline)
 * -------------------------- */
function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SectionHeader({ icon, title, sub }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-2xl border bg-white text-base shadow-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {sub ? <div className="text-xs text-slate-500">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Module({ children }) {
  // “アプリの面”っぽいコンテナ
  return (
    <div className="rounded-3xl border bg-white shadow-sm">
      <div className="p-4">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-3 h-px w-full bg-slate-100" />;
}

// ---------------------------
// AI text split into 2 parts
// ---------------------------
function splitExplain(text) {
  const t = (text || "").trim();
  if (!t) return { p1: "", p2: "" };

  // ✅ 見出し（「」なし / ##なし）で切る
  const h1 = "いまの体のクセ（今回のまとめ）";
  const h2 = "体調の揺れを予報で先回り（未病レーダー）";

  // 先頭の "## " などの混入も吸収
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

  // 多重生成防止（React Strict Mode / re-render対策）
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

      // ✅ 保存後は /radar へ（/radar 側で saved toast を出す想定）
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
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">結果を読み込み中…</h1>
        <div className="text-sm text-slate-600">少し待ってください。</div>
      </div>
    );
  }

  if (!event || event?.notFound) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">結果が見つかりません</h1>
        <div className="text-sm text-slate-600">
          期限切れ/削除、または保存に失敗した可能性があります。
        </div>
        <Button onClick={() => router.push("/check")}>体質チェックをやり直す</Button>
      </div>
    );
  }

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-white">
      {/* toast */}
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border bg-white px-4 py-3 text-sm shadow">
          {toast}
        </div>
      ) : null}

      {/* app-like container */}
      <div className="mx-auto w-full max-w-md px-3 pb-10 pt-4">
        {/* Top mini app-bar */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/check")}
            className="inline-flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-xs text-slate-700 shadow-sm"
          >
            ← もどる
          </button>
          <div className="text-xs text-slate-500">未病レーダー</div>
          <div className="w-[72px]" />
        </div>

        {/* Hero module */}
        <Module>
          <SectionHeader icon="📝" title="あなたのお悩み" sub="結果は無料で閲覧できます" />
          <Divider />
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-slate-900">{symptomLabel}</div>
            <Pill>無料で閲覧OK</Pill>
          </div>
        </Module>

        {/* Constitution module */}
        <div className="mt-3">
          <Module>
            <SectionHeader icon="🧭" title="体質の見立て" sub="今回の結果から見える“軸”とポイント" />
            <Divider />

            {/* Core panel */}
            <div className="rounded-3xl border bg-gradient-to-b from-slate-50 to-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-600">今の体質の軸</div>
                <Pill tone="slate">安定度の目安</Pill>
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{core.title}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{core.tcm_hint}</div>
            </div>

            {/* Sub labels */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">整えポイント（最大2つ）</div>
                <Pill tone="amber">優先度</Pill>
              </div>

              <div className="mt-2 grid gap-2">
                {subLabels?.length ? (
                  subLabels.map((s) => (
                    <div key={s.title} className="rounded-3xl border bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800">
                          {s.title}
                        </span>
                        <span className="text-xs text-slate-500">{s.short}</span>
                      </div>
                      {s.action_hint ? (
                        <div className="mt-2 text-sm leading-7 text-slate-800">{s.action_hint}</div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border bg-white p-4 text-sm text-slate-500">
                    今回は強い偏りは出ませんでした。
                  </div>
                )}
              </div>
            </div>

            {/* Meridians */}
            <div className="mt-4">
              <div className="text-sm font-semibold text-slate-900">体の張りやすい場所</div>

              <div className="mt-2 grid gap-2">
                {/* Primary */}
                <div className="rounded-3xl border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">（主）</div>
                    <Pill tone="slate">出やすいサイン</Pill>
                  </div>
                  {meridianPrimary ? (
                    <>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{meridianPrimary.title}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
                      </div>
                      <div className="mt-2 text-xs leading-6 text-slate-500">{meridianPrimary.organs_hint}</div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-slate-500">今回は強い偏りなし</div>
                  )}
                </div>

                {/* Secondary */}
                <div className="rounded-3xl border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">（副）</div>
                    <Pill tone="slate">補助ライン</Pill>
                  </div>
                  {meridianSecondary ? (
                    <>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{meridianSecondary.title}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
                      </div>
                      <div className="mt-2 text-xs leading-6 text-slate-500">{meridianSecondary.organs_hint}</div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-slate-500">今回は強い偏りなし</div>
                  )}
                </div>
              </div>
            </div>
          </Module>
        </div>

        {/* AI explain module */}
        <div className="mt-3">
          <Module>
            <div className="flex items-center justify-between gap-2">
              <SectionHeader icon="🤖" title="あなたの体質解説" sub="トトノウくん（AI）が文章で整理します" />
              <Pill>初回だけ生成して保存</Pill>
            </div>

            <Divider />

            {loadingExplain ? (
              <div className="rounded-3xl border bg-slate-50 p-4 text-sm text-slate-700">
                トトノウくん（AI）が解説文を生成中…
              </div>
            ) : explainText ? (
              <div className="text-xs text-slate-500">
                文章は結果に紐づいて保存され、次回以降はキャッシュが表示されます。
              </div>
            ) : (
              <div className="rounded-3xl border bg-white p-4">
                <div className="text-sm text-slate-700">
                  {explainError ? `生成に失敗しました：${explainError}` : "まだ文章がありません。"}
                </div>
                <div className="mt-3">
                  <Button onClick={retryExplain} disabled={loadingExplain}>
                    {loadingExplain ? "生成中…" : "もう一度生成する"}
                  </Button>
                </div>
              </div>
            )}
          </Module>

          {/* Part cards (more app-like) */}
          {explainParts.p1 ? (
            <div className="mt-3 rounded-3xl border bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-2xl border bg-slate-50 text-sm">
                    🧠
                  </div>
                  <div className="text-sm font-semibold text-slate-900">いまの体のクセ（今回のまとめ）</div>
                </div>
                <Pill tone="slate">まとめ</Pill>
              </div>
              <div className="px-4 pb-4">
                <div className="rounded-3xl bg-slate-50/60 p-4">
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-900">
                    {explainParts.p1}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {explainParts.p2 ? (
            <div className="mt-3 rounded-3xl border bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-2xl border bg-slate-50 text-sm">
                    📡
                  </div>
                  <div className="text-sm font-semibold text-slate-900">体調の揺れを予報で先回り（未病レーダー）</div>
                </div>
                <Pill tone="emerald">予報</Pill>
              </div>
              <div className="px-4 pb-4">
                <div className="rounded-3xl bg-slate-50/60 p-4">
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-900">
                    {explainParts.p2}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* fallback */}
          {explainText && !explainParts.p2 && !explainParts.p1 ? (
            <div className="mt-3 rounded-3xl border bg-white p-4 shadow-sm">
              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-900">{explainText}</div>
            </div>
          ) : null}

          {(explainCreatedAt || explainModel) ? (
            <div className="mt-2 text-xs text-slate-400">
              {explainCreatedAt ? `生成日時：${new Date(explainCreatedAt).toLocaleString("ja-JP")}` : ""}
              {explainModel ? `　/　model: ${explainModel}` : ""}
            </div>
          ) : null}
        </div>

        {/* CTA module (single, app-like) */}
        <div className="mt-3">
          <Module>
            <SectionHeader icon="⚡️" title="次の一歩（おすすめ）" sub="結果を保存して、今日の予報と対策へ" />
            <Divider />

            {loadingAuth ? (
              <div className="text-sm text-slate-500">ログイン状態を確認中…</div>
            ) : isLoggedIn ? (
              <>
                <div className="rounded-3xl border bg-slate-50 p-4">
                  <div className="text-sm text-slate-800">
                    ログイン中：<span className="font-medium">{session.user?.email}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">今日の「予報と対策」は無料で見られます。</div>
                </div>

                <div className="mt-3">
                  {isAttached ? (
                    <div className="rounded-3xl border bg-emerald-50 p-4 text-sm text-emerald-900">
                      この結果は保存済みです ✅
                    </div>
                  ) : (
                    <div className="rounded-3xl border bg-white p-4">
                      <div className="text-sm text-slate-800">
                        この結果を保存して、今日の未病レーダーへ進みましょう。
                      </div>
                      <div className="mt-3">
                        <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                          {attaching ? "保存して移動中…" : "保存して、今日の予報と対策を見る（無料）"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => router.push("/radar")}>
                    今日の予報と対策へ
                  </Button>
                  <Button variant="ghost" onClick={() => router.push("/check")}>
                    もう一度チェックする
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-3xl border bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    無料で結果を保存して、今日の「予報と対策」へ進めます。
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    ※登録だけでは課金されません（無料の範囲で使えます）
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <Button onClick={goSignupToRadar}>無料で保存して、今日の予報と対策を見る</Button>
                  <Button variant="ghost" onClick={goLoginToRadar}>
                    すでに登録済みの方はこちら（ログイン）
                  </Button>
                </div>

                <div className="mt-3">
                  <Button variant="ghost" onClick={() => router.push("/check")}>
                    もう一度チェックする
                  </Button>
                </div>
              </>
            )}
          </Module>
        </div>

        <div className="mt-4 text-center text-xs text-slate-400">
          作成日時：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
        </div>
      </div>
    </div>
  );
}
