// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/** Icons */
const IconRefresh = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 0 1-15.3 6.3L3 16" />
    <path d="M3 21v-5h5" />
    <path d="M3 12a9 9 0 0 1 15.3-6.3L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const IconInfo = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const IconSparkle = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l1.2 4.2L17 7.5l-3.8 1.3L12 13l-1.2-4.2L7 7.5l3.8-1.3L12 2Z" />
    <path d="M5 14l.7 2.4L8 17l-2.3.6L5 20l-.7-2.4L2 17l2.3-.6L5 14Z" />
  </svg>
);

function pct(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function confidenceJa(c) {
  if (c === "high") return "高";
  if (c === "mid") return "中";
  return "低";
}

function badgeClass(level) {
  // intensityベースの色付け（単純）
  if (level >= 8) return "bg-rose-50 text-rose-700";
  if (level >= 4) return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function triggerJa(t) {
  if (t === "temp") return "気温の揺れ";
  if (t === "humidity") return "湿度の揺れ";
  return "気圧の揺れ";
}

function levelLabel3(lv) {
  return ["安定", "注意", "要警戒"][lv] ?? "—";
}

function levelColor(lv) {
  if (lv === 2) return "text-rose-600";
  if (lv === 1) return "text-amber-600";
  return "text-emerald-600";
}

function barClass(lv) {
  if (lv === 2) return "bg-rose-500";
  if (lv === 1) return "bg-amber-400";
  return "bg-emerald-500";
}

function hourLabel(iso) {
  if (!iso || typeof iso !== "string") return "—";
  const d = new Date(iso);
  return `${d.getHours()}:00`;
}

function TimelineItem({ it, selected, onClick }) {
  const lv = it?.level3 ?? 0;
  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 w-[76px] rounded-2xl border bg-white px-2 py-2 text-left transition",
        selected ? "border-slate-300 shadow-sm" : "border-slate-100 hover:border-slate-200",
      ].join(" ")}
    >
      <div className="text-[11px] font-extrabold text-slate-600">{hourLabel(it?.time)}</div>

      <div className="mt-2 flex items-center justify-center">
        <IconSparkle className={["w-6 h-6", levelColor(lv)].join(" ")} />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className={["text-[11px] font-extrabold", levelColor(lv)].join(" ")}>
          {levelLabel3(lv)}
        </div>
      </div>

      <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={["h-full rounded-full", barClass(lv)].join(" ")}
          style={{ width: lv === 2 ? "100%" : lv === 1 ? "66%" : "33%" }}
        />
      </div>
    </button>
  );
}

export default function RadarPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [data, setData] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showWhy, setShowWhy] = useState(false);

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

      // 初期選択はピーク開始へ（UX）
      const peakStartIdx = payload?.hero?.peak?.start_idx;
      if (Number.isFinite(Number(peakStartIdx)) && Number(peakStartIdx) >= 0) {
        setSelectedIdx(Number(peakStartIdx));
      } else {
        setSelectedIdx(0);
      }
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

  const timeline = useMemo(() => (Array.isArray(data?.timeline) ? data.timeline : []), [data]);
  const selected = timeline[selectedIdx] || timeline[0] || null;

  // loading states
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
  const hero = data?.hero || {};
  const peak = hero?.peak || {};

  const peakText = peak?.range_text ? peak.range_text : "—";
  const intensity = Number(hero?.intensity ?? 0);
  const conf = hero?.confidence || "low";
  const mainTrig = hero?.main_trigger || "pressure";

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur border-b border-slate-100 px-4 py-3">
        <div className="max-w-[440px] mx-auto flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">未病レーダー</div>
            <div className="text-[11px] text-slate-500 font-extrabold">
              {new Date().toLocaleDateString("ja-JP")} の予報
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
        {/* HERO（結論） */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12px] text-slate-500 font-extrabold">
                {prof?.symptom_label ? `主訴：${prof.symptom_label}` : "今日の予報"}
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900 leading-tight">
                強度 {hero?.intensity ?? "—"}/10
              </div>
              <div className="mt-1 text-[13px] text-slate-600 font-extrabold">
                発症確率 {pct(hero?.prob)}
              </div>
            </div>

            <div className={["shrink-0 text-xs font-extrabold px-3 py-1 rounded-full", badgeClass(intensity)].join(" ")}>
              信頼度 {confidenceJa(conf)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
              <div className="text-[11px] text-slate-500 font-extrabold">ピーク帯</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{peakText}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
              <div className="text-[11px] text-slate-500 font-extrabold">主因</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{triggerJa(mainTrig)}</div>
            </div>
          </div>

          <div className="mt-4 text-[13px] text-slate-700 font-extrabold leading-6">
            {hero?.one_liner || "—"}
          </div>

          {/* why (fold) */}
          <button
            onClick={() => setShowWhy((v) => !v)}
            className="mt-4 inline-flex items-center gap-2 text-[12px] font-extrabold text-slate-500 hover:text-slate-700"
          >
            <IconInfo className="w-4 h-4" />
            なぜこう予測した？
          </button>

          {showWhy ? (
            <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-4 text-[12px] text-slate-700 font-extrabold leading-6">
              {data?.explain?.why_short || "—"}
              <div className="mt-2 text-[11px] text-slate-400 font-bold">
                ※ 詳細は /api/radar/today/explain（開発者用）
              </div>
            </div>
          ) : null}
        </div>

        {/* 体質（labels.js の title をそのまま） */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-5">
          <div className="text-sm font-extrabold text-slate-900">あなたの体質</div>
          <div className="mt-2 text-[13px] text-slate-700 font-extrabold leading-6">
            {prof?.core_title ? prof.core_title : "—"}
          </div>
          {Array.isArray(prof?.sub_titles) && prof.sub_titles.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {prof.sub_titles.slice(0, 4).map((t, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[12px] font-extrabold text-slate-700">
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-[12px] text-slate-500 font-extrabold">弱点ラベルなし</div>
          )}
        </div>

        {/* Timeline（ピーク中心の導線） */}
        <div>
          <div className="flex items-end justify-between px-1 mb-3">
            <div className="text-base font-extrabold text-slate-900">今日の波（1時間ごと）</div>
            <div className="text-[11px] text-slate-400 font-extrabold">ピーク開始を初期選択</div>
          </div>

          <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-4">
            <div className="overflow-x-auto">
              <div className="flex gap-2 pb-2">
                {timeline.map((it, i) => (
                  <TimelineItem
                    key={it?.time || i}
                    it={it}
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
                  {selected?.time ? `${hourLabel(selected.time)} のリスク` : "—"}
                </div>
                <div className={["text-xs font-extrabold px-3 py-1 rounded-full", badgeClass(Math.round((selected?.risk ?? 0) * 2))].join(" ")}>
                  {levelLabel3(selected?.level3 ?? 0)}
                </div>
              </div>

              <div className="mt-2 text-[13px] text-slate-600 font-extrabold">
                主因：{triggerJa(selected?.main_trigger || "pressure")}
                <span className="text-slate-400 font-extrabold"> ／ </span>
                リスク値：{selected?.risk ?? "—"}
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
