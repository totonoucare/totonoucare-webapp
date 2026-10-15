import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createScenarioRunner,scenarios} from './helpers/forecast-scenarios.mjs';

const runner=await createScenarioRunner();
const tcm=await runner.load('lib/radar_v1/careRules/foodTcm.js');
const recipes=await runner.load('lib/radar_v1/careRules/foodCombinationRecipes.js');
const daily=await runner.load('lib/radar_v1/careRules/dailyCareV2.js');
const actions=await runner.load('lib/radar_v1/careActionItems.js');
const snapshots=await runner.load('lib/radar_v1/displayedCareSnapshot.js');
const drinks=await runner.load('lib/radar_v1/careRules/drinkRules.js');
const labels=['qi_deficiency','qi_stagnation','blood_deficiency','blood_stasis','fluid_deficiency','fluid_damp'];
function options({subLabels=['qi_deficiency'],trigger='dry',secondary=null,symptom='fatigue',signal=1,date='2026-10-13',mode='today',completed=[]}={}) {
 const theme=daily.buildDailyCareTheme({mode,targetDate:date,triggerKey:trigger,secondaryKey:secondary,signal,symptomFocus:symptom,
  riskContext:{constitution_context:{core_code:'accel_batt_standard',sub_labels:subLabels,symptom_focus:symptom}}});
 Object.defineProperty(theme,'completed_care',{value:completed,enumerable:false});
 return {theme,subLabels,symptomFocus:symptom,targetDate:date,mode};
}
function plan(o){return tcm.buildTcmFoodPlan({...o,drinkCard:drinks.buildDrinkActionCard({mode:o.mode,targetDate:o.targetDate,triggerKey:o.theme.trigger_key,subLabels:o.subLabels,symptomFocus:o.symptomFocus})});}

