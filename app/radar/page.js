// app/radar/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell, { Module } from "@/components/layout/AppShell";
import { CoreIllust } from "@/components/illust/core";
import Button from "@/components/ui/Button";
import ReviewFormSheet from "@/components/records/ReviewFormSheet";
import {
  IconBolt,
  IconCompass,
  IconMemo,
  IconRadar,
  IconResult,
  IconRipple,
  IconBowl,
} from "@/components/illust/icons/result";
// ★ 天候別トトノウくんアイコンをインポート
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
      noticeTitle: "今日の注意点",
      tsuboTitle: "今日の整えツボ",
      tsuboSubtitle: "今日ここから整えたい3点セット",
      foodTitle: "今日の食養生",
    };
  }

  return {
    noticeTitle: "明日の注意点",
    tsuboTitle: "今夜の先回りツボ",
    tsuboSubtitle: "今夜のうちに整えておきたい3点セット",
    foodTitle: "明日の食養生",
  };
}

function signalLabel(signal) {
  if (signal === 2) return "警戒";
  if (signal === 1) return "注意";
  return "安定";
}

function signalBadgeClass(signal) {
  if (signal === 2) return "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200";
  if (signal === 1) return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200";
  return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200";
}

function signalDotClass(signal) {
  if (signal === 2) return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
  if (signal === 1) return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]";
  return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
}

function signalPanelClass(signal) {
  if (signal === 2) return "ring-1 ring-rose-200 bg-gradient-to-br from-rose-50 to-[#fff1f2] text-rose-900";
  if (signal === 1) return "ring-1 ring-amber-200 bg-gradient-to-br from-amber-50 to-[#fffbeb] text-amber-900";
  return "ring-1 ring-emerald-200 bg-gradient-to-br from-emerald-50 to-[#ecfdf5] text-emerald-900";
}

function signalPanelSubtext(signal) {
  if (signal === 2) return "無理を詰め込みすぎず、早めのケアを意識したい日です。";
  if (signal === 1) return "少し崩れやすさがあるので、余白を持って過ごしたい日です。";
  return "大きく崩れにくい見込みですが、普段どおりのケアは続けると安心です。";
}

function sourceLabel(source) {
  if (source === "mtest") return "動きから選んだケア";
  return "体質から選んだケア";
}

function getPointRegionLabel(region) {
  if (region === "abdomen") return "お腹まわり";
  if (region === "head_neck") return "頭・首まわり";
  return "手足まわり";
}

const HIDDEN_LOCATION_LABELS = new Set(["primary", "current", "home"]);

const MATCH_TAG_LABELS = {
  "脾を意識": "消化吸収や重だるさに関わるはたらき",
  "脾": "消化吸収や重だるさに関わるはたらき",
  "肝を意識": "緊張や巡りの滞りに関わりやすいはたらき",
  "肝・胆ライン": "緊張や巡りの滞りに関わりやすいはたらき",
  "肝胆ライン": "緊張や巡りの滞りに関わりやすいはたらき",
  "湿": "重だるさ・むくみ・べたつく不調につながりやすい状態",
  "腹部から整える": "お腹まわりから整えたい日に向く考え方",
  "支える方向": "土台を支えて崩れにくくしたい日に向く考え方",
  "体質ケア": "体質に合わせたケア",
  "ラインケア": "動きの負担に向くケア",
};

function humanizeMatchTag(tag) {
  const raw = String(tag || "").trim();
  if (!raw) return "";
  return MATCH_TAG_LABELS[raw] || raw;
}

