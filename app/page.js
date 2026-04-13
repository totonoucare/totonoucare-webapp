// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import { getCoreLabel, getSubLabels } from "@/lib/diagnosis/v2/labels";
import {
  HeroMiniCards,
  HeroTitleMark,
  HomeHeaderMenu,
} from "@/components/illust/home";
import HeroGuideBot from "@/components/illust/home/HeroGuideBot";
import { IconRadar, IconBolt, IconCompass } from "@/components/illust/icons/result";
// ★ イラストと天候アイコンをインポート
import { CoreIllust } from "@/components/illust/core";
import { WeatherIcon } from "@/components/illust/icons/weather";

const SESSION_TIMEOUT_MS = 5000;

function IconChevron({ className = "h-4 w-4", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconJournalCard() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="4" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="4" y="3" width="16" height="18" rx="4" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

function IconCheckCard() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8 12.5l2.5 2.5 5-5" strokeWidth="2.5" />
    </svg>
  );
}

function IconHistoryCard() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconReportCard() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="14" width="4" height="6" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="10" y="9" width="4" height="11" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="16" y="4" width="4" height="16" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="4" y="14" width="4" height="6" rx="1.5" />
      <rect x="10" y="9" width="4" height="11" rx="1.5" />
      <rect x="16" y="4" width="4" height="16" rx="1.5" />
    </svg>
  );
}

