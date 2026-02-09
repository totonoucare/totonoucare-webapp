// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { supabase } from "@/lib/supabaseClient";

/** -----------------------------
 * Inline SVG Icons（依存なし）
 * ---------------------------- */
const Icon = {
  Activity: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  ),
  Thermometer: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4 4 0 1 0 5 0Z" />
    </svg>
  ),
  Droplets: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
      <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
    </svg>
  ),
  Gauge: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  ),
  Alert: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  ChevronRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
};

/** -----------------------------
 * 表示用ラベル（英語排除）
 * ---------------------------- */
const LEVEL3 = ["安定", "注意", "要警戒"];
const LEVEL_BADGE = {
  0: "bg-emerald-50 text-emerald-800 border-emerald-200",
  1: "bg-amber-50 text-amber-900 border-amber-200",
  2: "bg-red-600 text-white border-red-600",
};

const SIXIN_JA = { wind: "ゆらぎ", cold: "冷え", heat: "暑さ", damp: "湿気", dry: "乾燥" };
function sixinJa(code) {
  return SIXIN_JA[code] || null;
}
function joinSixinJa(arr) {
  return (Array.isArray(arr) ? arr : []).map(sixinJa).filter(Boolean).join("・");
}

function fmt1(n) {
  if (!Number.isFinite(n)) return "—";
  return Number(n).toFixed(1);
}
function fmt0(n) {
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(Number(n)));
}
function hourLabel(iso) {
  try {
    const d = new Date(iso);
    const h = d.getHours();
    return `${String(h).padStart(2, "0")}:00`;
  } catch {
    return "—";
  }
}

/** -----------------------------
 * タイムライン：同じ表示が並ぶ問題を潰す
 * - 連続時間帯をまとめてレンジ化
 * ---------------------------- */
function groupWindows(windows) {
  const xs = Array.isArray(windows) ? windows.slice() : [];
  xs.sort((a, b) => new Date(a.time) - new Date(b.time));

  const out = [];
  let cur = null;

  const keyOf = (w) => {
    const lv = Number(w.level3 ?? 0);
    const sx = joinSixinJa(w.top_sixin) || "";
    return `${lv}|${sx}`;
  };

  for (const w of xs) {
    const k = keyOf(w);
    if (!cur) {
      cur = { ...w, _k: k, start: w.time, end: w.time };
      continue;
    }
    if (k === cur._k) {
      cur.end = w.time;
    } else {
      out.push(cur);
      cur = { ...w, _k: k, start: w.time, end: w.time };
    }
  }
  if (cur) out.push(cur);

  return out;
}

/** -----------------------------
 * AI文：長文を読みやすく分割＆折りたたみ
 * ---------------------------- */
function splitAdvice(text) {
  const t = String(text || "").trim();
  if (!t) return [];
  // 空行で段落分割（十分実用的）
  return t.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
}

/** -----------------------------
 * スケルトン
 * ---------------------------- */
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}

