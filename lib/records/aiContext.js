import {
  SYMPTOM_LABELS,
  getCoreLabel,
  getMeridianLine,
  getSubLabels,
} from "@/lib/diagnosis/v2/labels";
import { buildBaseCarePreferences, getCarePolicyDefinition } from "@/lib/diagnosis/v2/carePreferences";
import { getLifestylePlan } from "@/lib/radar_v1/careRules/lifestyleRules";
import {
  RECORDS_CONSTITUTION_MODEL_CONTEXT,
  buildConstitutionReasoningContext,
} from "@/lib/records/constitutionReasoning";
import {
  RECORDS_FORECAST_MODEL_CONTEXT,
  buildForecastReasoningContext,
} from "@/lib/records/forecastReasoning";
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
  knowledge_version: "records_product_context_v10_pressure_response_2026-07-23",
  assistant: { name: "Ekken", reading: "エッケン", role: "ケアナビAI" },
  service_concept: "体質と気象ストレスを重ね、今できる先回りケアへつなぐ。天気予報ではなく、自分を整えるための体調予報。",
  communication_translation: {
    principle: "東洋医学の概念は思考の道具として正確に使い、会話では専門語を知らない生活者にも身体の中を想像できる現代語へ翻訳する。専門語が役立つ時は、意味が伝わる説明を先に置いて補助的に添える。",
    metaphor_policy: "比喩は理解が深まる時だけ自然に使う。毎回答へ入れず、同じ比喩へ固定せず、正確さを損なわない。以下は定型句や置換辞書ではなく、翻訳の感度を示す作例。",
    sensitivity_examples: [
      { concept: "アクセル優位×余力小", example: "アクセルは踏めるけれど、長距離を走る燃料は少なめ" },
      { concept: "気滞", example: "力がないというより、張りや詰まりで切り替えにくくなっている" },
      { concept: "痰湿", example: "体の中に湿った重い荷物が残り、動き出しに抵抗がかかる" },
      { concept: "血虚", example: "身体を養う材料のストックが少なめ" },
      { concept: "津液不足", example: "うるおいを保つ貯水量が少なめ" },
      { concept: "経絡", example: "臓器の病気そのものではなく、不調が表れやすい体の道筋" },
    ],
  },
  constitution_model: {
    ...RECORDS_CONSTITUTION_MODEL_CONTEXT,
    summary: "アクセル／ブレーキ傾向 × 余力（小・標準・大）の6タイプを最上位の統合結果として読み、気滞・気虚・血虚・血瘀・痰湿・津液不足をその内訳として扱う。病名や診断ではない。",
    body_lines: "主・副経絡は、不調が現れやすい体のラインとケア選定の材料。コアタイプや臓腑疾患の診断と混同しない。",
  },
  weather_model: {
    ...RECORDS_FORECAST_MODEL_CONTEXT,
    event_groups: ["気圧変化", "快適域から遠ざかる気温変化・高温低温", "水分環境の変化・湿気乾燥"],
    pipeline: "気圧変化と、快適域から遠ざかる気温・水分環境の変化で揺さぶりを求め、絶対的な温湿度負担と重複させず統合する。連続値のアクセル／ブレーキで反応方向、余力で崩れやすさ、気血津液の全6スコアで表れ方を決め、主因・副因、体調ゆらぎ度、ケアへ進む。",
    personalization: "有効負担は気象強度×（全員共通分0.38＋体質親和分0.62×本人親和性）。気圧の上昇・低下は表示と最大6％の体質一致補正に残すが、症状の表れ方は気圧方向で固定しない。気温と湿度の絶対負担は一つの温熱環境へまとめ、変化スコアと単純加算しない。40℃級や厳寒だけは全員共通の下限を残す。",
    record_policy: "現行の一般公開運用では記録を予報計算へ戻さない。予報はベース体質×天気ストレスで固定し、記録はケアと実感の分析にだけ使う。",
    explanation_policy: "Ekkenは計算済み値を再計算せず、forecast_reasoningの階層に沿って説明する。気圧ではpressure_directionを物理変化、pressure_response_directionを身体反応として分け、各trigger_factorsのresponse_directionとbody_response_keyを優先する。peak_startとpeak_endは天気ストレスのピークであり、症状発現時刻として扱わない。environmental_cautionsは体質別予報と別の絶対気温注意として扱う。",
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
      {
        key: "live",
        label: "暮らす",
        meaning: "陰陽、寒熱、燥湿、昇降出入、季節・時刻を、環境・休息・活動の配分へ翻訳する",
        reasoning_axes: ["陰陽", "寒熱", "燥湿", "昇降・出入", "季節と時刻", "休息と活動", "室温・湿度・光・衣服・入浴"],
      },
      {
        key: "eat",
        label: "食べる",
        meaning: "食性・五味・五臓・気血水と、香り・色・食感・温度・調理法を、現実の食事へ翻訳する",
        reasoning_axes: ["寒涼平温熱の食性", "酸苦甘辛鹹の五味", "五臓との関係", "気血水", "寒熱燥湿", "香り・色・食感・温度", "調理法・量・食べる時刻"],
      },
      {
        key: "loosen",
        label: "ほぐす",
        meaning: "経絡・体のライン・左右差・動作反応を、押す・さする・動かす・呼吸・温冷へ翻訳する",
        reasoning_axes: ["経絡と体のライン", "気血の巡り", "寒熱燥湿", "上下・内外・左右差", "押す・さする・動かす・呼吸", "刺激の強さ・時間・中止目安"],
      },
    ],
    selection: "主・副天気ストレス、予報モード、不調フォーカス、体質傾向、経絡・東洋医学的整理から、暮らす・食べる・ほぐすへ落とし込む。表示済みケアは土台だが提案可能範囲の上限ではない。",
    live_support_expansion: "Ekkenは、表示済みケアと同じ方向性を保ちながら、東洋医学の原則から低リスクな置き換え・追加案を作ってよい。その場合は、アプリが表示したケアとEkkenの応用案を言葉で区別する。",
    medication_information_boundary: "一般用医薬品・漢方薬・サプリの一般情報、処方や成分の比較、パッケージ確認点、購入時の判断材料、医療機関や薬剤師等へ相談する境目は説明してよい。開始・中止・用量変更・併用可否の最終判断、処方薬の代替、治療方針の変更は行わない。",
    action_recording: "Daily Careカードの『やってみた』は、本人が実際に取り入れた具体的ケアの記録。前日の明日カードは対象日への先回りケア。当日の今日カードは、記録画面で症状との前後関係を本人が補足する。",
    analysis_boundary: "具体的ケアが同じ日に複数記録される場合があるため、各項目の単独効果とは扱わない。似た予報条件での繰り返しを再現候補として整理する。",
  },
};

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
  const reasoning = buildConstitutionReasoningContext(profile);

  return {
    source: "derived_constitution_summary_without_raw_answers",
    engine_version: profile.engine_version || null,
    model_hierarchy: {
      core_is_top_level: true,
      reasoning_order: reasoning?.inference_order || RECORDS_CONSTITUTION_MODEL_CONTEXT.inference_order,
      boundaries: RECORDS_CONSTITUTION_MODEL_CONTEXT.important_boundaries,
    },
    core: {
      code: profile.core_code,
      title: core?.title || profile.core_code,
      axis: core?.short || "",
      meaning: compactText(core?.tcm_hint, 220),
      integrated_reading: reasoning?.core_reading || null,
    },
    axes: reasoning?.axes || profile.axes || null,
    sub_tendencies: subTendencies.map((item) => ({
      code: item.code,
      label: item.short,
      meaning: compactText(item.title, 100),
      care_hint: compactText(item.action_hint, 180),
      role: "全6パターンのうち上位に選ばれた代表要素。コアタイプと横並びの別診断ではない。",
    })),
    material_pattern_summary: reasoning?.material_pattern_summary || null,
    symptom_focus: profile.symptom_focus
      ? { code: profile.symptom_focus, label: SYMPTOM_LABELS[profile.symptom_focus] || profile.symptom_focus }
      : null,
    body_lines: {
      primary: primary ? {
        code: profile.primary_meridian,
        title: primary.title,
        meridians: safeArray(primary.meridians),
        area: primary.body_area,
        meaning: compactText(primary.organs_hint, 150),
      } : null,
      secondary: secondary ? {
        code: profile.secondary_meridian,
        title: secondary.title,
        meridians: safeArray(secondary.meridians),
        area: secondary.body_area,
        meaning: compactText(secondary.organs_hint, 150),
      } : null,
      usage: reasoning?.current_expression_lenses?.meridian_usage || "",
    },
    environment: {
      sensitivity: Number(profile?.env?.sensitivity ?? 0),
      vectors: safeArray(profile?.env?.vectors),
    },
    forecast_reaction_profile: {
      role: "気象変化の種類で体質を決めず、体質から揺れの表れ方を読むための基礎情報。日の点数は保存済み予報から読む。",
      axes: reasoning?.axes || profile.axes || null,
      all_material_patterns: reasoning?.material_pattern_summary?.all_ranked_patterns || [],
      environment_sensitivity: Number(profile?.env?.sensitivity ?? 0),
      environment_vectors: safeArray(profile?.env?.vectors),
      pressure_direction_rule: "上昇・低下は副情報。体質と一致した時だけ小さく増幅し、逆方向でも反応しないとは扱わない。",
    },
    care_preferences: carePreferences.items.slice(0, 3).map((item) => ({
      key: item.key,
      label: item.label,
      meaning: item.guide,
      rank: item.rank,
    })),
    current_expression_lenses: reasoning?.current_expression_lenses || null,
    consultation_rules: reasoning?.consultation_rules || null,
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
  const compact = trimRecordForAi(row);
  return {
    ...compact,
    forecast: compact.forecast
      ? {
          ...compact.forecast,
          forecast_reasoning: buildForecastReasoningContext(row?.forecast || compact.forecast),
        }
      : null,
    displayed_care: buildDisplayedCareContext(row, profile),
  };
}
