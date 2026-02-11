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

// 主因アイコン
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
// 地層・土台用のアイコン
const IconLayers = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
    <path d="M12 2L2 7l10 5 10-5" />
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
function numOrNull(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function fmtSigned(v, digits = 1) {
  const n = numOrNull(v);
  if (n == null) return "—";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(digits)}`;
}

function fmtValue(v, digits = 1) {
  const n = numOrNull(v);
  if (n == null) return "—";
  return n.toFixed(digits);
}

function hourLabel(iso) {
  if (!iso || typeof iso !== "string") return "—";
  const m = iso.match(/T(\d{2}):/);
  if (!m) return "—";
  return `${Number(m[1])}:00`;
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

function buildFallbackHeadline(summary) {
  const lv = summary?.level3 ?? 0;
  const main = triggerJa(summary?.main_trigger || summary?.mainTrigger || "pressure");
  const peakText = summary?.peak?.range_text || summary?.peak || null;

  if (lv === 2)
    return `今日は「${main}」が強め。無理は避けて。${peakText ? `（ピーク ${peakText}）` : ""}`;
  if (lv === 1)
    return `今日は「${main}」が出やすい日。ペース配分を。${peakText ? `（ピーク ${peakText}）` : ""}`;
  return `今日は概ね安定。${peakText ? `（山があるなら ${peakText}）` : ""}`.trim();
}

function buildOneLinerForSelected({ w }) {
  if (!w || (w.level3 ?? 0) === 0) return null;

  const trig = w.trigger || "pressure";
  const ja = triggerJa(trig);
  const dp = numOrNull(w?.deltas?.dp);
  const dt = numOrNull(w?.deltas?.dt);
  const dh = numOrNull(w?.deltas?.dh);

  if (trig === "pressure") {
    const dir = dp == null ? null : dp < 0 ? "下がり気味" : "上がり気味";
    return `気圧の変化（${dir || "変化"}）が出やすい時間。集中タスクは後ろ倒しが無難。`;
  }
  if (trig === "temp") {
    const dir = dt == null ? null : dt < 0 ? "冷え込み側" : "上がり側";
    return `寒暖差（${dir || "変化"}）が引き金になりやすい時間。移動や屋外は調整を。`;
  }
  if (trig === "humidity") {
    const dir = dh == null ? null : dh < 0 ? "乾き側" : "湿り側";
    return `湿度の変化（${dir || "変化"}）が出やすい時間。無理に詰めず整えるのが安全。`;
  }
  return `${ja}が出やすい時間。余裕を持って。`;
}

/** ---------- UI bits ---------- */
// デザイン変更：カード背景を白ではなくSlate-50にして、少し沈ませる
function MetricCard({ icon: Icon, label, value, unit, deltaRecent, deltaDigits = 1 }) {
  const d = numOrNull(deltaRecent);
  const up = d != null && d > 0;
  const down = d != null && d < 0;
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
          <span>{fmtSigned(d, deltaDigits)}</span>
          <span className="text-[10px] font-bold text-slate-300">直近</span>
        </div>
      </div>

      <div className="mt-2 flex items-end gap-1">
        <div className="text-2xl font-extrabold text-slate-900">
          {label === "湿度" ? fmtValue(value, 0) : fmtValue(value, 1)}
        </div>
        <div className="text-xs font-bold text-slate-500 pb-1">{unit}</div>
      </div>
      {/* "現在"ラベルは冗長なので省略してスッキリさせる */}
    </div>
  );
}

function TimelineItem({ w, selected, onClick }) {
  const Icon = (w?.level3 ?? 0) === 0 ? IconSparkle : triggerIcon(w?.trigger);
  const lv = w?.level3 ?? 0;

  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 w-[72px] rounded-2xl border bg-white px-2 py-2 text-left transition",
        selected ? "border-slate-300 shadow-sm" : "border-slate-100 hover:border-slate-200",
      ].join(" ")}
    >
      <div className="text-[11px] font-bold text-slate-600">{hourLabel(w?.time)}</div>

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
  const n = numOrNull(value);
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

  const windows = useMemo(() => (Array.isArray(data?.time_windows) ? data.time_windows : []), [data]);
  const selected = windows[selectedIdx] || windows[0] || null;

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

  if (data && data?.needs_profile) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-10">
        <div className="max-w-[440px] mx-auto bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 text-center">
          <div className="text-lg font-extrabold text-slate-900">体質データがありません</div>
          <div className="text-sm text-slate-600 mt-2">{data?.message || "体質チェックを先に完了してください。"}</div>
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

  const summary = data?.summary || {};
  const radar = data?.radar || {};
  const ext = data?.external || {};
  const heroLevel = summary?.level3 ?? radar?.level ?? 0;

  const headline =
    (typeof radar?.reason_text === "string" && radar.reason_text.trim()) ||
    buildFallbackHeadline(summary);

  const recent = windows?.[0]?.deltas || {};
  const dpRecent = recent?.dp ?? null;
  const dtRecent = recent?.dt ?? null;
  const dhRecent = recent?.dh ?? null;

  // 気圧ベース (土台用)
  const base = windows?.[0]?.base || {};
  const anomaly = base?.anomaly ?? null;
  const baseReason = base?.reason || null;
  const baseState = base?.state || "unknown";

  const baseTitle =
    baseState === "high" ? "今日は気圧が高め（Deep）" :
    baseState === "low" ? "今日は気圧が低め（Shallow）" :
    baseState === "normal" ? "今日は気圧は平常域" :
    "気圧ベースを測定中";

  // 土台の説明文：平均との差を少し補足
  const baseSubtitle = `直近平均より ${fmtSigned(anomaly, 1)} hPa`;

  const selectedOneLiner = buildOneLinerForSelected({ w: selected });

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur border-b border-slate-100 px-4 py-3">
        <div className="max-w-[440px] mx-auto flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">未病レーダー</div>
            <div className="text-[11px] text-slate-500 font-bold">
              {data?.date ? `${data.date} の予報` : `${new Date().toLocaleDateString("ja-JP")} の予報`}
            </div>
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
        
        {/* --- Hero: 2層構造 (上部:変化 / 下部:土台) --- */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm flex flex-col">
          
          {/* 上層：空気（変化） */}
          <div className="relative p-6 pb-8">
            {/* 背景装飾 */}
            <div
              className={[
                "absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-15 pointer-events-none",
                heroLevel === 2 ? "bg-rose-500" : heroLevel === 1 ? "bg-amber-400" : "bg-emerald-400",
              ].join(" ")}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-700">今日の変化ストレス</div>
                <div
                  className={[
                    "text-xs font-extrabold px-3 py-1 rounded-full",
                    heroLevel === 2
                      ? "bg-rose-50 text-rose-700"
                      : heroLevel === 1
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700",
                  ].join(" ")}
                >
                  {levelLabel(heroLevel)}
                </div>
              </div>

              <div className="mt-4 text-2xl font-extrabold text-slate-900 leading-snug">
                {headline}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                <MetricCard
                  icon={IconThermo}
                  label="気温"
                  value={ext?.temp ?? null}
                  unit="℃"
                  deltaRecent={dtRecent}
                  deltaDigits={1}
                />
                <MetricCard
                  icon={IconDroplet}
                  label="湿度"
                  value={ext?.humidity ?? null}
                  unit="%"
                  deltaRecent={dhRecent}
                  deltaDigits={0}
                />
                <MetricCard
                  icon={IconGauge}
                  label="気圧"
                  value={ext?.pressure ?? null}
                  unit="hPa"
                  deltaRecent={dpRecent}
                  deltaDigits={1}
                />
              </div>
            </div>
          </div>

          {/* 下層：地面（気圧ベース） */}
          <div className="relative bg-slate-50 border-t border-slate-100 px-6 py-5">
            {/* 視覚的な「地面」のメタファー */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <IconLayers className="w-5 h-5 text-slate-400" />
                <div className="text-xs font-extrabold text-slate-500">気圧環境（土台）</div>
              </div>
              <div className="text-[10px] font-bold text-slate-400">{baseSubtitle}</div>
            </div>

            <div className="mt-1">
              <div className={`text-sm font-extrabold ${
                baseState === "high" ? "text-rose-700" : baseState === "low" ? "text-sky-700" : "text-slate-700"
              }`}>
                {baseTitle}
              </div>
              <div className="mt-1 text-xs font-bold text-slate-600 leading-relaxed">
                {baseReason || "データ取得中..."}
              </div>
            </div>
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

            {/* details */}
            <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">
                  {hourLabel(selected?.time)} の変化
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
                <span className="text-slate-500 font-bold">（変化の向きは ± で表示）</span>
              </div>

              {selectedOneLiner ? (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <div className="text-xs font-extrabold text-slate-600">ひとこと</div>
                  <div className="mt-2 text-[13px] font-extrabold text-slate-900 leading-6">
                    {selectedOneLiner}
                  </div>
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
