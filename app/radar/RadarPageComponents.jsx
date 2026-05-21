// app/radar/RadarPageComponents.jsx
"use client";

import { useEffect, useState } from "react";
import { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { RADAR_LOCATION_PRESETS } from "@/lib/radar_v1/locationPresets";
import {
  getPointCautions,
  getPointImageCandidates,
  getPointImageSearchQuery,
  getPointMatchTags,
  formatTargetDate,
  getForecastTriggerFactors,
  getForecastTriggerKey,
  getLifestylePlan,
  safeArray,
  getPointPressGuide,
  getPointReading,
  getPointRegionLabel,
  getPointRoleSummary,
  getPointSelectionReason,
  signalLabel,
  sourceLabel,
} from "./utils";

const HAND_MERIDIAN_PREFIXES = new Set(["LI", "LU", "PC", "HT", "SI", "TE"]);
const FOOT_MERIDIAN_PREFIXES = new Set(["ST", "SP", "LR", "GB", "KI", "BL"]);

function getPointMeridianPrefix(point) {
  const fromMeridian = String(point?.meridian || "").trim().toUpperCase();
  if (fromMeridian) return fromMeridian;
  const code = String(point?.code || "").trim().toUpperCase();
  const match = code.match(/^[A-Z]+/);
  return match ? match[0] : "";
}

function inferPointBodyIconKey(point) {
  const region = String(point?.point_region || "").trim();
  if (region === "head_neck") return "head_neck";
  if (region === "abdomen") return "abdomen";

  const prefix = getPointMeridianPrefix(point);
  if (HAND_MERIDIAN_PREFIXES.has(prefix)) return "hand";
  if (FOOT_MERIDIAN_PREFIXES.has(prefix)) return "foot";
  return "body";
}

export function getPointBodyIconLabel(point) {
  const key = inferPointBodyIconKey(point);
  if (key === "head_neck") return "頭・首まわり";
  if (key === "abdomen") return "お腹まわり";
  if (key === "hand") return "手・腕まわり";
  if (key === "foot") return "足・脚まわり";
  return "からだのツボ";
}

function IconHeadNeck({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M24 5.8c-7 0-12.2 5.1-12.2 12.2 0 5.7 3 9.7 7.1 11.6v5.2c0 1.7-1.1 3.1-2.8 3.6l-3.3.9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35.2 39.3l-3.3-.9c-1.7-.5-2.8-1.9-2.8-3.6v-5.2c4.1-1.9 7.1-5.9 7.1-11.6C36.2 10.9 31 5.8 24 5.8Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.2 31.2c1.4.7 3 1.1 4.8 1.1s3.4-.4 4.8-1.1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="20" r="3.6" fill="currentColor" opacity="0.22" />
      <circle cx="32" cy="20" r="1.7" fill="currentColor" />
    </svg>
  );
}

function IconAbdomen({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M18.3 8.5c1.8 2.6 3.7 3.8 5.7 3.8s3.9-1.2 5.7-3.8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M16.8 11.7c-3.8 6-5.2 12.8-4.1 20.5.6 4.3 4.4 7.3 8.8 7.3h5c4.4 0 8.2-3 8.8-7.3 1.1-7.7-.3-14.5-4.1-20.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 23.7c2.5 1.8 5.5 1.8 8 0" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.75" />
      <circle cx="24" cy="25.5" r="4.6" fill="currentColor" opacity="0.18" />
      <circle cx="24" cy="25.5" r="1.8" fill="currentColor" />
    </svg>
  );
}

function IconHand({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M18.7 24.5V12.8a3.1 3.1 0 0 1 6.2 0v10.8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24.9 23.4v-9.8a3.1 3.1 0 0 1 6.2 0v12.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31.1 25.7v-7.5a3 3 0 0 1 6 0v11.6c0 7.3-4.9 12.3-12.2 12.3h-2.1c-4.7 0-8.3-2.1-10.7-6.2l-4-6.8a3.2 3.2 0 0 1 5.3-3.6l3.1 4.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.1" cy="28.2" r="4.6" fill="currentColor" opacity="0.18" />
      <circle cx="17.1" cy="28.2" r="1.8" fill="currentColor" />
    </svg>
  );
}

function IconFoot({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M28.6 6.7c4.9 3.1 7.4 8.5 6.7 14.2-.5 4.2-2.7 7.7-6 10.2l-4.6 3.5c-2.2 1.7-2.6 4.2-.8 5.8 2.4 2.2 7.4 1.5 11.9-.2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22.8 7.4c-3.6 3.4-5.1 8.7-3.9 13.8.8 3.4 2.9 6 5.8 7.7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.7 39.5c-2.7-.2-4.8-1.5-5.9-3.4-.8-1.4-.4-3.2.9-4.1 1.1-.8 2.5-.8 3.6 0l2.1 1.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25.8" cy="32.6" r="4.7" fill="currentColor" opacity="0.18" />
      <circle cx="25.8" cy="32.6" r="1.8" fill="currentColor" />
    </svg>
  );
}

function IconBody({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="10" r="5" stroke="currentColor" strokeWidth="3" />
      <path d="M24 15.5v15M13.5 23.2h21M17.5 40l6.5-9.5L30.5 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="4.6" fill="currentColor" opacity="0.18" />
      <circle cx="24" cy="24" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function TsuboRegionIcon({ point, className = "h-8 w-8" }) {
  const key = inferPointBodyIconKey(point);
  if (key === "head_neck") return <IconHeadNeck className={className} />;
  if (key === "abdomen") return <IconAbdomen className={className} />;
  if (key === "hand") return <IconHand className={className} />;
  if (key === "foot") return <IconFoot className={className} />;
  return <IconBody className={className} />;
}

export function ForecastDateRail({ tabs, activeDate, onSelect }) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-2 px-1">
        {tabs.map((item) => {
          const active = activeDate === item.date;
          return (
            <button
              key={item.date}
              type="button"
              onClick={() => onSelect(item.date)}
              className={[
                "relative min-w-[76px] rounded-[20px] px-3.5 py-3 text-left transition-all duration-200 ring-1",
                active
                  ? "bg-[#FFF5E8] text-[#3F3025] ring-[#D8B892] shadow-[0_14px_30px_-22px_rgba(161,116,62,0.55)]"
                  : "bg-white text-[#4A4039] ring-[#E3D7CC] shadow-sm hover:-translate-y-0.5 hover:bg-[#FFF9F2] hover:ring-[#D8C6B4]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-black tracking-tight">{item.label}</span>
                {item.locked ? (
                  <span className={active ? "text-[11px]" : "text-[11px] text-slate-400"}>🔒</span>
                ) : null}
              </div>
              <div className={[
                "mt-1 text-[10px] font-black uppercase tracking-wide",
                active ? "text-[#9B6A38]" : item.locked ? "text-slate-400" : "text-[var(--accent-ink)]/75",
              ].join(" ")}
              >
                {item.subLabel}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TodayCarryoverIntro({ forecast, targetDateLabel, onOpenDashboard }) {
  const score = Number(forecast?.score_0_10 ?? 0);
  const peakStart = forecast?.peak_start ? String(forecast.peak_start).slice(0, 5) : null;
  const peakEnd = forecast?.peak_end ? String(forecast.peak_end).slice(0, 5) : null;
  const peakLabel = peakStart && peakEnd ? `${peakStart}〜${peakEnd}` : peakStart || null;

  return (
    <Module className="overflow-hidden p-0 bg-white ring-1 ring-[#D6E3D8] shadow-sm">
      <div className="relative px-5 py-5 bg-[linear-gradient(135deg,#F7FCF8_0%,#FFF7E7_100%)]">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/70 blur-2xl" />
        <div className="relative z-10 inline-flex rounded-full bg-white/85 px-3 py-1 text-[11px] font-black text-[#285F50] ring-1 ring-[#D3E4D7] shadow-sm">
          今日の見返し
        </div>
        <div className="relative z-10 mt-3 text-[20px] font-black tracking-tight text-slate-950 leading-snug">
          昨晩の先回りケアを、
          <br />
          今日の山場前にも使えるように残しています。
        </div>
        <p className="relative z-10 mt-3 text-[13px] font-bold leading-6 text-slate-600">
          {targetDateLabel}に向けて出したケアをそのまま見返せます。いまからの細かい変動は、ダッシュボードの「今日これから」で確認できます。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 px-5 py-4">
        <div className="rounded-[18px] bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
          <div className="text-[10px] font-black text-slate-400">スコア</div>
          <div className="mt-1 text-[18px] font-black text-slate-950">{score}/10</div>
        </div>
        <div className="rounded-[18px] bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
          <div className="text-[10px] font-black text-slate-400">モード</div>
          <div className="mt-1 text-[14px] font-black text-slate-950">{signalLabel(forecast?.signal ?? 0)}</div>
        </div>
        <div className="rounded-[18px] bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
          <div className="text-[10px] font-black text-slate-400">山場</div>
          <div className="mt-1 text-[13px] font-black text-slate-950">{peakLabel || "—"}</div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <Button variant="secondary" onClick={onOpenDashboard} className="w-full bg-white shadow-sm">
          今日これからの変動を見る
        </Button>
      </div>
    </Module>
  );
}

function PointReasonLoadingBlock() {
  return (
    <div className="rounded-[18px] bg-[color-mix(in_srgb,var(--mint),white_82%)] p-4 ring-1 ring-[var(--ring)]">
      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black text-[var(--accent-ink)] ring-1 ring-black/5">
        <span className="h-2 w-2 rounded-full bg-[var(--accent-ink)] animate-pulse" />
        AIが理由を整えています…
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="h-3.5 w-full rounded-full bg-white/90 animate-pulse" />
        <div className="h-3.5 w-[92%] rounded-full bg-white/90 animate-pulse" />
        <div className="h-3.5 w-[74%] rounded-full bg-white/90 animate-pulse" />
      </div>
      <p className="mt-4 text-[12px] font-bold leading-5 text-slate-600">
        このツボが今の不調や天気とどうつながるかを、わかりやすい言葉にまとめています。
      </p>
    </div>
  );
}


const GOOGLE_CSE_ID = process.env.NEXT_PUBLIC_GOOGLE_CSE_ID || "";
const GOOGLE_CSE_SCRIPT_ID = "totonoucare-google-cse-script";

function loadGoogleCseScript(cx, onReady) {
  if (typeof window === "undefined" || !cx) return;

  window.__gcse = {
    ...(window.__gcse || {}),
    parsetags: "explicit",
  };

  const existing = document.getElementById(GOOGLE_CSE_SCRIPT_ID);
  if (existing) {
    if (window.google?.search?.cse?.element) {
      onReady?.();
    } else {
      existing.addEventListener("load", () => onReady?.(), { once: true });
    }
    return;
  }

  const script = document.createElement("script");
  script.id = GOOGLE_CSE_SCRIPT_ID;
  script.async = true;
  script.src = `https://cse.google.com/cse.js?cx=${encodeURIComponent(cx)}`;
  script.addEventListener("load", () => onReady?.(), { once: true });
  document.head.appendChild(script);
}

function GooglePointImageSearch({ point, query }) {
  const [containerId] = useState(() => `point-image-search-${Math.random().toString(36).slice(2)}`);
  const [gname] = useState(() => `pointImageSearch${Math.random().toString(36).slice(2)}`);
  const [status, setStatus] = useState(GOOGLE_CSE_ID ? "loading" : "missing-id");

  useEffect(() => {
    if (!GOOGLE_CSE_ID || !query) {
      setStatus(GOOGLE_CSE_ID ? "missing-query" : "missing-id");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    const renderSearch = () => {
      if (cancelled) return;

      const cse = window.google?.search?.cse?.element;
      const target = document.getElementById(containerId);

      if (!cse || !target) {
        window.setTimeout(renderSearch, 120);
        return;
      }

      target.innerHTML = "";

      try {
        cse.render({
          div: containerId,
          tag: "searchresults-only",
          gname,
          attributes: {
            defaultToImageSearch: true,
            disableWebSearch: true,
            imageSearchLayout: "classic",
            imageSearchResultSetSize: "small",
            linkTarget: "_blank",
            safeSearch: "active",
            noResultsString: "画像が見つかりませんでした。ツボ名や部位名を変えて確認してください。",
          },
        });

        window.setTimeout(() => {
          if (cancelled) return;
          const element = cse.getElement(gname);
          if (element?.execute) {
            element.execute(query);
            setStatus("ready");
          } else {
            setStatus("error");
          }
        }, 80);
      } catch (error) {
        console.error("Failed to render Google Programmable Search Element", error);
        setStatus("error");
      }
    };

    loadGoogleCseScript(GOOGLE_CSE_ID, renderSearch);

    return () => {
      cancelled = true;
    };
  }, [containerId, gname, query]);

  return (
    <div className="overflow-hidden rounded-[20px] bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          Google画像検索
        </div>
        <div className="mt-1 line-clamp-2 text-[12px] font-extrabold leading-5 text-slate-700">
          検索ワード：{query || point?.name_ja || point?.code || "ツボ 位置"}
        </div>
      </div>

      {status === "missing-id" ? (
        <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-[12px] font-bold leading-6 text-slate-500">
          画像検索を表示するには、環境変数 NEXT_PUBLIC_GOOGLE_CSE_ID にProgrammable Search Engine IDを設定してください。
        </div>
      ) : status === "missing-query" ? (
        <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-[12px] font-bold leading-6 text-slate-500">
          検索ワードを準備できませんでした。
        </div>
      ) : (
        <div className="relative max-h-[300px] min-h-[220px] overflow-y-auto px-2 py-2">
          {status === "loading" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 px-6 text-center text-[12px] font-bold text-slate-500">
              画像検索を読み込んでいます…
            </div>
          ) : null}
          {status === "error" ? (
            <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-[12px] font-bold leading-6 text-slate-500">
              画像検索を表示できませんでした。少し時間をおいて再度開いてください。
            </div>
          ) : (
            <div id={containerId} />
          )}
        </div>
      )}
    </div>
  );
}

function PointVisualPanel({ point }) {
  const imageCandidates = getPointImageCandidates(point);
  const searchQuery = getPointImageSearchQuery(point);
  const hasSearch = Boolean(GOOGLE_CSE_ID);
  const [imageIndex, setImageIndex] = useState(0);
  const [mode, setMode] = useState(imageCandidates.length ? "app" : "search");

  useEffect(() => {
    const nextCandidates = getPointImageCandidates(point);
    setImageIndex(0);
    setMode(nextCandidates.length ? "app" : "search");
  }, [point?.code]);

  const imageSrc = imageCandidates[imageIndex] || null;
  const canShowAppImage = Boolean(imageSrc);
  const showTabs = Boolean(canShowAppImage || hasSearch);

  return (
    <div className="mt-6 overflow-hidden rounded-[24px] bg-slate-50 ring-1 ring-inset ring-[var(--ring)]">
      <div className="border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              ツボの場所を確認
            </div>
            <p className="mt-1 text-[12px] font-bold leading-5 text-slate-600">
              位置は図解によって少し表現が違います。複数の画像で、おおまかな場所を確認してください。
            </p>
          </div>
        </div>

        {showTabs ? (
          <div className="mt-3 flex rounded-full bg-slate-100 p-1 ring-1 ring-inset ring-slate-200">
            {canShowAppImage ? (
              <button
                type="button"
                onClick={() => setMode("app")}
                className={[
                  "flex-1 rounded-full px-3 py-2 text-[11px] font-black transition-all",
                  mode === "app" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                ].join(" ")}
              >
                アプリ図解
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setMode("search")}
              className={[
                "flex-1 rounded-full px-3 py-2 text-[11px] font-black transition-all",
                mode === "search" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
              ].join(" ")}
            >
              画像検索
            </button>
          </div>
        ) : null}
      </div>

      {mode === "app" && canShowAppImage ? (
        <img
          src={imageSrc}
          alt={`${point.name_ja || point.code} の位置`}
          className="h-56 w-full object-contain bg-white"
          onError={() => {
            if (imageIndex < imageCandidates.length - 1) {
              setImageIndex((i) => i + 1);
            } else {
              setMode("search");
            }
          }}
        />
      ) : (
        <div className="p-3 sm:p-4">
          <GooglePointImageSearch key={point?.code || searchQuery} point={point} query={searchQuery} />
        </div>
      )}
    </div>
  );
}

export function SegmentedTabs({ tabs, value, onChange }) {
  return (
    <div className="flex rounded-full bg-slate-200/55 p-1 ring-1 ring-inset ring-slate-200/70 shadow-inner">
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
                ? "bg-white text-slate-950 shadow-[0_8px_22px_-18px_rgba(15,23,42,0.28)] ring-1 ring-black/5"
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

export function LocationEditor({
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
    <Module className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[18px] font-black tracking-tight text-slate-900">地域を設定する</div>
          <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-600">
            現在地か、生活圏に近い代表地点を設定できます。
            変更した場合は選択中の予報にも反映されます。
          </div>
        </div>

        {showClose ? (
          <button
            onClick={onClose}
            className="shrink-0 rounded-full bg-slate-100 px-3.5 py-2 text-[11px] font-extrabold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            閉じる
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-6 rounded-[24px] bg-slate-50 ring-1 ring-inset ring-[var(--ring)] p-5">
        <div className="text-[14px] font-black text-slate-900">現在地を使う</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
          いまいる場所をそのまま保存します。
        </div>
        <Button
          onClick={onUseCurrentLocation}
          disabled={locating}
          className="mt-4 w-full bg-[var(--accent)] hover:bg-[var(--accent-ink)] text-white shadow-md"
        >
          {locating ? "位置情報を取得中…" : "現在地を使う"}
        </Button>
      </div>

      <div className="mt-4 rounded-[24px] bg-white ring-1 ring-[var(--ring)] p-5 shadow-sm">
        <div className="text-[14px] font-black text-slate-900">地域を選んで設定する</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
          GPSを使わなくても、生活圏に近い地点を選べば使えます。
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-[12px] font-extrabold text-slate-500">
            都道府県・地域
          </label>
          <select
            value={selectedPresetKey}
            onChange={(e) => setSelectedPresetKey(e.target.value)}
            className="w-full rounded-[16px] bg-slate-50 px-4 py-3.5 text-sm font-extrabold text-slate-900 outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-[var(--accent)]"
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

        <Button
          onClick={onSavePresetLocation}
          disabled={!selectedPresetKey || savingPreset}
          className="mt-5 w-full shadow-sm"
        >
          {savingPreset ? "設定中…" : "この地域で設定する"}
        </Button>
      </div>
    </Module>
  );
}

export function PointDetailSheet({ point, onClose, reasonLoading = false }) {
  if (!point) return null;

  const reasonTags = getPointMatchTags(point);
  const cautions = getPointCautions(point);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="point-detail-title"
        className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] max-h-[90vh] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">
              {sourceLabel(point.source)} / {getPointRegionLabel(point.point_region)}
            </div>
            <div
              id="point-detail-title"
              className="mt-1 text-[22px] font-black tracking-tight text-slate-900"
            >
              {point.name_ja || point.code}
            </div>
            <div className="mt-1 text-[12px] font-bold text-slate-500">
              {getPointReading(point) ? `${getPointReading(point)} / ` : ""}
              {point.code}
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <PointVisualPanel point={point} />

        <div className="mt-5 rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_70%)] px-5 py-4 ring-1 ring-[var(--ring)]">
          <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/80">
            どんなとき向き？
          </div>
          <div className="mt-1.5 text-[14px] font-extrabold leading-6 text-[var(--accent-ink)]">
            {getPointRoleSummary(point)}
          </div>
        </div>

        <div className="mt-4 rounded-[20px] bg-white px-5 py-4 ring-1 ring-[var(--ring)] shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              このツボを選んだ理由
            </div>
            {reasonLoading ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--mint),white_55%)] px-2.5 py-1 text-[10px] font-black text-[var(--accent-ink)] ring-1 ring-[var(--ring)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-ink)] animate-pulse" />
                AI生成中
              </div>
            ) : null}
          </div>

          <div className="mt-2.5">
            {reasonLoading ? (
              <PointReasonLoadingBlock />
            ) : (
              <div className="text-[13px] font-bold leading-6 text-slate-700">
                {getPointSelectionReason(point)}
              </div>
            )}
          </div>

          {reasonTags.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {reasonTags.map((label) => (
                <li
                  key={label}
                  className="flex items-start gap-2.5 text-[12px] font-extrabold leading-5 text-slate-600"
                >
                  <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-ink)]/40" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-4 rounded-[20px] bg-amber-50 px-5 py-4 ring-1 ring-amber-200/50 shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-widest text-amber-700/80">
            押し方の目安
          </div>
          <div className="mt-1.5 text-[13px] font-extrabold leading-6 text-amber-900">
            {getPointPressGuide(point)}
          </div>
        </div>

        {cautions.length > 0 ? (
          <div className="mt-4 rounded-[20px] bg-white px-5 py-4 ring-1 ring-slate-200 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              注意したいこと
            </div>
            <ul className="mt-3 space-y-2.5">
              {cautions.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[13px] font-bold leading-6 text-slate-700"
                >
                  <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="h-8 w-full sm:h-2" />
      </div>
    </div>
  );
}


function SmallCareTabs({ value, onChange }) {
  const tabs = [
    ["tsubo", "ほぐす"],
    ["food", "食べる"],
    ["life", "暮らす"],
  ];

  return (
    <div className="flex rounded-full bg-[#F3ECE4] p-1 ring-1 ring-inset ring-[#E8D8C8] shadow-inner">
      {tabs.map(([key, label]) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={[
              "flex-1 rounded-full px-3 py-2.5 text-[12px] font-black tracking-tight transition-all",
              active
                ? "bg-white text-[#5D4430] shadow-[0_10px_22px_-18px_rgba(63,48,37,0.35)] ring-1 ring-black/5"
                : "text-[#8C7A6A] hover:text-[#5D4430]",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ReviewInfoChip({ label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-[16px] bg-white/80 px-3 py-2 ring-1 ring-[#E9DED2] shadow-sm">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#A78A70]">{label}</div>
      <div className="mt-0.5 text-[12px] font-black text-[#4A3930]">{value}</div>
    </div>
  );
}

function ReviewEmptyState({ children }) {
  return (
    <div className="rounded-[22px] bg-white/75 px-4 py-4 text-[13px] font-bold leading-6 text-[#7B6D60] ring-1 ring-[#E9DED2]">
      {children}
    </div>
  );
}

export function SavedCareReviewAccordion({ bundle }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("tsubo");
  const forecast = bundle?.forecast || null;
  const carePlan = bundle?.care_plan || null;
  const points = safeArray(carePlan?.night_tsubo_set?.points);
  const food = carePlan?.tomorrow_food_context || carePlan?.night_food || null;
  const factors = getForecastTriggerFactors(forecast);
  const lifestyle = getLifestylePlan(
    factors[0]?.key || getForecastTriggerKey(forecast),
    factors[1]?.key || null,
    Number(forecast?.signal ?? 0),
    "today"
  );
  const score = forecast?.score_0_10 ?? null;
  const signal = forecast?.signal ?? null;
  const peakStart = forecast?.peak_start ? String(forecast.peak_start).slice(0, 5) : null;
  const peakEnd = forecast?.peak_end ? String(forecast.peak_end).slice(0, 5) : null;
  const peakLabel = peakStart && peakEnd ? `${peakStart}–${peakEnd}` : peakStart || null;

  if (!carePlan) return null;

  return (
    <Module className="overflow-hidden bg-white p-0 ring-[#E6DACE] shadow-[0_18px_42px_-30px_rgba(93,68,48,0.30)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-full overflow-hidden px-5 py-5 text-left transition-all active:scale-[0.99]"
      >
        <div className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-[#FFF1DF] blur-2xl" />
        <div className="pointer-events-none absolute -right-8 top-2 h-28 w-28 rounded-full border border-[#EADCCB] bg-[#FFF9F0]/70" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex rounded-full bg-[#FFF7EC] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#9B6A38] ring-1 ring-[#E9D8C3]">
              Care Review
            </div>
            <h2 className="mt-3 text-[20px] font-black tracking-tight text-slate-950 leading-snug">
              昨晩の先回りケアを見返す
            </h2>
            <p className="mt-2 text-[12px] font-bold leading-6 text-[#7B6D60]">
              昨晩の予報で出たケアです。今日の昼・夕方にも使えそうなものだけ、必要な時に開いて見返せます。
            </p>
          </div>

          <div
            className={[
              "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#8C6A4C] ring-1 ring-[#E7D8C8] shadow-sm transition-transform",
              open ? "rotate-180" : "",
            ].join(" ")}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
          <ReviewInfoChip label="スコア" value={score != null ? `${score}/10` : null} />
          <ReviewInfoChip label="モード" value={signal != null ? signalLabel(signal) : null} />
          <ReviewInfoChip label="山場" value={peakLabel || "見返し"} />
        </div>
      </button>

      {open ? (
        <div className="border-t border-[#EFE4D8] bg-[#FFFCF8] px-5 pb-5 pt-4">
          <SmallCareTabs value={tab} onChange={setTab} />

          {tab === "tsubo" ? (
            <div className="mt-4 space-y-3">
              {points.length ? (
                points.slice(0, 3).map((point, index) => (
                  <div key={point?.code || index} className="rounded-[24px] bg-white p-4 ring-1 ring-[#E8DACE] shadow-[0_14px_28px_-24px_rgba(93,68,48,0.32)]">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#FFF7EC] text-[12px] font-black text-[#6F543E] ring-1 ring-[#E9D8C3]">
                        {point?.code || index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <div className="text-[16px] font-black tracking-tight text-[#3F3025]">{point?.name_ja || "ツボ"}</div>
                          {getPointReading(point) ? (
                            <div className="text-[11px] font-black text-[#9B7A5B]">{getPointReading(point)}</div>
                          ) : null}
                        </div>
                        <p className="mt-2 text-[12px] font-bold leading-6 text-[#6D6257]">
                          {getPointSelectionReason(point) || getPointRoleSummary(point) || "昨晩の予報に合わせて選んだツボです。"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <ReviewEmptyState>昨晩のツボケアはまだ保存されていません。</ReviewEmptyState>
              )}
            </div>
          ) : null}

          {tab === "food" ? (
            <div className="mt-4 overflow-hidden rounded-[24px] bg-white ring-1 ring-[#E8DACE] shadow-[0_14px_28px_-24px_rgba(93,68,48,0.32)]">
              <div className="px-5 py-5">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#A78A70]">食べる</div>
                <div className="mt-1 text-[17px] font-black tracking-tight text-[#3F3025]">{food?.title || "食べるケア"}</div>
                <p className="mt-3 text-[13px] font-bold leading-6 text-[#4F463D]">
                  {food?.recommendation || carePlan?.night_food_reason || "昨晩の予報に合わせた食養生です。今日の食事にも使えそうなら取り入れてください。"}
                </p>
              </div>
              {food?.avoid || carePlan?.tomorrow_caution ? (
                <div className="border-t border-[#EFE4D8] bg-[#FFF7EC] px-5 py-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#A66B38]">避けたい重ね方</div>
                  <p className="mt-1.5 text-[12px] font-extrabold leading-6 text-[#7A5638]">
                    {food?.avoid || carePlan.tomorrow_caution}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "life" ? (
            <div className="mt-4 overflow-hidden rounded-[24px] bg-white ring-1 ring-[#E8DACE] shadow-[0_14px_28px_-24px_rgba(93,68,48,0.32)]">
              <div className="px-5 py-5">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#A78A70]">暮らす</div>
                <div className="mt-1 text-[17px] font-black tracking-tight text-[#3F3025]">{lifestyle?.title || "暮らしの一手"}</div>
                <p className="mt-3 text-[13px] font-bold leading-6 text-[#4F463D]">
                  {lifestyle?.lead || "昨晩の予報に合わせた身の回りケアです。"}
                </p>
              </div>
              <div className="border-t border-[#EFE4D8] bg-[#FFFDF8] px-5 py-4">
                <div className="space-y-2.5">
                  {safeArray(lifestyle?.steps).slice(0, 3).map((step, index) => (
                    <div key={index} className="flex items-start gap-3 rounded-[18px] bg-white px-4 py-3 ring-1 ring-[#EFE4D8] shadow-sm">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#FFF7EC] text-[11px] font-black text-[#7A5638] ring-1 ring-[#E9D8C3]">
                        {index + 1}
                      </div>
                      <div className="text-[12px] font-extrabold leading-6 text-[#6D6257]">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Module>
  );
}

