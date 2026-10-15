import { DRINK_EXPLANATIONS, DRINK_EXPLANATION_VERSION } from './drinkExplanations';

// Selection, ingredient identity and display explanation share one catalog.
export const DRINK_MODEL_VERSION = 'drink_v100_2026-10-15';
const rows = [
  ['水','平',['甘'],false,['fluids','neutral','base','light'],[],[],[], 'common'],
  ['白湯','平',['甘'],false,['fluids','neutral','base','easy'],[],[],[], 'temperature'],
  ['麦茶','涼',['甘'],false,['clear_heat','fluids','cool','light'],['heat'],['cold'],['clear_heat'], 'variable'],
  ['ほうじ茶','平',['苦','甘'],true,['aromatic','light','fluids'],[],['sleep'],[], 'processing'],
  ['緑茶','涼',['苦','甘'],true,['clear_heat','cool','light','aromatic','wake','fluids'],['heat'],['cold','sleep','digestion'],[], 'common'],
  ['コーヒー',null,['苦'],true,['aromatic','fluids'],[],['sleep','digestion','dizziness'],[], 'modern'],
  ['デカフェコーヒー',null,['苦'],false,['aromatic','fluids','low_stimulus'],[],['digestion'],[], 'modern'],
  ['ルイボスティー',null,[],false,['fluids','light','low_stimulus'],['dry','sleep'],[],[], 'modern'],
  ['はとむぎ茶','涼',['甘','淡'],false,['drain_damp','support_spleen','light','cool','fluids'],['damp','swelling'],['cold','dry'],['drain_damp','support_spleen'], 'infusion'],
  ['とうもろこし茶','平',['甘'],false,['support_spleen','drain_damp','light','neutral','fluids'],['damp','digestion'],[],['support_spleen','drain_damp'], 'infusion'],
  ['小豆茶','平',['甘'],false,['drain_damp','support_spleen','light','neutral','fluids'],['damp','swelling'],['dry'],['drain_damp','support_spleen'], 'infusion'],
  ['黒豆茶','平',['甘'],false,['blood','kidney','support','drain_damp','aromatic','neutral','fluids'],['fatigue'],[],['blood','kidney','support','drain_damp'], 'infusion'],
  ['生姜湯','温',['辛'],false,['warm','digest'],['cold','digestion'],['heat','dry'],[], 'preparation'],
  ['葛湯',null,['甘'],false,['easy','fluids','snack'],[],[],['fluids'], 'processing'],
  ['マイカイ花茶','温',['甘','微苦'],false,['move_qi','move_blood','aromatic','fluids'],['mood'],['heat'],[], 'flower'],
  ['陳皮しょうが茶','温',['辛','苦'],false,['warm','move_qi','digest','drain_damp','fluids'],['cold','digestion','damp'],['heat','dry'],[], 'blend'],
  ['ジャスミン花茶','温',['辛','微甘'],false,['move_qi','digest','aromatic','fluids'],['mood','digestion'],['heat'],[], 'flower'],
  ['菊花クコ茶','涼',['甘','苦'],false,['clear_heat','cool','moisten','blood','calm','fluids'],['heat','dry'],['cold'],[], 'blend'],
  ['なつめ龍眼茶','温',['甘'],false,['support','support_spleen','blood','calm','fluids'],['fatigue','sleep'],['heat','damp'],[], 'blend'],
  ['しょうがなつめ茶','温',['辛','甘'],false,['warm','support','support_spleen','digest','fluids'],['cold','fatigue'],['heat','dry','damp'],[], 'blend'],
  ['はとむぎ小豆茶','涼',['甘','淡'],false,['drain_damp','support_spleen','light','cool','fluids'],['damp','swelling'],['cold','dry'],[], 'blend'],
  ['ルイボス＋マイカイ花','温',['甘','微苦'],false,['move_qi','aromatic','fluids','low_stimulus'],['mood'],['heat'],[], 'blend'],
];
// Design weights (not clinical efficacy). Primary and supporting associations share
// the same three levels; provenance never automatically halves an association.
export const DRINK_STRENGTH_WEIGHTS = { weak:0.5, medium:0.75, strong:1 };
const STRENGTH = {
 水:'weak',白湯:'medium',麦茶:'medium',ほうじ茶:'medium',緑茶:'strong',
 コーヒー:'weak',デカフェコーヒー:'weak',ルイボスティー:'weak',はとむぎ茶:'strong',
 とうもろこし茶:'medium',小豆茶:'strong',黒豆茶:'medium',生姜湯:'strong',葛湯:'weak',
  マイカイ花茶:'medium',陳皮しょうが茶:'medium',ジャスミン花茶:'medium',菊花クコ茶:'medium',
  なつめ龍眼茶:'medium',しょうがなつめ茶:'medium',はとむぎ小豆茶:'strong','ルイボス＋マイカイ花':'medium',
};
const SUPPORTING_STRENGTH = {
  とうもろこし茶:{drain_damp:'weak'},
 小豆茶:{support_spleen:'weak'},黒豆茶:{drain_damp:'weak'},
};
const TCM_TAGS = new Set(['clear_heat','cool','warm','move_qi','move_blood','drain_damp','support_spleen','digest','blood','kidney','support','moisten','calm']);
const traitWeight = (drink,tag) => TCM_TAGS.has(tag)||drink.inferredTags.includes(tag)
 ? DRINK_STRENGTH_WEIGHTS[drink.tagStrengths[tag]||drink.strength]
 : ['light','neutral','base'].includes(tag)?DRINK_STRENGTH_WEIGHTS.weak:1;
