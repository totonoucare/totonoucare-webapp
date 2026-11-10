// Facts for composition, rather than personalized display copy. Courses are
// summarized from the classical channel descriptions, checked against the
// General Administration of Sport's channel reference. Point actions are also
// supplied from the selected point's existing catalog (tcm_actions).
export const CARE_KNOWLEDGE_VERSION = "care_facts_20261109_v1";
export const CARE_KNOWLEDGE_SOURCES = [
  { title: "経絡の循行：肺・大腸・胃・脾", url: "https://www.sport.gov.cn/qgzx/n5407/c805043/content.html" },
  { title: "経絡の循行：心・小腸・膀胱・腎", url: "https://www.sport.gov.cn/qgzx/n5407/c805044/content.html" },
  { title: "経絡の循行：心包・三焦・胆・肝", url: "https://www.sport.gov.cn/qgzx/n5407/c805046/content.html" },
];

export const CHANNEL_FACTS = {
  lu: { name: "肺経", course: "胸から上腕・前腕の親指側、親指へ。体内で肺・胃・大腸と連絡する。", functions: ["宣発・粛降", "呼吸と津液の輸布"] },
  li: { name: "大腸経", course: "人差し指から前腕の親指側、上腕外側、肩、首、頬、鼻の横へ。", functions: ["沿線の気血を通す", "頭面・首肩への遠隔取穴"] },
  st: { name: "胃経", course: "顔から首、胸腹、脚の前外側、足背、第2趾へ。体内で胃に属し脾と連絡する。", functions: ["胃の受納・和降", "飲食物から気血を作る働き"] },
  sp: { name: "脾経", course: "足の母趾から脚の内側、腹、胸の側面へ。体内で脾に属し胃と連絡する。", functions: ["飲食物と水湿の運化", "気血を生む働き"] },
  ht: { name: "心経", course: "心から腋、腕の内側の小指寄り、小指へ。", functions: ["心血と神志", "心身が落ち着く働き"] },
  si: { name: "小腸経", course: "小指から腕の後外側を上り、肩関節、肩甲骨を巡り、首、頬、耳へ。", functions: ["沿線の気血を通す", "後頸部・肩甲部への遠隔取穴"] },
  bl: { name: "膀胱経", course: "目頭から頭、後頸部、背骨の両脇、腰、脚の後側、足の小趾へ。", functions: ["項背腰と下肢後面の経筋を通す", "背部・腰と脚の後側の関連"] },
  ki: { name: "腎経", course: "足底から内くるぶしの後ろ、脚の内側後方、脊柱、腎、胸、喉へ。", functions: ["腎陰・腎陽を養う", "腰を支える働きと津液"] },
  pc: { name: "心包経", course: "胸から上腕内側の中央、肘、前腕の掌側中央、手のひら、中指へ。体内で三焦と連絡する。", functions: ["胸の気機を通す", "寧心安神", "和胃降逆"] },
  te: { name: "三焦経", course: "薬指から手背、前腕外側の中央、上腕外側、肩、首、耳の周り、目尻へ。", functions: ["少陽の気機を通す", "水道を通調する", "頭側面・首肩への遠隔取穴"] },
  gb: { name: "胆経", course: "目尻から側頭部、後頸部、肩、脇腹、脚の外側、足の第4趾へ。", functions: ["少陽の気機を通す", "筋の動きを整える"] },
  lr: { name: "肝経", course: "足の母趾から足背、脚の内側、下腹、肝、脇腹、喉、目系へ。", functions: ["疏泄・気機の条達", "血を蔵し筋を養う"] },
};

