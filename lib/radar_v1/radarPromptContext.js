// lib/radar_v1/radarPromptContext.js
import {
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
  SYMPTOM_LABELS,
} from "@/lib/diagnosis/v2/labels";
import {
  getPressureResponseCopy,
  readPressureResponseDirection,
} from "@/lib/radar_v1/pressureResponse";

const ORGAN_LABELS = {
  liver: "肝",
  spleen: "脾",
  kidney: "腎",
};

const EXACT_TRIGGER_LABELS = {
  pressure_down: "気圧低下",
  pressure_up: "気圧上昇",
  temp_shift: "寒暖差",
  cold: "低温",
  heat: "高温",
  damp: "湿",
  dry: "乾燥",
  none: "大きな変化なし",
};

const PRIMARY_TRIGGER_CONTRACT = {
  pressure_down: {
    anchor_phrase: "気圧低下",
    main_effect: "気圧変化のうち低下方向が目立つ。表れ方は体質の反応方向と気血水傾向から説明する",
    allowed_sub_effects: ["張りつめ", "力み", "重だるさ", "動き出しにくさ", "消耗", "頭重感"],
    forbidden_primary_phrases: ["気圧上昇を主因にする", "暑さを主因にする", "乾燥を主因にする"],
  },
  pressure_up: {
    anchor_phrase: "気圧上昇",
    main_effect: "気圧変化のうち上昇方向が目立つ。表れ方は体質の反応方向と気血水傾向から説明する",
    allowed_sub_effects: ["張りつめ", "力み", "重だるさ", "動き出しにくさ", "消耗", "頭重感"],
    forbidden_primary_phrases: ["気圧低下を主因にする", "冷え込みを主因にする", "湿を主因にする"],
  },
  temp_shift: {
    anchor_phrase: "寒暖差",
    main_effect: "暑さや寒さそのものではなく、気温の変化幅への適応で負担が出やすい",
    allowed_sub_effects: ["こわばり", "切り替えにくさ", "だるさ", "消耗", "張り"],
    forbidden_primary_phrases: ["猛暑を主因にする", "厳しい寒さを主因にする"],
  },
  cold: {
    anchor_phrase: "低温",
    main_effect: "気温低下そのものではなく、低い気温の環境をきっかけに、体が縮こまり、巡りや動き出しが鈍りやすい",
    allowed_sub_effects: ["こわばり", "重だるさ", "動き出しにくさ", "巡りの鈍さ", "支えの弱さ"],
    forbidden_primary_phrases: ["暑さを主因にする", "気温上昇を主因にする", "熱こもりを主因にする"],
  },
  heat: {
    anchor_phrase: "高温",
    main_effect: "気温上昇という変化ではなく、高い気温の環境をきっかけに、熱っぽさや消耗が出やすい",
    allowed_sub_effects: ["熱っぽさ", "こもり感", "張りつめ", "いら立ち", "巡りの詰まり", "のぼりやすさ"],
    forbidden_primary_phrases: ["冷えを主因にする", "冷え込みを主因にする", "寒さを主因にする", "体が縮こまることを主因にする"],
  },
  damp: {
    anchor_phrase: "湿っぽさ",
    main_effect: "外側の湿っぽさをきっかけに、重だるさ・むくみ感・さばきにくさが出やすい",
    allowed_sub_effects: ["重だるさ", "むくみ感", "頭重感", "消化の重さ", "動き出しにくさ"],
    forbidden_primary_phrases: ["乾燥を主因にする", "気温上昇を主因にする"],
  },
  dry: {
    anchor_phrase: "乾燥",
    main_effect: "外側の乾燥をきっかけに、うるおい不足・こわばり・回復しにくさが出やすい",
    allowed_sub_effects: ["乾き", "こわばり", "熱っぽさ", "回復しにくさ", "肌や喉の乾き"],
    forbidden_primary_phrases: ["湿を主因にする", "湿っぽさを主因にする"],
  },
  none: {
    anchor_phrase: "大きな変化なし",
    main_effect: "目立つ気象要素は小さく、全体の過ごし方を整える",
    allowed_sub_effects: [],
    forbidden_primary_phrases: [],
  },
};

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function mapTriggerLabel(exact) {
  return EXACT_TRIGGER_LABELS[exact] || EXACT_TRIGGER_LABELS.none;
}

