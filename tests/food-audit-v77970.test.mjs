import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';
const {load}=await createScenarioRunner();
const drink=await load('lib/radar_v1/careRules/drinkRules.js');
const tcm=await load('lib/radar_v1/careRules/foodTcm.js');
const ui=await load('app/radar/utils.js');
const byName=name=>drink.DRINK_ITEMS.find(d=>d.name===name);

test('all 14 drinks have an explicit reviewed contract; modern tea is not a sedative and corn grain is not corn silk',()=>{
 assert.equal(drink.DRINK_ITEMS.length,14);
 for(const d of drink.DRINK_ITEMS){
  assert.ok(d.review&&d.note);assert.ok(Array.isArray(d.goodFor)&&Array.isArray(d.cautionFor));
  assert.ok(!d.goodFor.includes('pressure_up')&&!d.goodFor.includes('pressure_down'));
  assert.ok(d.inferredTags.every(t=>d.tags.includes(t)));
 }
 assert.ok(!byName('ルイボスティー').tags.includes('calm'));
 assert.ok(!byName('とうもろこし茶').tags.includes('drain_damp'));
 assert.ok(byName('とうもろこし茶').inferredTags.includes('support_spleen'));
 assert.equal(byName('白湯').nature,'平');assert.equal(byName('生姜湯').nature,'温');
 assert.equal(byName('葛湯').nature,null);assert.ok(byName('葛湯').tags.includes('snack'));
});
test('all 14 explanations stay at two short sentences without asserting unselected symptoms',()=>{
 for(const triggerKey of ['default','cold','heat','damp','dry','pressure_up','pressure_down','temp_shift'])
 for(const symptomFocus of [null,'fatigue','sleep','digestion','headache','dizziness','neck_shoulder','low_back_pain','mood','swelling'])
 for(const subLabels of [[],['fluid_damp'],['blood_deficiency'],['qi_stagnation'],['fluid_deficiency'],['cold_pattern','heat_pattern']])
 for(const mode of ['today','tomorrow'])
 for(const d of drink.DRINK_ITEMS){
  const c={triggerKey,symptomFocus,subLabels,mode},text=drink.buildDrinkFoodNatureReason(d,c);
  assert.ok(text.length<=110&&text.split('。').filter(Boolean).length<=2,text);
  if(triggerKey!=='heat')assert.doesNotMatch(text,/(今日|明日)の暑さ/);
  if(triggerKey!=='damp')assert.doesNotMatch(text,/(今日|明日)の湿気/);
  if(symptomFocus!=='headache')assert.doesNotMatch(text,/頭痛が気になる/);
  if(symptomFocus!=='digestion')assert.doesNotMatch(text,/胃腸の調子に合わせ/);
 }
});
test('thermal exclusions cannot be cancelled by serving temperature, including secondary weather',()=>{
 for(const [triggerKey,secondaryKey] of [['cold',null],['heat',null],['pressure_up','cold'],['heat','cold']]){
  const c={triggerKey,secondaryKey,symptomFocus:'headache'},f=drink.drinkContextFlags(c);
  for(const d of drink.buildDrinkRecommendationRows(c)){
   if(f.hasCold)assert.ok(!['寒','涼'].includes(d.nature));
   if(f.hasHeat)assert.ok(!['温','熱'].includes(d.nature));
  }
 }
 assert.ok(drink.scoreDrink(byName('生姜湯'),{triggerKey:'pressure_up',secondaryKey:'cold'})._eligible);
});
test('decaf and hojicha do not claim zero or uniformly low caffeine',()=>{
 assert.doesNotMatch(drink.buildDrinkComponentReason(byName('デカフェコーヒー')),/カフェインを含みません/);
 assert.doesNotMatch(drink.buildDrinkComponentReason(byName('ほうじ茶')),/少なめ|少ない/);
 for(const mode of ['today','tomorrow'])assert.ok(drink.buildDrinkRecommendationRows({mode,symptomFocus:'sleep'}).every(d=>!d.caffeine));
 const breakfast=drink.buildDrinkActionCard({mode:'tomorrow',triggerKey:'heat'});
 const tea=breakfast.item_details.find(d=>d.label==='緑茶');
 assert.ok(tea);assert.match(tea.reasons[1].text,/明日の朝/);assert.equal(tea.recordable,false);
});
test('saved stale drink cards are rebuilt for current symptom and selected forecast date',()=>{
 const stale={tomorrow_food_context:{action_cards:[{key:'drink',items:['古い生姜湯'],item_details:[{label:'古い生姜湯',record_semantics:'drink_consumed',public_reason:'今日は冷えます。'}]}]}};
 const riskContext={summary:{main_trigger_exact:'heat'},constitution_context:{sub_labels:[],symptom_focus:'fatigue'},target:{signal:1}};
 const plan=ui.resolveDisplayedCarePlan({forecast:{target_date:'2026-09-22',signal:1},riskContext,storedCarePlan:stale,mode:'tomorrow',targetDate:'2026-09-22',symptomFocus:'sleep'});
 const card=plan.tomorrow_food_context.action_cards.find(c=>c.key==='drink');
 assert.ok(card&&card.items.length===2);assert.ok(!JSON.stringify(card).includes('古い'));
 for(const d of card.item_details){assert.equal(d.selection_basis.target_date,'2026-09-22');assert.equal(d.selection_basis.symptom_focus,'sleep');assert.equal(d.selection_basis.trigger_key,'heat');assert.equal(d.recordable,false);assert.ok(!byName(d.label).caffeine);}
});
test('food reasons cover qi deficiency, stagnation, blood deficiency, dryness and policy without invented complaints',()=>{
 for(const subLabels of [['qi_deficiency'],['qi_stagnation'],['blood_deficiency'],['fluid_deficiency'],['blood_stasis'],['fluid_damp']])
 for(const trigger_key of ['default','heat','dry','pressure_up']){
  const options={subLabels,symptomFocus:'headache',theme:{trigger_key,policies:[{key:'yurumeru'}]}};
  for(const f of tcm.rankTcmFoods(options)){
   const d=tcm.tcmFoodDetail(f,{targetDate:'2026-09-22'});
   assert.doesNotMatch(d.public_reason,/食後の重さが気になる|乾きと消耗が重なるとき|口や喉の乾きに合わせ|ほてりが気になる|便が硬くなり/);
   assert.ok(d.public_reason.length<=110,d.public_reason);
   if(f.matches[0]?.key==='和胃')assert.match(d.public_reason,/食養生.*胃腸.*緊張/);
  }
 }
});
test('caution separates reported symptoms, target-day weather, constitution and timing',()=>{
 const c=opts=>tcm.tcmEveningCaution(opts);
 assert.match(c({mode:'tomorrow',subLabels:['fluid_damp'],theme:{trigger_key:'heat'}}).reason,/明日の暑さ/);
 assert.match(c({mode:'today',subLabels:['fluid_deficiency'],theme:{trigger_key:'pressure_up'}}).reason,/乾きやすい体質/);
 assert.doesNotMatch(c({mode:'today'}).reason,/明日|今夜/);
 assert.equal(c({symptomFocus:'digestion',theme:{trigger_key:'heat'}}).id,'night-digestion');
 assert.doesNotMatch(c({symptomFocus:'digestion',theme:{trigger_key:'heat'}}).reason,/冷え/);
 assert.equal(c({mode:'tomorrow',symptomFocus:'sleep',theme:{trigger_key:'heat'}}).source,'symptom');
 assert.match(c({subLabels:['heat_pattern'],theme:{trigger_key:'pressure_down'}}).reason,/熱がこもりやすい傾向/);
});
