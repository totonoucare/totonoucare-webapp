import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';
const {load}=await createScenarioRunner();
const tcm=await load('lib/radar_v1/careRules/foodTcm.js');
const rules=await load('lib/radar_v1/careRules/foodIngredientRules.js');
const daily=await load('lib/radar_v1/careRules/dailyCareV2.js');
const actions=await load('lib/radar_v1/careActionItems.js');
const snapshots=await load('lib/radar_v1/displayedCareSnapshot.js');
const analysis=await load('lib/records/analysis.js');
const api=await fs.readFile(new URL('../app/api/radar/care-actions/route.js',import.meta.url),'utf8');
const block=api.slice(api.indexOf('function cleanSnapshot('),api.indexOf('\nasync function ',api.indexOf('function cleanSnapshot(')));
const clean=new Function('compact',block+';return cleanSnapshot;')((v,n)=>String(v||'').trim().slice(0,n));
function food(mode='today',more={}){return rules.buildIngredientFoodContext({mode,triggerKey:'damp',secondaryKey:'heat',subLabels:['fluid_damp','qi_deficiency'],symptomFocus:'digestion',targetDate:'2026-09-22',...more});}
function option(trigger='none',labels=[]){return {targetDate:'2026-09-22',theme:{trigger_key:trigger,policies:[]},subLabels:labels};}