// A paired group is a selection bucket; each illustrated action touches a
// particular region. Keep that distinction in the input to the model.
export const LINE_ACTION_FACTS = {
  "line-lung-li-clavicle-stroke": { channels: ["lu"], region: "鎖骨下から肩前面", relation: "肺経が胸から上腕へ出る領域。胸郭・肩前面を軽く触れる動作。" },
  "line-lung-li-chest-breath": { channels: ["lu"], region: "胸郭と呼吸", relation: "吐く息に合わせて胸郭と肩の動きを確かめる呼吸ケア。" },
  "line-lung-li-thumb-forearm-stroke": { channels: ["lu"], region: "前腕掌側の親指寄り", relation: "胸と連絡する肺経の前腕部。親指側の線と胸・呼吸の関係から考える。" },
  "line-heart-si-little-finger-stroke": { channels: ["si", "ht"], region: "腕の小指側。掌側・背側の向きは動作図の範囲", relation: "背側では小腸経の肩甲部・首への循行、掌側では心経の胸との連絡を区別する。" },
  "line-heart-si-scapula-contact": { channels: ["si"], region: "肩甲骨の外側", relation: "小腸経が肩関節から肩甲骨を巡る領域への接触。" },
  "line-heart-si-shoulder-roll": { channels: ["si"], region: "肩関節と肩甲部", relation: "肩を小さく回し、肩甲部の経筋と関節の動きを確かめる。" },
  "line-kidney-bl-low-back-contact": { channels: ["bl"], region: "腰の左右", relation: "膀胱経の腰部に手を当てる接触ケア。腰を支える余力や冷えと合わせて読む。" },
  "line-kidney-bl-calf-stroke": { channels: ["bl"], region: "ふくらはぎの後面", relation: "膀胱経の下腿部。背中・腰と脚後面を結ぶ循行から読む。" },
  "line-kidney-bl-toe-lift": { channels: ["bl"], region: "足首と下腿後面", relation: "足関節の背屈によって下腿後面の経筋を軽く動かす。" },
  "line-liver-gb-side-breath": { channels: ["gb", "lr"], region: "脇腹と胸郭の側面", relation: "肝胆が巡る脇肋部で、呼吸に伴う胸郭の動きを確かめる。" },
  "line-liver-gb-outer-thigh-stroke": { channels: ["gb"], region: "大腿外側", relation: "胆経の大腿部。側頭・首肩・体側・脚外側を結ぶ循行から読む。" },
  "line-liver-gb-side-bend": { channels: ["gb", "lr"], region: "体幹の側面", relation: "脇肋部と体側の経筋を、呼吸に合わせて小さく動かす。" },
  "line-spleen-st-abdominal-breath": { channels: ["st", "sp"], region: "腹部と呼吸", relation: "脾胃に関係する腹部で呼吸の動きを確かめる。" },
  "line-spleen-st-shin-stroke": { channels: ["st"], region: "すねの前外側", relation: "胃経の下腿部。胃腸と脚前面を結ぶ循行から読む。" },
  "line-spleen-st-knee-extension": { channels: ["st"], region: "脚の前面と膝", relation: "膝の伸展によって脚前面の経筋を軽く動かす。" },
  "line-pc-sj-outer-forearm-stroke": { channels: ["te"], region: "前腕の背側中央", relation: "三焦経の前腕部。肩・首・耳・側頭部へ連なる少陽の循行から読む。" },
  "line-pc-sj-inner-forearm-stroke": { channels: ["pc"], region: "前腕の掌側中央", relation: "心包経の前腕部。胸の気機や和胃降逆との関係から読む。" },
  "line-pc-sj-wrist-circle": { channels: ["pc", "te"], region: "手関節の掌側と背側", relation: "手首の掌側を通る心包経と背側を通る三焦経を、関節運動として区別して読む。" },
};

export function lineCareFacts(id) {
  const fact = LINE_ACTION_FACTS[id];
  return fact ? { version: CARE_KNOWLEDGE_VERSION, ...fact, channels: fact.channels.map(code => ({ code, ...CHANNEL_FACTS[code] })) } : null;
}