function buildTriggerMeaning(exact) {
  switch (exact) {
    case "pressure_down":
      return "外的な変化としては、気圧が下がる方向の揺れが目立つ。";
    case "pressure_up":
      return "外的な変化としては、気圧が上がる方向の揺れが目立つ。";
    case "temp_shift":
      return "外的な変化としては、絶対的な暑さ・寒さより寒暖差が目立つ。";
    case "cold":
      return "外的な変化としては、冷え込みや気温低下方向が目立つ。";
    case "heat":
      return "外的な変化としては、気温上昇や日中の熱負荷が目立つ。";
    case "damp":
      return "外的な変化としては、湿っぽさや重さが目立つ。";
    case "dry":
      return "外的な変化としては、乾きやすさが目立つ。";
    default:
      return "外的な変化は比較的小さい。";
  }
}

function buildBodyExpressionGuidance({ exact, subCodes = [], symptomFocus = null, pressureResponseDirection = null } = {}) {
  const has = (code) => subCodes.includes(code);
  const parts = [];

  const add = (text) => {
    if (text) parts.push(text);
  };

  // ここでは「文章例」ではなく、GPTが自然文に変換するための意味素材だけを渡す。
  // 生成プロンプト側でも、この文言をそのままコピーしないよう指示する。
  if (exact === "pressure_down" || exact === "pressure_up") {
    const response = getPressureResponseCopy(pressureResponseDirection);
    add(`体の反応方向: 気圧の物理方向とは分け、${response.lead}`);
    if (has("qi_stagnation") || has("blood_stasis")) add("気滞/瘀血傾向: 張り・詰まり・固定したこわばりの出やすい場所を補足する");
    if (has("fluid_damp")) add("痰湿傾向: 頭重感・むくみ・胃腸の重さの出やすさを補足する");
    if (has("qi_deficiency") || has("blood_deficiency") || has("fluid_deficiency")) add("不足傾向: 気圧変化への適応で使う余力と回復の遅れを補足する");
  }
  if (exact === "temp_shift") {
    if (has("qi_stagnation") || has("blood_stasis")) add("気滞/瘀血傾向: 寒暖差への適応で張りや固定したこわばりが出やすい");
    if (has("qi_deficiency") || has("blood_deficiency") || has("fluid_deficiency")) add("不足傾向: 寒暖差への適応で消耗やだるさが出やすい");
    if (has("fluid_damp")) add("痰湿傾向: 寒暖差への適応で重だるさや動き出しにくさが出やすい");
  }
  if (exact === "heat") {
    if (has("qi_stagnation")) add("気滞傾向: 気温上昇時に熱っぽさ・張りつめ・巡りの詰まりが出やすい");
    if (has("blood_deficiency") || has("fluid_deficiency")) add("うるおい/血の不足傾向: 気温上昇時に消耗感・そわつき・受け止めにくさが出やすい");
  }
  if (exact === "cold") {
    if (has("qi_deficiency")) add("気虚傾向: 冷え込み時に支える力が落ち、だるさ・動き出しにくさが出やすい");
    if (has("fluid_damp")) add("痰湿傾向: 冷え込み時に水分の重さ・むくみ感・さばけなさが出やすい");
    if (has("blood_deficiency") || has("blood_stasis")) add("血の不足/滞り傾向: 冷え込み時に巡りの鈍さ・こわばり・張りが出やすい");
  }
  if (exact === "damp") {
    if (has("fluid_damp")) add("痰湿傾向: 湿っぽさで重だるさ・頭重感・さばきにくさが出やすい");
    if (has("qi_deficiency")) add("気虚傾向: 湿っぽさで消化やエネルギーの立ち上がりが鈍りやすい");
  }
  if (exact === "dry") {
    if (has("fluid_deficiency") || has("blood_deficiency")) add("うるおい/血の不足傾向: 乾燥時に乾き・こわばり・回復しにくさが出やすい");
    if (has("qi_stagnation")) add("気滞傾向: 乾燥時に張りや詰まり感を逃がしにくい");
  }

  if (symptomFocus === "mood") add("主訴: 気分の浮き沈みに着地させる。ただし体質・天気の説明から自然につなぐ");
  if (symptomFocus === "headache") add("主訴: 頭痛に着地させる。上に集まる張り・頭重感・巡りの滞りとつなぐ");
  if (symptomFocus === "neck_shoulder") add("主訴: 首肩のこわばりに着地させる。張り・力み・巡りの鈍さとつなぐ");
  if (symptomFocus === "fatigue") add("主訴: 疲れやすさに着地させる。支える力・回復力・動き出しにくさとつなぐ");
  if (symptomFocus === "digestion") add("主訴: 胃腸の調子に着地させる。食後の重さ・お腹の張り・冷えや湿気によるさばきにくさとつなぐ");
  if (symptomFocus === "swelling") add("主訴: むくみ・重だるさに着地させる。さばきにくさや水分の重さとつなぐ");

  return {
    guidance: parts.length
      ? parts.slice(0, 4).join(" / ")
      : "体質・主訴は、主因がその人にどう現れやすいかの説明にだけ使う。",
  };
}

