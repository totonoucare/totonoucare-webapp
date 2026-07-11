export const RECORD_CONDITION_OPTIONS = [
  { value: 2, label: "よかった", symbol: "○" },
  { value: 1, label: "少しつらかった", symbol: "△" },
  { value: 0, label: "つらかった", symbol: "×" },
];

export const RECORD_CARE_OPTIONS = [
  { value: 2, label: "した" },
  { value: 1, label: "少しした" },
  { value: 0, label: "していない" },
];

export const RECORD_DOMAIN_OPTIONS = [
  { value: "live", label: "暮らす", short: "暮", color: "#66B9A3" },
  { value: "eat", label: "食べる", short: "食", color: "#E2AE45" },
  { value: "loosen", label: "ほぐす", short: "ほ", color: "#A78BB3" },
];

export const RECORD_TIMING_OPTIONS = [
  { value: "before_peak", label: "注意時間の前" },
  { value: "after_symptom", label: "つらくなってから" },
  { value: "unknown", label: "時間は覚えていない" },
];

export const RECORD_FACTOR_OPTIONS = [
  { value: "sleep_short", label: "寝不足" },
  { value: "busy", label: "忙しかった" },
  { value: "food_alcohol", label: "食事や飲酒" },
  { value: "mental_load", label: "気分の負担" },
  { value: "body_change", label: "生理・体調の変化" },
  { value: "none", label: "特にない" },
];

