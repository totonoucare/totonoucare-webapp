// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/** ---------- tiny icons (inline SVG) ---------- */
const IconRefresh = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 0 1-15.3 6.3L3 16" />
    <path d="M3 21v-5h5" />
    <path d="M3 12a9 9 0 0 1 15.3-6.3L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const IconSparkle = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l1.2 4.2L17 7.5l-3.8 1.3L12 13l-1.2-4.2L7 7.5l3.8-1.3L12 2Z" />
    <path d="M5 14l.7 2.4L8 17l-2.3.6L5 20l-.7-2.4L2 17l2.3-.6L5 14Z" />
  </svg>
);

const IconPressure = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12a8 8 0 1 0 16 0" />
    <path d="M12 4c2 2 2 6 0 8s-2 6 0 8" />
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

const IconArrowRight = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14" />
    <path d="M13 5l7 7-7 7" />
  </svg>
);

/** ---------- helpers ---------- */
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function hourFromISO(iso) {
  if (typeof iso !== "string") return null;
  const m = iso.match(/T(\d{2}):/);
  if (!m) return null;
  return String(Number(m[1]));
}

function fmtSigned(n, digits = 1) {
  const x = safeNum(n);
  if (x == null) return "—";
  const s = x >= 0 ? "+" : "";
  return `${s}${x.toFixed(digits)}`;
}

function symptomJa(code) {
  const map = {
    fatigue: "だるさ",
    sleep: "睡眠",
    mood: "気分",
    neck_shoulder: "首肩",
    low_back_pain: "腰",
    swelling: "むくみ",
    headache: "頭痛",
    dizziness: "めまい",
  };
  return map[code] || "不調";
}

function forecastBadgeClass(lv) {
  if (lv === 2) return "bg-rose-50 text-rose-700 border-rose-100";
  if (lv === 1) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-emerald-50 text-emerald-700 border-emerald-100";
}

function influenceBadgeClass(lv) {
  if (lv === 2) return "bg-rose-50 text-rose-700 border-rose-100";
  if (lv === 0) return "bg-sky-50 text-sky-700 border-sky-100";
  return "bg-slate-100 text-slate-700 border-slate-200";
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
  if (trigger === "temp") return IconThermo;
  if (trigger === "humidity") return IconDroplet;
  return IconPressure;
}

function triggerJa(trigger) {
  if (trigger === "temp") return "寒暖差";
  if (trigger === "humidity") return "湿度の揺れ";
  return "気圧の揺れ";
}