function buildSecondaryTriggerInfo(exact, riskContext) {
  if (!exact || exact === "none") return null;
  const base = PRIMARY_TRIGGER_CONTRACT[exact] || null;
  if (!base) return null;

  const subCodes = safeArray(riskContext?.constitution_context?.sub_labels);
  const symptomFocus = riskContext?.constitution_context?.symptom_focus || null;
  const bodyExpression = buildBodyExpressionGuidance({
    exact,
    subCodes,
    symptomFocus,
    pressureResponseDirection: readPressureResponseDirection(riskContext),
  });

  return {
    secondary_exact: exact,
    secondary_label: mapTriggerLabel(exact),
    secondary_effect: base.main_effect,
    allowed_sub_effects: base.allowed_sub_effects,
    body_expression_guidance: bodyExpression.guidance,
    rule: "副因は主因を上書きしない。文章に入れる場合も、主因の説明に1つ添える味変・補助要素として扱う。",
  };
}

function buildPrimaryTriggerContract(exact, riskContext) {
  const base = PRIMARY_TRIGGER_CONTRACT[exact] || PRIMARY_TRIGGER_CONTRACT.none;
  const label = mapTriggerLabel(exact);
  const start = riskContext?.summary?.peak_start || null;
  const end = riskContext?.summary?.peak_end || null;
  const subCodes = safeArray(riskContext?.constitution_context?.sub_labels);
  const symptomFocus = riskContext?.constitution_context?.symptom_focus || null;
  const bodyExpression = buildBodyExpressionGuidance({
    exact,
    subCodes,
    symptomFocus,
    pressureResponseDirection: readPressureResponseDirection(riskContext),
  });

  const secondary = buildSecondaryTriggerInfo(
    riskContext?.summary?.secondary_trigger_exact ||
      riskContext?.summary?.personal_secondary_trigger_exact ||
      riskContext?.weather_context?.personal_secondary_trigger_exact ||
      null,
    riskContext
  );

  return {
    primary_exact: exact || "none",
    primary_label: label,
    physical_direction:
      exact === "pressure_down" ? "down" : exact === "pressure_up" ? "up" : null,
    pressure_response_direction: readPressureResponseDirection(riskContext),
    anchor_phrase: base.anchor_phrase,
    main_effect: base.main_effect,
    peak_time: start && end ? `${start}-${end}` : null,
    peak_time_meaning: "天気ストレスが強まる時間帯。症状の発生時刻ではない。",
    allowed_sub_effects: base.allowed_sub_effects,
    body_expression_guidance: bodyExpression.guidance,
    forbidden_primary_phrases: base.forbidden_primary_phrases,
    secondary,
    secondary_exact: secondary?.secondary_exact || null,
    secondary_label: secondary?.secondary_label || null,
    secondary_effect: secondary?.secondary_effect || null,
    secondary_body_expression_guidance: secondary?.body_expression_guidance || null,
    rule: "文章の主因は必ず forecast.personal_main_trigger_exact / this_contract.primary_exact に合わせる。気圧では上昇・低下を物理情報、pressure_response_directionを体への表れ方として分け、物理方向から張り・重さを決め直さない。peak_timeは天気ストレスのピークであり、症状発現時刻として扱わない。副因がある場合だけ補助要素として添える。",
  };
}
function buildPersonalTriggerMeaning(exact, subCodes, coreCode, pressureResponseDirection = null) {
  const has = (code) => subCodes.includes(code);

  switch (exact) {
    case "pressure_down":
    case "pressure_up": {
      const response = getPressureResponseCopy(pressureResponseDirection);
      return `本人には、気圧変化が${response.lead}。気圧の上昇・低下は物理情報として別に扱う。`;
    }

    case "temp_shift":
      if (has("qi_stagnation") || has("blood_stasis")) {
        return "本人には、寒暖差が張りや固定したこわばりとして響きやすい。";
      }
      return "本人には、寒暖差への適応がだるさや消耗として響きやすい。";

    case "cold":
      if (has("qi_deficiency")) {
        return "本人には、低温がだるさや支えの弱さとして響きやすい。";
      }
      if (has("blood_deficiency") || has("blood_stasis")) {
        return "本人には、低温がこわばりや巡りの鈍さとして響きやすい。";
      }
      return "本人には、低温が負担として響きやすい。";

    case "heat":
      if (has("qi_stagnation")) {
        return "本人には、気温上昇が詰まりやいら立ちとして響きやすい。";
      }
      if (has("fluid_deficiency")) {
        return "本人には、気温上昇が乾きやのぼせとして響きやすい。";
      }
      return "本人には、気温上昇が熱っぽさやこもりとして響きやすい。";

    case "damp":
      if (has("fluid_damp")) {
        return "本人には、湿が重だるさや頭重感として響きやすい。";
      }
      if (has("qi_deficiency")) {
        return "本人には、湿がだるさや重さとして響きやすい。";
      }
      return "本人には、湿が重さとして響きやすい。";

    case "dry":
      if (has("fluid_deficiency")) {
        return "本人には、乾燥が乾きや回復しにくさとして響きやすい。";
      }
      if (has("blood_deficiency")) {
        return "本人には、乾燥がうるおい不足やこわばりとして響きやすい。";
      }
      return "本人には、乾燥が負担として響きやすい。";

    default:
      return "本人には、特定の気象要素より全体のぶれとして響きやすい。";
  }
}

