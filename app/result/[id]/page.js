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
  // AI text cleanup + split into 2 parts
  // ---------------------------
  function normalizeExplain(text) {
    let t = (text || "").trim();
    if (!t) return "";

    // markdownの見出し記号を除去（## などが混じっても崩れないように）
    t = t.replace(/^\s*#{1,6}\s*/gm, "");

    // 全角引用符・半角引用符の見出し表現も吸収したいので、本文中の「」自体は保持しつつ、
    // splitの判定は「あり/なし両対応」にする（後段で対応）
    return t.trim();
  }

  function splitExplain(text) {
    const t = normalizeExplain(text);
    if (!t) return { p1: "", p2: "" };

    // 見出しは「あり/なし」両方でヒットさせる
    const h1a = "いまの体のクセ（今回のまとめ）";
    const h2a = "体調の揺れを予報で先回り（未病レーダー）";
    const h1b = `「${h1a}」`;
    const h2b = `「${h2a}」`;

    // どれが入っているかを先に判定
    const has1 = t.includes(h1a) || t.includes(h1b);
    const has2 = t.includes(h2a) || t.includes(h2b);

    // 位置計算（先に見つかった方を採用）
    const idx = (needle) => {
      const i = t.indexOf(needle);
      return i === -1 ? Number.POSITIVE_INFINITY : i;
    };

    const i1 = Math.min(idx(h1a), idx(h1b));
    const i2 = Math.min(idx(h2a), idx(h2b));

    // どっちもない：そのまま全部p1へ
    if (!has1 && !has2) return { p1: t, p2: "" };

    // h2だけある：h2以降をp2として、p1は前段（あれば）
    if (!has1 && has2) {
      const part2 = t.slice(i2 + h2a.length).replace(h2b, "").trim();
      const part1 = t.slice(0, i2).trim();
      return { p1: part1, p2: part2 || "" };
    }

    // h1だけある：h1以降をp1
    if (has1 && !has2) {
      const start = i1 + h1a.length;
      const part1 = t.slice(start).replace(h1b, "").trim();
      return { p1: part1 || t, p2: "" };
    }

    // 両方ある
    if (i1 < i2) {
      const part1 = t
        .slice(i1 + h1a.length, i2)
        .replace(h1b, "")
        .replace(h2b, "")
        .trim();
      const part2 = t.slice(i2 + h2a.length).replace(h2b, "").trim();
      return {
        p1: part1 || t.slice(0, i2).trim(),
        p2: part2 || t.slice(i2).trim(),
      };
    }

    // 例外：順番が逆に出たら、全体をp1に寄せる（破綻防止）
    return { p1: t, p2: "" };
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
        <div className="space-y-2">
          <div className="text-xs text-slate-500">あなたのお悩み</div>
          <div className="text-lg font-semibold">{symptomLabel}</div>
        </div>
      </Card>

      {/* --- Constitution (stack card style) --- */}
      <Card>
        <div className="space-y-3">
          <div className="text-xl font-semibold">体質の見立て</div>

          <div className="overflow-hidden rounded-2xl border bg-white">
            {/* row: core */}
            <div className="px-4 py-4">
              <div className="text-xs font-semibold text-slate-600">今の体質の軸</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{core.title}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{core.tcm_hint}</div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* row: sub labels */}
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

            {/* row: meridian areas */}
            <div className="px-4 py-4">
              <div className="text-sm font-semibold text-slate-900">体の張りやすい場所</div>

              <div className="mt-3 grid gap-2">
                {/* primary */}
                <div className="rounded-2xl border bg-white px-4 py-3">
                  <div className="text-xs font-semibold text-slate-600">主</div>
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

                {/* secondary */}
                <div className="rounded-2xl border bg-white px-4 py-3">
                  <div className="text-xs font-semibold text-slate-600">副</div>
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
        </div>
      </Card>

      {/* --- AI explain (single card that contains Part1/Part2 panels) --- */}
      <Card>
        <div className="space-y-3">
          {/* header */}
          <div className="flex items-center gap-2">
            <div className="text-xl font-semibold">あなたの体質解説</div>
            <span className="rounded-full border bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              トトノウくん（AI）
            </span>
          </div>

          {/* body */}
          {loadingExplain ? (
            <div className="overflow-hidden rounded-2xl border bg-white">
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="h-2 w-2 animate-pulse rounded-full bg-slate-300" />
                <div className="text-sm text-slate-600">解説文を生成しています…</div>
              </div>
            </div>
          ) : explainText ? (
            <div className="grid gap-3">
              {/* Part 1 panel */}
              {explainParts.p1 ? (
                <div className="overflow-hidden rounded-2xl border bg-white">
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border bg-white text-sm">
                      🧠
                    </div>
                    <div className="text-sm font-semibold text-slate-800">いまの体のクセ（今回のまとめ）</div>
                  </div>
                  <div className="px-4 py-4">
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                      {explainParts.p1}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Part 2 panel */}
              {explainParts.p2 ? (
                <div className="overflow-hidden rounded-2xl border bg-white">
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border bg-white text-sm">
                      📡
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      体調の揺れを予報で先回り（未病レーダー）
                    </div>
                  </div>
                  <div className="px-4 py-4">
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                      {explainParts.p2}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* fallback */}
              {!explainParts.p1 && !explainParts.p2 ? (
                <div className="overflow-hidden rounded-2xl border bg-white">
                  <div className="px-4 py-4">
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                      {normalizeExplain(explainText)}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white">
              <div className="px-4 py-4">
                <div className="text-sm text-slate-700">
                  {explainError ? `生成に失敗しました：${explainError}` : "まだ文章がありません。"}
                </div>
                <div className="mt-3">
                  <Button onClick={retryExplain} disabled={loadingExplain}>
                    {loadingExplain ? "生成中…" : "もう一度生成する"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* metadata */}
          {(explainCreatedAt || explainModel) && (
            <div className="text-xs text-slate-400">
              {explainCreatedAt
                ? `生成日時：${new Date(explainCreatedAt).toLocaleString("ja-JP")}`
                : ""}
              {explainModel ? `　/　model: ${explainModel}` : ""}
            </div>
          )}
        </div>
      </Card>

      {/* --- CTA (single, app-like panel) --- */}
      <Card>
        <div className="space-y-3">
          <div className="text-sm font-semibold">次の一歩</div>

          {loadingAuth ? (
            <div className="text-sm text-slate-500">ログイン状態を確認中…</div>
          ) : isLoggedIn ? (
            <>
              <div className="overflow-hidden rounded-2xl border bg-white">
                <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                  <div className="text-sm text-slate-700">
                    ログイン中：<span className="font-medium">{session.user?.email}</span>
                  </div>
                  {isAttached ? (
                    <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] text-slate-600">
                      保存済み
                    </span>
                  ) : (
                    <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] text-slate-600">
                      未保存
                    </span>
                  )}
                </div>

                <div className="px-4 py-4">
                  {isAttached ? (
                    <div className="text-sm text-slate-700">
                      未病レーダーで「今日の予報と対策」を確認できます。
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-slate-700">
                        この結果を保存して、未病レーダーへ進みましょう。
                      </div>
                      <div className="mt-3">
                        <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                          {attaching ? "保存して移動中…" : "保存して、未病レーダーへ進む"}
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => router.push("/radar")}>
                      未病レーダーを見る
                    </Button>
                    <Button variant="ghost" onClick={() => router.push("/check")}>
                      もう一度チェックする
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border bg-white">
                <div className="bg-slate-50 px-4 py-3">
                  <div className="text-sm text-slate-800">
                    記録を残しておくと、次に見返すのが楽になります。
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    ※登録しただけで課金されることはありません
                  </div>
                </div>

                <div className="px-4 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={goSignupToRadar}>登録して未病レーダーへ進む</Button>
                    <Button variant="ghost" onClick={goLoginToRadar}>
                      すでに登録済みの方はこちら（ログイン）
                    </Button>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" onClick={() => router.push("/check")}>
                      もう一度チェックする
                    </Button>
                  </div>
                </div>
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
