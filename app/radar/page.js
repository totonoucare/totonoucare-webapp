"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// --- Icons (SVG) ---
const IconCloudSun = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="M20 12h2" /><path d="m19.07 4.93-1.41 1.41" /><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" /><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" /></svg>
);
const IconDroplets = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></svg>
);
const IconGauge = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></svg>
);
const IconWind = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></svg>
);
const IconActivity = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
);
const IconChevronRight = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6" /></svg>
);
const IconRefreshCw = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
);

// --- 辞書 & ヘルパー ---
const JA_MAP = {
  cold: "冷え込み",
  heat: "暑さ",
  damp: "湿気",
  dry: "乾燥",
  wind: "強風",
  pressure: "気圧低下",
  "pressure-up": "気圧上昇",
  change: "急変動",
};

// 英語データを日本語に変換（なければそのまま）
function t(key) {
  if (!key) return "";
  const k = key.toLowerCase();
  return JA_MAP[k] || k;
}

// ユーザー希望の「スマートな短文」生成ロジック
function generateSummary(external, level) {
  if (!external) return "データ取得中...";
  
  // 変化量を取得（APIレスポンスの構造に依存、なければ0扱い）
  // ※ diff_temp, diff_pressure がAPIから返ってきている前提
  const dp = external.diff_pressure ?? 0;
  const dt = external.diff_temp ?? 0;
  const dh = external.diff_humidity ?? 0;

  // メッセージ構築
  let msg = "";
  
  // 優先度1: 気圧変化（頭痛などに直結するため）
  if (Math.abs(dp) >= 2) {
    msg = `気圧の変化が ${Math.abs(dp)}hPa です。`;
  } 
  // 優先度2: 気温変化
  else if (Math.abs(dt) >= 4) {
    msg = `気温差が ${Math.abs(dt)}℃ あります。`;
  }
  // 優先度3: 湿度変化
  else if (Math.abs(dh) >= 15) {
    msg = `湿度が ${Math.abs(dh)}% 変化しています。`;
  }
  else {
    msg = "気象条件は比較的安定しています。";
  }

  // レベルに応じた結び
  if (level >= 2) msg += " 体調の変化に警戒してください。";
  else if (level === 1) msg += " 無理せず過ごしましょう。";
  else msg += " 穏やかに過ごせそうです。";

  return msg;
}