/**
 * targetDate は YYYY-MM-DD を想定
 * JST基準で安全に M/D(曜) を作る
 */
function formatTargetDateLabel(targetDate) {
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return targetDate;

  const [y, m, d] = targetDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

  const weekday = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  })
    .format(dt)
    .replace("曜日", "")
    .replace("曜", "");

  return `${m}/${d}(${weekday})`;
}

function buildTimeGuidance(relativeTargetMode) {
  const common = {
    lead_day_phrase: "target_date_labelは",
    second_item_phrase: "この日は",
    third_item_phrase: null,
    sentence_scope:
      "保存されるGPT本文は、閲覧タイミングが前日夜でも対象日当日でも破綻しないよう、対象日の見立てとして書く。前夜の備えや当日のリマインドはUI・通知側で表現する。",
    writing_rule:
      "本文では target_date_label または『この日』を使う。prohibited_relative_date_words に含まれる、閲覧タイミングで意味が変わる表現は使わない。",
    prohibited_relative_date_words: [
      "今日",
      "本日",
      "明日",
      "あした",
      "あす",
      "今夜",
      "今晩",
      "今朝",
      "明朝",
      "翌朝",
      "翌日",
      "昨日",
      "昨夜",
      "前夜",
    ],
    allowed_time_words:
      "朝・昼・午後・夕方・夜・就寝前など、対象日内の時間帯を示す表現は使ってよい。",
  };

  return {
    ...common,
    relative_target_mode: relativeTargetMode || null,
  };
}