export default function RadarPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const [explain, setExplain] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  const [toast, setToast] = useState({ open: false, message: "", variant: "info" });
  const [toastTimer, setToastTimer] = useState(null);

  const notify = (message, variant = "success") => {
    if (toastTimer) clearTimeout(toastTimer);
    setToast({ open: true, message, variant });
    const t = setTimeout(() => setToast((p) => ({ ...p, open: false })), 2400);
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
      } catch {
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

  async function loadAll({ silent = false } = {}) {
    if (!session) return;
    try {
      if (!silent) setLoadingData(true);

      const radarJson = await authedFetch("/api/radar/today");
      setData(radarJson);

      setLoadingExplain(true);
      try {
        const ex = await authedFetch("/api/ai/explain-today", { method: "POST" });
        // /api/ai/explain-today は { data: { text } } 形式
        setExplain(ex?.data || null);
      } finally {
        setLoadingExplain(false);
      }
    } catch (e) {
      console.error(e);
      notify(e?.message || "読み込みに失敗しました", "error");
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (session) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const radar = data?.radar || {};
  const external = data?.external || {};

  const level3 = Number(radar?.level3 ?? radar?.level ?? 0); // どっちでも受ける
  const levelText = LEVEL3[level3] || "—";
  const topSixin = joinSixinJa(radar?.top_sixin || external?.top_sixin) || "—";

  const windowsRaw = data?.time_windows || data?.hourly_windows || [];
  const grouped = useMemo(() => groupWindows(windowsRaw), [windowsRaw]);

  const warnRanges = grouped.filter((x) => Number(x.level3 ?? 0) >= 1);
  const [showAllRanges, setShowAllRanges] = useState(false);
  const shownRanges = showAllRanges ? warnRanges : warnRanges.slice(0, 4);

  const adviceBlocks = useMemo(() => splitAdvice(explain?.text), [explain?.text]);
  const [expandAdvice, setExpandAdvice] = useState(false);
  const shownAdvice = expandAdvice ? adviceBlocks : adviceBlocks.slice(0, 3);

  // ---------- states ----------
  if (loadingAuth) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="min-h-[70vh] bg-slate-50 px-4 pt-6">
          <div className="mx-auto max-w-[440px] space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="min-h-screen bg-slate-50 px-4 pt-10">
          <div className="mx-auto max-w-[440px]">
            <Card>
              <div className="space-y-3 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Icon.Activity className="h-6 w-6" />
                </div>
                <div className="text-lg font-semibold">未病レーダー</div>
                <div className="text-sm text-slate-600 leading-6">
                  体質に合わせて、今日の「注意ポイント」と
                  <br />
                  ざっくり対策を出します（ログイン必須）
                </div>
                <div className="space-y-2 pt-2">
                  <Button onClick={() => router.push("/signup")} className="w-full">
                    無料でログイン / 登録
                  </Button>
                  <Button variant="secondary" onClick={() => router.push("/check")} className="w-full">
                    先に体質チェック
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // loading skeleton (data)
  if (loadingData && !data) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="min-h-screen bg-slate-50">
          <div className="sticky top-0 z-30 border-b border-slate-100 bg-slate-50/90 backdrop-blur px-4 py-3">
            <div className="mx-auto flex max-w-[440px] items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-800">未病レーダー</div>
                <div className="text-[11px] text-slate-500">読み込み中…</div>
              </div>
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>

          <div className="mx-auto max-w-[440px] space-y-4 px-4 py-5">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </>
    );
  }

  // ---------- main UI ----------
  return (
    <>
      <Toast open={toast.open} message={toast.message} variant={toast.variant} />

      <div className="min-h-screen bg-slate-50 pb-16">
        {/* Header */}
        <div className="sticky top-0 z-30 border-b border-slate-100 bg-slate-50/90 backdrop-blur px-4 py-3">
          <div className="mx-auto flex max-w-[440px] items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Icon.Activity className="h-5 w-5 text-emerald-600" />
                未病レーダー
              </div>
              <div className="text-[11px] text-slate-500">
                {new Date().toLocaleDateString("ja-JP")} の予報
              </div>
            </div>

            <button
              onClick={() => loadAll({ silent: true })}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-slate-700 shadow-sm active:scale-95"
              title="更新"
            >
              <Icon.Refresh className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[440px] space-y-5 px-4 py-5">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-[28px] border bg-white p-5 shadow-sm">
            <div
              className={[
                "absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-20",
                level3 === 2 ? "bg-red-500" : level3 === 1 ? "bg-amber-400" : "bg-emerald-400",
              ].join(" ")}
            />
            <div className="relative space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-500">今日の予報</div>
                  <div className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
                    {levelText}
                    <span className="ml-2 text-base font-semibold text-slate-700">
                      （{topSixin}）
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {radar?.reason_short || radar?.reason_text?.split("｜")?.[0] || "今日の特徴を解析中"}
                  </div>
                </div>

                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${LEVEL_BADGE[level3] || LEVEL_BADGE[0]}`}>
                  {levelText}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <Icon.Thermometer className="mx-auto mb-1 h-5 w-5 text-slate-400" />
                  <div className="text-base font-extrabold text-slate-800">
                    {fmt1(external?.temp)}
                    <span className="text-xs font-semibold text-slate-500">℃</span>
                  </div>
                  <div className="text-[10px] text-slate-500">気温</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <Icon.Droplets className="mx-auto mb-1 h-5 w-5 text-slate-400" />
                  <div className="text-base font-extrabold text-slate-800">
                    {fmt0(external?.humidity)}
                    <span className="text-xs font-semibold text-slate-500">%</span>
                  </div>
                  <div className="text-[10px] text-slate-500">湿度</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <Icon.Gauge className="mx-auto mb-1 h-5 w-5 text-slate-400" />
                  <div className="text-base font-extrabold text-slate-800">
                    {fmt1(external?.pressure)}
                    <span className="text-xs font-semibold text-slate-500">hPa</span>
                  </div>
                  <div className="text-[10px] text-slate-500">気圧</div>
                </div>
              </div>

              {/* Deltas */}
              <div className="rounded-2xl border bg-white px-3 py-2 text-xs text-slate-600">
                <div className="font-semibold text-slate-700">24時間の変化</div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span>気圧 {fmt1(external?.d_pressure_24h)}hPa</span>
                  <span>気温 {fmt1(external?.d_temp_24h)}℃</span>
                  <span>湿度 {fmt0(external?.d_humidity_24h)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <Card
            title={
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon.Alert className="h-4 w-4 text-amber-500" />
                  <span>気をつける時間帯</span>
                </div>
                <span className="text-xs text-slate-500">今後24時間</span>
              </div>
            }
          >
            {warnRanges.length === 0 ? (
              <div className="py-4 text-center">
                <div className="text-sm font-semibold text-slate-800">大きな山はありません</div>
                <div className="mt-1 text-xs text-slate-500">今日は比較的理解しやすい日です。</div>
              </div>
            ) : (
              <div className="space-y-2">
                {shownRanges.map((r, i) => {
                  const lv = Number(r.level3 ?? 0);
                  const label = LEVEL3[lv] || "—";
                  const sx = joinSixinJa(r.top_sixin) || "—";
                  const start = hourLabel(r.start);
                  const end = hourLabel(r.end);
                  const rangeText = start === end ? `${start}頃` : `${start}〜${end}`;

                  const conf =
                    lv === 2
                      ? { bar: "bg-red-500", bg: "bg-red-50", pill: "bg-red-600 text-white" }
                      : { bar: "bg-amber-400", bg: "bg-amber-50", pill: "bg-amber-500 text-white" };

                  return (
                    <div key={i} className={`flex items-center gap-3 rounded-2xl p-3 ${conf.bg}`}>
                      <div className="min-w-[72px] text-sm font-extrabold text-slate-800">{rangeText}</div>
                      <div className={`h-10 w-1.5 rounded-full ${conf.bar}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${conf.pill}`}>
                            {label}
                          </span>
                          <span className="truncate text-xs text-slate-600">{sx}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          ※ 同じ状態が続く時間帯はまとめて表示しています
                        </div>
                      </div>
                    </div>
                  );
                })}

                {warnRanges.length > 4 ? (
                  <div className="pt-1">
                    <button
                      className="w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      onClick={() => setShowAllRanges((v) => !v)}
                    >
                      {showAllRanges ? "たたむ" : "もっと見る"}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </Card>

          {/* AI bubble */}
          <Card title="AIアドバイス（無料版）">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-emerald-50 text-emerald-700">
                  <Icon.Activity className="h-5 w-5" />
                </div>
              </div>

              <div className="relative min-w-0 flex-1 rounded-2xl rounded-tl-none border bg-white px-4 py-3">
                <div className="absolute left-[-6px] top-4 h-3 w-3 rotate-45 border-b border-l bg-white" />
                {loadingExplain ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[80%]" />
                    <Skeleton className="h-4 w-[70%]" />
                  </div>
                ) : explain?.text ? (
                  <div className="space-y-3">
                    {shownAdvice.map((b, i) => (
                      <p key={i} className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {b}
                      </p>
                    ))}

                    {adviceBlocks.length > 3 ? (
                      <button
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700"
                        onClick={() => setExpandAdvice((v) => !v)}
                      >
                        {expandAdvice ? "たたむ" : "続きを読む"}
                        <Icon.ChevronRight className={`h-4 w-4 ${expandAdvice ? "rotate-90" : ""}`} />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">（まだ生成情報がありません）</div>
                )}
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500">
              ※ 強い症状（いつもと違う痛み、息苦しさ、しびれ等）が続く場合は医療機関へ。
            </div>
          </Card>

          {/* Nav */}
          <div className="space-y-2">
            <button
              onClick={() => router.push("/history")}
              className="flex w-full items-center justify-between rounded-2xl border bg-white px-4 py-4 text-left shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-2 text-slate-700">
                  <Icon.Activity className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-800">過去の履歴を見る</div>
                  <div className="text-[11px] text-slate-500">体質チェックの履歴ページへ</div>
                </div>
              </div>
              <Icon.ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <Button variant="secondary" onClick={() => router.push("/check")} className="w-full">
              体質チェックをやり直す
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
