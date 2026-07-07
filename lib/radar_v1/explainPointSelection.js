// lib/radar_v1/explainPointSelection.js
// v7.40: 明日タブ用ツボ説明。五臓名・経絡ライン名は画面上で体感語に翻訳する。
// Supabase の radar_tsubo_points は選穴マスターとして使い、
// 画面に出る文章はここで「明日の予報 × 今見ている不調 × ツボの役割」に翻訳する。

const ACTION_TARGETS = {
  tonify_qi: "体の起動の重さ",
  support_kidney: "足もと・腰腹まわりの冷え",
  strengthen_spleen: "胃腸まわりの重さ",
  transform_damp: "湿気を吸ったような重だるさ",
  move_blood: "こわばりや巡りにくさ",
  generate_fluids: "のど・目・肌のカサつき感",
  nourish_blood: "休みに入りにくい感じ",
  move_qi: "胸・首肩・気分の詰まり感",
  soothe_liver: "上にのぼる力みや緊張",
};

const ORGAN_TARGETS = {
  liver: "力みや巡りの滞り",
  spleen: "胃腸まわりの重さ",
  kidney: "足もと・腰腹まわりの冷えや重さ",
  lung: "のど・胸・呼吸まわりの乾き",
  heart: "眠りや落ち着きにくさ",
};

// 画面の小タグ用。専門語ではなく、ユーザーが体感しやすい言葉にする。
const ACTION_TCM_LABELS = {
  tonify_qi: "起動を支える",
  support_kidney: "足腰を支える",
  strengthen_spleen: "胃腸を支える",
  transform_damp: "重さを流す",
  move_blood: "巡りを動かす",
  generate_fluids: "うるおい",
  nourish_blood: "休む準備",
  move_qi: "詰まりを流す",
  soothe_liver: "力みを逃がす",
};

const ORGAN_TCM_LABELS = {
  liver: "力み・巡り",
  spleen: "胃腸",
  kidney: "足腰・土台",
  lung: "のど・胸",
  heart: "眠り・落ち着き",
};

// M-testのライン名は、画面では経絡名ではなく体感語に翻訳する。
const LINE_LABELS = {
  lung_li: "胸・首・腕の前側ライン",
  liver_gb: "体の側面・こめかみ・外ももライン",
  spleen_st: "胃腸・前もも・すねのライン",
  kidney_bl: "背中・腰・ふくらはぎライン",
  heart_si: "胸・肩甲骨・小指側ライン",
  pc_sj: "胸のつかえ・手首・首肩ライン",
};

const LINE_SHORT_LABELS = {
  lung_li: "胸・腕",
  liver_gb: "体側",
  spleen_st: "胃腸",
  kidney_bl: "背中・腰",
  heart_si: "胸・肩甲骨",
  pc_sj: "胸・手首",
};

const EXACT_TRIGGER_LABELS = {
  pressure_down: "気圧低下",
  pressure_up: "気圧上昇",
  cold: "冷え込み",
  heat: "気温上昇",
  damp: "湿気",
  dry: "乾燥",
};

const TOMORROW_WEATHER_TONE = {
  pressure_down: "頭・耳・首まわりにこもりが残りやすい見込み",
  pressure_up: "体が前のめりになって、肩・胸・こめかみに力が集まりやすい見込み",
  cold: "足もとや腰腹まわりから、こわばりが出やすい見込み",
  heat: "熱が上にこもって、頭や気分が忙しくなりやすい見込み",
  damp: "体に湿気の重い膜がかかるように、胃腸や足もとに重さが残りやすい見込み",
  dry: "のど・目・肌のカサつき感が、首肩や頭の疲れに変わりやすい見込み",
};

const SECONDARY_WEATHER_TONE = {
  pressure_down: "頭・耳・首まわりのこもり",
  pressure_up: "前のめりの力み",
  cold: "冷えからくるこわばり",
  heat: "上にこもる熱",
  damp: "湿気の重さ",
  dry: "のど・目・肌のカサつき感",
};

const SYMPTOM_BRIDGE = {
  headache: "頭だけでなく、首・耳・目まわりまで一緒に軽くしておきたい日です",
  neck_shoulder: "首本人を責めるより、肩甲骨・胸・手元から逃げ道を作りたい日です",
  low_back_pain: "腰だけでなく、足もと・お腹・骨盤まわりの土台を整えたい日です",
  dizziness: "急に動く前に、耳・首・足もとの落ち着きを作っておきたい日です",
  mood: "気分を直接上げるより、胸まわりや足もとの力みをほどきたい日です",
  sleep: "眠る努力より、胸・首肩・手足の力を抜くきっかけを作りたい日です",
  digestion: "胃腸まわりの交通整理を、今夜のうちに少し済ませておきたい日です",
  fatigue: "だるさを気合いで押すより、体の起動を足もとから支えたい日です",
  swelling: "足もとやお腹に残る水分の重さを、強く押さずに流したい日です",
};

