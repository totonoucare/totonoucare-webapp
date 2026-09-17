import { MTEST_BLOCKS } from "../radar_v1/mtestTable";

const linePoints = Object.values(MTEST_BLOCKS).flatMap(block => block.points);
const lineCodes = new Set(linePoints.map(point => point.code));
const names = Object.fromEntries(linePoints.map(point => [point.code, point.name_ja]));
Object.assign(names, { LI4:"合谷", LR3:"太衝", PC6:"内関", ST36:"足三里", SP6:"三陰交", KI3:"太渓", LI11:"曲池", HT7:"神門", GB34:"陽陵泉", SP9:"陰陵泉", LU7:"列缺", TE5:"外関", CV6:"気海", CV12:"中脘", GB20:"風池", EXHN5:"太陽", GV20:"百会", BL2:"攅竹" });
// Tool eligibility follows the selected point and application site.
// Head/neck/face and unknown points retain their hand-care instructions.
const limbCodes = new Set([...lineCodes, "LI4","LR3","PC6","ST36","SP6","KI3","LI11","HT7","GB34","SP9","LU7","TE5"]);
const moxaCodes = new Set([...limbCodes, "CV6", "CV12"]);
const tinySites = new Set(["HT9","PC9","SP1","LR1","BL67"]);
const list = value => Array.isArray(value) ? value : String(value || "").split(",");
export function normalizePointToolContext(value = {}) {
  const codes = [...new Set(list(value.codes).filter(code => typeof code === "string" && /^[A-Z]{1,6}[0-9]{1,3}$/.test(code)))].slice(0, 8);
  const line = [...new Set(list(value.lineCodes).filter(code => codes.includes(code) && lineCodes.has(code) && !tinySites.has(code)))];
  return { codes, lineCodes:line, warming:value.warming === true || value.warming === "1" };
}
export function pointToolContext(points = [], warming = false) {
  return normalizePointToolContext({codes:points.map(p=>p.code),lineCodes:points.filter(p=>p.source === "mtest" || p.mtest_selected === true).map(p=>p.code),warming});
}
export function pointToolName(code) { return names[code] || ""; }
export function pointToolKinds(value = {}) {
  const context = normalizePointToolContext(value);
  const eligible = set => !context.codes.length || context.codes.some(code => set.has(code) && !tinySites.has(code));
  return [...(eligible(moxaCodes) ? ["moxa"] : []), ...(eligible(limbCodes) ? ["stick"] : []), ...(context.lineCodes.length ? ["seal"] : [])];
}
export function pointToolKind(item) {
  const text = String(item?.title || item?.itemName || item?.query || "");
  if (/鍼シール|シール鍼|円皮鍼|ひ鍼/.test(text)) return "seal";
  if (/お灸|台座灸|温灸|せんねん灸/.test(text)) return "moxa";
  if (/ツボ押し棒|つぼ押し棒|ツボ押し.*棒|押し棒|指圧棒/.test(text)) return "stick";
  return "";
}
export function pointToolScreeningText(item, fallbackText) {
  if (!pointToolKind(item)) return fallbackText;
  // Product instructions may mention wounds/disinfection. Screen the identity
  // of these specific tools, while retaining exclusions for unrelated devices.
  return String(item?.title || item?.itemName || "")
    .replace(/一般医療機器|管理医療機器|医療用|貼付/g, "");
}
export function pointToolQueryRows(value = {}) {
  const context=normalizePointToolContext(value);
  const targetsFor = kind => context.codes.filter(code=>(kind === "moxa" ? moxaCodes : limbCodes).has(code)&&!tinySites.has(code)).map(pointToolName).join("・");
  return pointToolKinds(context).map(kind=>({
    keyword:{stick:"ツボ押し棒 先端 丸い",seal:"家庭用 鍼シール",moxa:"お灸 ソフト 低温"}[kind],
    reason:kind === "seal" ? `${context.lineCodes.map(pointToolName).join("・")}のラインケアに使う、家庭用のシール鍼です。使用部位・貼付時間は商品の説明書を確認してください。`
      : kind === "moxa" ? `${targetsFor(kind) || "ツボ"}のケアに取り入れられるお灸です。`
      : `${targetsFor(kind) || "手足のツボ"}を、手元で力を加減しながら押すための道具です。`,
    tags:["ツボケア"],productRole:"tsubo_support",pointToolKind:kind,
  }));
}
export function pointToolGuides(point, warming = false) {
  if (!moxaCodes.has(point?.code) || tinySites.has(point.code)) return [];
  const context=pointToolContext([point],warming);
  return pointToolKinds(context).map(kind=>({kind,label:{stick:"ツボ押し棒",moxa:"お灸",seal:"家庭用シール鍼"}[kind],
    text:kind === "stick" ? "丸い先端を使い、手で押す時と同じように力を加減して試せます。"
      : kind === "moxa" ? "お灸があれば、このツボのケアに取り入れられます。製品の使い方に従い、熱さを感じたら取り外してください。"
      : "このラインケアのツボには、家庭用シール鍼も選べます。使用部位・貼付時間は製品の説明書に従い、痛みやかゆみが出たら外してください。使う前後で同じ動きを試し、動かしやすさを比べてみましょう。"}));
}