function getPointReading(point) {
  return String(point?.reading_ja || "").trim();
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
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿度";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

function getForecastTriggerKey(forecast) {
  if (!forecast) return "pressure_down";
  if (forecast.main_trigger === "pressure" && forecast.trigger_dir === "down") return "pressure_down";
  if (forecast.main_trigger === "pressure" && forecast.trigger_dir === "up") return "pressure_up";
  if (forecast.main_trigger === "temp" && forecast.trigger_dir === "down") return "cold";
  if (forecast.main_trigger === "temp" && forecast.trigger_dir === "up") return "heat";
  if (forecast.main_trigger === "humidity" && forecast.trigger_dir === "up") return "damp";
  return "dry";
}

function getMoodHeadline(triggerKey, signal, mode) {
  const day = mode === "today" ? "今日は" : "明日は";

  if (signal === 2) {
    if (triggerKey === "pressure_down") return `${day}重さをためない日`;
    if (triggerKey === "damp") return `${day}湿に飲まれない日`;
    if (triggerKey === "cold") return `${day}冷えを入れない日`;
    if (triggerKey === "heat") return `${day}熱をこもらせない日`;
    if (triggerKey === "dry") return `${day}乾きすぎに注意の日`;
    if (triggerKey === "pressure_up") return `${day}張りつめすぎ注意の日`;
  }

  if (signal === 1) {
    if (triggerKey === "pressure_down") return `${day}重だるさを流したい日`;
    if (triggerKey === "damp") return `${day}むくみをためたくない日`;
    if (triggerKey === "cold") return `${day}冷えに先回りしたい日`;
    if (triggerKey === "heat") return `${day}熱を抜いておきたい日`;
    if (triggerKey === "dry") return `${day}潤いを削りたくない日`;
    if (triggerKey === "pressure_up") return `${day}詰め込みすぎ注意の日`;
  }

  return `${day}無理なく整える日`;
}

function getHeroPanelClass(signal) {
  if (signal === 2) {
    return "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_35%),linear-gradient(135deg,#fff1f2_0%,#fff7ed_100%)] ring-1 ring-rose-200/70";
  }
  if (signal === 1) {
    return "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent_35%),linear-gradient(135deg,#fff8e8_0%,#fffdf4_100%)] ring-1 ring-amber-200/70";
  }
  return "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent_35%),linear-gradient(135deg,#effcf5_0%,#f7fffb_100%)] ring-1 ring-emerald-200/70";
}

function getHeroAccentClass(signal) {
  if (signal === 2) return "text-rose-700";
  if (signal === 1) return "text-amber-700";
  return "text-emerald-700";
}

function getTsuboRoleLabel(point, index) {
  if (index === 0) {
    return point?.source === "mtest" ? "まず整えたいラインケア" : "まず整えたい体質ケア";
  }
  return point?.source === "mtest" ? "ラインケア" : "体質ケア";
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
  return Array.from(
    new Set(
      safeArray(point?.explanation?.match_tags)
        .map((tag) => humanizeMatchTag(tag))
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 3);
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

function getPointImageCandidates(point) {
  const out = [];

  if (point?.image_path) {
    const clean = String(point.image_path).replace(/^\/+/, "");
    if (clean) out.push(`/${clean}`);
  }

  const rawCode = String(point?.code || "").trim();
  if (rawCode) {
    const upper = rawCode.toUpperCase();
    const lower = rawCode.toLowerCase();

    out.push(`/illust/points/${upper}.webp`);
    out.push(`/illust/points/${upper}.png`);
    out.push(`/illust/points/${upper}.jpg`);

    out.push(`/illust/points/${lower}.webp`);
    out.push(`/illust/points/${lower}.png`);
    out.push(`/illust/points/${lower}.jpg`);
  }

  return Array.from(new Set(out));
}

function getPointCautions(point) {
  return safeArray(point?.cautions)
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.text || item.label || item.title || "";
      return "";
    })
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

const FLAT_PRESETS = flattenRadarLocationPresets();

function getLocationDisplayLabel(location) {
  if (!location) return "設定中の地域";

  const directLabel = [location.display_name, location.label]
    .map((v) => String(v || "").trim())
    .find((v) => v && !HIDDEN_LOCATION_LABELS.has(v.toLowerCase()));
  if (directLabel) return directLabel;

  const matched = FLAT_PRESETS.find(
    (opt) =>
      Number(opt.lat).toFixed(4) === Number(location.lat).toFixed(4) &&
      Number(opt.lon).toFixed(4) === Number(location.lon).toFixed(4)
  );
  if (matched?.label) return matched.label;

  if (location.lat != null && location.lon != null) {
    return `緯度${Number(location.lat).toFixed(2)} / 経度${Number(location.lon).toFixed(2)}`;
  }

  return "設定中の地域";
}

/* -----------------------------
 * Components
 * ---------------------------- */

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
    <Module className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[18px] font-black tracking-tight text-slate-900">地域を設定する</div>
          <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-600">
            現在地か、生活圏に近い代表地点を設定できます。
            変更した場合は次回の予報から反映されます。
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

function PointDetailSheet({ point, onClose }) {
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
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
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
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            このツボを選んだ理由
          </div>
          <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-700">
            {getPointSelectionReason(point)}
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

        {/* 下部見切れ防止用スペーサー */}
        <div className="h-8 w-full sm:h-2" />
      </div>
    </div>
  );
}

/* -----------------------------
 * Main Page
 * ---------------------------- */

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
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [tsuboExtraOpen, setTsuboExtraOpen] = useState(false);
  const [foodDetailOpen, setFoodDetailOpen] = useState(false);
  
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

  const locationDisplayLabel = useMemo(
    () => getLocationDisplayLabel(bundle?.location),
    [bundle?.location]
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
  const triggerKey = useMemo(() => getForecastTriggerKey(forecast), [forecast]);
  const moodHeadline = useMemo(
    () => getMoodHeadline(triggerKey, forecast?.signal ?? 0, bundleDateMode),
    [triggerKey, forecast?.signal, bundleDateMode]
  );
  const heroLead = forecastLines[0] || signalPanelSubtext(forecast.signal);
  const primaryTsubo = tsuboPoints[0] || null;
  const extraTsuboPoints = tsuboPoints.slice(1);
  const foodExamples = safeArray(food.examples);
  const hasFoodDetails =
    !!food.how_to || !!food.avoid || !!food.reason || !!food.lifestyle_tip;

  const todayRecordDate = getJstTodayTomorrow().today;
  const todayRecordDateLabel = formatTargetDate(todayRecordDate);

  if (loadingAuth || loading) {
    return (
      <AppShell title="体調予報" subtitle="読み込み中…" headerRight={<div className="h-8 w-24 bg-slate-100 rounded-full animate-pulse" />}>
        <div className="space-y-6 pt-4">
          <div className="h-10 w-full rounded-full bg-slate-100 animate-pulse" />
          <div className="h-48 rounded-[32px] bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-[32px] bg-slate-100 animate-pulse" />
          <div className="h-64 rounded-[32px] bg-slate-100 animate-pulse" />
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell title="体調予報" subtitle="ログインが必要です">
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900">ログインが必要です</div>
          <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
            体調予報（未病レーダー）はログイン後に使えます。
          </div>

          <div className="mt-8 space-y-3">
            <Button
              onClick={() => router.push("/signup")}
              className="w-full shadow-md"
            >
              無料で登録・ログイン
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/check")}
              className="w-full"
            >
              体質チェックへ
            </Button>
          </div>
        </Module>
      </AppShell>
    );
  }

  if (needsLocation) {
    return (
      <AppShell title="体調予報" subtitle="地域設定">
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

  if (!bundle || !forecast || !carePlan) {
    return (
      <AppShell title="体調予報" subtitle="予報を読み込めませんでした">
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900">予報を読み込めませんでした</div>
          <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
            {error || "時間をおいてもう一度お試しください。"}
          </div>
          <Button
            onClick={() => fetchForecast({ force: true, nextDateMode: dateMode })}
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
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-black tracking-wider text-slate-600 shadow-sm ring-1 ring-inset ring-[var(--ring)] hover:bg-slate-50 transition-all active:scale-95"
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

      {/* メインタブ (予報・対策 / 記録) */}
      <div className="sticky top-[60px] z-20 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70 py-2 mb-2">
        <SegmentedTabs
          tabs={[
            { key: "forecast", label: "予報・対策" },
            { key: "record", label: "記録" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "forecast" ? (
        <div className="space-y-6">
          {/* サブタブ (今日 / 明日) */}
          <div className="mx-auto w-[60%]">
            <SegmentedTabs
              tabs={[
                { key: "today", label: "今日" },
                { key: "tomorrow", label: "明日" },
              ]}
              value={bundleDateMode}
              onChange={setDateMode}
            />
          </div>

          {error && !showLocationEditor ? (
            <div className="rounded-[16px] bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
              {error}
            </div>
          ) : null}

          {/* 1. 明日のムードカード */}
          <Module className="relative overflow-hidden p-6">
            <div
              className={[
                "relative overflow-hidden rounded-[30px] px-5 py-5 shadow-sm",
                getHeroPanelClass(forecast.signal),
              ].join(" ")}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 opacity-[0.12]">
                <WeatherIcon triggerKey={triggerKey} className="h-28 w-28" />
              </div>
              <div className="pointer-events-none absolute -left-10 bottom-[-38px] h-28 w-28 rounded-full bg-white/40 blur-2xl" />
              <div className="pointer-events-none absolute right-[18%] top-[18%] h-24 w-24 rounded-full border border-white/35" />
              <div className="pointer-events-none absolute right-[10%] top-[10%] h-36 w-36 rounded-full border border-white/25" />

              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-white/70 text-[var(--accent-ink)] ring-1 ring-black/5 shadow-sm">
                      <IconRadar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-500/80">
                        明日のムード
                      </div>
                      <div className="mt-1 text-[14px] font-black tracking-tight text-slate-900">
                        {scoreCardTitle}
                      </div>
                    </div>
                  </div>

                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-black shadow-sm",
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
                  </span>
                </div>

                <div className="mt-5">
                  <div className="text-[25px] font-black tracking-tight text-slate-900">
                    {moodHeadline}
                  </div>
                  <div className="mt-2 max-w-[80%] text-[14px] font-bold leading-6 text-slate-700">
                    {heroLead}
                  </div>
                </div>

                <div className="mt-6 flex items-end gap-2">
                  <div className="pb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500/80">
                    崩れやすさ
                  </div>
                  <span className="text-[58px] font-black leading-none tracking-[-0.04em] text-slate-900">
                    {forecast.score_0_10}
                  </span>
                  <span className="pb-1.5 text-[18px] font-black text-slate-400">/10</span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] bg-white/70 px-4 py-4 ring-1 ring-black/5 backdrop-blur-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      一番響きやすい要素
                    </div>
                    <div className="mt-2 flex items-center gap-2.5">
                      <div className={getHeroAccentClass(forecast.signal)}>
                        <WeatherIcon triggerKey={triggerKey} className="h-8 w-8" />
                      </div>
                      <div className="text-[16px] font-black tracking-tight text-slate-900">
                        {getCompatTriggerLabel(forecast.main_trigger, forecast.trigger_dir)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-white/70 px-4 py-4 ring-1 ring-black/5 backdrop-blur-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      気をつけたい時間帯
                    </div>
                    <div className="mt-2 text-[20px] font-black tracking-tight text-slate-900">
                      {forecast.peak_start && forecast.peak_end
                        ? `${String(forecast.peak_start).slice(0, 5)}–${String(
                            forecast.peak_end
                          ).slice(0, 5)}`
                        : "—"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNoticeOpen((v) => !v)}
                    className="rounded-[20px] bg-white/70 px-4 py-4 ring-1 ring-black/5 backdrop-blur-sm text-left transition-all hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {sectionLabels.noticeTitle}
                        </div>
                        <div className="mt-2 text-[15px] font-black tracking-tight text-slate-900">
                          くわしく見る
                        </div>
                      </div>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className={[
                          "h-5 w-5 text-slate-400 transition-transform",
                          noticeOpen ? "rotate-180" : "",
                        ].join(" ")}
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </Module>

          {/* 2. 今夜の先回りツボ */}
          <Module className="p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm">
                <IconRipple className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[18px] font-black tracking-tight text-slate-900">
                  {sectionLabels.tsuboTitle}
                </div>
                <div className="mt-0.5 text-[11px] font-black text-slate-500">
                  {sectionLabels.tsuboSubtitle}
                </div>
              </div>
            </div>

            {primaryTsubo ? (
              <div
                className="mt-6 relative overflow-hidden rounded-[28px] bg-[color-mix(in_srgb,var(--mint),white_78%)] p-5 ring-1 ring-[var(--ring)] shadow-sm cursor-pointer"
                onClick={() => setSelectedPoint(primaryTsubo)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-black tracking-wide text-[var(--accent-ink)] ring-1 ring-black/5">
                      {getTsuboRoleLabel(primaryTsubo, 0)}
                    </div>

                    <div className="mt-3 flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-white text-[16px] font-black text-[var(--accent-ink)] shadow-sm ring-1 ring-black/5">
                        {primaryTsubo.code}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[21px] font-black tracking-tight text-slate-900">
                          {primaryTsubo.name_ja || primaryTsubo.code}
                        </div>
                        {getPointReading(primaryTsubo) ? (
                          <div className="mt-0.5 text-[12px] font-black tracking-wider text-slate-400">
                            {getPointReading(primaryTsubo)}
                          </div>
                        ) : null}
                        <div className="mt-3 text-[14px] font-extrabold leading-6 text-slate-700">
                          {getPointRoleSummary(primaryTsubo)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <svg viewBox="0 0 24 24" fill="none" className="mt-8 h-5 w-5 shrink-0 text-slate-300" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            ) : null}

            {extraTsuboPoints.length > 0 ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setTsuboExtraOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-[18px] bg-slate-50 px-4 py-3 ring-1 ring-inset ring-[var(--ring)] text-left"
                >
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      あわせて整えたい
                    </div>
                    <div className="mt-1 text-[14px] font-black tracking-tight text-slate-900">
                      あと{extraTsuboPoints.length}点を見る
                    </div>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={[
                      "h-5 w-5 text-slate-400 transition-transform",
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
                  <div className="mt-3 space-y-3">
                    {extraTsuboPoints.map((p, i) => (
                      <div
                        key={`${p.code}-${i + 1}`}
                        className="relative rounded-[22px] bg-slate-50 p-5 ring-1 ring-inset ring-[var(--ring)] transition-all hover:bg-slate-100 cursor-pointer"
                        onClick={() => setSelectedPoint(p)}
                      >
                        <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black tracking-wide text-slate-600 ring-1 ring-black/5">
                          {getTsuboRoleLabel(p, i + 1)}
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white text-[14px] font-black text-[var(--accent-ink)] shadow-sm ring-1 ring-black/5">
                            {p.code}
                          </div>

                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="text-[16px] font-black tracking-tight text-slate-900">
                              {p.name_ja || p.code}
                            </div>

                            {getPointReading(p) ? (
                              <div className="mt-0.5 text-[11px] font-black tracking-wider text-slate-400">
                                {getPointReading(p)}
                              </div>
                            ) : null}

                            <div className="mt-2.5 text-[13px] font-bold leading-6 text-slate-700">
                              {getPointRoleSummary(p)}
                            </div>
                          </div>
                        </div>

                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 rounded-[20px] bg-amber-50 px-5 py-4 ring-1 ring-inset ring-amber-200 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-widest text-amber-700/80">
                アドバイス
              </div>
              <div className="mt-1.5 text-[13px] font-extrabold leading-6 text-amber-900">
                {carePlan?.night_note || "軽く整えておくと、ぶれを抑えやすくなります。"}
              </div>
            </div>
          </Module>

          {/* 3. 食養生 */}
          <Module className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm">
                <IconBowl className="h-5 w-5" />
              </div>
              <div className="text-[18px] font-black tracking-tight text-slate-900">
                {sectionLabels.foodTitle}
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 px-5 py-5 ring-1 ring-inset ring-[var(--ring)]">
              <div className="text-[15px] font-black tracking-tight text-slate-900">
                {food.title || `${getDateModeLabel(bundleDateMode)}の食養生`}
              </div>

              {food.recommendation || food.focus ? (
                <div className="mt-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    おすすめ
                  </div>
                  <div className="mt-1 text-[15px] font-black leading-6 text-[var(--accent-ink)]">
                    {food.recommendation || food.focus}
                  </div>
                </div>
              ) : null}

              {foodExamples.length > 0 ? (
                <div className="mt-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    具体例
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {foodExamples.map((x, idx) => (
                      <span
                        key={`${x}-${idx}`}
                        className="rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-slate-700 shadow-sm ring-1 ring-black/5"
                      >
                        {x}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {hasFoodDetails ? (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setFoodDetailOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-[18px] bg-white px-4 py-3 ring-1 ring-black/5 text-left"
                  >
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        もっと見る
                      </div>
                      <div className="mt-1 text-[14px] font-black tracking-tight text-slate-900">
                        取り入れ方や控えたいこと
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className={[
                        "h-5 w-5 text-slate-400 transition-transform",
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
                    <div className="mt-4 border-t border-slate-200 pt-4">
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
                        <div className="mt-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            控えたいこと
                          </div>
                          <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-700">
                            {food.avoid}
                          </div>
                        </div>
                      ) : null}

                      {food.reason ? (
                        <div className="mt-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            ひとこと理由
                          </div>
                          <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-700">
                            {food.reason}
                          </div>
                        </div>
                      ) : null}

                      {food.lifestyle_tip ? (
                        <div className="mt-4 rounded-[18px] bg-white px-4 py-4 ring-1 ring-[var(--ring)] shadow-sm">
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
          </Module>

          {/* 4. 体質カード */}
          <Module className="p-5 bg-[color-mix(in_srgb,var(--mint),white_70%)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-ink)]/60">
                  ベースとなるあなたの体質
                </div>

                <div className="mt-2 flex items-center gap-4">
                  <div className="grid h-[84px] w-[84px] place-items-center overflow-hidden rounded-[22px] bg-white/75 p-2 ring-1 ring-black/5 shadow-sm">
                    <CoreIllust
                      code={coreCode}
                      title={coreLabel?.title || "体質タイプ"}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[24px] font-black tracking-tight text-[var(--accent-ink)]">
                      {coreLabel?.title || "—"}
                    </div>

                    {subLabelObjects?.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {subLabelObjects.map((s) => (
                          <span
                            key={s.code}
                            className="rounded-md bg-white/70 px-2.5 py-1 text-[11px] font-extrabold text-[var(--accent-ink)] ring-1 ring-inset ring-black/5"
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
                    <div className="rounded-[16px] bg-white/70 px-4 py-3 ring-1 ring-black/5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        お困りの不調
                      </div>
                      <div className="mt-1 text-[14px] font-black tracking-tight text-slate-900">
                        {symptomLabel}
                      </div>
                    </div>
                  ) : null}

                  {primaryLine ? (
                    <div className="rounded-[16px] bg-white/70 px-4 py-3 ring-1 ring-black/5">
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
                className="shrink-0 bg-white ring-1 ring-black/5 shadow-sm text-slate-700"
              >
                {openingProfileDetail ? "開いています…" : "詳しく見る"}
              </Button>
            </div>
          </Module>

          {/* 5. 注意点（折りたたみ） */}
          <Module className="p-5">
            <button
              type="button"
              onClick={() => setNoticeOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-slate-50 text-slate-500 ring-1 ring-[var(--ring)] shadow-sm">
                  <IconMemo className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-[16px] font-black tracking-tight text-slate-900">
                    {sectionLabels.noticeTitle}
                  </div>
                  <div className="mt-0.5 text-[11px] font-black text-slate-500">
                    くわしい過ごし方を見る
                  </div>
                </div>
              </div>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={[
                  "h-5 w-5 text-slate-400 transition-transform",
                  noticeOpen ? "rotate-180" : "",
                ].join(" ")}
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {noticeOpen ? (
              <div className="mt-5 rounded-[24px] bg-white px-5 py-5 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
                <ul className="space-y-3">
                  {forecastLines.map((line, idx) => (
                    <li
                      key={`${idx}-${line}`}
                      className="flex items-start gap-3 text-[13px] font-bold leading-6 text-slate-700"
                    >
                      <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-ink)]/40" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Module>
        </div>
      ) : (
        <div className="space-y-6">
          <Module className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[18px] font-black tracking-tight text-slate-900">今日の記録</div>
                <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-600">
                  予報を見た日の終わりに1回だけ、実際どうだったかと先回りできたかを残します。
                </div>
              </div>
            </div>
            
            <div className="mt-5">
              <Button
                onClick={() => setReviewEditorOpen(true)}
                className="w-full shadow-md"
              >
                {todayReview ? "記録を編集する" : "記録をつける"}
              </Button>
            </div>

            {loadingTodayReview ? (
              <div className="mt-6 text-[13px] font-bold text-slate-500">読み込み中…</div>
            ) : todayReviewForecast ? (
              <div className="mt-6 rounded-[24px] bg-slate-50 px-5 py-4 ring-1 ring-inset ring-[var(--ring)]">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                  予報の振り返り
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold shadow-sm ring-1 ring-inset",
                      reviewSignalBadgeClass(todayReviewForecast.signal),
                    ].join(" ")}
                  >
                    {reviewSignalLabel(todayReviewForecast.signal)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-black/5 shadow-sm">
                    {todayReviewForecast.score_0_10} / 10
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-black/5 shadow-sm">
                    {reviewTriggerLabel(
                      todayReviewForecast.main_trigger,
                      todayReviewForecast.trigger_dir
                    )}
                  </span>
                </div>
                <div className="mt-3 text-[12px] font-bold leading-5 text-slate-600">
                  {todayReviewForecast.why_short || "今日の予報と体調の答え合わせを残せます。"}
                </div>
              </div>
            ) : null}

            {todayReview ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-[20px] bg-white px-5 py-4 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">実際どうだった？</div>
                  <div className="mt-1 text-[16px] font-black tracking-tight text-slate-900">
                    {conditionLabel(todayReview.condition_level)}
                  </div>
                </div>
                <div className="rounded-[20px] bg-white px-5 py-4 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">先回りできた？</div>
                  <div className="mt-1 text-[16px] font-black tracking-tight text-slate-900">
                    {preventLabel(todayReview.prevent_level)}
                  </div>
                </div>
                <div className="rounded-[20px] bg-white px-5 py-4 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">やったこと</div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
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
                      <span className="text-[13px] font-bold text-slate-500">記録なし</span>
                    )}
                  </div>
                </div>
                {todayReview.note ? (
                  <div className="rounded-[20px] bg-white px-5 py-4 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">メモ</div>
                    <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-700">
                      {todayReview.note}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center">
                 <div className="text-[14px] font-black text-slate-700">{todayRecordDateLabel} の記録はありません</div>
                 <div className="mt-2 text-[12px] font-bold leading-5 text-slate-500">
                    しんどかった日だけでも残しておくと、週次レポートで自分の傾向が見えやすくなります。
                 </div>
              </div>
            )}
          </Module>

          <Module className="p-6">
            <div className="text-[18px] font-black tracking-tight text-slate-900">記録ページで見返す</div>
            <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-600">
              記録カレンダーでは日ごとの履歴を、週次レポートでは1週間の傾向をまとめて見返せます。
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={() => router.push("/records?tab=calendar")}
                className="w-full shadow-md"
              >
                記録カレンダーへ
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push("/records?tab=report")}
                className="w-full"
              >
                週次レポートへ
              </Button>
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

      <div className="pb-4 pt-2 text-[10px] font-extrabold leading-5 text-slate-400 text-center px-4">
        ※ 未病レーダーはセルフケア支援です。強い症状がある場合は無理をせず、必要に応じて医療機関に相談してください。
      </div>
    </AppShell>
  );
}
