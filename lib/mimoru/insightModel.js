import { createHash } from "node:crypto";

export const INSIGHT_VERSION = "mimoru_symptom_connections_v2_20261107";
export const INSIGHT_LEASE_MS = 120000;
export const INSIGHT_DAILY_LIMIT = 40;

export function stableJson(value) {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().filter(k => value[k] !== undefined)
    .map(k => JSON.stringify(k) + ":" + stableJson(value[k])).join(",") + "}";
  return JSON.stringify(value ?? null);
}
export function insightKey(kind, input, model) {
  return createHash("sha256").update(stableJson({ kind, input, model, version: INSIGHT_VERSION })).digest("hex");
}
const paragraph = { type: "string" };
function object(properties) {
  return { type: "object", additionalProperties: false, properties, required: Object.keys(properties) };
}
export function insightSchema(kind, input) {
  if (kind === "constitution") return object({
    overview: paragraph,
    weather_connections: { type: "array", items: object({
      key: { type: "string", enum: input.weather_affinity.map(x => x.key) }, explanation: paragraph,
    }) },
    care_connections: { type: "array", items: object({
      key: { type: "string", enum: input.constitution.care_preferences.map(x => x.key) }, explanation: paragraph,
    }) },
  });
  const careKeys = (input.selected_care?.items || []).map(x => x.item_key);
  return object({
    daily_summary: paragraph,
    care_rationale: paragraph,
    care_invitation: paragraph,
    item_reasons: { type: "array", minItems: careKeys.length, maxItems: careKeys.length, items: object({
      item_key: careKeys.length ? { type: "string", enum: careKeys } : { type: "string" }, reason: paragraph,
    }) },
  });
}
export function validateInsight(kind, value, input) {
  const text = (v, max) => {
    if (typeof v !== "string" || !v.trim() || v.length > max) throw new Error("invalid_insight_text");
    return v.trim();
  };
  if (!value || typeof value !== "object") throw new Error("invalid_insight");
  if (kind === "constitution") {
    const connections = (rows, allowed) => {
      if (!Array.isArray(rows) || rows.length !== allowed.length) throw new Error("invalid_insight_connections");
      const keys = rows.map(x => x?.key);
      if (new Set(keys).size !== keys.length || keys.some(k => !allowed.includes(k))) throw new Error("foreign_insight_connection");
      return allowed.map(key => ({ key, explanation: text(rows.find(x => x.key === key).explanation, 500) }));
    };
    return {
      overview: text(value.overview, 400),
      weather_connections: connections(value.weather_connections, input.weather_affinity.map(x => x.key)),
      care_connections: connections(value.care_connections, input.constitution.care_preferences.map(x => x.key)),
    };
  }
  const allowed = (input.selected_care?.items || []).map(x => x.item_key);
  if (!Array.isArray(value.item_reasons) || value.item_reasons.length !== allowed.length || new Set(value.item_reasons.map(x => x.item_key)).size !== allowed.length || value.item_reasons.some(x => !allowed.includes(x.item_key))) throw new Error("invalid_care_item_reasons");
  return { daily_summary: text(value.daily_summary, 260),
    care_rationale: text(value.care_rationale, 220), care_invitation: text(value.care_invitation, 120),
    item_reasons: allowed.map(item_key => ({ item_key, reason: text(value.item_reasons.find(x => x.item_key === item_key).reason, 120) })) };
}

export const INSIGHT_INSTRUCTIONS = `
あなたは未病レーダーのミモルです。
利用者が、自分の体質がお悩みの不調とどう関係し、日々の予報やケアを使う意味が分かる文章を作ってください。

考える材料：
product_contextはアプリの体質・予報・ケアの説明、explanation_referenceは中医学の関連と文章の作例、constitutionは今回の体質データです。
動物タイプで全体像と余力をつかみ、全6要素の実値と組み合わせ、寒熱、環境への感受性から、今回の主訴に関係の深い働きを選びます。
参照資料と自分の中医学の知識を使い、「体質の傾向 → 体のどんな働きがどう変わるか → 不調の現れ方 → ケアの狙い」を具体的に説明してください。
資料の各経路は、今回の組み合わせを考えるための材料です。作例は具体性・言葉遣い・文章量の見本として使い、今回の内容を今回のデータから組み立てます。

文章：
専門知識がない人も体の中を想像できる、落ち着いた自然な日本語にします。症状の代表例は「たとえば」と紹介します。
内部の項目名や採点の説明は、生活の言葉に翻訳して伝えます。本題から書き、必要な説明が済んだところで終えてください。

constitution：
- overviewは240字程度まで。選んだ不調を主題に、その人の体質が関係する働きと不調への経路を説明する。既存画面で読んだ動物タイプの説明を省き、その先のつながりへ進む。
- weather_connectionsは指定された全項目を各100字程度まで。その天気が今回の体質のどの働きに負担をかけ、主訴にどう関係するかを説明する。一般的な天気相性の欄として書く。
- care_connectionsは指定された全方針を各80字程度まで。この人の不調に対して、何を整えることが狙いかを説明する。

forecast：
- constitution_insightは結果画面と共通の体質の見立て。forecast_reasoningは対象日に計算された気象負担と体の反応、selected_careは実際の提案内容。
- daily_summaryは150字程度まで。主な天気ストレスが主訴にどう響くかと、今日・明日に向けて一つ取り入れたい備えを書く。基本の体質説明は結果画面に任せ、その日の話をする。
- 天気の物理方向と体の反応方向は、それぞれの計算済み項目から読む。ピークは天気ストレスが高まる時間。signal=0は負担の少なさを踏まえた普段の備えを伝える。
- care_rationaleは110字程度まで。実際に選ばれた方針が、今回の不調に対して何を整えるかを説明する。個々のケアのやり方は各ケアカードへ任せる。
- care_invitationは70字程度まで。ミモルの自然な話し言葉で、この人の不調をいたわるケアへ誘い、「どれから見てみる？」と分野選択につなぐ。
- item_reasonsはselected_care.itemsの全項目について、item_keyに対応する理由を各50字程度まで。食材・飲み物・ツボ・動作それぞれの特徴が、この人の不調のどの働きに合うかを書く。提案として選んだ理由を説明し、取り入れ方は各カードへ任せる。
- mode=todayは今日の取り入れ方、tomorrowは明日に備えて今夜できること。target_dateに合わせて書く。

指定のJSONで、表示欄に使う本文を返してください。
`.trim();

