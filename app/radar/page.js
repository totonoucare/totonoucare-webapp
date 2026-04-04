// app/radar/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import ReviewFormSheet from "@/components/records/ReviewFormSheet";
import {
  IconCompass,
  IconMemo,
  IconRadar,
  IconRipple,
  IconBowl,
} from "@/components/illust/icons/result";
import { WeatherIcon } from "@/components/illust/icons/weather";
import {
  actionTagLabel,
  conditionLabel,
  preventLabel,
  signalBadgeClass as reviewSignalBadgeClass,
  signalLabel as reviewSignalLabel,
  triggerLabel as reviewTriggerLabel,
} from "@/components/records/reviewConfig";
import {
  RADAR_LOCATION_PRESETS,
  flattenRadarLocationPresets,
} from "@/lib/radar_v1/locationPresets";
import {
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
  SYMPTOM_LABELS,
} from "@/lib/diagnosis/v2/labels";

/* -----------------------------
 * UI Components (Refined)
 * ---------------------------- */
function SubItemCard({ title, icon, children, tone = "slate", onClick }) {
  const toneClasses = {
    slate: "bg-slate-50/50 ring-slate-100",
    amber: "bg-amber-50/40 ring-amber-100/50",
    mint: "bg-[color-mix(in_srgb,var(--mint),white_90%)] ring-[var(--ring)]",
  };

  return (
    <div 
      onClick={onClick}
      className={[
        "relative rounded-[24px] p-5 ring-1 ring-inset transition-all",
        toneClasses[tone] || toneClasses.slate,
        onClick ? "hover:bg-slate-100 cursor-pointer active:scale-[0.99]" : ""
      ].join(" ")}
    >
      {title && (
        <div className="flex items-center gap-2.5 mb-4">
          {icon && <div className="text-slate-400">{icon}</div>}
          <div className="text-[14px] font-black tracking-tight text-slate-900">{title}</div>
        </div>
      )}
      {children}
    </div>
  );
}

