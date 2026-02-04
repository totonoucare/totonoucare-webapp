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
// AI text split into 2 parts
// ---------------------------
function splitExplain(text) {
  const t0 = (text || "").trim();
  if (!t0) return { p1: "", p2: "" };

  // 見出し候補（「」なしを正とする）
  const H1 = "いまの体のクセ（今回のまとめ）";
  const H2 = "体調の揺れを予報で先回り（未病レーダー）";

  // 「」や Markdown 見出し混入を吸収するための正規表現
  // - 行頭の # を許容
  // - 「」や "" を許容
  const reH1 = new RegExp(
    String.raw`^\s*(?:#{1,6}\s*)?(?:[「"]\s*)?${escapeRegExp(H1)}(?:\s*[」"])?\s*$`,
    "m"
  );
  const reH2 = new RegExp(
    String.raw`^\s*(?:#{1,6}\s*)?(?:[「"]\s*)?${escapeRegExp(H2)}(?:\s*[」"])?\s*$`,
    "m"
  );

  const m1 = reH1.exec(t0);
  const m2 = reH2.exec(t0);

  // 見出しが見つからないなら全文をpart1に
  if (!m1 && !m2) return { p1: t0, p2: "" };

  // 見出し1がない/見出し2がないケースは、分割せず全文をpart1に寄せる
  if (!m1 || !m2) return { p1: t0, p2: "" };

  // 見出し位置
  const start1 = m1.index + m1[0].length;
  const start2 = m2.index;

  // 逆転してたら壊れてるので全文返す
  if (start2 <= start1) return { p1: t0, p2: "" };

  const part1 = t0.slice(start1, start2).trim();
  const part2 = t0.slice(start2 + m2[0].length).trim();

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

{/* --- Hero --- */}
<Card>
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
        🩺 あなたのお悩み
      </span>

      <span className="rounded-full border bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
        結果は無料で閲覧OK
      </span>
    </div>

    <div className="rounded-2xl border bg-white px-4 py-4 border-l-4 border-l-slate-300">
      <div className="text-xl font-semibold text-slate-900">{symptomLabel}</div>
      <div className="mt-2 text-xs text-slate-500">
        この結果を保存すると、今日の「予報と対策」（無料）へ進めます。
      </div>
    </div>
  </div>
</Card>

{/* --- Constitution: one card with clear sections --- */}
<Card>
  <div className="space-y-4">
    <div className="text-xl font-semibold">体質の見立て</div>

    {/* Section: core */}
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          🧭 今の体質の軸
        </span>
      </div>

      <div className="rounded-2xl border bg-white px-4 py-4 border-l-4 border-l-slate-300">
        <div className="text-lg font-semibold text-slate-900">{core.title}</div>
        <div className="mt-2 text-sm leading-7 text-slate-700">{core.tcm_hint}</div>
      </div>
    </section>

    {/* Section: sub labels */}
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          🛠️ 整えポイント（最大2つ）
        </span>
      </div>

      {subLabels?.length ? (
        <div className="grid gap-2">
          {subLabels.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border bg-white px-4 py-4 border-l-4 border-l-slate-300"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {s.title}
                </span>
                <span className="text-xs text-slate-500">{s.short}</span>
              </div>

              {s.action_hint ? (
                <div className="mt-3 text-sm leading-7 text-slate-800">{s.action_hint}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white px-4 py-4 text-sm text-slate-500 border-l-4 border-l-slate-300">
          今回は該当なし
        </div>
      )}
    </section>

    {/* Section: meridian areas */}
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          📍 体の張りやすい場所
        </span>
      </div>

      <div className="grid gap-2">
        {/* primary */}
        <div className="rounded-2xl border bg-white px-4 py-4 border-l-4 border-l-slate-300">
          <div className="text-sm font-semibold text-slate-900">
            （主）{meridianPrimary ? meridianPrimary.title : "今回は強い偏りなし"}
          </div>

          {meridianPrimary ? (
            <>
              <div className="mt-2 text-xs text-slate-600">
                {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
              </div>
              <div className="mt-3 text-xs leading-6 text-slate-500">
                {meridianPrimary.organs_hint}
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-slate-500">気になる場所ベースで整えてOKです。</div>
          )}
        </div>

        {/* secondary */}
        <div className="rounded-2xl border bg-white px-4 py-4 border-l-4 border-l-slate-300">
          <div className="text-sm font-semibold text-slate-900">
            （副）{meridianSecondary ? meridianSecondary.title : "今回は強い偏りなし"}
          </div>

          {meridianSecondary ? (
            <>
              <div className="mt-2 text-xs text-slate-600">
                {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
              </div>
              <div className="mt-3 text-xs leading-6 text-slate-500">
                {meridianSecondary.organs_hint}
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-slate-500">気になる場所ベースで整えてOKです。</div>
          )}
        </div>
      </div>
    </section>
  </div>
</Card>

      {/* --- AI explain (split into two cards) --- */}
      <div className="space-y-4">
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="text-xl font-semibold">あなたの体質解説</div>
              <span className="rounded-full border bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                トトノウくん（AI）
              </span>
            </div>

            {loadingExplain ? (
              <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                トトノウくん（AI）が解説文を生成中…
              </div>
            ) : explainText ? (
              <div className="text-xs text-slate-500">
                ※この解説は初回だけ生成して保存されます
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
          </div>
        </Card>

{/* Part 1 */}
{explainParts.p1 ? (
  <Card>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          🧠 いまの体のクセ（今回のまとめ）
        </span>
      </div>

      <div className="rounded-2xl border bg-white px-4 py-4 border-l-4 border-l-slate-300">
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
          {explainParts.p1}
        </div>
      </div>
    </div>
  </Card>
) : null}

{/* Part 2 */}
{explainParts.p2 ? (
  <Card>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          📡 体調の揺れを予報で先回り（未病レーダー）
        </span>
      </div>

      <div className="rounded-2xl border bg-white px-4 py-4 border-l-4 border-l-slate-300">
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
          {explainParts.p2}
        </div>
      </div>
    </div>
  </Card>
) : null}

        {/* fallback: if split failed, show whole text once */}
        {explainText && !explainParts.p2 && !explainParts.p1 ? (
          <Card>
            <div className="rounded-2xl border bg-white px-4 py-4">
              <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{explainText}</div>
            </div>
          </Card>
        ) : null}

        {/* metadata (optional) */}
        {(explainCreatedAt || explainModel) && (
          <div className="text-xs text-slate-400">
            {explainCreatedAt
              ? `生成日時：${new Date(explainCreatedAt).toLocaleString("ja-JP")}`
              : ""}
            {explainModel ? `　/　model: ${explainModel}` : ""}
          </div>
        )}
      </div>

      {/* --- Single CTA card --- */}
      <Card>
        <div className="space-y-3">
          <div className="text-sm font-semibold">次の一歩（おすすめ）</div>

          {loadingAuth ? (
            <div className="text-sm text-slate-500">ログイン状態を確認中…</div>
          ) : isLoggedIn ? (
            <>
              <div className="rounded-2xl border bg-slate-50 px-4 py-3">
                <div className="text-sm text-slate-700">
                  ログイン中：<span className="font-medium">{session.user?.email}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  今日の「予報と対策」は無料で見られます。
                </div>
              </div>

              {isAttached ? (
                <div className="rounded-2xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  この結果は保存済みです ✅
                </div>
              ) : (
                <div className="rounded-2xl border bg-white px-4 py-3">
                  <div className="text-sm text-slate-700">
                    この結果を保存して、今日の未病レーダーへ進みましょう。
                  </div>
                  <div className="mt-3">
                    <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                      {attaching ? "保存して移動中…" : "保存して、今日の予報と対策を見る（無料）"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
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
              <div className="rounded-2xl border bg-slate-50 px-4 py-3">
                <div className="text-sm text-slate-800">
                  無料で結果を保存して、今日の「予報と対策」へ進めます。
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  ※登録だけでは課金されません（無料の範囲で使えます）
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={goSignupToRadar}>無料で保存して、今日の予報と対策を見る</Button>
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
