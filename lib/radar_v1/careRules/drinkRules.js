// One catalog for selection and explanation. Associations marked inferred are
// food-therapy design hypotheses, not measured beverage potency or efficacy.
export const DRINK_MODEL_VERSION = 'drink_v70_2026-09-21';
const rows = [
  ['水','平',['甘'],false,['fluids','neutral','base','light'],[],[],[], 'common'],
  ['白湯','平',['甘'],false,['fluids','neutral','base','easy'],[],[],[], 'temperature'],
  ['麦茶','涼',['甘'],false,['clear_heat','fluids','cool','light'],['heat'],['cold'],['clear_heat'], 'variable'],
  ['ほうじ茶',null,['苦','甘'],true,['aromatic','move_qi','light','fluids'],['mood','neck_shoulder'],['sleep'],['move_qi'], 'processing'],
  ['緑茶','涼',['苦','甘'],true,['clear_heat','cool','light','aromatic','wake','fluids'],['heat'],['cold','sleep','digestion'],[], 'common'],
  ['コーヒー',null,['苦'],true,['aromatic','move_qi','wake','fluids'],['fatigue','mood'],['sleep','digestion','dizziness'],['move_qi'], 'modern'],
  ['デカフェコーヒー',null,['苦'],false,['aromatic','move_qi','fluids','low_stimulus'],['mood'],['digestion'],['move_qi'], 'modern'],
  ['ルイボスティー',null,[],false,['fluids','light','low_stimulus'],['dry','sleep'],[],[], 'modern'],
  ['はとむぎ茶','涼',['甘','淡'],false,['drain_damp','support_spleen','light','cool','fluids'],['damp','swelling'],['cold','dry'],['drain_damp','support_spleen'], 'infusion'],
  ['とうもろこし茶','平',['甘'],false,['support_spleen','light','neutral','fluids'],['damp','digestion'],[],['support_spleen'], 'infusion'],
  ['小豆茶','平',['甘','淡'],false,['drain_damp','light','neutral','fluids'],['damp','swelling'],['dry'],['drain_damp'], 'infusion'],
  ['黒豆茶','平',['甘'],false,['blood','kidney','support','aromatic','neutral','fluids'],['fatigue'],[],['blood','kidney','support'], 'infusion'],
  ['生姜湯','温',['辛'],false,['warm','digest','support_spleen'],['cold'],['heat','dry'],[], 'preparation'],
  ['葛湯',null,['甘'],false,['easy','snack'],[],[],[], 'processing'],
];
const NOTES = {
  水:'毎日の水分補給に。喉の渇きに合わせて飲みます。',
  白湯:'温かい水を少しずつ飲みたいときに。熱すぎない温度にします。',
  麦茶:'香ばしく、甘くない水分補給の候補です。',
  ほうじ茶:'焙煎した茶葉の、香ばしい風味を楽しめます。',
  緑茶:'苦味とすっきりした風味を食事に添える一杯に。',
  コーヒー:'苦味と香りを楽しむ朝〜昼の一杯に。いつもの量を目安にします。',
  デカフェコーヒー:'コーヒーの香りを楽しみながら、カフェインを控えたいときに。',
  ルイボスティー:'カフェインを控えながら、水分を補う一杯に。',
  はとむぎ茶:'重だるさに着目する、はとむぎの食養生をお茶から取り入れる候補です。',
  とうもろこし茶:'消化・吸収を支える食養生に、穀物の香ばしい一杯を添えます。',
  小豆茶:'水分の偏りに着目する、小豆の食養生をお茶から取り入れる候補です。',
  黒豆茶:'体を養う黒豆の食養生を、香ばしい一杯から取り入れる候補です。',
  生姜湯:'食養生では温める方向の一杯です。薄めに作り、甘さは控えめに。',
  葛湯:'小腹が空いたときに、温かいとろみを少量。甘さは控えめに。',
};
export const DRINK_ITEMS = rows.map(([name,nature,flavors,caffeine,tags,goodFor,cautionFor,inferredTags,review],index)=>({
  id:`drink-${index+1}`,name,nature,flavors,caffeine,tags,goodFor,cautionFor,inferredTags,review,note:NOTES[name],
  servedWarm:['白湯','葛湯'].includes(name),
  caffeineLevel:name==='デカフェコーヒー'?'trace':caffeine?'variable':'none',
  inference_basis:inferredTags.length?'食材・香味の特徴を飲み物の選び方へ応用した食養生上の推論（専門家確認前）':null,
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
 damp:['drain_damp','support_spleen','light'],cold:['easy'],heat:['clear_heat','fluids','cool'],dry:['fluids'],
 pressure_down:['light','fluids'],pressure_up:['light','fluids'],temp_shift:['fluids','neutral'],default:['fluids','light','neutral'],none:['fluids','light','neutral'],
};
const SYMPTOM_NEEDS={fatigue:['support','wake'],sleep:['low_stimulus','fluids'],digestion:['support_spleen','easy'],
 neck_shoulder:['aromatic'],low_back_pain:['support'],swelling:['drain_damp','light'],headache:['fluids','light'],dizziness:['fluids','low_stimulus'],mood:['aromatic','low_stimulus']};
const BODY_NEEDS={qiDeficiency:['support','support_spleen'],bloodDeficiency:['blood','support'],qiStagnation:['move_qi','aromatic'],
 bloodStasis:['move_qi'],fluidDamp:['drain_damp','support_spleen'],fluidDeficiency:['fluids']};
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
  const value=Math.max(...hit.map(t=>weight*(drink.inferredTags.includes(t)?0.5:1)));
  score+=value;matches.push({source,key,tags:hit,weight:value});
 };
 add(WEATHER_NEEDS[context.triggerKey]||WEATHER_NEEDS.default,3,'weather',context.triggerKey||'default');
 if(context.secondaryKey&&context.secondaryKey!==context.triggerKey)add(WEATHER_NEEDS[context.secondaryKey]||[],1.5,'weather',context.secondaryKey);
 add(SYMPTOM_NEEDS[context.symptomFocus]||[],3,'symptom',context.symptomFocus);
 for(const [key,tags] of Object.entries(BODY_NEEDS))if(f[key])add(tags,2,'constitution',key);
 if(f.hasHeat&&!f.hasCold&&['涼','寒'].includes(drink.nature)){score+=3;matches.push({source:'thermal',key:'heat',weight:3});}
 if(f.hasCold&&!f.hasHeat){
  if(drink.nature==='温') {score+=5;matches.push({source:'thermal',key:'cold',weight:5});}
  if(drink.servedWarm) {score+=4;matches.push({source:'serving',key:'cold',weight:4});}
 }
 // Keep individual associations explicit; no inherited legacy pressure/heat bonus.
 for(const [key,source,weight] of [[context.triggerKey,'weather',2],[context.secondaryKey,'weather',1],[context.symptomFocus,'symptom',2]]) {
  if(key&&drink.goodFor.includes(key)) {const value=drink.inferredTags.length?weight*0.5:weight;score+=value;matches.push({source,key,weight:value});}
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
 return {...drink,_score:score,_eligible:eligible,_matches:matches.sort((a,b)=>b.weight-a.weight)};
}
function drinkBasis(drink,context) {
 const f=drinkContextFlags(context),when=context.mode==='tomorrow'?'明日の':'今日の';
 if(drink.name==='葛湯')return {key:'optional_snack',text:'小腹が空いたときだけ、少量の補食に。'};
 if(drink.name==='生姜湯'&&!f.hasCold)return {key:'warming_option',text:''};
 if(drink.name==='生姜湯')return {key:'cold',text:f.keys.includes('cold')?`${when}冷えに備える一杯です。`:'冷えやすい傾向に合わせる一杯です。'};
 if(f.hasCold&&f.hasHeat)return {key:'mixed',text:'冷えと暑さの両方に配慮した一杯です。'};
 if(context.symptomFocus==='sleep'&&!drink.caffeine)return {key:'sleep',text:'眠りが気になるため、カフェインを控える選び方です。'};
 if(drink.tags.includes('drain_damp')&&(f.hasDamp||context.symptomFocus==='swelling')) {
  if(context.symptomFocus==='swelling')return {key:'swelling',text:'むくみが気になるときの食養生に添える候補です。'};
  if(f.fluidDamp)return {key:'fluid_damp',text:'重だるさをためやすい体質に合わせる候補です。'};
  return {key:'damp',text:`${when}湿気への備えに選びました。`};
 }
 if(drink.name==='黒豆茶'&&(f.bloodDeficiency||f.qiDeficiency||context.symptomFocus==='fatigue'))return {key:'support',text:context.symptomFocus==='fatigue'?'疲れが気になるときの食養生に添える候補です。':'消耗しやすい体質に合わせる候補です。'};
 if(drink.name==='とうもろこし茶'&&f.hasDamp)return {key:'damp_support',text:f.fluidDamp?'重だるさをためやすい体質に、消化・吸収を支える食養生も取り入れます。':`${when}湿気による重だるさへの備えに、消化・吸収を支える食養生も取り入れます。`};
 if(context.symptomFocus==='digestion'&&(drink.tags.includes('support_spleen')||drink.tags.includes('easy')))return {key:'digestion',text:'胃腸の調子に合わせ、飲みやすい一杯を選びました。'};
 if(f.hasHeat&&['涼','寒'].includes(drink.nature))return {key:'heat',text:f.keys.includes('heat')?`${when}暑さへの備えに選びました。`:'熱がこもりやすい傾向に合わせる候補です。'};
 if(f.hasCold&&drink.servedWarm)return {key:'cold',text:f.keys.includes('cold')?`${when}冷えに備え、温かい飲み物を選びました。`:'冷えやすい傾向に合わせ、温かい飲み物を選びました。'};
 if(f.hasDry&&drink.tags.includes('fluids'))return {key:'dry',text:f.keys.includes('dry')?`${when}乾燥に備え、水分補給に取り入れる一杯です。`:'乾きやすい体質に合わせ、水分補給に取り入れる一杯です。'};
 if(drink.tags.includes('aromatic')&&(f.qiStagnation||['mood','neck_shoulder'].includes(context.symptomFocus)))return {key:'aroma',text:f.qiStagnation?'張りつめやすい体質に合わせ、香りでひと息つく一杯に。':'香りを楽しみ、ひと息つく時間に添える一杯です。'};
 if(drink.name==='コーヒー'&&context.symptomFocus==='fatigue')return {key:'fatigue',text:'疲れが気になるときの休憩に添える一杯です。'};
 if(drink.tags.includes('move_qi')&&f.bloodStasis)return {key:'blood_stasis',text:'巡りを整える食養生に、香りを楽しむ一杯を添えます。'};
 if(context.symptomFocus==='headache')return {key:'headache',text:'頭痛が気になる日の、水分補給に添える候補です。'};
 if(context.symptomFocus==='dizziness')return {key:'dizziness',text:'めまいが気になる日の、水分補給に添える候補です。'};
 return {key:'everyday',text:''};
}
export function buildDrinkFoodNatureReason(drink,context={}) {
 const basis=drinkBasis(drink,context);
 const f=drinkContextFlags(context);
 let feature=drink.note;
 if(basis.text&&drink.name==='白湯')feature='熱すぎない温度で、少しずつ飲みます。';
 if(basis.text&&drink.name==='水')feature='喉の渇きに合わせ、飲みやすい温度で飲みます。';
 if(basis.text&&drink.name==='ルイボスティー')feature='ノンカフェインで、食事にも休憩にも合わせやすいお茶です。';
 if(basis.text&&drink.name==='生姜湯')feature='食養生で温める方向に使う生姜を、薄めで取り入れます。';
 if(['麦茶','緑茶'].includes(drink.name)&&basis.key==='heat')feature='食養生では熱を落ち着ける方向の一杯です。';
 if(drink.name==='はとむぎ茶')feature=f.hasDamp||context.symptomFocus==='swelling'?'食養生では、水分の偏りと消化・吸収の両方に着目するお茶です。':context.symptomFocus==='digestion'?'食養生では消化・吸収を支える方向に使うお茶です。':f.hasHeat?'食養生では熱を落ち着ける方向の一杯です。':'香ばしい穀物のお茶を、甘くせず取り入れます。';
 if(drink.name==='小豆茶')feature=f.hasDamp||context.symptomFocus==='swelling'?'食養生では水分の偏りに着目し、甘くせず取り入れるお茶です。':'小豆の風味を、砂糖を加えず取り入れるお茶です。';
 if(drink.name==='黒豆茶')feature=f.qiDeficiency||f.bloodDeficiency||['fatigue','low_back_pain'].includes(context.symptomFocus)?'食養生で体を養う方向に使う黒豆を、お茶から取り入れます。':'黒豆の香ばしい風味を、甘くせず楽しめます。';
 if(drink.name==='とうもろこし茶'&&!f.hasDamp&&!f.qiDeficiency&&context.symptomFocus!=='digestion')feature='香ばしい穀物のお茶を、甘くせず取り入れます。';
 if(drink.name==='とうもろこし茶'&&basis.key==='damp_support')feature='香ばしい穀物のお茶を、甘くせず取り入れます。';
 if(drink.name==='葛湯')feature='温かいとろみを、甘さ控えめで取り入れます。';
 if(drink.name==='生姜湯'&&!f.hasCold)return '食養生では温める方向の一杯です。冷えも気になるときに、薄めで少量から。';
 if(basis.text)feature=feature.split("。")[0]+"。";
 return basis.text+feature;
}
export function buildDrinkComponentReason(drink,context={}) {
 if(['水','白湯'].includes(drink.name))return 'カフェインを含みません。';
 if(drink.name==='デカフェコーヒー')return 'カフェインを減らした飲み物です。含有量は製品によって異なります。';
 if(drink.caffeine)return `カフェインを含みます。${context.mode==='tomorrow'?'明日の朝に':'朝〜昼に'}、濃さと量を調整して飲みます。`;
 if(drink.name==='葛湯')return 'カフェインを含みません。でんぷんや糖分を含むため、小腹が空いたときに少量を。';
 if(drink.name==='生姜湯')return 'カフェインを含みません。生姜の量と甘さを控えめにして飲みます。';
 return 'カフェインを含みません。';
}
export function buildDrinkRecommendationRows(context={}) {
 const ranked=DRINK_ITEMS.map(d=>scoreDrink(d,context)).filter(d=>d._eligible&&d._score>0).sort((a,b)=>b._score-a._score||Number(a.id.slice(6))-Number(b.id.slice(6)));
 const selected=[];
 for(const d of ranked){
  if(selected.length===3)break;
  if(['コーヒー','デカフェコーヒー'].includes(d.name)&&selected.some(x=>['コーヒー','デカフェコーヒー'].includes(x.name)))continue;
  if(['水','白湯'].includes(d.name)&&selected.some(x=>['水','白湯'].includes(x.name)))continue;
  selected.push({...d,_mark:d._score>=8?'◎':d._score>=4?'○':'△',note:buildDrinkFoodNatureReason(d,context),
   reasons:[{label:'体調との相性',text:buildDrinkFoodNatureReason(d,context)},{label:'成分・飲み方',text:buildDrinkComponentReason(d,context)}]});
 }
 return selected;
}
export function buildDrinkActionCard(context={}) {
 const rows=buildDrinkRecommendationRows(context).slice(0,2),tomorrow=context.mode==='tomorrow';
 if(!rows.length)return null;
 return {key:'drink',label:tomorrow?'明日の朝に合わせる飲み物':'今日、食事と合わせる飲み物',items:rows.map(d=>d.name),
 item_details:rows.map(d=>({label:d.name,nature:d.nature,flavors:d.flavors,public_reason:d.note,reasons:d.reasons,
 record_semantics:'drink_consumed',record_label:`${d.name}を飲んだ`,consumed_id:d.id,consumed_name:d.name,
 consumption_slot:tomorrow?'breakfast':'today',recordable:!tomorrow,
 selection_basis:{version:DRINK_MODEL_VERSION,nature:d.nature,review:d.review,inference_basis:d.inference_basis,inferred_tags:d.inferredTags,
 served_warm:d.servedWarm,reason:d.note,reason_key:drinkBasis(d,context).key,matched_context:d._matches,
 target_date:context.targetDate||null,symptom_focus:context.symptomFocus||null,trigger_key:context.triggerKey||'default',secondary_trigger_key:context.secondaryKey||null}}))};
}
export function formatDrinkLeadNames(context){return buildDrinkRecommendationRows(context).slice(0,2).map(d=>d.name);}