export function buildRadarPromptContext({
  riskContext,
  radarPlan,
  targetDate = null,
  relativeTargetMode = null,
}) {
  const coreCode = riskContext?.constitution_context?.core_code || "";
  const subLabelCodes = safeArray(riskContext?.constitution_context?.sub_labels);
  const symptomFocus = riskContext?.constitution_context?.symptom_focus || null;
  const organFocus = safeArray(riskContext?.tcm_context?.organ_focus);
  const pressureResponseDirection = readPressureResponseDirection(riskContext);

  const core = getCoreLabel(coreCode);
  const subs = getSubLabels(subLabelCodes);

  const primaryMeridianCode =
    riskContext?.constitution_context?.primary_meridian || null;
  const secondaryMeridianCode =
    riskContext?.constitution_context?.secondary_meridian || null;

  const primaryMeridian = primaryMeridianCode
    ? getMeridianLine(primaryMeridianCode)
    : null;
  const secondaryMeridian = secondaryMeridianCode
    ? getMeridianLine(secondaryMeridianCode)
    : null;

  const weatherMainExact =
    riskContext?.summary?.weather_main_trigger_exact || "none";
  const personalMainExact =
    riskContext?.summary?.main_trigger_exact || "none";
  const personalSecondaryExact =
    riskContext?.summary?.secondary_trigger_exact ||
    riskContext?.summary?.personal_secondary_trigger_exact ||
    riskContext?.weather_context?.personal_secondary_trigger_exact ||
    null;

  const timeGuidance = buildTimeGuidance(relativeTargetMode);
  const primaryTriggerContract = buildPrimaryTriggerContract(
    personalMainExact,
    riskContext
  );

  return {
    app_context: {
      app_name: "未病レーダー",
      app_purpose:
        "気象と体質の重なりから、対象日の崩れやすさと先回りセルフケアを提案するアプリ。",
      audience:
        "一般ユーザー。専門用語を出しすぎず、短くても納得できる説明が必要。",
      style:
        "やさしいが甘すぎない。脅さない。診断や治療の断定はしない。",
    },

    time_context: {
      target_date: targetDate,
      target_date_label: formatTargetDateLabel(targetDate),
      relative_target_mode: relativeTargetMode,
      lead_day_phrase: timeGuidance.lead_day_phrase,
      second_item_phrase: timeGuidance.second_item_phrase,
      third_item_phrase: timeGuidance.third_item_phrase,
      sentence_scope: timeGuidance.sentence_scope,
      writing_rule: timeGuidance.writing_rule,
    },

    explanation_rules: {
      must_follow_primary_trigger:
        "文章の主因は必ず forecast.personal_main_trigger_exact に合わせること。forecast.personal_secondary_trigger_exact がある場合だけ、副因として軽く添えてよい。weather_main_trigger_exact、tcm_context、sub_labels は補助情報であり、主因を上書きしない。",
      must_separate_weather_and_personal:
        "天気として強い変化と、本人に一番響きやすい要素は分けて考えること。",
      must_separate_pressure_direction_and_response:
        "気圧の上昇・低下は物理情報。張り・力み／重だるさなど体への表れ方は forecast.pressure_response_direction に従い、気圧方向から再推論しないこと。",
      do_not_overclaim_constitution:
        "weather_main が damp でも、sub_labels に fluid_damp が無ければ『湿体質』『水分代謝が弱い体質』などと断定しないこと。",
      connect_to_symptom:
        "主訴がある場合は、その症状につながる響き方を短く自然に書くこと。",
      avoid_raw_codes:
        "体質コードや内部キーは出さず、ユーザー向け表現に変えること。",
      metaphor_note:
        "core.title はアプリ内の比喩タイトルであり、本文にはそのまま使わず体の反応として言い換えること。",
      no_free_reinterpretation:
        "東洋医学的にもっともらしくても、計算済みの主因を別要素へ変更しないこと。副因は表示されている場合だけ、主因に添える補助要素として使うこと。",
    },

    forecast_truth: primaryTriggerContract,

    constitution: {
      core: {
        code: coreCode,
        metaphor_title: core?.title || null,
        short: core?.short || null,
        tcm_hint: core?.tcm_hint || null,
      },
      sub_labels: subs.map((s) => ({
        code: s.code,
        title: s.title,
        short: s.short,
        action_hint: s.action_hint,
      })),
      symptom_focus: symptomFocus,
      symptom_focus_label: symptomFocus
        ? SYMPTOM_LABELS[symptomFocus] || symptomFocus
        : null,
      organ_focus: organFocus.map((code) => ({
        code,
        label: ORGAN_LABELS[code] || code,
      })),
      primary_meridian: primaryMeridianCode
        ? {
            code: primaryMeridianCode,
            title: primaryMeridian?.title || null,
            body_area: primaryMeridian?.body_area || null,
            meridians: primaryMeridian?.meridians || [],
            organs_hint: primaryMeridian?.organs_hint || null,
          }
        : null,
      secondary_meridian: secondaryMeridianCode
        ? {
            code: secondaryMeridianCode,
            title: secondaryMeridian?.title || null,
            body_area: secondaryMeridian?.body_area || null,
            meridians: secondaryMeridian?.meridians || [],
            organs_hint: secondaryMeridian?.organs_hint || null,
          }
        : null,
    },

    forecast: {
      score_0_10: riskContext?.target?.score_0_10 ?? null,
      signal_label: riskContext?.target?.signal_label || null,

      weather_main_trigger_exact: weatherMainExact,
      weather_main_trigger_label: mapTriggerLabel(weatherMainExact),
      weather_main_trigger_meaning: buildTriggerMeaning(weatherMainExact),

      personal_main_trigger_exact: personalMainExact,
      personal_main_trigger_label: mapTriggerLabel(personalMainExact),
      personal_main_trigger_meaning: buildPersonalTriggerMeaning(
        personalMainExact,
        subLabelCodes,
        coreCode,
        pressureResponseDirection
      ),
      personal_secondary_trigger_exact: personalSecondaryExact,
      personal_secondary_trigger_label: personalSecondaryExact
        ? mapTriggerLabel(personalSecondaryExact)
        : null,
      personal_secondary_trigger_meaning: personalSecondaryExact
        ? buildPersonalTriggerMeaning(personalSecondaryExact, subLabelCodes, coreCode, pressureResponseDirection)
        : null,
      trigger_factors: safeArray(riskContext?.summary?.trigger_factors),
      pressure_direction: riskContext?.summary?.pressure_direction || null,
      pressure_response_direction: pressureResponseDirection,
      reaction_direction: pressureResponseDirection,
      environmental_cautions: safeArray(riskContext?.summary?.environmental_cautions),
      manifestation_summary: riskContext?.summary?.manifestation_summary || null,
      material_ranking: safeArray(riskContext?.summary?.material_ranking),

      compat_main_trigger: riskContext?.summary?.main_trigger || null,
      compat_trigger_dir: riskContext?.summary?.trigger_dir || null,

      active_peak_start: riskContext?.summary?.peak_start || null,
      active_peak_end: riskContext?.summary?.peak_end || null,
      full_day_peak_start: riskContext?.summary?.full_day_peak_start || null,
      full_day_peak_end: riskContext?.summary?.full_day_peak_end || null,

      care_tone: riskContext?.care_tone || null,
      risk_factors: safeArray(riskContext?.risk_factors),
    },

    tcm_context: {
      primary_label: riskContext?.tcm_context?.primary_label || null,
      secondary_label: riskContext?.tcm_context?.secondary_label || null,
      primary_actions: safeArray(riskContext?.tcm_context?.primary_actions),
      secondary_actions: safeArray(riskContext?.tcm_context?.secondary_actions),
      need_abdomen: !!riskContext?.tcm_context?.need_abdomen,
      abdomen_choice: riskContext?.tcm_context?.abdomen_choice || null,
    },

    mtest_context: {
      selected_line: riskContext?.mtest_context?.selected_line || null,
      selected_from: riskContext?.mtest_context?.selected_from || null,
      mode: riskContext?.mtest_context?.mode || null,
      mode_reason: riskContext?.mtest_context?.mode_reason || null,
    },

    tsubo_set: {
      points:
        radarPlan?.tonight?.tsubo_set?.points?.map((p) => ({
          code: p.code,
          name_ja: p.name_ja,
          source: p.source,
          point_region: p.point_region,
        })) || [],
    },

    current_food_plan: radarPlan?.tomorrow_food || null,
  };
}
