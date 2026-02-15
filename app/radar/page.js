"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/** ---------- Icons (inline SVG / minimal & safe) ---------- */
const Svg = ({ className = "", children, viewBox = "0 0 24 24" }) => (
  <svg
    className={className}
    viewBox={viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const IconRefresh = ({ className = "" }) => (
  <Svg className={className}>
    <path
      d="M20 12a8 8 0 1 1-2.34-5.66"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M20 4v6h-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconThermo = ({ className = "" }) => (
  <Svg className={className}>
    <path
      d="M10 14.5a2 2 0 1 0 4 0V5a2 2 0 0 0-4 0v9.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M12 17v3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

const IconDroplet = ({ className = "" }) => (
  <Svg className={className}>
    <path
      d="M12 2s6 6.3 6 12a6 6 0 0 1-12 0c0-5.7 6-12 6-12Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconGauge = ({ className = "" }) => (
  <Svg className={className}>
    <path
      d="M4 13a8 8 0 0 1 16 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 13l4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M4 13v7h16v-7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </Svg>
);

// 主因アイコン（タイムライン）
const IconPressure = ({ className = "" }) => (
  <Svg className={className}>
    <path
      d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 7v5l3 2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconTemp = ({ className = "" }) => <IconThermo className={className} />;
const IconHum = ({ className = "" }) => <IconDroplet className={className} />;

const IconSparkle = ({ className = "" }) => (
  <Svg className={className}>
    <path
      d="M12 2l1.4 5.2L18 9l-4.6 1.8L12 16l-1.4-5.2L6 9l4.6-1.8L12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconArrowUp = ({ className = "" }) => (
  <Svg className={className}>
    <path
      d="M12 19V5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7 10l5-5 5 5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconArrowDown = ({ className = "" }) => (
  <Svg className={className}>
    <path
      d="M12 5v14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7 14l5 5 5-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
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

/** 負担方向かどうかの判定（タグ表示用） */
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
    dir = c.temp_dir;
    if (dir === "high" && n > 0) label = "暑さ負担";
    if (dir === "low" && n < 0) label = "冷え負担";
  } else if (factorKey === "humidity") {
    dir = c.humidity_dir;
    if (dir === "high" && n > 0) label = "湿気負担";
    if (dir === "low" && n < 0) label = "乾燥負担";
  }

  return { isBurden: !!label, label };
}

/** 体感翻訳：物理的なズレを「言葉」にする */
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
    if (n >= 1.0) return "高圧";
    if (n <= -4.0) return "超低圧";
    if (n <= -1.0) return "低圧";
    return "平圧";
  }
  return "—";
}

/** ---------- UI Components ---------- */
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
  const { isBurden, label: burdenLabel } = checkBurdenDirection(
    factorKey,
    influenceDebug,
    n
  );

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

  const maxScale = factorKey === "humidity" ? 20 : 4;
  const percent = Math.min(Math.abs(n) / maxScale, 1.0) * 100;

  return (
    <div className={`${bgColor} ${borderColor} border rounded-2xl p-4`}>
      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-600">
        <Icon className="w-5 h-5" />
        <span>{title}</span>
      </div>

      <div className={`mt-2 ${textColor} flex items-baseline gap-2`}>
        <div className="text-3xl font-extrabold">{sensationWord}</div>
        <div className="text-sm font-bold opacity-80">
          {fmtSigned(n, factorKey === "humidity" ? 0 : 1)}
          {unit}
        </div>
      </div>

      <div className="mt-3">
        <div className={`h-2 w-full rounded-full ${barBg} overflow-hidden`}>
          <div
            className={`h-2 ${barColor} rounded-full`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-2 h-5">
          {isBurden ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-700">
              {burdenLabel}
            </span>
          ) : null}
        </div>
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
      type="button"
      onClick={onClick}
      className={[
        "min-w-[92px] px-3 py-3 rounded-2xl border text-left transition",
        selected
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-100 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-slate-700">{time}</div>
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
      <div
        className={[
          "mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold",
          forecastBadgeClass(lv),
        ].join(" ")}
      >
        {levelLabel(lv)}
      </div>
    </button>
  );
}

/** ---------- Peak index helper ---------- */
function computePeakIndex(timeWindows = []) {
  if (!Array.isArray(timeWindows) || timeWindows.length === 0) return 0;

  // まずは最大level3（=2が優先、なければ1、なければ0）
  let maxLv = 0;
  for (const w of timeWindows) {
    const lv = Number(w?.level3 ?? 0);
    if (Number.isFinite(lv)) maxLv = Math.max(maxLv, lv);
  }

  // その最大レベルの最初の要素をピークにする（UX的に「まず見る場所」）
  const idx = timeWindows.findIndex((w) => Number(w?.level3 ?? 0) === maxLv);
  return idx >= 0 ? idx : 0;
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

      const tw = Array.isArray(payload?.time_windows) ? payload.time_windows : [];
      setSelectedIdx(computePeakIndex(tw));
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

  // Loading / Auth States
  if (loadingAuth || (loading && !data)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-slate-500 font-bold">読み込み中…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-xl font-extrabold text-slate-900">
            ログインが必要です
          </div>
          <div className="mt-2 text-slate-600 font-bold">
            未病レーダーはログイン後に利用できます。
          </div>

          <div className="mt-6 grid gap-3">
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
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-xl font-extrabold text-slate-900">
            体質データがありません
          </div>
          <div className="mt-2 text-slate-600 font-bold">
            {data?.message || "先に体質チェックを完了してください。"}
          </div>
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
  const ext = data?.external || {};
  const anomaly = ext?.anomaly || {};
  const influence = data?.influence || {};
  const influenceDebug = data?.influence_debug || data?.debug || data?.influence; // あり得る名前を吸収
  const forecast = data?.forecast || {};

  // 主訴（データ構造はまだ固まってなさそうなので、複数候補を吸収）
  const complaint =
    prof?.chief_complaint ||
    prof?.main_complaint ||
    prof?.complaint ||
    (Array.isArray(prof?.complaints) ? prof.complaints.join("・") : null) ||
    null;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-extrabold text-slate-900">
            未病レーダー
          </div>
          <div className="mt-1 text-slate-500 font-bold text-sm">
            {new Date().toLocaleDateString("ja-JP")} の予報
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className={[
            "inline-flex items-center gap-2 px-3 py-2 rounded-xl border font-extrabold text-sm",
            refreshing
              ? "border-slate-100 bg-slate-50 text-slate-400"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          ].join(" ")}
          title="更新"
        >
          <IconRefresh className="w-5 h-5" />
          更新
        </button>
      </div>

      {/* ---------- Hero: 今日の予報（結論ファースト） ---------- */}
      <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {complaint ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">
                主訴：{complaint}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">
                主訴：未設定
              </span>
            )}

            <span
              className={[
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold",
                forecastBadgeClass(forecast?.level3 ?? 0),
              ].join(" ")}
            >
              {forecast?.level_label || levelLabel(forecast?.level3 ?? 0)}
            </span>
          </div>

          {/* ピークを一番目立たせる */}
          {forecast?.peak?.range_text ? (
            <div className="text-right">
              <div className="text-xs font-extrabold text-slate-500">
                ピーク時間
              </div>
              <div className="text-lg font-extrabold text-slate-900">
                {forecast.peak.range_text}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="text-3xl font-extrabold leading-tight text-slate-900">
            {forecast?.text || "—"}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-sm font-extrabold text-slate-700">
              <span className={levelColor(forecast?.level3 ?? 0)}>■</span>
              主因：{forecast?.main_trigger_label || "—"}
            </span>

            {typeof anomaly?.pressure !== "undefined" ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-sm font-extrabold text-slate-700">
                気圧 {fmtSigned(anomaly?.pressure, 1)}hPa
              </span>
            ) : null}
            {typeof anomaly?.temp !== "undefined" ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-sm font-extrabold text-slate-700">
                気温 {fmtSigned(anomaly?.temp, 1)}℃
              </span>
            ) : null}
            {typeof anomaly?.humidity !== "undefined" ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-sm font-extrabold text-slate-700">
                湿度 {fmtSigned(anomaly?.humidity, 0)}%
              </span>
            ) : null}
          </div>
        </div>

        {/* ---------- CTA（行動導線） ---------- */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 px-3 py-3 text-left"
          >
            <div className="text-sm font-extrabold text-slate-900">
              今日の記録
            </div>
            <div className="mt-1 text-xs font-bold text-slate-500">
              30秒で入力
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/guide")}
            className="rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 px-3 py-3 text-left"
          >
            <div className="text-sm font-extrabold text-slate-900">
              今日のケア
            </div>
            <div className="mt-1 text-xs font-bold text-slate-500">
              すぐできる
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/history")}
            className="rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 px-3 py-3 text-left"
          >
            <div className="text-sm font-extrabold text-slate-900">
              振り返り
            </div>
            <div className="mt-1 text-xs font-bold text-slate-500">
              傾向を見る
            </div>
          </button>
        </div>
      </div>

      {/* ---------- Timeline: 今日の波（ピークに初期フォーカス） ---------- */}
      <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              今日の波（1時間ごと）
            </div>
            <div className="mt-1 text-sm font-bold text-slate-500">
              まずはピーク周辺を確認
            </div>
          </div>
          <div className="text-xs font-extrabold text-slate-400">
            横スクロール
          </div>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {windows.map((w, i) => (
            <TimelineItem
              key={`${w?.time || i}`}
              w={w}
              selected={i === selectedIdx}
              onClick={() => setSelectedIdx(i)}
            />
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-slate-500">
                {selected?.time ? `${new Date(selected.time).getHours()}:00` : "—"}
                の変化
              </div>

              <div className="mt-1 flex items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold",
                    forecastBadgeClass(selected?.level3 ?? 0),
                  ].join(" ")}
                >
                  {levelLabel(selected?.level3 ?? 0)}
                </span>

                <span className="text-sm font-extrabold text-slate-700">
                  {selected?.level3 === 0 ? "安定" : triggerJa(selected?.trigger)}
                </span>
              </div>

              {selected?.hint_text ? (
                <div className="mt-2 text-sm font-bold text-slate-600">
                  {selected.hint_text}
                </div>
              ) : (
                <div className="mt-2 text-sm font-bold text-slate-500">
                  （± は直近3時間の変化の向き）
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div
                className={[
                  "w-2 h-14 rounded-full",
                  levelBarClass(selected?.level3 ?? 0),
                ].join(" ")}
              />
              <div className="text-xs font-extrabold text-slate-400">
                リスク
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- 影響の受けやすさ（体質×外因）を下段へ ---------- */}
      <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold text-slate-900">
            今日の影響の受けやすさ
          </div>
          <span
            className={[
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold",
              badgeClassByInfluence(influence?.level ?? 1),
            ].join(" ")}
          >
            {influence?.label || influenceLabel(influence?.level ?? 1)}
          </span>
        </div>

        <div className="mt-2 text-slate-600 font-bold">
          {influence?.text || "—"}
        </div>

        {prof?.core_short ? (
          <div className="mt-3 text-sm font-bold text-slate-500">
            体質：{prof.core_short}
            {Array.isArray(prof?.sub_shorts) && prof.sub_shorts.length > 0
              ? ` ／弱点：${prof.sub_shorts.join("・")}`
              : ""}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SensationCard
            icon={IconPressure}
            title="気圧"
            unit="hPa"
            anomaly={anomaly?.pressure}
            factorKey="pressure"
            influenceDebug={influenceDebug}
          />
          <SensationCard
            icon={IconThermo}
            title="気温"
            unit="℃"
            anomaly={anomaly?.temp}
            factorKey="temp"
            influenceDebug={influenceDebug}
          />
          <SensationCard
            icon={IconDroplet}
            title="湿度"
            unit="%"
            anomaly={anomaly?.humidity}
            factorKey="humidity"
            influenceDebug={influenceDebug}
          />
        </div>

        {/* モデル説明は折りたたみ */}
        <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <summary className="cursor-pointer text-sm font-extrabold text-slate-600">
            判定ロジック（タップで表示）
          </summary>
          <div className="mt-2 text-sm font-bold text-slate-600 leading-relaxed">
            判定は「今日1日の平均」と「最近2週間の平均」のズレを基準にし、体質（内因）の受けやすさで調整しています。
            <br />
            ※ 本機能は医療行為ではなくセルフケア支援です。
          </div>
        </details>
      </div>

      {/* Nav（最下段） */}
      <div className="mt-6 grid gap-3">
        <button
          onClick={() => router.push("/history")}
          className="w-full bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-4 text-left hover:bg-slate-50 transition"
        >
          <div className="text-lg font-extrabold text-slate-900">
            過去のコンディション履歴
          </div>
          <div className="mt-1 text-sm font-bold text-slate-500">
            振り返り・傾向の確認
          </div>
        </button>

        <button
          onClick={() => router.push("/check")}
          className="w-full py-3 text-sm font-extrabold text-slate-400 hover:text-emerald-600 transition"
        >
          体質チェックをやり直す
        </button>

        <div className="text-xs font-bold text-slate-400 leading-relaxed">
          ※ 本機能は医療行為ではなくセルフケア支援です。強い症状がある場合は無理をせず、必要に応じて医療機関へ。
        </div>
      </div>
    </div>
  );
}
