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
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtSigned(v, digits = 1) {
  const n = safeNum(v);
  if (n == null) return "—";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(digits)}`;
}

function fmtRangeHours(range) {
  // accepts "23-4", "23–4", {start:23,end:4}, {startHour,endHour}
  if (!range) return "";
  if (typeof range === "string") {
    const s = range.replace("–", "-");
    const m = s.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
    if (m) return `${m[1]}–${m[2]}時`;
    return range;
  }
  const a = range.start ?? range.startHour;
  const b = range.end ?? range.endHour;
  if (Number.isFinite(Number(a)) && Number.isFinite(Number(b))) return `${a}–${b}時`;
  return "";
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

function coreCodeJa(coreCode) {
  // user-facing, short & concrete (陰陽/虚実は出さない)
  const map = {
    cold_low: "冷えやすく、引きずりやすい",
    cold_high: "冷えやすいが、立て直しは早め",
    heat_low: "熱がこもりやすく、引きずりやすい",
    heat_high: "熱がこもりやすいが、立て直しは早め",
    neutral_low: "偏りは少ないが、引きずりやすい",
    neutral_high: "偏りが少なく、立て直しも早め",
    mixed_low: "波が出やすく、引きずりやすい",
    mixed_high: "波は出るが、立て直しは早め",
  };
  return map[String(coreCode || "")] || "体質傾向あり";
}

function buildHeadline({ today, vulnerability }) {
  const lv = today?.level3 ?? 0;
  const main = triggerJa(today?.mainTrigger || "pressure");
  const peakTxt = today?.peak_range ? `（ピーク ${fmtRangeHours(today.peak_range)}）` : "";

  if (lv === 2) return `今日の予報：要警戒 ${peakTxt}`.trim();
  if (lv === 1) return `今日の予報：注意 ${peakTxt}`.trim();

  // 安定でも「影響受けやすい」ならワンフレーズだけ
  if ((vulnerability ?? 0) >= 2) return `今日の予報：安定（変化に影響を受けやすい傾向）`;
  return `今日の予報：安定`;
}

function buildSubheadline({ today, vulnerability }) {
  const lv = today?.level3 ?? 0;
  const main = triggerJa(today?.mainTrigger || "pressure");

  if (lv === 2) return `主因は「${main}」。無理は避けて、予定は余裕を。`;
  if (lv === 1) return `主因は「${main}」。詰めすぎず、ペース配分を。`;

  if ((vulnerability ?? 0) >= 2) return `今日は凪寄り。とはいえ、変化が出た時間は無理しないのが安全。`;
  return `今日は凪寄り。動くなら“安定の時間帯”を狙うとラク。`;
}

function buildBaselineText({ baseline, profile }) {
  // Prefer API-provided text if exists
  if (baseline?.text && typeof baseline.text === "string") return baseline.text;

  const diff = safeNum(baseline?.diff);
  const band = baseline?.band; // "low" | "normal" | "high"  (assumed)
  const baseVal = safeNum(baseline?.base);
  const cur = safeNum(baseline?.current);

  const defEx = profile?.computed?.axes?.def_ex_label_internal; // "deficient" | "excess" | "neutral"
  const cc = profile?.core_code || profile?.computed?.core_code;

  // If not enough data, minimal fallback
  if (diff == null && !band) {
    return "体質によって、気圧の「高め/低め」で負担の出方が変わります。";
  }

  // Phrase about today pressure position
  const pos =
    band === "high" ? "高め" : band === "low" ? "低め" : "平常域";
  const diffTxt = diff == null ? "" : `（基準比 ${fmtSigned(diff, 1)}hPa）`;

  // Personalization logic (no TCM terms)
  // - "excess" tends to feel worse when high pressure (tight/pressure)
  // - "deficient" tends to feel worse when low pressure (slack/low tone)
  // - neutral: small guidance only
  let why = "";
  if (defEx === "excess") {
    if (band === "high") why = "体がこわばりやすいタイプは、押される感じで重くなりがち。";
    else if (band === "low") why = "圧が抜ける日は、かえってラクに感じることも。";
    else why = "今日は極端ではないので、変化量（タイムライン）重視でOK。";
  } else if (defEx === "deficient") {
    if (band === "low") why = "力が抜けやすいタイプは、だるさ・むくみ感が出やすい日。";
    else if (band === "high") why = "外から支えられる感じで、ラクに感じることも。";
    else why = "今日は極端ではないので、変化量（タイムライン）重視でOK。";
  } else {
    // neutral
    if (band === "high") why = "高めの日は、張りやすい人は肩・首が固まりやすい。";
    else if (band === "low") why = "低めの日は、眠気・だるさが出る人も。";
    else why = "今日は平常域。変化量（タイムライン）を優先して見てOK。";
  }

  // include constitution hint if available
  const ccTxt = cc ? coreCodeJa(cc) : null;

  const a = `今日の気圧は ${pos}${diffTxt}。`;
  const b = ccTxt ? `あなたは「${ccTxt}」傾向。` : "";
  const c = why;

  // optional numeric context in small text: "現在 1021hPa / 基準 1024hPa"
  const d =
    cur != null && baseVal != null
      ? `（現在 ${cur.toFixed(1)}hPa / 基準 ${baseVal.toFixed(1)}hPa）`
      : "";

  return [a, b, c, d].filter(Boolean).join(" ");
}

function buildSelectedNudge({ selected, profile, vulnerability }) {
  if (!selected) return "";

  const lv = selected.level3 ?? 0;
  const trig = selected.trigger || "pressure";
  const trigJa = triggerJa(trig);

  const dp = safeNum(selected?.deltas?.dp);
  const dt = safeNum(selected?.deltas?.dt);
  const dh = safeNum(selected?.deltas?.dh);

  const v = Number(vulnerability ?? 0);

  // Quick “what to do” messaging, not medical advice, but practical.
  if (lv === 0) {
    return "この時間帯は変化が小さめ。動く予定はここに寄せるとラク。";
  }

  // Compose “why”
  let why = `この時間帯は「${trigJa}」が目立ちます。`;

  // Add signed delta hint (only for the trigger)
  if (trig === "pressure" && dp != null) why = `この時間帯は気圧が ${fmtSigned(dp, 1)}hPa 変化。`;
  if (trig === "temp" && dt != null) why = `この時間帯は気温が ${fmtSigned(dt, 1)}℃ 変化。`;
  if (trig === "humidity" && dh != null) why = `この時間帯は湿度が ${fmtSigned(dh, 0)}% 変化。`;

  // Personal vulnerability nuance
  const cc = profile?.core_code || profile?.computed?.core_code;
  const ccTxt = cc ? coreCodeJa(cc) : null;

  let who = "";
  if (ccTxt) who = `あなたは「${ccTxt}」傾向。`;

  let doTxt = "";
  if (lv === 2) {
    doTxt =
      v >= 2
        ? "予定は守りに寄せて、詰めないのが安全。"
        : "無理に押し切らず、余白を作るのが安全。";
  } else {
    // lv === 1
    doTxt =
      v >= 2
        ? "少し早めに休憩を入れると崩れにくい。"
        : "ペースを落として様子見が無難。";
  }

  return [why, who, doTxt].filter(Boolean).join(" ");
}

/** ---------- UI bits ---------- */
function MetricCard({ icon: Icon, label, value, unit, delta1h }) {
  const d = safeNum(delta1h);
  const up = d != null && d > 0;
  const down = d != null && d < 0;
  const Arrow = up ? IconArrowUp : down ? IconArrowDown : null;

  return (
    <div className="relative rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-slate-400" />
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
          {Arrow ? <Arrow className="w-4 h-4" /> : <span className="w-4 h-4 inline-block" />}
          <span>{fmtSigned(d, label === "湿度" ? 0 : 1)}</span>
          <span className="text-[10px] text-slate-300 font-extrabold ml-0.5">直近</span>
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <div className="text-2xl font-extrabold text-slate-900 leading-none">
          {value ?? "—"}
        </div>
        <div className="text-xs font-extrabold text-slate-500">{unit}</div>
      </div>
      <div className="text-[10px] text-slate-400 mt-1 font-bold">現在</div>
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
        "shrink-0 w-[74px] rounded-2xl border bg-white px-2 py-2 text-left transition",
        selected ? "border-slate-300 shadow-sm" : "border-slate-100 hover:border-slate-200",
      ].join(" ")}
    >
      <div className="text-[11px] font-extrabold text-slate-600">{time}</div>

      <div className="mt-2 flex items-center justify-center">
        <Icon className={["w-6 h-6", levelColor(lv)].join(" ")} />
      </div>

      <div className={["mt-2 text-[11px] font-extrabold", levelColor(lv)].join(" ")}>
        {levelLabel(lv)}
      </div>

      {/* 下線バー（背景ベタ塗りはしない） */}
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
  const n = safeNum(value);
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
        <div className="text-lg font-extrabold text-slate-900 leading-none">{fmtSigned(n, digits)}</div>
        <div className="text-[11px] font-extrabold text-slate-500">{unit}</div>
      </div>
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  const cls =
    tone === "rose"
      ? "bg-rose-50 text-rose-700"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-50 text-slate-700";
  return <span className={["text-xs font-extrabold px-3 py-1 rounded-full", cls].join(" ")}>{children}</span>;
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
          <div className="text-sm text-slate-600 mt-2 font-bold">未病レーダーはログイン後に利用できます。</div>
          <div className="mt-5 flex flex-col gap-3">
            <button onClick={() => router.push("/signup")} className="rounded-xl bg-emerald-600 text-white font-extrabold py-3">
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
          <div className="text-sm text-slate-600 mt-2 font-bold">{data?.message || "体質チェックを先に完了してください。"}</div>
          <button onClick={() => router.push("/check")} className="mt-6 w-full rounded-xl bg-emerald-600 text-white font-extrabold py-3">
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

  // optional profile / baseline (robust)
  const profile = data?.profile || data?.constitution || data?.profile_cache || null;
  const baseline = ext?.baseline || data?.baseline || null;

  const headline = buildHeadline({ today, vulnerability: data?.vulnerability });
  const subheadline = buildSubheadline({ today, vulnerability: data?.vulnerability });

  const badgeTone = today?.level3 === 2 ? "rose" : today?.level3 === 1 ? "amber" : "emerald";
  const selectedTone = selected?.level3 === 2 ? "rose" : selected?.level3 === 1 ? "amber" : "emerald";

  const baselineText = buildBaselineText({ baseline, profile });

  const selectedNudge = buildSelectedNudge({
    selected,
    profile,
    vulnerability: data?.vulnerability,
  });

  // For “ピーク” to avoid mismatch: show when API gives it. If absent, compute from windows.
  const peakRangeText = useMemo(() => {
    if (today?.peak_range) return fmtRangeHours(today.peak_range);

    // fallback compute rough peak span from windows: first~last at max level
    if (!windows.length) return "";
    const max = windows.reduce((m, w) => Math.max(m, w?.level3 ?? 0), 0);
    const idxs = windows.map((w, i) => ((w?.level3 ?? 0) === max ? i : -1)).filter((x) => x >= 0);
    if (!idxs.length || max <= 0) return "";
    const first = windows[idxs[0]];
    const last = windows[idxs[idxs.length - 1]];
    const a = first?.time ? new Date(first.time).getHours() : null;
    const b = last?.time ? new Date(last.time).getHours() : null;
    if (a == null || b == null) return "";
    return `${a}–${b}時`;
  }, [today?.peak_range, windows]);

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
                <Badge tone={badgeTone}>{levelLabel(today?.level3 ?? 0)}</Badge>
                {peakRangeText ? <span className="text-[11px] text-slate-400 font-extrabold">（ピーク {peakRangeText}）</span> : null}
              </div>
            </div>

            <div className="mt-4 text-2xl font-extrabold text-slate-900 leading-snug">{headline}</div>
            <div className="mt-2 text-sm text-slate-600 font-bold leading-6">{subheadline}</div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricCard icon={IconThermo} label="気温" value={cur?.temp ?? "—"} unit="℃" delta1h={d1?.dt} />
              <MetricCard icon={IconDroplet} label="湿度" value={cur?.humidity ?? "—"} unit="%" delta1h={d1?.dh} />
              <MetricCard icon={IconGauge} label="気圧" value={cur?.pressure ?? "—"} unit="hPa" delta1h={d1?.dp} />
            </div>

            {/* 昨日比（控えめに） */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-extrabold">
              <div>昨日比</div>
              <div className="flex gap-3">
                <span>気温 {fmtSigned(d24?.dt, 1)}℃</span>
                <span>湿度 {fmtSigned(d24?.dh, 0)}%</span>
                <span>気圧 {fmtSigned(d24?.dp, 1)}hPa</span>
              </div>
            </div>

            {/* Pressure baseline (personalized short text) */}
            <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">今日の気圧の土台</div>
                {baseline?.diff != null ? (
                  <div className="text-[11px] text-slate-500 font-extrabold">
                    {safeNum(baseline.diff) != null && safeNum(baseline.diff) < 0 ? "↓" : safeNum(baseline.diff) != null && safeNum(baseline.diff) > 0 ? "↑" : "—"}{" "}
                    {fmtSigned(baseline.diff, 1)}hPa
                  </div>
                ) : null}
              </div>

              <div className="mt-2 text-sm text-slate-700 font-bold leading-6">{baselineText}</div>

              {/* tiny helper line (only when baseline values exist) */}
              {(safeNum(baseline?.current) != null || safeNum(baseline?.base) != null) && (
                <div className="mt-2 text-[11px] text-slate-400 font-extrabold">
                  {safeNum(baseline?.base) != null ? `基準 ${Number(baseline.base).toFixed(1)}hPa` : ""}
                  {safeNum(baseline?.current) != null ? ` / 現在 ${Number(baseline.current).toFixed(1)}hPa` : ""}
                </div>
              )}
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
                  <TimelineItem key={w.time || i} w={w} selected={i === selectedIdx} onClick={() => setSelectedIdx(i)} />
                ))}
              </div>
            </div>

            {/* compact details (selected hour) */}
            <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">
                  {selected?.time ? `${new Date(selected.time).getHours()}:00` : "—"} の変化
                </div>
                <Badge tone={selectedTone}>{levelLabel(selected?.level3 ?? 0)}</Badge>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <DeltaPill label="気圧" value={selected?.deltas?.dp} unit="hPa" digits={1} />
                <DeltaPill label="気温" value={selected?.deltas?.dt} unit="℃" digits={1} />
                <DeltaPill label="湿度" value={selected?.deltas?.dh} unit="%" digits={0} />
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs font-extrabold text-slate-600">
                <span className={["inline-flex items-center gap-1", levelColor(selected?.level3 ?? 0)].join(" ")}>
                  {selected?.level3 === 0 ? (
                    <IconSparkle className="w-4 h-4" />
                  ) : (
                    (() => {
                      const I = triggerIcon(selected?.trigger);
                      return <I className="w-4 h-4" />;
                    })()
                  )}
                  {selected?.level3 === 0 ? "安定" : triggerJa(selected?.trigger)}
                </span>
                <span className="text-slate-300 font-extrabold">/</span>
                <span className="text-slate-500 font-extrabold">変化の向きは ± で表示</span>
              </div>

              {/* Personalized nudge */}
              <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3">
                <div className="text-[11px] text-slate-500 font-extrabold mb-1">ひとこと</div>
                <div className="text-sm text-slate-800 font-bold leading-6">{selectedNudge}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="pt-2 flex flex-col gap-3">
          <button onClick={() => router.push("/history")} className="w-full bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-4 text-left">
            <div className="text-sm font-extrabold text-slate-900">過去のコンディション履歴</div>
            <div className="text-[12px] text-slate-500 font-extrabold mt-1">振り返り・傾向の確認</div>
          </button>

          <button onClick={() => router.push("/check")} className="w-full py-3 text-sm font-extrabold text-slate-400 hover:text-emerald-600 transition">
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
