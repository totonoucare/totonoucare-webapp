// app/radar/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell, { Module } from "@/components/layout/AppShell";
import { CoreIllust } from "@/components/illust/core";
import Button from "@/components/ui/Button";
import { WeatherIcon } from "@/components/illust/icons/weather";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";
import {
  IconAttention,
  IconBolt,
  IconRadar,
  IconRipple,
  IconBowl,
  IconLocation,
  IconLifestyle,
} from "@/components/illust/icons/app";
import {
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
  SYMPTOM_LABELS,
} from "@/lib/diagnosis/v2/labels";
import { ForecastGauge } from "./ForecastGauge";
import { buildCareActionKey, buildDisplayedCareItems } from "@/lib/radar_v1/careActionItems";
import { enhanceDailyCarePlan } from "@/lib/radar_v1/careRules/dailyCareV2";
import {
  ForecastDateRail,
  LocationEditor,
  PointDetailSheet,
  SegmentedTabs,
} from "./RadarPageComponents";
import TsuboRegionIcon, { getTsuboRegionIconLabel } from "./TsuboRegionIcon";
import {
  FLAT_PRESETS,
  RADAR_LOADING_HINTS,
  buildRadarDateTabs,
  buildScoreCardTitle,
  buildTodayCarePlan,
  formatTargetDate,
  deriveCarePolicies,
  getCareItemHint,
  getCareStrategyLead,
  getCareStrategyTitle,
  getDateModeLabel,
  getForecastWeatherLoadGroups,
  getForecastEnvironmentalCautions,
  getForecastBodySigns,
  getForecastModeLabel,
  getForecastModeLead,
  getForecastPeakPrepItems,
  getForecastTriggerFactors,
  getForecastTriggerKey,
  getHeroDecorClass,
  getHeroPanelClass,
  getJstTodayTomorrow,
  getLifestylePlan,
  getLocationDisplayLabel,
  getPointReading,
  getPointRoleSummary,
  getRiskContext,
  getSectionLabels,
  getTsuboRoleLabel,
  inferModeFromSelectedDate,
  inferModeFromTargetDate,
  safeArray,
  signalBadgeClass,
  signalDotClass,
} from "./utils";

const SYMPTOM_OPTIONS = Object.entries(SYMPTOM_LABELS).map(([value, label]) => ({ value, label }));

const WEATHER_LOAD_SHORT_LABELS = {
  temperature: "気温",
  moisture: "湿度",
  pressure: "気圧",
};

function compactClockLabel(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hour = String(Number(match[1]));
  return match[2] === "00" ? hour : `${hour}:${match[2]}`;
}

function compactPeakLabel(start, end) {
  const startLabel = compactClockLabel(start);
  const endLabel = compactClockLabel(end);
  return startLabel && endLabel ? `${startLabel}–${endLabel}時` : "—";
}

function getPolicyIconPath(policyKey) {
  return `/illust/policy/policy-${policyKey}.svg`;
}

const CARE_DOMAIN_TONES = {
  live: {
    surface: "bg-[#EAF7F1]",
    softSurface: "bg-[#F4FAF7]",
    ink: "text-[#2F816E]",
    inkSoft: "text-[#2F816E]/70",
    ring: "ring-[#CFE7DE]",
    marker: "bg-[#66B9A3]",
    insetShadow: "shadow-[inset_0_2px_8px_rgba(47,129,110,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]",
  },
  eat: {
    surface: "bg-[#FFF5E6]",
    softSurface: "bg-[#FFFBF4]",
    ink: "text-[#A56C18]",
    inkSoft: "text-[#A56C18]/75",
    ring: "ring-[#EED8B4]",
    marker: "bg-[#E2AE45]",
    insetShadow: "shadow-[inset_0_2px_8px_rgba(165,108,24,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]",
  },
  loosen: {
    surface: "bg-[#F6EFF8]",
    softSurface: "bg-[#FBF8FC]",
    ink: "text-[#7B6588]",
    inkSoft: "text-[#7B6588]/75",
    ring: "ring-[#E2D6E7]",
    marker: "bg-[#A78BB3]",
    insetShadow: "shadow-[inset_0_2px_8px_rgba(123,101,136,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]",
  },
};

/* -----------------------------
 * Main Page
 * ---------------------------- */


function ForecastRecordRail({ tabs, activeDate, onSelect, onOpenRecords, recorded = false, isToday = false }) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="min-w-0 flex-1">
        <ForecastDateRail tabs={tabs} activeDate={activeDate} onSelect={onSelect} />
      </div>
      <button
        type="button"
        onClick={onOpenRecords}
        className="my-1 flex w-[82px] shrink-0 flex-col items-center justify-center rounded-[20px] bg-white px-2 py-2 text-center text-[#2F816E] ring-1 ring-[#CFE7DE] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#F4FAF7]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#EAF7F1] font-black leading-none ring-1 ring-[#CFE7DE]">
          {recorded ? (
            <span className="text-[18px] leading-none">✓</span>
          ) : (
            <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none" aria-hidden="true">
              <path d="M5 19l3.7-.8L18.8 8.1a1.8 1.8 0 0 0 0-2.6l-.3-.3a1.8 1.8 0 0 0-2.6 0L5.8 15.3 5 19Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m14.5 6.6 2.9 2.9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <span className="mt-1 text-[11px] font-black leading-4">
          {isToday ? (recorded ? "記録済み ✓" : "今日を記録") : "記録・分析"}
        </span>
      </button>
    </div>
  );
}

