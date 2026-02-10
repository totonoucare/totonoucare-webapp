// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

// --- Icons (Inline SVG) ---
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

const IconArrowUp = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>
  </svg>
);

const IconArrowDown = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>
  </svg>
);

const IconMinus = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14"/>
  </svg>
);

// --- UI helpers ---
function levelLabel(lv) {
  return ["安定", "注意", "要警戒"][lv] ?? "—";
}

function levelPill(lv) {
  if (lv === 2) return "bg-red-100 text-red-800";
  if (lv === 1) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function triggerJa(trigger) {
  const map = {
    pressure_shift: "気圧の変化",
    temp_swing: "気温の変化",
    humidity_swing: "湿度の変化",
  };
  return map[trigger] || "変化";
}

function fmt(v, digits = 1) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(digits);
}

function ArrowDelta({ value, unit, digits = 1 }) {
  const x = Number(value);
  if (!Number.isFinite(x)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <IconMinus className="h-3 w-3" />
        —
      </span>
    );
  }
  const up = x > 0.05;
  const down = x < -0.05;

  const Icon = up ? IconArrowUp : down ? IconArrowDown : IconMinus;
  const color = up ? "text-rose-600" : down ? "text-sky-600" : "text-slate-500";
  const sign = up ? "+" : "";

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {sign}{Math.abs(x).toFixed(digits)}{unit}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, unit, deltaValue, deltaUnit, digitsValue = 1, digitsDelta = 1 }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-600">
          <Icon className="h-5 w-5" />
          <div className="text-xs font-semibold">{label}</div>
        </div>
        <ArrowDelta value={deltaValue} unit={deltaUnit} digits={digitsDelta} />
      </div>

      <div className="mt-2 text-xl font-extrabold text-slate-800">
        {fmt(value, digitsValue)}
        <span className="ml-1 text-xs font-semibold text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

