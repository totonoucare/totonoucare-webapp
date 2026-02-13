"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/** ---------- Icons (inline SVG) ---------- */
const IconRefresh = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 0 1-15.3 6.3L3 16" />
    <path d="M3 21v-5h5" />
    <path d="M3 12a9 9 0 0 1 15.3-6.3L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const IconThermo = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4 4 0 1 0 5 0Z" />
  </svg>
);
const IconDroplet = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-6.2S12 2 12 2s-1 1.6-4 4.8S5 13 5 15a7 7 0 0 0 7 7Z" />
  </svg>
);
const IconGauge = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 13a8 8 0 1 0-16 0" />
    <path d="M12 13l3-3" />
  </svg>
);

// 主因アイコン（タイムライン）
const IconPressure = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12a8 8 0 1 0 16 0" />
    <path d="M12 4c2 2 2 6 0 8s-2 6 0 8" />
  </svg>
);
const IconTemp = ({ className = "" }) => <IconThermo className={className} />;
const IconHum = ({ className = "" }) => <IconDroplet className={className} />;
const IconSparkle = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l1.2 4.2L17 7.5l-3.8 1.3L12 13l-1.2-4.2L7 7.5l3.8-1.3L12 2Z" />
    <path d="M5 14l.7 2.4L8 17l-2.3.6L5 20l-.7-2.4L2 17l2.3-.6L5 14Z" />
  </svg>
);

const IconArrowUp = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </svg>
);
const IconArrowDown = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14" />
    <path d="M19 12l-7 7-7-7" />
  </svg>
);

