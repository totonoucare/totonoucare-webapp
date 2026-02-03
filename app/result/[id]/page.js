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

        // ✅ もし /events/[id] が ai_explain_* を返すようになっていたら、そのまま表示
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
  // Auto-attach after login
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
  // - If explain already present in event -> show it
  // - Else call POST /explain once (server caches in DB)
  // ---------------------------
  useEffect(() => {
    if (!event || event?.notFound) return;
    if (loadingEvent) return;

    // すでに表示できるものがあるなら、APIを叩かない
    if (explainText) return;

    // 多重防止（マウント/再レンダリングで二重に叩かない）
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
    // もう一度生成/取得（キャッシュがあればそれが返る想定）
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

      // refresh event
      const r2 = await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(id)}`);
      const j2 = await r2.json().catch(() => ({}));
      if (r2.ok && j2?.data) setEvent(j2.data);

      setToast("結果を保存しました ✅");

      if (attachAfterLogin) {
        router.replace(`/result/${id}`);
      }
    } catch (e) {
      setToast(e?.message || String(e));
    } finally {
      setAttaching(false);
      setTimeout(() => setToast(""), 2500);
    }
  }

  function goSignupToAttach() {
    router.push(
      `/signup?result=${encodeURIComponent(id)}&next=${encodeURIComponent(
        `/result/${id}?attach=1`
      )}`
    );
  }

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

  const isLoggedIn = !!session;
  const isAttached = !!event?.is_attached;

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-xl border bg-white px-4 py-3 text-sm shadow">
          {toast}
        </div>
      ) : null}

      <Card>
        <div className="space-y-2">
          <div className="text-xs text-slate-500">あなたのお悩み</div>
          <div className="text-lg font-semibold">{symptomLabel}</div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <div className="text-xl font-semibold">体質の見立て</div>

          <div className="rounded-xl border bg-slate-50 px-4 py-3">
            <div className="text-sm text-slate-600">メイン</div>
            <div className="mt-1 text-lg font-semibold">{core.title}</div>
            <div className="mt-1 text-sm text-slate-600">{core.tcm_hint}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">サブラベル（最大2つ）</div>

            {subLabels?.length ? (
              <div className="space-y-2">
                {subLabels.map((s) => (
                  <div key={s.title} className="rounded-xl border bg-white px-3 py-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="rounded-full border bg-white px-3 py-1 text-xs">
                        {s.title}
                      </span>
                      <span className="text-xs text-slate-500">{s.short}</span>
                    </div>
                    {s.action_hint ? (
                      <div className="mt-2 text-xs text-slate-600">{s.action_hint}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">（今回は該当なし）</div>
            )}
          </div>

          {meridianPrimary ? (
            <div className="rounded-xl border bg-white px-4 py-3">
              <div className="text-sm font-semibold">主ライン：{meridianPrimary.title}</div>
              <div className="mt-1 text-xs text-slate-600">
                {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
              </div>
              <div className="mt-2 text-xs text-slate-500">{meridianPrimary.organs_hint}</div>
            </div>
          ) : null}

          {meridianSecondary ? (
            <div className="rounded-xl border bg-white px-4 py-3">
              <div className="text-sm font-semibold">副ライン：{meridianSecondary.title}</div>
              <div className="mt-1 text-xs text-slate-600">
                {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
              </div>
              <div className="mt-2 text-xs text-slate-500">{meridianSecondary.organs_hint}</div>
            </div>
          ) : null}
        </div>
      </Card>

      {/* ✅ AI読み物（初回だけ生成→保存→以後キャッシュ表示） */}
      <Card>
        <div className="space-y-3">
          <div className="text-xl font-semibold">あなたの体質解説</div>

          {loadingExplain ? (
            <div className="text-sm text-slate-600">AIが解説文を生成中…</div>
          ) : explainText ? (
            <>
              <div className="whitespace-pre-wrap text-sm text-slate-700">{explainText}</div>
              <div className="text-xs text-slate-400">
                {explainCreatedAt
                  ? `生成日時：${new Date(explainCreatedAt).toLocaleString("ja-JP")}`
                  : ""}
                {explainModel ? `　/　model: ${explainModel}` : ""}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-slate-600">
                {explainError ? `生成に失敗しました：${explainError}` : "まだ文章がありません。"}
              </div>
              <Button onClick={retryExplain} disabled={loadingExplain}>
                {loadingExplain ? "生成中…" : "もう一度生成する"}
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <div className="text-sm font-semibold">次のステップ</div>

          {loadingAuth ? (
            <div className="text-sm text-slate-500">ログイン状態を確認中…</div>
          ) : isLoggedIn ? (
            <>
              <div className="text-sm text-slate-600">ログイン中：{session.user?.email}</div>

              {isAttached ? (
                <div className="rounded-xl border bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  この結果は保存済みです ✅
                </div>
              ) : (
                <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                  {attaching ? "保存中…" : "この結果をアカウントに保存する"}
                </Button>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => router.push("/radar")}>
                  レーダーを見る
                </Button>
                <Button variant="ghost" onClick={() => router.push("/check")}>
                  別の条件でやり直す
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-slate-600">
                未ログイン（結果は無料で見られます。保存・ガイド・記録は登録後）
              </div>

              <Button onClick={goSignupToAttach}>この結果を保存して登録する</Button>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => router.push("/check")}>
                  別の条件でやり直す
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