const POINT_ROLE_COPY = {
  CV12: "お腹の中央から、胃腸の交通整理をしたい時に使いやすい",
  CV6: "下腹部から、体の土台と腰腹まわりを支えたい時に使いやすい",
  GB20: "首のつけ根から、頭・耳まわりのこもりを逃がしたい時に使いやすい",
  GB34: "体の側面や肩まわりの詰まりを、足から流したい時に使いやすい",
  GV20: "頭の上に集まった緊張を、ふわっとゆるめたい時に使いやすい",
  HT7: "眠りや気持ちの落ち着きに向けて、手元から力を抜きたい時に使いやすい",
  KI1: "頭に上がった感じを、足もとへ下ろしたい時に使いやすい",
  KI3: "足もと・腰腹まわりの冷えや消耗感を支えたい時に使いやすい",
  LI4: "手元から、首肩・頭まわりの出口を作りたい時に使いやすい",
  LI11: "熱や湿気の重さを、腕から軽く逃がしたい時に使いやすい",
  LR2: "上にのぼる熱やイライラ感を、足から少し沈めたい時に使いやすい",
  LR3: "足もとから、気分・首肩・頭まわりの巡りをゆるめたい時に使いやすい",
  LU7: "首すじ・胸まわりの通りを、手首から作りたい時に使いやすい",
  LU9: "手首から、呼吸や首肩まわりのこわばりをやさしく整えたい時に使いやすい",
  PC6: "胸まわり・胃のつかえ・気分のざわつきを、手首からほどきたい時に使いやすい",
  SI3: "首肩から背中にかけてのこわばりを、手元から逃がしたい時に使いやすい",
  SP6: "足もとから、冷え・乾き・胃腸まわりをまとめて整えたい時に使いやすい",
  ST36: "体の起動と胃腸まわりを、足から支えたい時に使いやすい",
  TE3: "手の甲から、首肩・頭まわりの詰まりをほどきたい時に使いやすい",
};

const REGION_ROLE_COPY = {
  abdomen: "お腹まわりから、翌朝に残る重さを軽くしたい時に使いやすい",
  head_neck: "頭・首まわりに集まった重さを逃がしたい時に使いやすい",
  limb: "手足から、体の重さやこわばりをほどきたい時に使いやすい",
};

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function intersect(a, b) {
  const setB = new Set(safeArray(b));
  return safeArray(a).filter((x) => setB.has(x));
}

