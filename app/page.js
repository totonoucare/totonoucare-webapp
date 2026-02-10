// app/radar/page.js
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

// 主因アイコン（TimeLine用）
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

function hourLabelFromISO(iso) {
  if (!iso) return "—";
  const m = String(iso).match(/T(\d{2}):/);
  if (m?.[1]) return `${Number(m[1])}:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getHours()}:00`;
}

function compactHeadlineFromReasonText(reasonText) {
  // APIのreason_textは「｜」区切りなので、最初の塊だけ抜いて見出しにする
  if (!reasonText || typeof reasonText !== "string") return null;
  return reasonText.split("｜")[0]?.trim() || null;
}

/** ---------- UI bits ---------- */
function MetricCard({ icon: Icon, label, value, unit, delta }) {
  const d = delta;
  const up = d != null && Number(d) > 0;
  const down = d != null && Number(d) < 0;
  const Arrow = up ? IconArrowUp : down ? IconArrowDown : null;

  return (
    <div className="relative rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-slate-400" />
          <div className="text-xs font-bold text-slate-600">{label}</div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          {Arrow ? <Arrow className="w-4 h-4" /> : <span className="w-4 h-4 inline-block" />}
          <span>{fmtSigned(d, label === "湿度" ? 0 : 1)}</span>
        </div>
      </div>

      <div className="mt-2 flex items-end gap-1">
        <div className="text-2xl font-extrabold text-slate-900">{value ?? "—"}</div>
        <div className="text-xs font-bold text-slate-500 pb-1">{unit}</div>
      </div>
      <div className="text-[10px] text-slate-400 mt-1">現在</div>
    </div>
  );
}

function TimelineItem({ w, selected, onClick }) {
  const Icon = w?.level3 === 0 ? IconSparkle : triggerIcon(w?.trigger);
  const time = hourLabelFromISO(w?.time);
  const lv = w?.level3 ?? 0;

  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 w-[72px] rounded-2xl border bg-white px-2 py-2 text-left transition",
        selected ? "border-slate-300 shadow-sm" : "border-slate-100 hover:border-slate-200",
      ].join(" ")}
    >
      <div className="text-[11px] font-bold text-slate-600">{time}</div>

      <div className="mt-2 flex items-center justify-center">
        <Icon className={["w-6 h-6", levelColor(lv)].join(" ")} />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className={["text-[11px] font-bold", levelColor(lv)].join(" ")}>
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

function DeltaPill({ label, value, unit, digits = 1 }) {
  const n = value == null ? null : Number(value);
  const up = n != null && n > 0;
  const down = n != null && n < 0;
  const Arrow = up ? IconArrowUp : down ? IconArrowDown : null;

  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-600">{label}</div>
        {Arrow ? <Arrow className="w-4 h-4 text-slate-400" /> : <span className="w-4 h-4 inline-block" />}
      </div>
      <div className="mt-1 flex items-end gap-1">
        <div className="text-lg font-extrabold text-slate-900">{fmtSigned(value, digits)}</div>
        <div className="text-[11px] font-bold text-slate-500 pb-0.5">{unit}</div>
      </div>
    </div>
  );
}

