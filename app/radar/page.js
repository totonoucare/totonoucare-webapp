// app/radar/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell, { Module } from "@/components/layout/AppShell";
import { CoreIllust } from "@/components/illust/core";
import Button from "@/components/ui/Button";
import { WeatherIcon } from "@/components/illust/icons/weather";
import {
  IconBolt,
  IconRadar,
  IconRipple,
  IconBowl,
} from "@/components/illust/icons/result";
import {
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
  SYMPTOM_LABELS,
} from "@/lib/diagnosis/v2/labels";
import { ForecastGauge } from "./ForecastGauge";
import {
  ForecastDateRail,
  LocationEditor,
  PointDetailSheet,
  SegmentedTabs,
} from "./RadarPageComponents";
import {
  FLAT_PRESETS,
  RADAR_LOADING_HINTS,
  buildRadarDateTabs,
  buildScoreCardTitle,
  buildTodayCarePlan,
  formatTargetDate,
  deriveCarePolicies,
  getCareStrategyLead,
  getCareStrategyTitle,
  getDateModeLabel,
  getForecastBackgroundFactors,
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

/* -----------------------------
 * Main Page
 * ---------------------------- */

function normalizeRadarTargetDate(date) {
  const { today, tomorrow } = getJstTodayTomorrow();
  return date === today ? today : tomorrow;
}

function RadarContentLoadingCards({ mode = "today", kind = "forecast", locationLabel = "" }) {
  const isLocationRefresh = kind === "location";
  const title = isLocationRefresh
    ? "地域の予報を更新中"
    : mode === "today"
      ? "今日の過ごし方を確認中"
      : "明日の過ごし方を確認中";
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
          <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-black tracking-[0.16em] text-[#47786C] ring-1 ring-[#CFE0D3]">
            LOADING
          </div>
          <div className="mt-4 text-[22px] font-black tracking-tight text-slate-900">
            {title}
          </div>
          <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
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
  const riskContext = getRiskContext(bundle);
  const todayCarePlan = useMemo(
    () => (selectedIsToday ? buildTodayCarePlan({ forecast, riskContext }) : null),
    [selectedIsToday, forecast, riskContext],
  );
  const carePlan = selectedIsToday ? todayCarePlan : bundle?.care_plan || null;
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
  const symptomFocus = riskContext?.constitution_context?.symptom_focus || null;
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
    () => getForecastModeLead(triggerFactors, forecast?.signal ?? 0, displayDateMode),
    [triggerFactors, forecast?.signal, displayDateMode]
  );
  const bodySigns = useMemo(
    () => getForecastBodySigns(triggerFactors, forecast?.signal ?? 0),
    [triggerFactors, forecast?.signal]
  );
  const peakPrepItems = useMemo(
    () => getForecastPeakPrepItems(triggerFactors, forecast?.signal ?? 0),
    [triggerFactors, forecast?.signal]
  );
  const backgroundFactors = useMemo(
    () => getForecastBackgroundFactors(triggerFactors),
    [triggerFactors]
  );
  const careTriggerFactors = useMemo(() => getForecastTriggerFactors(activeCareForecast), [activeCareForecast]);
  const careTriggerKey = careTriggerFactors[0]?.key || getForecastTriggerKey(activeCareForecast);
  const secondaryCareTriggerKey = careTriggerFactors[1]?.key || null;
  const careStrategyTitle = useMemo(
    () => getCareStrategyTitle(careTriggerKey, activeCareForecast?.signal ?? 0, selectedIsToday ? "today" : "tomorrow"),
    [careTriggerKey, activeCareForecast?.signal, selectedIsToday]
  );
  const careStrategyLead = useMemo(
    () => getCareStrategyLead(careTriggerFactors, activeCareForecast?.signal ?? 0, selectedIsToday ? "today" : "tomorrow"),
    [careTriggerFactors, activeCareForecast?.signal, selectedIsToday]
  );
  const carePolicies = useMemo(
    () =>
      deriveCarePolicies({
        forecast: activeCareForecast,
        triggerFactors: careTriggerFactors,
        riskContext,
        mode: selectedIsToday ? "today" : "tomorrow",
      }),
    [activeCareForecast, careTriggerFactors, riskContext, selectedIsToday]
  );
  const derivedLifestylePlan = useMemo(
    () => getLifestylePlan(careTriggerKey, secondaryCareTriggerKey, activeCareForecast?.signal ?? 0, selectedIsToday ? "today" : "tomorrow"),
    [careTriggerKey, secondaryCareTriggerKey, activeCareForecast?.signal, selectedIsToday]
  );
  const lifestylePlan = carePlan?.lifestyle_plan || derivedLifestylePlan;
  const primaryTsubo = tsuboPoints[0] || null;
  const extraTsuboPoints = tsuboPoints.slice(1);
  const foodExamples = safeArray(food.examples);
  const hasFoodDetails =
    !!food.how_to || !!food.avoid || !!food.reason || !!food.lifestyle_tip;
  const pointReasonLoading = false;

  useEffect(() => {
    if (!selectedPoint) return;

    const currentPoints = safeArray(bundle?.care_plan?.night_tsubo_set?.points);
    const refreshedPoint = currentPoints.find((p) => p?.code === selectedPoint?.code);

    if (refreshedPoint && refreshedPoint !== selectedPoint) {
      setSelectedPoint(refreshedPoint);
    }
  }, [bundle?.care_plan?.night_tsubo_set?.points, selectedPoint]);


  useEffect(() => {
    if (!symptomFocus) return;
    setSelectedSymptomKey((current) => current || symptomFocus);
  }, [symptomFocus]);

  async function handleSaveActiveSymptomFocus() {
    const nextSymptom = selectedSymptomKey || symptomFocus;
    if (!nextSymptom || nextSymptom === symptomFocus) {
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
      <AppShell title="未病予報" subtitle="ログインが必要です">
        <Module className="overflow-hidden p-0 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
          <div className="relative px-6 py-7 bg-[linear-gradient(135deg,#F5FBF7_0%,#FFF8E8_100%)]">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/70 blur-2xl" />
            <div className="relative z-10 inline-flex rounded-full bg-white/85 px-3 py-1 text-[11px] font-black tracking-wide text-[#255F4F] ring-1 ring-[#CFE0D3] shadow-sm">
              ログイン後に使えます
            </div>
            <div className="relative z-10 mt-4 text-[22px] font-black tracking-tight text-slate-900 leading-snug">
              あなたの体質に合わせた
              <br />
              明日の未病予報を表示します。
            </div>
            <div className="relative z-10 mt-3 text-[13px] font-bold leading-6 text-slate-600">
              未病予報ページでは、体質チェックの結果と地域の気圧・気温・湿度を組み合わせて、明日の崩れやすさと先回りケアを出します。
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid gap-2.5 text-[13px] font-bold leading-6 text-slate-600">
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
      <AppShell title="未病予報" subtitle="読み込み中…" headerRight={<div className="h-8 w-24 bg-slate-100 rounded-full animate-pulse" />}>
        <div className="space-y-6 pt-4">
          {showSlowLoadingMessage ? (
            <div className="rounded-[32px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_74%)] px-6 py-7 shadow-sm">
              <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-black tracking-wide text-[#255F4F] ring-1 ring-[#CFE0D3]">
                未病レーダーを作成中
              </div>
              <div className="mt-4 text-[20px] font-black tracking-tight text-slate-900">
                {RADAR_LOADING_HINTS[loadingHintIndex] || RADAR_LOADING_HINTS[0]}
              </div>
              <div className="mt-3 text-[13px] font-bold leading-6 text-slate-600">
                体質と気象の重なりを見て、明日の崩れやすさと先回りケアを組み立てています。
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
      <AppShell title="未病予報" subtitle="地域設定">
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900">位置情報の設定が必要です</div>
          <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
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
        title="未病予報"
        subtitle={targetDateLabel}
        headerRight={
          <button
            onClick={() => setShowLocationEditor(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-black tracking-wider text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)] ring-1 ring-inset ring-slate-200 hover:bg-[#FBFCF8] transition-all active:scale-95"
          >
            <span className="text-[14px]">📍</span> {locationDisplayLabel}
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

        <ForecastDateRail
          tabs={dateTabs}
          activeDate={activeTargetDate}
          onSelect={selectTargetDate}
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
      <AppShell title="未病予報" subtitle="予報を読み込めませんでした">
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900">予報を読み込めませんでした</div>
          <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
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
      title="未病予報"
      subtitle={targetDateLabel}
      headerRight={
        <button
          onClick={() => setShowLocationEditor(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-black tracking-wider text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)] ring-1 ring-inset ring-slate-200 hover:bg-[#FBFCF8] transition-all active:scale-95"
        >
          <span className="text-[14px]">📍</span> {locationDisplayLabel}
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

      <ForecastDateRail
        tabs={dateTabs}
        activeDate={activeTargetDate}
        onSelect={selectTargetDate}
      />

      <div className="rounded-[20px] bg-white px-4 py-3.5 shadow-sm ring-1 ring-[#D3E1D5]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              今見ている不調
            </div>
            <div className="mt-1 text-[15px] font-black tracking-tight text-slate-900">
              {symptomLabel || "未設定"}
            </div>
            <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
              体質はそのまま、不調の文脈だけ切り替えて予報に反映します。
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
                  体質タイプの計算は変えず、予報・カルテの不調文脈に反映します。
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
                        ? "bg-[#EAF6EF] text-[#255F4F] ring-[#9CCBB7] shadow-sm"
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
                      <IconRadar className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-black tracking-tight text-slate-900">
                        {scoreCardTitle}
                      </div>
                      <div className="mt-1 text-[11px] font-black tracking-[0.16em] text-slate-400">
                        DAILY CARE
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

                <div className="mt-3 rounded-[22px] bg-white/72 px-4 py-3 text-[13px] font-extrabold leading-6 text-slate-700 ring-1 ring-black/5 shadow-sm backdrop-blur-sm">
                  {forecastModeLead}
                </div>

                <div className="relative mt-5">
                  <div className="relative mx-auto max-w-[420px] px-1">
                    <ForecastGauge
                      score={forecast.score_0_10}
                      signal={forecast.signal}
                      animationKey={`${bundle?.target_date || ""}-${forecast.score_0_10}-${forecast.signal}-${triggerKey}`}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[24px] bg-white/30 px-4 py-3.5 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-18px_28px_rgba(255,255,255,0.20)] backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          出やすいサイン
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-black/5">
                          体感の目安
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
                            <span className="text-[13px] font-extrabold leading-6 text-slate-800">
                              {sign}
                            </span>
                          </div>
                        ))}
                      </div>

                      {backgroundFactors.length > 0 ? (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-[10px] font-black text-slate-400">背景</span>
                          {backgroundFactors.map((factor, index) => (
                            <span
                              key={`${factor.key}-${index}`}
                              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-[#E4ECE4] shadow-[0_10px_20px_-16px_rgba(15,23,42,0.28)]"
                            >
                              <WeatherIcon triggerKey={factor.key} className="h-4 w-4" />
                              {factor.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[24px] bg-white/30 px-4 py-3.5 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-18px_28px_rgba(255,255,255,0.20)] backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[var(--accent-ink)] ring-1 ring-black/5 shadow-sm">
                            <IconBolt className="h-4 w-4" />
                          </span>
                          {selectedIsToday ? "山場前に" : "明日の山場前に"}
                        </div>
                        <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-black/5">
                          {forecast.peak_start && forecast.peak_end
                            ? `山場：${String(forecast.peak_start).slice(0, 5)}–${String(
                                forecast.peak_end
                              ).slice(0, 5)}`
                            : "山場：—"}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {peakPrepItems.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            className="flex items-start gap-2 rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#E4ECE4] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.32)]"
                          >
                            <span className="mt-[0.38rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-ink)]/45" />
                            <span className="text-[12px] font-extrabold leading-5 text-slate-700">
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
          <Module className="p-5 bg-white ring-1 ring-[#D3E1D5] shadow-[0_18px_42px_-32px_rgba(37,95,79,0.30)]">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#E2F1EA] text-[#255F4F] ring-1 ring-[#BFD9CC] shadow-sm">
                {careTab === "eat" ? (
                  <IconBowl className="h-7 w-7" />
                ) : careTab === "live" ? (
                  <IconBolt className="h-7 w-7" />
                ) : (
                  <IconRipple className="h-7 w-7" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#255F4F]/60">
                  DAILY CARE
                </div>
                <div className="mt-1 text-[21px] font-black tracking-tight text-slate-900">
                  {selectedIsToday ? "今日のケア" : "今夜のケア"}
                </div>
                <div className="mt-1 text-[12px] font-extrabold leading-5 text-[var(--accent-ink)]/85">
                  {careStrategyTitle}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-[#F7FAF7]/75 px-4 py-4 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(37,95,79,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#255F4F]/65">
                  この日の方針
                </div>
                <div className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-[#D3E1D5]">
                  体質 × 天気
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {safeArray(carePolicies?.policies).map((policy) => (
                  <span
                    key={policy.key}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-black text-[#255F4F] ring-1 ring-[#BFD9CC] shadow-[0_10px_22px_-16px_rgba(37,95,79,0.32)]"
                    title={policy.short}
                  >
                    <span className="h-2 w-2 rounded-full bg-[#66B9A3] shadow-[0_0_10px_rgba(102,185,163,0.22)]" />
                    {policy.label}
                  </span>
                ))}
              </div>

              <div className="mt-3 text-[13px] font-bold leading-6 text-slate-700">
                {carePolicies?.summary || careStrategyLead}
              </div>
            </div>

            <div className="mt-4">
              <SegmentedTabs
                tabs={[
                  { key: "live", label: "暮らす" },
                  { key: "eat", label: "食べる" },
                  { key: "loosen", label: "ほぐす" },
                ]}
                value={careTab}
                onChange={setCareTab}
              />
            </div>

            {careTab === "loosen" ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    ほぐす
                  </div>
                  <div className="rounded-full bg-[#F7FAF7] px-2.5 py-1 text-[10px] font-black text-[#255F4F] ring-1 ring-[#D3E1D5]">
                    ツボケア
                  </div>
                </div>

                {primaryTsubo ? (
                  <div
                    className="relative overflow-hidden rounded-[24px] bg-[#F7FAF7]/75 p-4 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(37,95,79,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)] cursor-pointer transition-all hover:bg-[#F9FCFA]"
                    onClick={() => setSelectedPoint(primaryTsubo)}
                  >
                    <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#255F4F] ring-1 ring-[#CFE0D3] shadow-[0_10px_20px_-16px_rgba(37,95,79,0.30)]">
                      まずはこれ
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-white text-[16px] font-black text-[#255F4F] shadow-sm ring-1 ring-[#CFE0D3]">
                        {primaryTsubo.code}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-[22px] font-black tracking-tight text-slate-900">
                            {primaryTsubo.name_ja || primaryTsubo.code}
                          </div>
                          {getPointReading(primaryTsubo) ? (
                            <div className="shrink-0 text-[11px] font-black tracking-wider text-slate-400">
                              {getPointReading(primaryTsubo)}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-2 text-[13px] font-extrabold leading-6 text-slate-700">
                          {getPointRoleSummary(primaryTsubo)}
                        </div>
                      </div>

                      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 shrink-0 text-slate-300" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black text-slate-500 ring-1 ring-[#E1E6E1]">
                        {getTsuboRoleLabel(primaryTsubo, 0)}
                      </span>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black text-slate-500 ring-1 ring-[#E1E6E1]">
                        タップで押し方
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[22px] bg-[#F7FAF7] px-5 py-5 text-[13px] font-bold leading-6 text-slate-600 ring-1 ring-inset ring-[#D3E1D5]">
                    体質データに合わせたツボを準備しています。
                  </div>
                )}

                {carePlan?.night_note ? (
                  <div className="rounded-[18px] bg-white px-4 py-3 text-[12px] font-extrabold leading-5 text-slate-600 ring-1 ring-[#E1E6E1] shadow-sm">
                    <span className="mr-2 text-[#255F4F]">ひとこと</span>
                    {carePlan.night_note}
                  </div>
                ) : null}

                {extraTsuboPoints.length > 0 ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setTsuboExtraOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-[18px] bg-white px-4 py-3 ring-1 ring-[#D3E1D5] text-left shadow-sm transition-all hover:bg-[#F7FAF7]"
                    >
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                            className="relative rounded-[20px] bg-[#F7FAF7] p-4 ring-1 ring-inset ring-[#D3E1D5] transition-all hover:bg-white cursor-pointer"
                            onClick={() => setSelectedPoint(p)}
                          >
                            <div className="flex items-center gap-3 pr-8">
                              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-white text-[13px] font-black text-[#255F4F] shadow-sm ring-1 ring-[#CFE0D3]">
                                {p.code}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="truncate text-[16px] font-black tracking-tight text-slate-900">
                                    {p.name_ja || p.code}
                                  </div>
                                  {getPointReading(p) ? (
                                    <div className="shrink-0 text-[10px] font-black tracking-wider text-slate-400">
                                      {getPointReading(p)}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-[11px] font-black text-[#255F4F]/75">
                                  {getTsuboRoleLabel(p, i + 1)}
                                </div>
                              </div>
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
              </div>
            ) : null}

            {careTab === "eat" ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    食べる
                  </div>
                  <div className="rounded-full bg-[#F7FAF7] px-2.5 py-1 text-[10px] font-black text-[#255F4F] ring-1 ring-[#D3E1D5]">
                    食養生
                  </div>
                </div>

                <div className="rounded-[24px] bg-[#F7FAF7]/75 px-4 py-4 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(37,95,79,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
                  <div className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#255F4F] ring-1 ring-[#CFE0D3] shadow-[0_10px_20px_-16px_rgba(37,95,79,0.30)]">
                    まずはこれ
                  </div>

                  <div className="mt-3 text-[17px] font-black tracking-tight text-slate-900">
                    {food.title || sectionLabels.foodTitle || `${getDateModeLabel(bundleDateMode)}の食養生`}
                  </div>


                  {food.recommendation || food.focus ? (
                    <div className="mt-3 text-[14px] font-extrabold leading-6 text-[var(--accent-ink)]">
                      {food.recommendation || food.focus}
                    </div>
                  ) : null}

                  {foodExamples.length > 0 ? (
                    <div className="mt-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        例
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {foodExamples.map((x, idx) => (
                          <span
                            key={`${x}-${idx}`}
                            className="rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[#E1E6E1]"
                          >
                            {x}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {hasFoodDetails ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setFoodDetailOpen((v) => !v)}
                        className="flex w-full items-center justify-between rounded-[18px] bg-white px-4 py-3 ring-1 ring-[#D3E1D5] text-left shadow-sm"
                      >
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            詳しく
                          </div>
                          <div className="mt-1 text-[13px] font-black tracking-tight text-slate-900">
                            取り入れ方・控えたいこと
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
                          {food.how_to ? (
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                取り入れ方
                              </div>
                              <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-700">
                                {food.how_to}
                              </div>
                            </div>
                          ) : null}

                          {food.avoid ? (
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                控えたいこと
                              </div>
                              <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-700">
                                {food.avoid}
                              </div>
                            </div>
                          ) : null}

                          {food.reason ? (
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                ひとこと理由
                              </div>
                              <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-700">
                                {food.reason}
                              </div>
                            </div>
                          ) : null}

                          {food.lifestyle_tip ? (
                            <div className="rounded-[18px] bg-white px-4 py-4 ring-1 ring-[var(--ring)] shadow-sm">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                一緒に意識したいこと
                              </div>
                              <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-700">
                                {food.lifestyle_tip}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {careTab === "live" ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    暮らす
                  </div>
                  <div className="rounded-full bg-[#F7FAF7] px-2.5 py-1 text-[10px] font-black text-[#255F4F] ring-1 ring-[#D3E1D5]">
                    生活ケア
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] bg-[#F7FAF7]/75 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(37,95,79,0.06),inset_0_-18px_28px_rgba(255,255,255,0.35)]">
                  <div className="px-4 py-4">
                    <div className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#255F4F] ring-1 ring-[#CFE0D3] shadow-[0_10px_20px_-16px_rgba(37,95,79,0.30)]">
                      まずはこれ
                    </div>
                    <div className="mt-3 text-[17px] font-black tracking-tight text-slate-900">
                      {lifestylePlan.title}
                    </div>
                    <div className="mt-2 text-[13px] font-bold leading-6 text-slate-700">
                      {lifestylePlan.lead}
                    </div>
                  </div>

                  <div className="border-t border-white/70 bg-white/34 px-4 py-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {selectedIsToday ? "今日やること" : "今夜やること"}
                    </div>
                    <div className="mt-3 space-y-2">
                      {safeArray(lifestylePlan.steps).map((step, idx) => (
                        <div key={`${idx}-${step}`} className="flex items-start gap-3 rounded-[17px] bg-white px-4 py-3 ring-1 ring-[#E1E6E1] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.30)]">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#E2F1EA] text-[12px] font-black text-[#255F4F] ring-1 ring-[#BFD9CC]">
                            {idx + 1}
                          </div>
                          <div className="text-[13px] font-extrabold leading-6 text-slate-700">
                            {step}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[#D3E1D5] bg-white px-4 py-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      気をつけたいこと
                    </div>
                    <div className="mt-1.5 text-[13px] font-extrabold leading-6 text-slate-700">
                      {lifestylePlan.trap}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </Module>


          <Module className="p-5 bg-[#EEF6F0] ring-1 ring-[#BFD9CC] shadow-[0_18px_42px_-32px_rgba(37,95,79,0.34)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-ink)]/60">
                  ベースとなるあなたの体質
                </div>

                <div className="mt-3 flex items-start gap-3">
                  <div className="grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-[20px] bg-white p-2 ring-1 ring-[#CFE0D3] shadow-sm shrink-0">
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
                            className="rounded-md bg-white/80 px-2.5 py-1 text-[11px] font-extrabold text-[#255F4F] ring-1 ring-inset ring-[#CFE0D3]"
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
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        お困りの不調
                      </div>
                      <div className="mt-1 text-[14px] font-black tracking-tight text-slate-900">
                        {symptomLabel}
                      </div>
                    </div>
                  ) : null}

                  {primaryLine ? (
                    <div className="rounded-[16px] bg-white/90 px-4 py-3 ring-1 ring-[#CFE0D3] shadow-sm">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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

      <div className="pb-4 pt-2 text-[10px] font-extrabold leading-5 text-slate-400 text-center px-4">
        ※ 未病レーダーはセルフケア支援です。強い症状がある場合は無理をせず、必要に応じて医療機関に相談してください。
      </div>
    </AppShell>
  );
}