function getJstDateString(offsetDays = 0) {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utc + 9 * 60 * 60000 + offsetDays * 24 * 60 * 60000);
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, "0");
  const d = String(jst.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatYmdJP(ymd) {
  if (!ymd) return "—";
  const d = new Date(`${ymd}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`;
}

function signalText(signal) {
  if (signal === 2) return "警戒";
  if (signal === 1) return "注意";
  return "安定";
}

function signalBadge(signal) {
  if (signal === 2) return "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200";
  if (signal === 1) return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200";
  return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200";
}

function signalDotClass(signal) {
  if (signal === 2) return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
  if (signal === 1) return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]";
  return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
}

function signalCardBg(signal) {
  if (signal === 2) return "bg-gradient-to-br from-rose-50 to-[#fff1f2] ring-rose-200";
  if (signal === 1) return "bg-gradient-to-br from-amber-50 to-[#fffbeb] ring-amber-200";
  return "bg-gradient-to-br from-emerald-50 to-[#ecfdf5] ring-emerald-200";
}

function signalScoreTextClass(signal) {
  if (signal === 2) return "text-rose-700";
  if (signal === 1) return "text-amber-700";
  return "text-emerald-700";
}

function signalDecorClass(signal) {
  if (signal === 2) return "from-rose-200/45 to-rose-100/10 border-rose-200/40";
  if (signal === 1) return "from-amber-200/45 to-amber-100/10 border-amber-200/45";
  return "from-emerald-200/45 to-emerald-100/10 border-emerald-200/40";
}

function triggerLabel(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "気圧低下";
  if (mainTrigger === "pressure" && triggerDir === "up") return "気圧上昇";
  if (mainTrigger === "temp" && triggerDir === "down") return "冷え";
  if (mainTrigger === "temp" && triggerDir === "up") return "暑さ";
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿度";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

function exactTriggerKey(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "pressure_down";
  if (mainTrigger === "pressure" && triggerDir === "up") return "pressure_up";
  if (mainTrigger === "temp" && triggerDir === "down") return "cold";
  if (mainTrigger === "temp" && triggerDir === "up") return "heat";
  if (mainTrigger === "humidity" && triggerDir === "up") return "damp";
  if (mainTrigger === "humidity" && triggerDir === "down") return "dry";
  return "pressure_down";
}

function ActionTile({ icon, title, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] bg-white p-5 text-left ring-1 ring-inset ring-[var(--ring)] shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm transition-transform group-hover:scale-105">
          {icon}
        </div>
        <IconChevron className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-4 text-[15px] font-black tracking-tight text-slate-900">{title}</div>
      <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">{sub}</div>
    </button>
  );
}

function ForecastMiniCard({ title, bundle, loading, onClick }) {
  if (loading) {
    return (
      <div className="rounded-[24px] bg-white p-5 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
        <div className="h-36 animate-pulse rounded-[22px] bg-slate-100" />
      </div>
    );
  }

  if (!bundle?.ok) {
    const message = bundle?.error?.includes("No radar location")
      ? "地域を設定すると、予報を出せます。"
      : (bundle?.error || "予報を読み込めませんでした。");

    return (
      <div className="rounded-[24px] bg-white p-5 ring-1 ring-inset ring-[var(--ring)] shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[14px] font-black tracking-tight text-slate-900">{title}</div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-500">未設定</span>
          </div>
          <div className="mt-3 text-[13px] font-bold leading-6 text-slate-600">{message}</div>
        </div>
        <Button className="mt-4 w-full shadow-sm" variant="secondary" onClick={onClick}>
          体調予報を開く
        </Button>
      </div>
    );
  }

  const forecast = bundle.forecast || {};
  const location = bundle.location || {};
  const score = forecast.score_0_10 ?? 0;
  const exactTrigger = exactTriggerKey(forecast.main_trigger, forecast.trigger_dir);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative overflow-hidden rounded-[24px] p-5 text-left ring-1 ring-inset shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] group",
        signalCardBg(forecast.signal) || "bg-white ring-[var(--ring)]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={[
          "absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl",
          signalDecorClass(forecast.signal),
        ].join(" ")} />
        <div className={[
          "absolute right-8 top-12 h-28 w-28 rounded-full border",
          signalDecorClass(forecast.signal),
        ].join(" ")} />
        <div className={[
          "absolute right-16 top-4 h-20 w-20 rounded-full border",
          signalDecorClass(forecast.signal),
        ].join(" ")} />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-black tracking-tight text-slate-900">{title}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-slate-500">
            <IconPin />
            {location.display_name || location.label || "地域未設定"}
          </div>
        </div>
        <span className={[
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm",
          signalBadge(forecast.signal),
        ].join(" ")}>
          <span className={["h-2 w-2 rounded-full", signalDotClass(forecast.signal)].join(" ")} />
          {signalText(forecast.signal)}
        </span>
      </div>

      <div className="relative z-10 mt-5 flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">気になりやすい変化</div>
          <div className="mt-1.5 flex items-center gap-2 text-[20px] font-black tracking-tight text-slate-900">
            <div className="text-[var(--accent-ink)] opacity-95">
              <WeatherIcon triggerKey={exactTrigger} className="h-6 w-6" />
            </div>
            <span>{triggerLabel(forecast.main_trigger, forecast.trigger_dir)}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">目安スコア</div>
          <div className="flex items-end justify-end gap-1 leading-none">
            <span className={["text-[42px] font-black tracking-[-0.04em]", signalScoreTextClass(forecast.signal)].join(" ")}>{score}</span>
            <span className="pb-1 text-[16px] font-black text-slate-400">/10</span>
          </div>
        </div>
      </div>

      <div className="absolute right-4 bottom-4 opacity-0 transition-opacity group-hover:opacity-100 text-slate-400">
        <IconChevron />
      </div>
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [loadingSession, setLoadingSession] = useState(true);
  const [session, setSession] = useState(null);

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [todayBundle, setTodayBundle] = useState(null);
  const [tomorrowBundle, setTomorrowBundle] = useState(null);
  const [latestResult, setLatestResult] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);

  const isLoggedIn = !!session;

  async function authedFetch(path) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("not logged in");

    const res = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setSession(null);
      router.replace("/");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    let unsub = null;

    (async () => {
      try {
        if (!supabase) {
          setSession(null);
          return;
        }
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          "getSession timeout"
        );
        setSession(data.session || null);

        const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession || null);
        });
        unsub = sub?.subscription;
      } catch (e) {
        console.error(e);
        setSession(null);
      } finally {
        setLoadingSession(false);
      }
    })();

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch {}
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (!session) {
        setTodayBundle(null);
        setTomorrowBundle(null);
        setLatestResult(null);
        setWeeklySummary(null);
        return;
      }

      try {
        setDashboardLoading(true);
        const today = getJstDateString(0);
        const tomorrow = getJstDateString(1);

        const [todayRes, tomorrowRes, historyRes, reportRes] = await Promise.allSettled([
          authedFetch(`/api/radar/v1/forecast?date=${today}`),
          authedFetch(`/api/radar/v1/forecast?date=${tomorrow}`),
          authedFetch(`/api/diagnosis/v2/events/list?limit=1`),
          authedFetch(`/api/insights/14days?days=7`),
        ]);

        setTodayBundle(todayRes.status === "fulfilled" ? todayRes.value : { ok: false, error: todayRes.reason?.message || "予報を読み込めませんでした。" });
        setTomorrowBundle(tomorrowRes.status === "fulfilled" ? tomorrowRes.value : { ok: false, error: tomorrowRes.reason?.message || "予報を読み込めませんでした。" });
        setLatestResult(historyRes.status === "fulfilled" ? historyRes.value?.data?.[0] || null : null);
        setWeeklySummary(reportRes.status === "fulfilled" ? reportRes.value?.data?.summary || null : null);
      } catch (e) {
        console.error(e);
      } finally {
        setDashboardLoading(false);
      }
    })();
  }, [session?.access_token]);

  const latestResultHref = latestResult?.source_event_id
    ? `/result/${encodeURIComponent(latestResult.source_event_id)}?from=history`
    : latestResult?.notes?.source_event_id
      ? `/result/${encodeURIComponent(latestResult.notes.source_event_id)}?from=history`
      : null;

  const core = latestResult?.core_code ? getCoreLabel(latestResult.core_code) : null;
  const subs = getSubLabels(latestResult?.sub_labels || []);

  if (loadingSession) {
    return (
      <AppShell title="ホーム" subtitle="読み込み中…" headerRight={<Button size="sm" variant="ghost" onClick={() => router.push("/guide")}>使い方</Button>}>
        <div className="h-64 animate-pulse rounded-[32px] bg-slate-200" />
      </AppShell>
    );
  }

  /* ==============================================================
   * 未ログイン時（ランディングページ風の洗練されたUI）
   * ============================================================== */
