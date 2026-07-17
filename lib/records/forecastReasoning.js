const CHANNELS = [
  ["pressure_down", "気圧低下"],
  ["pressure_up", "気圧上昇"],
  ["cold", "冷え込み"],
  ["heat", "暑さ"],
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

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function channelLabel(key) {
  return CHANNELS.find(([code]) => code === key)?.[1] || key || "不明";
}

function channelMap(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    CHANNELS.map(([key]) => [key, finite(source[key])]).filter(([, number]) => number !== null)
  );
}

function rankedChannels({ weather = {}, affinity = {}, effective = {}, triggerFactors = [] } = {}) {
  const factorRole = new Map(
    (Array.isArray(triggerFactors) ? triggerFactors : [])
      .map((item) => [item?.exact || item?.key, item?.role || null])
      .filter(([key]) => key)
  );

  return CHANNELS.map(([key, label]) => ({
    key,
    label,
    weather_strength: finite(weather[key]),
    personal_affinity: finite(affinity[key]),
    effective_load: finite(effective[key]),
    role: factorRole.get(key) || null,
  })).sort((a, b) => Number(b.effective_load || 0) - Number(a.effective_load || 0));
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
    label: channelLabel(key),
    effective_load: finite(factor?.effective_load),
    weather_strength: finite(factor?.weather_strength),
    personal_affinity: finite(factor?.affinity_weight),
    peak_start: factor?.peak_start || factor?.peakStart || (role === "primary" ? forecast?.peak_start : null) || null,
    peak_end: factor?.peak_end || factor?.peakEnd || (role === "primary" ? forecast?.peak_end : null) || null,
  };
}

export const RECORDS_FORECAST_MODEL_CONTEXT = {
  hierarchy: [
    "第1層は固定された体質。コアタイプを中心に、上位2つの気血津液パターンと環境感受性から6方向の天気親和性を作る。",
    "第2層は当日の気象ストレス。時間ごとの気圧・気温・湿度から、気圧低下・気圧上昇・冷え込み・暑さ・湿気・乾燥の6方向を別々に計算する。",
    "第3層は有効負担。各方向で、気象強度に全員共通分と本人の天気親和分を重ねる。",
    "第4層は主因・副因。最も大きい有効負担を主因とし、2番目が絶対値と主因比率の両条件を満たす時だけ副因にする。",
    "第5層は体調ゆらぎ度と予報モード。上位3方向の有効負担、余力補正、強い負担の重なりを使い、安定・いたわり・守りへ分類する。",
    "第6層は表れ方とケア。不調フォーカス、主・副経絡、現在の体感、時刻やTPOは、点数の原因ではなく、負担がどこへどう現れやすいかとケアの翻訳に使う。",
  ],
  affinity_construction: {
    role: "ベース体質が6方向の天気へどの程度反応しやすいかを表す固定プロフィール。今日の症状や気分で作り替えない。",
    base_mix: {
      core_type: 0.55,
      primary_material_pattern: 0.28,
      secondary_material_pattern: 0.17,
    },
    adjustments: "環境感受性と選択済みの環境ベクトルを小さく加える。現行の一般公開運用では体調記録を予報へ戻さない。",
  },
  effective_load: {
    formula: "気象強度 ×（全員共通分0.30＋体質親和分0.68×本人の親和性）",
    meaning: "天気そのものの強さと、その人への響きやすさを一つの方向別負担へまとめた値。",
    cap: 1,
  },
  trigger_selection: {
    primary: "有効負担が最大で0.05を超える方向。",
    secondary: "2番目の有効負担が0.20以上かつ、主因の45％以上の時だけ採用する。",
    rule: "気象だけで最も強い方向ではなく、体質親和性を重ねた有効負担の順位で決める。",
  },
  score_construction: {
    weighted_channels: "有効負担の上位3方向を、1位4.65・2位1.55・3位0.65を基礎に方向別重要度で加重する。",
    reserve: "余力の元係数は小1.12・標準1.00・大0.90だが、点数への実適用は0.94〜1.08へ抑え、天気信号を支配させない。",
    overlap: "非常に強い気象と高い親和性の重なり、強い副因、3方向以上の負担が重なる場合に小さく加点する。",
    modes: [
      { signal: 0, label: "安定", score: "0.0〜3.9" },
      { signal: 1, label: "いたわり", score: "4.0〜6.9" },
      { signal: 2, label: "守り", score: "7.0〜10.0" },
    ],
  },
  included_in_score: [
    "6方向の気象ストレス",
    "コアタイプ・上位2パターン・環境感受性から作った天気親和性",
    "余力による小さな脆弱性補正",
    "複数の気象負担の重なり",
  ],
  excluded_from_score: [
    "当日の本人の体調実感",
    "睡眠・仕事・食事・飲酒・気分・生理などの生活条件",
    "不調フォーカス",
    "主・副経絡",
    "当日行ったケア",
  ],
  inference_order: [
    "計算済みの予報結果を事実として確認する",
    "本人の天気親和性がどの体質要素から作られたかを読む",
    "今日の6方向の気象強度と有効負担を分けて読む",
    "主因を最優先し、副因は選択条件を満たした場合だけ添える",
    "余力と負担の重なりが点数・モードへどう影響したかを読む",
    "不調フォーカス・経絡・現在の体感を、表れ方とケアへ重ねる",
  ],
  important_boundaries: [
    "体調ゆらぎ度は発症確率や症状の重さではなく、先回りケアの強さを決める0〜10の物差し。",
    "現在のつらさを理由に予報点数を説明しない。現在の体感は予報とは別の事実。",
    "不調フォーカスや経絡を、予報点数が高くなった原因として扱わない。",
    "主因・副因以外の天気要素を同列に並べず、必要な時だけ補足する。",
    "AIは点数を再計算せず、保存された値とreason_traceだけを説明する。",
  ],
};