export const PERIOD_OPTIONS = [
  { key: "7d", label: "1週間", days: 7 },
  { key: "30d", label: "1ヶ月", days: 30 },
  { key: "90d", label: "3ヶ月", days: 90 },
  { key: "180d", label: "6ヶ月", days: 180 },
  { key: "365d", label: "12ヶ月", days: 365 },
];

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function addDaysYmd(ymd, delta) {
  const [year, month, day] = String(ymd || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function getPeriodRange(endDate, periodKey) {
  const option = PERIOD_OPTIONS.find((item) => item.key === periodKey) || PERIOD_OPTIONS[1];
  return {
    key: option.key,
    days: option.days,
    start: addDaysYmd(endDate, -(option.days - 1)),
    end: endDate,
  };
}

export function conditionLabel(value) {
  return RECORD_CONDITION_OPTIONS.find((item) => Number(item.value) === Number(value))?.label || "未記録";
}

export function conditionSymbol(value) {
  return RECORD_CONDITION_OPTIONS.find((item) => Number(item.value) === Number(value))?.symbol || "";
}

export function careLabel(value) {
  return RECORD_CARE_OPTIONS.find((item) => Number(item.value) === Number(value))?.label || "未記録";
}

export function signalKey(signal) {
  if (Number(signal) >= 2) return "guard";
  if (Number(signal) === 1) return "care";
  return "stable";
}

export function signalLabel(signal) {
  if (Number(signal) >= 2) return "守り";
  if (Number(signal) === 1) return "いたわり";
  return "安定";
}

export function signalTone(signal) {
  if (Number(signal) >= 2) {
    return {
      surface: "bg-[#FFF0EC]",
      text: "text-[#B75C3E]",
      ring: "ring-[#F1C8BA]",
      hex: "#D77A5D",
    };
  }
  if (Number(signal) === 1) {
    return {
      surface: "bg-[#FFF8EC]",
      text: "text-[#A56C18]",
      ring: "ring-[#EED8B4]",
      hex: "#E2AE45",
    };
  }
  return {
    surface: "bg-[#EFF8F4]",
    text: "text-[#2F816E]",
    ring: "ring-[#CFE7DE]",
    hex: "#66B9A3",
  };
}

export function forecastPercent(forecast) {
  if (!forecast) return null;
  const score = Number(
    forecast.score_display_0_10 ??
    forecast.score_precise_0_10 ??
    forecast.score_0_10
  );
  if (Number.isFinite(score)) return Math.max(0, Math.min(100, score * 10));
  if (forecast.signal != null) return [15, 55, 85][Math.max(0, Math.min(2, Number(forecast.signal)))] || 15;
  return null;
}

export function actualPercent(review) {
  if (!review || review.condition_level == null) return null;
  const value = Number(review.condition_level);
  if (value === 2) return 10;
  if (value === 1) return 55;
  if (value === 0) return 95;
  return null;
}

export function inferCareDomains(actionTags) {
  const tags = new Set(safeArray(actionTags));
  const values = [];

  if (
    tags.has("live") ||
    tags.has("rest") ||
    tags.has("warm") ||
    tags.has("hydrate")
  ) values.push("live");

  if (tags.has("eat") || tags.has("food")) values.push("eat");
  if (tags.has("loosen") || tags.has("tsubo")) values.push("loosen");

  return Array.from(new Set(values));
}

export function inferCareTiming(actionTags) {
  const tag = safeArray(actionTags).find((item) => String(item).startsWith("timing:"));
  return tag ? String(tag).slice("timing:".length) : "";
}

export function inferFactors(actionTags) {
  return safeArray(actionTags)
    .filter((item) => String(item).startsWith("factor:"))
    .map((item) => String(item).slice("factor:".length));
}

export function buildActionTags({ domains = [], timing = "", factors = [], existing = [] }) {
  const preserved = safeArray(existing).filter((item) => {
    const value = String(item);
    return (
      !["live", "eat", "loosen", "food", "tsubo", "rest", "warm", "hydrate", "nothing"].includes(value) &&
      !value.startsWith("timing:") &&
      !value.startsWith("factor:")
    );
  });

  const next = [...preserved, ...safeArray(domains)];
  if (timing) next.push(`timing:${timing}`);
  safeArray(factors).forEach((factor) => next.push(`factor:${factor}`));
  return Array.from(new Set(next));
}

export function classifyRecord(row) {
  const review = row?.review;
  const forecast = row?.forecast;

  if (!review || review.condition_level == null) {
    return {
      key: "unrecorded",
      label: "未記録",
      mismatch: false,
      careDone: false,
    };
  }

  const signal = Number(forecast?.signal ?? 0);
  const condition = Number(review.condition_level);
  const careDone = Number(review.prevent_level ?? 0) > 0;
  const difficult = condition <= 1;
  const forecastConcern = signal >= 1;

  if (forecastConcern && difficult) {
    return {
      key: careDone ? "forecast_concern_difficult_care" : "forecast_concern_difficult_no_care",
      label: "予報と実感が近かった",
      mismatch: false,
      careDone,
    };
  }

  if (forecastConcern && !difficult) {
    return {
      key: careDone ? "better_than_forecast_care" : "better_than_forecast_no_care",
      label: "予報より穏やかだった",
      mismatch: true,
      careDone,
    };
  }

  if (!forecastConcern && difficult) {
    return {
      key: careDone ? "worse_than_forecast_care" : "worse_than_forecast_no_care",
      label: "予報よりゆらいだ",
      mismatch: true,
      careDone,
    };
  }

  return {
    key: careDone ? "stable_good_care" : "stable_good_no_care",
    label: "予報と実感が近かった",
    mismatch: false,
    careDone,
  };
}

function mostFrequent(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function countBy(values) {
  const counts = {};
  values.filter(Boolean).forEach((value) => {
    counts[value] = Number(counts[value] || 0) + 1;
  });
  return counts;
}

export function buildRecordsSummary(rows) {
  const normalizedRows = safeArray(rows).map((row) => ({
    ...row,
    classification: classifyRecord(row),
    care_domains: inferCareDomains(row?.review?.action_tags),
    care_timing: inferCareTiming(row?.review?.action_tags),
    factors: inferFactors(row?.review?.action_tags),
  }));

  const recordedRows = normalizedRows.filter((row) => row.review?.condition_level != null);
  const forecastRows = normalizedRows.filter((row) => row.forecast);
  const difficultRows = recordedRows.filter((row) => Number(row.review.condition_level) <= 1);
  const goodRows = recordedRows.filter((row) => Number(row.review.condition_level) === 2);
  const careRows = recordedRows.filter((row) => Number(row.review.prevent_level ?? 0) > 0);
  const noCareRows = recordedRows.filter((row) => Number(row.review.prevent_level ?? 0) === 0);

  const betterRows = recordedRows.filter((row) => row.classification.key.startsWith("better_than_forecast"));
  const worseRows = recordedRows.filter((row) => row.classification.key.startsWith("worse_than_forecast"));
  const alignedRows = recordedRows.filter((row) => !row.classification.mismatch);

  const careGoodRows = careRows.filter((row) => Number(row.review.condition_level) === 2);
  const careDifficultRows = careRows.filter((row) => Number(row.review.condition_level) <= 1);
  const noCareDifficultRows = noCareRows.filter((row) => Number(row.review.condition_level) <= 1);

  const domainCounts = countBy(careRows.flatMap((row) => row.care_domains));
  const factorCounts = countBy(recordedRows.flatMap((row) => row.factors));
  const signalOnDifficult = mostFrequent(
    difficultRows.map((row) => row.forecast?.signal != null ? signalKey(row.forecast.signal) : null)
  );
  const triggerOnDifficult = mostFrequent(
    difficultRows.map((row) => row.forecast?.main_trigger || row.forecast?.trigger_factors?.[0]?.key || null)
  );

  const avgForecast =
    forecastRows.length > 0
      ? forecastRows.reduce((sum, row) => sum + Number(forecastPercent(row.forecast) || 0), 0) / forecastRows.length
      : null;

  const avgActual =
    recordedRows.length > 0
      ? recordedRows.reduce((sum, row) => sum + Number(actualPercent(row.review) || 0), 0) / recordedRows.length
      : null;

  return {
    rows: normalizedRows,
    recorded_days: recordedRows.length,
    forecast_days: forecastRows.length,
    good_days: goodRows.length,
    difficult_days: difficultRows.length,
    care_days: careRows.length,
    no_care_days: noCareRows.length,
    aligned_days: alignedRows.length,
    better_than_forecast_days: betterRows.length,
    worse_than_forecast_days: worseRows.length,
    care_good_days: careGoodRows.length,
    care_difficult_days: careDifficultRows.length,
    no_care_difficult_days: noCareDifficultRows.length,
    domain_counts: domainCounts,
    factor_counts: factorCounts,
    top_difficult_signal: signalOnDifficult,
    top_difficult_trigger: triggerOnDifficult,
    average_forecast_percent: avgForecast == null ? null : Math.round(avgForecast),
    average_actual_percent: avgActual == null ? null : Math.round(avgActual),
  };
}

function weeklyGroups(rows) {
  const groups = [];
  safeArray(rows).forEach((row, index) => {
    const groupIndex = Math.floor(index / 7);
    if (!groups[groupIndex]) groups[groupIndex] = [];
    groups[groupIndex].push(row);
  });
  return groups;
}

export function buildChartPoints(rows, periodDays = 30) {
  const summary = buildRecordsSummary(rows);
  const normalized = summary.rows;
  const groups = periodDays > 45 ? weeklyGroups(normalized) : normalized.map((row) => [row]);

  return groups.map((group) => {
    const forecastValues = group.map((row) => forecastPercent(row.forecast)).filter((v) => v != null);
    const actualValues = group.map((row) => actualPercent(row.review)).filter((v) => v != null);
    const domains = Array.from(new Set(group.flatMap((row) => row.care_domains || [])));
    const dates = group.map((row) => row.date).filter(Boolean);

    return {
      date: dates[0] || "",
      end_date: dates[dates.length - 1] || dates[0] || "",
      forecast:
        forecastValues.length > 0
          ? Math.round(forecastValues.reduce((sum, value) => sum + value, 0) / forecastValues.length)
          : null,
      actual:
        actualValues.length > 0
          ? Math.round(actualValues.reduce((sum, value) => sum + value, 0) / actualValues.length)
          : null,
      domains,
      recorded_count: actualValues.length,
      rows: group,
    };
  });
}

export function deterministicAnalysis(summary) {
  const count = Number(summary?.recorded_days || 0);

  if (count === 0) {
    return {
      mood: "normal",
      headline: "記録が増えると、あなたの傾向が見えてきます",
      empathy: "まずは今日の体調をひとつ残すところからで大丈夫です。",
      observed: "まだ比較できる記録がありません。",
      hypotheses: "予報・実感・ケアを同じ日に残すと、次に似た天気が来た時の手がかりになります。",
      next_step: "今日の記録カードから、体調とケアの有無を残してみましょう。",
      question: "今日一日の体調はどうでしたか？",
      suggested_questions: [
        "どんな記録を残すと役立つ？",
        "予報と実感はどう比べるの？",
      ],
    };
  }

  if (count < 3) {
    return {
      mood: "listening",
      headline: "小さな手がかりが集まり始めました",
      empathy: "記録してくれてありがとうございます。まだ断定せず、ゆっくり見ていきましょう。",
      observed: `${count}日分の記録があります。`,
      hypotheses: "同じような天気の日がもう少し増えると、予報とのズレやケアとの重なりを比べやすくなります。",
      next_step: "まずは3日分を目安に、無理のない範囲で続けてみてください。",
      question: "次に記録できそうなのは、体調とケアのどちらですか？",
      suggested_questions: [
        "今の記録だけで分かることは？",
        "次に何を記録するといい？",
      ],
    };
  }

  const better = Number(summary?.better_than_forecast_days || 0);
  const worse = Number(summary?.worse_than_forecast_days || 0);
  const careGood = Number(summary?.care_good_days || 0);
  const careDifficult = Number(summary?.care_difficult_days || 0);
  const noCareDifficult = Number(summary?.no_care_difficult_days || 0);

  if (worse > better && worse >= 2) {
    return {
      mood: "thinking",
      headline: "安定予報でもゆらぐ日が少し見えています",
      empathy: "予報よりつらかった日は、うまくできなかった日ではありません。天気以外の負担も一緒に整理できます。",
      observed: `予報よりゆらいだ日が${worse}日ありました。`,
      hypotheses: "睡眠、忙しさ、食事、気分の負担など、予報ロジックには入れていない生活条件が重なった可能性があります。",
      next_step: "同じズレが起きた日に共通することを、ひとつずつ確認してみましょう。",
      question: "予報よりつらかった日に、思い当たる生活の変化はありましたか？",
      suggested_questions: [
        "予報よりつらかった日を整理して",
        "生活状況で見直せそうなことは？",
        "次の安定日に何を試す？",
      ],
    };
  }

  if (better >= 2) {
    return {
      mood: "insight",
      headline: "予報より穏やかに過ごせた日があります",
      empathy: "負担が出やすい予報の日でも、穏やかに過ごせたのは大切な記録です。",
      observed: `予報より穏やかだった日が${better}日あり、そのうちケアをして穏やかだった日が${careGood}日あります。`,
      hypotheses: "ケアが役立った可能性や、最近の生活の土台が安定していた可能性があります。一度の記録だけでは決めず、似た条件で再現するか見ていけます。",
      next_step: "次に似た天気が来たら、同じケアとタイミングを再現して記録してみましょう。",
      question: "穏やかに過ごせた日に、共通していたケアや生活状況はありましたか？",
      suggested_questions: [
        "穏やかだった日の共通点は？",
        "同じケアを次も試していい？",
        "ケアなしで平気だった日はなぜ？",
      ],
    };
  }

  if (careDifficult >= 2) {
    return {
      mood: "listening",
      headline: "ケアを試してもつらかった日を一緒に見直せます",
      empathy: "つらい中でもケアを試したんですね。思ったほど楽にならなかった日も、次の手がかりになります。",
      observed: `ケアをしたものの、少しつらい・つらかった日が${careDifficult}日あります。`,
      hypotheses: "種類だけでなく、始めた時間、やり方、量、最近のケア習慣や生活の負担が関係した可能性があります。",
      next_step: "次回はケアの種類とタイミングを一つに絞り、変化を比べてみましょう。",
      question: "ケアは注意時間の前でしたか、それともつらくなってからでしたか？",
      suggested_questions: [
        "ケアの種類が合っていたか見たい",
        "タイミングをどう変える？",
        "最近の習慣も含めて整理して",
      ],
    };
  }

  if (noCareDifficult >= 1) {
    return {
      mood: "thinking",
      headline: "先回りケアを試す余地がありそうです",
      empathy: "つらかった日を記録できたこと自体が、次に備えるための一歩です。",
      observed: `ケアをしないでつらかった日が${noCareDifficult}日ありました。`,
      hypotheses: "似た天気ストレスの日には、注意時間より前に軽いケアを入れると比較材料になります。",
      next_step: "次は「暮らす・食べる・ほぐす」から一つだけ選び、先回りして記録してみましょう。",
      question: "次に試しやすいのは、暮らす・食べる・ほぐすのどれですか？",
      suggested_questions: [
        "次に試すケアを選びたい",
        "注意時間前に何をすればいい？",
      ],
    };
  }

  return {
    mood: "complete",
    headline: "予報と実感の流れが少しずつつながっています",
    empathy: "続けて記録できています。小さな変化を一緒に見つけていきましょう。",
    observed: `記録${count}日のうち、予報と実感が近かった日は${summary?.aligned_days || 0}日でした。`,
    hypotheses: "今のところ大きな偏りは見えません。似た天気の日を重ねると、あなたらしい傾向がより分かりやすくなります。",
    next_step: "同じ条件が来た時に、ケアの有無とタイミングを残して比べてみましょう。",
    question: "この期間で、自分でも気になった日はありましたか？",
    suggested_questions: [
      "この期間の特徴をもう少し教えて",
      "次の1週間で意識することは？",
    ],
  };
}

export function trimRecordForAi(row) {
  const classification = classifyRecord(row);
  return {
    date: row?.date || "",
    forecast: row?.forecast
      ? {
          signal: Number(row.forecast.signal ?? 0),
          signal_label: signalLabel(row.forecast.signal),
          score_percent: forecastPercent(row.forecast),
          main_trigger: row.forecast.main_trigger || null,
          trigger_dir: row.forecast.trigger_dir || null,
          why_short: String(row.forecast.why_short || "").slice(0, 180),
        }
      : null,
    review: row?.review
      ? {
          condition_level: Number(row.review.condition_level),
          condition_label: conditionLabel(row.review.condition_level),
          prevent_level: Number(row.review.prevent_level ?? 0),
          care_label: careLabel(row.review.prevent_level),
          care_domains: inferCareDomains(row.review.action_tags),
          care_timing: inferCareTiming(row.review.action_tags),
          factors: inferFactors(row.review.action_tags),
          note: String(row.review.note || "").slice(0, 220),
        }
      : null,
    comparison: classification.key,
    comparison_label: classification.label,
  };
}