function joinJa(items) {
  const arr = uniq(items);
  if (!arr.length) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]}や${arr[1]}`;
  return `${arr.slice(0, -1).join("・")}や${arr[arr.length - 1]}`;
}

function targetCodesToLabels(codes, map) {
  return uniq(safeArray(codes).map((x) => map[x] || null));
}

function exactTriggerLabel(exact) {
  return EXACT_TRIGGER_LABELS[exact] || null;
}

function getTriggerLabel(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "気圧低下";
  if (mainTrigger === "pressure" && triggerDir === "up") return "気圧上昇";
  if (mainTrigger === "temp" && triggerDir === "down") return "冷え込み";
  if (mainTrigger === "temp" && triggerDir === "up") return "気温上昇";
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿気";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

function buildActionTargetPhrase(actionCodes) {
  const labels = targetCodesToLabels(actionCodes, ACTION_TARGETS).slice(0, 2);
  return joinJa(labels);
}

function buildOrganTargetPhrase(organCodes) {
  const labels = targetCodesToLabels(organCodes, ORGAN_TARGETS).slice(0, 2);
  return joinJa(labels);
}

function buildTargetPhrase({ actionMatches, organMatches }) {
  const actionPhrase = buildActionTargetPhrase(actionMatches);
  if (actionPhrase) return actionPhrase;
  return buildOrganTargetPhrase(organMatches);
}

function getTcmSymptomFocus(tcmContext, riskContext = null) {
  return (
    tcmContext?.meta?.symptom_focus ||
    riskContext?.constitution_context?.symptom_focus ||
    null
  );
}

function getPrimaryExact(point, tcmContext, riskContext = null) {
  return (
    point?.care_trigger_exact ||
    tcmContext?.meta?.exact_trigger ||
    tcmContext?.meta?.personal_main_trigger_exact ||
    riskContext?.summary?.main_trigger_exact ||
    riskContext?.summary?.personal_main_trigger_exact ||
    null
  );
}

function getWeatherTone(exact) {
  return TOMORROW_WEATHER_TONE[exact] || "天気の変化で、いつもの弱いところに少し出やすい見込み";
}

function getPointRoleCopy(point) {
  const code = String(point?.code || "").toUpperCase();
  return (
    POINT_ROLE_COPY[code] ||
    REGION_ROLE_COPY[point?.point_region] ||
    "短時間で触れやすい"
  );
}

function buildAbdomenRoleSummary(point) {
  if (point?.code === "CV12") {
    return "明日の胃腸の重さを残しすぎないよう、今夜のうちにお腹の交通整理をするツボです";
  }
  if (point?.code === "CV6") {
    return "明日の冷えや腰腹まわりの重さを残しすぎないよう、今夜のうちに下腹部を支えるツボです";
  }
  return "明日の朝に残りやすいお腹の重さを、今夜のうちに軽く整えるツボです";
}

function buildTcmRoleSummary(point, tcmContext, riskContext = null) {
  const exact = getPrimaryExact(point, tcmContext, riskContext);
  const weatherLabel = exactTriggerLabel(exact);
  const pointRole = getPointRoleCopy(point);

  if (point?.care_trigger_role === "secondary") {
    const subTone = SECONDARY_WEATHER_TONE[exact] || "重なりやすい負担";
    return `${subTone}も見て、明日の朝に残しにくくするツボです`;
  }

  if (tcmContext?.need_abdomen && point?.code && point.code === tcmContext.abdomen_choice) {
    return buildAbdomenRoleSummary(point);
  }

  if (point?.point_region === "abdomen") {
    return buildAbdomenRoleSummary(point);
  }

  if (weatherLabel) {
    return `${weatherLabel}で出やすい重さやこわばりを、${pointRole}ツボです`;
  }

  return `明日の天気で出やすい重さやこわばりを、${pointRole}ツボです`;
}

function buildTcmSelectionReason(point, tcmContext, riskContext = null) {
  const exact = getPrimaryExact(point, tcmContext, riskContext);
  const weatherTone = getWeatherTone(exact);
  const weatherLabel = exactTriggerLabel(exact);
  const symptomFocus = getTcmSymptomFocus(tcmContext, riskContext);
  const symptomTone = SYMPTOM_BRIDGE[symptomFocus] || "今見ている不調を、強くなる前に軽く整えておきたい日です";
  const pointRole = getPointRoleCopy(point);

  if (tcmContext?.need_abdomen && point?.code && point.code === tcmContext.abdomen_choice) {
    if (point.code === "CV12") {
      return `明日は、湿気や食後の重さが胃腸まわりに残りやすい見込みです。中脘はお腹の中央から“胃腸の交通整理”をしたい時に使いやすいツボなので、今夜のうちに食後の重さを持ち越しにくくする候補にしています。`;
    }
    if (point.code === "CV6") {
      return `明日は、冷えやだるさが腰腹まわりに残りやすい見込みです。気海は下腹部から体の土台を支えたい時に使いやすいツボなので、今夜のうちに冷えや重さを持ち越しにくくする候補にしています。`;
    }
    return `明日は、お腹まわりの冷えや重さが残りやすい見込みです。今夜のうちに腹部を軽くゆるめ、翌朝に重さを持ち越しにくくする候補として選んでいます。`;
  }

  const primaryActions = safeArray(tcmContext?.primary_actions);
  const secondaryActions = safeArray(tcmContext?.secondary_actions);
  const targetOrgans = safeArray(tcmContext?.organ_focus);

  const pointActions = safeArray(point?.tcm_actions);
  const pointOrgans = safeArray(point?.organ_focus);

  const primaryActionMatches = intersect(pointActions, primaryActions);
  const secondaryActionMatches = intersect(pointActions, secondaryActions);
  const organMatches = intersect(pointOrgans, targetOrgans);

  const primaryTargetPhrase = buildTargetPhrase({
    actionMatches: primaryActionMatches,
    organMatches,
  });
  const secondaryTargetPhrase = buildTargetPhrase({
    actionMatches: secondaryActionMatches,
    organMatches,
  });

  if (point?.care_trigger_role === "secondary" && weatherLabel) {
    const phrase = secondaryTargetPhrase || primaryTargetPhrase || "重さやこわばり";
    return `明日は主な天気に加えて、${weatherLabel}の影響も少し重なる見込みです。${phrase}を翌朝に残しにくくするため、${point?.name_ja || "このツボ"}を補助の候補にしています。`;
  }

  const targetLine = primaryTargetPhrase
    ? `${primaryTargetPhrase}を翌朝に残しにくくしたい日です。`
    : "";

  return `明日は、${weatherTone}。${symptomTone}${targetLine ? ` ${targetLine}` : ""}${point?.name_ja || "このツボ"}は${pointRole}ツボなので、今夜のうちに短く触れる候補にしています。`;
}

function buildTcmMatchTags(point, tcmContext, riskContext = null) {
  const tags = [];
  const exact = getPrimaryExact(point, tcmContext, riskContext);
  const careTriggerLabel = exactTriggerLabel(exact);
  const symptomFocus = getTcmSymptomFocus(tcmContext, riskContext);

  if (careTriggerLabel) {
    tags.push(point?.care_trigger_role === "secondary" ? `${careTriggerLabel}:副因` : careTriggerLabel);
  }

  if (symptomFocus) {
    tags.push(`不調:${symptomFocus}`);
  }

  if (tcmContext?.need_abdomen && point?.code && point.code === tcmContext.abdomen_choice) {
    tags.push("腹部優先");
  }

  const primaryActionMatches = intersect(
    safeArray(point?.tcm_actions),
    safeArray(tcmContext?.primary_actions)
  );
  const organMatches = intersect(
    safeArray(point?.organ_focus),
    safeArray(tcmContext?.organ_focus)
  );

  targetCodesToLabels(primaryActionMatches, ACTION_TCM_LABELS)
    .slice(0, 1)
    .forEach((x) => tags.push(x));

  targetCodesToLabels(organMatches, ORGAN_TCM_LABELS)
    .slice(0, 1)
    .forEach((x) => tags.push(x));

  return uniq(tags).slice(0, 3);
}

function buildMtestRoleSummary(mtestContext, riskContext = null) {
  const lineCode = mtestContext?.selected_line;
  const lineLabel = LINE_LABELS[lineCode] || "負担が出やすいライン";
  if (mtestContext?.mode === "mother") {
    return `${lineLabel}を、明日の動き出し前に軽く支えるツボです`;
  }
  return `${lineLabel}の張りや引っかかりを、今夜のうちに軽くゆるめるツボです`;
}

function buildMtestSelectionReason(riskContext, tsuboMeta) {
  const lineCode = tsuboMeta?.selected_line || riskContext?.mtest_context?.selected_line;
  const lineLabel = LINE_LABELS[lineCode] || "負担が出やすいライン";

  const mode = tsuboMeta?.mother_child_mode || riskContext?.mtest_context?.mode;
  const triggerLabel = getTriggerLabel(
    riskContext?.summary?.main_trigger,
    riskContext?.summary?.trigger_dir
  );

  const exact = riskContext?.summary?.main_trigger_exact || riskContext?.summary?.personal_main_trigger_exact;
  const weatherTone = getWeatherTone(exact);
  const symptomFocus = riskContext?.constitution_context?.symptom_focus || null;
  const symptomTone = SYMPTOM_BRIDGE[symptomFocus] || "今見ている不調を、強くなる前に軽く整えておきたい日です";

  if (mode === "mother") {
    return `明日は${triggerLabel}で、${weatherTone}。${symptomTone} ${lineLabel}を今夜のうちに軽く支えて、明日の動き出しを少し楽にする目的で選んでいます。`;
  }

  return `明日は${triggerLabel}で、${lineLabel}に張りや動き出しの引っかかりが残りやすい見込みです。こわばりを持ち越しにくくするため、今夜のうちに短く触れる候補にしています。`;
}

function buildMtestMatchTags(riskContext, tsuboMeta) {
  const lineCode = tsuboMeta?.selected_line || riskContext?.mtest_context?.selected_line;
  const lineLabel = LINE_SHORT_LABELS[lineCode] || LINE_LABELS[lineCode] || null;
  const triggerLabel = getTriggerLabel(
    riskContext?.summary?.main_trigger,
    riskContext?.summary?.trigger_dir
  );

  const mode = tsuboMeta?.mother_child_mode || riskContext?.mtest_context?.mode;
  const modeLabel = mode === "mother" ? "支える" : "ゆるめる";

  return uniq([lineLabel || lineCode, triggerLabel, modeLabel]).slice(0, 3);
}

function explainTcmPoint({ point, riskContext }) {
  const tcmContext = riskContext?.tcm_context || null;

  return {
    role_summary: buildTcmRoleSummary(point, tcmContext, riskContext),
    selection_reason: buildTcmSelectionReason(point, tcmContext, riskContext),
    match_tags: buildTcmMatchTags(point, tcmContext, riskContext),
  };
}

function explainMtestPoint({ riskContext, tsuboMeta }) {
  const mtestContext = riskContext?.mtest_context || null;

  return {
    role_summary: buildMtestRoleSummary(mtestContext, riskContext),
    selection_reason: buildMtestSelectionReason(riskContext, tsuboMeta),
    match_tags: buildMtestMatchTags(riskContext, tsuboMeta),
  };
}

export function explainPointSelection({
  point,
  riskContext,
  tsuboMeta = null,
}) {
  if (!point || !riskContext) return null;

  if (point.source === "mtest") {
    return explainMtestPoint({
      point,
      riskContext,
      tsuboMeta,
    });
  }

  return explainTcmPoint({
    point,
    riskContext,
  });
}
