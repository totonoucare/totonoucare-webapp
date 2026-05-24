// lib/radar_v1/explainPointSelection.js

const ACTION_TARGETS = {
  tonify_qi: "疲れやすさ",
  support_kidney: "腰腹まわりの冷え",
  strengthen_spleen: "食後の重さ",
  transform_damp: "重だるさ・むくみ",
  move_blood: "こわばり",
  generate_fluids: "乾きやほてり",
  nourish_blood: "休みに入りにくい感じ",
  move_qi: "張りや詰まり感",
  soothe_liver: "緊張や力み",
};

const ORGAN_TARGETS = {
  liver: "緊張や巡りの滞り",
  spleen: "食後の重さやだるさ",
  kidney: "腰腹まわりの冷えや重さ",
  lung: "乾きや呼吸の浅さ",
  heart: "眠りや落ち着きにくさ",
};

const ACTION_TCM_LABELS = {
  tonify_qi: "補気",
  support_kidney: "補腎",
  strengthen_spleen: "健脾",
  transform_damp: "化湿",
  move_blood: "活血",
  generate_fluids: "生津",
  nourish_blood: "養血",
  move_qi: "理気",
  soothe_liver: "疏肝",
};

const ORGAN_TCM_LABELS = {
  liver: "肝",
  spleen: "脾",
  kidney: "腎",
  lung: "肺",
  heart: "心",
};