const FAMILIES = {
 水:['water'],白湯:['water'],コーヒー:['coffee'],デカフェコーヒー:['coffee'],
 はとむぎ茶:['hatomugi'],小豆茶:['adzuki'],ルイボスティー:['rooibos'],生姜湯:['ginger'],
 マイカイ花茶:['rose'],陳皮しょうが茶:['chenpi','ginger'],ジャスミン花茶:['jasmine'],
 菊花クコ茶:['chrysanthemum','goji'],なつめ龍眼茶:['jujube','longan'],しょうがなつめ茶:['ginger','jujube'],
 はとむぎ小豆茶:['hatomugi','adzuki'],'ルイボス＋マイカイ花':['rooibos','rose'],
};
export const DRINK_ITEMS = rows.map(([name,nature,flavors,caffeine,tags,goodFor,cautionFor,inferredTags,review],index)=>({
  id:`drink-${index+1}`,name,nature,flavors,caffeine,tags,goodFor,cautionFor,inferredTags,review,
  ...DRINK_EXPLANATIONS[name],specialty:index>=14,familyKeys:FAMILIES[name]||[name],
  strength:STRENGTH[name],tagStrengths:SUPPORTING_STRENGTH[name]||{},
  natureRange:name==='ほうじ茶'?'平〜温':name==='はとむぎ茶'?'微涼':name==='生姜湯'?'微温〜温':nature,
  servedWarm:['白湯','ほうじ茶','葛湯'].includes(name),
  caffeineLevel:name==='デカフェコーヒー'?'trace':caffeine?'variable':'none',
  inference_basis:inferredTags.length?'食品原料の性質と焙煎・抽出形態を踏まえた食養生設計':null,
}));
export const DRINK_AUDIT = Object.fromEntries(DRINK_ITEMS.map(d=>[d.name,d]));
export const SUB_LABEL_CODES = {
 qi_stagnation:['qi_stagnation','気滞'],qi_deficiency:['qi_deficiency','気虚'],
 blood_deficiency:['blood_deficiency','血虚'],blood_stasis:['blood_stasis','血瘀','瘀血','お血'],
 fluid_damp:['fluid_damp','痰湿','水滞','dampness'],fluid_deficiency:['fluid_deficiency','陰虚','津液不足'],
};
export function normalizeSubLabelValues(labels=[]) {
 return [...new Set(labels.map(x=>typeof x==='object'&&x?(x.code||x.key||x.value||x.label||''):String(x||'')).filter(Boolean))];
}
export function getSubLabelFlags(labels=[]) {
 const values=normalizeSubLabelValues(labels),text=values.join(' ');
 const has=key=>SUB_LABEL_CODES[key].some(x=>values.includes(x));
 return {values,text,qiStagnation:has('qi_stagnation'),qiDeficiency:has('qi_deficiency'),bloodDeficiency:has('blood_deficiency'),
 bloodStasis:has('blood_stasis'),fluidDamp:has('fluid_damp'),fluidDeficiency:has('fluid_deficiency'),
 cold:values.some(x=>/冷|寒|cold_pattern|yang_deficiency/.test(x)),heat:values.some(x=>/熱|ほて|暑|heat_pattern/.test(x))};
}
const WEATHER_NEEDS={
 damp:['drain_damp','support_spleen','light'],cold:['warm','easy'],heat:['clear_heat','fluids','cool'],dry:['fluids'],
 pressure_down:['light','fluids'],pressure_up:['light','fluids'],temp_shift:['fluids','neutral'],default:['fluids','light','neutral'],none:['fluids','light','neutral'],
};
const SYMPTOM_NEEDS={fatigue:['support','support_spleen'],sleep:['calm','low_stimulus'],digestion:['support_spleen','digest','easy'],
 neck_shoulder:['move_qi'],low_back_pain:['kidney','support'],swelling:['drain_damp'],headache:['fluids','light'],dizziness:['fluids','low_stimulus'],mood:['move_qi','calm']};
