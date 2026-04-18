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
  return `${getDateModeLabel(mode)}(${formatTargetDate(targetDate)})の予報`;
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
const RADAR_LOADING_HINTS = [
  "体質データを読み込んでいます…",
  "今日の気圧・気温・湿度の変化を照合しています…",
  "あなた向けの注意ポイントをまとめています…",
];


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

function getMoodHeadline(triggerKey, signal) {
  if (signal === 2) {
    if (triggerKey === "pressure_down") return "低気圧による重だるさ対策を優先";
    if (triggerKey === "damp") return "湿気による重さ・むくみ対策を優先";
    if (triggerKey === "cold") return "冷えによるこわばり対策を優先";
    if (triggerKey === "heat") return "熱こもりによる消耗対策を優先";
    if (triggerKey === "dry") return "乾燥による荒れ対策を優先";
    if (triggerKey === "pressure_up") return "高気圧による張りつめ対策を優先";
  }

  if (signal === 1) {
    if (triggerKey === "pressure_down") return "低気圧による重だるさ対策を意識";
    if (triggerKey === "damp") return "湿気による重さ・むくみ対策を意識";
    if (triggerKey === "cold") return "冷えによるこわばり対策を意識";
    if (triggerKey === "heat") return "熱こもり対策を意識";
    if (triggerKey === "dry") return "乾燥対策を意識";
    if (triggerKey === "pressure_up") return "高気圧による張りつめ対策を意識";
  }

  return "影響は小さいですが、いつも通りの対策を";
}

function getHeroPanelClass(signal) {
  if (signal === 2) {
    return "bg-[linear-gradient(135deg,#fff7f7_0%,#fff8ef_100%)] ring-1 ring-rose-200/70";
  }
  if (signal === 1) {
    return "bg-[linear-gradient(135deg,#fffaf0_0%,#fffdf7_100%)] ring-1 ring-amber-200/70";
  }
  return "bg-[linear-gradient(135deg,#f3fcf7_0%,#fbfffd_100%)] ring-1 ring-emerald-200/70";
}

function getHeroAccentClass(signal) {
  if (signal === 2) return "text-rose-700";
  if (signal === 1) return "text-amber-700";
  return "text-emerald-700";
}

function getHeroScoreClass(signal) {
  if (signal === 2) return "text-rose-700";
  if (signal === 1) return "text-amber-700";
  return "text-emerald-700";
}

