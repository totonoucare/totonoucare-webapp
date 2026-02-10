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

const DUMMY_AI = {
  robotFace: "https://placehold.co/64x64/f0fdf4/15803d?text=AI",
};

function Pill({ children, variant = "default" }) {
  const v = {
    safe: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    default: "bg-slate-100 text-slate-700",
  }[variant] || "bg-slate-100 text-slate-700";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${v}`}>{children}</span>;
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

function ArrowDelta({ value, unit }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return <span className="text-xs text-slate-400">—</span>;
  const dir = n > 0 ? "up" : n < 0 ? "down" : "flat";
  const color = dir === "up" ? "text-rose-600" : dir === "down" ? "text-sky-600" : "text-slate-500";
  const mark = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {mark} {Math.abs(n).toFixed(unit === "%" ? 0 : 1)}{unit}
      <span className="text-[10px] font-normal text-slate-400"> /1h</span>
    </span>
  );
}

function MeterCard({ icon: Icon, label, value, unit, delta1h }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-slate-500" />
          <span className="text-xs text-slate-500 font-semibold">{label}</span>
        </div>
        <ArrowDelta value={delta1h} unit={unit} />
      </div>
      <div className="mt-2 text-lg font-extrabold text-slate-800">
        {Number.isFinite(Number(value)) ? Number(value).toFixed(unit === "%" ? 0 : 1) : "—"}
        <span className="text-xs font-bold text-slate-500 ml-1">{unit}</span>
      </div>
    </div>
  );
}

function TimeChip({ w }) {
  const t = new Date(w.time);
  const hh = String(t.getHours()).padStart(2, "0");
  const label = w.level3 >= 2 ? "要警戒" : w.level3 >= 1 ? "注意" : "変化(小)";
  const bg =
    w.level3 >= 2 ? "bg-red-50 border-red-200" :
    w.level3 >= 1 ? "bg-amber-50 border-amber-200" :
    "bg-slate-50 border-slate-200";

  const tag =
    w.level3 >= 2 ? "bg-red-500" :
    w.level3 >= 1 ? "bg-amber-500" :
    "bg-slate-400";

  return (
    <div className={`min-w-[220px] rounded-2xl border ${bg} p-3`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-slate-800">{hh}:00</div>
        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${tag}`}>{label}</span>
      </div>
      <div className="mt-1 text-xs text-slate-600">
        主な揺れ：<span className="font-semibold">{triggerJa(w.trigger)}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-700">
        <div className="rounded-lg bg-white/60 p-2">
          <div className="text-slate-400">気圧</div>
          <div className="font-bold">{w.parts?.p ?? 0}/3</div>
        </div>
        <div className="rounded-lg bg-white/60 p-2">
          <div className="text-slate-400">気温</div>
          <div className="font-bold">{w.parts?.t ?? 0}/3</div>
        </div>
        <div className="rounded-lg bg-white/60 p-2">
          <div className="text-slate-400">湿度</div>
          <div className="font-bold">{w.parts?.h ?? 0}/3</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-slate-500">
        ※この時間の「変化の強さ」を見ています（寒い/暑い等の“状態”は評価しません）
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

  // ✅ “今日が安定でも” 上位3つ出す（UI価値）
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
        <div className="text-center space-y-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h1 className="text-xl font-extrabold text-slate-800">ログインが必要です</h1>
          <p className="text-sm text-slate-600 leading-6">
            未病レーダーは、あなたの体質に合わせて<br />「変化が大きい時間」を先に知らせます。
          </p>
          <div className="pt-3 space-y-2">
            <button onClick={() => router.push("/signup")} className="w-full rounded-xl bg-emerald-600 text-white py-3 font-bold">
              無料で登録・ログイン
            </button>
            <button onClick={() => router.push("/check")} className="w-full rounded-xl bg-white border border-slate-200 py-3 font-bold text-slate-700">
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

  // ヒーロー文：羅列禁止。短い自然文で。
  const heroTitle =
    level3 === 2 ? "今日は「変化が大きい日」" :
    level3 === 1 ? "今日は「変化が出やすい日」" :
    "今日は「変化は少なめ」";

  const heroSub =
    radar?.reason_short ||
    (level3 === 2 ? "気圧・気温・湿度が短時間に動く可能性。無理を増やさないのが安全。" :
     level3 === 1 ? "急な揺れに備えて、予定を詰めすぎないのが◎。" :
     "普段通りでOK。疲れを貯めない動き方だけ意識。");

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-[440px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">未病レーダー</h1>
            <p className="text-[10px] text-slate-500 font-medium">
              {new Date().toLocaleDateString("ja-JP")} の予報
            </p>
          </div>
          <button
            onClick={loadAll}
            disabled={refreshing}
            className="p-2 bg-white border border-slate-200 rounded-full shadow-sm active:scale-95 transition"
            title="更新"
          >
            <IconRefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-[440px] mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[4rem] opacity-20 pointer-events-none ${
            level3 === 2 ? "bg-red-500" : level3 === 1 ? "bg-amber-400" : "bg-emerald-400"
          }`} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">今日の総合</span>
              <Pill variant={levelVariant(level3)}>{levelLabel(level3)}</Pill>
            </div>

            <h2 className="mt-3 text-2xl font-extrabold text-slate-800 leading-snug">{heroTitle}</h2>
            <p className="mt-2 text-sm text-slate-600 leading-6">{heroSub}</p>

            {/* meters: current + 1h delta */}
            <div className="mt-5 grid grid-cols-3 gap-2">
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

        {/* Timeline (horizontal scroll) */}
        <div>
          <div className="flex items-center justify-between px-1 mb-3">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <IconAlertTriangle className="w-4 h-4 text-amber-500" />
              変化が大きい時間帯（上位3つ）
            </h3>
            <span className="text-xs text-slate-400">今後24時間</span>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3 pb-2">
              {top3Windows.map((w, i) => (
                <TimeChip key={i} w={w} />
              ))}
            </div>
          </div>

          <div className="mt-2 text-xs text-slate-500">
            ※「注意/要警戒」は“変化量”だけで判定しています（寒い/暑い等の状態では上がりません）
          </div>
        </div>

        {/* AI advice placeholder (あなたの explain API を作り直したらここに差す) */}
        <div>
          <h3 className="text-base font-extrabold text-slate-800 px-1 mb-3">今日の基本対策（AI）</h3>
          <div className="flex gap-3 items-start">
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-full border border-slate-100 bg-white shadow-sm overflow-hidden p-1 relative">
                <Image src={DUMMY_AI.robotFace} alt="AI" fill className="object-contain" />
              </div>
            </div>
            <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-sm text-slate-600 leading-7">
              ここは次に、体質（scoring.jsのaxes/env）＋今日/明日の「変化が大きい時間帯」から
              具体的な注意点（衣食住・負荷調整・水分/塩分/栄養素）を生成して差し替えます。
              <div className="mt-2 text-xs text-slate-400">
                ※ユーザー表示では「風」などの内部ラベルは使いません。
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => router.push("/history")}
            className="w-full rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-4 text-left"
          >
            <div className="text-sm font-bold text-slate-800">履歴を見る</div>
            <div className="text-xs text-slate-500 mt-1">過去の結果（体質チェック）を確認</div>
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