function SegmentedTabs({ tabs, value, onChange }) {
  return (
    <div className="flex rounded-full bg-slate-200/50 p-1 ring-1 ring-inset ring-slate-200/50">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              "flex-1 h-[34px] rounded-full text-[13px] font-black tracking-tight transition-all duration-200",
              active
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* -----------------------------
 * Helper Functions
 * ---------------------------- */
function safeArray(v) { return Array.isArray(v) ? v : []; }

function formatTargetDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`;
}

function getJstTodayTomorrow() {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  });
  const parts = dtf.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));
  const d = new Date(`${today}T00:00:00+09:00`);
  d.setDate(d.getDate() + 1);
  const tomorrow = d.toISOString().split("T")[0];
  return { today, tomorrow, hour };
}

function signalPanelClass(signal) {
  if (signal === 2) return "bg-gradient-to-br from-rose-50 to-[#fff1f2] ring-rose-200 text-rose-900";
  if (signal === 1) return "bg-gradient-to-br from-amber-50 to-[#fffbeb] ring-amber-200 text-amber-900";
  return "bg-gradient-to-br from-emerald-50 to-[#ecfdf5] ring-emerald-200 text-emerald-900";
}

function getCompatTriggerLabel(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "気圧低下";
  if (mainTrigger === "pressure" && triggerDir === "up") return "気圧上昇";
  if (mainTrigger === "temp" && triggerDir === "down") return "冷え";
  if (mainTrigger === "temp" && triggerDir === "up") return "暑さ";
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿度";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

/* -----------------------------
 * Main Page
 * ---------------------------- */
export default function RadarPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState("");
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [tab, setTab] = useState("forecast");
  const [dateMode, setDateMode] = useState("today");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [reviewEditorOpen, setReviewEditorOpen] = useState(false);
  const [todayReview, setTodayReview] = useState(null);
  const [todayReviewForecast, setTodayReviewForecast] = useState(null);

  const requestSeqRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoadingAuth(false);
    })();
  }, []);

  async function fetchForecast() {
    if (!session) return;
    try {
      setLoading(true);
      const { today, tomorrow } = getJstTodayTomorrow();
      const targetDate = dateMode === "today" ? today : tomorrow;
      const token = session.access_token;
      const res = await fetch(`/api/radar/v1/forecast?date=${targetDate}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "予報の取得に失敗");
      setBundle(json);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { fetchForecast(); }, [session, dateMode]);

  const forecast = bundle?.forecast || null;
  const carePlan = bundle?.care_plan || null;
  const tsuboPoints = safeArray(carePlan?.night_tsubo_set?.points);
  const food = carePlan?.tomorrow_food_context || {};

  // アイコン用のキー判定
  const triggerKey = useMemo(() => {
    if (!forecast) return "";
    const { main_trigger: t, trigger_dir: d } = forecast;
    if (t === "pressure" && d === "down") return "pressure_down";
    if (t === "pressure" && d === "up") return "pressure_up";
    if (t === "temp" && d === "down") return "cold";
    if (t === "temp" && d === "up") return "heat";
    if (t === "humidity" && d === "up") return "damp";
    return "dry";
  }, [forecast]);

  if (loadingAuth || loading) {
    return <AppShell title="体調予報"><div className="h-64 animate-pulse rounded-[32px] bg-slate-100" /></AppShell>;
  }

  return (
    <AppShell title="体調予報" subtitle={formatTargetDate(bundle?.target_date)}>
      {/* メインタブ */}
      <div className="sticky top-[60px] z-20 bg-app/90 backdrop-blur py-2 mb-2">
        <SegmentedTabs
          tabs={[{ key: "forecast", label: "予報・対策" }, { key: "record", label: "記録" }]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "forecast" ? (
        <div className="space-y-6">
          {/* サブタブ */}
          <div className="mx-auto w-[60%]">
            <SegmentedTabs
              tabs={[{ key: "today", label: "今日" }, { key: "tomorrow", label: "明日" }]}
              value={dateMode}
              onChange={setDateMode}
            />
          </div>

          {/* 1. 予報 Module */}
          <Module>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm">
                   <IconRadar className="h-5 w-5" />
                </div>
                <div className="text-[14px] font-black tracking-tight text-slate-900">
                  {dateMode === "today" ? "今日" : "明日"}の崩れやすさ
                </div>
              </div>

              {/* スコアパネル */}
              <div className={["rounded-[24px] p-5 ring-1 ring-inset shadow-sm", signalPanelClass(forecast.signal)].join(" ")}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/60 text-[13px] font-black shadow-sm ring-1 ring-black/5">
                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                      {forecast.signal_label || (forecast.signal === 2 ? "警戒" : "注意")}
                    </span>
                    <div className="mt-6 flex items-end gap-2">
                      <span className="text-[44px] font-black tracking-tighter leading-none">{forecast.score_0_10}</span>
                      <span className="pb-1.5 text-[15px] font-black opacity-40">/ 10</span>
                    </div>
                  </div>
                  {/* お悩み表示 */}
                  <div className="shrink-0 rounded-[18px] bg-white/60 backdrop-blur-md px-4 py-3 text-center ring-1 ring-black/5">
                    <div className="text-[10px] font-black uppercase text-slate-400">気になる不調</div>
                    <div className="text-[16px] font-black text-slate-900">{SYMPTOM_LABELS[bundle?.diagnosis_context?.symptom_focus] || "体調"}</div>
                  </div>
                </div>
              </div>

              {/* 注意要素・時間帯 */}
              <div className="grid grid-cols-2 gap-3">
                <SubItemCard tone="slate">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-1">注意する時間</div>
                  <div className="text-[18px] font-black text-slate-900">{forecast.peak_start?.slice(0, 5)} - {forecast.peak_end?.slice(0, 5)}</div>
                </SubItemCard>
                <SubItemCard tone="slate">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-1">響きやすい要素</div>
                  <div className="flex items-center gap-2">
                    <WeatherIcon triggerKey={triggerKey} className="h-5 w-5 text-[var(--accent)]" />
                    <div className="text-[15px] font-black text-slate-900">{getCompatTriggerLabel(forecast.main_trigger, forecast.trigger_dir)}</div>
                  </div>
                </SubItemCard>
              </div>

              {/* 注意点メモ */}
              <SubItemCard tone="mint" title="アドバイス" icon={<IconMemo className="h-4 w-4" />}>
                <div className="text-[13px] font-bold leading-6 text-slate-700 whitespace-pre-wrap">{forecast.why_short}</div>
              </SubItemCard>
            </div>
          </Module>

          {/* 2. 対策 Module (ツボ・食事) */}
          <Module>
            <div className="p-6 space-y-6">
              {/* ツボ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pl-1">
                  <IconRipple className="h-4 w-4 text-indigo-500" />
                  <span className="text-[14px] font-black text-slate-900">おすすめのツボ</span>
                </div>
                <div className="grid gap-3">
                  {tsuboPoints.map((p) => (
                    <SubItemCard key={p.code} tone="slate" onClick={() => setSelectedPoint(p)}>
                      <div className="flex items-start gap-4">
                        <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-white ring-1 ring-black/5 text-[14px] font-black text-[var(--accent-ink)]">
                          {p.code}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[16px] font-black text-slate-900">{p.name_ja}</div>
                          <div className="text-[12px] font-bold text-slate-500 leading-relaxed mt-1">{p.explanation?.role_summary}</div>
                        </div>
                        <IconCompass className="h-5 w-5 text-slate-300 self-center" />
                      </div>
                    </SubItemCard>
                  ))}
                </div>
              </div>

              {/* 食事 */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pl-1">
                  <IconBowl className="h-4 w-4 text-amber-500" />
                  <span className="text-[14px] font-black text-slate-900">食養生のアドバイス</span>
                </div>
                <SubItemCard tone="amber">
                  <div className="text-[15px] font-black text-slate-900">{food.title}</div>
                  <div className="mt-3 space-y-3">
                    <div className="text-[13px] font-bold leading-6 text-slate-600">{food.recommendation}</div>
                    {food.examples?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {food.examples.map((ex) => (
                          <span key={ex} className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-700 ring-1 ring-black/5 shadow-sm">{ex}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </SubItemCard>
              </div>
            </div>
          </Module>
        </div>
      ) : (
        <div className="space-y-6">
          <Module className="p-6">
            <div className="text-[18px] font-black text-slate-900">今日の記録</div>
            <div className="mt-2 text-[13px] font-bold text-slate-500">予報と実際の体調を振り返りましょう。</div>
            <Button className="mt-6 w-full" onClick={() => setReviewEditorOpen(true)}>
              {todayReview ? "記録を編集する" : "記録をつける"}
            </Button>
          </Module>
        </div>
      )}

      {/* モーダル */}
      <ReviewFormSheet
        open={reviewEditorOpen} date={getJstTodayTomorrow().today} review={todayReview}
        forecast={todayReviewForecast} title="今日を振り返る"
        onClose={() => setReviewEditorOpen(false)}
        onSave={async (payload) => { /* 保存ロジック */ setReviewEditorOpen(false); }}
      />
    </AppShell>
  );
}