if (!isLoggedIn) {
  return (
    <AppShell
      title="ホーム"
      subtitle="未病レーダー"
      headerRight={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => router.push("/guide")}
          className="font-extrabold text-slate-600 hover:bg-slate-100"
        >
          使い方
        </Button>
      }
    >
      <Module className="overflow-hidden border-none ring-1 ring-[var(--ring)] shadow-sm pb-8">
        <div className="relative bg-gradient-to-b from-[color-mix(in_srgb,var(--mint),white_20%)] via-[color-mix(in_srgb,var(--mint),white_70%)] to-white px-6 pt-10 pb-6 text-center">
          {/* 1. ブランド名 */}
          <HeroTitleMark />

          {/* 2. ヒーロー絵エリア */}
          <div className="mt-8 -mx-1">
            <HeroMiniCards compact />
          </div>

          {/* 3. タイトルコピー */}
          <div className="mt-8 text-[26px] sm:text-[30px] font-black tracking-tight leading-[1.35] text-slate-900">
            体質と気象変化から、<br />
            体調の波を先読み。
          </div>

          {/* 4. 本文コピー */}
          <div className="mt-4 text-[14px] font-bold leading-relaxed text-slate-700 max-w-[320px] mx-auto">
            あなたの「崩れ方のクセ」を分析し、日々の気圧や気温の変化に対する先回りケアを提案します。
          </div>
        </div>

        {/* 5. CTA */}
        <div className="px-6 mt-8 sm:max-w-[340px] sm:mx-auto">
          <div className="grid gap-3">
            <Button
              onClick={() => router.push("/check")}
              className="py-4 shadow-md text-[15px]"
            >
              無料で体質チェックをはじめる
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/signup")}
              className="py-4 shadow-sm text-[15px] bg-white"
            >
              ログインする
            </Button>
          </div>

          <ul className="mt-6 space-y-2.5">
            <li className="flex items-center gap-2 text-[12px] font-bold text-slate-500 justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-[var(--accent)]"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              体質チェック・ログイン後の体調予報は
              <span className="font-extrabold text-slate-700">ずっと無料</span>
            </li>
            <li className="flex items-center gap-2 text-[12px] font-bold text-slate-500 justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-[var(--accent)]"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              記録による予報精度UP・週次AIレポートはサブスク登録後にのみ利用可能
            </li>
          </ul>
        </div>
      </Module>
    </AppShell>
  );
}

  /* ==============================================================
   * ログイン後（ダッシュボード）
   * ============================================================== */
  return (
    <AppShell
      title="ホーム"
      subtitle="今日の体調予報と次の一歩"
      headerRight={
        <HomeHeaderMenu
          onGuide={() => router.push("/guide")}
          onRegionSettings={() => router.push("/radar")}
          onLogout={handleLogout}
        />
      }
    >
      {/* ヒーローヘッダー */}
      <Module className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(251,250,246,0.98)_100%)] px-8 py-7 ring-1 ring-[color:color-mix(in_srgb,var(--ring),white_14%)] shadow-[0_18px_36px_-22px_rgba(77,111,85,0.10)] min-h-[212px]">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-[46%] overflow-hidden">
          <div className="absolute right-8 top-7 h-36 w-36 rounded-full border border-[rgba(200,157,71,0.14)]" />
          <div className="absolute right-16 top-14 h-24 w-24 rounded-full border border-[rgba(94,131,101,0.12)]" />
          <div className="absolute right-0 bottom-2 h-44 w-44 rounded-full border border-[rgba(94,131,101,0.08)]" />
          <div className="absolute right-10 top-3 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(217,165,74,0.10)_0%,rgba(217,165,74,0.04)_36%,transparent_72%)]" />
          <div className="absolute right-[112px] top-[86px] h-[220px] w-[220px] rounded-full border border-[rgba(94,131,101,0.08)]" />
          <div className="absolute right-24 top-20 h-2 w-2 rounded-full bg-[rgba(200,157,71,0.24)]" />
        </div>

        <div className="relative z-[2] max-w-[420px]">
          <HeroTitleMark compact={false} className="max-w-full" />
        </div>

