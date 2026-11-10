// Action-level selection evidence. A paired channel group does not imply that
// every illustrated motion serves every policy associated with that group.
// These are care-selection roles, not estimates of treatment effectiveness.
export const LINE_CARE_POLICY_VERSION = "line_care_policy_v117_20261111";

export const LINE_CARE_POLICY_ROLES = {
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
  "line-spleen-st-abdominal-breath": { yurumeru: "お腹の呼吸の動きを確かめ、腹部に入り続ける力をほどく。" },
  "line-spleen-st-shin-stroke": { sasaeru: "すねの外側から胃腸に関係する経路を使い、食事から力を得る働きを支える。", nagasu: "胃腸に関係する経路を使い、取り込んだ水分を運ぶ働きを助ける。" },
  "line-spleen-st-knee-extension": { nagasu: "脚の筋肉を動かし、座り続けてたまりやすい水分の戻りを助ける。", meguraseru: "脚の前面を小さく動かし、動かさずに滞りやすい巡りを促す。" },
  "line-pc-sj-outer-forearm-stroke": { meguraseru: "手の甲側の腕から肩・首へ続く経路を使い、その沿線の巡りを促す。", yurumeru: "手の甲側の腕から肩・首へ続く経路の張りをほどく。" },
  "line-pc-sj-inner-forearm-stroke": { shizumeru: "手のひら側の腕から胸に連なる経路を使い、落ち着きにくさを整える。", yurumeru: "手のひら側の腕から胸に関係する経路を使い、胸のつかえや緊張をほどく。" },
  "line-pc-sj-wrist-circle": { meguraseru: "手首を小さく動かし、腕から肩・首へ続く経路の巡りを促す。", yurumeru: "手首と前腕のこわばりを小さな動きでほどく。" },
};

// Return only roles actually supported by the selected action, in the order
// of the policies on the current screen. Low stimulus never means 補気.
export function matchLineCarePolicies(id, policies = []) {
  const roles = LINE_CARE_POLICY_ROLES[id] || {};
  return policies.flatMap((policy, index) => {
    const key = typeof policy === "string" ? policy : policy?.key;
    return roles[key] ? [{ key, rank: index + 1, mechanism: roles[key], version: LINE_CARE_POLICY_VERSION }] : [];
  });
}