function TimeChip({ w }) {
  const lv = w?.level2 ?? 0;
  const pill = lv === 2 ? "bg-red-600" : lv === 1 ? "bg-amber-500" : "bg-emerald-500";
  const bg = lv === 2 ? "bg-red-50" : lv === 1 ? "bg-amber-50" : "bg-emerald-50";

  const hour = (() => {
    try {
      // "YYYY-MM-DDTHH:00" を想定（Open-Meteo）
      const h = String(w?.time || "").split("T")?.[1]?.slice(0, 2);
      return h ? `${h}:00` : "—";
    } catch {
      return "—";
    }
  })();

  return (
    <div className={`min-w-[220px] max-w-[220px] rounded-2xl border border-slate-100 ${bg} p-4`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-800">{hour}</div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold text-white ${pill}`}>
          {levelLabel(lv)}
        </span>
      </div>

      <div className="mt-2 text-xs text-slate-600">
        {triggerJa(w?.trigger)}
      </div>

      <div className="mt-2 space-y-1 text-xs text-slate-700">
        <div className="flex items-center justify-between">
          <span>気圧</span>
          <span className="font-semibold">{w?.abs?.p != null ? `${fmt(w.abs.p, 1)}hPa` : "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>気温</span>
          <span className="font-semibold">{w?.abs?.t != null ? `${fmt(w.abs.t, 1)}℃` : "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>湿度</span>
          <span className="font-semibold">{w?.abs?.h != null ? `${fmt(w.abs.h, 0)}%` : "—"}</span>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-slate-500">
        ※ 直近 {w?.back_hours || 3}時間の変化量
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
      setData(json?.data || null);
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
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[480px] mx-auto space-y-4">
        <div className="h-7 w-40 bg-slate-200 rounded-full animate-pulse" />
        <div className="h-40 bg-slate-200 rounded-[2rem] animate-pulse" />
        <div className="h-28 bg-slate-200 rounded-[2rem] animate-pulse" />
        <div className="h-28 bg-slate-200 rounded-[2rem] animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="w-full max-w-[440px] rounded-[2rem] bg-white border border-slate-100 p-7 shadow-sm text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <IconActivity className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="mt-4 text-xl font-extrabold text-slate-800">ログインが必要です</div>
          <div className="mt-2 text-sm text-slate-600 leading-6">
            未病レーダーは、体質×天気の変化から<br />「気をつける時間帯」を出します。
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.push("/signup")}
              className="w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-bold shadow-md shadow-emerald-200"
            >
              登録・ログイン
            </button>
            <button
              onClick={() => router.push("/check")}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700"
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
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[480px] mx-auto">
        <div className="rounded-[2rem] bg-white border border-slate-100 p-7 shadow-sm">
          <div className="text-lg font-extrabold text-slate-800">体質データがありません</div>
          <div className="mt-2 text-sm text-slate-600 leading-6">
            レーダー予報を出すには、先に体質チェックが必要です。
          </div>
          <button
            onClick={() => router.push("/check")}
            className="mt-6 w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-bold shadow-md shadow-emerald-200"
          >
            体質チェックを始める
          </button>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[480px] mx-auto">
        <div className="rounded-[2rem] bg-white border border-slate-100 p-7 shadow-sm">
          <div className="text-lg font-extrabold text-slate-800">読み込みに失敗しました</div>
          <div className="mt-2 text-sm text-slate-600">{err}</div>
          <button
            onClick={load}
            className="mt-6 w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-bold"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  const radar = data?.radar || {};
  const external = data?.external || {};
  const highlight = Array.isArray(data?.highlight_windows) ? data.highlight_windows : [];
  const level = radar?.level ?? 0;

  const reasonText = String(radar?.reason_text || "").trim();
  const [headline, ...rest] = reasonText.split("\n");
  const summary = rest.join("\n").trim();

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
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

      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          <div
            className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[4rem] opacity-20 pointer-events-none ${
              level === 2 ? "bg-red-500" : level === 1 ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-500">今日の変化ストレス</span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${levelPill(level)}`}>
                {levelLabel(level)}
              </span>
            </div>

            <div className="mb-5">
              <h2 className="text-2xl font-extrabold text-slate-800 leading-snug">
                {headline || "今日は穏やかに過ごせそうです"}
              </h2>
              {summary ? (
                <p className="mt-2 text-sm text-slate-600 leading-7 whitespace-pre-wrap">
                  {summary}
                </p>
              ) : null}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <MetricCard
                icon={IconThermometer}
                label="気温"
                value={external?.temp}
                unit="℃"
                deltaValue={external?.d_temp_1h}
                deltaUnit="℃"
                digitsValue={1}
                digitsDelta={1}
              />
              <MetricCard
                icon={IconDroplets}
                label="湿度"
                value={external?.humidity}
                unit="%"
                deltaValue={external?.d_humidity_1h}
                deltaUnit="%"
                digitsValue={0}
                digitsDelta={0}
              />
              <MetricCard
                icon={IconGauge}
                label="気圧"
                value={external?.pressure}
                unit="hPa"
                deltaValue={external?.d_pressure_1h}
                deltaUnit="hPa"
                digitsValue={1}
                digitsDelta={1}
              />
            </div>

            <div className="mt-3 text-[11px] text-slate-500">
              ※ 右上の矢印は「直近1時間」の変化量
            </div>
          </div>
        </div>

        {/* Timeline (Horizontal scroll) */}
        <div>
          <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-base font-extrabold text-slate-800">気をつける時間帯</h3>
            <span className="text-xs text-slate-400">今後24時間</span>
          </div>

          <div className="rounded-[1.5rem] bg-white border border-slate-100 shadow-sm p-4">
            <div className="text-xs text-slate-500 mb-3">
              今日が「安定」でも、変化が大きい山を2〜3個ピックアップします。
            </div>

            {highlight.length ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {highlight.map((w, i) => (
                  <TimeChip key={i} w={w} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">表示できるデータがありません。</div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 space-y-3">
          <button
            onClick={() => router.push("/history")}
            className="w-full rounded-2xl bg-white border border-slate-100 shadow-sm p-4 text-left hover:bg-slate-50 transition"
          >
            <div className="text-sm font-bold text-slate-800">過去の体質チェック履歴</div>
            <div className="mt-1 text-xs text-slate-500">結果の確認・保存状況のチェック</div>
          </button>

          <button
            onClick={() => router.push("/check")}
            className="w-full py-3 text-sm font-bold text-slate-400 hover:text-emerald-700 transition"
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
