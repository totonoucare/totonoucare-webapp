// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/** Icons (inline SVG) */
const IconRefresh = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 0 1-15.3 6.3L3 16" />
    <path d="M3 21v-5h5" />
    <path d="M3 12a9 9 0 0 1 15.3-6.3L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const IconBolt = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z" />
  </svg>
);

const IconInfo = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" />
    <path d="M12 16v-5" />
    <path d="M12 8h.01" />
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

function triggerIcon(trigger) {
  if (trigger === "temp") return IconThermo;
  if (trigger === "humidity") return IconDroplet;
  return IconPressure;
}

function confidenceLabelJa(c) {
  if (c === "high") return "高";
  if (c === "mid") return "中";
  return "低";
}

function badgeClassByLevel(lv) {
  // lv: 0..2 (安定/注意/要警戒)
  if (lv === 2) return "bg-rose-50 text-rose-700 border-rose-100";
  if (lv === 1) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-emerald-50 text-emerald-700 border-emerald-100";
}

function levelLabel(lv) {
  return ["安定", "注意", "要警戒"][lv] ?? "—";
}

function computeLevelFromProbIntensity(prob, intensity) {
  // UIのバッジをheroから決める（timelineと整合するよう“強め”で）
  // intensity >=7 or prob>=0.70 => 要警戒
  // intensity >=4 or prob>=0.45 => 注意
  if ((intensity ?? 0) >= 7 || (prob ?? 0) >= 0.7) return 2;
  if ((intensity ?? 0) >= 4 || (prob ?? 0) >= 0.45) return 1;
  return 0;
}

function pickInitialSelectedIdxFromPeak(timeline, hero) {
  const items = Array.isArray(timeline) ? timeline : [];
  if (!items.length) return 0;
  const s = hero?.peak?.start_idx ?? -1;
  const e = hero?.peak?.end_idx ?? -1;
  if (s >= 0 && e >= s) return Math.floor((s + e) / 2);
  // fallback: max risk
  let best = 0;
  let bestR = -1;
  for (let i = 0; i < items.length; i++) {
    const r = Number(items[i]?.risk ?? 0);
    if (r > bestR) {
      bestR = r;
      best = i;
    }
  }
  return best;
}

/** Timeline chip */
function TimelineChip({ it, selected, onClick }) {
  const time = it?.time ? `${new Date(it.time).getHours()}:00` : "—";
  const lv = it?.level3 ?? 0;
  const Icon = triggerIcon(it?.trigger);

  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 w-[76px] rounded-2xl border px-2 py-2 text-left transition bg-white",
        selected ? "border-slate-300 shadow-sm" : "border-slate-100 hover:border-slate-200",
      ].join(" ")}
      aria-label={`hour-${time}`}
    >
      <div className="text-[11px] font-extrabold text-slate-600">{time}</div>
      <div className="mt-2 flex items-center justify-center">
        <Icon className={["w-6 h-6", lv === 2 ? "text-rose-600" : lv === 1 ? "text-amber-600" : "text-emerald-600"].join(" ")} />
      </div>
      <div className={["mt-2 text-[11px] font-extrabold", lv === 2 ? "text-rose-700" : lv === 1 ? "text-amber-700" : "text-emerald-700"].join(" ")}>
        {levelLabel(lv)}
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={[
            "h-full rounded-full",
            lv === 2 ? "bg-rose-500" : lv === 1 ? "bg-amber-400" : "bg-emerald-500",
          ].join(" ")}
          style={{ width: lv === 2 ? "100%" : lv === 1 ? "66%" : "33%" }}
        />
      </div>
    </button>
  );
}

