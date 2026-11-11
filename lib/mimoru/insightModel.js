import { createHash } from "node:crypto";

export const INSIGHT_VERSION = "mimoru_food_care_v6_20261111";
export const INSIGHT_LEASE_MS = 120000;
export const INSIGHT_DAILY_LIMIT = 40;

export function stableJson(value) {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().filter(k => value[k] !== undefined)
    .map(k => JSON.stringify(k) + ":" + stableJson(value[k])).join(",") + "}";
  return JSON.stringify(value ?? null);
}
export function insightKey(kind, input, model) {
  // Revision protects question targets at the API boundary, but a timestamp
  // alone does not change an explanation. All substantive inputs stay hashed.
  const { forecast_revision: _revision, ...content } = input;
  return createHash("sha256").update(stableJson({ kind, input: kind === "forecast" ? content : input, model, version: INSIGHT_VERSION })).digest("hex");
}
const paragraph = { type: "string" };
function object(properties) {
  return { type: "object", additionalProperties: false, properties, required: Object.keys(properties) };
}
const careCopy = { reason: paragraph, theory: paragraph, guidance: paragraph, check: paragraph };
export function insightSchema(kind, input) {
  if (kind === "constitution") return object({
    overview: paragraph,
    weather_connections: { type: "array", items: object({
      key: { type: "string", enum: input.weather_affinity.map(x => x.key) }, explanation: paragraph,
    }) },
    care_connections: { type: "array", items: object({
      key: { type: "string", enum: input.constitution.care_preferences.map(x => x.key) }, explanation: paragraph,
    }) },
    care_example: input.care_example ? object({ item_key: { type: "string", enum: [input.care_example.item_key] }, ...careCopy }) : { type: "null" },
  });
  const careKeys = (input.selected_care?.items || []).map(x => x.item_key);
  return object({
    daily_summary: paragraph,
    care_rationale: paragraph,
    care_invitation: paragraph,
    item_reasons: { type: "array", minItems: careKeys.length, maxItems: careKeys.length, items: object({
      item_key: careKeys.length ? { type: "string", enum: careKeys } : { type: "string" }, ...careCopy,
    }) },
  });
}
export function validateInsight(kind, value, input) {
  const text = (v, max) => {
    if (typeof v !== "string" || !v.trim() || v.length > max) throw new Error("invalid_insight_text");
    return v.trim();
  };
  if (!value || typeof value !== "object") throw new Error("invalid_insight");
  const careText = row => ({ reason: text(row?.reason, 120), theory: text(row?.theory, 240),
    guidance: text(row?.guidance, 140), check: text(row?.check, 100) });
  if (kind === "constitution") {
    const connections = (rows, allowed) => {
      if (!Array.isArray(rows) || rows.length !== allowed.length) throw new Error("invalid_insight_connections");
      const keys = rows.map(x => x?.key);
      if (new Set(keys).size !== keys.length || keys.some(k => !allowed.includes(k))) throw new Error("foreign_insight_connection");
      return allowed.map(key => ({ key, explanation: text(rows.find(x => x.key === key).explanation, 500) }));
    };
    if (input.care_example && value.care_example?.item_key !== input.care_example.item_key) throw new Error("foreign_result_care_example");
    if (!input.care_example && value.care_example !== null) throw new Error("foreign_result_care_example");
    return {
      overview: text(value.overview, 400),
      weather_connections: connections(value.weather_connections, input.weather_affinity.map(x => x.key)),
      care_connections: connections(value.care_connections, input.constitution.care_preferences.map(x => x.key)),
      care_example: input.care_example ? { item_key: input.care_example.item_key, ...careText(value.care_example) } : null,
    };
  }
  const allowed = (input.selected_care?.items || []).map(x => x.item_key);
  if (!Array.isArray(value.item_reasons) || value.item_reasons.length !== allowed.length || new Set(value.item_reasons.map(x => x.item_key)).size !== allowed.length || value.item_reasons.some(x => !allowed.includes(x.item_key))) throw new Error("invalid_care_item_reasons");
  return { daily_summary: text(value.daily_summary, 260),
    care_rationale: text(value.care_rationale, 220), care_invitation: text(value.care_invitation, 120),
    item_reasons: allowed.map(item_key => ({ item_key, ...careText(value.item_reasons.find(x => x.item_key === item_key)) })) };
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
経絡名や要穴の分類名は判断材料として使い、本文は「腕の手の甲側から肩・首へ続くライン」のように、体の場所とつながりを日常語で表します。ツボ名は画面と同じ名前を使います。
内部の項目名や採点の説明は、生活の言葉に翻訳して伝えます。本題から書き、必要な説明が済んだところで終えてください。
体質要素と不調の現れ方の対応が分かるよう、関係の深い経路を一つずつつなぎます。今回の説明に使う体質の特徴に絞り、短い文で書いてください。

constitution：
- overviewは240字程度まで。選んだ不調を主題に、その人の体質が関係する働きと不調への経路を説明する。既存画面で読んだ動物タイプの説明を省き、その先のつながりへ進む。
- weather_connectionsは指定された全項目を各100字程度まで。その天気が今回の体質のどの働きに負担をかけ、主訴にどう関係するかを説明する。一般的な天気相性の欄として書く。
- care_connectionsは指定された全方針を各80字程度まで。この人の不調に対して、何を整えることが狙いかを説明する。
- care_exampleは体質トリセツに表示する具体的ケア。care_policyが、この動作の担当する表示済み方針。key・label・mechanismを読み、その方針で何を整え、主訴にどう関係するかをreasonで一つつなぐ。指定された動作とcare_factsから、東洋医学的なつながり・取り入れる加減・確かめる体感を書く。実際の当日の天気はforecastの欄で扱う。

forecast：
- constitution_insightは結果画面と共通の体質の見立て。forecast_reasoningは対象日に計算された気象負担と体の反応、selected_careは実際の提案内容。
- daily_summaryは150字程度まで。主な天気ストレスが主訴にどう響くかと、今日・明日に向けて一つ取り入れたい備えを書く。服装や休むタイミングなど、天気に応じた過ごし方もここで短く伝える。基本の体質説明は結果画面に任せ、その日の話をする。
- 天気の物理方向と体の反応方向は、それぞれの計算済み項目から読む。ピークは天気ストレスが高まる時間。signal=0は負担の少なさを踏まえた普段の備えを伝える。
- care_rationaleは110字程度まで。実際に選ばれた方針が、今回の不調に対して何を整えるかを説明する。個々のケアのやり方は各ケアカードへ任せる。
- care_invitationは70字程度まで。ミモルの自然な話し言葉で、この人の不調をいたわるケアへ誘い、「食べる・ほぐす、どちらから見てみる？」と現在の2分野につなぐ。過ごし方についての質問はミモルが会話で扱う。
- item_reasonsはselected_care.itemsの全項目へ、指定のitem_keyをそのまま使って書く。料理の組み合わせ全体、個々の食材、飲み物、明日の予習用カードも含む。recordableは記録機能の区分で、本文には説明しない。
- mode=todayは今日の取り入れ方、tomorrowは明日に備えて今夜できること。target_dateに合わせて書く。

care_exampleとitem_reasonsに共通する4つの本文：
- reasonは60字程度まで。この人の体質と不調、予報では天気も踏まえ、何を整えるためのケアかを一つ具体的につなぐ。
- theoryは120字程度まで。care_facts、素材のcharacteristics、selection_evidence、componentsから、主訴とケアを結ぶ仕組みを選び、体の場所・働きの言葉で説明する。遠い場所のツボや動作は、そこから主訴の部位・働きへどうつながるかを書く。暮らしのケアは、その動作や環境調整が負担を減らす仕組みを説明する。
- guidanceは60字程度まで。この人に合う強さ・速さ・動かす幅・休む目安、飲食なら量・温度・取り入れる時間帯から、必要な加減を一つ選び、その理由を短く書く。画面にある動作手順・回数・調理手順・ツボの押し方は繰り返さず、個人に合わせる部分を担当する。
- checkは40字程度まで。取り入れる前後で、本人が確かめやすい体感を一つ挙げる。

ほぐすケアの説明：
care_factsには、実際に触れる領域、関係する経絡の循行、選ばれたツボのコードとカタログの作用がある。
その位置から主訴の部位・働きへどう関係するのかをたどり、遠隔部をケアする意味を言葉にする。前腕の手のひら側と手の甲側など、動作ごとの部位を正確に読む。
care_policyがある項目は、そのmechanismを選定根拠に使い、reasonに担当方針との関係を示す。一つの動作は担当する一方針の具体例として説明する。刺激を弱める加減は余力への配慮として扱い、「ささえる」の補う働きとは区別する。
selection_evidence.relevance_sourceがconstitution_pathの動作は、supporting_patternに示した体質の働きを整えるケア。その働きから主訴へどうつながるかを説明し、脚のケアを選んだ理由に本人が話していない脚の症状を付け加えない。
動作・呼吸による体の動きと、経絡の循行に基づく考え方は、それぞれの意味が分かるように書く。
本人が選んだ不調と提示された体質を説明の出発点にする。腕を触れるケアにも、首肩・胃腸・眠りなど今回の主訴へのつながりを書く。
理由・理論・加減・確かめることは、それぞれの役割に絞って短く書く。

食べるケアの説明：
care_policyは、実際の食材の性質と表示方針の対応。food_factsの食性・作用、selection_evidence、組み合わせのcomponentsから、その人の不調と「何を整えるために選んだか」をreasonでつなぐ。
料理の組み合わせは、方針を担当する食材と、料理として合わせる食材の役割が分かるように説明する。selection_role=culinary_companionの食材は、調理・味・食べやすさの役割として紹介する。組み合わせの方針を全食材の効能に割り当てない。
everyday_drinkは普段の水分補給としての候補。香り・カフェインの少なさ・飲む温度と、原料の食養生上の作用をそれぞれの材料から説明する。水分があることから「うるおす」等の特定の方針を補完しない。
dietary_adjustmentは、食べ方を控える／変える提案として、その対象と理由を説明する。
食品と飲み物のguidanceは、本人の余力・胃腸の状態・寒熱・対象日に合う量、温度、時間帯などから必要な一つを書く。レシピの再説明や、全員共通の注意書きで本文を埋めない。

指定のJSONで、表示欄に使う本文を返してください。
`.trim();

