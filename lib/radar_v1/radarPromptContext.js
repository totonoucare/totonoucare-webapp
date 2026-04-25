// lib/radar_v1/radarPromptContext.js
import {
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
  SYMPTOM_LABELS,
} from "@/lib/diagnosis/v2/labels";

const ORGAN_LABELS = {
  liver: "肝",
  spleen: "脾",
  kidney: "腎",
};

const EXACT_TRIGGER_LABELS = {
  pressure_down: "気圧低下",
  pressure_up: "気圧上昇",
  cold: "冷え込み",
  heat: "気温上昇",
  damp: "湿",
  dry: "乾燥",
  none: "大きな変化なし",
};

const PRIMARY_TRIGGER_CONTRACT = {
  pressure_down: {
    anchor_phrase: "気圧低下",
    main_effect: "外側の気圧低下をきっかけに、重さ・だるさ・巡りの停滞が出やすい",
    allowed_sub_effects: ["重だるさ", "むくみ感", "頭重感", "巡りの停滞", "気分の沈み"],
    forbidden_primary_phrases: ["気圧上昇を主因にする", "暑さを主因にする", "乾燥を主因にする"],
  },
  pressure_up: {
    anchor_phrase: "気圧上昇",
    main_effect: "外側の気圧上昇をきっかけに、張りつめ・上がりやすさ・力みが出やすい",
    allowed_sub_effects: ["張りつめ", "力み", "上がりやすさ", "いら立ち", "こもり感"],
    forbidden_primary_phrases: ["気圧低下を主因にする", "冷え込みを主因にする", "湿を主因にする"],
  },
  cold: {
    anchor_phrase: "冷え込み",
    main_effect: "外側の冷え込みをきっかけに、体が縮こまり、巡りや動き出しが鈍りやすい",
    allowed_sub_effects: ["こわばり", "重だるさ", "動き出しにくさ", "巡りの鈍さ", "支えの弱さ"],
    forbidden_primary_phrases: ["暑さを主因にする", "気温上昇を主因にする", "熱こもりを主因にする"],
  },
  heat: {
    anchor_phrase: "気温上昇",
    main_effect: "外側の気温上昇をきっかけに、内側に熱っぽさがこもり、張りつめや上がりやすさが出やすい",
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
      return "外的な変化としては、気圧が上がる方向の張りが目立つ。";
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

function buildPrimaryTriggerContract(exact, riskContext) {
  const base = PRIMARY_TRIGGER_CONTRACT[exact] || PRIMARY_TRIGGER_CONTRACT.none;
  const label = mapTriggerLabel(exact);
  const start = riskContext?.summary?.peak_start || null;
  const end = riskContext?.summary?.peak_end || null;

  return {
    primary_exact: exact || "none",
    primary_label: label,
    anchor_phrase: base.anchor_phrase,
    main_effect: base.main_effect,
    peak_time: start && end ? `${start}-${end}` : null,
    allowed_sub_effects: base.allowed_sub_effects,
    forbidden_primary_phrases: base.forbidden_primary_phrases,
    rule: "文章の主因は必ず forecast.personal_main_trigger_exact / this_contract.primary_exact に合わせる。weather_main_trigger_exact や tcm_context は補助情報であり、主因を上書きしない。",
  };
}

function buildPersonalTriggerMeaning(exact, subCodes, coreCode) {
  const has = (code) => subCodes.includes(code);

  switch (exact) {
    case "pressure_down":
      if (has("fluid_damp")) {
        return "本人には、気圧低下が重だるさやむくみ感を強める方向で響きやすい。";
      }
      if (has("qi_deficiency")) {
        return "本人には、気圧低下がだるさや支えの弱さとして響きやすい。";
      }
      if (has("blood_stasis") || has("qi_stagnation")) {
        return "本人には、気圧低下の揺れが張りやつらさの居座りにつながりやすい。";
      }
      return coreCode?.startsWith("brake")
        ? "本人には、気圧低下が重さや停滞感として響きやすい。"
        : "本人には、気圧低下がぶれとして響きやすい。";

    case "pressure_up":
      if (has("qi_stagnation")) {
        return "本人には、気圧上昇が張りつめ感や上がりやすさとして響きやすい。";
      }
      if (has("fluid_deficiency")) {
        return "本人には、気圧上昇がこもり感や乾きの出やすさとして響きやすい。";
      }
      return "本人には、気圧上昇が力みやすさとして響きやすい。";

    case "cold":
      if (has("qi_deficiency")) {
        return "本人には、冷え込みがだるさや支えの弱さとして響きやすい。";
      }
      if (has("blood_deficiency") || has("blood_stasis")) {
        return "本人には、冷え込みがこわばりや巡りの鈍さとして響きやすい。";
      }
      return "本人には、冷え込みが負担として響きやすい。";

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
  if (relativeTargetMode === "tomorrow") {
    return {
      lead_day_phrase: "target_date_labelは",
      second_item_phrase: "今夜は",
      third_item_phrase: "明日は",
      sentence_scope:
        "1項目目は対象日の見立て、2項目目は前夜の備え、3項目目は対象日当日の過ごし方を書く。",
      writing_rule:
        "tomorrow では 1項目目だけ target_date_label を使い、2項目目は『今夜は』、3項目目は『明日は』または『日中は』で始める。",
    };
  }

  return {
    lead_day_phrase: "target_date_labelは",
    second_item_phrase: "この日は",
    third_item_phrase: null,
    sentence_scope:
      "1項目目は対象日の見立て、2項目目はその日全体の過ごし方を書く。",
    writing_rule:
      "today では 1項目目だけ target_date_label を使い、2項目目は『この日は』または『日中は』で始める。",
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

  const timeGuidance = buildTimeGuidance(relativeTargetMode);
  const primaryTriggerContract = buildPrimaryTriggerContract(
    personalMainExact,
    riskContext
  );

  return {
    app_context: {
      app_name: "未病レーダー",
      app_purpose:
        "気象と体質の重なりから、今日または明日の崩れやすさと先回りセルフケアを提案するアプリ。",
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
        "文章の主因は必ず forecast.personal_main_trigger_exact に合わせること。weather_main_trigger_exact、tcm_context、sub_labels は補助情報であり、主因を上書きしない。",
      must_separate_weather_and_personal:
        "天気として強い変化と、本人に一番響きやすい要素は分けて考えること。",
      do_not_overclaim_constitution:
        "weather_main が damp でも、sub_labels に fluid_damp が無ければ『湿体質』『水分代謝が弱い体質』などと断定しないこと。",
      connect_to_symptom:
        "主訴がある場合は、その症状につながる響き方を短く自然に書くこと。",
      avoid_raw_codes:
        "体質コードや内部キーは出さず、ユーザー向け表現に変えること。",
      metaphor_note:
        "core.title はアプリ内の比喩タイトルであり、本文にはそのまま使わず体の反応として言い換えること。",
      no_free_reinterpretation:
        "東洋医学的にもっともらしくても、計算済みの主因と矛盾する気象要素を主役にしないこと。",
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
        coreCode
      ),

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