/** ---------- Helpers ---------- */
function fmtSigned(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(digits)}`;
}

function levelLabel(lv) {
  return ["安定", "注意", "要警戒"][lv] ?? "—";
}

function influenceLabel(lv) {
  return ["受けにくい", "通常", "受けやすい"][lv] ?? "—";
}

function badgeClassByInfluence(lv) {
  if (lv === 2) return "bg-rose-50 text-rose-700";
  if (lv === 0) return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function forecastBadgeClass(lv) {
  if (lv === 2) return "bg-rose-50 text-rose-700";
  if (lv === 1) return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function levelColor(lv) {
  if (lv === 2) return "text-rose-600";
  if (lv === 1) return "text-amber-600";
  return "text-emerald-600";
}

function levelBarClass(lv) {
  if (lv === 2) return "bg-rose-500";
  if (lv === 1) return "bg-amber-400";
  return "bg-emerald-500";
}

function triggerIcon(trigger) {
  if (trigger === "temp") return IconTemp;
  if (trigger === "humidity") return IconHum;
  return IconPressure;
}

function triggerJa(trigger) {
  if (trigger === "temp") return "寒暖差";
  if (trigger === "humidity") return "湿度の変化";
  return "気圧の変化";
}

/**
 * 負担方向かどうかの判定（タグ表示用）
 */
function checkBurdenDirection(factorKey, influenceDebug, anomaly) {
  const c = influenceDebug?.constitution || {};
  const n = Number(anomaly);
  if (!Number.isFinite(n)) return { isBurden: false, label: null };

  let dir = "none";
  let label = null;

  if (factorKey === "pressure") {
    dir = c.pressure_dir; // high/low/none
    if (dir === "high" && n > 0) label = "高圧負担";
    if (dir === "low" && n < 0) label = "低圧負担";
  } else if (factorKey === "temp") {
    dir = c.temp_dir; // high/low/none
    if (dir === "high" && n > 0) label = "暑さ負担";
    if (dir === "low" && n < 0) label = "冷え負担";
  } else if (factorKey === "humidity") {
    dir = c.humidity_dir; // high/low/none
    if (dir === "high" && n > 0) label = "湿気負担";
    if (dir === "low" && n < 0) label = "乾燥負担";
  }

  return { isBurden: !!label, label };
}

/**
 * 体感翻訳：物理的なズレを「言葉」にする
 */
function translateSensation(factorKey, anomaly) {
  const n = Number(anomaly);
  if (!Number.isFinite(n)) return "—";

  if (factorKey === "temp") {
    if (n >= 3.0) return "暑い";
    if (n >= 1.0) return "暖";
    if (n <= -3.0) return "寒い";
    if (n <= -1.0) return "冷";
    return "適温";
  }
  if (factorKey === "humidity") {
    if (n >= 15) return "多湿";
    if (n >= 5) return "潤";
    if (n <= -15) return "乾燥";
    if (n <= -5) return "乾";
    return "適湿";
  }
  if (factorKey === "pressure") {
    if (n >= 4.0) return "超高圧";
    if (n >= 1.0) return "高圧"; // 押される
    if (n <= -4.0) return "超低圧";
    if (n <= -1.0) return "低圧"; // 抜ける
    return "平圧";
  }
  return "—";
}

/** ---------- UI Components ---------- */

/**
 * 新・体感メーターカード
 * - 言葉ファースト
 * - 物理数値は小さく
 * - バーでズレを可視化
 * - 負担方向なら警告色
 */
function SensationCard({
  icon: Icon,
  title,
  unit,
  anomaly,
  factorKey,
  influenceDebug,
}) {
  const n = anomaly == null ? 0 : Number(anomaly);
  const sensationWord = translateSensation(factorKey, n);
  const { isBurden, label: burdenLabel } = checkBurdenDirection(factorKey, influenceDebug, n);

  // 色決定ロジック
  // 1. 負担方向なら「赤（Rose）」
  // 2. 負担ではないがズレが大きいなら「青（Sky）」
  // 3. ズレが小さければ「グレー（Slate）」
  
  const isSignificant = Math.abs(n) >= (factorKey === "humidity" ? 5 : 1.0);
  
  let bgColor = "bg-slate-50";
  let borderColor = "border-slate-100";
  let textColor = "text-slate-700";
  let barColor = "bg-slate-300";
  let barBg = "bg-slate-200/50";

  if (isSignificant) {
    if (isBurden) {
      bgColor = "bg-rose-50";
      borderColor = "border-rose-100";
      textColor = "text-rose-700";
      barColor = "bg-rose-500";
    } else {
      bgColor = "bg-sky-50";
      borderColor = "border-sky-100";
      textColor = "text-sky-700";
      barColor = "bg-sky-500";
    }
  }

  // バーの長さ計算 (Maxスケールに対する割合)
  // 気圧4hPa, 気温4℃, 湿度20% をMAXとする
  const maxScale = factorKey === "humidity" ? 20 : 4; 
  const percent = Math.min(Math.abs(n) / maxScale, 1.0) * 100;

  return (
    <div className={`relative rounded-2xl border px-3 py-3 flex flex-col justify-between h-28 transition-colors ${bgColor} ${borderColor}`}>
      {/* ヘッダー */}
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-4 h-4 opacity-60 ${isSignificant ? textColor : "text-slate-400"}`} />
        <span className="text-[10px] font-extrabold text-slate-500">{title}</span>
      </div>

      {/* メイン: 体感ワード */}
      <div className="flex flex-col items-start mt-0.5">
        <span className={`text-lg font-extrabold leading-tight ${textColor}`}>
          {sensationWord}
        </span>
        {/* 物理数値は補足として小さく */}
        <span className="text-[10px] font-bold text-slate-400 mt-0.5">
          {fmtSigned(n, factorKey === "humidity" ? 0 : 1)}{unit}
        </span>
      </div>

      {/* フッター: メーター & 負担タグ */}
      <div className="mt-auto w-full">
        {/* バー */}
        <div className={`h-1.5 w-full rounded-full overflow-hidden mb-2 ${barBg}`}>
          <div 
            className={`h-full rounded-full ${barColor}`} 
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* 負担タグ (あれば表示) */}
        {isBurden ? (
          <div className="inline-block px-1.5 py-0.5 rounded-md bg-white border border-rose-100 text-[9px] font-extrabold text-rose-600 shadow-sm">
            {burdenLabel}
          </div>
        ) : (
          <div className="h-[18px]" /> // 高さ確保（レイアウト崩れ防止）
        )}
      </div>
    </div>
  );
}

function DeltaPill({ label, value, unit, digits = 1 }) {
  const n = value == null ? null : Number(value);
  const up = n != null && n > 0;
  const down = n != null && n < 0;
  const Arrow = up ? IconArrowUp : down ? IconArrowDown : null;

  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-extrabold text-slate-600">{label}</div>
        {Arrow ? <Arrow className="w-4 h-4 text-slate-400" /> : <span className="w-4 h-4 inline-block" />}
      </div>
      <div className="mt-1 flex items-end gap-1">
        <div className="text-lg font-extrabold text-slate-900">{fmtSigned(value, digits)}</div>
        <div className="text-[11px] font-extrabold text-slate-500 pb-0.5">{unit}</div>
      </div>
    </div>
  );
}

function TimelineItem({ w, selected, onClick }) {
  const Icon = w?.level3 === 0 ? IconSparkle : triggerIcon(w?.trigger);
  const time = w?.time ? `${new Date(w.time).getHours()}:00` : "—";
  const lv = w?.level3 ?? 0;

  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 w-[72px] rounded-2xl border bg-white px-2 py-2 text-left transition",
        selected ? "border-slate-300 shadow-sm" : "border-slate-100 hover:border-slate-200",
      ].join(" ")}
    >
      <div className="text-[11px] font-extrabold text-slate-600">{time}</div>

      <div className="mt-2 flex items-center justify-center">
        <Icon className={["w-6 h-6", levelColor(lv)].join(" ")} />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className={["text-[11px] font-extrabold", levelColor(lv)].join(" ")}>
          {levelLabel(lv)}
        </div>
      </div>

      <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={["h-full rounded-full", levelBarClass(lv)].join(" ")}
          style={{ width: lv === 2 ? "100%" : lv === 1 ? "66%" : "33%" }}
        />
      </div>
    </button>
  );
}