const BODY_NEEDS={qiDeficiency:['support','support_spleen'],bloodDeficiency:['blood','support'],qiStagnation:['move_qi'],
 bloodStasis:['move_blood'],fluidDamp:['drain_damp','support_spleen'],fluidDeficiency:['moisten','fluids']};
export function drinkContextFlags(context={}) {
 const sub=getSubLabelFlags(context.subLabels||[]),keys=[context.triggerKey,context.secondaryKey].filter(Boolean);
 return {...sub,keys,symptomFocus:context.symptomFocus,mode:context.mode,
 hasCold:keys.includes('cold')||sub.cold,hasHeat:keys.includes('heat')||sub.heat,
 hasDamp:keys.includes('damp')||sub.fluidDamp,hasDry:keys.includes('dry')||sub.fluidDeficiency,
 weakDigestion:context.symptomFocus==='digestion'||sub.qiDeficiency,
 accel:context.reactionDirection==='accel',brake:context.reactionDirection==='brake'};
}
// Every positive context adjustment is recorded and is available to the copy.
export function scoreDrink(drink,context={}) {
 const f=drinkContextFlags(context),matches=[];
 let score=1;
 const add=(tags,weight,source,key)=>{
  const hit=tags.filter(t=>drink.tags.includes(t));
  if(!hit.length)return;
  // Cap a context's influence so the catalog's tag count cannot dominate ranking.
  const value=Math.max(...hit.map(t=>weight*traitWeight(drink,t)));
  score+=value;matches.push({source,key,tags:hit,weight:value});
 };
 add(WEATHER_NEEDS[context.triggerKey]||WEATHER_NEEDS.default,3,'weather',context.triggerKey||'default');
 if(context.secondaryKey&&context.secondaryKey!==context.triggerKey)add(WEATHER_NEEDS[context.secondaryKey]||[],1.5,'weather',context.secondaryKey);
 add(SYMPTOM_NEEDS[context.symptomFocus]||[],3,'symptom',context.symptomFocus);
 for(const [key,tags] of Object.entries(BODY_NEEDS))if(f[key])add(tags,2,'constitution',key);
 if(f.hasHeat&&!f.hasCold&&['涼','寒'].includes(drink.nature)){const value=3*DRINK_STRENGTH_WEIGHTS[drink.strength];score+=value;matches.push({source:'thermal',key:'heat',weight:value});}
 if(f.hasCold&&!f.hasHeat){
  if(drink.nature==='温') {const value=5*DRINK_STRENGTH_WEIGHTS[drink.strength];score+=value;matches.push({source:'thermal',key:'cold',weight:value});}
  if(drink.servedWarm) {score+=4;matches.push({source:'serving',key:'cold',weight:4});}
 }
 // Keep individual associations explicit; no inherited legacy pressure/heat bonus.
 for(const [key,source,weight] of [[context.triggerKey,'weather',2],[context.secondaryKey,'weather',1],[context.symptomFocus,'symptom',2]]) {
  if(key&&drink.goodFor.includes(key)) {const value=weight*DRINK_STRENGTH_WEIGHTS[drink.strength];score+=value;matches.push({source,key,weight:value});}
 }
 if(f.weakDigestion&&(drink.tags.includes('cool')||drink.name==='コーヒー'))score-=2;
 if(f.hasHeat&&f.hasDamp&&f.weakDigestion&&drink.tags.includes('neutral')&&drink.tags.includes('support_spleen')){score+=2;matches.push({source:'combined',key:'heat_damp_digestion',weight:2});}
 if(drink.caffeine){
  if(['headache','dizziness','digestion'].includes(context.symptomFocus))score-=3;
  if(f.accel)score-=2;
 }
 for(const bad of drink.cautionFor){
  if((bad==='dry'&&f.hasDry)||(bad==='cold'&&f.hasCold)||(bad==='heat'&&f.hasHeat)||bad===context.symptomFocus)score-=3;
 }
 if(drink.name==='葛湯'){score-=1;if(context.symptomFocus==='digestion')score+=1;}
 // Water temperature does not cancel an opposing food nature.
 const thermalConflict=(f.hasCold&&['涼','寒'].includes(drink.nature))||(f.hasHeat&&['温','熱'].includes(drink.nature));
 const eligible=!thermalConflict&&!(context.symptomFocus==='sleep'&&drink.caffeine);
 const purposeMatch=matches.some(m=>(m.tags||[]).some(t=>TCM_TAGS.has(t))||['thermal','combined'].includes(m.source));
 return {...drink,_score:score,_eligible:eligible&&(!drink.specialty||purposeMatch),_matches:matches.sort((a,b)=>b.weight-a.weight)};
}
const DIRECTIONS = {
 clear_heat:'こもる熱を落ち着ける',cool:'熱を冷ます方向の',warm:'温める方向の',
 move_qi:'気の巡りを整える',move_blood:'血の巡りを整える',drain_damp:'水分の偏りを整える',
 support_spleen:'胃腸の働きを支える',digest:'胃の働きを整える',blood:'体を養う',kidney:'体の土台を養う',
 support:'日々の元気を補う',moisten:'うるおいを養う',calm:'落ち着きを養う',
 low_stimulus:'カフェインを控えられる',fluids:'水分補給に取り入れる',easy:'温かく飲みやすい',light:'食事にも添えやすい',neutral:'普段の水分補給に取り入れる',
};
function drinkBasis(drink,context={}) {
 const scored=Array.isArray(drink._matches)?drink:scoreDrink(drink,context);
 const flags=drinkContextFlags(context);
 const grouped=new Map();
 for(const m of scored._matches){
  if(['default','none'].includes(m.key))continue;
  const id=m.source+'|'+m.key;
  const item=grouped.get(id)||{source:m.source,key:m.key,weight:0,tags:[]};
  item.weight+=m.weight;item.tags=[...new Set([...item.tags,...(m.tags||[])])];grouped.set(id,item);
 }
 const ranked=[...grouped.values()].sort((a,b)=>b.weight-a.weight);
 // Prefer an actual ingredient-function match over a generic hydration match.
 const hit=ranked.find(m=>m.tags.some(tag=>TCM_TAGS.has(tag))||['thermal','combined'].includes(m.source)||m.key==='sleep')||ranked[0];
 if(!hit)return {key:'everyday',text:drink.note};
 const when=context.mode==='tomorrow'?'明日の':'今日の';
 const condition={
  cold:flags.keys.includes('cold')?when+'冷えに備えて':'冷えやすい傾向に合わせ',
  heat:flags.keys.includes('heat')?when+'暑さに備えて':'熱がこもりやすい傾向に合わせ',
  damp:flags.keys.includes('damp')?when+'湿気に備えて':'重だるさをためやすい傾向に合わせ',
  dry:flags.keys.includes('dry')?when+'乾燥に備えて':'乾きやすい傾向に合わせ',
  fatigue:'疲れが気になるため',sleep:'眠りが気になるため',digestion:'胃腸の調子に配慮して',
  swelling:'むくみが気になるため',mood:'気分の波に配慮して',neck_shoulder:'首肩の張りに配慮して',
  low_back_pain:'体を養うケアに合わせて',headache:'頭痛が気になる日の水分補給に',dizziness:'めまいが気になる日の水分補給に',
  qiDeficiency:'疲れやすい体質に合わせ',bloodDeficiency:'消耗しやすい体質に合わせ',
  qiStagnation:'張りつめやすい体質に合わせ',bloodStasis:'巡りを整える方針に合わせ',
  fluidDamp:'重だるさをためやすい体質に合わせ',fluidDeficiency:'乾きやすい体質に合わせ',
  heat_damp_digestion:'暑さと湿気に備え、胃腸の調子にも配慮して',
 }[hit.key];
 if(!condition)return {key:hit.key,text:drink.note};
 const specific=hit.tags.filter(tag=>TCM_TAGS.has(tag));
 const tag=(specific.length?specific:hit.tags).filter(t=>DIRECTIONS[t]).sort((a,b)=>traitWeight(drink,b)-traitWeight(drink,a))[0];
 const direction=hit.source==='thermal'?(hit.key==='cold'?'温める方向の':'熱を冷ます方向の')
  :hit.source==='serving'?'温かい':DIRECTIONS[tag]||'胃腸の働きを支える';
 return {key:hit.key,source:hit.source,text:`${condition}、${direction}一杯を選びました。`};
}
export function buildDrinkFoodNatureReason(drink,context={}) {
 if(drink.tags.includes('snack'))return drink.note;
 return drinkBasis(drink,context).text;
}
export function buildDrinkComponentReason(drink,context={}) {
 if(drink.caffeineLevel==='trace')return 'カフェイン少量（製品によって異なります）';
 if(drink.caffeine)return 'カフェインあり';
 return 'ノンカフェイン';
}
export function buildDrinkHowTo(drink,context={}) {
 return context.mode==='tomorrow'&&drink.caffeine?'明日の朝に。'+drink.howTo.replace('朝〜昼に、',''):drink.howTo;
}
export function buildDrinkRecommendationRows(context={}) {
 const ranked=DRINK_ITEMS.map(d=>scoreDrink(d,context)).filter(d=>d._eligible&&d._score>0).sort((a,b)=>b._score-a._score||Number(a.id.slice(6))-Number(b.id.slice(6)));
 const selected=[];
 // Reserve the main pair for meal drinks; only the optional third may be a snack.
 const main=ranked.filter(d=>!d.tags.includes('snack'));
 for(let slot=0;slot<3;slot++){
  const available=slot<2?main:ranked;
  const eligible=available.filter(d=>!selected.some(x=>x.id===d.id)&&
   !selected.some(x=>x.familyKeys.some(key=>d.familyKeys.includes(key))));
  // Rotate only close matches. Strongly preferred drinks retain their priority.
  // Target date, not current clock or page mode, keeps tomorrow/today consistent.
  const pool=eligible.filter(d=>d._score>=(eligible[0]?._score??Infinity)-1.5);
  const date=context.targetDate;
  const stamp=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?Date.parse(date+'T00:00:00Z'):NaN;
  const valid=Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===date;
  const index=valid&&pool.length?((Math.floor(stamp/86400000)+slot)%pool.length+pool.length)%pool.length:0;
  const d=pool[index];
  if(!d)break;
  selected.push({...d,_mark:d._score>=8?'◎':d._score>=4?'○':'△',note:buildDrinkFoodNatureReason(d,context),
   reasons:[{label:'東洋医学での考え方',text:d.theory}]});
 }
 return selected;
}
export function buildDrinkActionCard(context={}) {
 const rows=buildDrinkRecommendationRows(context).slice(0,2),tomorrow=context.mode==='tomorrow';
 if(!rows.length)return null;
 return {key:'drink',label:tomorrow?'明日の朝に合わせる飲み物':'今日、食事と合わせる飲み物',items:rows.map(d=>d.name),
 item_details:rows.map(d=>({label:d.name,nature:d.nature,flavors:d.flavors,public_reason:d.note,reasons:d.reasons,
 theory_details:[{text:d.theory}],how_to:buildDrinkHowTo(d,context),caffeine_label:buildDrinkComponentReason(d,context),ingredients:d.ingredients,
 record_semantics:'drink_consumed',record_label:`${d.name}を飲んだ`,consumed_id:d.id,consumed_name:d.name,
 consumption_slot:tomorrow?'breakfast':'today',recordable:!tomorrow,
 selection_basis:{version:DRINK_MODEL_VERSION,nature:d.nature,review:d.review,inference_basis:d.inference_basis,inferred_tags:d.inferredTags,
 strength:d.strength,tag_strengths:d.tagStrengths,nature_range:d.natureRange,served_warm:d.servedWarm,reason:d.note,
 content_version:DRINK_EXPLANATION_VERSION,theory:d.theory,how_to:buildDrinkHowTo(d,context),caffeine_level:d.caffeineLevel,ingredients:d.ingredients,reason_key:drinkBasis(d,context).key,matched_context:d._matches,
 target_date:context.targetDate||null,symptom_focus:context.symptomFocus||null,trigger_key:context.triggerKey||'default',secondary_trigger_key:context.secondaryKey||null}}))};
}
export function formatDrinkLeadNames(context){return buildDrinkRecommendationRows(context).slice(0,2).map(d=>d.name);}
