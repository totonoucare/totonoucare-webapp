// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

// --- Inline SVG Icons ---
const IconGauge = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>
  </svg>
);
const IconThermometer = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4 4 0 1 0 5 0Z"/>
  </svg>
);
const IconDroplets = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>
    <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>
  </svg>
);
const IconAlertTriangle = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);
const IconRefreshCw = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
  </svg>
);
const IconTrendingUp = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconActivity = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);

const DUMMY_AI = {
  robotFace: "https://placehold.co/64x64/f0fdf4/15803d?text=AI",
};

// --- Helpers ---

function Pill({ children, variant = "default" }) {
  const v = {
    safe: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    default: "bg-slate-100 text-slate-700 border-slate-200",
  }[variant] || "bg-slate-100 text-slate-700 border-slate-200";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${v}`}>{children}</span>;
}

function levelLabel(lv) {
  return ["安定", "注意", "要警戒"][lv] ?? "—";
}
function levelVariant(lv) {
  if (lv === 2) return "danger";
  if (lv === 1) return "warning";
  return "safe"; // 0はsafe (emerald) or default
}

function triggerJa(code) {
  const map = {
    pressure_shift: "気圧の揺れ",
    temp_swing: "気温の揺れ",
    humidity_swing: "湿度の揺れ",
  };
  return map[code] || "変化";
}

// 1時間変化を表示する矢印コンポーネント
function ArrowDelta({ value, unit }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return <span className="text-xs text-slate-400">—</span>;
  const dir = n > 0 ? "up" : n < 0 ? "down" : "flat";
  // 色: 上昇=rose, 下降=sky, なし=slate
  const color = dir === "up" ? "text-rose-600" : dir === "down" ? "text-sky-600" : "text-slate-400";
  const mark = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  
  return (
    <span className={`text-xs font-bold ${color} flex items-center gap-0.5`}>
      {mark} {Math.abs(n).toFixed(unit === "%" ? 0 : 1)}<span className="text-[10px] font-normal opacity-80">{unit}</span>
      <span className="text-[9px] text-slate-400 ml-0.5 font-normal">/1h</span>
    </span>
  );
}

// ヘッダー下の3連メーターカード
function MeterCard({ icon: Icon, label, value, unit, delta1h }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white border border-slate-100 p-3 shadow-sm min-h-[88px]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Icon className="h-4 w-4" />
          <span className="text-[10px] font-bold tracking-wide">{label}</span>
        </div>
      </div>
      
      <div className="mt-1">
        <div className="text-xl font-black text-slate-800 tracking-tight">
          {Number.isFinite(Number(value)) ? Number(value).toFixed(unit === "%" ? 0 : 1) : "—"}
          <span className="text-xs font-bold text-slate-400 ml-0.5">{unit}</span>
        </div>
        <div className="mt-1 flex items-center">
           <ArrowDelta value={delta1h} unit={unit} />
        </div>
      </div>
    </div>
  );
}

// タイムラインのカード（豪華版）
function TimeChip({ w }) {
  const t = new Date(w.time);
  const hh = String(t.getHours()).padStart(2, "0");
  
  // レベル判定 (risk.jsのロジック準拠: wind_score >= 3 => level=2, >= 2 => level=1)
  // ここでは w.level3 を使用
  const lv = w.level3 ?? 0;
  
  const styles = {
    2: { bg: "bg-red-50", border: "border-red-100", text: "text-red-900", tagBg: "bg-red-500", label: "要警戒" },
    1: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-900", tagBg: "bg-amber-500", label: "注意" },
    0: { bg: "bg-white", border: "border-slate-200", text: "text-slate-600", tagBg: "bg-emerald-500", label: "安定" }, // 0も表示する場合
  }[lv] || { bg: "bg-white", border: "border-slate-200", text: "text-slate-400", tagBg: "bg-slate-400", label: "-" };

  // トリガーアイコン選択
  let TriggerIcon = IconActivity;
  if (w.trigger === "pressure_shift") TriggerIcon = IconGauge;
  if (w.trigger === "temp_swing") TriggerIcon = IconThermometer;
  if (w.trigger === "humidity_swing") TriggerIcon = IconDroplets;

  return (
    <div className={`shrink-0 w-[140px] snap-center rounded-2xl border ${styles.border} ${styles.bg} p-3 shadow-sm flex flex-col justify-between`}>
      {/* Header: Time & Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-black text-slate-700">{hh}:00</span>
        {lv > 0 && (
          <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full ${styles.tagBg}`}>
            {styles.label}
          </span>
        )}
      </div>

      {/* Main: Trigger Info */}
      <div className="flex flex-col gap-1 mb-2">
         {lv > 0 ? (
           <>
             <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
               <TriggerIcon className={`h-3.5 w-3.5 ${lv===2?"text-red-500":"text-amber-500"}`} />
               <span>{triggerJa(w.trigger)}</span>
             </div>
             <div className="text-[10px] text-slate-500 font-medium leading-tight">
               変化が大きくなる予報です
             </div>
           </>
         ) : (
           <div className="text-xs text-slate-400 font-medium py-1">変化なし</div>
         )}
      </div>

      {/* Footer: Mini Scores (Part scores from risk.js) */}
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200/50">
         {/* Pressure */}
         <div className="flex flex-col items-center">
            <IconGauge className="h-2.5 w-2.5 text-slate-400 mb-0.5" />
            <div className={`h-1 w-full rounded-full ${w.parts?.p >= 2 ? "bg-red-400" : w.parts?.p >= 1 ? "bg-amber-300" : "bg-slate-200"}`} />
         </div>
         {/* Temp */}
         <div className="flex flex-col items-center">
            <IconThermometer className="h-2.5 w-2.5 text-slate-400 mb-0.5" />
            <div className={`h-1 w-full rounded-full ${w.parts?.t >= 2 ? "bg-red-400" : w.parts?.t >= 1 ? "bg-amber-300" : "bg-slate-200"}`} />
         </div>
         {/* Humidity */}
         <div className="flex flex-col items-center">
            <IconDroplets className="h-2.5 w-2.5 text-slate-400 mb-0.5" />
            <div className={`h-1 w-full rounded-full ${w.parts?.h >= 2 ? "bg-red-400" : w.parts?.h >= 1 ? "bg-amber-300" : "bg-slate-200"}`} />
         </div>
      </div>
    </div>
  );
}

