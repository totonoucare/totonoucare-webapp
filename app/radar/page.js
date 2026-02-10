// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCoreLabel, getSubLabels } from "@/lib/diagnosis/v2/labels";

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

function fmtNum(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toFixed(digits);
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

function fmtHour(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return "—";
  return `${n}:00`;
}

function parseHourFromISO(iso) {
  try {
    const d = new Date(iso);
    return d.getHours();
  } catch {
    return null;
  }
}

function formatPeakRange(peak) {
  // peak: { start:"...", end:"..." } or { startHour, endHour } etc.
  if (!peak) return null;

  const sh =
    peak.startHour != null ? Number(peak.startHour)
      : peak.start ? parseHourFromISO(peak.start)
      : null;

  const ehRaw =
    peak.endHour != null ? Number(peak.endHour)
      : peak.end ? parseHourFromISO(peak.end)
      : null;

  if (!Number.isFinite(sh) || !Number.isFinite(ehRaw)) return null;

  // end は「次の時間」扱いが多いので、表示は ehRaw をそのまま使っても良いが、
  // 23-4 のような跨ぎを自然に見せたいので、ここはそのまま。
  const eh = ehRaw;

  return `${sh}–${eh}時`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pickCoreCodeFromData(data) {
  // どこに入ってても拾えるようにする
  const direct = data?.profile?.core_code || data?.constitution?.core_code || data?.core_code;
  const computed = data?.profile?.computed?.core_code || data?.profile?.computed?.computed?.core_code;
  return direct || computed || null;
}

function pickSubLabelsFromData(data) {
  const direct = data?.profile?.sub_labels || data?.constitution?.sub_labels;
  const computed = data?.profile?.computed?.sub_labels || data?.profile?.computed?.computed?.sub_labels;
  const v = direct || computed;
  return Array.isArray(v) ? v : [];
}

/** ---------- Copy generation ---------- */
function buildHeadline({ today }) {
  const lv = today?.level3 ?? 0;
  const main = triggerJa(today?.mainTrigger || "pressure");

  if (lv === 2) return `今日の予報：要警戒（主因：${main}）`;
  if (lv === 1) return `今日の予報：注意（主因：${main}）`;
  return `今日の予報：安定`;
}

function baselineStatusJa(status) {
  if (status === "high") return "高め";
  if (status === "low") return "低め";
  return "平常域";
}

function defExToneJa(defExLabel) {
  // 内部語を出さずにニュアンスだけ
  if (defExLabel === "excess") return "詰まり・重さ寄り";
  if (defExLabel === "deficient") return "土台不足寄り";
  return "バランス寄り";
}

function pressureBaselineNudge({ baseStatus, core, defExLabel }) {
  // “自分ごと化”の短文（断定は避ける）
  const c = core?.title ? `あなたは「${core.title}」。` : "あなたの体質傾向。";
  const status = baselineStatusJa(baseStatus);

  // ここは仮説として短く、過剰に医学っぽくしない
  if (baseStatus === "low") {
    return `${c}今日は気圧が${status}。だるさやペース低下が出やすいので、詰めすぎず余白を残すのが安全。`;
  }
  if (baseStatus === "high") {
    const tone = defExToneJa(defExLabel);
    return `${c}今日は気圧が${status}。体が「${tone}」寄りだと、張りや重さが出やすい日。力を抜く時間を確保して。`;
  }
  return `${c}今日は気圧は${status}。負荷は“変化の山”で上がるので、山の時間はペース配分を。`;
}

function hourPersonalLine({ w, core }) {
  const lv = w?.level3 ?? 0;
  const trig = w?.trigger || "pressure";
  const main = triggerJa(trig);

  if (lv === 0) {
    return "この時間は変化が小さめ。動かすならここが安全枠。";
  }

  // 方向（±）を一言で
  const dp = w?.deltas?.dp;
  const dt = w?.deltas?.dt;
  const dh = w?.deltas?.dh;

  const dir =
    trig === "pressure"
      ? (dp == null ? "" : Number(dp) < 0 ? "（下がり気味）" : Number(dp) > 0 ? "（上がり気味）" : "")
      : trig === "temp"
        ? (dt == null ? "" : Number(dt) < 0 ? "（下がり気味）" : Number(dt) > 0 ? "（上がり気味）" : "")
        : (dh == null ? "" : Number(dh) < 0 ? "（下がり気味）" : Number(dh) > 0 ? "（上がり気味）" : "");

  const c = core?.short ? `あなたは「${core.short}」。` : "";

  if (lv === 2) {
    return `${c}${main}${dir}が強め。予定は守るより“削る”判断が安全。`;
  }
  return `${c}${main}${dir}が出やすい時間。集中タスクは後ろ倒しが無難。`;
}

function mainDeltaForWindow(w) {
  const trig = w?.trigger || "pressure";
  if (trig === "temp") return { v: w?.deltas?.dt, unit: "℃", digits: 1 };
  if (trig === "humidity") return { v: w?.deltas?.dh, unit: "%", digits: 0 };
  return { v: w?.deltas?.dp, unit: "hPa", digits: 1 };
}

/** ---------- UI bits ---------- */
function MetricCard({ icon: Icon, label, value, unit, delta1h }) {
  const d = delta1h;
  const up = d != null && Number(d) > 0;
  const down = d != null && Number(d) < 0;
  const Arrow = up ? IconArrowUp : down ? IconArrowDown : null;

  return (
    <div className="relative rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-slate-400" />
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold tabular-nums">
          {Arrow ? <Arrow className="w-4 h-4" /> : <span className="w-4 h-4 inline-block" />}
          <span>{fmtSigned(d, label === "湿度" ? 0 : 1)}</span>
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <div className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none">{value ?? "—"}</div>
        <div className="text-xs font-extrabold text-slate-500">{unit}</div>
      </div>
      <div className="text-[10px] text-slate-400 mt-1 font-bold">現在</div>
    </div>
  );
}

function TimelineItem({ w, selected, onClick }) {
  const lv = w?.level3 ?? 0;
  const Icon = lv === 0 ? IconSparkle : triggerIcon(w?.trigger);
  const time = w?.time ? fmtHour(new Date(w.time).getHours()) : "—";

  const md = mainDeltaForWindow(w);
  const deltaText = lv === 0 ? "" : `${fmtSigned(md.v, md.digits)}${md.unit}`;

  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 w-[78px] rounded-2xl border bg-white px-2 py-2 text-left transition",
        selected ? "border-slate-300 shadow-sm" : "border-slate-100 hover:border-slate-200",
      ].join(" ")}
    >
      <div className="text-[11px] font-extrabold text-slate-600 tabular-nums">{time}</div>

      <div className="mt-2 flex items-center justify-center">
        <Icon className={["w-6 h-6", levelColor(lv)].join(" ")} />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className={["text-[11px] font-extrabold", levelColor(lv)].join(" ")}>
          {levelLabel(lv)}
        </div>
      </div>

      <div className="mt-1 text-[10px] text-slate-400 font-bold tabular-nums h-4">
        {deltaText}
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
        <div className="text-xs font-extrabold text-slate-600">{label}</div>
        {Arrow ? <Arrow className="w-4 h-4 text-slate-400" /> : <span className="w-4 h-4 inline-block" />}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-lg font-extrabold text-slate-900 tabular-nums">{fmtSigned(value, digits)}</div>
        <div className="text-[11px] font-extrabold text-slate-500">{unit}</div>
      </div>
    </div>
  );
}

