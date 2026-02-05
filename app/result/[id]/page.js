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
 * UI helpers (stack card sections)
 * -------------------------- */
function SectionHeader({ icon, title, right }) {
  return (
    <div className="flex items-center justify-between border-b bg-slate-50/70 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm shadow-sm ring-1 ring-slate-200">
          {icon || "•"}
        </span>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      {right ? <div className="text-xs text-slate-500">{right}</div> : null}
    </div>
  );
}

function SectionBody({ children }) {
  return <div className="px-4 py-4">{children}</div>;
}

function StackCard({ children }) {
  // “アプリっぽい”密度：角丸 + 薄影 + 枠は控えめ、背景は白固定
  return (
    <Card>
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">{children}</div>
    </Card>
  );
}

// ---------------------------
// AI text split into 2 parts
// ---------------------------
function splitExplain(text) {
  const t = (text || "").trim();
  if (!t) return { p1: "", p2: "" };

  // DB/生成文は「」なし想定
  const h1 = "いまの体のクセ（今回のまとめ）";
  const h2 = "体調の揺れを予報で先回り（未病レーダー）";

  // たまに Markdown 見出しで出ることがあるので吸収（## を無害化）
  const normalized = t.replace(/^\s*#{1,6}\s*/gm, "").trim();

  const i1 = normalized.indexOf(h1);
  const i2 = normalized.indexOf(h2);

  if (i1 === -1 && i2 === -1) return { p1: normalized, p2: "" };
  if (i1 !== -1 && i2 === -1) return { p1: normalized.slice(i1 + h1.length).trim() || normalized, p2: "" };
  if (i1 === -1 && i2 !== -1) return { p1: "", p2: normalized.slice(i2 + h2.length).trim() || "" };

  const part1 = normalized.slice(i1 + h1.length, i2).trim();
  const part2 = normalized.slice(i2 + h2.length).trim();

  return { p1: part1, p2: part2 };
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

  const explainParts = useMemo(() => splitExplain(explainText), [explainText]);

  const isLoggedIn = !!session;
  const isAttached = !!event?.is_attached;

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
        if (!silent) {
          setToast("先にログインが必要です");
          setTimeout(() => setToast(""), 2500);
        }
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

      {/* --- Hero (stack style) --- */}
      <StackCard>
        <SectionHeader icon="📝" title="あなたのお悩み" />
        <SectionBody>
          <div className="text-lg font-semibold text-slate-900">{symptomLabel}</div>
        </SectionBody>
      </StackCard>

      {/* --- Constitution (stack card + internal dividers) --- */}
      <StackCard>
        <SectionHeader icon="🧭" title="体質の見立て" />
        <SectionBody>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-500">今の体質の軸</div>
            <div className="text-lg font-semibold text-slate-900">{core.title}</div>
            <div className="text-sm leading-6 text-slate-600">{core.tcm_hint}</div>
          </div>
        </SectionBody>

        <div className="border-t" />
        <SectionHeader icon="🎯" title="整えポイント（最大2つ）" />
        <SectionBody>
          {subLabels?.length ? (
            <div className="space-y-3">
              {subLabels.map((s) => (
                <div key={s.title} className="rounded-xl bg-slate-50/60 px-4 py-3 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                    {s.short ? <div className="text-xs text-slate-500">{s.short}</div> : null}
                  </div>
                  {s.action_hint ? (
                    <div className="mt-2 text-sm leading-7 text-slate-800">{s.action_hint}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">今回は強い偏りは出ていません。</div>
          )}
        </SectionBody>

        <div className="border-t" />
        <SectionHeader icon="📍" title="体の張りやすい場所" />
        <SectionBody>
          <div className="space-y-3">
            <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">主</div>
              {meridianPrimary ? (
                <>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{meridianPrimary.title}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {meridianPrimary.body_area}（{meridianPrimary.meridians.join("・")}）
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{meridianPrimary.organs_hint}</div>
                </>
              ) : (
                <div className="mt-1 text-sm text-slate-600">今回は強い偏りなし</div>
              )}
            </div>

            <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">副</div>
              {meridianSecondary ? (
                <>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{meridianSecondary.title}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {meridianSecondary.body_area}（{meridianSecondary.meridians.join("・")}）
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{meridianSecondary.organs_hint}</div>
                </>
              ) : (
                <div className="mt-1 text-sm text-slate-600">今回は強い偏りなし</div>
              )}
            </div>
          </div>
        </SectionBody>
      </StackCard>

      {/* --- AI explain (ONE stack card containing both parts) --- */}
      <StackCard>
        <SectionHeader
          icon="🤖"
          title="あなたの体質解説"
          right={<span className="rounded-full bg-white px-2 py-1 text-[11px] shadow-sm ring-1 ring-slate-200">トトノウくん（AI）</span>}
        />

        {loadingExplain ? (
          <SectionBody>
            <div className="text-sm text-slate-600">解説文を生成しています…</div>
          </SectionBody>
        ) : explainText ? (
          <>
            <div className="border-t" />
            <SectionHeader icon="🧠" title="いまの体のクセ（今回のまとめ）" />
            <SectionBody>
              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                {explainParts.p1 || explainText}
              </div>
            </SectionBody>

            {explainParts.p2 ? (
              <>
                <div className="border-t" />
                <SectionHeader icon="📡" title="体調の揺れを予報で先回り（未病レーダー）" />
                <SectionBody>
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {explainParts.p2}
                  </div>
                </SectionBody>
              </>
            ) : null}

            {(explainCreatedAt || explainModel) ? (
              <>
                <div className="border-t" />
                <div className="px-4 py-3 text-xs text-slate-400">
                  {explainCreatedAt ? `生成日時：${new Date(explainCreatedAt).toLocaleString("ja-JP")}` : ""}
                  {explainModel ? `　/　model: ${explainModel}` : ""}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <SectionBody>
            <div className="text-sm text-slate-700">
              {explainError ? `生成に失敗しました：${explainError}` : "まだ文章がありません。"}
            </div>
            <div className="mt-3">
              <Button onClick={retryExplain} disabled={loadingExplain}>
                {loadingExplain ? "生成中…" : "もう一度生成する"}
              </Button>
            </div>
          </SectionBody>
        )}
      </StackCard>

      {/* --- CTA (ONE stack card) --- */}
      <StackCard>
        <SectionHeader icon="➡️" title="次の一歩" />
        <SectionBody>
          {loadingAuth ? (
            <div className="text-sm text-slate-500">ログイン状態を確認中…</div>
          ) : isLoggedIn ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50/60 px-4 py-3 ring-1 ring-slate-200">
                <div className="text-sm text-slate-700">
                  ログイン中：<span className="font-medium">{session.user?.email}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  保存しておくと、未病レーダーで今日の予報と提案が見られます。
                </div>
              </div>

              {!isAttached ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => attachToAccount(false)} disabled={attaching}>
                    {attaching ? "保存して移動中…" : "この結果を保存して未病レーダーへ"}
                  </Button>
                  <Button variant="ghost" onClick={() => router.push("/check")}>
                    もう一度チェックする
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => router.push("/radar")}>未病レーダーへ</Button>
                  <Button variant="ghost" onClick={() => router.push("/check")}>
                    もう一度チェックする
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50/60 px-4 py-3 ring-1 ring-slate-200">
                <div className="text-sm text-slate-800">
                  登録して結果を保存すると、未病レーダーで今日の予報と提案が見られます。
                </div>
                <div className="mt-1 text-xs text-slate-500">※登録だけで課金されることはありません</div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={goSignupToRadar}>登録して未病レーダーへ</Button>
                <Button variant="ghost" onClick={goLoginToRadar}>
                  ログインして続きへ
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => router.push("/check")}>
                  もう一度チェックする
                </Button>
              </div>
            </div>
          )}
        </SectionBody>
      </StackCard>

      <div className="text-xs text-slate-500">
        作成日時：{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "—"}
      </div>
    </div>
  );
}