<div className="absolute left-8 top-[122px] z-[3] w-[220px] sm:w-[248px]">
  <div className="relative rounded-[20px] border border-[var(--ring)] bg-[linear-gradient(180deg,#ffffff_0%,#fafaf7_100%)] px-4 py-3 text-left shadow-[0_10px_24px_-18px_rgba(77,111,85,0.24)]">
    <div className="absolute right-[-6px] top-[50%] h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-r border-t border-[var(--ring)] bg-[#fafaf7]" />
    <div className="text-[13px] font-extrabold leading-6 text-slate-600">
      体調予報の要約と、次の一歩をまとめています
    </div>
  </div>
</div>

<div className="absolute right-7 bottom-3 z-[3] scale-[0.94] origin-bottom-right">
  <HeroGuideBot compact showBubble={false} />
</div>
      </Module>

      {/* サマリー・ウィジェット群 */}
      <Module className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconRadar className="h-6 w-6 text-[var(--accent)]" />
            <div className="text-[18px] font-black tracking-tight text-slate-900">今日と明日のサマリー</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/radar")}>すべて見る</Button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ForecastMiniCard
            title={`今日 ${formatYmdJP(getJstDateString(0))}`}
            bundle={todayBundle}
            loading={dashboardLoading}
            onClick={() => router.push("/radar?tab=today")}
          />
          <ForecastMiniCard
            title={`明日 ${formatYmdJP(getJstDateString(1))}`}
            bundle={tomorrowBundle}
            loading={dashboardLoading}
            onClick={() => router.push("/radar?tab=tomorrow")}
          />
        </div>
      </Module>

      {/* 次にやること */}
      <Module className="p-6">
        <div className="flex items-center gap-2.5">
          <IconBolt className="h-6 w-6 text-slate-400" />
          <div className="text-[18px] font-black tracking-tight text-slate-900">次にやること</div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ActionTile
            icon={<IconJournalCard />}
            title="今日の記録をつける"
            sub="体調予報を見たら、そのまま記録へ。"
            onClick={() => router.push("/records?tab=calendar")}
          />
          <ActionTile
            icon={<IconCheckCard />}
            title="体質結果を見る"
            sub={core ? `${core.title} を確認する` : "最新の体質チェック結果を見る"}
            onClick={() => router.push(latestResultHref || "/check")}
          />
          <ActionTile
            icon={<IconHistoryCard />}
            title="履歴を見る"
            sub="過去の結果を一覧で見返す。"
            onClick={() => router.push("/history")}
          />
          <ActionTile
            icon={<IconReportCard />}
            title="週次レポートを見る"
            sub={weeklySummary?.recorded_days != null ? `今週の記録 ${weeklySummary.recorded_days}/7 日` : "1週間の振り返りを見る"}
            onClick={() => router.push("/records?tab=report")}
          />
        </div>
      </Module>

      {/* あなたの体質 */}
      <Module className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
             <IconCompass className="h-6 w-6 text-amber-500" />
            <div className="text-[18px] font-black tracking-tight text-slate-900">あなたの体質</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push(latestResultHref || "/check")}>結果を見る</Button>
        </div>

        {latestResult && core ? (
          <div className="mt-5 rounded-[32px] bg-gradient-to-br from-[color-mix(in_srgb,var(--mint),white_30%)] to-[color-mix(in_srgb,var(--mint),white_70%)] p-6 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">前回のチェック</div>
                <div className="mt-1 text-[24px] font-black tracking-tight text-slate-900 leading-tight">{core.title}</div>
                <div className="mt-1.5 text-[12px] font-bold text-slate-700">{core.short}</div>

                {subs.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {subs.map((sub) => (
                      <span
                        key={sub.code}
                        className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-extrabold text-[var(--accent-ink)] ring-1 ring-black/5 shadow-sm"
                      >
                        {sub.short}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0">
                <div className="grid h-[104px] w-[104px] place-items-center overflow-hidden rounded-[22px] bg-[#fdfefc] ring-1 ring-[var(--ring)] shadow-sm transition-transform hover:scale-105 p-1.5">
                  <CoreIllust
                    code={latestResult.core_code}
                    title={core.title}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 text-[11px] font-extrabold tracking-wide text-slate-500">
              {latestResult.created_at ? `最終更新: ${new Date(latestResult.created_at).toLocaleDateString("ja-JP")}` : "最新の結果です。"}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div className="text-[14px] font-black text-slate-700">まだ体質チェックの保存結果がありません</div>
            <div className="mt-2 text-[12px] font-bold leading-5 text-slate-500">
              まずは無料の体質チェックから始めてみましょう。
            </div>
            <div className="mt-5">
              <Button onClick={() => router.push("/check")} className="w-full shadow-sm">体質チェックをはじめる</Button>
            </div>
          </div>
        )}
      </Module>
    </AppShell>
  );
}
