// Lightweight shared forecast presentation. No forecast generation, care selection or I/O.

export function toWeatherIconKey(key) {
  if (key === "humidity") return "damp";
  if (key === "temp") return "cold";
  return key || "pressure_down";
}

export function clamp01Number(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

export function signalBadgeClass(signal) {
  if (signal === 2) {
    return "bg-[#FFF6EF] text-[#B86430] ring-1 ring-inset ring-[#ECD6C5]";
  }
  if (signal === 1) {
    return "bg-[#FFF9ED] text-[#AD7A18] ring-1 ring-inset ring-[#EAD8A6]";
  }
  return "bg-[#F3FBF8] text-[#2F816E] ring-1 ring-inset ring-[#C8E4DB]";
}

export function signalDotClass(signal) {
  if (signal === 2) {
    return "bg-[#E38949] shadow-[0_0_10px_rgba(227,137,73,0.20)]";
  }
  if (signal === 1) {
    return "bg-[#E2AE45] shadow-[0_0_10px_rgba(226,174,69,0.20)]";
  }
  return "bg-[#66B9A3] shadow-[0_0_10px_rgba(102,185,163,0.18)]";
}

export function getHeroPanelClass(signal) {
  if (signal === 2) {
    return "bg-[linear-gradient(135deg,#FFF9F5_0%,#FFF5EE_100%)] ring-1 ring-[#EBD7C8]";
  }
  if (signal === 1) {
    return "bg-[linear-gradient(135deg,#FFFDF5_0%,#FFF8EC_100%)] ring-1 ring-[#E9DAB0]";
  }
  return "bg-[linear-gradient(135deg,#F6FCF9_0%,#FBFFFD_100%)] ring-1 ring-[#CCE6DD]";
}

export function getHeroDecorClass(signal) {
  if (signal === 2) {
    return "from-[#D96C7C24] to-[#D96C7C08] border-[#D96C7C33]";
  }
  if (signal === 1) {
    return "from-[#E2AB4326] to-[#E2AB4308] border-[#E2AB4333]";
  }
  return "from-[#63B89E24] to-[#63B89E08] border-[#63B89E30]";
}

const WEATHER_LOAD_GROUP_ORDER = ["temperature", "moisture", "pressure"];

const WEATHER_LOAD_GROUP_LABELS = {
  temperature: "気温ストレス",
  moisture: "湿度ストレス",
  pressure: "気圧ストレス",
};

function weatherLoadGroupFromExact(exact) {
  if (["cold", "heat", "temp_shift", "temperature_shift"].includes(exact)) return "temperature";
  if (["damp", "dry", "humidity"].includes(exact)) return "moisture";
  if (["pressure_down", "pressure_up", "pressure_shift"].includes(exact)) return "pressure";
  return null;
}

function weatherLoadIconKey(exact, direction) {
  if (exact === "temp_shift" || exact === "temperature_shift") {
    return "temp_shift";
  }
  if (exact === "pressure_shift") return direction === "up" ? "pressure_up" : "pressure_down";
  return toWeatherIconKey(exact);
}

function weatherLoadDetailLabel({ group, exact, direction }) {
  if (group === "temperature") {
    if (exact === "cold") return "低温";
    if (exact === "heat") return "高温";
    if (direction === "down") return "気温低下";
    if (direction === "up") return "気温上昇";
    return "寒暖差";
  }
  if (group === "moisture") return exact === "dry" ? "乾燥" : "湿気";
  if (direction === "mixed") return "気圧変動";
  return exact === "pressure_up" || direction === "up" ? "気圧上昇" : "気圧低下";
}

/**
 * Forecast UI representation for all three weather groups.
 *
 * V2 snapshots expose personal_load (weather x affinity x reserve). Older
 * snapshots are kept renderable by filling known primary/secondary factors and
 * showing an em dash for groups that were not stored at the time.
 */
export function buildForecastWeatherLoadGroups(forecast, triggerFactors = []) {
  if (!forecast) return [];
  const snapshot = forecast?.computed?.forecast_snapshot || null;
  const riskContext = forecast?.computed?.radar_plan_meta?.risk_context || null;
  const riskSummary = riskContext?.summary || null;
  const personalizedMeta = riskContext?.meta?.personalized_meta || null;
  const rawGroups =
    forecast?.weather_load_groups ||
    snapshot?.weather_load_groups ||
    riskSummary?.weather_load_groups ||
    riskContext?.weather_context?.weather_load_groups ||
    personalizedMeta?.weather_load_groups ||
    personalizedMeta?.effective_weather_groups ||
    null;

  const byGroup = {};
  if (Array.isArray(rawGroups)) {
    rawGroups.forEach((item) => {
      const group = item?.group || weatherLoadGroupFromExact(item?.exact || item?.key);
      if (group) byGroup[group] = item;
    });
  } else if (rawGroups && typeof rawGroups === "object") {
    Object.entries(rawGroups).forEach(([entryKey, item]) => {
      const group = item?.group || (WEATHER_LOAD_GROUP_ORDER.includes(entryKey) ? entryKey : weatherLoadGroupFromExact(item?.exact || item?.key));
      if (group) byGroup[group] = item;
    });
  }

  // Compatibility for forecasts generated before the three-group UI existed.
  if (Object.keys(byGroup).length === 0) {
    triggerFactors.forEach((factor) => {
      const exact = factor?.exact || factor?.key;
      const group = weatherLoadGroupFromExact(exact);
      if (group && !byGroup[group]) byGroup[group] = factor;
    });
  }

  const channelPeaks =
    forecast?.channel_peaks ||
    snapshot?.channel_peaks ||
    riskSummary?.channel_peaks ||
    riskContext?.weather_context?.channel_peaks ||
    null;
  const reserveScalar = Number(personalizedMeta?.reserve_scalar || 1);
  const primaryFactor = triggerFactors[0] || null;
  const primaryGroup = weatherLoadGroupFromExact(primaryFactor?.exact || primaryFactor?.key);

  return WEATHER_LOAD_GROUP_ORDER.map((group) => {
    const item = byGroup[group] || null;
    const exact = item?.exact || item?.key || (
      group === "temperature" ? "temp_shift" : group === "moisture" ? "damp" : "pressure_down"
    );
    const direction = item?.direction || item?.trigger_dir || null;
    const effective = clamp01Number(item?.effective_load ?? item?.effectiveLoad);
    const storedPersonal = clamp01Number(item?.personal_load ?? item?.display_load);
    const load = storedPersonal ?? (effective == null ? null : clamp01Number(effective * reserveScalar));
    const weatherStrength = clamp01Number(item?.weather_strength ?? item?.weatherStrength);
    const iconKey = weatherLoadIconKey(exact, direction);
    const peak = channelPeaks?.[exact] || channelPeaks?.[iconKey] || null;
    const peakStart = item?.peak_start ?? item?.peakStart ?? peak?.start ?? null;
    const peakEnd = item?.peak_end ?? item?.peakEnd ?? peak?.end ?? null;
    const changeDriven =
      group === "pressure" ||
      (group === "temperature" && ["temp_shift", "temperature_shift"].includes(exact)) ||
      item?.event_key === "moisture_shift";
    const attentionDirection =
      item?.attention_direction ??
      item?.attentionDirection ??
      item?.peak_direction ??
      item?.peakDirection ??
      (changeDriven ? direction : null);
    const showPeak = load != null && load >= 0.08;
    const loadLevelLabel = load == null ? "—" : load >= 0.67 ? "高" : load >= 0.34 ? "中" : "低";
    const loadLevelTone = load == null ? "none" : load >= 0.67 ? "high" : load >= 0.34 ? "middle" : "low";

    return {
      group,
      key: iconKey,
      exact,
      direction,
      label: WEATHER_LOAD_GROUP_LABELS[group],
      // 要素名は現象を示し、負荷の大小は loadLevelLabel 側で示す。
      // 低負荷の日も「気温低下・低」のように読み、現象名を状態語へ置き換えない。
      detailLabel: item
        ? weatherLoadDetailLabel({ group, exact, direction })
        : WEATHER_LOAD_GROUP_LABELS[group],
      load,
      loadPercent: load == null ? null : Math.round(load * 100),
      loadLevelLabel,
      loadLevelTone,
      weatherStrength,
      peakStart: showPeak ? peakStart : null,
      peakEnd: showPeak ? peakEnd : null,
      attentionDirection: showPeak ? attentionDirection : null,
      personalized: item?.personalized !== false,
      isPrimary: item?.role === "primary" || group === primaryGroup,
    };
  });
}

// Presentation thresholds reuse the former middle-load boundary and the
// forecast's event-presence floor. Unknown groups never become a calm result.
export function buildForecastWeatherInfluences(groups = [], { signal = null } = {}) {
  const ranked = (Array.isArray(groups) ? groups : []).map((factor, index) => ({ ...factor, originalOrder: index }))
    .filter(factor => factor.load != null && Number.isFinite(Number(factor.load)) && Number(factor.load) >= 0)
    .sort((a, b) => Number(b.load) - Number(a.load) || Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)) || a.originalOrder - b.originalOrder);
  const threshold = Number(signal) >= 1 ? 0.05 : 0.34;
  const primary = ranked[0] && Number(ranked[0].load) > 0.05 && Number(ranked[0].load) >= threshold ? ranked[0] : null;
  return {
    state: !ranked.length ? "unavailable" : primary ? "attention" : "calm",
    primary,
    others: primary ? ranked.slice(1).filter(factor => Number(factor.load) > 0.05).slice(0, 2) : [],
    partial: ranked.length < 3,
  };
}

export function formatWeatherInfluenceTime(start, end) {
  const parse = value => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]), minute = Number(match[2]);
    if (hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) return null;
    return { minutes: hour * 60 + minute, label: minute ? `${hour}:${String(minute).padStart(2, "0")}` : String(hour), wholeHour: minute === 0 };
  };
  const from = parse(start), to = parse(end);
  if (!from || !to) return "";
  if (from.minutes === to.minutes) return `${from.label}${from.wholeHour ? "時" : ""}ごろ`;
  if (to.minutes < from.minutes) return `${from.label}${from.wholeHour ? "時" : ""}〜翌${to.label}${to.wholeHour ? "時" : ""}`;
  return `${from.label}〜${to.label}${to.wholeHour ? "時" : ""}`;
}
