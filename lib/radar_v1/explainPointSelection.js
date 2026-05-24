// lib/radar_v1/explainPointSelection.js

const ACTION_LABELS = {
  tonify_qi: "気を補う",
  support_kidney: "腎を支える",
  strengthen_spleen: "脾胃を支える",
  transform_damp: "湿をさばく",
  move_blood: "血の巡りを動かす",
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

function buildActionPhrase(actionCodes) {
  const labels = actionCodesToLabels(actionCodes).slice(0, 2);
  return joinJa(labels);
}

function buildOrganPhrase(organCodes) {
  const labels = organCodesToLabels(organCodes).slice(0, 2);
  return joinJa(labels);
}

function buildTcmRoleSummary(point, tcmContext) {
  if (point?.care_trigger_role === "secondary") {
    return "重なりやすい負担も見て、偏りをためこみにくくするツボです";
  }
  if (tcmContext?.need_abdomen && point?.code && point.code === tcmContext.abdomen_choice) {
    return "お腹まわりから、全体の余力を支えるツボです";
  }

  if (point?.point_region === "abdomen") {
    return "お腹まわりから、全体の余力を支えるツボです";
  }

  return "体質のゆらぎを、日々のケアにつなげやすいツボです";
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
    return "土台の支えを先に整えたい日なので、まず腹部から全体の余力を支える目的で選んでいます。";
  }

  const primaryActionPhrase = buildActionPhrase(primaryActionMatches);
  const secondaryActionPhrase = buildActionPhrase(secondaryActionMatches);
  const organPhrase = buildOrganPhrase(organMatches);

  if (point?.care_trigger_role === "secondary" && careTriggerLabel) {
    const phrase = secondaryActionPhrase || primaryActionPhrase || organPhrase;
    if (phrase) {
      return `${careTriggerLabel}の影響も少し重なりそうなため、${phrase}ケアも少し入れられるように選んでいます。`;
    }
    return `${careTriggerLabel}の影響も少し重なりそうなため、負担をためこみにくくする目的で選んでいます。`;
  }

  if (primaryActionPhrase && organPhrase) {
    return `${primaryActionPhrase}ケアと、${organPhrase}を支えるケアがこの日の整え方に合うため選んでいます。`;
  }

  if (primaryActionPhrase) {
    return `${primaryActionPhrase}ケアがこの日の体質ケアに合うため選んでいます。`;
  }

  if (organPhrase) {
    return `${organPhrase}の負担を整えるケアがこの日の体質ケアに合うため選んでいます。`;
  }

  if (secondaryActionPhrase) {
    return `${secondaryActionPhrase}ケアも、この日の整え方に合うため選んでいます。`;
  }

  return "この日の体質ケアに合うため選んでいます。";
}

function buildTcmMatchTags(point, tcmContext) {
  const tags = [];
  const careTriggerLabel = exactTriggerLabel(point?.care_trigger_exact);

  if (point?.care_trigger_role === "secondary" && careTriggerLabel) {
    tags.push(`${careTriggerLabel}も補助`);
  }

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
    return "動き出しで負担が出やすいラインを、今夜のうちに軽く整えるツボです";
  }
  return "張りや引っかかりが出やすいラインを、軽くゆるめるツボです";
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
  const modeLabel = mode === "mother" ? "やさしく支える" : "詰まりをゆるめる";

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

