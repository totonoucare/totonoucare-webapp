// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// --- Icons ---
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
    <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>
  </svg>
);
const IconActivity = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);
const IconRefreshCw = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
  </svg>
);

// 要因アイコン（P/T/H）
const IconP = ({ className }) => (
  <div className={`inline-flex items-center justify-center rounded-full w-5 h-5 text-[11px] font-extrabold ${className}`}>P</div>
);
const IconT = ({ className }) => (
  <div className={`inline-flex items-center justify-center rounded-full w-5 h-5 text-[11px] font-extrabold ${className}`}>T</div>
);
const IconH = ({ className }) => (
  <div className={`inline-flex items-center justify-center rounded-full w-5 h-5 text-[11px] font-extrabold ${className}`}>H</div>
);

// --- Helpers ---
function levelLabel(lv) {
  return ["安定", "注意", "要警戒"][lv] ?? "—";
}
function levelPillClass(lv) {
  if (lv === 2) return "bg-red-100 text-red-800";
  if (lv === 1) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}
function levelBandColor(lv) {
  if (lv === 2) return "bg-red-500";
  if (lv === 1) return "bg-amber-400";
  return "bg-emerald-500";
}
function fmt(v, digits = 1) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(digits);
}
function fmtSigned(v, digits = 1) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(digits)}`;
}
function hourLabel(timeStr) {
  try {
    const h = String(timeStr || "").split("T")?.[1]?.slice(0, 2);
    return h ? `${h}:00` : "—";
  } catch {
    return "—";
  }
}
function triggerKey(w) {
  return w?.trigger || "pressure_shift";
}
function triggerBadge(w) {
  const k = triggerKey(w);
  if (k === "temp_swing") return <IconT className="bg-slate-900 text-white" />;
  if (k === "humidity_swing") return <IconH className="bg-slate-900 text-white" />;
  return <IconP className="bg-slate-900 text-white" />;
}

function MetricCard({ icon: Icon, label, value, unit, diffValue, diffUnit, digitsValue = 1, digitsDiff = 1 }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <Icon className="h-5 w-5" />
          <div className="text-xs font-extrabold">
            {label}
            <span className="ml-2 text-[10px] font-bold text-slate-400">現在</span>
          </div>
        </div>
        <div className="text-[11px] font-bold text-slate-500">
          昨日比 {fmtSigned(diffValue, digitsDiff)}{diffUnit}
        </div>
      </div>

      <div className="mt-2 text-xl font-extrabold text-slate-900">
        {fmt(value, digitsValue)}
        <span className="ml-1 text-xs font-semibold text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

function TimelineBar({ windows, selectedIdx, onSelect }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex gap-1 min-w-max">
        {windows.map((w, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`relative h-12 w-10 rounded-xl ${levelBandColor(w.level2)} active:scale-[0.98] transition`}
            title={`${hourLabel(w.time)} ${levelLabel(w.level2)}`}
          >
            {/* 上に要因 */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              {triggerBadge(w)}
            </div>

            {/* 選択枠 */}
            {selectedIdx === i ? (
              <div className="absolute inset-0 rounded-xl ring-2 ring-slate-900/70" />
            ) : null}

            {/* 下に時刻 */}
            <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-extrabold text-white/95 drop-shadow">
              {hourLabel(w.time).slice(0, 2)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailCard({ w }) {
  if (!w) return null;

  return (
    <div className="rounded-[1.5rem] bg-white border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-slate-900">
          {hourLabel(w.time)} の変化
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${levelPillClass(w.level2)}`}>
          {levelLabel(w.level2)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-xs font-bold text-slate-500">気圧（1h）</div>
          <div className="mt-1 text-lg font-extrabold text-slate-900">
            {fmtSigned(w?.delta_1h?.p, 1)}<span className="text-xs font-semibold text-slate-500">hPa</span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-xs font-bold text-slate-500">気温（1h）</div>
          <div className="mt-1 text-lg font-extrabold text-slate-900">
            {fmtSigned(w?.delta_1h?.t, 1)}<span className="text-xs font-semibold text-slate-500">℃</span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-xs font-bold text-slate-500">湿度（1h）</div>
          <div className="mt-1 text-lg font-extrabold text-slate-900">
            {fmtSigned(w?.delta_1h?.h, 0)}<span className="text-xs font-semibold text-slate-500">%</span>
          </div>
        </div>
      </div>

      {/* “数字羅列”にはしないが、評価材料は一段だけ置く（わかる人用） */}
      <div className="mt-3 text-[11px] text-slate-500">
        判定は “数時間の変化（気圧を重め）” をまとめて評価しています。
      </div>
    </div>
  );
}