/** ---------- Page Component ---------- */
export default function RadarPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [data, setData] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // auth check
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

  async function load() {
    if (!session) return;
    try {
      setRefreshing(true);
      if (!data) setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No token");

      const res = await fetch("/api/radar/today", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const payload = json?.data || null;
      setData(payload);

      setSelectedIdx(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (session) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const windows = useMemo(() => (Array.isArray(data?.time_windows) ? data.time_windows : []), [data]);
  const selected = windows[selectedIdx] || windows[0] || null;

  // Loading / Auth States
  if (loadingAuth || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[440px] mx-auto space-y-5">
        <div className="h-6 w-40 bg-slate-200 rounded-full animate-pulse" />
        <div className="h-44 w-full bg-slate-200 rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6 space-y-4">
           <div className="h-6 w-3/4 bg-slate-100 rounded-full animate-pulse" />
           <div className="grid grid-cols-3 gap-2 mt-4">
             <div className="h-28 bg-slate-50 rounded-2xl animate-pulse" />
             <div className="h-28 bg-slate-50 rounded-2xl animate-pulse" />
             <div className="h-28 bg-slate-50 rounded-2xl animate-pulse" />
           </div>
        </div>
        <div className="h-28 w-full bg-slate-200 rounded-[2rem] animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="max-w-[440px] w-full bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 text-center">
          <div className="text-lg font-extrabold text-slate-900">ログインが必要です</div>
          <div className="text-sm text-slate-600 mt-2 font-bold">未病レーダーはログイン後に利用できます。</div>
          <div className="mt-5 flex flex-col gap-3">
            <button onClick={() => router.push("/signup")} className="rounded-xl bg-emerald-600 text-white font-extrabold py-3">
              無料で登録・ログイン
            </button>
            <button onClick={() => router.push("/check")} className="rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-extrabold py-3">
              体質チェックへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (data && data?.has_profile === false) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-10">
        <div className="max-w-[440px] mx-auto bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 text-center">
          <div className="text-lg font-extrabold text-slate-900">体質データがありません</div>
          <div className="text-sm text-slate-600 mt-2 font-bold">{data?.message || "先に体質チェックを完了してください。"}</div>
          <button onClick={() => router.push("/check")} className="mt-6 w-full rounded-xl bg-emerald-600 text-white font-extrabold py-3">
            体質チェックを始める
          </button>
        </div>
      </div>
    );
  }

  const prof = data?.profile || {};
  const ext = data?.external || {};
  const anomaly = ext?.anomaly || {};
  
  const influence = data?.influence || {};
  const forecast = data?.forecast || {};

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur border-b border-slate-100 px-4 py-3">
        <div className="max-w-[440px] mx-auto flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">未病レーダー</div>
            <div className="text-[11px] text-slate-500 font-extrabold">{new Date().toLocaleDateString("ja-JP")} の予報</div>
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="p-2 rounded-full bg-white border border-slate-200 shadow-sm active:scale-95 transition"
            aria-label="refresh"
          >
            <IconRefresh className={["w-5 h-5 text-slate-600", refreshing ? "animate-spin" : ""].join(" ")} />
          </button>
        </div>
      </div>

      <div className="max-w-[440px] mx-auto px-4 py-6 space-y-6">
        
        {/* Main: 影響の受けやすさ（体感メーター） */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          {/* 背景の装飾円 */}
          <div
            className={[
              "absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-15 pointer-events-none",
              (influence?.level ?? 1) === 2 ? "bg-rose-500" : (influence?.level ?? 1) === 0 ? "bg-emerald-400" : "bg-slate-300",
            ].join(" ")}
          />

          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-700">今日の影響の受けやすさ</div>
              <div className={["text-xs font-extrabold px-3 py-1 rounded-full", badgeClassByInfluence(influence?.level ?? 1)].join(" ")}>
                {influence?.label || influenceLabel(influence?.level ?? 1)}
              </div>
            </div>

            <div className="mt-4 text-2xl font-extrabold text-slate-900 leading-snug">
              {influence?.text || "—"}
            </div>

            {prof?.core_short ? (
              <div className="mt-2 text-[12px] text-slate-500 font-extrabold">
                体質：{prof.core_short}
                {Array.isArray(prof?.sub_shorts) && prof.sub_shorts.length > 0 ? ` ／弱点：${prof.sub_shorts.join("・")}` : ""}
              </div>
            ) : null}

            {/* 新・体感メーター（3連カード） */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              <SensationCard
                icon={IconThermo}
                title="寒暖差"
                unit="℃"
                anomaly={anomaly?.temp}
                factorKey="temp"
                influenceDebug={influence?.debug}
              />
              <SensationCard
                icon={IconDroplet}
                title="湿度感"
                unit="%"
                anomaly={anomaly?.humidity}
                factorKey="humidity"
                influenceDebug={influence?.debug}
              />
              <SensationCard
                icon={IconGauge}
                title="気圧感"
                unit="hPa"
                anomaly={anomaly?.pressure}
                factorKey="pressure"
                influenceDebug={influence?.debug}
              />
            </div>

            <div className="mt-4 text-[10px] text-slate-400 font-bold">
              ※ 判定：「今日1日の平均」×「最近2週間の平均」のズレで算出。
            </div>
          </div>
        </div>

        {/* Sub card: 今日いちばん気をつける変化 */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900">今日いちばん気をつける変化</div>
            <div className={["text-xs font-extrabold px-3 py-1 rounded-full", forecastBadgeClass(forecast?.level3 ?? 0)].join(" ")}>
              {forecast?.level_label || levelLabel(forecast?.level3 ?? 0)}
            </div>
          </div>

          <div className="mt-2 text-[13px] text-slate-600 font-extrabold leading-6">
            {forecast?.text || "—"}
          </div>

          {forecast?.peak?.range_text ? (
            <div className="mt-2 text-[12px] text-slate-500 font-extrabold">
              ピーク：{forecast.peak.range_text} ／ 主因：{forecast?.main_trigger_label || "—"}
            </div>
          ) : (
            <div className="mt-2 text-[12px] text-slate-500 font-extrabold">
              主因：{forecast?.main_trigger_label || "—"}
            </div>
          )}
        </div>

        {/* Timeline: 今日の波 */}
        <div>
          <div className="flex items-end justify-between px-1 mb-3">
            <div className="text-base font-extrabold text-slate-900">今日の波（1時間ごと）</div>
            <div className="text-[11px] text-slate-400 font-extrabold">横にスクロール</div>
          </div>

          <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-4">
            <div className="overflow-x-auto">
              <div className="flex gap-2 pb-2">
                {windows.map((w, i) => (
                  <TimelineItem
                    key={w.time || i}
                    w={w}
                    selected={i === selectedIdx}
                    onClick={() => setSelectedIdx(i)}
                  />
                ))}
              </div>
            </div>

            {/* selected detail */}
            <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">
                  {selected?.time ? `${new Date(selected.time).getHours()}:00` : "—"} の変化
                </div>
                <div className={["text-xs font-extrabold px-3 py-1 rounded-full", forecastBadgeClass(selected?.level3 ?? 0)].join(" ")}>
                  {levelLabel(selected?.level3 ?? 0)}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <DeltaPill label="気圧" value={selected?.deltas?.dp} unit="hPa" digits={1} />
                <DeltaPill label="気温" value={selected?.deltas?.dt} unit="℃" digits={1} />
                <DeltaPill label="湿度" value={selected?.deltas?.dh} unit="%" digits={0} />
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs font-extrabold text-slate-600">
                <span className={["inline-flex items-center gap-1", levelColor(selected?.level3 ?? 0)].join(" ")}>
                  {selected?.level3 === 0 ? <IconSparkle className="w-4 h-4" /> : (() => {
                    const I = triggerIcon(selected?.trigger);
                    return <I className="w-4 h-4" />;
                  })()}
                  {selected?.level3 === 0 ? "安定" : triggerJa(selected?.trigger)}
                </span>
                <span className="text-slate-400 font-extrabold">/</span>
                <span className="text-slate-500 font-extrabold">（± は直近3時間の変化の向き）</span>
              </div>

              {selected?.hint_text ? (
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 text-[12px] text-slate-700 font-extrabold leading-6">
                  {selected.hint_text}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={() => router.push("/history")}
            className="w-full bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-4 text-left"
          >
            <div className="text-sm font-extrabold text-slate-900">過去のコンディション履歴</div>
            <div className="text-[12px] text-slate-500 font-extrabold mt-1">振り返り・傾向の確認</div>
          </button>

          <button
            onClick={() => router.push("/check")}
            className="w-full py-3 text-sm font-extrabold text-slate-400 hover:text-emerald-600 transition"
          >
            体質チェックをやり直す
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-bold leading-5 pb-6">
          ※ 本機能は医療行為ではなくセルフケア支援です。強い症状がある場合は無理をせず、必要に応じて医療機関へ。
        </div>
      </div>
    </div>
  );
}