/** “体感”翻訳：平均との差(今日平均−14日平均)を言葉に寄せる */
function translateSensation(factorKey, anomaly) {
  const n = safeNum(anomaly);
  if (n == null) return "—";

  if (factorKey === "temp") {
    if (n >= 6) return "かなり暑め";
    if (n >= 2) return "やや暖";
    if (n <= -6) return "かなり寒め";
    if (n <= -2) return "やや冷";
    return "いつも通り";
  }
  if (factorKey === "humidity") {
    if (n >= 20) return "かなり多湿";
    if (n >= 8) return "やや潤";
    if (n <= -20) return "かなり乾燥";
    if (n <= -8) return "やや乾";
    return "いつも通り";
  }
  // pressure
  if (n >= 6) return "高圧寄り";
  if (n >= 2) return "やや高圧";
  if (n <= -6) return "低圧寄り";
  if (n <= -2) return "やや低圧";
  return "いつも通り";
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function SensationPill({ icon: Icon, title, factorKey, anomaly, constitution }) {
  const n = safeNum(anomaly);
  const word = translateSensation(factorKey, n);
  const abs = n == null ? 0 : Math.abs(n);

  // スケール（見た目用）：温度/気圧は 6、湿度は 20 を “強め” の上限に
  const maxScale = factorKey === "humidity" ? 20 : 6;
  const w = clamp01(abs / maxScale) * 100;

  // 体質による“負担方向”に一致してる時だけ、軽い警告トーン（やりすぎない）
  // constitution: { pressure_dir, temp_dir, humidity_dir } が来る想定（risk.jsのdebug）
  const dirKey = factorKey === "temp" ? "temp_dir" : factorKey === "humidity" ? "humidity_dir" : "pressure_dir";
  const burdenDir = constitution?.[dirKey] || "none";
  const isBurden =
    n != null &&
    ((burdenDir === "high" && n > 0) || (burdenDir === "low" && n < 0));

  const tone = isBurden
    ? { box: "bg-rose-50 border-rose-100", bar: "bg-rose-500", text: "text-rose-700" }
    : abs >= (factorKey === "humidity" ? 8 : 2)
      ? { box: "bg-slate-50 border-slate-200", bar: "bg-slate-400", text: "text-slate-800" }
      : { box: "bg-white border-slate-200", bar: "bg-slate-300", text: "text-slate-800" };

  const digits = factorKey === "humidity" ? 0 : 1;
  const suffix = factorKey === "temp" ? "℃相当" : factorKey === "humidity" ? "%相当" : "hPa相当";

  return (
    <div className={["rounded-2xl border px-4 py-3", tone.box].join(" ")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={["w-5 h-5", tone.text, "opacity-80"].join(" ")} />
          <div className="text-xs font-extrabold text-slate-600">{title}</div>
        </div>
        <div className="text-[11px] font-extrabold text-slate-400">
          {n == null ? "—" : `${fmtSigned(n, digits)} ${suffix}`}
        </div>
      </div>

      <div className={["mt-2 text-lg font-extrabold", tone.text].join(" ")}>{word}</div>

      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/60 overflow-hidden">
        <div className={["h-full rounded-full", tone.bar].join(" ")} style={{ width: `${w}%` }} />
      </div>

      {isBurden ? (
        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-600">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
          体質的に“負担方向”
        </div>
      ) : (
        <div className="mt-2 text-[10px] font-bold text-slate-400">（最近2週間平均との差）</div>
      )}
    </div>
  );
}

function TimelineItem({ w, selected, onClick }) {
  const lv = w?.level3 ?? 0;
  const Icon = lv === 0 ? IconSparkle : triggerIcon(w?.trigger);
  const h = hourFromISO(w?.time);
  const time = h != null ? `${h}:00` : "—";

  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 w-[76px] rounded-2xl border bg-white px-2 py-2 text-left transition",
        selected ? "border-slate-300 shadow-sm" : "border-slate-100 hover:border-slate-200",
      ].join(" ")}
    >
      <div className="text-[11px] font-extrabold text-slate-600">{time}</div>
      <div className="mt-2 flex items-center justify-center">
        <Icon className={["w-6 h-6", levelColor(lv)].join(" ")} />
      </div>
      <div className={["mt-2 text-[11px] font-extrabold", levelColor(lv)].join(" ")}>
        {w?.level_label ?? (lv === 2 ? "要警戒" : lv === 1 ? "注意" : "安定")}
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

/** ---------- page ---------- */
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

      const res = await fetch("/api/radar/today", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const payload = json?.data || null;
      setData(payload);
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

  const peakIndex = useMemo(() => {
    const start = data?.forecast?.peak?.start;
    const end = data?.forecast?.peak?.end;
    if (!start || !windows.length) return 0;

    // peak.start〜peak.end に含まれる最初のindex（無ければ start に最も近い）
    let best = 0;
    for (let i = 0; i < windows.length; i++) {
      const t = windows[i]?.time;
      if (typeof t !== "string") continue;
      if (end && t >= start && t <= end) return i;
      if (!end && t >= start) return i;
      best = i;
    }
    return best;
  }, [data, windows]);

  // 初期選択：ピークに寄せる（UX：最初に“見るべき所”を見せる）
  useEffect(() => {
    if (!windows.length) return;
    setSelectedIdx((prev) => (prev === 0 ? peakIndex : prev)); // 手動選択を邪魔しない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peakIndex, windows.length]);

  const selected = windows[selectedIdx] || windows[0] || null;

  // states
  if (loadingAuth || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[440px] mx-auto space-y-5">
        <div className="h-6 w-40 bg-slate-200 rounded-full animate-pulse" />
        <div className="h-52 w-full bg-slate-200 rounded-[2rem] animate-pulse" />
        <div className="h-44 w-full bg-slate-200 rounded-[2rem] animate-pulse" />
        <div className="h-64 w-full bg-slate-200 rounded-[2rem] animate-pulse" />
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
          <div className="text-sm text-slate-600 mt-2 font-bold">{data?.message || "体質チェックを先に完了してください。"}</div>
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

  const prof = data?.profile || {};
  const influence = data?.influence || {};
  const forecast = data?.forecast || {};
  const ext = data?.external || {};
  const anom = ext?.anomaly || {};
  const constitution = influence?.debug?.constitution || null;

  const dateLabel = data?.date
    ? String(data.date)
    : new Date().toLocaleDateString("ja-JP");

  const peakText = forecast?.peak?.range_text ? forecast.peak.range_text : null;
  const sf = prof?.symptom_focus ? symptomJa(prof.symptom_focus) : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur border-b border-slate-100 px-4 py-3">
        <div className="max-w-[440px] mx-auto flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">未病レーダー</div>
            <div className="text-[11px] text-slate-500 font-extrabold">{dateLabel} の予報</div>
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
        {/* 1) HERO: 今日どう？（結論→ピーク→主因） */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {sf ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700">
                    主訴：{sf}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700">
                    今日の体調予報
                  </span>
                )}
                {forecast?.main_trigger ? (
                  <span className="text-[11px] font-extrabold text-slate-400">
                    {triggerJa(forecast.main_trigger)}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className={["inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold", forecastBadgeClass(forecast?.level3 ?? 0)].join(" ")}>
                  {forecast?.level_label || "—"}
                </span>
                {peakText ? (
                  <span className="text-sm font-extrabold text-slate-700">
                    ピーク：<span className="text-slate-900">{peakText}</span>
                  </span>
                ) : (
                  <span className="text-sm font-extrabold text-slate-500">ピーク：—</span>
                )}
              </div>

              <div className="mt-3 text-[13px] font-extrabold text-slate-700 leading-6">
                {forecast?.text || "—"}
              </div>
            </div>

            <div className="shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                {(() => {
                  const I = triggerIcon(forecast?.main_trigger || "pressure");
                  return <I className={["w-7 h-7", levelColor(forecast?.level3 ?? 0)].join(" ")} />;
                })()}
              </div>
            </div>
          </div>

          {/* CTA row（“予報で終わらせない”） */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              onClick={() => router.push("/history")}
              className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3 text-left active:scale-[0.99] transition"
            >
              <div className="text-xs font-extrabold text-slate-900">今日の記録</div>
              <div className="text-[11px] font-bold text-slate-500 mt-1">30秒でOK</div>
            </button>
            <button
              onClick={() => router.push("/guide")}
              className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3 text-left active:scale-[0.99] transition"
            >
              <div className="text-xs font-extrabold text-slate-900">今日のケア</div>
              <div className="text-[11px] font-bold text-slate-500 mt-1">おすすめ</div>
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3 text-left active:scale-[0.99] transition"
            >
              <div className="text-xs font-extrabold text-slate-900">通知</div>
              <div className="text-[11px] font-bold text-slate-500 mt-1">準備中</div>
            </button>
          </div>
        </div>

        {/* 2) 影響の受けやすさ（“あなた専用”の納得） */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">今日の影響の受けやすさ</div>
              <div className="text-[11px] font-bold text-slate-500 mt-1">
                体質 × 最近2週間平均との差（“いつも”からのズレ）
              </div>
            </div>
            <span className={["inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold", influenceBadgeClass(influence?.level ?? 1)].join(" ")}>
              {influence?.label || "—"}
            </span>
          </div>

          <div className="mt-4 text-[15px] font-extrabold text-slate-900 leading-7">
            {influence?.text || "—"}
          </div>

          {prof?.core_short ? (
            <div className="mt-2 text-[12px] text-slate-500 font-extrabold">
              体質：{prof.core_short}
              {Array.isArray(prof?.sub_shorts) && prof.sub_shorts.length > 0 ? ` ／弱点：${prof.sub_shorts.join("・")}` : ""}
            </div>
          ) : null}

          {/* 体感ピル（物理値を主役にしない） */}
          <div className="mt-4 grid grid-cols-1 gap-2">
            <SensationPill
              icon={IconThermo}
              title="寒暖ストレス"
              factorKey="temp"
              anomaly={anom?.temp}
              constitution={constitution}
            />
            <SensationPill
              icon={IconDroplet}
              title="潤燥ストレス"
              factorKey="humidity"
              anomaly={anom?.humidity}
              constitution={constitution}
            />
            <SensationPill
              icon={IconPressure}
              title="圧ストレス"
              factorKey="pressure"
              anomaly={anom?.pressure}
              constitution={constitution}
            />
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer select-none text-[11px] font-extrabold text-slate-500">
              どうやって推定してる？（説明）
            </summary>
            <div className="mt-2 text-[11px] text-slate-500 font-bold leading-6">
              ・「今日の平均（気圧/気温/湿度）」と「最近2週間の平均」を比較し、体質（虚実/寒熱/津液傾向）で重みづけして“受けやすさ”を推定しています。<br />
              ・ここは“通知の騒がしさ”を増やさないため、時間ごとの警戒（下の波）とは独立に表示しています。
            </div>
          </details>
        </div>

        {/* 3) タイムライン（ピーク中心：最初からピークを見せる） */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-5">
          <div className="flex items-end justify-between">
            <div className="text-base font-extrabold text-slate-900">今日の波</div>
            <div className="text-[11px] text-slate-400 font-extrabold">ピーク付近を自動で表示</div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {windows.map((w, i) => (
                <TimelineItem
                  key={w?.time || i}
                  w={w}
                  selected={i === selectedIdx}
                  onClick={() => setSelectedIdx(i)}
                />
              ))}
            </div>
          </div>

          {/* selected detail */}
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold text-slate-900">
                {selected?.time ? `${hourFromISO(selected.time) ?? "—"}:00` : "—"} のポイント
              </div>
              <span className={["inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold", forecastBadgeClass(selected?.level3 ?? 0)].join(" ")}>
                {selected?.level3 === 2 ? "要警戒" : selected?.level3 === 1 ? "注意" : "安定"}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-[12px] font-extrabold text-slate-600">
              <span className={["inline-flex items-center gap-1", levelColor(selected?.level3 ?? 0)].join(" ")}>
                {(() => {
                  const I = (selected?.level3 ?? 0) === 0 ? IconSparkle : triggerIcon(selected?.trigger);
                  return <I className="w-4 h-4" />;
                })()}
                {(selected?.level3 ?? 0) === 0 ? "凪" : triggerJa(selected?.trigger)}
              </span>
              <span className="text-slate-400 font-extrabold">/</span>
              <span className="text-slate-500 font-extrabold">
                {peakText ? `今日ピーク：${peakText}` : "ピーク：—"}
              </span>
            </div>

            {selected?.hint_text ? (
              <div className="mt-3 rounded-xl bg-white border border-slate-100 px-3 py-3 text-[12px] text-slate-700 font-extrabold leading-6">
                {selected.hint_text}
              </div>
            ) : (
              <div className="mt-3 text-[12px] font-bold text-slate-500">
                大きな変化は少なめ。ペースを崩さずいけそうです。
              </div>
            )}

            <button
              onClick={() => {
                // 次のピークへジャンプ（あれば）
                const np = data?.forecast?.next_peak?.time;
                if (!np) return;
                const idx = windows.findIndex((w) => w?.time === np);
                if (idx >= 0) setSelectedIdx(idx);
              }}
              className="mt-3 inline-flex items-center gap-1 text-[12px] font-extrabold text-slate-600 hover:text-slate-900 transition"
            >
              次のピークへ <IconArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer nav */}
        <div className="pt-1 flex flex-col gap-3">
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