// --- Main ---
export default function RadarPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  const [selectedIdx, setSelectedIdx] = useState(0);

  // auth
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session || null);
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s || null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

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

  async function load() {
    if (!session) return;
    try {
      setErr("");
      setRefreshing(true);
      if (!data) setLoading(true);

      const json = await authedFetch("/api/radar/today");
      const d = json?.data || null;
      setData(d);

      // タイムラインが来たら先頭を選択
      const w = Array.isArray(d?.time_windows) ? d.time_windows : [];
      if (w.length) setSelectedIdx(0);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (session) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  // states
  if (loadingAuth || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[520px] mx-auto space-y-4">
        <div className="h-7 w-40 bg-slate-200 rounded-full animate-pulse" />
        <div className="h-40 bg-slate-200 rounded-[2rem] animate-pulse" />
        <div className="h-24 bg-slate-200 rounded-[2rem] animate-pulse" />
        <div className="h-28 bg-slate-200 rounded-[2rem] animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="w-full max-w-[460px] rounded-[2rem] bg-white border border-slate-100 p-7 shadow-sm text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <IconActivity className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="mt-4 text-xl font-extrabold text-slate-900">ログインが必要です</div>
          <div className="mt-2 text-sm text-slate-600 leading-6">
            体質×天気の変化から「気をつける時間帯」を出します。
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.push("/signup")}
              className="w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-extrabold shadow-md shadow-emerald-200"
            >
              登録・ログイン
            </button>
            <button
              onClick={() => router.push("/check")}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-extrabold text-slate-700"
            >
              体質チェックへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (data?.needs_constitution) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[520px] mx-auto">
        <div className="rounded-[2rem] bg-white border border-slate-100 p-7 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">体質データがありません</div>
          <div className="mt-2 text-sm text-slate-600 leading-6">
            レーダー予報を出すには、先に体質チェックが必要です。
          </div>
          <button
            onClick={() => router.push("/check")}
            className="mt-6 w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-extrabold shadow-md shadow-emerald-200"
          >
            体質チェックを始める
          </button>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[520px] mx-auto">
        <div className="rounded-[2rem] bg-white border border-slate-100 p-7 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">読み込みに失敗しました</div>
          <div className="mt-2 text-sm text-slate-600">{err}</div>
          <button
            onClick={load}
            className="mt-6 w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-extrabold"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  const radar = data?.radar || {};
  const external = data?.external || {};
  const now = external?.now || {};
  const ydiff = external?.yesterday_diff || {};

  const windows = Array.isArray(data?.time_windows) ? data.time_windows : [];
  const selected = windows[selectedIdx] || windows[0] || null;

  const level = radar?.level ?? 0;

  // reason_text は「メイン文」だけ出す（詳細はAI explainに寄せる）
  const reasonText = String(radar?.reason_text || "").split("\n")[0] || "";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-[520px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <IconActivity className="w-5 h-5 text-emerald-600" />
              未病レーダー
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              {new Date().toLocaleDateString("ja-JP")} の予報
            </p>
          </div>

          <button
            onClick={load}
            disabled={refreshing}
            className="p-2 bg-white border border-slate-200 rounded-full shadow-sm active:scale-95 transition"
            title="更新"
          >
            <IconRefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-[520px] mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          <div
            className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[4rem] opacity-20 pointer-events-none ${
              level === 2 ? "bg-red-500" : level === 1 ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-extrabold text-slate-600">今日の変化ストレス</span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${levelPillClass(level)}`}>
                {levelLabel(level)}
              </span>
            </div>

            <div className="mb-5">
              <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                {reasonText || "今日は穏やかに過ごせそうです"}
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MetricCard
                icon={IconThermometer}
                label="気温"
                value={now?.temp}
                unit="℃"
                diffValue={ydiff?.temp}
                diffUnit="℃"
                digitsValue={1}
                digitsDiff={1}
              />
              <MetricCard
                icon={IconDroplets}
                label="湿度"
                value={now?.humidity}
                unit="%"
                diffValue={ydiff?.humidity}
                diffUnit="%"
                digitsValue={0}
                digitsDiff={0}
              />
              <MetricCard
                icon={IconGauge}
                label="気圧"
                value={now?.pressure}
                unit="hPa"
                diffValue={ydiff?.pressure}
                diffUnit="hPa"
                digitsValue={1}
                digitsDiff={1}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-base font-extrabold text-slate-900">24時間タイムライン</h3>
            <div className="text-xs text-slate-400">P=気圧 / T=気温 / H=湿度</div>
          </div>

          <div className="rounded-[1.5rem] bg-white border border-slate-100 shadow-sm p-4 space-y-4">
            {windows.length ? (
              <>
                <TimelineBar
                  windows={windows}
                  selectedIdx={selectedIdx}
                  onSelect={setSelectedIdx}
                />
                <DetailCard w={selected} />
              </>
            ) : (
              <div className="text-sm text-slate-600">表示できるデータがありません。</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 space-y-3">
          <button
            onClick={() => router.push("/history")}
            className="w-full rounded-2xl bg-white border border-slate-100 shadow-sm p-4 text-left hover:bg-slate-50 transition"
          >
            <div className="text-sm font-extrabold text-slate-900">過去のコンディション履歴</div>
            <div className="mt-1 text-xs text-slate-500">あとで振り返り・傾向の確認</div>
          </button>

          <button
            onClick={() => router.push("/check")}
            className="w-full py-3 text-sm font-extrabold text-slate-400 hover:text-emerald-700 transition"
          >
            体質チェックをやり直す
          </button>

          <div className="text-[11px] text-slate-400 leading-5">
            ※ 本機能は医療行為ではなくセルフケア支援です。強い症状がある場合は無理をせず、必要に応じて医療機関へ。
          </div>
        </div>
      </div>
    </div>
  );
}
