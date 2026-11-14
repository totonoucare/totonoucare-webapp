// Action-level selection evidence. A paired channel group does not imply that
// every illustrated motion serves every policy associated with that group.
// These are care-selection roles, not estimates of treatment effectiveness.
export const LINE_CARE_POLICY_VERSION = "line_care_policy_v123_20261114";

export const LINE_CARE_POLICY_ROLES = {
  "line-spleen-st-inner-shin": {sasaeru:"下腿内側の脾経と三陰交周辺から脾の運化と気血の生成を支える。",nagasu:"脾の運化を助け水湿の停滞を整える。",uruosu:"脾・肝・腎に関係する三陰交周辺から血と陰の濡養を助ける。"},
  "line-spleen-st-inner-knee": {uruosu:"血海周辺から血を養い、肌膚と筋脈の濡養を助ける。",meguraseru:"血海周辺から血の滞りを整える。"},
  "line-kidney-bl-inner-ankle": {uruosu:"太溪・照海周辺から腎陰を養い、乾きと濡養不足を整える。"},
  "line-spleen-st-abdominal-stroke": { sasaeru: "腹部を手のひらでなでる摩腹で脾胃の受け入れと運化を整え、食事から力を得る働きを支える。", nagasu: "摩腹で脾の運化を助け、取り込んだ水分を運ぶ働きを整える。" },
  "line-lung-li-clavicle-stroke": { yurumeru: "胸から肩の前に続く部分へ触れ、呼吸に伴う力みをほどく。" },
  "line-lung-li-chest-breath": { yurumeru: "胸郭の動きと吐く息を使い、胸や肩に入り続ける力をほどく。" },
  "line-lung-li-thumb-forearm-stroke": { yurumeru: "腕の親指側から胸に連なる経路を使い、胸や肩の力みをほどく。" },
  "line-heart-si-little-finger-stroke": { meguraseru: "腕の小指側から肩甲骨・首へ続く経路の巡りを促す。", yurumeru: "腕の小指側と肩甲部につながるこわばりをほどく。" },
  "line-heart-si-scapula-contact": { yurumeru: "肩甲骨の周囲に触れ、入り続ける力に気づいてほどく。" },
  "line-heart-si-shoulder-roll": { meguraseru: "肩甲部を小さく動かし、同じ場所に残る滞りを動かす。", yurumeru: "肩関節と肩甲部を動かし、縮こまった部分をほどく。" },
  "line-kidney-bl-low-back-contact": { nukumeru: "腰に手の温かさを伝え、冷えてこわばる部分をいたわる。" },
  "line-kidney-bl-calf-stroke": { meguraseru: "腰から脚の後ろに続く経路へ触れ、その部分の巡りを促す。" },
  "line-kidney-bl-toe-lift": { nagasu: "足首とふくらはぎを動かし、脚にたまりやすい水分の戻りを助ける。", meguraseru: "足首とふくらはぎを動かし、座ったまま滞りやすい巡りを促す。" },
  "line-liver-gb-side-breath": { meguraseru: "脇腹の動きを引き出し、胸や脇に滞りやすい気の巡りを促す。", yurumeru: "呼吸に合わせて脇腹が動くことで、胸から体側の張りをほどく。" },
  "line-liver-gb-outer-thigh-stroke": { meguraseru: "首肩・体側から脚の外側へ続く経路に触れ、巡りを促す。", yurumeru: "脚の外側から体側に続くこわばりをほどく。" },
  "line-liver-gb-side-bend": { meguraseru: "体側を小さく動かし、脇腹から腰に残る滞りを動かす。", yurumeru: "脇腹から腰の横に続く縮こまりをほどく。" },
  "line-spleen-st-abdominal-breath": { sasaeru: "調息・養気として呼吸のリズムと腹部の動きを整え、日々の活動と休息を支える。", yurumeru: "お腹の呼吸の動きを確かめ、腹部に入り続ける力をほどく。" },
  "line-spleen-st-shin-stroke": { sasaeru: "すねの外側から胃腸に関係する経路を使い、食事から力を得る働きを支える。", nagasu: "胃腸に関係する経路を使い、取り込んだ水分を運ぶ働きを助ける。" },
  "line-spleen-st-knee-extension": { nagasu: "脚の筋肉を動かし、座り続けてたまりやすい水分の戻りを助ける。", meguraseru: "脚の前面を小さく動かし、動かさずに滞りやすい巡りを促す。" },
  "line-pc-sj-outer-forearm-stroke": { meguraseru: "手の甲側の腕から肩・首へ続く経路を使い、その沿線の巡りを促す。", yurumeru: "手の甲側の腕から肩・首へ続く経路の張りをほどく。" },
  "line-pc-sj-inner-forearm-stroke": { shizumeru: "手のひら側の腕から胸に連なる経路を使い、落ち着きにくさを整える。", yurumeru: "手のひら側の腕から胸に関係する経路を使い、胸のつかえや緊張をほどく。" },
  "line-pc-sj-wrist-circle": { meguraseru: "手首を小さく動かし、腕から肩・首へ続く経路の巡りを促す。", yurumeru: "手首と前腕のこわばりを小さな動きでほどく。" },
};

