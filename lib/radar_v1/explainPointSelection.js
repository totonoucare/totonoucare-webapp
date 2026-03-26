// lib/radar_v1/explainPointSelection.js

const ACTION_LABELS = {
  tonify_qi: "気を補う",
  support_kidney: "腎を支える",
  generate_fluids: "うるおいを補う",
  nourish_blood: "血を補う",
  move_qi: "巡りを動かす",
  soothe_liver: "張りをゆるめる",
};

const ORGAN_LABELS = {
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
  return arr.join("・");
}

function actionCodesToLabels(codes) {
  return uniq(safeArray(codes).map((x) => ACTION_LABELS[x] || null));
}

function organCodesToLabels(codes) {
  return uniq(safeArray(codes).map((x) => ORGAN_LABELS[x] || x));
}

function getTriggerLabel(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "気圧低下";
  if (mainTrigger === "pressure" && triggerDir === "up") return "気圧上昇";
  if (mainTrigger === "temp" && triggerDir === "down") return "冷え";
  if (mainTrigger === "temp" && triggerDir === "up") return "暑さ";
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

function buildActionPhrase(actionCodes) {
  const labels = actionCodesToLabels(actionCodes).slice(0, 2);
  return joinJa(labels);
}

function buildOrganPhrase(organCodes) {
  const labels = organCodesToLabels(organCodes).slice(0, 2);
  return joinJa(labels);
}

function buildTcmRoleSummary(point, tcmContext) {
  if (tcmContext?.need_abdomen && point?.code && point.code === tcmContext.abdomen_choice) {
    return "土台を整えて、支えを作る軸";
  }

  if (point?.point_region === "abdomen") {
    return "土台を整えて、支えを作る軸";
  }

  return "体質の偏りを整える軸";
}

function buildTcmSelectionReason(point, tcmContext) {
  const primaryActions = safeArray(tcmContext?.primary_actions);
  const secondaryActions = safeArray(tcmContext?.secondary_actions);
  const targetOrgans = safeArray(tcmContext?.organ_focus);

  const pointActions = safeArray(point?.tcm_actions);
  const pointOrgans = safeArray(point?.organ_focus);

  const primaryActionMatches = intersect(pointActions, primaryActions);
  const secondaryActionMatches = intersect(pointActions, secondaryActions);
  const organMatches = intersect(pointOrgans, targetOrgans);

  if (tcmContext?.need_abdomen && point?.code && point.code === tcmContext.abdomen_choice) {
    return "土台の支えを先に整えたい日なので、まず腹部から全体の余力を支える目的で選んでいます。";
  }

  const primaryActionPhrase = buildActionPhrase(primaryActionMatches);
  const secondaryActionPhrase = buildActionPhrase(secondaryActionMatches);
  const organPhrase = buildOrganPhrase(organMatches);

  if (primaryActionPhrase && organPhrase) {
    return `${primaryActionPhrase}方向と、${organPhrase}を支える方向が今日の整え方に合うため選んでいます。`;
  }

  if (primaryActionPhrase) {
    return `${primaryActionPhrase}方向が今日の体質ケアに合うため選んでいます。`;
  }

  if (organPhrase) {
    return `${organPhrase}の負担を整える方向が今日の体質ケアに合うため選んでいます。`;
  }

  if (secondaryActionPhrase) {
    return `${secondaryActionPhrase}方向が今日の補助的な整え方に合うため選んでいます。`;
  }

  return "今日の体質ケアの方向に合うため選んでいます。";
}

function buildTcmMatchTags(point, tcmContext) {
  const tags = [];

  if (tcmContext?.need_abdomen && point?.code && point.code === tcmContext.abdomen_choice) {
    tags.push("腹部から整える");
  }

  const primaryActionMatches = intersect(
    safeArray(point?.tcm_actions),
    safeArray(tcmContext?.primary_actions)
  );
  const organMatches = intersect(
    safeArray(point?.organ_focus),
    safeArray(tcmContext?.organ_focus)
  );

  actionCodesToLabels(primaryActionMatches)
    .slice(0, 2)
    .forEach((x) => tags.push(x));

  organCodesToLabels(organMatches)
    .slice(0, 2)
    .forEach((x) => tags.push(`${x}を意識`));

  return uniq(tags).slice(0, 3);
}

function buildMtestRoleSummary(mtestContext) {
  if (mtestContext?.mode === "mother") {
    return "負担が出やすいラインを支える軸";
  }
  return "張りや詰まりが出やすいラインをゆるめる軸";
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
    return `今日は${lineLabel}を支える方向が合いやすく、${triggerLabel}で負担が出やすい流れに合わせて選んでいます。`;
  }

  return `今日は${lineLabel}の詰まりをゆるめる方向が合いやすく、${triggerLabel}で張りが出やすい流れに合わせて選んでいます。`;
}

function buildMtestMatchTags(riskContext, tsuboMeta) {
  const lineCode = tsuboMeta?.selected_line || riskContext?.mtest_context?.selected_line;
  const lineLabel = LINE_LABELS[lineCode] || null;
  const triggerLabel = getTriggerLabel(
    riskContext?.summary?.main_trigger,
    riskContext?.summary?.trigger_dir
  );

  const mode = tsuboMeta?.mother_child_mode || riskContext?.mtest_context?.mode;
  const modeLabel = mode === "mother" ? "支える方向" : "詰まりをゆるめる";

  return uniq([lineLabel, triggerLabel, modeLabel]).slice(0, 3);
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
    tsuboMeta,
  });
}
