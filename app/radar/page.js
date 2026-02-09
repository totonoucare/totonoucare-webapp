// app/radar/page.js
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation"; // 修正: 次画面遷移用
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { 
  CloudSun, Droplets, Gauge, AlertTriangle, 
  ShieldCheck, RefreshCw, ChevronRight, Activity 
} from "lucide-react"; // アイコン用

// --- 開発用ダミー画像 (本番ではpublicフォルダの画像へ) ---
const DUMMY_IMAGES = {
  weatherSun: "https://placehold.co/128x128/fef3c7/d97706?text=Sunny", // 晴れイメージ
  robotFace: "https://placehold.co/64x64/f0fdf4/15803d?text=AI", // AI顔
  radarHero: "https://placehold.co/600x300/ecfdf5/047857?text=Radar+Chart", // レーダーチャートのプレースホルダー
};

// --- UI Components ---
function Pill({ children, variant = "default", className = "" }) {
  const variants = {
    default: "bg-slate-100 text-slate-600",
    safe: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

function WeatherBadge({ icon: Icon, label, value, unit }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-3 min-w-[80px]">
      <Icon className="h-5 w-5 text-slate-400 mb-1" />
      <span className="text-sm font-bold text-slate-700">{value}<span className="text-xs font-normal text-slate-500">{unit}</span></span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}

// タイムライン風の危険度表示
function TimeRiskRow({ time, level, riskFactors }) {
  const levelConfig = {
    0: { color: "bg-emerald-500", label: "安定", bg: "bg-emerald-50" },
    1: { color: "bg-amber-400", label: "注意", bg: "bg-amber-50" },
    2: { color: "bg-red-500", label: "警戒", bg: "bg-red-50" },
  };
  const conf = levelConfig[level] || levelConfig[0];

  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 ${conf.bg} mb-2`}>
      <div className="flex flex-col items-center min-w-[48px]">
        <span className="text-sm font-bold text-slate-700">{time}</span>
      </div>
      <div className={`h-10 w-1 ${conf.color} rounded-full`}></div>
      <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2 mb-0.5">
           <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${conf.color}`}>{conf.label}</span>
           <span className="text-xs text-slate-500 truncate">{riskFactors}</span>
         </div>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function RadarPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [explain, setExplain] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auth check
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

  // Fetch Data
  const loadAll = async () => {
    if (!session) return;
    try {
      setRefreshing(true);
      if (!data) setLoadingData(true); // 初回のみローディング表示
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No token");

      const headers = { Authorization: `Bearer ${token}` };

      // 並列取得
      const [resData, resExplain] = await Promise.all([
        fetch("/api/radar/today", { headers }).then(r => r.json()),
        fetch("/api/radar/today/explain", { headers }).then(r => r.json())
      ]);

      setData(resData?.data || null);
      setExplain(resExplain?.data || null);

    } catch (e) {
      console.error(e);
      // エラーハンドリング（本番ではToastなどで通知）
    } finally {
      setLoadingData(false);
      setRefreshing(false);
      setLoadingExplain(false);
    }
  };

  useEffect(() => {
    if (session) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // --- Helper Logic ---
  const levelLabel = (lv) => ["安定", "注意", "要警戒"][lv] ?? "—";
  const getLevelVariant = (lv) => (lv === 2 ? "danger" : lv === 1 ? "warning" : "safe");
  
  const windows = Array.isArray(data?.time_windows) ? data.time_windows : [];
  // 警戒度が高い順にソートしつつ、直近の時間を優先するなど、表示ロジックを調整
  const warnWindows = windows
    .filter((w) => (w.level3 ?? 0) >= 1)
    .sort((a, b) => new Date(a.time) - new Date(b.time)) // 時間順
    .slice(0, 5); // 多すぎると圧迫するので5件に絞る

  // --- Render ---

  // 1. Loading State (Skeleton)
  if (loadingAuth || (loadingData && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[440px] mx-auto space-y-6">
        <div className="h-8 w-32 bg-slate-200 rounded-full animate-pulse"></div>
        <div className="h-48 w-full bg-slate-200 rounded-3xl animate-pulse"></div>
        <div className="h-24 w-full bg-slate-200 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  // 2. Not Logged In
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center max-w-[440px] mx-auto">
        <div className="text-center space-y-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">ログインが必要です</h1>
          <p className="text-sm text-slate-600 leading-6">
            未病レーダーは、あなたの体質に合わせて<br/>毎日の体調を予報する機能です。
          </p>
          <div className="pt-4 space-y-3 w-full">
             <Button onClick={() => router.push("/signup")} className="w-full bg-emerald-600">無料で登録・ログイン</Button>
             <Button onClick={() => router.push("/check")} variant="ghost" className="w-full">体質チェックのみ利用する</Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. No Constitution Data
  if (!data && explain?.text?.includes("体質情報が未設定")) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 max-w-[440px] mx-auto pt-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
          <h2 className="text-lg font-bold text-slate-800 mb-2">体質データがありません</h2>
          <p className="text-sm text-slate-600 mb-6">レーダー予報を出すには、まず体質チェックが必要です。</p>
          <Button onClick={() => router.push("/check")} className="w-full bg-emerald-600">体質チェックを始める</Button>
        </div>
      </div>
    );
  }

  // 4. Main Dashboard
  const { radar, external } = data || {};
  const currentLevel = radar?.level ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-[440px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              未病レーダー
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">{new Date().toLocaleDateString('ja-JP')} の予報</p>
          </div>
          <button 
             onClick={loadAll} 
             disabled={refreshing}
             className="p-2 bg-white border border-slate-200 rounded-full shadow-sm active:scale-95 transition"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-[440px] mx-auto px-4 py-6 space-y-6">

        {/* Hero Section: 今日のステータス */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          {/* 背景装飾 */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[4rem] opacity-20 pointer-events-none ${
             currentLevel === 2 ? "bg-red-500" : currentLevel === 1 ? "bg-amber-400" : "bg-emerald-400"
          }`} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
               <span className="text-sm font-bold text-slate-500">現在のコンディション</span>
               <Pill variant={getLevelVariant(currentLevel)}>{levelLabel(currentLevel)}</Pill>
            </div>
            
            <div className="mb-6">
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-snug">
                {radar?.reason_text?.split("。")[0] || "今日は穏やかです"}
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-6">
                 {radar?.reason_text?.split("。")[1]}。
              </p>
            </div>

            {/* Environmental Data Grid */}
            <div className="grid grid-cols-3 gap-2">
              <WeatherBadge icon={CloudSun} label="気温" value={external?.temp ?? "—"} unit="℃" />
              <WeatherBadge icon={Droplets} label="湿度" value={external?.humidity ?? "—"} unit="%" />
              <WeatherBadge icon={Gauge} label="気圧" value={external?.pressure ?? "—"} unit="hPa" />
            </div>
          </div>
        </div>

        {/* Timeline: 注意すべき時間帯 */}
        <div>
          <div className="flex items-center justify-between px-2 mb-3">
             <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
               <AlertTriangle className="w-4 h-4 text-amber-500" />
               気をつける時間帯
             </h3>
             <span className="text-xs text-slate-400">今後24時間</span>
          </div>

          <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-4">
             {warnWindows.length > 0 ? (
               <div className="space-y-1">
                 {warnWindows.map((w, i) => (
                   <TimeRiskRow 
                     key={i} 
                     time={new Date(w.time).getHours() + ":00"} 
                     level={w.level3} 
                     riskFactors={Array.isArray(w.top_sixin) ? w.top_sixin.join("・") : ""}
                   />
                 ))}
               </div>
             ) : (
               <div className="text-center py-6">
                 <div className="inline-block p-3 bg-emerald-50 rounded-full mb-2">
                   <ShieldCheck className="w-6 h-6 text-emerald-500" />
                 </div>
                 <p className="text-sm font-bold text-slate-700">特に心配な時間はありません</p>
                 <p className="text-xs text-slate-500 mt-1">今日は穏やかに過ごせそうです。</p>
               </div>
             )}
          </div>
        </div>

        {/* AI Advice: チャット風UI */}
        <div>
           <h3 className="text-base font-bold text-slate-800 px-2 mb-3">AIアドバイス</h3>
           <div className="flex gap-4 items-start">
              <div className="shrink-0">
                 <div className="w-12 h-12 rounded-full border border-slate-100 bg-white shadow-sm overflow-hidden p-1">
                   <Image src={DUMMY_IMAGES.robotFace} alt="AI" width={48} height={48} className="object-contain" />
                 </div>
              </div>
              <div className="flex-1 bg-white rounded-2xl rounded-tl-none border border-slate-100 shadow-sm p-5 relative">
                 {/* 吹き出しの三角 */}
                 <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l border-b border-slate-100 transform rotate-45"></div>
                 
                 {loadingExplain ? (
                   <div className="flex space-x-2 h-6 items-center">
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                   </div>
                 ) : explain?.text ? (
                   <div className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                     {explain.text}
                   </div>
                 ) : (
                   <div className="text-sm text-slate-400">データがありません</div>
                 )}
              </div>
           </div>
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 pb-8 flex flex-col gap-3">
           <button 
             onClick={() => router.push("/history")}
             className="flex items-center justify-between w-full p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition"
           >
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-slate-100 rounded-full"><Activity className="w-4 h-4 text-slate-600"/></div>
                 <span className="text-sm font-bold text-slate-700">過去のコンディション履歴</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
           </button>
           
           <button 
             onClick={() => router.push("/check")}
             className="w-full py-3 text-sm font-bold text-slate-400 hover:text-emerald-600 transition"
           >
             体質チェックをやり直す
           </button>
        </div>

      </div>
    </div>
  );
}