export function buildForecastReasoningContext(forecast = {}) {
  if (!forecast || typeof forecast !== "object") return null;
  const trace = forecast.reason_trace && typeof forecast.reason_trace === "object"
    ? forecast.reason_trace
    : {};
  const weather = channelMap(trace.weather_strengths);
  const affinity = channelMap(trace.personal_affinity_weights);
  const effective = channelMap(trace.effective_channel_loads);
  const rawBatteryScalar = finite(trace.battery_scalar);
  const appliedBatteryScalar = finite(
    trace.battery_scalar_applied ?? (rawBatteryScalar === null ? null : clamp(rawBatteryScalar, 0.94, 1.08))
  );
  const primary = triggerFromForecast(forecast, "primary");
  const secondary = triggerFromForecast(forecast, "secondary");
  const ranked = rankedChannels({
    weather,
    affinity,
    effective,
    triggerFactors: forecast.trigger_factors,
  });

  const hasTrace = Object.keys(weather).length || Object.keys(affinity).length || Object.keys(effective).length;
  const score = finite(forecast.score_precise_0_10 ?? forecast.score_display_0_10 ?? forecast.score_0_10);
  const signal = Number.isFinite(Number(forecast.signal)) ? Number(forecast.signal) : null;

  return {
    source: "computed_forecast_explanation_without_ai_recalculation",
    hierarchy_role: "constitution_to_affinity_to_weather_to_load_to_mode_to_care",
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
    personal_affinity: {
      meaning: RECORDS_FORECAST_MODEL_CONTEXT.affinity_construction.role,
      base_mix: RECORDS_FORECAST_MODEL_CONTEXT.affinity_construction.base_mix,
      core_weather_weights: channelMap(trace.core_weather_weights),
      representative_material_codes: Array.isArray(trace.affinity_sub_codes)
        ? trace.affinity_sub_codes.slice(0, 2)
        : [],
      final_weights: affinity,
    },
    daily_weather: {
      strengths: weather,
      ranked_by_effective_load: ranked,
    },
    effective_load: {
      formula: RECORDS_FORECAST_MODEL_CONTEXT.effective_load.formula,
      values: effective,
    },
    trigger_selection: {
      primary,
      secondary,
      primary_rule: RECORDS_FORECAST_MODEL_CONTEXT.trigger_selection.primary,
      secondary_rule: RECORDS_FORECAST_MODEL_CONTEXT.trigger_selection.secondary,
    },
    reserve_adjustment: {
      tier: trace.battery_tier || null,
      raw_scalar: rawBatteryScalar,
      applied_scalar: appliedBatteryScalar,
      meaning: RECORDS_FORECAST_MODEL_CONTEXT.score_construction.reserve,
    },
    score_trace: trace.score_trace && typeof trace.score_trace === "object" ? trace.score_trace : null,
    model_boundaries: {
      included_in_score: RECORDS_FORECAST_MODEL_CONTEXT.included_in_score,
      excluded_from_score: RECORDS_FORECAST_MODEL_CONTEXT.excluded_from_score,
      actual_condition_is_separate: true,
      symptom_and_meridian_usage: "点数計算ではなく、現れ方・確認質問・暮らす／食べる／ほぐすの具体化に使う。",
      review_feedback_applied: Boolean(trace.review_feedback_applied),
    },
    trace_available: Boolean(hasTrace),
  };
}
