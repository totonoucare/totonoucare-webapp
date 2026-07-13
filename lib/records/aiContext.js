import {
  SYMPTOM_LABELS,
  getCoreLabel,
  getMeridianLine,
  getSubLabels,
} from "@/lib/diagnosis/v2/labels";
import { buildBaseCarePreferences, getCarePolicyDefinition } from "@/lib/diagnosis/v2/carePreferences";
import { getLifestylePlan } from "@/lib/radar_v1/careRules/lifestyleRules";
import {
  buildPersonalWeatherAffinityProfile,
  rankExactWeatherAffinity,
} from "@/lib/radar_v1/weatherAffinityProfile";
import {
  exactTriggerKey,
  forecastSeverity,
  safeArray,
  trimRecordForAi,
  triggerLabelExact,
} from "@/lib/records/analysis";

const CARE_POLICY_KEYS = [
  "shizumeru",
  "yurumeru",
  "meguraseru",
  "nagasu",
  "uruosu",
  "nukumeru",
  "sasaeru",
];

export const RECORDS_AI_PRODUCT_CONTEXT = {
  knowledge_version: "records_product_context_v3_care_actions_2026-07-13",
  service_concept: "体質と気象ストレスを重ね、今できる先回りケアへつなぐ。天気予報ではなく、自分を整えるための体調予報。",
  constitution_model: {
    core: "アクセル／ブレーキ傾向 × 余力（小・標準・大）の6タイプ。病名や診断ではない。",
    sub_tendencies: "東洋医学的な気・血・水の偏りを、気滞・気虚・血虚・血瘀・痰湿・津液不足で整理する。",
    body_lines: "主・副経絡は、不調が現れやすい体のラインとケア選定の材料。",
  },
  weather_model: {
    channels: ["気圧低下", "気圧上昇", "冷え込み", "暑さ", "湿気", "乾燥"],
    pipeline: "時間ごとの気圧・気温・湿度から6方向の気象ストレスを計算し、体質由来の親和性と重ねる。",
    personalization: "有効負担は気象強度に、全員共通分0.30と体質親和分0.68を重ね、体質由来の余力を反映する。AIは再計算せず、アプリの計算済み値を事実として使う。",
    record_policy: "現行運用では記録を予報計算へ戻さない。予報はベース体質×天気ストレスで固定し、記録はケアと実感の分析にだけ使う。",
    excluded_factors: "睡眠・仕事・食事・飲酒・気分・生理など生活条件は予報スコアへ混ぜず、予報と実感の違いを振り返る材料としてのみ使う。",
  },
  forecast_modes: [
    { signal: 0, label: "安定", score: "0.0〜3.9", meaning: "気象負担は比較的少なめ。軽い土台ケアは続ける。" },
    { signal: 1, label: "いたわり", score: "4.0〜6.9", meaning: "負担が重なりやすく、早めに備える。" },
    { signal: 2, label: "守り", score: "7.0〜10.0", meaning: "負担が強く、無理を重ねず守る。" },
  ],
  interpretation_rules: [
    "予報モードは症状の重さを断定するものではなく、備えの目安。守り予報で○でも単純な外れとは扱わない。",
    "注意予報で穏やかだった日は、ケア・生活の安定・ストレスの短さなどを仮説として比べる。",
    "安定予報でつらさがあった日は、生活条件や最近の体調の土台を確認する。",
    "一度の記録からケア効果や因果を断定しない。同条件での再現を小さく試す。",
  ],
  care_model: {
    policies: CARE_POLICY_KEYS.map((key) => {
      const item = getCarePolicyDefinition(key);
      return { key, label: item?.label || key, meaning: item?.guide || "" };
    }),
    domains: [
      { key: "live", label: "暮らす", meaning: "環境・休み方・生活動線を整える" },
      { key: "eat", label: "食べる", meaning: "食材・飲み物・食べ方を整える" },
      { key: "loosen", label: "ほぐす", meaning: "ツボ・動き・呼吸でこわばりをほどく" },
    ],
    selection: "主・副天気ストレス、予報モード、不調フォーカス、体質傾向、経絡・東洋医学的整理から、暮らす・食べる・ツボ等へ落とし込む。",
    action_recording: "Daily Careカードの『やってみた』は、本人が実際に取り入れた具体的ケアの記録。前日の明日カードは対象日への先回りケア。当日の今日カードは、記録画面で症状との前後関係を本人が補足する。",
    analysis_boundary: "具体的ケアが同じ日に複数記録される場合があるため、各項目の単独効果とは扱わない。似た予報条件での繰り返しを再現候補として整理する。",
  },
};

function round3(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : null;
}

function compactText(value, limit = 160) {
  return String(value || "").trim().slice(0, limit);
}

function compactItemLabel(value) {
  if (typeof value === "string") return compactText(value, 50);
  if (!value || typeof value !== "object") return "";
  return compactText(
    value.name_ja || value.name || value.label || value.title || value.ingredient || value.code,
    50
  );
}