// These motions have a reviewed spleen/stomach pathway for qi deficiency or
// dampness. A remote concern still needs that actual pattern and a matching
// displayed policy; an arbitrary leg or arm motion is not a substitute.
export const LINE_CARE_CONSTITUTION_PATHS = {
 "line-kidney-bl-toe-lift": {fluid_damp:"nagasu"},
 "line-spleen-st-knee-extension": {fluid_damp:"nagasu"},
 "line-spleen-st-abdominal-breath": {qi_deficiency:"sasaeru"},
 "line-spleen-st-inner-shin": {qi_deficiency:"sasaeru",fluid_damp:"nagasu",blood_deficiency:"uruosu",fluid_deficiency:"uruosu"},
 "line-spleen-st-inner-knee": {blood_deficiency:"uruosu",blood_stasis:"meguraseru"},
 "line-kidney-bl-inner-ankle": {fluid_deficiency:"uruosu"},
  "line-spleen-st-shin-stroke": { qi_deficiency: "sasaeru", fluid_damp: "nagasu" },
  "line-spleen-st-abdominal-stroke": { qi_deficiency: "sasaeru", fluid_damp: "nagasu" },
};

// Capabilities are separate from the actual pattern supporting a selection.
const PATTERN_REQUIREMENTS = {
 "line-spleen-st-inner-knee": {uruosu:["blood_deficiency"],meguraseru:["blood_stasis"]},
 "line-kidney-bl-inner-ankle": {uruosu:["fluid_deficiency"]},
 "line-spleen-st-inner-shin": {uruosu:["blood_deficiency","fluid_deficiency"]},
};
const PATTERN_ALIASES = {
  気虚: "qi_deficiency", 気滞: "qi_stagnation", 血虚: "blood_deficiency", 瘀血: "blood_stasis",
  津液不足: "fluid_deficiency", 陰虚: "fluid_deficiency", 痰湿: "fluid_damp", 水滞: "fluid_damp", dampness: "fluid_damp",
};
export function normalizeLineCarePatterns(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => {
    const key = typeof value === "string" ? value : value?.code || value?.key;
    return PATTERN_ALIASES[key] || key;
  }).filter(value => typeof value === "string" && value))];
}

// Without pattern input this exposes the action's capability for legacy
// consumers. Selection always supplies the user's actual pattern list.
export function matchLineCarePolicies(id, policies = [], subLabels = null) {
  const roles = LINE_CARE_POLICY_ROLES[id] || {};
  const labels = subLabels === null ? null : normalizeLineCarePatterns(subLabels);
  return (Array.isArray(policies) ? policies : []).flatMap((policy, index) => {
    const key = typeof policy === "string" ? policy : policy?.key;
    const needs = PATTERN_REQUIREMENTS[id]?.[key];
    const eligible = !labels || !needs || needs.some(x => labels.includes(x));
    return roles[key] && eligible ? [{ key, rank: index + 1, mechanism: roles[key], version: LINE_CARE_POLICY_VERSION }] : [];
  });
}

// Preserve every actual pattern-to-policy binding. In particular, an action
// matching both 気虚 and 痰湿 must not attribute 補気 to 痰湿 by overwriting a key.
export function lineCarePolicyEvidence(id, policies = [], subLabels = []) {
  const patterns = normalizeLineCarePatterns(subLabels);
  const paths = LINE_CARE_CONSTITUTION_PATHS[id] || {};
  return matchLineCarePolicies(id, policies, patterns).map(role => ({
    ...role,
    supporting_patterns: patterns.filter(pattern => paths[pattern] === role.key),
  }));
}
