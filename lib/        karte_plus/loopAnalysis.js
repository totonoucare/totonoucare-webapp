// lib/karte_plus/loopAnalysis.js

/**
 * 未病カルテ Plus v1: 不調ループ見える化のための軽量集計。
 *
 * 注意:
 * - これは診断ロジックではなく、カルテ編集用の整理ロジック。
 * - 既存の core_code / sub_labels / env_vectors / meridian を上書きしない。
 * - 出力はAIプロンプト、購入前プレビュー、相談前シートの材料として使う。
 */

export const CARE_DIRECTIONS = {
  shizumeru: "しずめる",
  yurumeru: "ゆるめる",
  meguraseru: "めぐらせる",
  nagasu: "ながす",
  uruosu: "うるおす",
  nukumeru: "ぬくめる",
  sasaeru: "ささえる",
};

const DIRECTION_HINTS = {
  shizumeru: "熱・冴え・高ぶりを落ち着ける",
  yurumeru: "力み・こわばり・緊張をほどく",
  meguraseru: "滞りやこもりに逃げ道を作る",
  nagasu: "湿気・重だるさ・水っぽさをためない",
  uruosu: "乾き・消耗を残さない",
  nukumeru: "冷えの入口を守る",
  sasaeru: "胃腸・回復力・余力を削らない",
};

const OPTION_COPY = {
  duration_pattern: {
    recent: "最近出てきた不調",
    one_month: "ここ1か月ほど続く不調",
    three_months: "3か月以上くり返している不調",
    six_months: "半年以上くり返している不調",
    long_term: "昔から出やすい不調",
  },
  time_windows: {
    waking: "朝起きたとき",
    morning: "午前中",
    afternoon: "昼〜夕方",
    night: "夜",
    after_meal: "食後",
    before_sleep: "寝る前",
    before_weather_change: "天気が崩れる前",
    after_weather_change: "天気が崩れた後",
    irregular: "決まった時間帯がない",
  },
  aggravators: {
    sleep_debt: "睡眠不足",
    over_schedule: "予定や忙しさの重なり",
    stress_tension: "ストレスや緊張",
    desk_screen: "座りっぱなし・画面作業",
    cold_exposure: "冷え",
    humid_day: "湿気",
    overeating: "食べすぎ・飲みすぎ",
    under_movement: "運動不足",
    over_movement: "動きすぎ",
  },
  relievers: {
    warming: "温める",
    light_movement: "軽く動く",
    rest: "横になる・休む",
    breathing: "深呼吸する",
    lighter_meal: "食事を軽くする",
    bath: "お風呂に入る",
    sleep: "寝る",
    little_change: "何をしてもあまり変わらない",
  },
  sleep_pattern: {
    hard_to_fall_asleep: "寝つきにくい",
    night_waking: "夜中に目が覚める",
    light_sleep: "眠りが浅い",
    unrefreshed: "朝起きても疲れが残る",
    sleepy_daytime: "日中の眠気が強い",
    mostly_ok: "睡眠は大きく乱れていない",
  },
  recovery_blocks: {
    no_time: "時間がない",
    dont_know_what: "何をすればいいかわからない",
    too_tired: "疲れていてケアする気力がない",
    forget: "すぐ忘れる",
    no_tools_environment: "道具や環境がない",
    hard_to_change_life: "家族や仕事の都合で生活を変えにくい",
    can_continue: "続けること自体は苦手ではない",
  },
};

function arr(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  return [value];
}

function add(scores, key, amount = 1) {
  scores[key] = (scores[key] || 0) + amount;
}

function labelList(key, values) {
  return arr(values).map((v) => OPTION_COPY[key]?.[v] || v);
}