function Pill({ children, variant = "safe" }) {
  const map = {
    safe: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
    slate: "bg-slate-50 text-slate-700",
  };
  return (
    <span className={["inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold", map[variant] || map.slate].join(" ")}>
      {children}
    </span>
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
              className="rounded-xl bg-emerald-600 text-white font-extrabold py-3"
            >
              無料で登録・ログイン
            </button>
            <button
              onClick={() => router.push("/check")}
              className="rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-extrabold py-3"
            >
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
          <div className="text-sm text-slate-600 mt-2">{data?.message || "体質チェックを先に完了してください。"}</div>
          <button
            onClick={() => router.push("/check")}
            className="mt-6 w-full rounded-xl bg-emerald-600 text-white font-extrabold py-3"
          >
            体質チェックを始める
          </button>
        </div>
      </div>
    );
  }

  const today = data?.today || {};
  const ext = data?.external || {};
  const cur = ext?.current || {};
  const d1 = ext?.delta1h || {};
  const d24 = ext?.delta24h || {};

  // profile / labels (固定辞書で表示)
  const coreCode = pickCoreCodeFromData(data);
  const core = coreCode ? getCoreLabel(coreCode) : null;

  const subCodes = pickSubLabelsFromData(data);
  const subs = getSubLabels(subCodes);

  // peak range display
  const peakRange = formatPeakRange(today?.peak_range) || formatPeakRange(data?.peak_range) || null;

  // baseline pressure info (route.js が返している想定に合わせて超防御)
  const pb = data?.pressure_baseline || data?.baseline_pressure || {};
  const baseStatus = pb?.status || pb?.level || pb?.base_status || "normal"; // low/high/normal
  const diffHpa = pb?.diff_hpa ?? pb?.diff ?? pb?.delta ?? null;

  // 内部軸（表示は“翻訳”する）
  const defExLabel = data?.profile?.computed?.axes?.def_ex_label_internal
    || data?.profile?.computed?.computed?.axes?.def_ex_label_internal
    || data?.profile?.computed?.axes?.def_ex_label
    || null;

  const headline = buildHeadline({ today });

  const pillVariant = (lv) => (lv === 2 ? "danger" : lv === 1 ? "warning" : "safe");

  const baselineText = pressureBaselineNudge({
    baseStatus,
    core,
    defExLabel,
  });

  const selectedLine = hourPersonalLine({ w: selected, core });

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
        {/* Hero: 今日の変化ストレス */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          <div
            className={[
              "absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-15 pointer-events-none",
              today?.level3 === 2 ? "bg-rose-500" : today?.level3 === 1 ? "bg-amber-400" : "bg-emerald-400",
            ].join(" ")}
          />

          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-700">今日の変化ストレス</div>
              <div className="flex items-center gap-2">
                <Pill variant={pillVariant(today?.level3 ?? 0)}>
                  {levelLabel(today?.level3 ?? 0)}
                  {peakRange ? `（ピーク ${peakRange}）` : ""}
                </Pill>
              </div>
            </div>

            <div className="mt-4 text-2xl font-extrabold text-slate-900 leading-snug">
              {headline}
              {peakRange ? `（ピーク ${peakRange}）` : ""}
            </div>

            {/* 体質を“自分ごと”として見せる */}
            {core?.title ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-extrabold text-slate-500">あなたの体質</div>
                <Pill variant="slate">{core.title}</Pill>
                {subs?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {subs.slice(0, 2).map((s, idx) => (
                      <Pill key={idx} variant="slate">{s.short}</Pill>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricCard icon={IconThermo} label="気温" value={cur?.temp ?? "—"} unit="℃" delta1h={d1?.dt} />
              <MetricCard icon={IconDroplet} label="湿度" value={cur?.humidity ?? "—"} unit="%" delta1h={d1?.dh} />
              <MetricCard icon={IconGauge} label="気圧" value={cur?.pressure ?? "—"} unit="hPa" delta1h={d1?.dp} />
            </div>

            {/* 昨日比（控えめ） */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-extrabold">
              <div>昨日比</div>
              <div className="flex gap-3 tabular-nums">
                <span>気温 {fmtSigned(d24?.dt, 1)}℃</span>
                <span>湿度 {fmtSigned(d24?.dh, 0)}%</span>
                <span>気圧 {fmtSigned(d24?.dp, 1)}hPa</span>
              </div>
            </div>

            {/* 気圧のベース（納得感：体質×ベース） */}
            <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">気圧のベース</div>
                  <div className="text-[11px] text-slate-500 font-extrabold mt-1">
                    今日の気圧は「{baselineStatusJa(baseStatus)}」
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-400 font-extrabold">平均との差</div>
                  <div className="text-sm font-extrabold text-slate-700 tabular-nums">
                    {diffHpa == null ? "—" : `${fmtSigned(diffHpa, 1)} hPa`}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-sm text-slate-700 font-bold leading-6">
                {baselineText}
              </div>

              <div className="mt-2 text-[11px] text-slate-400 font-extrabold">
                ※「平均」は直近データの平均との差（地域・季節で上下します）
              </div>
            </div>
          </div>
        </div>

        {/* 24h timeline */}
        <div>
          <div className="flex items-end justify-between px-1 mb-3">
            <div className="text-base font-extrabold text-slate-900">1時間ごとの波</div>
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

            {/* compact details (selected hour) */}
            <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">
                  {selected?.time ? `${new Date(selected.time).getHours()}:00` : "—"} の変化
                </div>
                <Pill variant={pillVariant(selected?.level3 ?? 0)}>
                  {levelLabel(selected?.level3 ?? 0)}
                </Pill>
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
                <span className="text-slate-500 font-extrabold">（変化の向きは ± で表示）</span>
              </div>

              {/* ★ 自動短文（注意以上だけ） */}
              {(selected?.level3 ?? 0) >= 1 ? (
                <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3">
                  <div className="text-[11px] text-slate-500 font-extrabold">ひとこと</div>
                  <div className="mt-1 text-sm text-slate-800 font-extrabold leading-6">
                    {selectedLine}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-500 font-bold">
                  {selectedLine}
                </div>
              )}
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

        <div className="text-[11px] text-slate-400 font-extrabold leading-5 pb-6">
          ※ 本機能は医療行為ではなくセルフケア支援です。強い症状がある場合は無理をせず、必要に応じて医療機関へ。
        </div>
      </div>
    </div>
  );
}
