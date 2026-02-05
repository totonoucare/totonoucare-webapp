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
  // Explain: normalize & split
  // ---------------------------
  function normalizeExplain(text) {
    let t = (text || "").replace(/\r\n/g, "\n").trim();
    if (!t) return "";

    // もし過去の保存文に Markdown 見出しが混入しても UI を壊さない
    // （## 見出しだけ除去。本文の # は基本出ない前提）
    t = t.replace(/^\s*#{2,}\s*/gm, "");

    // 全角カギ括弧の残骸が入っても壊れないように、見出し行の前後に空行を作る
    t = t.replace(/\n{3,}/g, "\n\n").trim();
    return t;
  }

  function splitExplain(text) {
    const t = normalizeExplain(text);
    if (!t) return { p1: "", p2: "" };

    const h1 = "いまの体のクセ（今回のまとめ）";
    const h2 = "体調の揺れを予報で先回り（未病レーダー）";

    // 見出し行として現れた位置を探す（先頭/改行後のみマッチ）
    const re1 = new RegExp(`(^|\\n)\\s*${escapeRegExp(h1)}\\s*(\\n|$)`);
    const re2 = new RegExp(`(^|\\n)\\s*${escapeRegExp(h2)}\\s*(\\n|$)`);

    const m1 = re1.exec(t);
    const m2 = re2.exec(t);

    // 見出しが無い場合は全体を p1 として表示
    if (!m1 && !m2) return { p1: t, p2: "" };

    // h1無し/h2あり：h2以降をp2、それ以前をp1
    if (!m1 && m2) {
      const i2 = m2.index + (m2[1] ? m2[1].length : 0);
      const before = t.slice(0, i2).trim();
      const after = t.slice(i2).replace(h2, "").trim();
      return { p1: before, p2: after };
    }

    // h1あり/h2無し：h1以降をp1
    if (m1 && !m2) {
      const i1 = m1.index + (m1[1] ? m1[1].length : 0);
      const after = t.slice(i1).replace(h1, "").trim();
      return { p1: after || t, p2: "" };
    }

    // 両方あり
    const i1 = m1.index + (m1[1] ? m1[1].length : 0);
    const i2 = m2.index + (m2[1] ? m2[1].length : 0);

    // 順序が逆転してたら（稀）フォールバック
    if (i2 <= i1) return { p1: t, p2: "" };

    const part1 = t.slice(i1, i2).replace(h1, "").trim();
    const part2 = t.slice(i2).replace(h2, "").trim();

    return { p1: part1, p2: part2 };
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    <div className="space-y-4">
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border bg-white px-4 py-3 text-sm shadow">
          {toast}
        </div>
      ) : null}

      {/* --- Hero (header + body) --- */}
      <Card>
        <div className="overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border bg-white text-sm">
              🩺
            </div>
            <div className="text-sm font-semibold text-slate-800">あなたのお悩み</div>
          </div>
          <div className="bg-white px-4 py-4">
            <div className="text-lg font-semibold text-slate-900">{symptomLabel}</div>
          </div>
        </div>
      </Card>

      {/* --- Constitution (stack card inside) --- */}
      <Card>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border">
            {/* header */}
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border bg-white text-sm">
                🧭
              </div>
              <div className="text-sm font-semibold text-slate-800">体質の見立て</div>
            </div>

            {/* body (stack) */}
            <div className="bg-white">
              {/* core */}
              <div className="px-4 py-4">
                <div className="text-xs font-semibold text-slate-600">今の体質の軸</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{core.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{core.tcm_hint}</div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* sub labels */}
              <div className="px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">整えポイント（最大2つ）</div>

                {subLabels?.length ? (
                  <div className="mt-3 grid gap-2">
                    {subLabels.map((s) => (
                      <div key={s.title} className="rounded-2xl border bg-slate-50 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border bg-white px-3 py-1 text-xs font-semibold">
                            {s.title}
                          </span>
                          <span className="text-xs text-slate-500">{s.short}</span>
                        </div>
                        {s.action_hint ? (
                          <div className="mt-2 text-sm leading-6 text-slate-800">{s.action_hint}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-500">（今回は該当なし）</div>
                )}
              </div>

              <div className="h-px bg-slate-100" />

              {/* meridian areas */}
              <div className="px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">体の張りやすい場所</div>

                <div className="mt-3 grid gap-2">
                  {/* primary */}
                  <div className="rounded-2xl border bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-slate-600">主</div>
                    {meridianPrimary ? (
                      <>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{meridianPrimary.title}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
                        </div>
                        <div className="mt-2 text-xs text-slate-500">{meridianPrimary.organs_hint}</div>
                      </>
                    ) : (
                      <div className="mt-1 text-sm text-slate-500">今回は強い偏りなし</div>
                    )}
                  </div>

                  {/* secondary */}
                  <div className="rounded-2xl border bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-slate-600">副</div>
                    {meridianSecondary ? (
                      <>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{meridianSecondary.title}</div>
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
          </div>
        </div>
      </Card>

      {/* --- AI explain (single panel contains Part1/Part2) --- */}
      <Card>
        <div className="overflow-hidden rounded-2xl border">
          {/* header */}
          <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border bg-white text-sm">
                🤖
              </div>
              <div className="text-sm font-semibold text-slate-800">あなたの体質解説</div>
            </div>
            <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] text-slate-600">
              トトノウくん（AI）
            </span>
          </div>

          {/* body */}
          <div className="bg-white px-4 py-4">
            {loadingExplain ? (
              <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                解説を生成中…
              </div>
            ) : explainText ? (
              <div className="overflow-hidden rounded-2xl border">
                {/* Part 1 */}
                {explainParts.p1 ? (
                  <>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl border bg-white text-sm">
                        🧠
                      </div>
                      <div className="text-sm font-semibold text-slate-800">いまの体のクセ（今回のまとめ）</div>
                    </div>
                    <div className="bg-white px-4 py-4">
                      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                        {explainParts.p1}
                      </div>
                    </div>
                  </>
                ) : null}

                {/* divider */}
                {explainParts.p1 && explainParts.p2 ? <div className="h-px bg-slate-100" /> : null}

                {/* Part 2 */}
                {explainParts.p2 ? (
                  <>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl border bg-white text-sm">
                        📡
                      </div>
                      <div className="text-sm font-semibold text-slate-800">
                        体調の揺れを予報で先回り（未病レーダー）
                      </div>
                    </div>
                    <div className="bg-white px-4 py-4">
                      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                        {explainParts.p2}
                      </div>
                    </div>
                  </>
                ) : null}

                {/* fallback: splitが効かなかったら全文 */}
                {!explainParts.p1 && !explainParts.p2 ? (
                  <div className="bg-white px-4 py-4">
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{explainText}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border bg-white px-4 py-3">
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

            {(explainCreatedAt || explainModel) && (
              <div className="mt-3 text-xs text-slate-400">
                {explainCreatedAt ? `生成日時：${new Date(explainCreatedAt).toLocaleString("ja-JP")}` : ""}
                {explainModel ? `　/　model: ${explainModel}` : ""}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* --- CTA (single, less “free” spam) --- */}
      <Card>
        <div className="overflow-hidden rounded-2xl border">
          {/* header */}
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border bg-white text-sm">
              ➡️
            </div>
            <div className="text-sm font-semibold text-slate-800">次の一歩</div>
          </div>

          {/* body */}
          <div className="bg-white px-4 py-4">
            {loadingAuth ? (
              <div className="text-sm text-slate-500">ログイン状態を確認中…</div>
            ) : isLoggedIn ? (
              <>
                <div className="rounded-2xl border bg-slate-50 px-4 py-3">
                  <div className="text-sm text-slate-700">
                    ログイン中：<span className="font-medium">{session.user?.email}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    レーダーで「今日の予報と対策」を確認できます。
                  </div>
                </div>

                <div className="mt-3">
                  {isAttached ? (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => router.push("/radar")}>レーダーへ進む</Button>
                      <Button variant="ghost" onClick={() => router.push("/check")}>
                        もう一度チェックする
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border bg-white px-4 py-3">
                      <div className="text-sm text-slate-700">
                        この結果を保存して、レーダーへ進みましょう。
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                          {attaching ? "保存して移動中…" : "保存してレーダーへ"}
                        </Button>
                        <Button variant="ghost" onClick={() => router.push("/check")}>
                          もう一度チェックする
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border bg-slate-50 px-4 py-3">
                  <div className="text-sm text-slate-800">
                    アカウントを作成して結果を保存すると、レーダーで「今日の予報と対策」を見られます。
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    ※登録だけで自動的に料金が発生することはありません
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={goSignupToRadar}>結果を保存してレーダーへ</Button>
                  <Button variant="ghost" onClick={goLoginToRadar}>
                    ログインして続きへ
                  </Button>
                </div>

                <div className="mt-2">
                  <Button variant="ghost" onClick={() => router.push("/check")}>
                    もう一度チェックする
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="text-xs text-slate-500">
        作成日時：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
      </div>
    </div>
  );
}