// Point-specific roles supplement the selected catalog's broad function tags.
export const POINT_FACTS = {
  LU9: { roles: ["肺経の原穴・兪土穴"], actions: ["補肺益気・調理肺気"] },
  LU5: { roles: ["肺経の合水穴"], actions: ["清肺・降逆・調理水道"] },
  LI11: { roles: ["大腸経の合土穴"], actions: ["清熱・疏経通絡"] },
  LI2: { roles: ["大腸経の滎水穴"], actions: ["清熱・利咽・通絡"] },
  HT9: { roles: ["心経の井木穴"], actions: ["清心・通絡"] },
  SI8: { roles: ["小腸経の合土穴"], actions: ["清熱・疏通経絡"] },
  PC9: { roles: ["心包経の井木穴"], actions: ["清心・通絡"] },
  PC7: { roles: ["心包経の原穴・兪土穴"], actions: ["寧心・清熱"] },
  TE3: { roles: ["三焦経の兪木穴"], actions: ["清利頭目・疏通少陽経絡"] },
  TE10: { roles: ["三焦経の合土穴"], actions: ["清熱・化痰・通絡"] },
  SP2: { roles: ["脾経の滎火穴"], actions: ["健脾・調理中焦"] },
  ST41: { roles: ["胃経の経火穴"], actions: ["清胃熱・通絡"] },
  ST45: { roles: ["胃経の井金穴"], actions: ["清胃熱・寧神"] },
  KI7: { roles: ["腎経の経金穴"], actions: ["補腎・調理水液"] },
  KI1: { roles: ["腎経の井木穴"], actions: ["引火下行・寧神"] },
  BL67: { roles: ["膀胱経の井金穴"], actions: ["清利頭目・疏通経絡"] },
  BL65: { roles: ["膀胱経の兪木穴"], actions: ["疏通経絡・清利頭目"] },
  LR8: { roles: ["肝経の合水穴"], actions: ["養血・調理下焦"] },
  LR2: { roles: ["肝経の滎火穴"], actions: ["清肝火"] },
  GB43: { roles: ["胆経の滎水穴"], actions: ["清少陽熱・清利頭目"] },
  GB38: { roles: ["胆経の経火穴"], actions: ["清少陽熱・通絡"] },
  GB34: { roles: ["胆経の合土穴・胆の下合穴・筋会"], actions: ["疏肝利胆・舒筋"] },
  GV20: { roles: ["督脈・頭頂の穴"], actions: ["昇清・寧神"] },
  LI4: { roles: ["大腸経の原穴"], actions: ["疏風解表", "通経止痛"], connection: "手から肩・首・顔へ上る大腸経。頭面・首肩を遠隔からみる。" },
  LR3: { roles: ["肝経の原穴・兪土穴"], actions: ["疏肝理気", "平肝", "通絡"], connection: "肝の疏泄と筋・目の働き。張りや高ぶりを体質から読む。" },
  GB20: { roles: ["胆経の後頸部の穴"], actions: ["祛風", "清利頭目", "疏通経絡"], connection: "胆経が巡る後頸部と側頭・目のつながり。" },
  PC6: { roles: ["心包経の絡穴", "八脈交会穴・陰維脈"], actions: ["寧心安神", "寛胸理気", "和胃降逆"], connection: "前腕から胸に連絡する心包経と、胸腹を結ぶ陰維脈の関係。" },
  ST36: { roles: ["胃経の合土穴", "胃の下合穴"], actions: ["健脾和胃", "補中益気"], connection: "下腿の胃経から胃腸の受け入れと運化を支える。" },
  SP6: { roles: ["脾・肝・腎の三陰経の交会穴"], actions: ["健脾", "益腎", "養血"], connection: "下腿内側から、脾の運化・肝の血・腎の働きの関係を読む。" },
  KI3: { roles: ["腎経の原穴・兪土穴"], actions: ["滋補腎陰", "温養腎陽"], connection: "腎が担う潤い・温める力・腰の支えを、その人の寒熱と余力から読む。" },
  CV6: { roles: ["任脈・下腹部の穴"], actions: ["補気", "調気"], connection: "下腹部から、活動や回復を支える気の不足を読む。" },
  CV12: { roles: ["胃の募穴", "八会穴・腑会"], actions: ["和胃", "健脾", "降逆"], connection: "上腹部から胃の受納・和降と脾の運化を整える。" },
  SP4: { roles: ["脾経の絡穴", "八脈交会穴・衝脈"], actions: ["健脾和胃", "理気"], connection: "足の内側から、胃腸・胸腹に関係する脾経と衝脈を読む。" },
  LU7: { roles: ["肺経の絡穴", "八脈交会穴・任脈"], actions: ["宣肺", "疏風", "通絡"], connection: "前腕の肺経と頭頸部・呼吸の関係を読む。" },
  SP5: { roles: ["脾経の経金穴"], actions: ["健脾", "化湿"], connection: "内くるぶし前方の脾経から、運化と水湿の停滞を読む。" },
  HT7: { roles: ["心経の原穴・兪土穴"], actions: ["寧心安神", "養心"], connection: "手首の心経から心身の落ち着きと眠りの関係を読む。" },
  SI3: { roles: ["小腸経の兪木穴", "八脈交会穴・督脈"], actions: ["疏通経絡", "通督"], connection: "手の小指側から肩甲部・首へ至る小腸経と、項背を通る督脈の関係。" },
  BL40: { roles: ["膀胱経の合土穴"], actions: ["舒筋通絡"], connection: "膝裏から腰背へ連なる膀胱経。腰背と脚の後面を一つの循行として読む。" },
  TE5: { roles: ["三焦経の絡穴", "八脈交会穴・陽維脈"], actions: ["疏風解表", "清利頭目", "通絡"], connection: "前腕外側から肩・首・耳へ連なる三焦経と、体の陽側を結ぶ陽維脈の関係。" },
};

export function pointCareFacts(point = {}) {
  const code = String(point.code || "").toUpperCase();
  const prefix = code.match(/^[A-Z]+/)?.[0]?.toLowerCase();
  const channel = ({ sj: "te", tb: "te", liv: "lr", kid: "ki", ub: "bl" })[prefix] || prefix;
  return { version: CARE_KNOWLEDGE_VERSION, code, name: point.name_ja || code,
    point_properties: POINT_FACTS[code] || null,
    channel: CHANNEL_FACTS[channel] ? { code: channel, ...CHANNEL_FACTS[channel] } : null,
    catalog_actions: Array.isArray(point.tcm_actions) ? point.tcm_actions : [],
    organ_focus: Array.isArray(point.organ_focus) ? point.organ_focus : [],
    reading: "経穴コードからその穴固有の性質・要穴としての役割を読み、今回の体質と不調に関係する働きを選ぶ。ラインのグループ名と所属経脈を区別する。" };
}