// --- Components ---
function Pill({ children, variant = "default" }) {
  const styles = {
    default: "bg-slate-100 text-slate-600",
    safe: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${styles[variant]}`}>
      {children}
    </span>
  );
}

function WeatherBadge({ icon: Icon, label, value, unit }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm p-3 min-w-[88px]">
      <Icon className="h-5 w-5 text-slate-400 mb-1" />
      <span className="text-base font-bold text-slate-800">
        {value}<span className="text-xs font-normal text-slate-500">{unit}</span>
      </span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}

// 横スクロール用のカード
function TimeRiskCard({ time, level, riskFactors }) {
  const conf = {
    0: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", label: "安定" },
    1: { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-800", label: "注意" },
    2: { border: "border-red-200", bg: "bg-red-50", text: "text-red-800", label: "警戒" },
  }[level] || {};

  // リスク要因を日本語化して結合
  const factorsJa = Array.isArray(riskFactors) 
    ? riskFactors.map(t).join("・") 
    : "";

  return (
    <div className={`flex flex-col items-center justify-between shrink-0 w-[84px] h-[100px] rounded-2xl border ${conf.border} ${conf.bg} p-2 snap-center`}>
      <span className="text-xs font-bold text-slate-600">{time}</span>
      
      <div className="flex flex-col items-center gap-1">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-white/60 ${conf.text}`}>
          {conf.label}
        </span>
        {/* 要因があれば表示 */}
        {factorsJa && (
          <span className="text-[10px] font-medium text-slate-600 text-center leading-tight line-clamp-2">
            {factorsJa}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Main ---
export default function RadarPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [data, setData] = useState(null);
  const [explain, setExplain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Auth & Data Load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getSession();
      setSession(auth.session || null);
      if (auth.session) {
        loadData(auth.session.access_token);
      } else {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadData = async (token) => {
    try {
      if (!data) setLoading(true);
      setRefreshing(true);
      const headers = { Authorization: `Bearer ${token}` };
      const [r1, r2] = await Promise.all([
        fetch("/api/radar/today", { headers }).then(r => r.json()),
        fetch("/api/radar/today/explain", { headers }).then(r => r.json()),
      ]);
      setData(r1?.data || null);
      setExplain(r2?.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --- Display Logic ---
  const radar = data?.radar || {};
  const external = data?.external || {};
  const windows = Array.isArray(data?.time_windows) ? data.time_windows : [];

  // 未来24時間のデータを抽出 & ソート
  const sortedWindows = windows
    .slice()
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  // 「根拠：〜」などのダサいテキストを無視し、数値から要約文を生成
  const summaryText = generateSummary(external, radar.level || 0);

  // 読み込み中
  if (loading && !data) return <div className="min-h-screen bg-slate-50 p-6 flex justify-center pt-20"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"/></div>;

  // 未ログイン
  if (!session) return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
      <div className="mb-4 text-emerald-600"><IconActivity className="w-10 h-10" /></div>
      <h2 className="text-lg font-bold text-slate-800">未病レーダーへようこそ</h2>
      <p className="text-sm text-slate-500 mb-6">ログインすると予報が見られます</p>
      <button onClick={() => router.push("/login")} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold">ログイン</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <IconActivity className="w-5 h-5 text-emerald-600" /> 未病レーダー
          </h1>
          <p className="text-[10px] text-slate-400 font-bold">{new Date().toLocaleDateString('ja-JP')} の予報</p>
        </div>
        <button onClick={() => loadData(session.access_token)} disabled={refreshing} className="p-2 bg-slate-100 rounded-full">
          <IconRefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* 1. Main Status Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
          {/* 背景の装飾（レベルに応じて色変化） */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[4rem] opacity-10 pointer-events-none ${
            radar.level === 2 ? "bg-red-500" : radar.level === 1 ? "bg-amber-500" : "bg-emerald-500"
          }`} />

          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-400">今日のコンディション</span>
              <Pill variant={radar.level === 2 ? "danger" : radar.level === 1 ? "warning" : "safe"}>
                {radar.level === 2 ? "要警戒" : radar.level === 1 ? "注意" : "安定"}
              </Pill>
            </div>

            {/* 自動生成したシンプルなサマリーを表示（元のAPIテキストは無視） */}
            <h2 className="text-xl font-bold text-slate-800 leading-snug mb-6">
              {summaryText}
            </h2>

            {/* メーター表示 */}
            <div className="grid grid-cols-3 gap-2">
              <WeatherBadge icon={IconCloudSun} label="気温" value={external?.temp ?? "-"} unit="℃" />
              <WeatherBadge icon={IconDroplets} label="湿度" value={external?.humidity ?? "-"} unit="%" />
              <WeatherBadge icon={IconGauge} label="気圧" value={external?.pressure ?? "-"} unit="hPa" />
            </div>
          </div>
        </div>

        {/* 2. Timeline (横スクロール化) */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-3">
            <IconWind className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700">時間ごとの予報</h3>
          </div>
          
          {/* 横スクロールコンテナ */}
          <div className="flex overflow-x-auto gap-3 pb-4 px-1 snap-x scrollbar-hide">
            {sortedWindows.map((w, i) => (
              <TimeRiskCard 
                key={i}
                // 時刻フォーマット "14:00"
                time={new Date(w.time).getHours() + ":00"}
                level={w.level3 ?? 0}
                riskFactors={w.top_sixin} // 生データ(配列)を渡して中で変換
              />
            ))}
          </div>
        </div>

        {/* 3. AI Advice */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 px-1 mb-3">AIアドバイス</h3>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative">
             <div className="absolute -top-3 left-6 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
               To You
             </div>
             {explain?.text ? (
               <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{explain.text}</p>
             ) : (
               <p className="text-sm text-slate-400">アドバイスを生成中...</p>
             )}
          </div>
        </div>

        {/* Footer Link */}
        <button onClick={() => router.push("/history")} className="w-full flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <span className="text-sm font-bold text-slate-700">過去の履歴を見る</span>
          <IconChevronRight className="w-4 h-4 text-slate-400" />
        </button>

      </div>
    </div>
  );
}