export default function RadarPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [data, setData] = useState(null);
  const [explain, setExplain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      setLoadingAuth(false);
    })();
    return () => { mounted = false; };
  }, []);

  async function authedFetch(path) {
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) throw new Error("not logged in");
    const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  const loadAll = async () => {
    if (!session) return;
    try {
      setRefreshing(true);
      if (!data) setLoading(true);
      const [today] = await Promise.all([
        authedFetch("/api/radar/today"),
        // explain は後で /api/radar/today/explain に差し替えるならここを変更
      ]);
      setData(today?.data || null);
      setExplain(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const timeWindows = useMemo(() => Array.isArray(data?.time_windows) ? data.time_windows : [], [data]);

  // 未来24時間を抽出
  const futureWindows = useMemo(() => {
     // 現在時刻以降のデータをフィルタリングするなど必要であればここで行う
     // 今回はAPIが既に整形済みとしてそのまま使う
     return timeWindows;
  }, [timeWindows]);

  // 今のデータ（なければ先頭）
  const nowWindow = timeWindows?.[0] || null;

  // ローディング
  if (loadingAuth || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[440px] mx-auto space-y-6">
        <div className="flex justify-between items-center">
           <div className="h-6 w-32 bg-slate-200 rounded-full animate-pulse"></div>
           <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse"></div>
        </div>
        <div className="h-64 w-full bg-slate-200 rounded-[2rem] animate-pulse"></div>
        <div className="h-40 w-full bg-slate-200 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  // 未ログイン
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center max-w-[440px] mx-auto">
        <div className="w-full bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <IconActivity className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-black text-slate-800 mb-2">ログインが必要です</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            未病レーダーは、あなたの体質に合わせて<br />「変化が大きい時間」を予報します。
          </p>
          <div className="space-y-3">
            <button onClick={() => router.push("/signup")} className="w-full rounded-xl bg-emerald-600 text-white py-3.5 font-bold shadow-md shadow-emerald-200 transition hover:bg-emerald-700">
              無料で登録・ログイン
            </button>
            <button onClick={() => router.push("/check")} className="w-full rounded-xl bg-white border border-slate-200 py-3.5 font-bold text-slate-600 transition hover:bg-slate-50">
              体質チェックのみ利用
            </button>
          </div>
        </div>
      </div>
    );
  }

  const radar = data?.radar || {};
  const external = data?.external || {};
  const level3 = radar?.level3 ?? radar?.level ?? 0;

  // ヒーロー文
  const heroTitle =
    level3 === 2 ? "変化が大きい1日" :
    level3 === 1 ? "変化が出やすい1日" :
    "穏やかな1日";

  const heroSub =
    radar?.reason_short ||
    (level3 === 2 ? "気圧・気温・湿度が動く予報です。無理せず過ごしましょう。" :
     level3 === 1 ? "急な揺れに備えて、予定を詰めすぎないのがおすすめです。" :
     "大きな崩れはなさそうです。普段通りにお過ごしください。");

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md px-4 py-3 border-b border-slate-200/50">
        <div className="max-w-[440px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-1.5">
              <IconActivity className="h-5 w-5 text-emerald-600" />
              未病レーダー
            </h1>
            <p className="text-[10px] font-bold text-slate-400">
              {new Date().toLocaleDateString("ja-JP", { weekday: "short", year: "numeric", month: "numeric", day: "numeric" })} の予報
            </p>
          </div>
          <button
            onClick={loadAll}
            disabled={refreshing}
            className="group rounded-full bg-white border border-slate-200 p-2 shadow-sm transition active:scale-95 disabled:opacity-50"
            title="更新"
          >
            <IconRefreshCw className={`h-4 w-4 text-slate-500 transition-transform ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`} />
          </button>
        </div>
      </div>

      <div className="max-w-[440px] mx-auto px-4 py-6 space-y-8">
        
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-sm p-6">
          {/* 背景装飾 */}
          <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 pointer-events-none blur-3xl ${
            level3 === 2 ? "bg-red-500" : level3 === 1 ? "bg-amber-400" : "bg-emerald-400"
          }`} />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Condition</span>
              <Pill variant={levelVariant(level3)}>{levelLabel(level3)}</Pill>
            </div>

            <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">{heroTitle}</h2>
            <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">{heroSub}</p>

            {/* Meters Grid */}
            <div className="grid grid-cols-3 gap-3">
              <MeterCard
                icon={IconThermometer}
                label="気温"
                value={external?.temp}
                unit="℃"
                delta1h={nowWindow?.delta_1h?.dT1h}
              />
              <MeterCard
                icon={IconDroplets}
                label="湿度"
                value={external?.humidity}
                unit="%"
                delta1h={nowWindow?.delta_1h?.dH1h}
              />
              <MeterCard
                icon={IconGauge}
                label="気圧"
                value={external?.pressure}
                unit="hPa"
                delta1h={nowWindow?.delta_1h?.dP1h}
              />
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section>
          <div className="flex items-center justify-between px-1 mb-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <IconTrendingUp className="h-5 w-5 text-slate-400" />
              タイムライン予報
            </h3>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">24h</span>
          </div>

          {/* Horizontal Scroll Area */}
          <div className="-mx-4 px-4 overflow-x-auto pb-4 snap-x hide-scrollbar flex gap-3">
            {futureWindows.map((w, i) => (
              <TimeChip key={i} w={w} />
            ))}
          </div>
          
          {/* 注釈 (最小化) */}
          <p className="text-[10px] text-slate-400 text-center mt-2 px-4 leading-relaxed">
            ※この時間の「変化の強さ」を見ています（寒い/暑い等の“状態”は評価しません）
          </p>
        </section>

        {/* AI Advice Placeholder */}
        <section>
          <div className="flex items-center gap-2 px-1 mb-3">
             <div className="h-2 w-2 rounded-full bg-emerald-500" />
             <h3 className="text-sm font-bold text-slate-700">AIアドバイス</h3>
          </div>
          <div className="relative rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
             <div className="flex gap-4">
                <div className="shrink-0">
                   <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-emerald-50 border border-emerald-100">
                      <Image src={DUMMY_AI.robotFace} alt="AI" fill className="object-cover" />
                   </div>
                </div>
                <div className="flex-1">
                   <p className="text-sm text-slate-600 leading-7 font-medium">
                      {explain?.text || "現在、あなたの体質と今日の気象条件から最適なアドバイスを生成しています..."}
                   </p>
                </div>
             </div>
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="pt-4 flex flex-col gap-3">
          <button
            onClick={() => router.push("/history")}
            className="w-full rounded-2xl bg-white border border-slate-100 p-4 text-left shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <span className="block text-sm font-bold text-slate-800">履歴を見る</span>
            <span className="block text-xs text-slate-400 mt-1">過去のコンディションを確認</span>
          </button>
          
          <button
            onClick={() => router.push("/check")}
            className="w-full py-4 text-center text-sm font-bold text-slate-400 hover:text-emerald-600 transition"
          >
            体質チェックをやり直す
          </button>
        </div>
      </div>
      
      {/* Global CSS for hiding scrollbar but keeping functionality */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
