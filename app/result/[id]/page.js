// app/result/[id]/page.js
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import {
  SYMPTOM_LABELS,
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
} from "@/lib/diagnosis/v2/labels";

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

  // ---------------------------
  // AI text split into 2 parts (robust)
  // - Handles:
  //   - headings with/without quotes
  //   - markdown "## " prefix
  //   - accidental whitespace
  // ---------------------------
  function splitExplain(text) {
    const raw = (text || "").replace(/\r/g, "").trim();
    if (!raw) return { p1: "", p2: "" };

    // normalize: remove leading markdown heading tokens in-line (only affects matching)
    const normalized = raw.replace(/^\s*#{1,6}\s*/gm, "").trim();

    const variants = {
      h1: [
        "いまの体のクセ（今回のまとめ）",
        "いまの体のクセ（今回のまとめ） ",
        "「いまの体のクセ（今回のまとめ）」",
      ],
      h2: [
        "体調の揺れを予報で先回り（未病レーダー）",
        "体調の揺れを予報で先回り（未病レーダー） ",
        "「体調の揺れを予報で先回り（未病レーダー）」",
      ],
    };

    const findIndex = (t, list) => {
      for (const h of list) {
        const i = t.indexOf(h);
        if (i !== -1) return { i, h };
      }
      return { i: -1, h: "" };
    };

    const a = findIndex(normalized, variants.h1);
    const b = findIndex(normalized, variants.h2);

    // can't split -> show all as part1
    if (a.i === -1 && b.i === -1) return { p1: raw, p2: "" };
    if (a.i !== -1 && b.i === -1) {
      const t = normalized.slice(a.i + a.h.length).trim();
      return { p1: t || raw, p2: "" };
    }
    if (a.i === -1 && b.i !== -1) {
      const t2 = normalized.slice(b.i + b.h.length).trim();
      return { p1: raw, p2: t2 || "" };
    }

    // both exist
    const start1 = a.i + a.h.length;
    const start2 = b.i + b.h.length;

    const part1 = normalized.slice(start1, b.i).trim();
    const part2 = normalized.slice(start2).trim();

    return {
      p1: part1 || normalized.slice(0, b.i).trim(),
      p2: part2 || normalized.slice(b.i).trim(),
    };
  }

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
        <div className="text-sm text-slate-600">期限切れ/削除、または保存に失敗した可能性があります。</div>
        <Button onClick={() => router.push("/check")}>体質チェックをやり直す</Button>
      </div>
    );
  }

  // ---------------------------
  // Small UI atoms
  // ---------------------------
  function SectionChip({ emoji, title }) {
    return (
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full border bg-emerald-50 text-sm">
          {emoji}
        </span>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
    );
  }

  function Panel({ children, tone = "base" }) {
    const toneClass =
      tone === "mint"
        ? "bg-emerald-50/40 border-emerald-100"
        : tone === "slate"
          ? "bg-slate-50 border-slate-200"
          : "bg-white border-slate-200";
    return <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>{children}</div>;
  }

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="space-y-4">
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border bg-white px-4 py-3 text-sm shadow">
          {toast}
        </div>
      ) : null}

      {/* --- Hero --- */}
      <Card>
        <div className="space-y-2">
          <div className="text-xs text-slate-500">あなたのお悩み</div>
          <div className="text-lg font-semibold text-slate-900">{symptomLabel}</div>
        </div>
      </Card>

      {/* --- Constitution --- */}
      <Card>
        <div className="space-y-4">
          <div className="text-xl font-semibold text-slate-900">体質の見立て</div>

          {/* Core (axis) */}
          <Panel tone="mint">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-emerald-800/80">今の体質の軸</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{core.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-700">{core.tcm_hint}</div>
              </div>
              <div className="hidden sm:block">
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-800">
                  レーダーの“基礎データ”
                </span>
              </div>
            </div>
          </Panel>

          {/* Sub labels */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">整えポイント（最大2つ）</div>

            {subLabels?.length ? (
              <div className="grid gap-2">
                {subLabels.map((s) => (
                  <div
                    key={s.title}
                    className="rounded-2xl border bg-white px-4 py-3 shadow-[0_1px_0_0_rgba(15,23,42,0.03)]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                        {s.title}
                      </span>
                      <span className="text-xs text-slate-500">{s.short}</span>
                    </div>
                    {s.action_hint ? (
                      <div className="mt-2 text-sm leading-7 text-slate-800">{s.action_hint}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-slate-500">
                今回は強い偏りは出ていません
              </div>
            )}
          </div>

          {/* Meridians */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">体の張りやすい場所</div>

            <div className="grid gap-2">
              <div className="rounded-2xl border bg-white px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">（主）</div>
                {meridianPrimary ? (
                  <>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {meridianPrimary.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{meridianPrimary.organs_hint}</div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-slate-500">今回は強い偏りなし</div>
                )}
              </div>

              <div className="rounded-2xl border bg-white px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">（副）</div>
                {meridianSecondary ? (
                  <>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {meridianSecondary.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{meridianSecondary.organs_hint}</div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-slate-500">今回は強い偏りなし</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* --- AI explain (single card that CONTAINS both parts) --- */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border bg-emerald-50 text-lg">
                🤖
              </span>
              <div>
                <div className="text-xl font-semibold text-slate-900">あなたの体質解説</div>
                <div className="mt-0.5 text-xs text-slate-500">トトノウくん（AI）</div>
              </div>
            </div>

            {/* small pill */}
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
              読み物モード
            </span>
          </div>

          {loadingExplain ? (
            <Panel tone="slate">
              <div className="text-sm text-slate-700">トトノウくんが解説文を生成中です…</div>
              <div className="mt-1 text-xs text-slate-500">（初回のみ。少しだけお待ちください）</div>
            </Panel>
          ) : explainText ? (
            <div className="space-y-3">
              {/* Part 1 */}
              {explainParts.p1 ? (
                <div className="rounded-2xl border bg-white">
                  <div className="flex items-center justify-between gap-3 border-b bg-emerald-50/40 px-4 py-3">
                    <SectionChip emoji="🧠" title="いまの体のクセ（今回のまとめ）" />
                    <span className="text-[11px] font-semibold text-emerald-800/80">まとめ</span>
                  </div>

                  <div className="px-4 py-4">
                    <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-4 border-l-4 border-l-emerald-300">
                      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                        {explainParts.p1}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Part 2 */}
              {explainParts.p2 ? (
                <div className="rounded-2xl border bg-white">
                  <div className="flex items-center justify-between gap-3 border-b bg-emerald-50/40 px-4 py-3">
                    <SectionChip emoji="📡" title="体調の揺れを予報で先回り（未病レーダー）" />
                    <span className="text-[11px] font-semibold text-emerald-800/80">次へ</span>
                  </div>

                  <div className="px-4 py-4">
                    <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-4 border-l-4 border-l-emerald-300">
                      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                        {explainParts.p2}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* fallback: if split failed */}
              {!explainParts.p1 && !explainParts.p2 ? (
                <Panel>
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {explainText}
                  </div>
                </Panel>
              ) : null}

              {/* metadata (quiet) */}
              {(explainCreatedAt || explainModel) && (
                <div className="text-xs text-slate-400">
                  {explainCreatedAt
                    ? `生成日時：${new Date(explainCreatedAt).toLocaleString("ja-JP")}`
                    : ""}
                  {explainModel ? `　/　model: ${explainModel}` : ""}
                </div>
              )}
            </div>
          ) : (
            <Panel>
              <div className="text-sm text-slate-800">
                {explainError ? `生成に失敗しました：${explainError}` : "解説文の準備ができていません。"}
              </div>
              <div className="mt-3">
                <Button onClick={retryExplain} disabled={loadingExplain}>
                  {loadingExplain ? "生成中…" : "もう一度生成する"}
                </Button>
              </div>
            </Panel>
          )}
        </div>
      </Card>

      {/* --- CTA --- */}
      <Card>
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-900">次の一歩</div>

          {loadingAuth ? (
            <div className="text-sm text-slate-500">ログイン状態を確認中…</div>
          ) : isLoggedIn ? (
            <>
              <Panel tone="slate">
                <div className="text-sm text-slate-800">
                  ログイン中：<span className="font-medium">{session.user?.email}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  次は「今日の予報と対策」をレーダーで確認できます。
                </div>
              </Panel>

              {isAttached ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  この結果は保存済みです ✅
                </div>
              ) : (
                <div className="rounded-2xl border bg-white px-4 py-3">
                  <div className="text-sm text-slate-800">
                    この結果を保存して、未病レーダーへ進みましょう。
                  </div>
                  <div className="mt-3">
                    <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                      {attaching ? "保存して移動中…" : "結果を保存して、レーダーへ進む"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => router.push("/radar")}>
                  レーダーを見る
                </Button>
                <Button variant="ghost" onClick={() => router.push("/check")}>
                  もう一度チェックする
                </Button>
              </div>
            </>
          ) : (
            <>
              <Panel tone="slate">
                <div className="text-sm text-slate-800">
                  登録して結果を保存すると、未病レーダーで「今日の予報と対策」へ進めます。
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  登録のみで課金は発生しません（無料の範囲で利用できます）
                </div>
              </Panel>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={goSignupToRadar}>登録して、レーダーへ進む</Button>
                <Button variant="ghost" onClick={goLoginToRadar}>
                  すでに登録済みの方はこちら（ログイン）
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => router.push("/check")}>
                  もう一度チェックする
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="text-xs text-slate-500">
        作成日時：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
      </div>
    </div>
  );
}
