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
  cold: "冷え",
  heat: "暑さ",
  damp: "湿",
  dry: "乾燥",
  none: "大きな変化なし",
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
      return "外的な変化としては、冷えや冷え込み方向が目立つ。";
    case "heat":
      return "外的な変化としては、暑さや熱のこもり方向が目立つ。";
    case "damp":
      return "外的な変化としては、湿っぽさや重さが目立つ。";
    case "dry":
      return "外的な変化としては、乾きやすさが目立つ。";
    default:
      return "外的な変化は比較的小さい。";
  }
}

function buildPersonalTriggerMeaning(exact, subCodes, coreCode) {
  const has = (code) => subCodes.includes(code);

  switch (exact) {
    case "pressure_down":
      if (has("qi_stagnation")) {
        return "本人には、気圧低下が詰まり感や張りを強める方向で響きやすい。";
      }
      if (coreCode?.includes("batt_small")) {
        return "本人には、気圧低下が余力低下や不安定さとして響きやすい。";
      }
      return "本人には、気圧低下がぶれとして響きやすい。";

    case "pressure_up":
      if (has("qi_stagnation")) {
        return "本人には、気圧上昇が張りつめ感として響きやすい。";
      }
      return "本人には、気圧上昇が力みやすさとして響きやすい。";

    case "cold":
      if (has("blood_deficiency")) {
        return "本人には、冷えがこわばりや回復しにくさとして響きやすい。";
      }
      if (has("qi_deficiency")) {
        return "本人には、冷えがだるさや支えの弱さとして響きやすい。";
      }
      return "本人には、冷えが負担として響きやすい。";

    case "heat":
      if (has("fluid_deficiency")) {
        return "本人には、暑さが乾きやのぼせとして響きやすい。";
      }
      if (has("qi_stagnation")) {
        return "本人には、暑さが詰まりやいら立ちとして響きやすい。";
      }
      return "本人には、暑さがこもりとして響きやすい。";

    case "damp":
      if (has("fluid_damp")) {
        return "本人には、湿が重だるさや頭重感として響きやすい。";
      }
      if (has("qi_deficiency")) {
        return "本人には、湿がだるさや重さとして響きやすい。";
      }
      if (has("blood_deficiency") || has("qi_stagnation")) {
        return "本人には、湿が巡りの鈍さや重さを上乗せする形で響きやすい。";
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
      lead_day_phrase: "target_date_label は",
      care_reference: "前夜は",
      second_sentence_scope:
        "2文目は target_date に対する前夜の過ごし方・先回りの意識を書く。",
    };
  }

  if (relativeTargetMode === "today") {
    return {
      lead_day_phrase: "target_date_label は",
      care_reference: "この日は",
      second_sentence_scope:
        "2文目は当日朝に限定せず、その日を通して意識したい過ごし方を書く。",
    };
  }

  return {
    lead_day_phrase: "target_date_label は",
    care_reference: "この日は",
    second_sentence_scope:
      "2文目は対象日に対して自然な時間軸で書く。",
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
      care_reference: timeGuidance.care_reference,
      second_sentence_scope: timeGuidance.second_sentence_scope,
      writing_rule:
        "原則として『今日は』『明日は』『今夜は』を避け、対象日は target_date_label で明示する。2文目は care_reference に従う。",
    },

    explanation_rules: {
      must_separate_weather_and_personal:
        "天気として強い変化と、本人に一番響きやすい要素は分けて考えること。",
      do_not_overclaim_constitution:
        "weather_main が damp でも、sub_labels に fluid_damp が無ければ『湿体質』『水分代謝が弱い体質』などと断定しないこと。",
      connect_to_symptom:
        "主訴がある場合は、その症状につながる響き方を短く自然に書くこと。",
      avoid_raw_codes:
        "体質コードや内部キーは出さず、ユーザー向け表現に変えること。",
      avoid_relative_day_words:
        "相対表現の『今日は』『明日は』『今夜は』は原則避けること。",
    },

    constitution: {
      core: {
        code: coreCode,
        title: core?.title || null,
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