function unique(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

export function buildKartePlusLoopProfile({ diagnosis = {}, intake = {} } = {}) {
  const scores = {
    shizumeru: 0,
    yurumeru: 0,
    meguraseru: 0,
    nagasu: 0,
    uruosu: 0,
    nukumeru: 0,
    sasaeru: 0,
  };

  // 既存診断側の素材を、あくまで編集補助として反映する。
  for (const sub of arr(diagnosis.sub_labels || diagnosis.subLabels)) {
    const code = typeof sub === "string" ? sub : sub?.code;
    if (code === "qi_stagnation") { add(scores, "yurumeru", 1.2); add(scores, "meguraseru", 1); add(scores, "shizumeru", 0.6); }
    if (code === "qi_deficiency") { add(scores, "sasaeru", 1.4); }
    if (code === "blood_deficiency") { add(scores, "uruosu", 1.1); add(scores, "sasaeru", 0.9); }
    if (code === "blood_stasis") { add(scores, "meguraseru", 1.4); add(scores, "nukumeru", 0.6); }
    if (code === "fluid_damp") { add(scores, "nagasu", 1.5); add(scores, "sasaeru", 0.8); }
    if (code === "fluid_deficiency") { add(scores, "uruosu", 1.4); add(scores, "shizumeru", 0.6); }
  }

  for (const vector of arr(diagnosis.env_vectors || diagnosis.envVectors)) {
    if (vector === "pressure_shift") { add(scores, "yurumeru", 0.7); add(scores, "meguraseru", 0.5); }
    if (vector === "temp_swing") { add(scores, "sasaeru", 0.5); add(scores, "nukumeru", 0.5); }
    if (vector === "humidity_up") { add(scores, "nagasu", 0.9); add(scores, "sasaeru", 0.4); }
    if (vector === "dryness_up") { add(scores, "uruosu", 0.9); }
    if (vector === "wind_strong") { add(scores, "yurumeru", 0.5); add(scores, "shizumeru", 0.4); }
  }

  // Plus深掘り問診側。
  for (const v of arr(intake.aggravators)) {
    if (v === "sleep_debt") { add(scores, "sasaeru", 1.1); add(scores, "uruosu", 0.4); }
    if (v === "over_schedule") { add(scores, "sasaeru", 0.9); add(scores, "shizumeru", 0.5); }
    if (v === "stress_tension") { add(scores, "yurumeru", 1.1); add(scores, "shizumeru", 0.7); }
    if (v === "desk_screen") { add(scores, "yurumeru", 0.9); add(scores, "meguraseru", 0.7); }
    if (v === "cold_exposure") { add(scores, "nukumeru", 1.2); }
    if (v === "humid_day") { add(scores, "nagasu", 1.2); }
    if (v === "overeating") { add(scores, "sasaeru", 1.1); add(scores, "nagasu", 0.6); }
    if (v === "under_movement") { add(scores, "meguraseru", 1.0); }
    if (v === "over_movement") { add(scores, "sasaeru", 0.9); add(scores, "yurumeru", 0.4); }
  }

  for (const v of arr(intake.relievers)) {
    if (v === "warming") add(scores, "nukumeru", 1.0);
    if (v === "light_movement") add(scores, "meguraseru", 1.0);
    if (v === "rest") add(scores, "sasaeru", 1.0);
    if (v === "breathing") { add(scores, "shizumeru", 0.8); add(scores, "yurumeru", 0.5); }
    if (v === "lighter_meal") { add(scores, "nagasu", 0.8); add(scores, "sasaeru", 0.5); }
    if (v === "bath") { add(scores, "nukumeru", 0.6); add(scores, "yurumeru", 0.5); }
    if (v === "sleep") add(scores, "sasaeru", 0.8);
  }

  if (intake.sleep_pattern === "hard_to_fall_asleep") add(scores, "shizumeru", 1.0);
  if (["night_waking", "light_sleep"].includes(intake.sleep_pattern)) { add(scores, "shizumeru", 0.8); add(scores, "sasaeru", 0.5); }
  if (["unrefreshed", "sleepy_daytime"].includes(intake.sleep_pattern)) add(scores, "sasaeru", 1.0);

  for (const v of arr(intake.meal_loads)) {
    if (["cold_food_drink", "irregular_meals", "fast_eating", "low_intake"].includes(v)) add(scores, "sasaeru", 0.8);
    if (["sweets_snacks", "oily_food"].includes(v)) add(scores, "nagasu", 0.8);
    if (v === "cold_food_drink") add(scores, "nukumeru", 0.6);
  }

  const rankedDirections = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([code, score]) => ({ code, label: CARE_DIRECTIONS[code], hint: DIRECTION_HINTS[code], score: Number(score.toFixed(2)) }))
    .filter((x) => x.score > 0)
    .slice(0, 4);

  const loopSignals = unique([
    ...labelList("time_windows", intake.time_windows),
    ...labelList("aggravators", intake.aggravators),
  ]).slice(0, 6);

  const recoverySignals = unique([
    ...labelList("relievers", intake.relievers),
    OPTION_COPY.sleep_pattern?.[intake.sleep_pattern],
  ]).slice(0, 5);

  const loopStage = ["three_months", "six_months", "long_term"].includes(intake.duration_pattern)
    ? "fixed_loop"
    : ["one_month"].includes(intake.duration_pattern)
      ? "forming_loop"
      : "early_loop";

  const previewText = buildKartePlusPreviewText({ intake, rankedDirections, loopSignals });

  return {
    version: "karte_plus_loop_profile_v1",
    loopStage,
    durationLabel: OPTION_COPY.duration_pattern?.[intake.duration_pattern] || "不調の続き方は未設定",
    loopSignals,
    recoverySignals,
    rankedDirections,
    recoveryBlocks: labelList("recovery_blocks", intake.recovery_blocks),
    carePreferences: arr(intake.care_preferences),
    mainGoal: intake.main_goal || null,
    supportOutput: intake.support_output || null,
    previewText,
  };
}

export function buildKartePlusPreviewText({ intake = {}, rankedDirections = [], loopSignals = [] } = {}) {
  const directionText = rankedDirections.slice(0, 3).map((x) => `「${x.label}」`).join("・");
  const signalText = loopSignals.slice(0, 3).join("・");

  if (directionText && signalText) {
    return `今回の回答からは、${signalText}が重なったときに不調が出やすい流れが見えています。優先方針は${directionText}です。全文では、無料カルテの体質結果と統合して、繰り返す不調の流れ・減らしたい負担・7日間の整え方まで整理します。`;
  }

  if (directionText) {
    return `今回の回答からは、優先方針として${directionText}が見えています。全文では、無料カルテの体質結果と統合して、繰り返す不調の流れ・減らしたい負担・7日間の整え方まで整理します。`;
  }

  return "回答をもとに、無料カルテの体質結果と統合して、繰り返す不調の流れ・減らしたい負担・7日間の整え方まで整理します。";
}

