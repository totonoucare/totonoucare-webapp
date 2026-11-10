import { CARE_KNOWLEDGE_VERSION, CARE_KNOWLEDGE_SOURCES } from "./careKnowledge";
import { buildInterpretedProfileContext, RECORDS_AI_PRODUCT_CONTEXT } from "@/lib/records/aiContext";
import { buildBaseCarePreferences } from "@/lib/diagnosis/v2/carePreferences";
import { buildConnectionReference, MIMORU_KNOWLEDGE_VERSION, MIMORU_WRITING_GUIDE } from "./explanationKnowledge";

const product = RECORDS_AI_PRODUCT_CONTEXT;
export const MIMORU_PRODUCT_CONTEXT = {
  knowledge_version: MIMORU_KNOWLEDGE_VERSION,
  assistant: product.assistant,
  service_concept: "自分の体質と不調のつながりを知り、今日・明日の天気に合わせて具体的なケアを選び、実際の体調と取り入れたケアを振り返るサービス。",
  constitution_model: {
    hierarchy: product.constitution_model.hierarchy,
    accelerator_brake_axis: product.constitution_model.accelerator_brake_axis,
    reserve_axis: product.constitution_model.reserve_axis,
    material_scores: "気虚・気滞・血虚・血瘀・痰湿・津液不足は、それぞれ独立した0〜100の回答傾向。全6要素の強さと組み合わせを読む。",
    symptom_focus: "利用者が今気になる不調。体質からどこにどう負担が現れ、何をケアするかを考える焦点。",
    body_lines: "結果後に任意で確認する動作と体のライン。ほぐす場所を選ぶ材料。",
  },
  weather_model: {
    hierarchy: product.weather_model.hierarchy,
    pipeline: product.weather_model.pipeline,
    personalization: product.weather_model.personalization,
    record_policy: "予報の計算には、ベース体質と天気ストレスを使う。実際の体調やケアの記録は、予報と実感の関係を振り返るために使う。",
    reading: "アプリが計算した気象強度・本人との相性・有効負担・身体反応・主因と副因から、その日の備えを説明する。気圧の物理方向と体の反応方向は別の項目。ピークは天気ストレスが高まる時間帯。",
  },
  forecast_modes: product.forecast_modes,
  care_model: {
    policies: product.care_model.policies,
    domains: product.care_model.domains,
    selection: "体質、不調、主な天気ストレス、予報モード、体のライン、生活場面からアプリが選んだ実際のケアを使い、その狙いを説明する。",
    recording: "selected_careとdisplayed_careは提案の内容。performed_care_itemsとuser_added_care_itemsは本人が実行を記録した内容。飲食の実行は食材・飲み物の摂取記録で確認する。",
  },
};

export function buildMimoruProfileContext(profile) {
  const context = buildInterpretedProfileContext(profile);
  if (!context) return null;
  const reference = buildConnectionReference(profile.symptom_focus);
  const reading = context.core.integrated_reading;
  const careSelection = buildBaseCarePreferences({ answers: { env_vectors: profile.env?.vectors || [], symptom_focus: profile.symptom_focus }, computed: profile, symptomKey: profile.symptom_focus });
  return {
    ...context,
    model_hierarchy: {
      core_is_top_level: true,
      reading_order: ["動物タイプと反応方向・余力で全体像を読む", "全6要素と寒熱から不調に関係する働きを読む", "天気と体のラインを具体的な備えへつなげる"],
    },
    core: { ...context.core, meaning: reading?.integrated_meaning || context.core.meaning,
      integrated_reading: reading ? { integrated_meaning: reading.integrated_meaning, care_balance: reading.care_balance } : null },
    sub_tendencies: context.sub_tendencies.map(item => ({ ...item, role: "全6要素のうち、画面に表示する代表的な傾向" })),
    material_pattern_summary: { ...context.material_pattern_summary,
      score_scale: profile.score_scale || profile.split_scores?.scale || null,
      score_reading: "同じ尺度の回答傾向として、実値・順位・要素間の差を確認する。表示の代表要素と、今回の主訴に関係する要素の両方から読む。" },
    care_selection: { summary: careSelection.summary, reasons: careSelection.reasons,
      selected: careSelection.items.map(({ key, score, rank }) => ({ key, score, rank })),
      ranking: careSelection.selection_trace,
      method: "体質6要素・反応方向・余力・寒熱・環境感受性で方針ごとの基礎点を求める。主訴の補正はその基礎点との適合度に比例させ、上位3方針を表示する。rankingには採用外を含む順位と内訳がある。",
      inputs: "全6要素、選んだ不調、環境への感じやすさ、反応方向・余力・寒熱を合わせたアプリの選定結果" },
    current_expression_lenses: { ...context.current_expression_lenses, symptom_reasoning: reference.symptom?.function || "今回気になる不調と体質の関係を読む" },
    consultation_rules: {
      food: "全6要素と寒熱から、食性・五味・温度・調理法・量を組み合わせて考える。",
      lifestyle: "反応方向と余力から活動と休息の配分を、天気と時刻から取り入れるタイミングを考える。",
      loosen: "体のラインや張りの場所と余力から、動かす・さする・押すケアの場所と量を考える。",
    },
  };
}

export function buildInsightGenerationInput(kind, input) {
  const symptomKey = input.constitution?.symptom_focus?.code || input.symptom_focus;
  return { kind, product_context: MIMORU_PRODUCT_CONTEXT, writing_guide: MIMORU_WRITING_GUIDE,
    care_reference: { version: CARE_KNOWLEDGE_VERSION, sources: CARE_KNOWLEDGE_SOURCES },
    explanation_reference: buildConnectionReference(symptomKey), ...input };
}
