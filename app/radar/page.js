// app/radar/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell, { Module } from "@/components/layout/AppShell";
import ReviewFormSheet from "@/components/records/ReviewFormSheet";
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

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

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
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));

  const d = new Date(`${today}T00:00:00+09:00`);
  d.setDate(d.getDate() + 1);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const tomorrow = `${yyyy}-${mm}-${dd}`;

  return { today, tomorrow, hour };
}

function getDefaultDateModeJST() {
  const { hour } = getJstTodayTomorrow();
  return hour < 18 ? "today" : "tomorrow";
}

function inferModeFromTargetDate(targetDate) {
  const { today, tomorrow } = getJstTodayTomorrow();
  if (targetDate === today) return "today";
  if (targetDate === tomorrow) return "tomorrow";
  return null;
}

function getDateModeLabel(mode) {
  return mode === "today" ? "今日" : "明日";
}

function buildScoreCardTitle(mode, targetDate) {
  return `${getDateModeLabel(mode)}(${formatTargetDate(targetDate)})の崩れやすさ`;
}

function getSectionLabels(mode) {
  if (mode === "today") {
    return {
      noticeTitle: "あなたにとっての今日の注意点",
      tsuboTitle: "今日の整えツボ",
      tsuboSubtitle: "今日ここから整えたい3点セット",
      foodTitle: "今日の食養生",
    };
  }

  return {
    noticeTitle: "あなたにとっての明日の注意点",
    tsuboTitle: "今夜の先回りツボ",
    tsuboSubtitle: "今夜のうちに整えておきたい3点セット",
    foodTitle: "明日の食養生",
  };
}

function signalLabel(signal) {
  if (signal === 2) return "要警戒";
  if (signal === 1) return "注意";
  return "安定";
}

function signalBadgeClass(signal) {
  if (signal === 2) return "bg-rose-50 text-rose-700 border-rose-200";
  if (signal === 1) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function signalDotClass(signal) {
  if (signal === 2) return "bg-rose-500";
  if (signal === 1) return "bg-amber-400";
  return "bg-emerald-500";
}

function sourceLabel(source) {
  if (source === "mtest") return "ラインケア";
  return "体質ケア";
}

function sourceBadgeClass(source) {
  if (source === "mtest") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-700";
}

function getPointRegionLabel(region) {
  if (region === "abdomen") return "腹部";
  if (region === "head_neck") return "頭頸";
  return "四肢";
}

function getForecastText(bundle) {
  return (
    bundle?.forecast?.gpt_summary ||
    bundle?.forecast?.why_short ||
    "気象の変化と体質の重なりを見て、崩れやすさを出しています。"
  );
}

function getForecastLines(bundle) {
  const text = String(getForecastText(bundle) || "").trim();
  if (!text) return [];

  const lines = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[・•●\-]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length >= 2) return lines;

  return text
    .split(/(?<=[。！？])/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[・•●\-]\s*/, "").trim())
    .filter(Boolean);
}

function getRiskContext(bundle) {
  return bundle?.forecast?.computed?.radar_plan_meta?.risk_context || null;
}