const LINE_LABELS = {
  lung_li: "肺・大腸ライン",
  liver_gb: "肝・胆ライン",
  spleen_st: "脾・胃ライン",
  kidney_bl: "腎・膀胱ライン",
  heart_si: "心・小腸ライン",
  pc_sj: "心包・三焦ライン",
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
  if (exact === "pressure_down") return "気圧低下";
  if (exact === "pressure_up") return "気圧上昇";
  if (exact === "cold") return "冷え込み";
  if (exact === "heat") return "気温上昇";
  if (exact === "damp") return "湿気";
  if (exact === "dry") return "乾燥";
  return null;
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

function buildAbdomenRoleSummary(point) {
  if (point?.code === "CV12") {
    return "食後の重さを翌朝に残しにくくするため、今夜のうちにお腹の中央を軽く整えるツボです";
  }
  if (point?.code === "CV6") {
    return "腰腹まわりの冷えやだるさを持ち越しにくくするため、今夜のうちに下腹部を軽く整えるツボです";
  }
  return "翌朝に残りやすいお腹の重さを、今夜のうちに軽く整えるツボです";
}

function buildTcmRoleSummary(point, tcmContext) {
  if (point?.care_trigger_role === "secondary") {
    return "重なりやすい負担も見て、翌朝に残しにくくするツボです";
  }
  if (tcmContext?.need_abdomen && point?.code && point.code === tcmContext.abdomen_choice) {
    return buildAbdomenRoleSummary(point);
  }

  if (point?.point_region === "abdomen") {
    return buildAbdomenRoleSummary(point);
  }

  return "明日の天気で出やすい重さやこわばりを、今夜のうちに整えるツボです";
}

function buildTcmSelectionReason(point, tcmContext) {
  const careTriggerLabel = exactTriggerLabel(point?.care_trigger_exact);
  const primaryActions = safeArray(tcmContext?.primary_actions);
  const secondaryActions = safeArray(tcmContext?.secondary_actions);
  const targetOrgans = safeArray(tcmContext?.organ_focus);

  const pointActions = safeArray(point?.tcm_actions);
  const pointOrgans = safeArray(point?.organ_focus);

  const primaryActionMatches = intersect(pointActions, primaryActions);
  const secondaryActionMatches = intersect(pointActions, secondaryActions);
  const organMatches = intersect(pointOrgans, targetOrgans);

  if (tcmContext?.need_abdomen && point?.code && point.code === tcmContext.abdomen_choice) {
    if (point.code === "CV12") {
      return "明日は湿気や食後の重さが残りやすい見込みです。中脘はお腹の中央から胃腸まわりを軽くゆるめるツボなので、今夜のうちに食後の重さを持ち越しにくくする準備として選んでいます。";
    }
    if (point.code === "CV6") {
      return "明日は冷えやだるさが腰腹まわりに残りやすい見込みです。気海は下腹部を軽くゆるめるツボなので、今夜のうちに冷えや重さを持ち越しにくくする準備として選んでいます。";
    }
    return "明日は、お腹まわりの冷えや重さが残りやすい見込みです。今夜のうちに腹部を軽くゆるめ、翌朝に重さを持ち越しにくくするために選んでいます。";
  }

  const primaryTargetPhrase = buildTargetPhrase({
    actionMatches: primaryActionMatches,
    organMatches,
  });
  const secondaryTargetPhrase = buildTargetPhrase({
    actionMatches: secondaryActionMatches,
    organMatches,
  });

  if (point?.care_trigger_role === "secondary" && careTriggerLabel) {
    const phrase = secondaryTargetPhrase || primaryTargetPhrase;
    if (phrase) {
      return `明日は${careTriggerLabel}の影響も少し重なる見込みです。${phrase}を翌朝に残しにくくするために、このツボを選んでいます。`;
    }
    return `明日は${careTriggerLabel}の影響も少し重なる見込みです。重さやこわばりを翌朝に残しにくくするために、このツボを選んでいます。`;
  }

  if (primaryTargetPhrase) {
    return `${primaryTargetPhrase}を翌朝に残しにくくするために、このツボを選んでいます。`;
  }

  if (secondaryTargetPhrase) {
    return `${secondaryTargetPhrase}も翌朝に残しにくくするために、このツボを選んでいます。`;
  }

  return "明日の天気で出やすい重さやこわばりを、今夜のうちに整えやすいツボとして選んでいます。";
}

function buildTcmMatchTags(point, tcmContext) {
  // 画面には出さない内部確認用タグ。
  // ユーザー向け説明は selection_reason に集約し、ここは管理しやすい東洋医学語に寄せる。
  const tags = [];
  const careTriggerLabel = exactTriggerLabel(point?.care_trigger_exact);

  if (point?.care_trigger_role === "secondary" && careTriggerLabel) {
    tags.push(`${careTriggerLabel}:secondary`);
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
    .slice(0, 2)
    .forEach((x) => tags.push(x));

  targetCodesToLabels(organMatches, ORGAN_TCM_LABELS)
    .slice(0, 2)
    .forEach((x) => tags.push(x));

  return uniq(tags).slice(0, 3);
}

function buildMtestRoleSummary(mtestContext) {
  if (mtestContext?.mode === "mother") {
    return "動き出しで負担が出やすいラインを、今夜のうちに軽く整えるツボです";
  }
  return "張りや引っかかりが出やすいラインを、今夜のうちに軽くゆるめるツボです";
}

function buildMtestSelectionReason(riskContext, tsuboMeta) {
  const lineCode = tsuboMeta?.selected_line || riskContext?.mtest_context?.selected_line;
  const lineLabel = LINE_LABELS[lineCode] || "負担が出やすいライン";

  const mode = tsuboMeta?.mother_child_mode || riskContext?.mtest_context?.mode;
  const triggerLabel = getTriggerLabel(
    riskContext?.summary?.main_trigger,
    riskContext?.summary?.trigger_dir
  );

  if (mode === "mother") {
    return `明日は${triggerLabel}で、${lineLabel}にこわばりや動き出しの重さが出やすい見込みです。このツボは、そのラインを今夜のうちに軽く整える目的で選んでいます。`;
  }

  return `明日は${triggerLabel}で、${lineLabel}に張りや動き出しの引っかかりが残りやすい見込みです。このツボは、こわばりを持ち越しにくくする目的で選んでいます。`;
}

function buildMtestMatchTags(riskContext, tsuboMeta) {
  const lineCode = tsuboMeta?.selected_line || riskContext?.mtest_context?.selected_line;
  const lineLabel = LINE_LABELS[lineCode] || null;
  const triggerLabel = getTriggerLabel(
    riskContext?.summary?.main_trigger,
    riskContext?.summary?.trigger_dir
  );

  const mode = tsuboMeta?.mother_child_mode || riskContext?.mtest_context?.mode;
  const modeLabel = mode === "mother" ? "mother" : "child";

  return uniq([lineCode, triggerLabel, modeLabel]).slice(0, 3);
}

function explainTcmPoint({ point, riskContext }) {
  const tcmContext = riskContext?.tcm_context || null;

  return {
    role_summary: buildTcmRoleSummary(point, tcmContext),
    selection_reason: buildTcmSelectionReason(point, tcmContext),
    match_tags: buildTcmMatchTags(point, tcmContext),
  };
}

function explainMtestPoint({ riskContext, tsuboMeta }) {
  const mtestContext = riskContext?.mtest_context || null;

  return {
    role_summary: buildMtestRoleSummary(mtestContext),
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