test('v68 preserves all 91 legacy inventory entries and audits 81 foods plus all 14 drinks',()=>{
 assert.equal(tcm.FOOD_ITEMS.length,91);
 assert.equal(tcm.FOOD_ITEMS.filter(x=>x.role!=='drink').length,81);
 assert.equal(rules.DRINK_ITEMS.length,14);
 assert.equal(new Set(tcm.FOOD_ITEMS.map(x=>x.id)).size,91);
 for(const f of tcm.FOOD_ITEMS.filter(x=>x.role!=='drink')){
  assert.ok(f.tcm.review);assert.ok(f.tcm.note);assert.ok(f.tcm.examples.length);
  assert.ok(Array.isArray(f.tcm.flavors));
  assert.doesNotMatch(f.tcm.functions.join(' '),/protein|iron|vitamin|たんぱく|鉄|ビタミン/);
 }
});
test('chicken and pork have separate traditional functions rather than a shared protein score',()=>{
 const chicken=tcm.FOOD_ITEMS.find(x=>x.name==='鶏肉'),pork=tcm.FOOD_ITEMS.find(x=>x.name==='豚肉');
 assert.equal(chicken.tcm.nature,'温');assert.equal(pork.tcm.nature,'平');
 assert.ok(chicken.tcm.functions.includes('温中'));assert.ok(pork.tcm.functions.includes('潤燥'));
 const warming=tcm.rankTcmFoods(option('cold',['qi_deficiency']));
 const moist=tcm.rankTcmFoods(option('dry',['fluid_deficiency']));
 assert.ok(warming.find(x=>x.name==='鶏肉').score>warming.find(x=>x.name==='豚肉').score);
 assert.ok(moist.find(x=>x.name==='豚肉').score>moist.find(x=>x.name==='鶏肉').score);
});
test('warm/cool conflicts use neutral foods, with no pressure direction treated as temperature',()=>{
 for(const trigger of ['pressure_up','pressure_down','temp_shift'])assert.equal(tcm.foodTcmNeeds(option(trigger)).thermal,'neutral');
 for(const f of tcm.rankTcmFoods({...option('heat'),theme:{trigger_key:'heat',secondary_trigger_key:'cold'}}))assert.equal(f.tcm.nature,'平',f.name);
 assert.ok(tcm.rankTcmFoods(option('cold')).every(f=>!['涼','寒'].includes(f.tcm.nature)));
 assert.ok(tcm.rankTcmFoods(option('heat')).every(f=>!['温','熱'].includes(f.tcm.nature)));
});
test('uncertain modern foods remain in inventory without invented channels or actions',()=>{
 for(const name of ['納豆','小松菜','ブロッコリー','しめじ']){
  const f=tcm.FOOD_ITEMS.find(x=>x.name===name);
  assert.equal(f.tcm.review,'limited');assert.deepEqual(f.tcm.functions,[]);assert.deepEqual(f.tcm.channels,[]);
 }
});
test('water serving temperature and starch drink are not medicinal herb natures',()=>{
 const byName=n=>rules.DRINK_ITEMS.find(x=>x.name===n);
 assert.equal(byName('白湯').nature,'平');assert.equal(byName('白湯').servedWarm,true);
 assert.equal(byName('葛湯').nature,null);assert.equal(byName('葛湯').servedWarm,true);
 for(const name of ['コーヒー','デカフェコーヒー','ルイボスティー'])assert.equal(byName(name).nature,null);
 for(const name of ['はとむぎ茶','小豆茶','黒豆茶']){assert.ok(byName(name).inferredTags.length);assert.ok(byName(name).inference_basis);}
 assert.ok(!byName('とうもろこし茶').tags.includes('drain_damp'));
});
test('pressure rise alone never creates a hot-weather explanation for drinks',()=>{
 const p=food('today',{triggerKey:'pressure_up',secondaryKey:null,subLabels:[],symptomFocus:'fatigue'});
 for(const d of p.action_cards.find(x=>x.key==='drink').item_details)assert.doesNotMatch(d.public_reason,/暑さが気になる日の一杯として選びました/);
});
test('today has actual named food and drink actions; tomorrow breakfast remains a proposal',()=>{
 for(const mode of ['today','tomorrow']){
  const p=food(mode),items=actions.buildDisplayedCareItems({food:p,sourceMode:mode});
  if(mode==='today'){
   assert.deepEqual(p.action_cards.filter(x=>x.primary||x.prominent).map(x=>x.key),['choice','drink']);
   assert.ok(items.some(x=>x.meta.record_semantics==='drink_consumed'&&x.label.endsWith('を飲んだ')));
   assert.ok(items.some(x=>x.meta.record_semantics==='ingredient_consumed'&&x.label.endsWith('を食べた')));
  }else{
   assert.equal(p.action_cards[0].key,'caution');
   assert.ok(items.some(x=>x.meta.consumption_slot==='tonight'));
   assert.ok(!items.some(x=>x.meta.consumption_slot==='breakfast'));
   assert.match(p.action_cards.find(x=>x.key==='night').body,/満腹なら追加する必要はありません/);
  }
 }
});
test('API rejects a checked tomorrow-breakfast action before saving',async()=>{
 // Execute the actual POST handler with authenticated stubs and an intentionally
 // incomplete payload: the explicit future-breakfast guard must run before DB access.
 const start=api.indexOf('export async function POST(req) {');
 const end=api.indexOf('\nexport async function ',start+10);
 const code=api.slice(start,end<0?undefined:end).replace('export async function POST','async function POST');
 const handler=new Function('requireUser','getRecordsAccess','NextResponse','normalizeDate','SOURCE_MODE_VALUES','DOMAIN_VALUES','compact',code+';return POST;')(
  async()=>({user:{id:'test'}}),async()=>({records_write_enabled:true}),{json:(body,options)=>({body,status:options?.status||200})},v=>v,new Set(['today','tomorrow']),new Set(['eat']),(v,n)=>String(v||'').slice(0,n));
 const result=await handler({json:async()=>({source_mode:'tomorrow',checked:true,item_snapshot:{meta:{consumption_slot:'breakfast'}}})});
 assert.equal(result.status,400);assert.match(result.body.error,/実際に取り入れてから/);
});
test('food and drink identity and selection provenance survive actual API sanitizer and AI serialization',()=>{
 for(const item of actions.buildDisplayedCareItems({food:food()} ).filter(x=>['ingredient_consumed','drink_consumed'].includes(x.meta.record_semantics))){
  const saved=clean(item,{canonicalKey:item.canonical_key,label:item.label,detail:item.detail,kind:item.kind,domain:item.domain,sourceMode:'today',entryOrigin:'daily_care_card'});
  assert.equal(saved.meta.consumed_id,item.meta.consumed_id);assert.equal(saved.meta.consumed_name,item.meta.consumed_name);
  assert.equal(saved.meta.selection_basis.nature,item.meta.selection_basis.nature);
  const row={...item,item_snapshot:saved,target_date:'2026-09-22',source_date:'2026-09-21',source_mode:'tomorrow',checked_at:'2026-09-21T12:00:00Z'};
  const ai=analysis.trimRecordForAi({date:'2026-09-22',care_actions:[row]});
  assert.ok(JSON.stringify(ai).includes(item.meta.consumed_name));
  assert.ok(JSON.stringify(ai).includes('2026-09-21'));
  assert.ok(JSON.stringify(ai).includes(item.meta.record_semantics));
 }
});
test('proposed care snapshot never labels an unperformed ingredient as consumed',()=>{
 for(const mode of ['today','tomorrow']){
  const snapshot=snapshots.buildDisplayedCareSnapshot({carePlan:{night_food:food(mode)},mode});
  assert.ok(snapshot.food.proposals.length>=5);
  assert.ok(snapshot.exact_visible_items.filter(x=>x.domain==='eat').every(x=>!/(を食べた|を飲んだ)$/.test(x.label)));
  if(mode==='tomorrow')assert.ok(snapshot.food.proposals.some(x=>x.slot==='breakfast'));
 }
});
test('actual consumption on recent days rotates eligible ingredients; old adoption is not inferred as consumption',()=>{
 const o=option('damp',['fluid_damp']);const first=tcm.selectTcmFoods(o)[0];
 const row={target_date:'2026-09-21',source_date:'2026-09-21',item_snapshot:{meta:{record_semantics:'ingredient_consumed',consumed_id:first.id}}};
 const changed=tcm.selectTcmFoods({...o,theme:{...o.theme,completed_care:[row]}})[0];assert.notEqual(changed.id,first.id);
 const legacy={...row,item_snapshot:{meta:{record_semantics:'ingredients_or_eating_pattern',consumed_id:first.id}}};
 assert.equal(tcm.selectTcmFoods({...o,theme:{...o.theme,completed_care:[legacy]}})[0].id,first.id);
});
test('food commerce carries traditional care direction, not ingredients or nutrition procurement',()=>{
 const p=food();assert.deepEqual(p.commerce_context.product_role_keys,['daily_tea','food_therapy']);
 assert.deepEqual(p.commerce_context.nutrition_need_keys,[]);
 for(const f of p.selected_foods)assert.ok(!JSON.stringify(p.commerce_context).includes(f.id));
});
test('all body/weather/date modes produce traceable named foods with no public source URLs or technical theory labels',()=>{
 for(const trigger of ['none','damp','dry','heat','cold','pressure_up','pressure_down','temp_shift'])
 for(const symptomFocus of ['fatigue','sleep','digestion','swelling','neck_shoulder','headache'])
 for(const labels of [['qi_deficiency'],['fluid_deficiency'],['qi_stagnation'],['blood_deficiency']])
 for(const mode of ['today','tomorrow']){
  const p=food(mode,{triggerKey:trigger,secondaryKey:null,symptomFocus,subLabels:labels});
  for(const c of p.action_cards.filter(c=>['choice','alternative','night'].includes(c.key)))for(const d of c.item_details){
   assert.equal(d.focus_ingredients.length,1);assert.equal(d.consumed_name,d.label);
   assert.ok(d.meal_example);assert.ok(d.public_reason.includes(d.label));
   assert.doesNotMatch(d.public_reason,/https?:|健脾|補気|滋陰|生津|利水|温性|平性|ビタミン|たんぱく質/);
  }
 }
});
test('actual shop query planner stays in tea/food-therapy intents for all seven care policies',async()=>{
 const modules=await Promise.all(['pointTools','lifestyleProductFit','lifestyleShopContext','rakutenSearchIntent'].map(n=>load(`lib/care-navi/${n}.js`)));
 const deps=Object.assign({},...modules,{enforcePublicApiRateLimit:async()=>null});
 const source=await fs.readFile(new URL('../app/api/care-navi/rakuten/route.js',import.meta.url),'utf8');
 const query=new Function(...Object.keys(deps),source.replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];/gm,'').replace(/export (const|async function|function) /g,'$1 ')+';return buildQueryPlans;')(...Object.values(deps));
 for(const policy of ['sasaeru','nukumeru','uruosu','nagasu','meguraseru','yurumeru','shizumeru']){
  const c=daily.enhanceFoodContext({theme:{policies:[{key:policy}],trigger_key:'damp'},targetDate:'2026-09-22',subLabels:['qi_deficiency']}).commerce_context;
  const plans=query({category:'eat',policyKeys:c.policy_keys,symptomKey:'fatigue',lifeKeys:[],priceBand:'all',foodFunctionKeys:c.tcm_function_keys,foodNeedKeys:c.nutrition_need_keys,foodProductRoleKeys:c.product_role_keys,limit:12});
  assert.ok(plans.length,policy);
  for(const p of plans){assert.ok(['warm_drink','ingredient'].includes(p.intentType),JSON.stringify(p));assert.doesNotMatch(p.keyword,/鶏肉|豚肉|冷凍.*宅食|プロテイン|ビタミンB/);}
 }
});
test('compatibility ingredient suggestions match the actual TCM cards',()=>{
 for(const mode of ['today','tomorrow']){
  const p=food(mode);
  assert.deepEqual(p.ingredient_suggestions,p.selected_foods.map(x=>x.name));
  assert.equal(p.ingredient_count,81);
  assert.equal(p.drink_model_version,'v7.79.68-drink-audit');
 }
});