function getCompatTriggerLabel(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "気圧低下";
  if (mainTrigger === "pressure" && triggerDir === "up") return "気圧上昇";
  if (mainTrigger === "temp" && triggerDir === "down") return "冷え";
  if (mainTrigger === "temp" && triggerDir === "up") return "暑さ";
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

function getPointRoleSummary(point) {
  return point?.explanation?.role_summary || "整えの軸になるツボです。";
}

function getPointSelectionReason(point) {
  return (
    point?.explanation?.selection_reason ||
    "今日の整え方に合う方向で選んでいます。"
  );
}

function getPointMatchTags(point) {
  return safeArray(point?.explanation?.match_tags).slice(0, 3);
}

function getPointPressGuide(point) {
  const base =
    point?.point_region === "abdomen"
      ? "仰向けでお腹の力を抜き、吐く息に合わせてやさしく押します。"
      : "息を吐きながら、じんわり気持ちいい強さで押します。";

  const side =
    point?.point_region === "abdomen"
      ? "20〜30秒を2〜3回。"
      : "左右ある場所は片側20〜30秒ずつ、2〜3回が目安です。";

  return `${base}${side} 痛すぎる強さは避けてください。`;
}

function getPointImageSrc(point) {
  if (!point?.image_path) return null;
  const clean = String(point.image_path).replace(/^\/+/, "");
  return `/${clean}`;
}

const FLAT_PRESETS = flattenRadarLocationPresets();

function LocationEditor({
  error,
  locating,
  savingPreset,
  selectedPresetKey,
  setSelectedPresetKey,
  onUseCurrentLocation,
  onSavePresetLocation,
  onClose,
  showClose = true,
}) {
  return (
    <Module className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold text-slate-900">地域を設定する</div>
          <div className="mt-1 text-[13px] font-bold leading-6 text-slate-600">
            現在地か、生活圏に近い代表地点を設定できます。
            変更した場合は次回の予報から反映されます。
          </div>
        </div>

        {showClose ? (
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-600"
          >
            閉じる
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
        <div className="text-sm font-extrabold text-slate-900">現在地を使う</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
          いまいる場所をそのまま保存します。
        </div>
        <button
          onClick={onUseCurrentLocation}
          disabled={locating}
          className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {locating ? "位置情報を取得中…" : "現在地を使う"}
        </button>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-slate-100 bg-white p-4">
        <div className="text-sm font-extrabold text-slate-900">地域を選んで設定する</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
          GPSを使わなくても、生活圏に近い地点を選べば使えます。
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-[12px] font-extrabold text-slate-500">
            地域
          </label>
          <select
            value={selectedPresetKey}
            onChange={(e) => setSelectedPresetKey(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none"
          >
            <option value="">選んでください</option>
            {RADAR_LOCATION_PRESETS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <button
          onClick={onSavePresetLocation}
          disabled={!selectedPresetKey || savingPreset}
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-900 py-3 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {savingPreset ? "設定中…" : "この地域で設定する"}
        </button>
      </div>
    </Module>
  );
}

function PointDetailSheet({ point, onClose }) {
  const [imageBroken, setImageBroken] = useState(false);

  useEffect(() => {
    setImageBroken(false);
  }, [point?.code]);

  if (!point) return null;

  const imageSrc = getPointImageSrc(point);
  const reasonTags = getPointMatchTags(point);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="point-detail-title"
        className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold text-slate-500">
              {sourceLabel(point.source)} / {getPointRegionLabel(point.point_region)}
            </div>
            <div id="point-detail-title" className="mt-1 text-xl font-extrabold text-slate-900">
              {point.name_ja || point.code}
            </div>
            <div className="mt-1 text-[12px] font-bold text-slate-500">
              {point.code}
              {point.name_en ? ` / ${point.name_en}` : ""}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-600"
          >
            閉じる
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
          {imageSrc && !imageBroken ? (
            <img
              src={imageSrc}
              alt={`${point.name_ja || point.code} の位置`}
              className="h-56 w-full object-contain bg-white"
              onError={() => setImageBroken(true)}
            />
          ) : (
            <div className="flex h-56 items-center justify-center px-6 text-center text-[12px] font-bold leading-6 text-slate-500">
              画像がまだ用意されていないか、表示できませんでした。ツボ名とコードを見ながら、押し方の目安を先に使えます。
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
          <div className="text-[11px] font-extrabold text-slate-500">役割</div>
          <div className="mt-1 text-[13px] font-bold leading-6 text-slate-800">
            {getPointRoleSummary(point)}
          </div>
          <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
            {getPointSelectionReason(point)}
          </div>
        </div>

        {reasonTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {reasonTags.map((label) => (
              <span
                key={label}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-700"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
          <div className="text-[11px] font-extrabold text-amber-700">押し方の目安</div>
          <div className="mt-1 text-[13px] font-bold leading-6 text-amber-900">
            {getPointPressGuide(point)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RadarPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState("");

  const [needsLocation, setNeedsLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState("");
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [locationNotice, setLocationNotice] = useState("");

  const [tab, setTab] = useState("forecast");
  const [dateMode, setDateMode] = useState(getDefaultDateModeJST());
  const [openingProfileDetail, setOpeningProfileDetail] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [todayReview, setTodayReview] = useState(null);
  const [todayReviewForecast, setTodayReviewForecast] = useState(null);
  const [loadingTodayReview, setLoadingTodayReview] = useState(false);
  const [savingTodayReview, setSavingTodayReview] = useState(false);
  const [reviewEditorOpen, setReviewEditorOpen] = useState(false);

  const requestSeqRef = useRef(0);

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

  async function fetchTodayReview() {
    if (!session) return;
    try {
      setLoadingTodayReview(true);
      const { today } = getJstTodayTomorrow();
      const json = await authedFetch(`/api/radar/review?date=${today}`);
      setTodayReview(json?.data?.review || null);
      setTodayReviewForecast(json?.data?.forecast || null);
    } catch (e) {
      console.error("fetchTodayReview failed:", e);
    } finally {
      setLoadingTodayReview(false);
    }
  }

  async function saveTodayReview(payload) {
    try {
      setSavingTodayReview(true);
      const json = await authedFetch("/api/radar/review", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setTodayReview(json?.data?.review || null);
      setTodayReviewForecast(json?.data?.forecast || null);
      setReviewEditorOpen(false);
    } catch (e) {
      alert(e?.message || "保存に失敗しました");
    } finally {
      setSavingTodayReview(false);
    }
  }

  async function fetchForecast({
    lat = null,
    lon = null,
    force = false,
    locationChanged = false,
    nextDateMode = dateMode,
  } = {}) {
    if (!session) return;

    const requestSeq = ++requestSeqRef.current;

    try {
      setError("");
      if (force) setRefreshing(true);
      if (!bundle) setLoading(true);

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("No token");

      const { today, tomorrow } = getJstTodayTomorrow();
      const targetDate = nextDateMode === "today" ? today : tomorrow;

      const qs = new URLSearchParams();
      qs.set("date", targetDate);

      if (lat != null && lon != null) {
        qs.set("lat", String(lat));
        qs.set("lon", String(lon));
      }

      const url = `/api/radar/v1/forecast?${qs.toString()}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json();

      if (requestSeq !== requestSeqRef.current) return;

      if (!res.ok) {
        if (json?.error?.includes("No radar location found")) {
          setNeedsLocation(true);
          setBundle(null);
          return;
        }
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setNeedsLocation(false);
      setBundle(json);

      const returnedMode = inferModeFromTargetDate(json?.target_date);
      if (returnedMode) {
        setDateMode(returnedMode);
      }

      if (locationChanged) {
        setLocationNotice("地域を更新しました。変更は次回の予報から反映されます。");
      }
    } catch (e) {
      if (requestSeq !== requestSeqRef.current) return;
      setError(e?.message || "予報の取得に失敗しました。");
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    if (!session || loadingAuth) return;
    fetchForecast({ force: true, nextDateMode: dateMode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loadingAuth, dateMode]);

  useEffect(() => {
    if (!session || loadingAuth) return;
    fetchTodayReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loadingAuth]);

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
          locationChanged: !needsLocation,
          nextDateMode: dateMode,
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
        locationChanged: !needsLocation,
        nextDateMode: dateMode,
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

  const forecast = bundle?.forecast || null;
  const carePlan = bundle?.care_plan || null;
  const tsuboSet = carePlan?.night_tsubo_set || {};
  const tsuboPoints = safeArray(tsuboSet?.points);
  const food = carePlan?.tomorrow_food_context || {};
  const riskContext = getRiskContext(bundle);

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
    () => inferModeFromTargetDate(bundle?.target_date) || dateMode,
    [bundle?.target_date, dateMode]
  );

  const targetDateLabel = useMemo(
    () => formatTargetDate(bundle?.target_date),
    [bundle?.target_date]
  );

  const scoreCardTitle = useMemo(
    () => buildScoreCardTitle(bundleDateMode, bundle?.target_date),
    [bundleDateMode, bundle?.target_date]
  );

  const sectionLabels = useMemo(
    () => getSectionLabels(bundleDateMode),
    [bundleDateMode]
  );

  const forecastLines = useMemo(() => getForecastLines(bundle), [bundle]);
  const todayRecordDate = getJstTodayTomorrow().today;
  const todayRecordDateLabel = formatTargetDate(todayRecordDate);

  if (loadingAuth || loading) {
    return (
      <AppShell title="未病レーダー" subtitle="読み込み中…">
        <div className="space-y-4 py-2">
          <div className="h-36 rounded-[28px] bg-slate-200 animate-pulse" />
          <div className="h-20 rounded-[28px] bg-slate-200 animate-pulse" />
          <div className="h-32 rounded-[28px] bg-slate-200 animate-pulse" />
          <div className="h-32 rounded-[28px] bg-slate-200 animate-pulse" />
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell title="未病レーダー" subtitle="ログインが必要です">
        <Module className="p-6">
          <div className="text-xl font-extrabold text-slate-900">ログインが必要です</div>
          <div className="mt-2 text-sm font-bold leading-6 text-slate-600">
            未病レーダーはログイン後に使えます。
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.push("/signup")}
              className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-extrabold text-white"
            >
              無料で登録・ログイン
            </button>
            <button
              onClick={() => router.push("/check")}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-extrabold text-slate-700"
            >
              体質チェックへ
            </button>
          </div>
        </Module>
      </AppShell>
    );
  }

  if (needsLocation) {
    return (
      <AppShell title="未病レーダー" subtitle="地域設定">
        <Module className="p-6">
          <div className="text-xl font-extrabold text-slate-900">位置情報の設定が必要です</div>
          <div className="mt-2 text-sm font-bold leading-6 text-slate-600">
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

        <button
          onClick={() => router.push("/check")}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-extrabold text-slate-700"
        >
          体質チェックへ戻る
        </button>
      </AppShell>
    );
  }

  if (!bundle || !forecast || !carePlan) {
    return (
      <AppShell title="未病レーダー" subtitle="予報を読み込めませんでした">
        <Module className="p-6">
          <div className="text-lg font-extrabold text-slate-900">予報を読み込めませんでした</div>
          <div className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {error || "時間をおいてもう一度お試しください。"}
          </div>
          <button
            onClick={() => fetchForecast({ force: true, nextDateMode: dateMode })}
            className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-extrabold text-white"
          >
            再読み込み
          </button>
        </Module>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="未病レーダー"
      subtitle={targetDateLabel}
      headerRight={
        <button
          onClick={() => setShowLocationEditor(true)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700"
        >
          地域変更
        </button>
      }
    >
      {locationNotice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-extrabold text-emerald-800">
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

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          onClick={() => setTab("forecast")}
          className={[
            "rounded-[1rem] px-4 py-3 text-sm font-extrabold transition",
            tab === "forecast" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
          ].join(" ")}
        >
          予報・対策
        </button>
        <button
          onClick={() => setTab("record")}
          className={[
            "rounded-[1rem] px-4 py-3 text-sm font-extrabold transition",
            tab === "record" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
          ].join(" ")}
        >
          記録
        </button>
      </div>

      {tab === "forecast" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => setDateMode("today")}
              className={[
                "rounded-[1rem] px-4 py-3 text-sm font-extrabold transition",
                bundleDateMode === "today"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500",
              ].join(" ")}
            >
              今日
            </button>
            <button
              onClick={() => setDateMode("tomorrow")}
              className={[
                "rounded-[1rem] px-4 py-3 text-sm font-extrabold transition",
                bundleDateMode === "tomorrow"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500",
              ].join(" ")}
            >
              明日
            </button>
          </div>

          {error && !showLocationEditor ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          <Module className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-extrabold text-slate-500">
                  {scoreCardTitle}
                </div>
                <div className="mt-1 text-[11px] font-bold text-slate-400">
                  気象と体質の重なりから見た目安
                </div>

                {symptomLabel ? (
                  <div className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700">
                    気になる症状: {symptomLabel}
                  </div>
                ) : null}

                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                    {forecast.score_0_10}
                  </span>
                  <span className="pb-1 text-sm font-extrabold text-slate-500">/ 10</span>
                </div>
              </div>

              <div
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold",
                  signalBadgeClass(forecast.signal),
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    signalDotClass(forecast.signal),
                  ].join(" ")}
                />
                {forecast.signal_label || signalLabel(forecast.signal)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-extrabold text-slate-500">
                  日中に気をつけたい時間帯
                </div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">
                  {forecast.peak_start && forecast.peak_end
                    ? `${String(forecast.peak_start).slice(0, 5)}–${String(
                        forecast.peak_end
                      ).slice(0, 5)}`
                    : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-extrabold text-slate-500">
                  一番響きやすい要素
                </div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">
                  {getCompatTriggerLabel(forecast.main_trigger, forecast.trigger_dir)}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-4">
              <div className="text-sm font-extrabold text-slate-900">
                {sectionLabels.noticeTitle}
              </div>
              <ul className="mt-3 space-y-2">
                {forecastLines.map((line, idx) => (
                  <li key={`${idx}-${line}`} className="flex items-start gap-2 text-[13px] font-bold leading-6 text-slate-700">
                    <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Module>

          <Module className="p-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-4">
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold text-slate-500">
                  あなたの体質
                </div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">
                  {coreLabel?.title || "—"}
                </div>

                {coreLabel?.short ? (
                  <div className="mt-1 text-[12px] font-bold leading-5 text-slate-600">
                    {coreLabel.short}
                  </div>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-2">
                  {subLabelObjects.slice(0, 2).map((s) => (
                    <span
                      key={s.code}
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-700"
                    >
                      {s.short}
                    </span>
                  ))}
                </div>

                {primaryLine ? (
                  <div className="mt-2 text-[11px] font-bold text-slate-500">
                    負担が出やすいライン：{primaryLine.title}
                  </div>
                ) : null}
              </div>

              <button
                onClick={openLatestResultDetail}
                disabled={openingProfileDetail}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-600 disabled:opacity-60"
              >
                {openingProfileDetail ? "開いています…" : "詳しく見る"}
              </button>
            </div>
          </Module>

          <Module className="p-5">
            <div className="text-base font-extrabold text-slate-900">
              {sectionLabels.tsuboTitle}
            </div>
            <div className="mt-1 text-[12px] font-extrabold text-slate-500">
              {sectionLabels.tsuboSubtitle}
            </div>

            <div className="mt-4 space-y-3">
              {tsuboPoints.map((p, i) => {
                const reasonTags = getPointMatchTags(p);

                return (
                  <div
                    key={`${p.code}-${i}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-slate-700 shadow-sm">
                        {p.code}
                      </div>

                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => setSelectedPoint(p)}
                          className="text-left text-base font-extrabold text-slate-900 underline decoration-slate-300 underline-offset-4"
                        >
                          {p.name_ja || p.code}
                        </button>

                        <div className="mt-1 flex flex-wrap gap-2">
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-[11px] font-extrabold",
                              sourceBadgeClass(p.source),
                            ].join(" ")}
                          >
                            {sourceLabel(p.source)}
                          </span>

                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-500">
                            {getPointRegionLabel(p.point_region)}
                          </span>
                        </div>

                        <div className="mt-3 text-[12px] font-bold leading-5 text-slate-700">
                          {getPointRoleSummary(p)}
                        </div>

                        {reasonTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {reasonTags.map((label) => (
                              <span
                                key={label}
                                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-600"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                          <div className="text-[11px] font-extrabold text-slate-500">
                            押し方の目安
                          </div>
                          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-700">
                            {getPointPressGuide(p)}
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                          <div className="text-[11px] font-extrabold text-slate-500">
                            なぜこのツボ？
                          </div>
                          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-700">
                            {getPointSelectionReason(p)}
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedPoint(p)}
                          className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-600"
                        >
                          画像と押し方を見る
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <div className="text-sm font-extrabold text-emerald-900">ひとこと</div>
              <div className="mt-2 text-[13px] font-bold leading-6 text-emerald-900">
                {carePlan?.night_note || "軽く整えておくと、ぶれを抑えやすくなります。"}
              </div>
            </div>
          </Module>

          <Module className="p-5">
            <div className="text-base font-extrabold text-slate-900">
              {sectionLabels.foodTitle}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <div className="text-sm font-extrabold text-slate-900">
                {food.title || `${getDateModeLabel(bundleDateMode)}の食養生`}
              </div>

              {food.recommendation || food.focus ? (
                <div className="mt-3">
                  <div className="text-[11px] font-extrabold text-slate-500">
                    おすすめ
                  </div>
                  <div className="mt-1 text-[14px] font-extrabold leading-6 text-slate-900">
                    {food.recommendation || food.focus}
                  </div>
                </div>
              ) : null}

              {safeArray(food.examples).length > 0 ? (
                <div className="mt-3">
                  <div className="text-[11px] font-extrabold text-slate-500">例</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {food.examples.map((x, idx) => (
                      <span
                        key={`${x}-${idx}`}
                        className="rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-slate-700"
                      >
                        {x}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {food.how_to ? (
                <div className="mt-3">
                  <div className="text-[11px] font-extrabold text-slate-500">
                    取り入れ方
                  </div>
                  <div className="mt-1 text-[13px] font-bold leading-6 text-slate-700">
                    {food.how_to}
                  </div>
                </div>
              ) : null}

              {food.avoid ? (
                <div className="mt-3">
                  <div className="text-[11px] font-extrabold text-slate-500">
                    控えたいこと
                  </div>
                  <div className="mt-1 text-[13px] font-bold leading-6 text-slate-700">
                    {food.avoid}
                  </div>
                </div>
              ) : null}

              {food.reason ? (
                <div className="mt-3">
                  <div className="text-[11px] font-extrabold text-slate-500">
                    ひとこと理由
                  </div>
                  <div className="mt-1 text-[13px] font-bold leading-6 text-slate-700">
                    {food.reason}
                  </div>
                </div>
              ) : null}

              {food.lifestyle_tip ? (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <div className="text-[11px] font-extrabold text-slate-500">
                    一緒に意識したいこと
                  </div>
                  <div className="mt-1 text-[13px] font-bold leading-6 text-slate-700">
                    {food.lifestyle_tip}
                  </div>
                </div>
              ) : null}
            </div>
          </Module>
        </div>
      ) : (
        <div className="space-y-5">
          <Module className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold text-slate-900">今日の記録</div>
                <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
                  予報を見た日の終わりに1回だけ、実際どうだったかと先回りできたかを残します。
                </div>
              </div>
              <button
                onClick={() => setReviewEditorOpen(true)}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-extrabold text-white"
              >
                {todayReview ? "編集する" : "記録する"}
              </button>
            </div>

            {loadingTodayReview ? (
              <div className="mt-4 text-sm font-bold text-slate-600">読み込み中…</div>
            ) : todayReviewForecast ? (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold",
                      reviewSignalBadgeClass(todayReviewForecast.signal),
                    ].join(" ")}
                  >
                    {reviewSignalLabel(todayReviewForecast.signal)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-600">
                    {todayReviewForecast.score_0_10}/10
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-600">
                    {reviewTriggerLabel(
                      todayReviewForecast.main_trigger,
                      todayReviewForecast.trigger_dir
                    )}
                  </span>
                </div>
                <div className="mt-2 text-[12px] font-bold leading-5 text-slate-700">
                  {todayReviewForecast.why_short || "今日の予報と体調の答え合わせを残せます。"}
                </div>
              </div>
            ) : null}

            {todayReview ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                  <div className="text-[11px] font-extrabold text-slate-500">実際どうだった？</div>
                  <div className="mt-1 text-[15px] font-extrabold text-slate-900">
                    {conditionLabel(todayReview.condition_level)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                  <div className="text-[11px] font-extrabold text-slate-500">先回りできた？</div>
                  <div className="mt-1 text-[15px] font-extrabold text-slate-900">
                    {preventLabel(todayReview.prevent_level)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                  <div className="text-[11px] font-extrabold text-slate-500">やったこと</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {safeArray(todayReview.action_tags).length > 0 ? (
                      safeArray(todayReview.action_tags).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-700"
                        >
                          {actionTagLabel(tag)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm font-bold text-slate-500">記録なし</span>
                    )}
                  </div>
                </div>
                {todayReview.note ? (
                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                    <div className="text-[11px] font-extrabold text-slate-500">メモ</div>
                    <div className="mt-1 text-[13px] font-bold leading-6 text-slate-700">
                      {todayReview.note}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold leading-6 text-slate-600">
                {todayRecordDateLabel} の記録はまだありません。しんどかった日だけでも残しておくと、週次レポートで自分の傾向が見えやすくなります。
              </div>
            )}
          </Module>

          <Module className="p-5">
            <div className="text-base font-extrabold text-slate-900">記録ページで見返す</div>
            <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
              記録カレンダーでは日ごとの履歴を、週次レポートでは1週間の傾向をまとめて見返せます。
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => router.push("/records?tab=calendar")}
                className="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-extrabold text-white"
              >
                記録カレンダーへ
              </button>
              <button
                onClick={() => router.push("/records?tab=report")}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-extrabold text-slate-700"
              >
                週次レポートへ
              </button>
            </div>
          </Module>
        </div>
      )}

      <ReviewFormSheet
        open={reviewEditorOpen}
        date={todayRecordDate}
        review={todayReview}
        forecast={todayReviewForecast}
        saving={savingTodayReview}
        title={todayReview ? "今日の記録を編集する" : "今日を記録する"}
        onClose={() => setReviewEditorOpen(false)}
        onSave={saveTodayReview}
      />

      {selectedPoint ? (
        <PointDetailSheet
          point={selectedPoint}
          onClose={() => setSelectedPoint(null)}
        />
      ) : null}

      <div className="pb-4 text-[11px] font-bold leading-5 text-slate-400">
        ※ 未病レーダーはセルフケア支援です。強い症状がある場合は無理をせず、必要に応じて医療機関に相談してください。
      </div>
    </AppShell>
  );
}
