// lib/karte_plus/intakeQuestions.js

/**
 * 未病カルテ Plus 深掘りチェック v1
 *
 * 目的:
 * - 既存の体質チェック結果を再判定するための質問ではない。
 * - 無料カルテで得た「体質・天気相性・経絡ライン・主訴」に、
 *   時間帯・悪化条件・楽になる条件・生活負荷・回復阻害・ケア嗜好を足し、
 *   有料カルテを「不調ループ見える化レポート」に変えるための追加問診。
 */

export const KARTE_PLUS_VERSION = "karte_plus_intake_v1";

export const KARTE_PLUS_QUESTION_GROUPS = {
  pattern: {
    title: "不調の出方",
    description: "いつ・どんな流れで出やすいかを整理します。",
  },
  triggers: {
    title: "悪化しやすい条件",
    description: "生活の中で重なりやすい負担を確認します。",
  },
  recovery: {
    title: "戻しやすい方向",
    description: "どのケア方針が合いやすいかを見ます。",
  },
  habits: {
    title: "生活の土台",
    description: "睡眠・食事・作業負荷を確認します。",
  },
  fit: {
    title: "続けやすさ",
    description: "実際に続けられる整え方に落とし込みます。",
  },
};

export const KARTE_PLUS_QUESTIONS = [
  {
    id: "KP1",
    key: "duration_pattern",
    group: "pattern",
    type: "single",
    title: "今いちばん気になる不調は、どのくらい前からくり返していますか？",
    helper: "一時的な不調か、生活の中で固定化している不調かを見分けます。",
    options: [
      { label: "最近出てきた", value: "recent" },
      { label: "ここ1か月くらい", value: "one_month" },
      { label: "3か月以上くり返している", value: "three_months" },
      { label: "半年以上くり返している", value: "six_months" },
      { label: "昔から出やすい", value: "long_term" },
    ],
  },
  {
    id: "KP2",
    key: "time_windows",
    group: "pattern",
    type: "multi",
    max: 2,
    title: "その不調は、いつ出やすいですか？",
    helper: "最大2つまで選んでください。",
    options: [
      { label: "朝起きたとき", value: "waking" },
      { label: "午前中", value: "morning" },
      { label: "昼〜夕方", value: "afternoon" },
      { label: "夜", value: "night" },
      { label: "食後", value: "after_meal" },
      { label: "寝る前", value: "before_sleep" },
      { label: "天気が崩れる前", value: "before_weather_change" },
      { label: "天気が崩れた後", value: "after_weather_change" },
      { label: "決まっていない", value: "irregular" },
    ],
  },
  {
    id: "KP3",
    key: "aggravators",
    group: "triggers",
    type: "multi",
    max: 3,
    title: "不調が強くなりやすいのは、どんな時ですか？",
    helper: "最大3つまで選んでください。",
    options: [
      { label: "睡眠不足のあと", value: "sleep_debt" },
      { label: "忙しさ・予定が続いたあと", value: "over_schedule" },
      { label: "ストレスや緊張が強いとき", value: "stress_tension" },
      { label: "座りっぱなし・画面作業が続いたあと", value: "desk_screen" },
      { label: "冷えたあと", value: "cold_exposure" },
      { label: "湿気が強い日", value: "humid_day" },
      { label: "食べすぎ・飲みすぎのあと", value: "overeating" },
      { label: "運動不足が続いたあと", value: "under_movement" },
      { label: "動きすぎたあと", value: "over_movement" },
    ],
  },
  {
    id: "KP4",
    key: "relievers",
    group: "recovery",
    type: "multi",
    max: 2,
    title: "楽になりやすいのは、どれですか？",
    helper: "最大2つまで選んでください。",
    options: [
      { label: "温める", value: "warming" },
      { label: "軽く動く", value: "light_movement" },
      { label: "横になる・休む", value: "rest" },
      { label: "深呼吸する", value: "breathing" },
      { label: "食事を軽くする", value: "lighter_meal" },
      { label: "お風呂に入る", value: "bath" },
      { label: "寝る", value: "sleep" },
      { label: "何をしてもあまり変わらない", value: "little_change" },
    ],
  },
  {
    id: "KP5",
    key: "sleep_pattern",
    group: "habits",
    type: "single",
    title: "最近の睡眠で、一番近いものはどれですか？",
    options: [
      { label: "寝つきにくい", value: "hard_to_fall_asleep" },
      { label: "夜中に目が覚める", value: "night_waking" },
      { label: "眠りが浅い", value: "light_sleep" },
      { label: "朝起きても疲れが残る", value: "unrefreshed" },
      { label: "眠気が強い", value: "sleepy_daytime" },
      { label: "睡眠は大きく乱れていない", value: "mostly_ok" },
    ],
  },
  {
    id: "KP6",
    key: "meal_loads",
    group: "habits",
    type: "multi",
    max: 2,
    title: "最近の食事で近いものはありますか？",
    helper: "最大2つまで選んでください。",
    options: [
      { label: "冷たい飲み物・食べ物が多い", value: "cold_food_drink" },
      { label: "甘いもの・間食が多い", value: "sweets_snacks" },
      { label: "脂っこいものが多い", value: "oily_food" },
      { label: "食事時間が不規則", value: "irregular_meals" },
      { label: "食べる量が少ない", value: "low_intake" },
      { label: "早食いになりやすい", value: "fast_eating" },
      { label: "胃腸の負担はあまり感じない", value: "no_major_load" },
    ],
  },
  {
    id: "KP7",
    key: "daily_loads",
    group: "habits",
    type: "multi",
    max: 2,
    title: "日常で多い負担はどれですか？",
    helper: "最大2つまで選んでください。",
    options: [
      { label: "デスクワーク・画面作業が多い", value: "desk_work" },
      { label: "立ちっぱなしが多い", value: "standing_work" },
      { label: "移動・歩行が多い", value: "walking_moving" },
      { label: "重いものを持つことが多い", value: "lifting" },
      { label: "家事・育児で前かがみが多い", value: "bending_carework" },
      { label: "運動量が少ない", value: "low_activity" },
      { label: "運動量が多すぎる", value: "high_activity" },
    ],
  },
  {
    id: "KP8",
    key: "recovery_blocks",
    group: "fit",
    type: "multi",
    max: 2,
    title: "整えたいと思っても、続きにくい理由は何ですか？",
    helper: "最大2つまで選んでください。",
    options: [
      { label: "時間がない", value: "no_time" },
      { label: "何をすればいいかわからない", value: "dont_know_what" },
      { label: "疲れていてケアする気力がない", value: "too_tired" },
      { label: "すぐ忘れる", value: "forget" },
      { label: "道具や環境がない", value: "no_tools_environment" },
      { label: "家族や仕事の都合で生活を変えにくい", value: "hard_to_change_life" },
      { label: "続けること自体は苦手ではない", value: "can_continue" },
    ],
  },
  {
    id: "KP9",
    key: "care_preferences",
    group: "fit",
    type: "multi",
    max: 3,
    title: "取り入れやすいケアはどれですか？",
    helper: "最大3つまで選んでください。",
    options: [
      { label: "食べ方を変える", value: "food" },
      { label: "飲み物を変える", value: "drink" },
      { label: "ツボ・セルフケア", value: "tsubo_selfcare" },
      { label: "ストレッチ", value: "stretch" },
      { label: "入浴・温め", value: "bath_warming" },
      { label: "睡眠環境を整える", value: "sleep_environment" },
      { label: "部屋の湿度・温度を整える", value: "room_environment" },
      { label: "朝夜のルーティン", value: "routine" },
    ],
  },
  {
    id: "KP10",
    key: "main_goal",
    group: "fit",
    type: "single",
    title: "今回いちばん知りたいことは何ですか？",
    options: [
      { label: "なぜこの不調が出やすいのか知りたい", value: "why_loop" },
      { label: "まず何から整えればいいか知りたい", value: "first_step" },
      { label: "天気が悪い日の備え方を知りたい", value: "weather_preparation" },
      { label: "季節ごとの注意点を知りたい", value: "seasonal_plan" },
      { label: "食事や生活習慣を具体的に知りたい", value: "food_lifestyle" },
      { label: "ツボやセルフケアを具体的に知りたい", value: "tsubo_selfcare" },
    ],
  },
  {
    id: "KP11",
    key: "avoidance_priority",
    group: "fit",
    type: "single",
    title: "今の生活で、まず減らせそうな負担はどれですか？",
    helper: "有料カルテでは「足すケア」だけでなく、減らす負担も整理します。",
    options: [
      { label: "夜更かし・睡眠不足", value: "late_night" },
      { label: "冷え・冷たい飲食", value: "cold_load" },
      { label: "食べすぎ・胃腸負担", value: "digestive_load" },
      { label: "画面作業・同じ姿勢", value: "screen_posture" },
      { label: "予定の詰め込み", value: "schedule_load" },
      { label: "いまは減らせそうなものがない", value: "hard_to_reduce" },
    ],
  },
  {
    id: "KP12",
    key: "support_output",
    group: "fit",
    type: "single",
    title: "カルテの最後に、どんな形のまとめがあると使いやすいですか？",
    options: [
      { label: "毎日の実践リスト", value: "daily_checklist" },
      { label: "天気が崩れる前日の備えリスト", value: "weather_checklist" },
      { label: "専門家に相談するときの共有メモ", value: "consultation_sheet" },
      { label: "自分に合う養生キット候補", value: "yohjo_kit" },
      { label: "まずは読み物として理解できればよい", value: "reading_first" },
    ],
  },
];

export function getKartePlusQuestionMap() {
  const map = new Map();
  for (const q of KARTE_PLUS_QUESTIONS) map.set(q.key, q);
  return map;
}

export function getKartePlusQuestionByKey(key) {
  return KARTE_PLUS_QUESTIONS.find((q) => q.key === key) || null;
}

export function getKartePlusTotalQuestions() {
  return KARTE_PLUS_QUESTIONS.length;
}
