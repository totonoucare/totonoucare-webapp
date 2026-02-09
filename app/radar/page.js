// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

function levelLabel3(level) {
  return ["安定", "注意", "要警戒"][level] ?? "—";
}

function levelBadgeClass3(level) {
  if (level === 0) return "bg-slate-100 text-slate-800 border-slate-200";
  if (level === 1) return "bg-amber-100 text-amber-900 border-amber-200";
  if (level === 2) return "bg-red-600 text-white border-red-600";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function hhmm(t) {
  if (!t) return "—";
  // "YYYY-MM-DDTHH:00" -> "HH:00"
  return String(t).slice(11, 16);
}

export default function RadarPage() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [toast, setToast] = useState({ open: false, message: "", variant: "info" });
  const [toastTimer, setToastTimer] = useState(null);

  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const [explain, setExplain] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  const notify = (message, variant = "success") => {
    if (toastTimer) clearTimeout(toastTimer);
    setToast({ open: true, message, variant });
    const t = setTimeout(() => setToast((p) => ({ ...p, open: false })), 2500);
    setToastTimer(t);
  };

  useEffect(() => {
    let unsub = null;

    (async () => {
      try {
        if (!supabase) {
          setSession(null);
          setLoadingAuth(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        setSession(data.session || null);
        setLoadingAuth(false);

        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s || null));
        unsub = sub?.subscription;
      } catch (e) {
        console.error(e);
        setSession(null);
        setLoadingAuth(false);
      }
    })();

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch {}
    };
  }, []);

  async function authedFetch(path, opts = {}) {
    if (!supabase) throw new Error("supabase not ready");
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("not logged in");

    const res = await fetch(path, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  async function loadAll() {
    if (!session) return;

    setLoadingData(true);
    setLoadingExplain(true);
    setExplain(null);

    try {
      const r1 = await authedFetch("/api/radar/today");
      setData(r1?.data || null);

      const r2 = await authedFetch("/api/radar/today/explain");
      setExplain(r2?.data || null);
    } catch (e) {
      console.error(e);
      notify(e?.message || "読み込みに失敗しました", "error");
      setData(null);
      setExplain(null);
    } finally {
      setLoadingData(false);
      setLoadingExplain(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  if (loadingAuth) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">未病レーダー</h1>
          <p className="text-sm text-slate-600">読み込み中…</p>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">未病レーダー</h1>

          <Card title="ログインが必要です">
            <p className="text-slate-700">レーダーはログイン後に利用できます。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/signup">
                <Button>ログイン / 登録</Button>
              </a>
              <a href="/check">
                <Button variant="secondary">体質チェックへ</Button>
              </a>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (loadingData) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">未病レーダー</h1>
          <p className="text-sm text-slate-600">読み込み中…</p>
        </div>
      </>
    );
  }

  // 体質がない場合
  if (!data && explain?.text?.includes("体質情報が未設定")) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">未病レーダー</h1>
          <Card title="体質情報がありません">
            <p className="text-slate-700">先に体質チェックを行うと、レーダー精度が上がります。</p>
            <div className="mt-3">
              <a href="/check">
                <Button>体質チェックへ</Button>
              </a>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">未病レーダー</h1>
          <Card title="読み込みに失敗しました">
            <p className="text-slate-600">再読み込みしてください。</p>
            <div className="mt-3">
              <Button onClick={loadAll}>再読み込み</Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const radar = data?.radar || {};
  const external = data?.external || {};
  const windows = Array.isArray(data?.time_windows) ? data.time_windows : [];
  const warnWindows = windows.filter((w) => (w.level3 ?? 0) >= 1);

  return (
    <>
      <Toast open={toast.open} message={toast.message} variant={toast.variant} />

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">未病レーダー</h1>
            <p className="text-xs text-slate-500">ログイン中：{session.user?.email}</p>
          </div>

          <div className="flex gap-2">
            <a href="/history" className="shrink-0">
              <Button variant="secondary">履歴</Button>
            </a>
            <a href="/check" className="shrink-0">
              <Button variant="secondary">体質チェック</Button>
            </a>
          </div>
        </div>

        <Card
          title={
            <div className="flex items-center justify-between gap-3">
              <span>今日の予報</span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${levelBadgeClass3(
                  radar.level
                )}`}
              >
                {levelLabel3(radar.level)}
              </span>
            </div>
          }
        >
          <div className="space-y-2">
            <p className="text-slate-700 whitespace-pre-wrap">
              {radar.reason_text || "（理由がありません）"}
            </p>

            {Array.isArray(radar?.chips) && radar.chips.length ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {radar.chips.slice(0, 8).map((c) => (
                  <span key={c} className="rounded-full border bg-white px-3 py-1 text-xs text-slate-700">
                    {c}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="pt-2 text-xs text-slate-500">
              現在：気温 {external?.temp ?? "—"}℃ / 湿度 {external?.humidity ?? "—"}% / 気圧 {external?.pressure ?? "—"}hPa
            </div>
          </div>
        </Card>

        <Card title="注意が出やすい時間帯（次の24時間）">
          {!warnWindows.length ? (
            <p className="text-sm text-slate-600">目立つ山は小さめです（急に悪化しやすい時間帯は少なめ）。</p>
          ) : (
            <div className="space-y-2">
              {warnWindows
                .slice()
                .sort((a, b) => (b.risk ?? 0) - (a.risk ?? 0))
                .slice(0, 10)
                .map((w) => (
                  <div key={w.time} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{hhmm(w.time)}頃</div>
                      <div className="text-xs text-slate-600">
                        {Array.isArray(w.top_sixin) ? w.top_sixin.join("・") : "—"}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${levelBadgeClass3(
                        w.level3
                      )}`}
                    >
                      {levelLabel3(w.level3)}
                    </span>
                  </div>
                ))}
              <div className="pt-1 text-xs text-slate-500">
                ※ ここは「短期の変化（直近3h差）」も見て山を拾っています。
              </div>
            </div>
          )}
        </Card>

        <Card title="基本対策（AI）">
          {loadingExplain ? (
            <p className="text-sm text-slate-600">生成中…</p>
          ) : explain?.text ? (
            <div className="whitespace-pre-wrap text-slate-800 leading-7">{explain.text}</div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">（まだ文章がありません）</p>
              <Button onClick={loadAll}>もう一度読み込む</Button>
            </div>
          )}
        </Card>

        <div className="flex gap-2">
          <Button onClick={loadAll}>更新</Button>
          <a href="/check">
            <Button variant="secondary">体質チェック</Button>
          </a>
        </div>

        <div className="text-center text-[11px] font-bold text-slate-400">
          date: {data?.date || "—"}
        </div>
      </div>
    </>
  );
}