function getHeroDecorClass(signal) {
  if (signal === 2) return "from-rose-200/35 to-rose-100/5 border-rose-200/45";
  if (signal === 1) return "from-amber-200/35 to-amber-100/5 border-amber-200/45";
  return "from-emerald-200/35 to-emerald-100/5 border-emerald-200/45";
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
      ? "仰向けでお腹の力を抜き、吐く息に合わせて中指でやさしく押します。"
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


function clampScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function getGaugeStroke(signal) {
  if (signal === 2) return "#dc2626";
  if (signal === 1) return "#d97706";
  return "#2f7a57";
}

function getGaugeSoftStroke(signal) {
  if (signal === 2) return "rgba(244,63,94,0.18)";
  if (signal === 1) return "rgba(245,158,11,0.18)";
  return "rgba(16,185,129,0.18)";
}

function getGaugeFill(signal) {
  if (signal === 2) return "rgba(255,241,242,0.96)";
  if (signal === 1) return "rgba(255,251,235,0.96)";
  return "rgba(236,253,245,0.96)";
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

function getGaugeModeLabel() {
  return "影響度スコア";
}

// 改善されたgetGaugeTone関数
function getGaugeTone(signal) {
  // 警戒 (6〜10)
  if (signal === 2) {
    return {
      stroke: "#e57a8f", // 警戒リングのメインカラー（より鮮やかで、かつ落ち着いた赤へ）
      ring: "#f1a8b5",  // リングのより明るい部分
      ringSoft: "rgba(229,122,143,0.14)", // 柔らかな外側の光
      inner: "#fbf2f4", // 中央円の内側
      fillStart: "rgba(251,242,244,0.96)", // ゲージのグラデーション開始
      fillEnd: "rgba(229,122,143,0.92)",  // ゲージのグラデーション終了（透明度を微調整）
      shadow: "rgba(229,122,143,0.08)",   // ゲージの影
      main: "#b54e60", // 警戒のテキスト/アイコンのメインカラー（彩度と明度を調整）
      labelText: "#8f3a4b", // ラベルテキストの色
      labelBg: "rgba(251,242,244,0.98)", // ラベルの背景色（超明るい警戒色。見やすさ向上）
      labelBorder: "rgba(229,122,143,0.22)", // ラベルのボーダー
      labelShadow: "rgba(229,122,143,0.06)", // ラベルの影
    };
  }

  // 注意 (4〜5)
  if (signal === 1) {
    return {
      stroke: "#f2bc6a", // 注意リングのメインカラー（より明るく、温かみのあるオレンジゴールドへ）
      ring: "#fbd496",  // リングのより明るい部分
      ringSoft: "rgba(242,188,106,0.14)", // 柔らかな外側の光
      inner: "#fdf8ef", // 中央円の内側
      fillStart: "rgba(253,248,239,0.96)", // ゲージのグラデーション開始
      fillEnd: "rgba(242,188,106,0.92)",  // ゲージのグラデーション終了
      shadow: "rgba(242,188,106,0.08)",   // ゲージの影
      main: "#c18f3d", // 注意のテキスト/アイコンのメインカラー
      labelText: "#9a6c2f", // ラベルテキストの色
      labelBg: "rgba(253,248,239,0.98)", // ラベルの背景色（超明るい注意色）
      labelBorder: "rgba(242,188,106,0.22)", // ラベルのボーダー
      labelShadow: "rgba(242,188,106,0.06)", // ラベルの影
    };
  }

  // 安定 (1〜3)
  return {
    stroke: "#5db7a1", // 安定リングのメインカラー（より鮮やかで、健康的なミントグリーンへ）
    ring: "#83c9b7",  // リングのより明るい部分
    ringSoft: "rgba(93,183,161,0.14)", // 柔らかな外側の光
    inner: "#f1f8f6", // 中央円の内側
    fillStart: "rgba(241,248,246,0.96)", // ゲージのグラデーション開始
    fillEnd: "rgba(93,183,161,0.92)",  // ゲージのグラデーション終了
    shadow: "rgba(93,183,161,0.08)",   // ゲージの影
    main: "#3d8b7a", // 安定のテキスト/アイコンのメインカラー
    labelText: "#2f6c5e", // ラベルテキストの色
    labelBg: "rgba(241,248,246,0.98)", // ラベルの背景色（超明るい安定色）
    labelBorder: "rgba(93,183,161,0.22)", // ラベルのボーダー
    labelShadow: "rgba(93,183,161,0.06)", // ラベルの影
  };
}

function getGaugeModePillTone(signal) {
  if (signal === 2) {
    return "border-rose-200 bg-white/92 text-rose-700 shadow-[0_10px_24px_-18px_rgba(225,29,72,0.42)]";
  }
  if (signal === 1) {
    return "border-amber-200 bg-white/92 text-amber-700 shadow-[0_10px_24px_-18px_rgba(217,119,6,0.42)]";
  }
  return "border-emerald-200 bg-white/92 text-emerald-700 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.38)]";
}

function getGaugeShadow(signal) {
  if (signal === 2) return "rgba(225,29,72,0.42)";
  if (signal === 1) return "rgba(217,119,6,0.40)";
  return "rgba(16,185,129,0.34)";
}

function ForecastGauge({ score = 0, signal = 0, triggerKey = "pressure_down" }) {
  const safeScore = Math.max(0, Math.min(10, Number(score) || 0));
  const tone = getGaugeTone(signal);

  const cx = 170;
  const cy = 172;

  const gaugeStart = -120;
  const gaugeEnd = 120;
  const valueAngle = gaugeStart + ((gaugeEnd - gaugeStart) * safeScore) / 10;

  const outerRadius = 112;
  const innerRadius = 80;
  const guideRadius = 126;
  const rangeRadius = 138;
  const needleRadius = 105;

  const centerFill = "#ffffff";
  const scoreShadow =
    signal === 2
      ? "rgba(225,29,72,0.18)"
      : signal === 1
      ? "rgba(217,119,6,0.18)"
      : "rgba(5,150,105,0.16)";

  const stableEnd = gaugeStart + ((gaugeEnd - gaugeStart) * 3) / 10;
  const cautionEnd = gaugeStart + ((gaugeEnd - gaugeStart) * 5) / 10;

  const needleTip = polarToCartesian(cx, cy, needleRadius, valueAngle);
  const needleTail = polarToCartesian(cx, cy, 18, valueAngle + 180);
  const startLabelPos = polarToCartesian(cx, cy, rangeRadius + 10, gaugeStart);
  const endLabelPos = polarToCartesian(cx, cy, rangeRadius + 10, gaugeEnd);

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="relative aspect-[1/1.04]">
        <svg viewBox="0 0 340 352" className="h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`gauge-track-${signal}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            <linearGradient id={`gauge-fill-${signal}`} x1="18%" y1="18%" x2="82%" y2="82%">
              <stop offset="0%" stopColor={tone.fillStart} />
              <stop offset="100%" stopColor={tone.fillEnd} />
            </linearGradient>

            <linearGradient id={`needle-${signal}`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor={tone.fillStart} />
              <stop offset="100%" stopColor={tone.fillEnd} />
            </linearGradient>

            <filter id={`gauge-shadow-${signal}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="10" stdDeviation="11" floodColor={scoreShadow} />
            </filter>
          </defs>

          <ellipse cx={170} cy={286} rx={104} ry={18} fill={tone.shadow} />
          <ellipse cx={170} cy={286} rx={76} ry={10} fill="rgba(255,255,255,0.82)" />

          <path
            d={describeArc(cx, cy, guideRadius, gaugeStart, gaugeEnd)}
            fill="none"
            stroke={tone.ring}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.95"
          />

          <path
            d={describeArc(cx, cy, rangeRadius, gaugeStart, stableEnd)}
            fill="none"
            stroke="rgba(93,183,161,0.54)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d={describeArc(cx, cy, rangeRadius, stableEnd, cautionEnd)}
            fill="none"
            stroke="rgba(242,188,106,0.54)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d={describeArc(cx, cy, rangeRadius, cautionEnd, gaugeEnd)}
            fill="none"
            stroke="rgba(229,122,143,0.52)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <path
            d={describeArc(cx, cy, outerRadius, gaugeStart, gaugeEnd)}
            fill="none"
            stroke={`url(#gauge-track-${signal})`}
            strokeWidth="22"
            strokeLinecap="round"
          />

          <path
            d={describeArc(cx, cy, outerRadius, gaugeStart, valueAngle)}
            fill="none"
            stroke={`url(#gauge-fill-${signal})`}
            strokeWidth="24"
            strokeLinecap="round"
            filter={`url(#gauge-shadow-${signal})`}
          />

          {[gaugeStart, gaugeStart + 48, gaugeStart + 96, gaugeStart + 144, gaugeEnd].map((angle, idx) => {
            const inner = polarToCartesian(cx, cy, innerRadius + 4, angle);
            const outer = polarToCartesian(cx, cy, guideRadius - 4, angle);
            const strong = idx === 0 || idx === 2 || idx === 4;
            return (
              <line
                key={angle}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={strong ? "rgba(100,116,139,0.58)" : "rgba(148,163,184,0.52)"}
                strokeWidth={strong ? "3.5" : "2.5"}
                strokeLinecap="round"
              />
            );
          })}

          <circle cx={170} cy={172} r={94} fill={centerFill} stroke={tone.ringSoft} strokeWidth="5" />
          <circle cx={170} cy={172} r={58} fill="#ffffff" stroke={tone.ring} strokeWidth="3" />

          <line
            x1={needleTail.x}
            y1={needleTail.y}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={`url(#needle-${signal})`}
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.95"
          />

          <circle
            cx={needleTip.x}
            cy={needleTip.y}
            r={14}
            fill="#ffffff"
            stroke={tone.fillEnd}
            strokeWidth="4"
            filter={`url(#gauge-shadow-${signal})`}
          />
          <circle cx={170} cy={172} r={10} fill="#ffffff" stroke="rgba(226,232,240,0.95)" strokeWidth="2.5" />
          <circle cx={170} cy={172} r={5.5} fill={tone.fillEnd} />



          <text
            x={170}
            y={203}
            textAnchor="middle"
            fontSize="58"
            fontWeight="900"
            fill={tone.main}
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="5"
            paintOrder="stroke"
          >
            {safeScore}
          </text>
          <text
            x={209}
            y={203}
            textAnchor="start"
            fontSize="26"
            fontWeight="900"
            fill="rgba(100,116,139,0.92)"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="3"
            paintOrder="stroke"
          >
            /10
          </text>

          <text
            x={startLabelPos.x}
            y={startLabelPos.y + 6}
            textAnchor="middle"
            fontSize="14"
            fontWeight="900"
            fill="rgba(148,163,184,0.88)"
          >
            0
          </text>
          <text
            x={endLabelPos.x}
            y={endLabelPos.y + 6}
            textAnchor="middle"
            fontSize="14"
            fontWeight="900"
            fill="rgba(100,116,139,0.82)"
          >
            10
          </text>
        </svg>

        <div
          className="pointer-events-none absolute left-1/2 top-[70.5%] -translate-x-1/2 -translate-y-1/2 rounded-full border px-5 py-2 text-[12px] font-black shadow-sm backdrop-blur-sm"
          style={{
            color: tone.labelText,
            background: tone.labelBg,
            borderColor: tone.labelBorder,
            boxShadow: `0 12px 24px ${tone.labelShadow}`,
          }}
        >
          {getGaugeModeLabel(triggerKey)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-black text-emerald-700">
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          1〜3 安定
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-black text-amber-700">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          4〜5 注意
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[12px] font-black text-rose-700">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          6〜10 警戒
        </span>
      </div>
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
  const [showSlowLoadingMessage, setShowSlowLoadingMessage] = useState(false);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);
  const [enrichingForecast, setEnrichingForecast] = useState(false);

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

  async function enrichForecastAfterRender(targetDate, requestSeq) {
    if (!targetDate) return;

    try {
      setEnrichingForecast(true);
      const json = await authedFetch(`/api/radar/v1/forecast/enrich?date=${encodeURIComponent(targetDate)}`);

      if (requestSeq !== requestSeqRef.current) return;

      setBundle((prev) => {
        if (!prev) return json;
        if (prev?.target_date && json?.target_date && prev.target_date !== json.target_date) {
          return prev;
        }
        return {
          ...prev,
          ...json,
          forecast: {
            ...(prev?.forecast || {}),
            ...(json?.forecast || {}),
          },
          care_plan: {
            ...(prev?.care_plan || {}),
            ...(json?.care_plan || {}),
          },
        };
      });
    } catch (e) {
      console.error('enrichForecastAfterRender failed:', e);
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setEnrichingForecast(false);
      }
    }
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
      if (!bundle) {
        setLoading(true);
        startSlowLoadingHints(requestSeq);
      }

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

      if (json?.gpt_pending && json?.target_date) {
        enrichForecastAfterRender(json.target_date, requestSeq);
      } else {
        setEnrichingForecast(false);
      }

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
        clearLoadingHintTimers();
        setShowSlowLoadingMessage(false);
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
          {showSlowLoadingMessage ? (
            <div className="rounded-[32px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_74%)] px-6 py-7 shadow-sm">
              <div className="inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-black tracking-wide text-[var(--accent-ink)] ring-1 ring-black/5">
                未病レーダーを作成中
              </div>
              <div className="mt-4 text-[20px] font-black tracking-tight text-slate-900">
                {RADAR_LOADING_HINTS[loadingHintIndex] || RADAR_LOADING_HINTS[0]}
              </div>
              <div className="mt-3 text-[13px] font-bold leading-6 text-slate-600">
                体質と気象の重なりを見て、今日の崩れやすさと先回りケアを組み立てています。
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

          {/* 1. 予報カード */}
          <Module className="relative overflow-hidden p-4 sm:p-6">
            <div
              className={[
                "relative overflow-hidden rounded-[32px] px-4 py-5 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.28)] sm:px-5 sm:py-5",
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
              <div className="pointer-events-none absolute left-1/2 top-[110px] h-[260px] w-[260px] -translate-x-1/2 rounded-full border border-white/35 opacity-80" />
              <div className="pointer-events-none absolute left-1/2 top-[142px] h-[180px] w-[180px] -translate-x-1/2 rounded-full border border-white/20 opacity-70" />

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-white/78 text-[var(--accent-ink)] ring-1 ring-black/5 shadow-sm shrink-0">
                      <IconRadar className="h-9 w-9" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-black tracking-tight text-slate-900">
                        {scoreCardTitle}
                      </div>
                      <div className="mt-1 text-[11px] font-black tracking-[0.16em] text-slate-400">
                        DAILY FORECAST
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
                    {forecast.signal_label || signalLabel(forecast.signal)}
                  </span>
                </div>

                <div className="relative mt-5 rounded-[28px] bg-white/62 px-4 py-5 ring-1 ring-black/5 backdrop-blur-sm shadow-[0_16px_40px_-26px_rgba(15,23,42,0.42)]">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center">
                    <div className="relative">
                      <ForecastGauge
                        score={forecast.score_0_10}
                        signal={forecast.signal}
                        triggerKey={triggerKey}
                      />
                      <div className="-mt-1 text-center text-[12px] font-bold leading-6 text-slate-500">
                        スコアが高いほど、無理を重ねると崩れやすい目安です。
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-[24px] bg-white/82 px-4 py-4 ring-1 ring-black/5 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          一番響きやすい要素
                        </div>

                        <div className="mt-3 flex items-start gap-3">
                          <div
                            className={[
                              "grid h-15 w-15 shrink-0 place-items-center rounded-[18px] bg-white shadow-sm ring-1 ring-black/5",
                              getHeroAccentClass(forecast.signal),
                            ].join(" ")}
                          >
                            <WeatherIcon triggerKey={triggerKey} className="h-9 w-9" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-[22px] font-black tracking-tight text-slate-900">
                              {getCompatTriggerLabel(forecast.main_trigger, forecast.trigger_dir)}
                            </div>
                            <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
                              {moodHeadline}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] bg-white/74 px-4 py-4 ring-1 ring-black/5 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--accent-ink)] ring-1 ring-black/5 shadow-sm">
                            <IconBolt className="h-5 w-5" />
                          </span>
                          気をつけたい時間帯
                        </div>

                        <div className="mt-3 text-[33px] font-black leading-none tracking-[-0.04em] text-slate-900">
                          {forecast.peak_start && forecast.peak_end
                            ? `${String(forecast.peak_start).slice(0, 5)}–${String(
                                forecast.peak_end
                              ).slice(0, 5)}`
                            : "—"}
                        </div>

                        <div className="mt-2 text-[12px] font-bold leading-5 text-slate-500">
                          {signalPanelSubtext(forecast.signal)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] bg-white/72 ring-1 ring-black/5 backdrop-blur-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setNoticeOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-all hover:bg-white/60"
                  >
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {sectionLabels.noticeTitle}
                      </div>
                      <div className="mt-1.5 text-[15px] font-black tracking-tight text-slate-900">
                        くわしく見る
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className={[
                        "h-6 w-6 text-slate-400 transition-transform",
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
                    <div className="border-t border-slate-200/80 px-4 py-4 bg-white/60">
                      {enrichingForecast && !forecast?.gpt_summary ? (
                        <div className="mb-3 rounded-[16px] bg-slate-50 px-3 py-2 text-[11px] font-black tracking-wide text-slate-500 ring-1 ring-black/5">
                          説明文を読みやすく整えています…
                        </div>
                      ) : null}
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
                </div>
              </div>
            </div>
          </Module>

          {/* 2. 今夜の先回りツボ */}
          <Module className="p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm">
                <IconRipple className="h-7 w-7" />
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

                  <svg viewBox="0 0 24 24" fill="none" className="mt-8 h-7 w-7 shrink-0 text-slate-300" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm">
                <IconBowl className="h-7 w-7" />
              </div>
              <div className="text-[18px] font-black tracking-tight text-slate-900">
                {sectionLabels.foodTitle}
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 px-5 py-5 ring-1 ring-inset ring-[var(--ring)]">
              <div className="text-[15px] font-black tracking-tight text-slate-900">
                {food.title || `${getDateModeLabel(bundleDateMode)}の食養生`}
              </div>

              {enrichingForecast && !forecast?.gpt_summary ? (
                <div className="mt-3 rounded-[16px] bg-white px-3 py-2 text-[11px] font-black tracking-wide text-slate-500 ring-1 ring-black/5">
                  食養生の説明を整えています…
                </div>
              ) : null}

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

                <div className="mt-3 flex items-start gap-3">
                  <div className="grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-[20px] bg-white/75 p-2 ring-1 ring-black/5 shadow-sm shrink-0">
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

        </div>
      ) : (
        <div className="space-y-6">
          <Module className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[18px] font-black tracking-tight text-slate-900">今日の記録</div>
                <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-600">
                  予報を見た日の終わりに1回だけ、不調の度合いと前日〜当日に対策ケアをしたかを残します。
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
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">前日〜当日の対策ケア</div>
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
