// app/radar/RadarPageComponents.jsx
"use client";

import { useEffect, useState } from "react";
import { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { RADAR_LOCATION_PRESETS } from "@/lib/radar_v1/locationPresets";
import {
  getPointCautions,
  getPointImageCandidates,
  getPointMatchTags,
  formatTargetDate,
  getPointPressGuide,
  getPointReading,
  getPointRegionLabel,
  getPointRoleSummary,
  getPointSelectionReason,
  signalLabel,
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
                  ? "bg-slate-950 text-white ring-slate-950 shadow-[0_14px_30px_-22px_rgba(15,23,42,0.85)]"
                  : "bg-white text-slate-700 ring-slate-200 shadow-sm hover:-translate-y-0.5 hover:ring-slate-300",
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
                active ? "text-white/70" : item.locked ? "text-slate-400" : "text-[var(--accent-ink)]/75",
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
          {targetDateLabel}に向けて出したケアをそのまま見返せます。いまからの細かい変動は、ダッシュボードの「今日ここから」で確認できます。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 px-5 py-4">
        <div className="rounded-[18px] bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
          <div className="text-[10px] font-black text-slate-400">スコア</div>
          <div className="mt-1 text-[18px] font-black text-slate-950">{score}/10</div>
        </div>
        <div className="rounded-[18px] bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
          <div className="text-[10px] font-black text-slate-400">段階</div>
          <div className="mt-1 text-[14px] font-black text-slate-950">{signalLabel(forecast?.signal ?? 0)}</div>
        </div>
        <div className="rounded-[18px] bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
          <div className="text-[10px] font-black text-slate-400">山場</div>
          <div className="mt-1 text-[13px] font-black text-slate-950">{peakLabel || "—"}</div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <Button variant="secondary" onClick={onOpenDashboard} className="w-full bg-white shadow-sm">
          今日ここからの変動を見る
        </Button>
      </div>
    </Module>
  );
}

export function FutureForecastLockedPanel({ targetDate, onBackToTomorrow }) {
  const label = formatTargetDate(targetDate);
  return (
    <Module className="overflow-hidden p-0 bg-white ring-1 ring-[#E0D8C8] shadow-sm">
      <div className="relative px-6 py-7 bg-[linear-gradient(135deg,#FFF9EC_0%,#F5FBF7_100%)]">
        <div className="absolute right-4 top-4 rounded-full bg-white/80 px-3 py-1 text-[10px] font-black text-[#8A6A20] ring-1 ring-[#E9D7A6]">
          PREMIUM PREVIEW
        </div>
        <div className="text-[12px] font-black tracking-[0.18em] text-[#8A6A20]">{label}</div>
        <h2 className="mt-3 text-[22px] font-black tracking-tight text-slate-950 leading-snug">
          明後日以降の週間予報は、
          <br />
          先のケア計画として解放予定です。
        </h2>
        <p className="mt-3 text-[13px] font-bold leading-6 text-slate-600">
          無料では明日の予報を主役にします。数日先までのAI読み解きとケアは、コストと体験設計を分けるためPremium枠として扱います。
        </p>
      </div>

      <div className="relative px-6 py-6">
        <div className="pointer-events-none select-none space-y-3 blur-[3px] opacity-55">
          <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="h-3 w-24 rounded-full bg-slate-300" />
            <div className="mt-4 h-8 w-36 rounded-full bg-slate-300" />
            <div className="mt-4 h-3 w-full rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-[82%] rounded-full bg-slate-200" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-24 rounded-[20px] bg-slate-100 ring-1 ring-slate-200" />
            <div className="h-24 rounded-[20px] bg-slate-100 ring-1 ring-slate-200" />
            <div className="h-24 rounded-[20px] bg-slate-100 ring-1 ring-slate-200" />
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="rounded-[24px] bg-white/92 p-5 text-center shadow-xl ring-1 ring-slate-200 backdrop-blur-md">
            <div className="text-[13px] font-black text-slate-900">今は明日予報を磨く段階</div>
            <p className="mt-2 text-[12px] font-bold leading-5 text-slate-600">
              まずは「今日の見返し」と「明日の先回り」を中心に使える形にしています。
            </p>
            <Button onClick={onBackToTomorrow} className="mt-4 w-full shadow-sm">
              明日の予報へ戻る
            </Button>
          </div>
        </div>
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
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [point?.code]);

  if (!point) return null;

  const imageCandidates = getPointImageCandidates(point);
  const imageSrc = imageCandidates[imageIndex] || null;
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

        <div className="mt-6 overflow-hidden rounded-[24px] bg-slate-50 ring-1 ring-inset ring-[var(--ring)]">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={`${point.name_ja || point.code} の位置`}
              className="h-56 w-full object-contain bg-white"
              onError={() => {
                if (imageIndex < imageCandidates.length - 1) {
                  setImageIndex((i) => i + 1);
                } else {
                  setImageIndex(imageCandidates.length);
                }
              }}
            />
          ) : (
            <div className="flex h-56 items-center justify-center px-6 text-center text-[12px] font-bold leading-6 text-slate-500">
              画像がまだ用意されていないか、表示できませんでした。ツボ名とコードを見ながら、押し方の目安を先に使えます。
            </div>
          )}
        </div>

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
