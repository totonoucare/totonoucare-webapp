// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

// --- Luxurious Icons (With Backgrounds) ---
// アイコン自体に少し色気を持たせるためのラッパー
const IconWrapper = ({ children, colorClass = "bg-slate-100 text-slate-500" }) => (
  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass} shadow-sm ring-1 ring-inset ring-black/5`}>
    {children}
  </div>
);

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

const DUMMY_AI = {
  robotFace: "https://placehold.co/64x64/f0fdf4/15803d?text=AI",
};

// --- Helpers ---
function Pill({ children, variant = "default" }) {
  const v = {
    safe: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    danger: "bg-rose-50 text-rose-700 border border-rose-100",
    default: "bg-slate-50 text-slate-600 border border-slate-200",
  }[variant] || "bg-slate-50 text-slate-600";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-sm ${v}`}>{children}</span>;
}

function levelLabel(lv) {
  return ["安定", "注意", "要警戒"][lv] ?? "—";
}
function levelVariant(lv) {
  if (lv === 2) return "danger";
  if (lv === 1) return "warning";
  return "safe";
}

function triggerJa(code) {
  const map = {
    pressure_shift: "気圧の揺れ",
    temp_swing: "気温の揺れ",
    humidity_swing: "湿度の揺れ",
  };
  return map[code] || "変化";
}

// 変化量の矢印表示
function ArrowDelta({ value, unit }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return <span className="text-xs text-slate-300">—</span>;
  const dir = n > 0 ? "up" : n < 0 ? "down" : "flat";
  // 色味を少し上品に
  const color = dir === "up" ? "text-rose-500" : dir === "down" ? "text-sky-500" : "text-slate-400";
  const mark = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  
  return (
    <span className={`flex items-center gap-0.5 text-xs font-bold ${color} bg-white/50 px-1.5 py-0.5 rounded-md`}>
      {mark} {Math.abs(n).toFixed(unit === "%" ? 0 : 1)}{unit}
    </span>
  );
}

// ダッシュボードのメーターカード
function MeterCard({ icon: Icon, label, value, unit, delta1h }) {
  // アイコンごとのテーマカラー
  const theme = 
    label === "気温" ? "bg-orange-50 text-orange-500" :
    label === "湿度" ? "bg-blue-50 text-blue-500" :
    "bg-purple-50 text-purple-500"; // 気圧

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between">
        <IconWrapper colorClass={theme}>
          <Icon className="h-5 w-5" />
        </IconWrapper>
        <ArrowDelta value={delta1h} unit={unit} />
      </div>
      
      <div className="mt-3">
        <div className="text-xs font-bold text-slate-400">{label}</div>
        <div className="mt-0.5 text-xl font-extrabold text-slate-700 tracking-tight">
          {Number.isFinite(Number(value)) ? Number(value).toFixed(unit === "%" ? 0 : 1) : "—"}
          <span className="ml-0.5 text-xs font-bold text-slate-400">{unit}</span>
        </div>
      </div>
    </div>
  );
}

// スコアをドットで表示するコンポーネント (例: ●●○)
function ScoreIndicator({ score, max = 3 }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(max)].map((_, i) => (
        <div 
          key={i} 
          className={`h-1.5 w-1.5 rounded-full ${i < score ? "bg-current" : "bg-slate-200"}`} 
        />
      ))}
    </div>
  );
}