test('106 explicit recipes cover all 81 food entries with two distinct known ingredients',()=>{
 const inventory=tcm.FOOD_ITEMS.filter(f=>f.role!=='drink');
 assert.equal(inventory.length,81);assert.equal(recipes.FOOD_COMBINATION_RECIPES.length,106);
 const names=new Set(inventory.map(f=>f.name)),used=new Set();
 for(const r of recipes.FOOD_COMBINATION_RECIPES){
  assert.equal(r.foods.length,2);assert.equal(new Set(r.foods).size,2);
  for(const n of r.foods){assert.ok(names.has(n),n);assert.ok(r.title.includes(n),r.title);used.add(n);}
  assert.ok(r.preparation.length>8);assert.ok(r.format);
 }
 assert.equal(used.size,81);
});
test('uncertain traditional functions remain blank; culinary companions receive no invented function',()=>{
 for(const name of ['納豆','小松菜','ブロッコリー','しめじ','えのき','まいたけ','なめこ']){
  const food=tcm.FOOD_ITEMS.find(f=>f.name===name);assert.deepEqual(food.tcm.functions,[]);
 }
 const o=options({subLabels:['qi_stagnation'],trigger:'pressure_up',symptom:'headache'});
 const r=tcm.rankFoodCombinations(o).find(r=>r.foods.some(f=>f.name==='納豆'));
 assert.ok(r);const p=tcm.foodCombinationDetail(r,o),role=p.ingredient_roles.find(r=>r.name==='納豆');
 assert.equal(role.source,'culinary');assert.equal(role.function,null);
 for(const evidence of p.selection_basis.evidence)assert.ok(!evidence.matched_foods.some(f=>f.name==='納豆'));
});
test('weather contribution increases with personalized load, while retaining body evidence',()=>{
 const ranked=[0,1,2].map(signal=>tcm.rankFoodCombinations(options({subLabels:['fluid_deficiency'],signal})));
 const values=ranked.map(rs=>rs.find(r=>r.foods.some(f=>f.name==='豆腐')&&r.foods.some(f=>f.name==='白ごま')));
 assert.ok(values.every(Boolean));
 assert.ok(values[0].basis.weather<values[1].basis.weather&&values[1].basis.weather<values[2].basis.weather);
 for(const c of values){assert.ok(c.evidence.some(e=>e.source==='constitution'));assert.ok(c.evidence.some(e=>e.source==='weather'));}
 const p=tcm.foodCombinationDetail(values[2],options({subLabels:['fluid_deficiency'],signal:2}));
 assert.match(p.public_reason,/乾燥/);assert.match(p.public_reason,/乾きやすい/);
 assert.ok(p.reasons.some(r=>r.label==='体質'));assert.ok(p.reasons.some(r=>r.label==='天気'));
});
test('same-function matches retain constitution, symptom and weather as separate evidence',()=>{
 const o=options({trigger:'damp',signal:2});
 const c=tcm.rankFoodCombinations(o).find(c=>c.foods.some(f=>f.name==='かぼちゃ')&&c.foods.some(f=>f.name==='小豆'));
 for(const source of ['constitution','weather','symptom'])assert.ok(c.evidence.some(e=>e.source===source&&e.matched_functions.includes('健脾')));
});
test('pressure and temperature swings use care-policy provenance and do not imply heat',()=>{
 for(const trigger of ['pressure_up','pressure_down','temp_shift']){
  const o=options({trigger,symptom:'headache',subLabels:['qi_stagnation'],signal:2});
  const c=tcm.selectFoodCombinations(o)[0];
  const weather=c.evidence.filter(e=>e.source==='weather');
  assert.ok(weather.length);assert.ok(weather.every(e=>e.via==='care_policy'));
  assert.equal(c.context.thermal,'neutral');
  assert.doesNotMatch(tcm.foodCombinationDetail(c,o).public_reason,/今日の暑さ|今日の寒さ/);
 }
});
test('strong-load proposals match the weather direction; weak-load days still have body-fit recipes',()=>{
 for(const trigger of ['cold','heat','damp','dry'])for(const subLabels of labels.map(x=>[x])){
  const o=options({trigger,signal:2,subLabels});
  const selected=tcm.selectFoodCombinations(o);
  assert.ok(selected[0].evidence.some(e=>e.source==='weather'));
 }
 const o=options({trigger:'none',signal:0});
 const selected=tcm.selectFoodCombinations(o);
 assert.ok(selected[0].evidence.some(e=>e.source==='constitution'));
 assert.ok(!selected[0].evidence.some(e=>e.source==='weather'));
});
test('food nature restrictions survive cooking temperature and mixed hot/cold weather',()=>{
 for(const [trigger,secondary] of [['cold',null],['heat',null],['heat','cold'],['pressure_up','cold']]){
  const o=options({trigger,secondary,signal:2});
  const ctx=tcm.foodCombinationContext(o);
  for(const c of tcm.rankFoodCombinations(o))for(const f of c.foods){
   if(ctx.thermal==='warm')assert.ok(!['寒','涼'].includes(f.tcm.nature),c.name);
   if(ctx.thermal==='cool')assert.ok(!['温','熱'].includes(f.tcm.nature),c.name);
   if(ctx.thermal==='mixed')assert.equal(f.tcm.nature,'平',c.name);
  }
 }
});
test('matching-food rotation is stable within date and diverse across two weeks',()=>{
 const sequence=[];
 for(let i=0;i<14;i++){
  const date=new Date(Date.UTC(2026,9,13+i)).toISOString().slice(0,10);
  const o=options({date,trigger:'cold',symptom:'headache',subLabels:['qi_stagnation']});
  const a=tcm.selectFoodCombinations(o),b=tcm.selectFoodCombinations(o);
  assert.deepEqual(a.map(x=>x.id),b.map(x=>x.id));
  sequence.push(a[0]);
 }
 assert.ok(new Set(sequence.map(x=>x.id)).size>=8);
 assert.ok(new Set(sequence.map(x=>x.format)).size>=3);
});
test('recent actual consumption is avoided when matching fresh recipes remain; an old proposal is not consumption',()=>{
 const original=options({trigger:'none'}),first=tcm.selectFoodCombinations(original)[0];
 const rows=first.foods.map(f=>({target_date:'2026-10-12',source_date:'2026-10-12',checked_at:'2026-10-12T12:00:00Z',item_snapshot:{meta:{record_semantics:'ingredient_consumed',consumed_id:f.id}}}));
 const fresh=tcm.selectFoodCombinations(options({trigger:'none',completed:rows}))[0];
 assert.ok(fresh.foods.every(f=>!first.foods.some(g=>g.id===f.id)));
 const proposals=rows.map(r=>({...r,item_snapshot:{meta:{...r.item_snapshot.meta,record_semantics:'ingredients_or_eating_pattern'}}}));
 assert.equal(tcm.selectFoodCombinations(options({trigger:'none',completed:proposals}))[0].id,first.id);
});
test('a pair has two separate stable consumption actions; no pair-consumed action is generated',()=>{
 const p=plan(options());const items=actions.buildDisplayedCareItems({food:p,sourceMode:'today'});
 const main=p.action_cards.find(c=>c.key==='choice');
 const records=items.filter(i=>i.kind==='food_choice_item');
 assert.equal(records.length,2);assert.notEqual(records[0].canonical_key,records[1].canonical_key);
 for(const record of records){
  assert.equal(record.meta.record_semantics,'ingredient_consumed');
  assert.ok(main.items.includes(record.meta.consumed_name));
  const expected=actions.buildCareActionKey({domain:'eat',kind:'ingredient_consumed',identity:record.meta.consumed_id});
  assert.equal(record.canonical_key,expected);assert.equal(record.label,record.meta.consumed_name+'を食べた');
  assert.equal(record.meta.selection_basis.combination_id,main.proposal.id);
 }
 const checked=[{...records[0],item_snapshot:records[0],source_mode:'today',target_date:'2026-10-13',checked_at:'2026-10-13T12:00:00Z'}];
 assert.equal(actions.summarizeCareActions(checked).count,1);
 assert.ok(!records[0].detail.includes('両方を食べた'));
});
test('tomorrow food pairs are proposals; only actual tonight food and drink can be recorded',()=>{
 const p=plan(options({mode:'tomorrow'}));
 const items=actions.buildDisplayedCareItems({food:p,sourceMode:'tomorrow'});
 assert.ok(p.action_cards.find(c=>c.key==='choice').item_details.every(d=>d.recordable===false));
 assert.ok(items.every(i=>!['breakfast','next_day'].includes(i.meta.consumption_slot)));
 assert.ok(items.some(i=>i.meta.consumption_slot==='tonight'));
});
test('API rejects both old breakfast and new next-day food records before any DB access',async()=>{
 const api=await fs.readFile(new URL('../app/api/radar/care-actions/route.js',import.meta.url),'utf8');
 const start=api.indexOf('export async function POST(req) {'),end=api.indexOf('\nexport async function ',start+10);
 const code=api.slice(start,end<0?undefined:end).replace('export async function POST','async function POST');
 const handler=new Function('requireUser','getRecordsAccess','NextResponse','normalizeDate','SOURCE_MODE_VALUES','DOMAIN_VALUES','compact',code+';return POST;')(
  async()=>({user:{id:'test'}}),async()=>({records_write_enabled:true}),{json:(body,options)=>({body,status:options?.status||200})},v=>v,new Set(['today','tomorrow']),new Set(['eat']),(v,n)=>String(v||'').slice(0,n));
 for(const slot of ['breakfast','next_day']){
  const result=await handler({json:async()=>({source_mode:'tomorrow',checked:true,item_snapshot:{meta:{consumption_slot:slot}}})});
  assert.equal(result.status,400);assert.match(result.body.error,/実際に取り入れてから/);
 }
});
test('actual food component shows two independent controls and no future-consumption buttons',async()=>{
 const source=await fs.readFile(new URL('../app/radar/FoodCombinationCard.jsx',import.meta.url),'utf8');
 const h=(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(x=>x!==null&&x!==false&&x!==undefined)});
 const theorySource=await fs.readFile(new URL('../app/radar/CareTheoryDetails.jsx',import.meta.url),'utf8');
 const CareTheoryDetails=new Function('h',theorySource.replace(/^import .*;\r?\n/gm,'').replace('export default function','function')+'\nreturn CareTheoryDetails;')(h);
 const Component=new Function('h','CareTheoryDetails',source.replace(/^import .*;\r?\n/gm,'').replace('export default function','function')+'\nreturn FoodCombinationCard;')(h,CareTheoryDetails);
 const p=plan(options()),card=p.action_cards.find(c=>c.key==='choice');
 const records=actions.buildDisplayedCareItems({food:p}).filter(i=>i.kind==='food_choice_item'),clicked=[];
 const renderAction=item=>h('button',{'data-id':item.canonical_key,onClick:()=>clicked.push(item.meta.consumed_id)},'食べた');
 function nodes(tree,type){if(!tree||typeof tree!=='object')return [];return [...(tree.type===type?[tree]:[]),...tree.children.flatMap(c=>nodes(c,type))];}
 const tree=Component({card,actions:records,renderAction});
 const buttons=nodes(tree,'button');assert.equal(buttons.length,2);
 assert.notEqual(buttons[0].props['data-id'],buttons[1].props['data-id']);
 buttons[0].props.onClick();assert.deepEqual(clicked,[records[0].meta.consumed_id]);
 assert.equal(nodes(tree,'div').filter(n=>n.props.role==='group').length,2);
 const nextDay=plan(options({mode:'tomorrow'})).action_cards.find(c=>c.key==='choice');
 assert.equal(nodes(Component({card:nextDay,actions:[],renderAction}),'button').length,0);
 assert.equal(Component({card:{items:[]},renderAction}),null);
});
test('API sanitizer preserves bounded source evidence and tolerates old food evidence',async()=>{
 const api=await fs.readFile(new URL('../app/api/radar/care-actions/route.js',import.meta.url),'utf8');
 const block=api.slice(api.indexOf('function cleanSnapshot('),api.indexOf('\nasync function ',api.indexOf('function cleanSnapshot(')));
 const {cleanDrinkSelectionBasis}=await runner.load('lib/radar_v1/drinkSelectionSnapshot.js');
 const clean=new Function('compact','cleanDrinkSelectionBasis',block+';return cleanSnapshot;')((v,n)=>String(v||'').trim().slice(0,n),cleanDrinkSelectionBasis);
 const item=actions.buildDisplayedCareItems({food:plan(options({signal:2}))}).find(i=>i.kind==='food_choice_item');
 const saved=clean(item,{canonicalKey:item.canonical_key,label:item.label,kind:item.kind,domain:'eat',sourceMode:'today'});
 assert.equal(saved.meta.consumed_id,item.meta.consumed_id);
 assert.equal(saved.meta.selection_basis.combination_id,item.meta.selection_basis.combination_id);
 assert.ok(saved.meta.selection_basis.evidence.length);
 assert.ok(saved.meta.selection_basis.evidence.some(e=>e.source==='weather'));
 const old=clean({meta:{record_semantics:'ingredient_consumed',selection_basis:{nature:'平',matched_context:'体質'}}},{domain:'eat'});
 assert.equal(old.meta.selection_basis.nature,'平');assert.deepEqual(old.meta.selection_basis.evidence,[]);
 const hostile=clean({...item,meta:{...item.meta,selection_basis:{...item.meta.selection_basis,evidence:Array(30).fill({source:'weather',weight:Infinity,score:-20,matched_functions:Array(30).fill('test')})}}},{domain:'eat'});
 assert.equal(hostile.meta.selection_basis.evidence.length,8);
 assert.ok(hostile.meta.selection_basis.evidence.every(e=>e.weight===0&&e.score===0&&e.matched_functions.length===8));
});
test('display snapshots contain complete proposed combinations without inferring consumption',()=>{
 const p=plan(options()),snapshot=snapshots.buildDisplayedCareSnapshot({carePlan:{night_food:p},mode:'today'});
 assert.equal(snapshot.food.combinations.length,3);
 for(const c of snapshot.food.combinations){assert.equal(c.ingredients.length,2);assert.ok(c.meal_example);assert.doesNotMatch(c.reason,/食べた記録|摂取済み/);}
});
test('all built-in forecast scenarios produce food pairs using the actual diagnosed constitution and personalized load',()=>{
 for(let profile=0;profile<runner.profiles.length;profile++)for(const [name,fn] of scenarios){
  const result=runner.run(fn,profile,'fatigue');
  const p=result.care.night_food;
  assert.ok(p.action_cards.find(c=>c.key==='choice')?.proposal,name);
  assert.ok(Number.isFinite(result.forecast.score_precise_0_10));
  assert.equal(p.selected_combinations.length,3,name);
  assert.ok(p.selected_foods.every(f=>f.id&&f.basis));
 }
});
