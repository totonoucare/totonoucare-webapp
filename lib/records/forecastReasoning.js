const EVENT_KEYS = [
  ["pressure_shift", "気圧変化"],
  ["temperature_shift", "気温変化"],
  ["temp_shift", "気温変化"],
  ["pressure_down", "気圧低下"],
  ["pressure_up", "気圧上昇"],
  ["cold", "厳しい寒さ"],
  ["heat", "厳しい暑さ"],
  ["damp", "湿気"],
  ["dry", "乾燥"],
];

const MODE_LABELS = {
  0: "安定",
  1: "いたわり",
  2: "守り",
};

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : null;
}

function eventLabel(key) {
  return EVENT_KEYS.find(([code]) => code === key)?.[1] || key || "不明";
}

function eventMap(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    EVENT_KEYS.map(([key]) => [key, finite(source[key])]).filter(([, number]) => number !== null)
  );
}

function objectOrNull(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function groupMap(value) {
  const source = objectOrNull(value) || {};
  return Object.fromEntries(["pressure", "temperature", "moisture"].map((key) => {
    const item = objectOrNull(source[key]);
    if (!item) return null;
    return [key, {
      group: key,
      event_key: item.event_key || null,
      exact: item.exact || null,
      direction: item.direction || null,
      effective_load: finite(item.effective_load),
      weather_strength: finite(item.weather_strength),
      affinity_weight: finite(item.affinity_weight),
    }];
  }).filter(Boolean));
}

function rankedEvents({ weather = {}, affinity = {}, effective = {}, triggerFactors = [] } = {}) {
  const factorRole = new Map(
    (Array.isArray(triggerFactors) ? triggerFactors : [])
      .map((item) => [item?.event_key || item?.exact || item?.key, item?.role || null])
      .filter(([key]) => key)
  );

  return EVENT_KEYS.map(([key, label]) => ({
    key,
    label,
    weather_strength: finite(weather[key]),
    personal_affinity: finite(affinity[key]),
    effective_load: finite(effective[key]),
    role: factorRole.get(key) || null,
  }))
    .filter((item) => item.weather_strength !== null || item.personal_affinity !== null || item.effective_load !== null)
    .sort((a, b) => Number(b.effective_load || 0) - Number(a.effective_load || 0));
}

function triggerFromForecast(forecast, role) {
  const factors = Array.isArray(forecast?.trigger_factors) ? forecast.trigger_factors : [];
  const factor = factors.find((item, index) => (item?.role || (index === 0 ? "primary" : "secondary")) === role);
  const fallback = role === "primary"
    ? forecast?.personal_main_trigger_exact || forecast?.exact_trigger
    : forecast?.personal_secondary_trigger_exact || forecast?.secondary_exact_trigger;
  const key = factor?.exact || factor?.key || fallback || null;
  if (!key) return null;
  return {
    key,
    event_key: factor?.event_key || null,
    weather_group: factor?.weather_group || null,
    label: eventLabel(key),
    direction: factor?.direction || null,
    effective_load: finite(factor?.effective_load),
    weather_strength: finite(factor?.weather_strength),
    personal_affinity: finite(factor?.affinity_weight),
    peak_start: factor?.peak_start || factor?.peakStart || (role === "primary" ? forecast?.peak_start : null) || null,
    peak_end: factor?.peak_end || factor?.peakEnd || (role === "primary" ? forecast?.peak_end : null) || null,
  };
}

export const RECORDS_FORECAST_MODEL_CONTEXT = {
  model_version: "radar_forecast_v2_2026-07-21",
  hierarchy: [
    "第1層は気象の揺さぶり。気圧は上昇・低下を重複加点せず変化量を一つの強さにし、向きは表示と小さな補助情報として残す。気温は変化量と絶対的な暑さ・寒さを分け、湿気・乾燥は露点と水分量を中心に読む。",
    "第2層は体質による反応方向。連続値のアクセル／ブレーキ軸で張り・高ぶり側か、重さ・動き始めにくさ側かを決める。気圧の向きが体質と一致した時だけ親和性を最大6％増幅し、逆向きでも減点しない。",
    "第3層は表れ方の内訳。気虚・気滞・血虚・血瘀・痰湿・津液不足の全6スコアから、消耗、張り、固定化、重さ、乾きなどの出やすさを読む。",
    "第4層は余力。連続値の余力から同じ気象変化での崩れやすさを0.94〜1.08の範囲で補正する。",
    "第5層は主因・副因と体調ゆらぎ度。気圧・気温・水分環境の3群から各1要素だけを採用し、相関した変化を二重加点せず安定・いたわり・守りへ分類する。",
    "第6層は場所とケア。不調フォーカス、主・副経絡、現在の体感、時刻やTPOは点数の原因ではなく、揺れがどこへどう現れやすいかとケアの翻訳に使う。",
  ],
  weather_events: {
    groups: ["気圧", "気温", "水分環境"],
    pressure: "変化量が揺さぶりの主量。上昇・低下・混合はUI表示と二次的な体質一致補正に使う。",
    temperature: "通常の日内変化を割り引いた変化量と、厳しい暑さ・寒さの絶対値を分ける。",
    moisture: "相対湿度だけでなく露点・絶対的な水分量を主に、湿気と乾燥を評価する。",
    overlap_rule: "同じ群の相関した要素は最大の一つだけを点数へ採用する。",
  },
  personalization: {
    formula: "気象強度 ×（全員共通分0.62＋体質親和分0.38×本人親和性）",
    universal_weather_share: 0.62,
    personal_affinity_share: 0.38,
    direction_modifier: "気圧方向と連続体質軸が一致した時だけ最大0.06加える。逆方向は減点しない。",
    materials: "上位2ラベルへ圧縮せず、気虚・気滞・血虚・血瘀・痰湿・津液不足の全6スコアを表れ方へ使う。",
    record_policy: "一般公開運用では体調記録を予報計算へ戻さない。記録は体質仮説と実感の検証、ケアの振り返りに使う。",
  },
  trigger_selection: {
    primary: "3つの気象群のうち有効負担が最大で0.05を超えるもの。",
    secondary: "2番目の群が0.24以上かつ、主因の45％以上の時だけ採用する。",
    rule: "気圧上昇と低下、暑さと気温変化などを別々に足さず、群ごとに一つへまとめて順位を決める。",
  },
  score_construction: {
    weighted_groups: "3群の有効負担を、1位4.90・2位1.55・3位0.65で加重する。",
    reserve: "余力の連続値を0.94〜1.08の係数に変換し、天気信号を支配しない範囲で補正する。",
    overlap: "非常に強い気象イベントと、複数群の強い負担が重なる場合だけ小さく加点する。",
    modes: [
      { signal: 0, label: "安定", score: "0.0〜3.9" },
      { signal: 1, label: "いたわり", score: "4.0〜6.9" },
      { signal: 2, label: "守り", score: "7.0〜10.0" },
    ],
  },
  included_in_score: [
    "3群に整理した気象イベントの強さ",
    "全員共通分と環境感受性・本人申告・連続体質軸による小さな親和性補正",
    "連続値の余力による小さな脆弱性補正",
    "複数の気象群の重なり",
  ],
  excluded_from_score: [
    "当日の本人の体調実感",
    "睡眠・仕事・食事・飲酒・気分・生理などの生活条件",
    "不調フォーカス",
    "主・副経絡",
    "当日行ったケア",
  ],
  inference_order: [
    "保存された予報モデルの版と計算済み結果を確認する",
    "気圧・気温・水分環境の揺さぶりと有効負担を分けて読む",
    "連続体質軸から反応方向を、全6スコアから表れ方の内訳を読む",
    "主因を最優先し、副因は選択条件を満たした場合だけ添える",
    "余力と群の重なりが点数・モードへどう影響したかを読む",
    "不調フォーカス・経絡・現在の体感を、表れ方とケアへ重ねる",
  ],
  important_boundaries: [
    "体調ゆらぎ度は発症確率や症状の重さではなく、先回りケアの強さを決める0〜10の物差し。",
    "気圧の上昇・低下は症状の出方を固定しない。身体の反応方向は体質軸と全6スコアから読む。",
    "現在のつらさ、不調フォーカス、経絡を予報点数が高くなった原因として後付けしない。",
    "主因・副因以外の天気要素を同列に並べず、必要な時だけ補足する。",
    "AIは点数を再計算せず、保存された値とreason_traceだけを説明する。",
  ],
};

export function buildForecastReasoningContext(forecast = {}) {
  if (!forecast || typeof forecast !== "object") return null;
  const trace = objectOrNull(forecast.reason_trace) || {};
  const modelVersion = String(
    trace.forecast_model_version ||
    trace?.forecast_model?.model_version ||
    forecast?.logic_version?.forecast_context ||
    ""
  );
  const groups = groupMap(trace.effective_weather_groups);
  const isV2 = modelVersion.includes("v2") || Object.keys(groups).length > 0 || Boolean(trace.continuous_axes);
  const weather = eventMap(trace.weather_event_strengths || trace.weather_strengths);
  const affinity = eventMap(trace.personal_affinity_weights);
  const effective = eventMap(trace.event_effective_loads || trace.effective_channel_loads);
  const rawReserve = finite(trace.reserve_scalar ?? trace.battery_scalar);
  const appliedReserve = finite(trace.reserve_scalar_applied ?? trace.battery_scalar_applied ?? rawReserve);
  const primary = triggerFromForecast(forecast, "primary");
  const secondary = triggerFromForecast(forecast, "secondary");
  const rankedGroups = Object.values(groups).sort(
    (a, b) => Number(b.effective_load || 0) - Number(a.effective_load || 0)
  );
  const ranked = rankedGroups.length
    ? rankedGroups
    : rankedEvents({ weather, affinity, effective, triggerFactors: forecast.trigger_factors });

  const hasTrace = Object.keys(weather).length || Object.keys(affinity).length ||
    Object.keys(effective).length || Object.keys(groups).length;
  const score = finite(forecast.score_precise_0_10 ?? forecast.score_display_0_10 ?? forecast.score_0_10);
  const signal = Number.isFinite(Number(forecast.signal)) ? Number(forecast.signal) : null;

  return {
    source: "computed_forecast_explanation_without_ai_recalculation",
    model_version: modelVersion || null,
    legacy_snapshot: Boolean(hasTrace && !isV2),
    legacy_note: hasTrace && !isV2
      ? "この日は旧モデルで保存された履歴。V2へ読み替えたり再計算せず、当時の保存値として説明する。"
      : null,
    hierarchy_role: isV2
      ? "weather_events_to_constitution_expression_to_reserve_to_mode_to_care"
      : "legacy_constitution_affinity_to_six_channels_to_mode",
    inference_order: RECORDS_FORECAST_MODEL_CONTEXT.inference_order,
    result: {
      target_date: forecast.target_date || null,
      score_0_10: score,
      signal,
      mode_label: signal === null ? null : MODE_LABELS[signal] || null,
      primary,
      secondary,
      why_short: String(forecast.why_short || "").slice(0, 180),
    },
    daily_weather: {
      event_strengths: weather,
      pressure_direction: trace.pressure_direction || null,
      effective_weather_groups: groups,
      ranked_by_effective_load: ranked,
      overlap_policy: isV2 ? RECORDS_FORECAST_MODEL_CONTEXT.weather_events.overlap_rule : null,
    },
    personalization: {
      formula: isV2 ? RECORDS_FORECAST_MODEL_CONTEXT.personalization.formula : "旧モデルの保存値を参照",
      final_affinity_weights: affinity,
      continuous_axes: objectOrNull(trace.continuous_axes),
      material_scores: objectOrNull(trace.material_scores),
      manifestation: objectOrNull(trace.manifestation),
    },
    effective_load: {
      event_values: effective,
      weather_groups: groups,
    },
    trigger_selection: {
      primary,
      secondary,
      primary_rule: RECORDS_FORECAST_MODEL_CONTEXT.trigger_selection.primary,
      secondary_rule: RECORDS_FORECAST_MODEL_CONTEXT.trigger_selection.secondary,
    },
    reserve_adjustment: {
      tier: trace.battery_tier || null,
      raw_scalar: rawReserve,
      applied_scalar: appliedReserve,
      meaning: RECORDS_FORECAST_MODEL_CONTEXT.score_construction.reserve,
    },
    score_trace: objectOrNull(trace.score_trace),
    model_boundaries: {
      included_in_score: RECORDS_FORECAST_MODEL_CONTEXT.included_in_score,
      excluded_from_score: RECORDS_FORECAST_MODEL_CONTEXT.excluded_from_score,
      actual_condition_is_separate: true,
      pressure_direction_is_secondary: true,
      symptom_and_meridian_usage: "点数計算ではなく、現れ方・確認質問・暮らす／食べる／ほぐすの具体化に使う。",
      review_feedback_applied: Boolean(trace.review_feedback_applied),
    },
    trace_available: Boolean(hasTrace),
  };
}