// タイムラインのカード（豪華版）
function TimeWidget({ w }) {
  const t = new Date(w.time);
  const hh = String(t.getHours()).padStart(2, "0");
  
  const isDanger = w.level3 >= 2;
  const isWarning = w.level3 >= 1;

  // カードのデザイン定義
  const style = isDanger 
    ? { bg: "bg-gradient-to-br from-rose-50 to-white", border: "border-rose-200", shadow: "shadow-rose-100", text: "text-rose-900", badge: "bg-rose-500 text-white" }
    : isWarning 
      ? { bg: "bg-gradient-to-br from-amber-50 to-white", border: "border-amber-200", shadow: "shadow-amber-100", text: "text-amber-900", badge: "bg-amber-500 text-white" }
      : { bg: "bg-white", border: "border-slate-100", shadow: "shadow-slate-100", text: "text-slate-700", badge: "bg-slate-400 text-white" };

  const label = isDanger ? "要警戒" : isWarning ? "注意" : "変化小";

  return (
    <div className={`flex min-w-[180px] flex-col justify-between rounded-3xl border ${style.border} ${style.bg} p-4 shadow-lg ${style.shadow} snap-center`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tight text-slate-800">{hh}<span className="text-sm font-bold text-slate-400">:00</span></span>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm ${style.badge}`}>
          {label}
        </span>
      </div>

      {/* Main Trigger */}
      <div className="mt-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Main Trigger</div>
        <div className={`text-sm font-extrabold ${style.text}`}>
          {triggerJa(w.trigger)}
        </div>
      </div>

      {/* Breakdown Indicators */}
      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-white/60 p-2 ring-1 ring-black/5">
        
        {/* Pressure */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold text-slate-400">気圧</span>
          <div className="text-purple-500">
             <ScoreIndicator score={w.parts?.p ?? 0} />
          </div>
        </div>
        
        <div className="h-4 w-px bg-slate-200"></div>

        {/* Temp */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold text-slate-400">気温</span>
          <div className="text-orange-500">
             <ScoreIndicator score={w.parts?.t ?? 0} />
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200"></div>

        {/* Humidity */}
        <div className="flex flex-col items-center gap-1">
           <span className="text-[9px] font-bold text-slate-400">湿度</span>
           <div className="text-blue-500">
             <ScoreIndicator score={w.parts?.h ?? 0} />
           </div>
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
  const top3Windows = useMemo(() => {
    const sorted = [...timeWindows].sort((a, b) => (b?.wind_score ?? 0) - (a?.wind_score ?? 0));
    return sorted.slice(0, 3);
  }, [timeWindows]);

  const nowWindow = timeWindows?.[0] || null;

  if (loadingAuth || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[440px] mx-auto space-y-6">
        <div className="h-8 w-36 bg-slate-200 rounded-full animate-pulse"></div>
        <div className="h-48 w-full bg-slate-200 rounded-3xl animate-pulse"></div>
        <div className="h-36 w-full bg-slate-200 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center max-w-[440px] mx-auto">
        <div className="w-full rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-black text-slate-800">ログインが必要です</h1>
          <p className="mt-2 text-sm text-slate-500 leading-6">
            未病レーダーは、あなたの体質に合わせて<br />「変化が大きい時間」を先に知らせます。
          </p>
          <div className="mt-6 space-y-3">
            <button onClick={() => router.push("/signup")} className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-emerald-200 shadow-md transition hover:bg-emerald-700">
              無料で登録・ログイン
            </button>
            <button onClick={() => router.push("/check")} className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
              体質チェックへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const radar = data?.radar || {};
  const external = data?.external || {};
  const level3 = radar?.level3 ?? radar?.level ?? 0;

  const heroTitle =
    level3 === 2 ? "変化が大きい1日" :
    level3 === 1 ? "変化が出やすい日" :
    "変化は少なめ";

  const heroSub =
    radar?.reason_short ||
    (level3 === 2 ? "気圧や気温が短時間で動く予報です。無理をしないのが一番の対策。" :
     level3 === 1 ? "急な揺れに備えて、予定を詰めすぎないように。" :
     "普段通りでOK。疲れを溜めないようリラックス。");

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-[440px] items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-800">
              <span className="text-emerald-500">⚡️</span> 未病レーダー
            </h1>
            <p className="text-[10px] font-bold text-slate-400">
              {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })} の予報
            </p>
          </div>
          <button
            onClick={loadAll}
            disabled={refreshing}
            className="rounded-full bg-white p-2.5 shadow-sm ring-1 ring-slate-100 transition active:scale-95 disabled:opacity-50"
          >
            <IconRefreshCw className={`h-4 w-4 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[440px] space-y-8 px-4 py-4">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100">
          {/* Decorative Gradient Blob */}
          <div className={`pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full blur-3xl opacity-20 ${
            level3 === 2 ? "bg-rose-500" : level3 === 1 ? "bg-amber-400" : "bg-emerald-400"
          }`} />

          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
              <Pill variant={levelVariant(level3)}>{levelLabel(level3)}</Pill>
            </div>

            <h2 className="mt-4 text-3xl font-black text-slate-800 leading-tight tracking-tight">{heroTitle}</h2>
            <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">{heroSub}</p>

            <div className="mt-6 grid grid-cols-3 gap-3">
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
        </div>

        {/* Timeline Section */}
        <div>
          <div className="mb-4 flex items-center justify-between px-1">
            <h3 className="flex items-center gap-2 text-base font-black text-slate-800">
              <IconAlertTriangle className="h-5 w-5 text-amber-500" />
              変化ピーク（TOP3）
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">24h</span>
          </div>

          {/* Horizontal Scroll Area */}
          <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
            {top3Windows.map((w, i) => (
              <TimeWidget key={i} w={w} />
            ))}
            {/* End Spacer */}
            <div className="w-2 shrink-0" />
          </div>

          {/* 注釈はここだけ（最小回数） */}
          <div className="mt-2 text-center text-[10px] font-medium text-slate-400">
            ※「注意/要警戒」は“変化の激しさ”で判定しています。<br/>（寒い/暑い等の“状態”だけではスコアは上がりません）
          </div>
        </div>

        {/* AI Advice Placeholder */}
        <div>
          <h3 className="mb-3 px-1 text-base font-black text-slate-800">今日の対策（AI）</h3>
          <div className="flex gap-4">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                 <Image src={DUMMY_AI.robotFace} alt="AI" width={32} height={32} className="object-contain opacity-80" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                <span className="text-[8px] text-white">AI</span>
              </div>
            </div>
            
            <div className="relative flex-1 rounded-2xl rounded-tl-none border border-slate-100 bg-white p-5 shadow-sm">
               {/* 吹き出しのしっぽ */}
               <div className="absolute -left-2 top-4 h-4 w-4 rotate-45 border-b border-l border-slate-100 bg-white"></div>
               
               <p className="text-sm leading-7 text-slate-600">
                 ここにAIからの具体的なアドバイスが入ります。<br/>
                 今日は<span className="font-bold text-emerald-600">「夕方の気圧低下」</span>に備えて、早めの入浴がおすすめです。
               </p>
            </div>
          </div>
        </div>

        {/* Footer Nav */}
        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => router.push("/history")}
            className="group flex w-full items-center justify-between rounded-3xl border border-slate-100 bg-white px-6 py-5 shadow-sm transition active:scale-95"
          >
            <div>
              <div className="text-sm font-black text-slate-800 group-hover:text-emerald-600 transition">履歴を見る</div>
              <div className="text-xs font-medium text-slate-400">過去のコンディションを確認</div>
            </div>
            <div className="rounded-full bg-slate-50 p-2 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition">
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
          
          <button
            onClick={() => router.push("/check")}
            className="w-full py-4 text-xs font-bold text-slate-400 transition hover:text-emerald-600"
          >
            体質チェックをやり直す
          </button>
        </div>

      </div>
    </div>
  );
}
