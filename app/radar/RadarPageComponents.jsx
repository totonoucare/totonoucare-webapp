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
  getPointPressGuide,
  getPointReading,
  getPointRegionLabel,
  getPointRoleSummary,
  getPointSelectionReason,
  sourceLabel,
} from "./utils";

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
    <div className="rounded-[22px] bg-slate-200/60 p-1 ring-1 ring-inset ring-slate-200/75 shadow-inner">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const active = value === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={[
                "h-[40px] rounded-[18px] text-[13px] font-black tracking-tight transition-all duration-200 inline-flex items-center justify-center gap-1.5",
                active
                  ? "bg-[var(--accent)] text-white shadow-[0_12px_24px_-16px_rgba(53,95,82,0.55)]"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
              ].join(" ")}
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {t.label}
            </button>
          );
        })}
      </div>
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
              {sourceLabel(point.source)} / {getPointRegionLabel(point)}
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

        </div>

        <div className="mt-4 rounded-[20px] bg-[#FFF9ED] px-5 py-4 ring-1 ring-[#EAD8A6]/60 shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-widest text-[#AD7A18]/85">
            ほぐし方の目安
          </div>
          <div className="mt-1.5 text-[13px] font-extrabold leading-6 text-[#7B5619]">
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

