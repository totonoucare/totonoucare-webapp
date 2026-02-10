"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// --- Inline SVG Icons (no deps) ---
const IconCloudSun = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="M20 12h2" />
    <path d="m19.07 4.93-1.41 1.41" />
    <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
    <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
  </svg>
);

const IconDroplets = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
    <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
  </svg>
);

const IconGauge = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </svg>
);

const IconAlertTriangle = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const IconShieldCheck = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconRefreshCw = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

const IconChevronRight = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const IconActivity = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

// --- Small UI parts ---
function Pill({ children, variant = "default", className = "" }) {
  const variants = {
    default: "bg-slate-100 text-slate-600",
    safe: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

function ButtonX({ children, onClick, variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary:
      "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 focus:ring-emerald-500",
    secondary:
      "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm focus:ring-slate-300",
    ghost: "bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50",
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function WeatherBadge({ icon: Icon, label, value, unit }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-3 min-w-[88px]">
      <Icon className="h-5 w-5 text-slate-400 mb-1" />
      <span className="text-sm font-extrabold text-slate-800">
        {value}
        <span className="text-xs font-normal text-slate-500">{unit}</span>
      </span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}

function TimeRiskRow({ time, level, riskFactors }) {
  const levelConfig = {
    0: { color: "bg-emerald-500", label: "安定", bg: "bg-emerald-50" },
    1: { color: "bg-amber-400", label: "注意", bg: "bg-amber-50" },
    2: { color: "bg-red-500", label: "要警戒", bg: "bg-red-50" },
  };
  const conf = levelConfig[level] || levelConfig[0];

  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 ${conf.bg} mb-2`}>
      <div className="flex flex-col items-center min-w-[56px]">
        <span className="text-sm font-extrabold text-slate-800">{time}</span>
      </div>
      <div className={`h-10 w-1 ${conf.color} rounded-full`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded text-white ${conf.color}`}>
            {conf.label}
          </span>
          <span className="text-xs text-slate-600 truncate">{riskFactors}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return <div className={`bg-slate-200 rounded-3xl animate-pulse ${className}`} />;
}

function formatJPDate() {
  return new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
}

function hh00(iso) {
  try {
    const d = new Date(iso);
    const h = d.getHours();
    return `${String(h).padStart(2, "0")}:00`;
  } catch {
    return "—";
  }
}

function levelLabel3(lv) {
  return ["安定", "注意", "要警戒"][lv] ?? "—";
}

function variantByLevel3(lv) {
  if (lv === 2) return "danger";
  if (lv === 1) return "warning";
  return "safe";
}

// --- Main Page ---
export default function RadarPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [data, setData] = useState(null);
  const [explain, setExplain] = useState(null);

  const [loadingData, setLoadingData] = useState(true);
  const [loadingExplain, setLoadingExplain] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Auth
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

        const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => setSession(s || null));
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

  const loadAll = async ({ keepSkeleton = false } = {}) => {
    if (!session) return;

    try {
      setRefreshing(true);
      if (!keepSkeleton) {
        setLoadingData(true);
        setLoadingExplain(true);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No token");

      const headers = { Authorization: `Bearer ${token}` };

      const [r1, r2] = await Promise.all([
        fetch("/api/radar/today", { headers, cache: "no-store" }).then((r) => r.json()),
        fetch("/api/radar/today/explain", { headers, cache: "no-store" }).then((r) => r.json()),
      ]);

      // APIは { data: ... } で返す前提
      setData(r1?.data || null);
      setExplain(r2?.data || null);
    } catch (e) {
      console.error(e);
      setData(null);
      setExplain({ text: "読み込みに失敗しました。再読み込みしてください。" });
    } finally {
      setLoadingData(false);
      setLoadingExplain(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  // Derived
  const windows = useMemo(() => (Array.isArray(data?.time_windows) ? data.time_windows : []), [data]);
  const warnWindows = useMemo(() => {
    return windows
      .filter((w) => (w?.level3 ?? 0) >= 1)
      .slice()
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .slice(0, 6);
  }, [windows]);

  // --- 1) Skeleton ---
  if (loadingAuth || (loadingData && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[440px] mx-auto space-y-6">
        <div className="h-8 w-40 bg-slate-200 rounded-full animate-pulse" />
        <SkeletonBlock className="h-44 w-full" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    );
  }

  // --- 2) Not logged in ---
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center max-w-[440px] mx-auto">
        <div className="text-center space-y-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 w-full">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <IconShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>

          <h1 className="text-xl font-extrabold text-slate-800">ログインが必要です</h1>
          <p className="text-sm text-slate-600 leading-6">
            未病レーダーは、体質に合わせて
            <br />
            毎日の“崩れやすさ”を予報します。
          </p>

          <div className="pt-4 space-y-3 w-full">
            <ButtonX onClick={() => router.push("/signup")} className="w-full">
              無料で登録・ログイン
            </ButtonX>
            <ButtonX onClick={() => router.push("/check")} variant="ghost" className="w-full">
              体質チェックのみ利用する
            </ButtonX>
          </div>
        </div>
      </div>
    );
  }

  // --- 3) constitution missing ---
  if (!data && typeof explain?.text === "string" && explain.text.includes("体質情報が未設定")) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 max-w-[440px] mx-auto pt-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
          <h2 className="text-lg font-extrabold text-slate-800 mb-2">体質データがありません</h2>
          <p className="text-sm text-slate-600 mb-6">レーダー予報を出すには、まず体質チェックが必要です。</p>
          <ButtonX onClick={() => router.push("/check")} className="w-full">
            体質チェックを始める
          </ButtonX>
        </div>
      </div>
    );
  }

  // --- 4) main ---
  const radar = data?.radar || {};
  const external = data?.external || {};

  const currentLevel = radar?.level ?? 0;
  const headLine =
    typeof radar?.reason_text === "string" && radar.reason_text.trim()
      ? radar.reason_text.split("｜")[0]?.replace(/^今日：/, "").trim()
      : "今日は穏やかです";

  const detailLine =
    typeof radar?.reason_text === "string" && radar.reason_text.includes("｜")
      ? radar.reason_text.split("｜").slice(1).join("｜").trim()
      : "";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-[440px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <IconActivity className="w-5 h-5 text-emerald-600" />
              未病レーダー
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold">{formatJPDate()} の予報</p>
          </div>

          <button
            onClick={() => loadAll({ keepSkeleton: true })}
            disabled={refreshing}
            className="p-2 bg-white border border-slate-200 rounded-full shadow-sm active:scale-95 transition disabled:opacity-60"
            aria-label="refresh"
          >
            <IconRefreshCw className={`w-4 h-4 text-slate-700 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-[440px] mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          <div
            className={`absolute top-0 right-0 w-36 h-36 rounded-bl-[4rem] opacity-20 pointer-events-none ${
              currentLevel === 2 ? "bg-red-500" : currentLevel === 1 ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-extrabold text-slate-500">現在のコンディション</span>
              <Pill variant={variantByLevel3(currentLevel)}>{levelLabel3(currentLevel)}</Pill>
            </div>

            <div className="mb-6">
              <h2 className="text-[28px] font-black text-slate-900 tracking-tight leading-snug">{headLine}</h2>
              {detailLine ? <p className="mt-2 text-sm text-slate-600 leading-6">{detailLine}</p> : null}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <WeatherBadge icon={IconCloudSun} label="気温" value={external?.temp ?? "—"} unit="℃" />
              <WeatherBadge icon={IconDroplets} label="湿度" value={external?.humidity ?? "—"} unit="%" />
              <WeatherBadge icon={IconGauge} label="気圧" value={external?.pressure ?? "—"} unit="hPa" />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <IconAlertTriangle className="w-4 h-4 text-amber-500" />
              気をつける時間帯
            </h3>
            <span className="text-xs text-slate-400 font-semibold">今後24時間</span>
          </div>

          <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-4">
            {warnWindows.length > 0 ? (
              <div className="space-y-1">
                {warnWindows.map((w, i) => (
                  <TimeRiskRow
                    key={`${w.time || i}`}
                    time={hh00(w.time)}
                    level={w.level3 ?? 0}
                    riskFactors={Array.isArray(w.top_sixin) ? w.top_sixin.join("・") : ""}
                  />
                ))}
                <div className="pt-1 text-[11px] text-slate-400 font-semibold">
                  ※ 短期の変化（直近の変化量）も見て“山”を拾っています。
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="inline-flex p-3 bg-emerald-50 rounded-full mb-2">
                  <IconShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-extrabold text-slate-800">目立つ山はありません</p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">今日は穏やかに過ごせそうです。</p>
              </div>
            )}
          </div>
        </div>

        {/* AI advice - chat bubble */}
        <div>
          <h3 className="text-base font-extrabold text-slate-900 px-2 mb-3">AIアドバイス</h3>

          <div className="flex gap-4 items-start">
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-full border border-slate-100 bg-white shadow-sm overflow-hidden flex items-center justify-center">
                {/* AI avatar */}
                <svg viewBox="0 0 64 64" className="w-10 h-10">
                  <circle cx="32" cy="32" r="30" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="2" />
                  <circle cx="24" cy="28" r="4" fill="#065F46" />
                  <circle cx="40" cy="28" r="4" fill="#065F46" />
                  <path d="M22 40c6 5 14 5 20 0" stroke="#065F46" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl rounded-tl-none border border-slate-100 shadow-sm p-5 relative">
              <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l border-b border-slate-100 transform rotate-45" />

              {loadingExplain ? (
                <div className="flex space-x-2 h-6 items-center">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:120ms]" />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:240ms]" />
                </div>
              ) : explain?.text ? (
                <div className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{explain.text}</div>
              ) : (
                <div className="text-sm text-slate-400">（まだありません）</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="pt-4 pb-8 flex flex-col gap-3">
          <button
            onClick={() => router.push("/history")}
            className="flex items-center justify-between w-full p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-full">
                <IconActivity className="w-4 h-4 text-slate-700" />
              </div>
              <span className="text-sm font-extrabold text-slate-800">過去のコンディション履歴</span>
            </div>
            <IconChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => router.push("/check")}
            className="w-full py-3 text-sm font-extrabold text-slate-400 hover:text-emerald-600 transition"
          >
            体質チェックをやり直す
          </button>
        </div>

        {/* Debug */}
        <div className="text-center text-[10px] font-extrabold text-slate-300">
          date: {data?.date || "—"}
        </div>
      </div>
    </div>
  );
}