/** Collapsible detail */
function Disclosure({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-3"
      >
        <div className="flex items-center gap-2">
          <IconInfo className="w-4 h-4 text-slate-400" />
          <div className="text-[12px] font-extrabold text-slate-700">{title}</div>
        </div>
        <div className="text-[11px] font-extrabold text-slate-400">{open ? "閉じる" : "開く"}</div>
      </button>
      {open ? (
        <div className="mt-2 rounded-2xl bg-white border border-slate-100 p-4 text-[12px] text-slate-700 font-bold leading-6">
          {children}
        </div>
      ) : null}
    </div>
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

      const tl = Array.isArray(payload?.timeline) ? payload.timeline : [];
      const idx = pickInitialSelectedIdxFromPeak(tl, payload?.hero);
      setSelectedIdx(idx);
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

  if (loadingAuth || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8 max-w-[440px] mx-auto space-y-5">
        <div className="h-6 w-40 bg-slate-200 rounded-full animate-pulse" />
        <div className="h-44 w-full bg-slate-200 rounded-[2rem] animate-pulse" />
        <div className="h-44 w-full bg-slate-200 rounded-[2rem] animate-pulse" />
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

  const focus = data?.focus || {};
  const prof = data?.profile || {};
  const hero = data?.hero || {};
  const tl = useMemo(() => (Array.isArray(data?.timeline) ? data.timeline : []), [data]);
  const selected = tl[selectedIdx] || tl[0] || null;

  const probPct = Math.round((hero?.prob ?? 0) * 100);
  const intensity = hero?.intensity ?? 0;
  const heroLv = computeLevelFromProbIntensity(hero?.prob ?? 0, intensity);

  const TriggerIcon = triggerIcon(hero?.main_trigger);
  const conf = hero?.confidence || "low";

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
        {/* HERO */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
          <div
            className={[
              "absolute -top-12 -right-12 w-52 h-52 rounded-full opacity-15 pointer-events-none",
              heroLv === 2 ? "bg-rose-500" : heroLv === 1 ? "bg-amber-400" : "bg-emerald-400",
            ].join(" ")}
          />

          <div className="relative">
            {/* focus + badge */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-100 px-3 py-1">
                  <IconBolt className="w-4 h-4 text-slate-400" />
                  <div className="text-[12px] font-extrabold text-slate-700">{focus?.label_ja || "不調"}の予報</div>
                </div>
                {prof?.core_short ? (
                  <div className="mt-2 text-[11px] text-slate-500 font-extrabold">
                    体質：{prof.core_short}
                    {Array.isArray(prof?.sub_shorts) && prof.sub_shorts.length ? ` ／弱点：${prof.sub_shorts.join("・")}` : ""}
                  </div>
                ) : null}
              </div>

              <div className={["inline-flex items-center gap-2 border px-3 py-1 rounded-full text-[12px] font-extrabold", badgeClassByLevel(heroLv)].join(" ")}>
                {levelLabel(heroLv)}
              </div>
            </div>

            {/* numbers */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="text-[11px] font-extrabold text-slate-500">発症確率（今日）</div>
                <div className="mt-2 text-4xl font-extrabold text-slate-900 leading-none">{probPct}%</div>
                <div className="mt-2 text-[11px] text-slate-400 font-extrabold">目安（Phase1）</div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="text-[11px] font-extrabold text-slate-500">強度予測（今日）</div>
                <div className="mt-2 flex items-end gap-2">
                  <div className="text-4xl font-extrabold text-slate-900 leading-none">{intensity}</div>
                  <div className="text-[13px] font-extrabold text-slate-500 pb-1">/10</div>
                </div>
                <div className="mt-2 text-[11px] text-slate-400 font-extrabold">0が軽い / 10が強い</div>
              </div>
            </div>

            {/* peak + trigger + confidence */}
            <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-extrabold text-slate-600">ピーク帯</div>
                <div className="text-[12px] font-extrabold text-slate-500">
                  信頼度 <span className="text-slate-900">{confidenceLabelJa(conf)}</span>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="text-2xl font-extrabold text-slate-900">
                  {hero?.peak?.range_text || "—"}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-100 px-3 py-1">
                  <TriggerIcon className="w-4 h-4 text-slate-500" />
                  <div className="text-[12px] font-extrabold text-slate-700">
                    {hero?.main_trigger === "temp" ? "気温" : hero?.main_trigger === "humidity" ? "湿度" : "気圧"}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[12px] text-slate-600 font-extrabold leading-6">
                {hero?.one_liner || "—"}
              </div>
            </div>

            {/* explanation collapsed */}
            <Disclosure title="なぜこう予測した？（短い説明）">
              <div className="text-[12px] font-extrabold text-slate-700 leading-6">
                {data?.explain?.why_short || "—"}
              </div>

              {data?.debug ? (
                <div className="mt-3 text-[11px] text-slate-400 font-bold leading-5">
                  ※ debug: baselineDays={data.debug.baselineDays}, coverage={Math.round((data.debug.coverage || 0) * 100)}%
                </div>
              ) : null}
            </Disclosure>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-5">
          <div className="flex items-end justify-between">
            <div className="text-base font-extrabold text-slate-900">今日の波（時間帯）</div>
            <div className="text-[11px] text-slate-400 font-extrabold">ピークを中心に表示</div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {tl.map((it, i) => (
                <TimelineChip key={it?.time || i} it={it} selected={i === selectedIdx} onClick={() => setSelectedIdx(i)} />
              ))}
            </div>
          </div>

          {/* selected details */}
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">
                {selected?.time ? `${new Date(selected.time).getHours()}:00` : "—"} の予測
              </div>
              <div className={["text-xs font-extrabold px-3 py-1 rounded-full border", badgeClassByLevel(selected?.level3 ?? 0)].join(" ")}>
                {levelLabel(selected?.level3 ?? 0)}
              </div>
            </div>

            {selected?.hint_text ? (
              <div className="mt-3 rounded-xl bg-white border border-slate-100 px-3 py-3 text-[12px] text-slate-700 font-extrabold leading-6">
                {selected.hint_text}
              </div>
            ) : (
              <div className="mt-3 text-[12px] text-slate-500 font-extrabold">
                安定寄り。大きな変化イベントは検出されていません。
              </div>
            )}

            {/* tiny detail (optional) */}
            <Disclosure title="この時間の内訳（開発者向け）">
              <div className="text-[12px] text-slate-700 font-bold leading-6">
                risk: {selected?.risk ?? "—"} / trigger: {selected?.trigger || "—"} / parts:{" "}
                p={selected?.parts?.p ?? 0}, t={selected?.parts?.t ?? 0}, h={selected?.parts?.h ?? 0}
              </div>
            </Disclosure>
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