export function buildInterpretedProfileContext(profile) {
  if (!profile?.core_code) return null;
  const core = getCoreLabel(profile.core_code);
  const subTendencies = getSubLabels(profile.sub_labels);
  const primary = getMeridianLine(profile.primary_meridian);
  const secondary = getMeridianLine(profile.secondary_meridian);
  const affinity = buildPersonalWeatherAffinityProfile({
    coreType: profile.core_code,
    subRiskWeights: profile.sub_labels,
    envVectors: safeArray(profile?.env?.vectors),
    sensitivity: profile?.env?.sensitivity ?? 0,
  });
  const carePreferences = buildBaseCarePreferences({
    answers: {
      env_vectors: safeArray(profile?.env?.vectors),
      symptom_focus: profile.symptom_focus,
    },
    computed: {
      core_code: profile.core_code,
      sub_labels: profile.sub_labels,
      symptom_focus: profile.symptom_focus,
    },
    symptomKey: profile.symptom_focus,
  });

  return {
    source: "derived_constitution_summary_without_raw_answers",
    engine_version: profile.engine_version || null,
    core: {
      code: profile.core_code,
      title: core?.title || profile.core_code,
      axis: core?.short || "",
      meaning: compactText(core?.tcm_hint, 220),
    },
    sub_tendencies: subTendencies.map((item) => ({
      code: item.code,
      label: item.short,
      meaning: compactText(item.title, 100),
      care_hint: compactText(item.action_hint, 180),
    })),
    symptom_focus: profile.symptom_focus
      ? { code: profile.symptom_focus, label: SYMPTOM_LABELS[profile.symptom_focus] || profile.symptom_focus }
      : null,
    body_lines: {
      primary: primary ? { code: profile.primary_meridian, title: primary.title, area: primary.body_area, meaning: compactText(primary.organs_hint, 150) } : null,
      secondary: secondary ? { code: profile.secondary_meridian, title: secondary.title, area: secondary.body_area, meaning: compactText(secondary.organs_hint, 150) } : null,
    },
    environment: {
      sensitivity: Number(profile?.env?.sensitivity ?? 0),
      vectors: safeArray(profile?.env?.vectors),
    },
    base_weather_affinity: rankExactWeatherAffinity(affinity.weights).map((item) => ({
      key: item.key,
      label: item.label,
      weight: round3(item.value),
    })),
    care_preferences: carePreferences.items.slice(0, 3).map((item) => ({
      key: item.key,
      label: item.label,
      meaning: item.guide,
      rank: item.rank,
    })),
    axes: profile.axes || null,
    updated_at: profile.updated_at || null,
  };
}

function compactLifestyle(forecast, profile) {
  if (!forecast) return null;
  const primary = exactTriggerKey(forecast);
  const secondary = forecast.personal_secondary_trigger_exact || null;
  const plan = getLifestylePlan(
    primary,
    secondary,
    forecastSeverity(forecast),
    "today",
    profile?.symptom_focus || null
  );
  if (!plan) return null;
  return {
    source: "reconstructed_with_current_rules",
    title: compactText(plan.title, 80),
    lead: compactText(plan.lead, 160),
    steps: safeArray(plan.steps).slice(0, 3).map((item) => compactText(item, 80)),
  };
}

function compactStoredCarePlan(carePlan) {
  if (!carePlan) return null;
  const food = carePlan.tomorrow_food_context || {};
  const tsubo = carePlan.night_tsubo_set || {};
  const foodItems = safeArray(food.add_items || food.examples)
    .map(compactItemLabel)
    .filter(Boolean)
    .slice(0, 3);
  const points = safeArray(tsubo.points).slice(0, 3).map((point) => ({
    code: compactText(point?.code, 20),
    name: compactText(point?.name_ja || point?.name || point?.code, 40),
    reason: compactText(
      point?.explanation?.selection_reason_rule_based || point?.explanation?.selection_reason,
      120
    ),
  }));
  const result = {
    source: "stored_forecast_care_plan",
    food: food?.title || foodItems.length ? {
      title: compactText(food.title, 80),
      timing: compactText(food.timing, 40),
      items: foodItems,
      how_to: compactText(food.how_to, 120),
      reason: compactText(food.reason, 140),
      caution: compactText(food.avoid || carePlan.tomorrow_caution, 120),
    } : null,
    tsubo: points.length ? {
      title: compactText(tsubo.title, 80),
      points,
      note: compactText(carePlan.night_note || carePlan.night_tsubo_reason, 140),
    } : null,
  };
  return result.food || result.tsubo ? result : null;
}

export function buildDisplayedCareContext(row, profile) {
  const saved = row?.forecast?.displayed_care;
  if (saved && typeof saved === "object") return saved;
  const lifestyle = compactLifestyle(row?.forecast, profile);
  const stored = compactStoredCarePlan(row?.care_plan);
  if (!lifestyle && !stored) return null;
  return {
    lifestyle,
    food: stored?.food || null,
    tsubo: stored?.tsubo || null,
    source_notes: [
      lifestyle?.source,
      stored?.source,
    ].filter(Boolean),
  };
}

export function buildAiRecordContext(row, profile) {
  return {
    ...trimRecordForAi(row),
    displayed_care: buildDisplayedCareContext(row, profile),
  };
}