function CareSetNaviBridge({
  eyebrow = "パーソナルケアショップ",
  title,
  lead,
  buttonLabel = "候補を見る",
  onClick,
  toneKey = "live",
}) {
  const tone = CARE_DOMAIN_TONES[toneKey] || CARE_DOMAIN_TONES.live;

  return (
    <div className={["rounded-[20px] px-4 py-4 ring-1 shadow-sm", tone.softSurface, tone.ring].join(" ")}>
      <div className={["text-[11px] font-black uppercase tracking-widest", tone.inkSoft].join(" ")}>
        {eyebrow}
      </div>
      <div className="mt-1.5 text-[14px] font-black tracking-tight text-slate-900">
        {title}
      </div>
      <div className="mt-1.5 text-[14px] font-bold leading-5 text-slate-600">
        {lead}
      </div>
      <Button
        variant="primary"
        size="md"
        onClick={onClick}
        className="mt-3 w-full"
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

function PurchasedCareItemsPanel({ items, renderActionButton }) {
  if (!safeArray(items).length) return null;
  return (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">手持ちアイテム</div>
          <div className="mt-1 text-[13px] font-black text-slate-900">購入済みの商品を使ったら記録</div>
        </div>
        <span className="rounded-full bg-[#FFF6DF] px-2.5 py-1 text-[10px] font-black text-[#8B640C] ring-1 ring-[#E4C56B]">ショップ連携</span>
      </div>
      <div className="mt-3 grid gap-2">
        {safeArray(items).slice(0, 6).map((item) => (
          <div key={item.canonical_key} className="flex items-center gap-3 rounded-[16px] bg-[#F8FBF9] p-2.5 ring-1 ring-[#DCE8DD]">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[13px] bg-white ring-1 ring-[#DCE8DD]">
              {item.shopItem?.imageUrl ? <img src={item.shopItem.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <IconLifestyle className="h-5 w-5 text-[#2F816E]" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[12px] font-black leading-4 text-slate-800">{item.label}</div>
              <div className="mt-1 text-[10px] font-bold text-slate-400">{item.domain === "eat" ? "取り入れた内容として記録" : "使ったケアとして記録"}</div>
            </div>
            {renderActionButton(item, { compact: true, uncheckedLabel: item.domain === "eat" ? "今日取り入れた" : "今日使った" })}
          </div>
        ))}
      </div>
    </div>
  );
}

function CareActionButton({ checked, saving, disabled, onClick, compact = false, uncheckedLabel = "やってみた" }) {
  return (
    <button
      type="button"
      disabled={disabled || saving}
      onClick={onClick}
      className={[
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-black ring-1 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "px-3 py-2 text-[11px]" : "px-3.5 py-2.5 text-[12px]",
        checked
          ? "bg-[#349B83] text-white ring-[#349B83] shadow-sm"
          : "bg-white text-[#2F816E] ring-[#BFDCCF] hover:bg-[#F4FAF7]",
      ].join(" ")}
    >
      <span className={[
        "grid place-items-center rounded-full",
        compact ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-[11px]",
        checked ? "bg-white/20" : "bg-[#EAF7F1]",
      ].join(" ")}>
        {saving ? "…" : checked ? "✓" : "+"}
      </span>
      {checked ? "記録済み" : uncheckedLabel}
    </button>
  );
}

function normalizeRadarTargetDate(date) {
  const { today, tomorrow } = getJstTodayTomorrow();
  return date === today ? today : tomorrow;
}

function RadarContentLoadingCards({ mode = "today", kind = "forecast", locationLabel = "" }) {
  const isLocationRefresh = kind === "location";
  const title = isLocationRefresh
    ? "地域の予報を更新中"
    : mode === "today"
      ? "今日の体調ゆらぎ予報を確認中"
      : "明日の体調ゆらぎ予報を確認中";
  const lead = isLocationRefresh
    ? `${locationLabel || "新しい地域"}の天気と、体質への響き方を確認しています。`
    : mode === "today"
      ? "今日の予報とケアを読み込んでいます。"
      : "明日の予報と今夜からのケアを読み込んでいます。";

  return (
    <div className="space-y-6">
      <Module className="relative overflow-hidden p-4 sm:p-5">
        <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-[var(--mint)]/35 blur-2xl" />
        <div className="relative rounded-[30px] bg-[linear-gradient(135deg,#F7FCF9_0%,#FFF9EB_100%)] px-5 py-6 ring-1 ring-[#DCE8DD] shadow-[0_18px_48px_-28px_rgba(15,23,42,0.28)]">
          <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[12px] font-black tracking-[0.16em] text-[#47786C] ring-1 ring-[#CFE0D3]">
            LOADING
          </div>
          <div className="mt-4 text-[22px] font-black tracking-tight text-slate-900">
            {title}
          </div>
          <div className="mt-2 text-[14px] font-bold leading-6 text-slate-600">
            {lead}
          </div>

          <div className="mt-6 rounded-[28px] bg-white/78 p-4 ring-1 ring-[#E2ECE4]">
            <div className="mx-auto h-52 max-w-[340px] rounded-[28px] bg-slate-100/80 animate-pulse" />
            <div className="mt-5 space-y-3">
              <div className="h-14 rounded-[22px] bg-white/90 ring-1 ring-slate-100 animate-pulse" />
              <div className="h-14 rounded-[22px] bg-white/90 ring-1 ring-slate-100 animate-pulse" />
              <div className="h-14 rounded-[22px] bg-white/90 ring-1 ring-slate-100 animate-pulse" />
            </div>
          </div>
        </div>
      </Module>

      <Module className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-[22px] bg-[var(--mint)]/45 ring-1 ring-[#CFE0D3] animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-28 rounded-full bg-slate-100 animate-pulse" />
            <div className="mt-3 h-7 w-40 rounded-full bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="mt-6 rounded-[28px] bg-[#F8FCF9] p-4 ring-1 ring-[#DCE8DD]">
          <div className="flex gap-2">
            <div className="h-10 w-24 rounded-full bg-white ring-1 ring-[#DCE8DD] animate-pulse" />
            <div className="h-10 w-24 rounded-full bg-white ring-1 ring-[#DCE8DD] animate-pulse" />
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="h-4 w-full rounded-full bg-slate-100 animate-pulse" />
            <div className="h-4 w-11/12 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-4 w-8/12 rounded-full bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="mt-6 h-14 rounded-full bg-slate-100 animate-pulse" />
        <div className="mt-5 rounded-[28px] bg-[#F8FCF9] p-5 ring-1 ring-[#DCE8DD]">
          <div className="h-7 w-36 rounded-full bg-white ring-1 ring-[#DCE8DD] animate-pulse" />
          <div className="mt-5 h-28 rounded-[24px] bg-white/90 ring-1 ring-slate-100 animate-pulse" />
        </div>
      </Module>
    </div>
  );
}

export default function RadarPage() {
  const router = useRouter();
  const initialDateParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("date") || ""
      : "";

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentLoadingKind, setContentLoadingKind] = useState("forecast");
  const [refreshing, setRefreshing] = useState(false);
  const [showSlowLoadingMessage, setShowSlowLoadingMessage] = useState(false);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);

  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState("");

  const [needsLocation, setNeedsLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState("");
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [locationNotice, setLocationNotice] = useState("");
  const [showSymptomEditor, setShowSymptomEditor] = useState(false);
  const [selectedSymptomKey, setSelectedSymptomKey] = useState("");
  const [savingSymptom, setSavingSymptom] = useState(false);

  const [tab, setTab] = useState("forecast");
  const [careTab, setCareTab] = useState("live");
  const [dateMode, setDateMode] = useState("today");
  const [selectedTargetDate, setSelectedTargetDate] = useState("");
  const [openingProfileDetail, setOpeningProfileDetail] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [tsuboExtraOpen, setTsuboExtraOpen] = useState(false);
  const [foodDetailOpen, setFoodDetailOpen] = useState(false);
  const [activeDateReview, setActiveDateReview] = useState(null);
  const [careActions, setCareActions] = useState([]);
  const [careActionSavingKey, setCareActionSavingKey] = useState("");
  const [careActionError, setCareActionError] = useState("");
  const [careActionsSchemaReady, setCareActionsSchemaReady] = useState(true);
  const [purchasedShopItems, setPurchasedShopItems] = useState([]);

  const requestSeqRef = useRef(0);
  const slowLoadingTimerRef = useRef(null);
  const loadingHintIntervalRef = useRef(null);

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

  useEffect(() => {
    return () => {
      clearLoadingHintTimers();
    };
  }, []);

  async function authedFetch(path, opts = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("No token");

    const res = await fetch(path, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        Authorization: `Bearer ${token}`,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  function parseCoordinateInput(value) {
    if (value === null || value === undefined) return null;
    if (typeof value !== "number" && typeof value !== "string") return null;

    const normalized = typeof value === "string" ? value.trim() : value;
    if (normalized === "") return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function isValidLatLon(lat, lon) {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  }

  async function saveLocationOverrideIfNeeded({ lat, lon, label }) {
    const nextLat = parseCoordinateInput(lat);
    const nextLon = parseCoordinateInput(lon);
    if (!isValidLatLon(nextLat, nextLon)) return null;

    const json = await authedFetch("/api/radar/location", {
      method: "POST",
      body: JSON.stringify({
        lat: nextLat,
        lon: nextLon,
        label: String(label || "現在地付近").trim() || "現在地付近",
      }),
    });

    return json?.location || null;
  }

  function clearLoadingHintTimers() {
    if (slowLoadingTimerRef.current) {
      clearTimeout(slowLoadingTimerRef.current);
      slowLoadingTimerRef.current = null;
    }
    if (loadingHintIntervalRef.current) {
      clearInterval(loadingHintIntervalRef.current);
      loadingHintIntervalRef.current = null;
    }
  }

  function startSlowLoadingHints(requestSeq) {
    clearLoadingHintTimers();
    setShowSlowLoadingMessage(false);
    setLoadingHintIndex(0);

    slowLoadingTimerRef.current = setTimeout(() => {
      if (requestSeq !== requestSeqRef.current) return;
      setShowSlowLoadingMessage(true);
      setLoadingHintIndex(0);

      loadingHintIntervalRef.current = setInterval(() => {
        if (requestSeq !== requestSeqRef.current) return;
        setLoadingHintIndex((prev) => (prev + 1) % RADAR_LOADING_HINTS.length);
      }, 1800);
    }, 1200);
  }



  async function requestForecastSnapshot({ token, targetDate, forceSnapshot = false }) {
    const qs = new URLSearchParams();
    qs.set("date", targetDate);
    if (forceSnapshot) qs.set("force", "1");

    const res = await fetch(`/api/radar/v1/forecast?${qs.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(json?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.payload = json;
      throw err;
    }

    return json;
  }

  async function fetchForecast({
    lat = null,
    lon = null,
    force = false,
    recompute = false,
    locationChanged = false,
    targetDate: requestedTargetDate = null,
    locationLabel = null,
    showRefreshNotice = true,
  } = {}) {
    if (!session) return;

    const { today, tomorrow } = getJstTodayTomorrow();
    const targetDate = normalizeRadarTargetDate(requestedTargetDate || selectedTargetDate || today);
    const nextMode = inferModeFromSelectedDate(targetDate) || "tomorrow";
    const requestSeq = ++requestSeqRef.current;

    try {
      const hasExistingBundle = !!bundle;
      const isLocationRefresh =
        locationChanged || recompute || lat !== null || lon !== null;

      setSelectedTargetDate(targetDate);
      setDateMode(nextMode);
      setError("");
      if (force) setRefreshing(true);
      if (!hasExistingBundle) {
        setLoading(true);
        setContentLoading(false);
        startSlowLoadingHints(requestSeq);
      } else {
        setContentLoadingKind(isLocationRefresh ? "location" : nextMode);
        setContentLoading(true);
        clearLoadingHintTimers();
        setShowSlowLoadingMessage(false);
      }

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("No token");

      const savedLocation = await saveLocationOverrideIfNeeded({ lat, lon, label: locationLabel });
      const shouldForceSnapshot = recompute || locationChanged || !!savedLocation;
      const shouldRefreshBothDates = isLocationRefresh || !!savedLocation;

      const json = await requestForecastSnapshot({
        token,
        targetDate,
        forceSnapshot: shouldForceSnapshot,
      });

      if (requestSeq !== requestSeqRef.current) return;

      let siblingRefreshFailed = false;
      if (shouldRefreshBothDates) {
        const siblingTargetDate = targetDate === today ? tomorrow : today;
        if (siblingTargetDate && siblingTargetDate !== targetDate) {
          try {
            await requestForecastSnapshot({
              token,
              targetDate: siblingTargetDate,
              forceSnapshot: true,
            });
          } catch (siblingError) {
            siblingRefreshFailed = true;
            console.error("refresh sibling radar forecast failed:", siblingError);
          }
        }
      }

      if (requestSeq !== requestSeqRef.current) return;

      setNeedsLocation(false);
      setBundle(json);

      // AI補完ルートは一時停止中。
      // ページ表示・地域変更・欠損時生成のいずれでも、ここからGPT生成は呼ばない。

      const returnedMode = inferModeFromSelectedDate(json?.target_date) || inferModeFromTargetDate(json?.target_date);
      if (returnedMode) {
        setDateMode(returnedMode);
      }
      if (json?.target_date) {
        setSelectedTargetDate(json.target_date);
      }

      if (shouldRefreshBothDates && showRefreshNotice) {
        setLocationNotice(
          siblingRefreshFailed
            ? "地域を更新しました。選択中の予報に反映しました。もう片方の予報は、開いたときに再取得します。"
            : "地域を更新しました。今日と明日の予報に反映しました。"
        );
      }
    } catch (e) {
      if (requestSeq !== requestSeqRef.current) return;
      if (e?.payload?.error?.includes("No radar location found")) {
        setNeedsLocation(true);
        setBundle(null);
        return;
      }
      setError(e?.message || "予報の取得に失敗しました。");
    } finally {
      if (requestSeq === requestSeqRef.current) {
        clearLoadingHintTimers();
        setShowSlowLoadingMessage(false);
        setLoading(false);
        setContentLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    if (!session || loadingAuth) return;
    const { today } = getJstTodayTomorrow();
    const firstTargetDate = normalizeRadarTargetDate(initialDateParam || today);
    fetchForecast({ targetDate: firstTargetDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loadingAuth, initialDateParam]);


  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("この端末では位置情報が使えません。");
      return;
    }

    setLocating(true);
    setError("");
    setLocationNotice("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        await fetchForecast({
          lat,
          lon,
          force: true,
          recompute: true,
          locationChanged: !needsLocation,
          locationLabel: "現在地付近",
        });

        setLocating(false);
        if (!needsLocation) {
          setShowLocationEditor(false);
        }
      },
      (geoErr) => {
        setLocating(false);
        if (geoErr?.code === 1) {
          setError("位置情報の使用が拒否されました。下の「地域を選んで設定する」を使ってください。");
        } else {
          setError(geoErr?.message || "位置情報を取得できませんでした。");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  async function savePresetLocation() {
    const preset = FLAT_PRESETS.find((p) => p.key === selectedPresetKey);
    if (!preset) {
      setError("地域を選んでください。");
      return;
    }

    try {
      setSavingPreset(true);
      setError("");
      setLocationNotice("");

      await fetchForecast({
        lat: preset.lat,
        lon: preset.lon,
        force: true,
        recompute: true,
        locationChanged: !needsLocation,
        locationLabel: preset.label,
      });

      if (!needsLocation) {
        setShowLocationEditor(false);
      }
    } finally {
      setSavingPreset(false);
    }
  }

  async function openLatestResultDetail() {
    try {
      setOpeningProfileDetail(true);
      setError("");

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        router.push("/history");
        return;
      }

      const res = await fetch("/api/diagnosis/v2/events/list?limit=1", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "最新の体質履歴を取得できませんでした。");
      }

      const row = Array.isArray(json?.data) ? json.data[0] : null;
      const resultId = row?.source_event_id || row?.notes?.source_event_id || null;

      if (resultId) {
        router.push(`/result/${encodeURIComponent(resultId)}?from=history`);
        return;
      }

      router.push("/history");
    } catch (e) {
      console.error("openLatestResultDetail failed:", e);
      router.push("/history");
    } finally {
      setOpeningProfileDetail(false);
    }
  }

  const dateTabs = useMemo(() => buildRadarDateTabs(), []);
  const todayTomorrow = getJstTodayTomorrow();
  const activeTargetDate = selectedTargetDate || bundle?.target_date || todayTomorrow.tomorrow;
  const bundleTargetDate = bundle?.target_date || "";
  const bundleMatchesActiveTarget = !!bundle && (!bundleTargetDate || bundleTargetDate === activeTargetDate);
  const forecast = bundleMatchesActiveTarget ? bundle?.forecast || null : null;
  const selectedDateMode = inferModeFromSelectedDate(activeTargetDate) || dateMode;
  const selectedIsToday = selectedDateMode === "today";

  useEffect(() => {
    if (!session?.access_token || !activeTargetDate || !selectedIsToday) {
      setActiveDateReview(null);
      return undefined;
    }

    let cancelled = false;
    authedFetch(`/api/radar/review?date=${encodeURIComponent(activeTargetDate)}`)
      .then((json) => {
        if (!cancelled) setActiveDateReview(json?.data?.review || null);
      })
      .catch(() => {
        if (!cancelled) setActiveDateReview(null);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, activeTargetDate, selectedIsToday]);

  useEffect(() => {
    if (!session?.access_token || !activeTargetDate) {
      setCareActions([]);
      return undefined;
    }

    let cancelled = false;
    setCareActionError("");
    authedFetch(`/api/radar/care-actions?date=${encodeURIComponent(activeTargetDate)}`)
      .then((json) => {
        if (cancelled) return;
        setCareActions(Array.isArray(json?.data?.actions) ? json.data.actions : Array.isArray(json?.actions) ? json.actions : []);
        const schemaReady = json?.data?.schema_ready !== false && json?.schema_ready !== false;
        setCareActionsSchemaReady(schemaReady);
        if (!schemaReady) setCareActionError("ケア記録は現在準備中です。予報とケア内容は通常どおり見られます。");
      })
      .catch((actionError) => {
        if (cancelled) return;
        setCareActions([]);
        setCareActionError(actionError?.message || "ケア記録を読み込めませんでした。");
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, activeTargetDate]);

  useEffect(() => {
    if (!session?.access_token) {
      setPurchasedShopItems([]);
      return undefined;
    }
    let cancelled = false;
    fetch("/api/care-shop/items?status=purchased", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json?.error || "購入済み商品を読み込めませんでした。");
        if (!cancelled) setPurchasedShopItems(safeArray(json?.data?.items));
      })
      .catch(() => {
        if (!cancelled) setPurchasedShopItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const riskContext = getRiskContext(bundle);
  const savedSymptomFocus = riskContext?.constitution_context?.symptom_focus || null;
  const symptomFocus = selectedSymptomKey || savedSymptomFocus || null;
  const todayCarePlan = useMemo(
    () => (selectedIsToday ? buildTodayCarePlan({ forecast, riskContext, symptomFocus }) : null),
    [selectedIsToday, forecast, riskContext, symptomFocus],
  );
  const baseCarePlan = selectedIsToday ? todayCarePlan : bundle?.care_plan || null;
  const carePlan = useMemo(
    () => enhanceDailyCarePlan({
      baseCarePlan,
      forecast,
      riskContext,
      mode: selectedIsToday ? "today" : "tomorrow",
      targetDate: activeTargetDate,
      symptomFocus,
    }),
    [baseCarePlan, forecast, riskContext, selectedIsToday, activeTargetDate, symptomFocus],
  );
  const activeCareForecast = forecast;
  const tsuboSet = carePlan?.night_tsubo_set || {};
  const tsuboPoints = safeArray(tsuboSet?.points);
  const food = carePlan?.tomorrow_food_context || carePlan?.night_food || {};

  const coreCode = riskContext?.constitution_context?.core_code || null;
  const coreLabel = coreCode ? getCoreLabel(coreCode) : null;
  const subLabelObjects = getSubLabels(
    safeArray(riskContext?.constitution_context?.sub_labels)
  );
  const primaryLine = riskContext?.constitution_context?.primary_meridian
    ? getMeridianLine(riskContext.constitution_context.primary_meridian)
    : null;
  const symptomLabel = symptomFocus ? SYMPTOM_LABELS[symptomFocus] || symptomFocus : null;

  const bundleDateMode = useMemo(
    () => inferModeFromSelectedDate(bundle?.target_date) || inferModeFromTargetDate(bundle?.target_date) || dateMode,
    [bundle?.target_date, dateMode]
  );

  const displayDateMode = selectedIsToday ? "today" : bundleDateMode;

  const targetDateLabel = useMemo(
    () => formatTargetDate(activeTargetDate),
    [activeTargetDate]
  );

  const locationDisplayLabel = useMemo(
    () => getLocationDisplayLabel(bundle?.location),
    [bundle?.location]
  );

  const scoreCardTitle = useMemo(
    () => buildScoreCardTitle(displayDateMode, activeTargetDate),
    [displayDateMode, activeTargetDate]
  );

  const sectionLabels = useMemo(
    () => getSectionLabels(displayDateMode),
    [displayDateMode]
  );

  const triggerFactors = useMemo(() => getForecastTriggerFactors(forecast), [forecast]);
  const triggerKey = triggerFactors[0]?.key || getForecastTriggerKey(forecast);
  const forecastModeLabel = useMemo(
    () => getForecastModeLabel(forecast?.signal ?? 0),
    [forecast?.signal]
  );
  const forecastModeLead = useMemo(
    () => getForecastModeLead(triggerFactors, forecast?.signal ?? 0, displayDateMode, symptomFocus),
    [triggerFactors, forecast?.signal, displayDateMode, symptomFocus]
  );
  const bodySigns = useMemo(
    () => getForecastBodySigns(triggerFactors, forecast?.signal ?? 0, symptomFocus, displayDateMode),
    [triggerFactors, forecast?.signal, symptomFocus, displayDateMode]
  );
  const peakPrepItems = useMemo(
    () => getForecastPeakPrepItems(triggerFactors, forecast?.signal ?? 0, symptomFocus, displayDateMode),
    [triggerFactors, forecast?.signal, symptomFocus, displayDateMode]
  );
  const weatherLoadGroups = useMemo(
    () => getForecastWeatherLoadGroups(forecast),
    [forecast]
  );
  const environmentalCautions = useMemo(
    () => getForecastEnvironmentalCautions(forecast),
    [forecast]
  );
  const careTriggerFactors = useMemo(() => getForecastTriggerFactors(activeCareForecast), [activeCareForecast]);
  const careTriggerKey = careTriggerFactors[0]?.careKey || careTriggerFactors[0]?.key || getForecastTriggerKey(activeCareForecast);
  const secondaryCareTriggerKey = careTriggerFactors[1]?.careKey || careTriggerFactors[1]?.key || null;
  const careStrategyTitle = useMemo(
    () => getCareStrategyTitle(careTriggerKey, activeCareForecast?.signal ?? 0, selectedIsToday ? "today" : "tomorrow"),
    [careTriggerKey, activeCareForecast?.signal, selectedIsToday]
  );
  const careStrategyLead = useMemo(
    () => getCareStrategyLead(careTriggerFactors, activeCareForecast?.signal ?? 0, selectedIsToday ? "today" : "tomorrow", symptomFocus),
    [careTriggerFactors, activeCareForecast?.signal, selectedIsToday, symptomFocus]
  );
  const carePolicies = useMemo(() => {
    const theme = carePlan?.care_theme;
    if (safeArray(theme?.policies).length) {
      return {
        policies: theme.policies,
        scores: theme.scores || {},
        summary: theme.summary || "",
      };
    }
    return deriveCarePolicies({
      forecast: activeCareForecast,
      triggerFactors: careTriggerFactors,
      riskContext,
      mode: selectedIsToday ? "today" : "tomorrow",
      symptomFocus,
    });
  }, [carePlan?.care_theme, activeCareForecast, careTriggerFactors, riskContext, selectedIsToday, symptomFocus]);
  const careNaviSymptomQuery = symptomFocus ? `&symptom=${encodeURIComponent(symptomFocus)}` : "";
  const buildCareNaviUrl = (category) => `/care-navi?category=${category}${careNaviSymptomQuery}`;

  const derivedLifestylePlan = useMemo(
    () =>
      getLifestylePlan(
        careTriggerKey,
        secondaryCareTriggerKey,
        activeCareForecast?.signal ?? 0,
        selectedIsToday ? "today" : "tomorrow",
        symptomFocus,
        careTriggerFactors.find((factor) => factor?.responseDirection) || null,
      ),
    [careTriggerKey, secondaryCareTriggerKey, activeCareForecast?.signal, selectedIsToday, symptomFocus, careTriggerFactors]
  );
  const lifestylePlan = carePlan?.lifestyle_plan || derivedLifestylePlan;
  const liveItemHint = useMemo(
    () => getCareItemHint("live", careTriggerFactors, selectedIsToday ? "today" : "tomorrow", symptomFocus),
    [careTriggerFactors, selectedIsToday, symptomFocus]
  );
  const eatItemHint = useMemo(
    () => getCareItemHint("eat", careTriggerFactors, selectedIsToday ? "today" : "tomorrow", symptomFocus),
    [careTriggerFactors, selectedIsToday, symptomFocus]
  );
  const loosenItemHint = useMemo(
    () => getCareItemHint("loosen", careTriggerFactors, selectedIsToday ? "today" : "tomorrow", symptomFocus),
    [careTriggerFactors, selectedIsToday, symptomFocus]
  );
  const primaryTsubo = tsuboPoints[0] || null;
  const extraTsuboPoints = tsuboPoints.slice(1);
  const foodExamples = safeArray(food.examples);
  const foodActionCards = safeArray(food.action_cards);
  const primaryFoodCard = foodActionCards.find((card) => card?.primary) || foodActionCards[0] || null;
  const primaryFoodCards = foodActionCards.filter((card) => card?.primary || card?.prominent);
  const visiblePrimaryFoodCards = primaryFoodCards.length ? primaryFoodCards : [primaryFoodCard].filter(Boolean);
  const secondaryFoodCards = foodActionCards.filter((card) => !visiblePrimaryFoodCards.includes(card));
  const foodContextChips = safeArray(food.context_chips);
  const hasFoodActionCards = foodActionCards.length > 0;
  const lifestylePrimaryAction = lifestylePlan?.primary_action || null;
  const lifestyleAlternatives = safeArray(lifestylePlan?.alternatives);
  const lineCare = tsuboSet?.line_care || null;
  const hasFoodDetails = hasFoodActionCards
    ? secondaryFoodCards.length > 0 || !!food.reason || !!food.lifestyle_tip
    : !!food.how_to || !!food.avoid || !!food.reason || !!food.lifestyle_tip;
  const pointReasonLoading = false;
  const careTone = CARE_DOMAIN_TONES[careTab] || CARE_DOMAIN_TONES.live;
  const careSourceMode = selectedIsToday ? "today" : "tomorrow";
  const displayedCareItems = useMemo(() => buildDisplayedCareItems({
    lifestylePlan,
    food,
    tsuboPoints,
    tsuboSet,
    sourceMode: careSourceMode,
  }).map((item) => ({
    ...item,
    meta: {
      ...(item.meta || {}),
      forecast_id: forecast?.id || null,
      forecast_signal: forecast?.signal ?? null,
      forecast_score: forecast?.score_display_0_10 ?? forecast?.score_precise_0_10 ?? forecast?.score_0_10 ?? null,
      primary_trigger: careTriggerKey || null,
      care_plan_id: carePlan?.id || null,
      care_logic_version: carePlan?.version || "daily_care_v2_1_2026-07-17",
    },
  })), [lifestylePlan, food, tsuboPoints, tsuboSet, careSourceMode, forecast, careTriggerKey, carePlan?.id, selectedIsToday]);
  const currentCareActionKeys = useMemo(() => new Set(
    safeArray(careActions)
      .filter((item) => item?.source_mode === careSourceMode)
      .map((item) => item?.canonical_key || item?.item_key)
      .filter(Boolean)
  ), [careActions, careSourceMode]);
  const careItemsByKind = useMemo(() => {
    const map = new Map();
    displayedCareItems.forEach((item) => {
      if (!map.has(item.kind)) map.set(item.kind, []);
      map.get(item.kind).push(item);
    });
    return map;
  }, [displayedCareItems]);
  const purchasedCareItemsByCategory = useMemo(() => {
    const groups = { live: [], eat: [], point: [] };
    safeArray(purchasedShopItems).forEach((row) => {
      const shopItem = row?.item_snapshot && typeof row.item_snapshot === "object" ? row.item_snapshot : {};
      const category = ["live", "eat", "point"].includes(row?.category) ? row.category : shopItem.category;
      if (!groups[category]) return;
      const domain = category === "point" ? "loosen" : category;
      const label = String(row?.title || shopItem.title || "購入済みのケアアイテム").slice(0, 160);
      const detail = String(shopItem.useGuide || shopItem.reason || (domain === "eat" ? "購入済みの商品を取り入れた" : "購入済みの商品を使った")).slice(0, 240);
      const canonicalKey = buildCareActionKey({
        domain,
        kind: "owned_care_item",
        identity: row?.item_key || label,
      });
      groups[category].push({
        item_key: canonicalKey,
        canonical_key: canonicalKey,
        domain,
        kind: "owned_care_item",
        label,
        detail,
        source_mode: "today",
        shopItem,
        meta: {
          card_key: "purchased_care_items",
          card_label: "手持ちアイテム",
          shop_item_key: row?.item_key || null,
          shop_item_title: label,
          shop_item_source: row?.source || shopItem.source || null,
          shop_item_url: row?.item_url || shopItem.itemUrl || null,
          entry_origin: "daily_care_card",
        },
      });
    });
    return groups;
  }, [purchasedShopItems]);
  const previousNightCareCount = safeArray(careActions).filter((item) => item?.source_mode === "tomorrow").length;
  const sameDayCareCount = safeArray(careActions).filter((item) => item?.source_mode === "today").length;
  const checkedCareCount = selectedIsToday
    ? previousNightCareCount + sameDayCareCount
    : previousNightCareCount;

  async function toggleCareAction(item) {
    const actionKey = item?.canonical_key || item?.item_key;
    if (!actionKey || careActionSavingKey) return;
    const checked = currentCareActionKeys.has(actionKey);
    try {
      setCareActionSavingKey(actionKey);
      setCareActionError("");
      const json = await authedFetch("/api/radar/care-actions", {
        method: "POST",
        body: JSON.stringify({
          target_date: activeTargetDate,
          source_mode: careSourceMode,
          domain: item.domain,
          item_key: item.item_key,
          canonical_key: actionKey,
          kind: item.kind,
          label: item.label,
          detail: item.detail,
          item_snapshot: item,
          checked: !checked,
        }),
      });
      const nextActions = json?.data?.actions || json?.actions || [];
      setCareActions(Array.isArray(nextActions) ? nextActions : []);
      setCareActionsSchemaReady(json?.data?.schema_ready !== false && json?.schema_ready !== false);
    } catch (actionError) {
      setCareActionError(actionError?.message || "ケアを記録できませんでした。");
    } finally {
      setCareActionSavingKey("");
    }
  }

  function actionButtonFor(item, { compact = false, stopPropagation = false, uncheckedLabel = "" } = {}) {
    if (!item) return null;
    return (
      <CareActionButton
        checked={currentCareActionKeys.has(item.canonical_key || item.item_key)}
        saving={careActionSavingKey === (item.canonical_key || item.item_key)}
        disabled={!careActionsSchemaReady}
        compact={compact}
        uncheckedLabel={uncheckedLabel || (item.kind === "food_caution" ? "意識した" : "やってみた")}
        onClick={(event) => {
          if (stopPropagation) event?.stopPropagation?.();
          toggleCareAction(item);
        }}
      />
    );
  }

  useEffect(() => {
    if (!selectedPoint) return;

    // Detail sheet should stay in sync with the currently displayed tsubo list.
    // Today uses a locally rebuilt todayCarePlan, while tomorrow uses bundle.care_plan.
    // Looking only at bundle.care_plan here can replace a today_rule point with
    // tomorrow's DB point when the same code appears in both lists.
    const currentPoints = safeArray(carePlan?.night_tsubo_set?.points);
    const refreshedPoint = currentPoints.find((p) => p?.code === selectedPoint?.code);

    if (refreshedPoint && refreshedPoint !== selectedPoint) {
      setSelectedPoint(refreshedPoint);
    }
  }, [carePlan?.night_tsubo_set?.points, selectedPoint]);


  useEffect(() => {
    if (!savedSymptomFocus) return;
    setSelectedSymptomKey((current) => current || savedSymptomFocus);
  }, [savedSymptomFocus]);

  async function handleSaveActiveSymptomFocus() {
    const nextSymptom = selectedSymptomKey || savedSymptomFocus;
    if (!nextSymptom || nextSymptom === savedSymptomFocus) {
      setShowSymptomEditor(false);
      return;
    }

    try {
      setSavingSymptom(true);
      setError("");
      setLocationNotice("");

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("ログインが必要です。");

      const res = await fetch("/api/profile/active-symptom-focus", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active_symptom_focus: nextSymptom }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || "不調の種類を更新できませんでした。");

      setSelectedSymptomKey(nextSymptom);
      setShowSymptomEditor(false);
      await fetchForecast({
        force: true,
        recompute: true,
        targetDate: activeTargetDate,
        showRefreshNotice: false,
      });
      setLocationNotice("今気になる不調を更新し、今日・明日の予報に反映しました。");
    } catch (e) {
      setError(e?.message || "不調の種類を更新できませんでした。");
    } finally {
      setSavingSymptom(false);
    }
  }


  function selectTargetDate(nextDate) {
    const normalizedDate = normalizeRadarTargetDate(nextDate);
    const nextMode = inferModeFromSelectedDate(normalizedDate) || "tomorrow";
    setSelectedTargetDate(normalizedDate);
    setDateMode(nextMode);
    setError("");

    fetchForecast({ targetDate: normalizedDate });
  }

  if (!loadingAuth && !session) {
    return (
      <AppShell title="体調予報" subtitle="ログインが必要です">
        <Module className="overflow-hidden p-0 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
          <div className="relative px-6 py-7 bg-[linear-gradient(135deg,#F5FBF7_0%,#FFF8E8_100%)]">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/70 blur-2xl" />
            <div className="relative z-10 inline-flex rounded-full bg-white/85 px-3 py-1 text-[12px] font-black tracking-wide text-[#24564C] ring-1 ring-[#CFE0D3] shadow-sm">
              ログイン後に使えます
            </div>
            <div className="relative z-10 mt-4 text-[22px] font-black tracking-tight text-slate-900 leading-snug">
              あなたの体質に合わせた
              <br />
              明日の体調予報を表示します。
            </div>
            <div className="relative z-10 mt-3 text-[14px] font-bold leading-6 text-slate-600">
              体調予報ページでは、体質チェックの結果と地域の気圧・気温・湿度を組み合わせて、明日の体調ゆらぎ予報と先回りケアを出します。
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid gap-2.5 text-[14px] font-bold leading-6 text-slate-600">
              <div className="rounded-[18px] bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                ・体質チェック結果をもとにパーソナル予報を作成
              </div>
              <div className="rounded-[18px] bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                ・地域設定後、明日の天気負担を確認
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button onClick={() => router.push("/signup")} className="w-full shadow-md">
                無料で登録・ログイン
              </Button>
              <Button variant="secondary" onClick={() => router.push("/check")} className="w-full bg-white">
                体質チェックへ
              </Button>
              <Button variant="ghost" onClick={() => router.push("/")} className="w-full">
                ホームへ戻る
              </Button>
            </div>
          </div>
        </Module>
      </AppShell>
    );
  }

  if (loadingAuth || loading) {
    return (
      <AppShell title="体調予報" subtitle="読み込み中…" headerRight={<div className="h-8 w-24 bg-slate-100 rounded-full animate-pulse" />}>
        <div className="space-y-6 pt-4">
          {showSlowLoadingMessage ? (
            <div className="rounded-[32px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_74%)] px-6 py-7 shadow-sm">
              <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[12px] font-black tracking-wide text-[#24564C] ring-1 ring-[#CFE0D3]">
                未病レーダーを作成中
              </div>
              <div className="mt-4 text-[20px] font-black tracking-tight text-slate-900">
                {RADAR_LOADING_HINTS[loadingHintIndex] || RADAR_LOADING_HINTS[0]}
              </div>
              <div className="mt-3 text-[14px] font-bold leading-6 text-slate-600">
                体質と気象の重なりを見て、明日の体調ゆらぎ予報と先回りケアを組み立てています。
              </div>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5">
                <div className="h-full w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-[var(--accent-ink)]/55" />
              </div>
            </div>
          ) : null}

          <div className="h-10 w-full rounded-full bg-slate-100 animate-pulse" />
          <div className="h-48 rounded-[32px] bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-[32px] bg-slate-100 animate-pulse" />
          <div className="h-64 rounded-[32px] bg-slate-100 animate-pulse" />
        </div>
      </AppShell>
    );
  }

  if (needsLocation) {
    return (
      <AppShell title="体調予報" subtitle="地域設定">
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900">位置情報の設定が必要です</div>
          <div className="mt-2 text-[14px] font-bold leading-6 text-slate-600">
            予報を固定保存するために、最初に現在地か生活圏の代表地点を設定してください。
          </div>
        </Module>

        <LocationEditor
          error={error}
          locating={locating}
          savingPreset={savingPreset}
          selectedPresetKey={selectedPresetKey}
          setSelectedPresetKey={setSelectedPresetKey}
          onUseCurrentLocation={useCurrentLocation}
          onSavePresetLocation={savePresetLocation}
          onClose={() => {}}
          showClose={false}
        />

        <Button
          variant="secondary"
          onClick={() => router.push("/check")}
          className="w-full mt-2 bg-white"
        >
          体質チェックへ戻る
        </Button>
      </AppShell>
    );
  }

  if (contentLoading) {
    return (
      <AppShell
        title="体調予報"
        subtitle={targetDateLabel}
        headerRight={
          <button
            onClick={() => setShowLocationEditor(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black tracking-wider text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)] ring-1 ring-inset ring-slate-200 hover:bg-[#FBFCF8] transition-all active:scale-95"
          >
            <IconLocation className="h-4 w-4" /> {locationDisplayLabel}
          </button>
        }
      >
        {showLocationEditor ? (
          <LocationEditor
            error={error}
            locating={locating}
            savingPreset={savingPreset}
            selectedPresetKey={selectedPresetKey}
            setSelectedPresetKey={setSelectedPresetKey}
            onUseCurrentLocation={useCurrentLocation}
            onSavePresetLocation={savePresetLocation}
            onClose={() => {
              setShowLocationEditor(false);
              setError("");
            }}
            showClose
          />
        ) : null}

        <ForecastRecordRail
          tabs={dateTabs}
          activeDate={activeTargetDate}
          onSelect={selectTargetDate}
          recorded={Boolean(activeDateReview)}
          isToday={selectedIsToday}
          onOpenRecords={() => router.push(`/records?tab=${selectedIsToday ? "record" : "analysis"}`)}
        />

        <RadarContentLoadingCards
          mode={selectedIsToday ? "today" : "tomorrow"}
          kind={contentLoadingKind}
          locationLabel={locationDisplayLabel}
        />
      </AppShell>
    );
  }

  if (!bundle || !forecast) {
    return (
      <AppShell title="体調予報" subtitle="予報を読み込めませんでした">
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900">予報を読み込めませんでした</div>
          <div className="mt-2 text-[14px] font-bold leading-6 text-slate-600">
            {error || "時間をおいてもう一度お試しください。"}
          </div>
          <Button
            onClick={() => fetchForecast({ force: true, targetDate: selectedTargetDate || getJstTodayTomorrow().today })}
            className="mt-8 w-full shadow-md"
          >
            再読み込み
          </Button>
        </Module>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="体調予報"
      subtitle={targetDateLabel}
      headerRight={
        <button
          onClick={() => setShowLocationEditor(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black tracking-wider text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)] ring-1 ring-inset ring-slate-200 hover:bg-[#FBFCF8] transition-all active:scale-95"
        >
          <IconLocation className="h-4 w-4" /> {locationDisplayLabel}
        </button>
      }
    >
      {locationNotice ? (
        <div className="rounded-[16px] bg-emerald-50 px-4 py-3 text-[12px] font-extrabold text-emerald-800 ring-1 ring-inset ring-emerald-200 shadow-sm">
          {locationNotice}
        </div>
      ) : null}

      {showLocationEditor ? (
        <LocationEditor
          error={error}
          locating={locating}
          savingPreset={savingPreset}
          selectedPresetKey={selectedPresetKey}
          setSelectedPresetKey={setSelectedPresetKey}
          onUseCurrentLocation={useCurrentLocation}
          onSavePresetLocation={savePresetLocation}
          onClose={() => {
            setShowLocationEditor(false);
            setError("");
          }}
          showClose
        />
      ) : null}

      <ForecastRecordRail
        tabs={dateTabs}
        activeDate={activeTargetDate}
        onSelect={selectTargetDate}
        recorded={Boolean(activeDateReview)}
        isToday={selectedIsToday}
        onOpenRecords={() => router.push(`/records?tab=${selectedIsToday ? "record" : "analysis"}`)}
      />

      <div className="rounded-[20px] bg-white px-4 py-3.5 shadow-sm ring-1 ring-[#D3E1D5]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              今見ている不調
            </div>
            <div className="mt-1 text-[15px] font-black tracking-tight text-slate-900">
              {symptomLabel || "未設定"}
            </div>
            <div className="mt-1 text-[14px] font-bold leading-5 text-slate-500">
              今気になる不調に切り替えて反映できます。
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedSymptomKey(symptomFocus || "");
              setShowSymptomEditor(true);
            }}
            className="shrink-0 rounded-full bg-[#F2F8F4] px-4 py-2 text-[12px] font-black text-[#2F7668] ring-1 ring-[#CFE0D3] shadow-sm active:scale-95"
          >
            変更
          </button>
        </div>
      </div>

      {showSymptomEditor ? (
        <div className="fixed inset-0 z-[95] grid place-items-end bg-[#101827]/40 px-4 pb-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[430px] rounded-[28px] border border-[#DCE7DE] bg-white p-5 shadow-[0_24px_72px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#101827]">今気になる不調を変更</p>
                <p className="mt-1 text-xs font-extrabold leading-relaxed text-[#647386]">
                  体質データはそのままに、予報やトリセツの内容を今見たい不調に合わせて反映し直します。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSymptomEditor(false)}
                aria-label="不調変更を閉じる"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-[#9AA7B6] shadow-sm ring-1 ring-[#DCE7DE]"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {SYMPTOM_OPTIONS.map((option) => {
                const active = selectedSymptomKey === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedSymptomKey(option.value)}
                    className={[
                      "rounded-[18px] px-3 py-3 text-left text-[13px] font-black leading-5 ring-1 transition active:scale-[0.99]",
                      active
                        ? "bg-[#EAF6EF] text-[#24564C] ring-[#9CCBB7] shadow-sm"
                        : "bg-white text-slate-700 ring-slate-200",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={handleSaveActiveSymptomFocus}
              disabled={savingSymptom || !selectedSymptomKey}
              className="mt-5 w-full"
            >
              {savingSymptom ? "反映中…" : "この不調で予報に反映する"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
          {error && !showLocationEditor ? (
            <div className="rounded-[16px] bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
              {error}
            </div>
          ) : null}
          <Module className="relative overflow-hidden p-3.5 sm:p-5">
            <div
              className={[
                "relative overflow-hidden rounded-[30px] px-3.5 py-4 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.28)] sm:px-5 sm:py-5",
                getHeroPanelClass(forecast.signal),
              ].join(" ")}
            >
              <div
                className={[
                  "pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full border bg-gradient-to-br opacity-80 blur-[1px]",
                  getHeroDecorClass(forecast.signal),
                ].join(" ")}
              />
              <div
                className={[
                  "pointer-events-none absolute right-6 top-8 h-28 w-28 rounded-full border opacity-70",
                  getHeroDecorClass(forecast.signal),
                ].join(" ")}
              />
              <div
                className={[
                  "pointer-events-none absolute left-[-36px] bottom-[-80px] h-48 w-56 rounded-full bg-gradient-to-tr opacity-65 blur-2xl",
                  getHeroDecorClass(forecast.signal),
                ].join(" ")}
              />
              <div className="pointer-events-none absolute left-1/2 top-[94px] h-[220px] w-[220px] -translate-x-1/2 rounded-full border border-white/35 opacity-80" />
              <div className="pointer-events-none absolute left-1/2 top-[124px] h-[150px] w-[150px] -translate-x-1/2 rounded-full border border-white/20 opacity-70" />

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-white/78 text-[var(--accent-ink)] ring-1 ring-black/5 shadow-sm shrink-0">
                      <IconRadar className="h-8 w-8" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-black tracking-tight text-slate-900">
                        {scoreCardTitle}
                      </div>
                    </div>
                  </div>

                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-black shadow-sm shrink-0",
                      signalBadgeClass(forecast.signal),
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-2.5 w-2.5 rounded-full",
                        signalDotClass(forecast.signal),
                      ].join(" ")}
                    />
                    {forecastModeLabel}
                  </span>
                </div>

                <div className="mt-3 rounded-[22px] bg-white/72 px-4 py-3 text-[14px] font-extrabold leading-6 text-slate-700 ring-1 ring-black/5 shadow-sm backdrop-blur-sm">
                  {forecastModeLead}
                </div>

                {environmentalCautions.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {environmentalCautions.map((caution) => (
                      <div
                        key={caution.key}
                        className={[
                          "rounded-[20px] px-4 py-3 ring-1 shadow-sm",
                          caution.level === "critical"
                            ? "bg-[#FFF0EC] text-[#9D3F2B] ring-[#F1B9A8]"
                            : "bg-[#FFF7E8] text-[#8A5B16] ring-[#EBCF91]",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2 text-[12px] font-black tracking-[0.08em]">
                          <IconAttention className="h-4 w-4 shrink-0" />
                          <span>体質別予報とは別の気温注意</span>
                        </div>
                        <div className="mt-1 text-[15px] font-black">{caution.label}</div>
                        <div className="mt-1 text-[12px] font-bold leading-5 opacity-85">{caution.detail}</div>
                        {!caution.officialAlert ? (
                          <div className="mt-1.5 text-[10px] font-bold opacity-65">
                            最高・最低気温による独自の注意です。公的な警戒アラートではありません。
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="relative mt-5">
                  <div className="relative mx-auto max-w-[420px] px-1">
                    <ForecastGauge
                      score={forecast.score_display_0_10 ?? forecast.score_precise_0_10 ?? forecast.score_0_10}
                      signal={forecast.signal}
                      animationKey={`${bundle?.target_date || ""}-${forecast.score_display_0_10 ?? forecast.score_precise_0_10 ?? forecast.score_0_10}-${forecast.signal}-${triggerKey}-${coreCode || "guide"}`}
                      coreCode={coreCode}
                      coreLabel={coreLabel?.title || ""}
                    />

                    {weatherLoadGroups.length > 0 ? (
                      <div className="mt-4 rounded-[24px] bg-white/30 px-4 py-3.5 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-18px_28px_rgba(255,255,255,0.20)] backdrop-blur-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-[12px] font-black tracking-[0.14em] text-slate-400">天気負荷と注意時間</div>
                          <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-black/5">
                            高・中・低の目安
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {weatherLoadGroups.map((factor, index) => {
                            const factorPeakStart = factor.peakStart;
                            const factorPeakEnd = factor.peakEnd;
                            const factorPeakLabel = compactPeakLabel(factorPeakStart, factorPeakEnd);
                            const factorShortLabel = WEATHER_LOAD_SHORT_LABELS[factor.group] || factor.label;
                            const loadToneClass = factor.loadLevelTone === "high"
                              ? "text-[#B86430]"
                              : factor.loadLevelTone === "middle"
                                ? "text-[#9A6A16]"
                                : factor.loadLevelTone === "low"
                                  ? "text-[#2F816E]"
                                  : "text-slate-400";

                            return (
                              <div
                                key={`${factor.group}-${index}`}
                                className="grid min-w-0 content-start gap-1.5 rounded-[18px] bg-white px-2 py-2.5 text-center ring-1 ring-[#E4ECE4] shadow-[0_12px_26px_-20px_rgba(15,23,42,0.34)]"
                                title={`${factor.label} 負荷${factor.loadLevelLabel}（${factor.detailLabel}） / 注意時間 ${factorPeakLabel}`}
                              >
                                <div className="flex min-w-0 items-center justify-center gap-1">
                                  <WeatherIcon
                                    triggerKey={factor.key}
                                    direction={factor.direction}
                                    className="h-[22px] w-[22px] shrink-0"
                                  />
                                  <span className="whitespace-nowrap text-[11px] font-black text-slate-600">{factorShortLabel}</span>
                                </div>

                                <div className="flex items-baseline justify-center gap-1 leading-none text-slate-800">
                                  <span className="text-[10px] font-black text-slate-400">負荷</span>
                                  <span className={`text-[22px] font-black tracking-tight ${loadToneClass}`}>
                                    {factor.loadLevelLabel}
                                  </span>
                                </div>
                                <div className="whitespace-nowrap text-[10px] font-extrabold text-slate-400">{factor.detailLabel}</div>

                                <div className="mt-0.5 flex min-w-0 items-center justify-center gap-1 rounded-[11px] bg-[#F7FAF8]/70 px-1.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-[#EEF3EF]">
                                  <IconAttention className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  <span className="whitespace-nowrap">{factorPeakLabel}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[24px] bg-white/30 px-4 py-3.5 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-18px_28px_rgba(255,255,255,0.20)] backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                          {selectedIsToday
                            ? forecast.signal === 0 ? "見ておくポイント" : "出やすいサイン"
                            : forecast.signal === 0 ? "明日見ておくポイント" : "明日出やすいサイン"}
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-black/5">
                          {forecast.signal === 0 ? "小さな影響" : selectedIsToday ? "体感の目安" : "明日の目安"}
                        </span>
                      </div>

                      <div className="mt-2.5 grid gap-2">
                        {bodySigns.map((sign, index) => (
                          <div
                            key={`${sign}-${index}`}
                            className="flex items-start gap-2.5 rounded-[18px] bg-white px-3 py-2.5 ring-1 ring-[#E4ECE4] shadow-[0_12px_26px_-18px_rgba(15,23,42,0.34)]"
                          >
                            <span
                              className={[
                                "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-black text-white shadow-sm",
                                forecast.signal === 2
                                  ? "bg-[#E38949]"
                                  : forecast.signal === 1
                                  ? "bg-[#E2AE45]"
                                  : "bg-[#66B9A3]",
                              ].join(" ")}
                            >
                              {index + 1}
                            </span>
                            <span className="text-[14px] font-extrabold leading-6 text-slate-800">
                              {sign}
                            </span>
                          </div>
                        ))}
                      </div>


                    </div>

                    <div className="rounded-[24px] bg-white/30 px-4 py-3.5 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-18px_28px_rgba(255,255,255,0.20)] backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#2F816E] ring-1 ring-[#CFE7DE] shadow-sm">
                            <IconBolt className="h-5 w-5" />
                          </span>
                          {selectedIsToday ? "注意時間の前に" : "今夜のうちに"}
                        </div>
                        <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-400 ring-1 ring-black/5">
                          先回りケア
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {peakPrepItems.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            className="flex items-start gap-2 rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#E4ECE4] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.32)]"
                          >
                            <span className="mt-[0.38rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-ink)]/45" />
                            <span className="text-[14px] font-extrabold leading-6 text-slate-700">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Module>
          <Module
            className={[
              "p-5 bg-white ring-1 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)]",
              careTone.ring,
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div
                className={[
                  "grid h-12 w-12 shrink-0 place-items-center rounded-[18px] ring-1 shadow-sm",
                  careTone.softSurface,
                  careTone.ink,
                  careTone.ring,
                ].join(" ")}
              >
                {careTab === "eat" ? (
                  <IconBowl className="h-8 w-8" />
                ) : careTab === "live" ? (
                  <IconLifestyle className="h-8 w-8" />
                ) : (
                  <IconRipple className="h-8 w-8" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={["text-[11px] font-black uppercase tracking-widest", careTone.inkSoft].join(" ")}>
                  対策ケア
                </div>
                <div className="mt-1 text-[21px] font-black tracking-tight text-slate-900">
                  {selectedIsToday ? "今日のケア" : "今夜のケア"}
                </div>
                <div className={["mt-1 text-[14px] font-extrabold leading-6", careTone.ink].join(" ")}>
                  {careStrategyTitle}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-end gap-3 rounded-[24px] bg-[#F4FAF7] px-3.5 py-3 ring-1 ring-[#CFE7DE]">
              <GuideBotAvatar
                signal={forecast?.signal ?? 0}
                mood={checkedCareCount > 0 ? "complete" : "normal"}
                className="h-[72px] w-[72px] shrink-0"
              />
              <div className="relative mb-1 min-w-0 flex-1 rounded-[18px] bg-white px-3.5 py-3 ring-1 ring-[#CFE7DE] shadow-sm">
                <span className="absolute -left-1.5 bottom-5 h-3 w-3 rotate-45 border-b border-l border-[#CFE7DE] bg-white" />
                <div className="text-[10px] font-black tracking-[0.14em] text-[#2F816E]/65">ケアナビAI Ekken</div>
                <div className="mt-1 text-[14px] font-bold leading-5 text-slate-600">
                  {selectedIsToday
                    ? sameDayCareCount > 0
                      ? `${checkedCareCount}件を今日に向けたケアとして記録しています（昨晩${previousNightCareCount}件・今日${sameDayCareCount}件）。全部やらなくても大丈夫です。`
                      : previousNightCareCount > 0
                        ? `昨晩のケア${previousNightCareCount}件は、今日への先回りとして記録済みです。今日できたものも「やってみた」で追加できます。`
                        : "実際に試したケアだけ「やってみた」を押すと、今夜の振り返りに残せます。"
                    : checkedCareCount > 0
                      ? `${checkedCareCount}件を明日に向けた先回りケアとして記録しました。全部やらなくても大丈夫です。`
                      : "今夜できたケアを押すと、明日に向けた先回りケアとして記録できます。"}
                </div>
              </div>
            </div>

            {careActionError ? (
              <div className="mt-3 rounded-[16px] bg-[#FFF0EC] px-4 py-3 text-[12px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">
                {careActionError}
              </div>
            ) : null}

            <div
              className={[
                "mt-4 rounded-[24px] px-4 py-4 ring-1",
                careTone.surface,
                careTone.ring,
                careTone.insetShadow,
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={["text-[11px] font-black uppercase tracking-widest", careTone.inkSoft].join(" ")}>
                  この日の方針
                </div>
                <div className={["rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1", careTone.ring].join(" ")}>
                  {symptomFocus ? "体質 × 天気 × 不調" : "体質 × 天気"}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {safeArray(carePolicies?.policies).map((policy) => (
                  <span
                    key={policy.key}
                    className={["inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-black ring-1 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.24)]", careTone.ink, careTone.ring].join(" ")}
                    title={policy.guide || policy.short}
                  >
                    <img src={getPolicyIconPath(policy.key)} alt="" className="h-6 w-6 shrink-0" loading="lazy" />
                    {policy.label}
                  </span>
                ))}
              </div>

              <div className="mt-3 text-[14px] font-bold leading-6 text-slate-700">
                {carePolicies?.summary || careStrategyLead}
              </div>
            </div>

            <div className="mt-4">
              <SegmentedTabs
                tabs={[
                  { key: "live", label: "暮らす", icon: IconLifestyle },
                  { key: "eat", label: "食べる", icon: IconBowl },
                  { key: "loosen", label: "ほぐす", icon: IconRipple },
                ]}
                value={careTab}
                onChange={setCareTab}
              />
            </div>

            {careTab === "loosen" ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    ほぐす
                  </div>
                  <div className="rounded-full bg-[#F6EFF8] px-2.5 py-1 text-[11px] font-black text-[#7B6588] ring-1 ring-[#E2D6E7]">
                    経絡・ツボケア
                  </div>
                </div>

                {lineCare ? (
                  <div className="rounded-[24px] bg-[#F6EFF8] p-4 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(123,101,136,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
                    <div className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#7B6588] ring-1 ring-[#E2D6E7]">
                      今日の一手
                    </div>
                    <div className="mt-3 text-[17px] font-black tracking-tight text-slate-900">
                      {lineCare.title || "体質ラインを軽くゆるめる"}
                    </div>
                    <div className="mt-2 text-[14px] font-extrabold leading-6 text-slate-700">
                      {lineCare.label || lineCare.action}
                    </div>
                    {lineCare.reason ? (
                      <div className="mt-2 text-[14px] font-bold leading-5 text-slate-600">
                        {lineCare.reason} 強さは{lineCare.intensity || "やさしく短く"}で十分です。
                      </div>
                    ) : null}
                    <div className="mt-3 flex justify-end">
                      {actionButtonFor(careItemsByKind.get("tsubo_line_care")?.[0], { compact: true })}
                    </div>
                  </div>
                ) : null}

                {primaryTsubo ? (
                  <div
                    className="relative overflow-hidden rounded-[24px] bg-[#F6EFF8] p-4 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(123,101,136,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)] cursor-pointer transition-all hover:bg-[#FBF8FC]"
                    onClick={() => setSelectedPoint(primaryTsubo)}
                  >
                    <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#7B6588] ring-1 ring-[#E2D6E7] shadow-[0_10px_20px_-16px_rgba(123,101,136,0.30)]">
                      {lineCare ? "ツボなら" : "まずはこれ"}
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-white text-[#7B6588] shadow-sm ring-1 ring-[#E2D6E7]"
                        title={getTsuboRegionIconLabel(primaryTsubo)}
                        aria-label={getTsuboRegionIconLabel(primaryTsubo)}
                      >
                        <TsuboRegionIcon point={primaryTsubo} className="h-[52px] w-[52px]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-[22px] font-black tracking-tight text-slate-900">
                            {primaryTsubo.name_ja || primaryTsubo.code}
                          </div>
                          {getPointReading(primaryTsubo) ? (
                            <div className="shrink-0 text-[12px] font-black tracking-wider text-slate-400">
                              {getPointReading(primaryTsubo)}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-2 text-[14px] font-extrabold leading-6 text-slate-700">
                          {getPointRoleSummary(primaryTsubo)}
                        </div>
                      </div>

                      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 shrink-0 text-slate-300" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>

                    <div className="mt-3 flex justify-end">
                      {actionButtonFor(careItemsByKind.get("tsubo_point")?.[0], { stopPropagation: true })}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-[#E8DFEB]">
                        {getTsuboRoleLabel(primaryTsubo, 0)}
                      </span>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-[#E8DFEB]">
                        タップでほぐし方
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[22px] bg-[#F6EFF8] px-5 py-5 text-[14px] font-bold leading-6 text-slate-600 ring-1 ring-inset ring-[#E2D6E7]">
                    体質データに合わせたツボを準備しています。
                  </div>
                )}

                {carePlan?.night_note ? (
                  <div className="rounded-[18px] bg-white px-4 py-3 text-[14px] font-extrabold leading-6 text-slate-600 ring-1 ring-[#E8DFEB] shadow-sm">
                    <span className="mr-2 text-[#7B6588]">ひとこと</span>
                    {carePlan.night_note}
                  </div>
                ) : null}

                {extraTsuboPoints.length > 0 ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setTsuboExtraOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-[18px] bg-white px-4 py-3 ring-1 ring-[#E2D6E7] text-left shadow-sm transition-all hover:bg-[#F6EFF8]"
                    >
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                          ほかの候補
                        </div>
                        <div className="mt-1 text-[13px] font-black tracking-tight text-slate-900">
                          あと{extraTsuboPoints.length}点を見る
                        </div>
                      </div>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className={[
                          "h-7 w-7 text-slate-400 transition-transform",
                          tsuboExtraOpen ? "rotate-180" : "",
                        ].join(" ")}
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {tsuboExtraOpen ? (
                      <div className="mt-3 space-y-2">
                        {extraTsuboPoints.map((p, i) => (
                          <div
                            key={`${p.code}-${i + 1}`}
                            className="relative rounded-[20px] bg-[#F6EFF8] p-4 ring-1 ring-inset ring-[#E2D6E7] transition-all hover:bg-white cursor-pointer"
                            onClick={() => setSelectedPoint(p)}
                          >
                            <div className="flex items-center gap-3 pr-8">
                              <div
                                className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-white text-[#7B6588] shadow-sm ring-1 ring-[#E2D6E7]"
                                title={getTsuboRegionIconLabel(p)}
                                aria-label={getTsuboRegionIconLabel(p)}
                              >
                                <TsuboRegionIcon point={p} className="h-10 w-10" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="truncate text-[16px] font-black tracking-tight text-slate-900">
                                    {p.name_ja || p.code}
                                  </div>
                                  {getPointReading(p) ? (
                                    <div className="shrink-0 text-[11px] font-black tracking-wider text-slate-400">
                                      {getPointReading(p)}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-[12px] font-black text-[#7B6588]/75">
                                  {getTsuboRoleLabel(p, i + 1)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex justify-end pr-8">
                              {actionButtonFor(careItemsByKind.get("tsubo_point")?.[i + 1], { compact: true, stopPropagation: true })}
                            </div>

                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {selectedIsToday ? <PurchasedCareItemsPanel items={purchasedCareItemsByCategory.point} renderActionButton={actionButtonFor} /> : null}
                <CareSetNaviBridge
                  title={selectedIsToday ? "このツボケアに合う道具を見る" : "明日に使うほぐし道具を見ておく"}
                  lead={selectedIsToday
                    ? loosenItemHint || "表示中のツボや部位ケアに合わせて、お灸・ツボ押し棒・温熱/ほぐし道具の候補を見られます。"
                    : loosenItemHint || "明日の予報に合わせて、注意時間の前に使いやすい温熱・ほぐし系アイテムの候補を見ておけます。"}
                  buttonLabel={selectedIsToday ? "ツボケアに合う候補を見る" : "明日のほぐし候補を見る"}
                  toneKey="loosen"
                  onClick={() => router.push(buildCareNaviUrl("point"))}
                />
              </div>
            ) : null}

            {careTab === "eat" ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    食べる
                  </div>
                  <div className="rounded-full bg-[#FFF5E6] px-2.5 py-1 text-[11px] font-black text-[#A56C18] ring-1 ring-[#EED8B4]">
                    食養生
                  </div>
                </div>

                <div className="rounded-[24px] bg-[#FFF5E6] px-4 py-4 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(165,108,24,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
                  <div className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#A56C18] ring-1 ring-[#EED8B4] shadow-[0_10px_20px_-16px_rgba(165,108,24,0.30)]">
                    {food.badge || "まずはこれ"}
                  </div>

                  <div className="mt-3 text-[17px] font-black tracking-tight text-slate-900">
                    {food.display_compact
                      ? (selectedIsToday ? "今日の食べる一手" : "今夜〜明朝の食べる一手")
                      : food.title || sectionLabels.foodTitle || `${getDateModeLabel(bundleDateMode)}の食養生`}
                  </div>


                  {foodContextChips.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {foodContextChips.map((chip, idx) => (
                        <span
                          key={`${chip}-${idx}`}
                          className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-[#A56C18]/80 ring-1 ring-[#EED8B4]"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {food.recommendation || food.focus ? (
                    <div className="mt-3 text-[14px] font-extrabold leading-6 text-[var(--accent-ink)]">
                      {food.recommendation || food.focus}
                    </div>
                  ) : null}

                  {hasFoodActionCards ? (
                    <div className="mt-4 space-y-2.5">
                      {visiblePrimaryFoodCards.map((card, idx) => {
                        const marker = card.key === "add" ? "＋" : card.key === "drink" ? "茶" : card.key === "caution" ? "−" : "○";
                        const markerClass = card.key === "caution"
                          ? "bg-[#FFF0EA] text-[#B75C3E] ring-[#F1C8BA]"
                          : card.key === "drink"
                            ? "bg-[#FFFBF4] text-[#A56C18] ring-[#EED8B4]"
                            : card.key === "choice"
                              ? "bg-white text-[#A56C18] ring-[#EED8B4]"
                              : "bg-[#E2AE45] text-white ring-[#EED8B4]";

                        return (
                          <div
                            key={card.key || `${card.label}-${idx}`}
                            className="rounded-[20px] bg-white px-4 py-3.5 ring-1 ring-[#F0E2CA] shadow-[0_12px_28px_-22px_rgba(165,108,24,0.28)]"
                          >
                            <div className="flex items-start gap-3">
                              <div className={[
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-black ring-1",
                                markerClass,
                              ].join(" ")}>
                                {marker}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-black tracking-tight text-slate-900">
                                  {card.label}
                                </div>
                                {card.body ? (
                                  <div className="mt-1.5 text-[14px] font-bold leading-5 text-slate-600">
                                    {card.body}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {safeArray(card.items).length > 0 ? (
                              <div className="mt-3 space-y-2 pl-11">
                                {safeArray(card.items).map((item, itemIdx) => {
                                  const itemAction = card.key === "caution"
                                    ? null
                                    : careItemsByKind.get(`food_${card.key || "card"}_item`)?.[itemIdx];
                                  return (
                                    <div
                                      key={`${card.key}-${item}-${itemIdx}`}
                                      className="flex items-center justify-between gap-2 rounded-[15px] bg-[#FFF5E6] px-3 py-2 text-[12px] font-extrabold text-slate-700 ring-1 ring-[#F1E5D1]"
                                    >
                                      <span className="min-w-0 flex-1 leading-5">{item}</span>
                                      {itemAction ? actionButtonFor(itemAction, { compact: true }) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                            {card.key === "caution" || safeArray(card.items).length === 0 ? (
                              <div className="mt-3 flex justify-end">
                                {actionButtonFor(careItemsByKind.get(`food_${card.key || "card"}`)?.[0], { compact: true })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {!hasFoodActionCards && foodExamples.length > 0 ? (
                    <div className="mt-4">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                        {food.examples_label || "例"}
                      </div>
                      <div className="mt-2 space-y-2">
                        {foodExamples.map((x, idx) => (
                          <div
                            key={`${x}-${idx}`}
                            className="flex items-center justify-between gap-2 rounded-[15px] bg-white px-3 py-2 text-[12px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[#F1E5D1]"
                          >
                            <span className="min-w-0 flex-1 leading-5">{x}</span>
                            {actionButtonFor(careItemsByKind.get("food_example_item")?.[idx], { compact: true })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!hasFoodActionCards && foodExamples.length === 0 ? (
                    <div className="mt-3 flex justify-end">
                      {actionButtonFor(careItemsByKind.get("food_plan")?.[0], { compact: true })}
                    </div>
                  ) : null}

                  {hasFoodDetails ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setFoodDetailOpen((v) => !v)}
                        className="flex w-full items-center justify-between rounded-[18px] bg-white px-4 py-3 ring-1 ring-[#EED8B4] text-left shadow-sm"
                      >
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            {food.detail_eyebrow || "ほかの選び方"}
                          </div>
                          <div className="mt-1 text-[13px] font-black tracking-tight text-slate-900">
                            {food.detail_title || "別案・飲み物・選んだ理由"}
                          </div>
                        </div>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className={[
                            "h-7 w-7 text-slate-400 transition-transform",
                            foodDetailOpen ? "rotate-180" : "",
                          ].join(" ")}
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>

                      {foodDetailOpen ? (
                        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                          {!hasFoodActionCards && food.how_to ? (
                            <div>
                              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                {food.how_to_label || "取り入れ方"}
                              </div>
                              <div className="mt-1.5 text-[14px] font-bold leading-6 text-slate-700">
                                {food.how_to}
                              </div>
                            </div>
                          ) : null}

                          {!hasFoodActionCards && food.avoid ? (
                            <div>
                              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                {food.avoid_label || "控えたいこと"}
                              </div>
                              <div className="mt-1.5 text-[14px] font-bold leading-6 text-slate-700">
                                {food.avoid}
                              </div>
                            </div>
                          ) : null}

                          {secondaryFoodCards.length > 0 ? (
                            <div className="space-y-2.5">
                              {secondaryFoodCards.map((card, cardIndex) => (
                                <div key={`${card.key || "detail"}-${cardIndex}`} className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-[#F0E2CA] shadow-sm">
                                  <div className="text-[12px] font-black text-[#A56C18]">{card.label}</div>
                                  {card.body ? <div className="mt-1 text-[14px] font-bold leading-5 text-slate-600">{card.body}</div> : null}
                                  {safeArray(card.items).length > 0 ? (
                                    <div className="mt-2 space-y-2">
                                      {safeArray(card.items).map((item, itemIndex) => (
                                        <div key={`${card.key}-${itemIndex}`} className="flex items-center justify-between gap-2 rounded-[14px] bg-[#FFF5E6] px-3 py-2 text-[12px] font-extrabold text-slate-700 ring-1 ring-[#F1E5D1]">
                                          <span className="min-w-0 flex-1 leading-5">{item}</span>
                                          {card.key !== "caution"
                                            ? actionButtonFor(careItemsByKind.get(`food_${card.key || "card"}_item`)?.[itemIndex], { compact: true })
                                            : null}
                                        </div>
                                      ))}
                                    </div>
                                  ) : card.key === "caution" ? (
                                    <div className="mt-2 flex justify-end">
                                      {actionButtonFor(careItemsByKind.get("food_caution")?.[0], { compact: true })}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {food.reason ? (
                            <div>
                              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                {food.reason_label || "ひとこと理由"}
                              </div>
                              <div className="mt-1.5 text-[14px] font-bold leading-6 text-slate-700">
                                {food.reason}
                              </div>
                            </div>
                          ) : null}

                          {food.lifestyle_tip ? (
                            <div className="rounded-[18px] bg-white px-4 py-4 ring-1 ring-[var(--ring)] shadow-sm">
                              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                {food.lifestyle_tip_label || "一緒に意識したいこと"}
                              </div>
                              <div className="mt-1.5 text-[14px] font-bold leading-6 text-slate-700">
                                {food.lifestyle_tip}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {selectedIsToday ? <PurchasedCareItemsPanel items={purchasedCareItemsByCategory.eat} renderActionButton={actionButtonFor} /> : null}
                <CareSetNaviBridge
                  title={selectedIsToday ? "この食べ方に合う候補を見る" : "明日の食べ方候補を見ておく"}
                  lead={selectedIsToday
                    ? eatItemHint || "表示中の食べ方に合わせて、飲み物・汁物・素材系アイテムの候補を見られます。"
                    : eatItemHint || "明日の予報と季節に合わせて、飲み物・汁物・素材系アイテムの候補を先に見ておけます。"}
                  buttonLabel={selectedIsToday ? "食べ方に合う候補を見る" : "明日の食べ方候補を見る"}
                  toneKey="eat"
                  onClick={() => router.push(buildCareNaviUrl("eat"))}
                />
              </div>
            ) : null}

            {careTab === "live" ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    暮らす
                  </div>
                  <div className="rounded-full bg-[#EAF7F1] px-2.5 py-1 text-[11px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">
                    生活ケア
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] bg-[#EAF7F1] ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(37,95,79,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
                  <div className="px-4 py-4">
                    <div className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE] shadow-[0_10px_20px_-16px_rgba(37,95,79,0.30)]">
                      まずはこれ
                    </div>
                    <div className="mt-3 text-[17px] font-black tracking-tight text-slate-900">
                      {lifestylePlan.title}
                    </div>
                    <div className="mt-2 text-[14px] font-bold leading-6 text-slate-700">
                      {lifestylePlan.lead}
                    </div>
                  </div>

                  <div className="border-t border-white/70 bg-[#F4FAF7] px-4 py-4">
                    <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      {selectedIsToday ? "今日の一手" : "今夜の一手"}
                    </div>
                    <div className="mt-3 rounded-[17px] bg-white px-4 py-3 ring-1 ring-[#E1E6E1] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.30)]">
                      <div className="flex items-start gap-3">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#66B9A3] text-[12px] font-black text-white ring-1 ring-[#CFE7DE] shadow-sm">1</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-extrabold leading-6 text-slate-700">
                            {lifestylePrimaryAction?.label || safeArray(lifestylePlan.steps)[0]}
                          </div>
                          {lifestylePrimaryAction?.reason ? (
                            <div className="mt-1 text-[14px] font-bold leading-5 text-slate-500">{lifestylePrimaryAction.reason}</div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        {actionButtonFor(careItemsByKind.get("lifestyle_step")?.[0], { compact: true })}
                      </div>
                    </div>

                    {(lifestyleAlternatives.length > 0 || lifestylePlan.trap) ? (
                      <details className="mt-3 rounded-[17px] bg-white ring-1 ring-[#E1E6E1]">
                        <summary className="cursor-pointer px-4 py-3 text-[12px] font-black text-[#2F816E]">別案・気をつけたいこと</summary>
                        <div className="space-y-2 border-t border-[#E1E6E1] px-4 py-3">
                          {lifestyleAlternatives.map((item, idx) => (
                            <div key={item.id || `${idx}-${item.label}`} className="flex items-center justify-between gap-2 rounded-[14px] bg-[#F4FAF7] px-3 py-2">
                              <span className="min-w-0 flex-1 text-[13px] font-extrabold leading-5 text-slate-700">{item.label}</span>
                              {actionButtonFor(careItemsByKind.get("lifestyle_step")?.[idx + 1], { compact: true })}
                            </div>
                          ))}
                          {lifestylePlan.trap ? (
                            <div className="rounded-[14px] bg-[#FFF9ED] px-3 py-2 text-[14px] font-bold leading-5 text-slate-600 ring-1 ring-[#EAD8A6]">
                              {lifestylePlan.trap}
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </div>
                {selectedIsToday ? <PurchasedCareItemsPanel items={purchasedCareItemsByCategory.live} renderActionButton={actionButtonFor} /> : null}
                <CareSetNaviBridge
                  title={selectedIsToday ? "この暮らしケアに合う道具を見る" : "明日に使う暮らし道具を見ておく"}
                  lead={selectedIsToday
                    ? liveItemHint || "表示中の生活ケアに合わせて、温める・休む・眠る・湿度を整える道具の候補を見られます。"
                    : liveItemHint || "明日の予報と季節に合わせて、温める・休む・眠る・湿度を整える道具の候補を先に見ておけます。"}
                  buttonLabel={selectedIsToday ? "暮らしケアに合う候補を見る" : "明日の暮らし候補を見る"}
                  toneKey="live"
                  onClick={() => router.push(buildCareNaviUrl("live"))}
                />
              </div>
            ) : null}
          </Module>


          <Module className="p-5 bg-[#EEF6F0] ring-1 ring-[#CFE3DA] shadow-[0_18px_42px_-32px_rgba(37,95,79,0.34)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/60">
                  ベースとなるあなたの体質
                </div>

                <div className="mt-3 flex items-start gap-3">
                  <div className="grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-[20px] bg-white p-1.5 ring-1 ring-[#CFE0D3] shadow-sm shrink-0">
                    <CoreIllust
                      code={coreCode}
                      title={coreLabel?.title || "体質タイプ"}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[22px] font-black tracking-tight text-[var(--accent-ink)] leading-[1.15]">
                      {coreLabel?.title || "—"}
                    </div>

                    {subLabelObjects?.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {subLabelObjects.map((s) => (
                          <span
                            key={s.code}
                            className="rounded-md bg-white/80 px-2.5 py-1 text-[12px] font-extrabold text-[#24564C] ring-1 ring-inset ring-[#CFE0D3]"
                          >
                            {s.short}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {symptomLabel ? (
                    <div className="rounded-[16px] bg-white/90 px-4 py-3 ring-1 ring-[#CFE0D3] shadow-sm">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                        お困りの不調
                      </div>
                      <div className="mt-1 text-[14px] font-black tracking-tight text-slate-900">
                        {symptomLabel}
                      </div>
                    </div>
                  ) : null}

                  {primaryLine ? (
                    <div className="rounded-[16px] bg-white/90 px-4 py-3 ring-1 ring-[#CFE0D3] shadow-sm">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                        負担が出やすいライン
                      </div>
                      <div className="mt-1 text-[14px] font-black tracking-tight text-slate-900">
                        {primaryLine.title}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={openLatestResultDetail}
                disabled={openingProfileDetail}
                className="shrink-0 bg-white ring-1 ring-[#CFE0D3] shadow-sm text-slate-700"
              >
                {openingProfileDetail ? "開いています…" : "詳しく見る"}
              </Button>
            </div>
          </Module>
      </div>


      {selectedPoint ? (
        <PointDetailSheet
          point={selectedPoint}
          reasonLoading={pointReasonLoading}
          onClose={() => setSelectedPoint(null)}
        />
      ) : null}

      <div className="pb-4 pt-2 text-[12px] font-extrabold leading-5 text-slate-400 text-center px-4">
        ※ 未病レーダーはセルフケア支援です。強い症状がある場合は無理をせず、必要に応じて医療機関に相談してください。
      </div>
    </AppShell>
  );
}