/** ---------- Page ---------- */
export default function RadarPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [data, setData] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // auth
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      setLoadingAuth(false);
    })();
    return () => {
      mounted = false;
    };
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

  const windows = useMemo(
    () => (Array.isArray(data?.time_windows) ? data.time_windows : []),
    [data]
  );
  const selected = windows[selectedIdx] || windows[0] || null;

  // 「現在」の矢印（最初のwindowのΔをメーターに流用）
  const dNow = windows[0]?.deltas || {};
  const dpNow = dNow?.dp ?? null;
  const dtNow = dNow?.dt ?? null;
  const dhNow = dNow?.dh ?? null;

  // states
  if (loadingAuth || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[440px] mx-auto space-y-5">
        <div className="h-6 w-40 bg-slate-200 rounded-full animate-pulse" />
        <div className="h-44 w-full bg-slate-200 rounded-[2rem] animate-pulse" />
        <div className="h-28 w-full bg-slate-200 rounded-[2rem] animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="max-w-[440px] w-full bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 text-center">
          <div className="text-lg font-extrabold text-slate-900">ログインが必要です</div>
          <div className="text-sm text-slate-600 mt-2">未病レーダーはログイン後に利用できます。</div>
          <div className="mt-5 flex flex-col gap-3">
            <button
              onClick={() => router.push("/signup")}
              className="rounded-xl bg-emerald-600 text-white font-bold py-3"
            >
              無料で登録・ログイン
            </button>
            <button
              onClick={() => router.push("/check")}
              className="rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3"
            >
              体質チェックへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // API：needs_profile = true を返す
  if (data?.needs_profile) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-10">
        <div className="max-w-[440px] mx-auto bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 text-center">
          <div className="text-lg font-extrabold text-slate-900">体質データがありません</div>
          <div className="text-sm text-slate-600 mt-2">
            {data?.message || "体質チェックを先に完了してください。"}
          </div>
          <button
            onClick={() => router.push("/check")}
            className="mt-6 w-full rounded-xl bg-emerald-600 text-white font-bold py-3"
          >
            体質チェックを始める
          </button>
        </div>
      </div>
    );
  }

  const ext = data?.external || {};
  const radar = data?.radar || {};
  const summary = data?.summary || {};

  const todayLv = summary?.level3 ?? radar?.level ?? 0;
  const peakText = summary?.peak?.range_text || null;

  const headlinePrimary =
    compactHeadlineFromReasonText(radar?.reason_text) || "今日の予報";
  const headlineSecondary = radar?.reason_text || null;

  const mainTrigger = summary?.main_trigger || summary?.mainTrigger || "pressure";

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur border-b border-slate-100 px-4 py-3">
        <div className="max-w-[440px] mx-auto flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">未病レーダー</div>
            <div className="text-[11px] text-slate-500 font-bold">
              {new Date().toLocaleDateString("ja-JP")} の予報
            </div>
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="p-2 rounded-full bg-white border border-slate-200 shadow-sm active:scale-95 transition"
            aria-label="refresh"
          >
            <IconRefresh
              className={[
                "w-5 h-5 text-slate-600",
                refreshing ? "animate-spin" : "",
              ].join(" ")}
            />
          </button>
        </div>
      </div>

      <div className="max-w-[440px] mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          <div
            className={[
              "absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-15 pointer-events-none",
              todayLv === 2 ? "bg-rose-500" : todayLv === 1 ? "bg-amber-400" : "bg-emerald-400",
            ].join(" ")}
          />

          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-700">今日の予報</div>
              <div
                className={[
                  "text-xs font-extrabold px-3 py-1 rounded-full",
                  todayLv === 2
                    ? "bg-rose-50 text-rose-700"
                    : todayLv === 1
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700",
                ].join(" ")}
              >
                {levelLabel(todayLv)}
                {peakText ? `（ピーク ${peakText}）` : ""}
              </div>
            </div>

            <div className="mt-4 text-2xl font-extrabold text-slate-900 leading-snug">
              {headlinePrimary}
            </div>

            {/* 2行目は“説明”として控えめ */}
            {headlineSecondary ? (
              <div className="mt-2 text-[12px] text-slate-500 font-bold leading-5">
                {headlineSecondary}
              </div>
            ) : null}

            {/* Current metrics */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricCard icon={IconThermo} label="気温" value={ext?.temp ?? "—"} unit="℃" delta={dtNow} />
              <MetricCard icon={IconDroplet} label="湿度" value={ext?.humidity ?? "—"} unit="%" delta={dhNow} />
              <MetricCard icon={IconGauge} label="気圧" value={ext?.pressure ?? "—"} unit="hPa" delta={dpNow} />
            </div>

            {/* 昨日比（控えめ） */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-bold">
              <div>昨日比</div>
              <div className="flex gap-3">
                <span>気温 {fmtSigned(ext?.d_temp_24h, 1)}℃</span>
                <span>湿度 {fmtSigned(ext?.d_humidity_24h, 0)}%</span>
                <span>気圧 {fmtSigned(ext?.d_pressure_24h, 1)}hPa</span>
              </div>
            </div>

            {/* 体質×ベース気圧の存在感（数値は出しすぎない） */}
            {Number.isFinite(Number(ext?.pressure_baseline)) ? (
              <div className="mt-2 text-[11px] text-slate-400 font-bold">
                基準気圧（目安）：{Number(ext.pressure_baseline).toFixed(1)} hPa
              </div>
            ) : null}
          </div>
        </div>

        {/* 24h timeline */}
        <div>
          <div className="flex items-end justify-between px-1 mb-3">
            <div className="text-base font-extrabold text-slate-900">1時間ごとの波</div>
            <div className="text-[11px] text-slate-400 font-bold">横にスクロール</div>
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

            {/* compact details (selected hour) */}
            <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">
                  {hourLabelFromISO(selected?.time)} の変化
                </div>
                <div
                  className={[
                    "text-xs font-extrabold px-3 py-1 rounded-full",
                    (selected?.level3 ?? 0) === 2
                      ? "bg-rose-50 text-rose-700"
                      : (selected?.level3 ?? 0) === 1
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700",
                  ].join(" ")}
                >
                  {levelLabel(selected?.level3 ?? 0)}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <DeltaPill label="気圧" value={selected?.deltas?.dp} unit="hPa" digits={1} />
                <DeltaPill label="気温" value={selected?.deltas?.dt} unit="℃" digits={1} />
                <DeltaPill label="湿度" value={selected?.deltas?.dh} unit="%" digits={0} />
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className={["inline-flex items-center gap-1", levelColor(selected?.level3 ?? 0)].join(" ")}>
                  {(selected?.level3 ?? 0) === 0 ? (
                    <IconSparkle className="w-4 h-4" />
                  ) : (() => {
                      const I = triggerIcon(selected?.trigger);
                      return <I className="w-4 h-4" />;
                    })()}
                  {(selected?.level3 ?? 0) === 0 ? "安定" : triggerJa(selected?.trigger)}
                </span>
                <span className="text-slate-400 font-bold">/</span>
                <span className="text-slate-500 font-bold">（± で変化の向き）</span>
              </div>

              {/* ベース気圧×体質（選択時間の情報があれば） */}
              {selected?.base?.reason ? (
                <div className="mt-3 text-[12px] text-slate-500 font-bold leading-5">
                  {selected.base.reason}
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
            <div className="text-[12px] text-slate-500 font-bold mt-1">振り返り・傾向の確認</div>
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
