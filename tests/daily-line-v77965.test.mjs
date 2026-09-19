import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createScenarioRunner,scenarios} from './helpers/forecast-scenarios.mjs';
const {load,run}=await createScenarioRunner();
const daily=await load('lib/radar_v1/careRules/dailyCareV2.js'),ui=await load('app/radar/utils.js'),items=await load('lib/radar_v1/careActionItems.js'),images=await load('lib/radar_v1/careMovementImages.js');
const symptoms=['fatigue','sleep','digestion','neck_shoulder','low_back_pain','swelling','headache','dizziness','mood'];
function theme(extra={}){return {target_date:'2026-09-19',mode:'today',trigger_key:'damp',sub_labels:['fluid_damp'],symptom_focus:'fatigue',policies:[{key:'nagasu'},{key:'sasaeru'}],...extra};}
function history(care,date){return {domain:'loosen',kind:'tsubo_line_care',checked_at:date+'T10:00:00+09:00',target_date:date,item_snapshot:{meta:{rule_id:care.id,meridian_code:care.meridian_code}}};}

test('unchecked profiles receive relevant daily line care with recorded selection provenance',async()=>{
 for(const symptom of symptoms)for(const mode of ['today','tomorrow']){
  const t=theme({symptom_focus:symptom,mode});const care=daily.buildMeridianLineCare({theme:t});
  assert.ok(care);assert.equal(care.selection_source,'daily');assert.equal(care.selection_basis.checked_rank,null);
  assert.equal(care.selection_basis.symptom,symptom);assert.doesNotMatch(care.selection_reason,/チェックで選んだ/);
  const row=items.buildDisplayedCareItems({tsuboSet:{line_care:care}}).find(x=>x.kind==='tsubo_line_care');
  assert.equal(row.meta.selection_reason,care.selection_reason);assert.deepEqual(row.meta.selection_basis,care.selection_basis);
  const image=images.getCareMovementImage(care.id);await access(new URL('../public'+image.src,import.meta.url));
 }
});
test('both checked lines receive their bonuses and stronger daily fit can choose another line',()=>{
 const t=theme({primary_meridian:'lung_li',secondary_meridian:'spleen_st',symptom_focus:'digestion'});
 const ranks=daily.rankDailyMeridianLines({theme:t});
 assert.equal(ranks.find(x=>x.code==='spleen_st').checked,2);
 const care=daily.buildMeridianLineCare({theme:t});assert.equal(care.meridian_code,'spleen_st');assert.equal(care.selection_source,'combined');
 const independent=daily.buildMeridianLineCare({theme:{...t,secondary_meridian:null}});
 assert.equal(independent.meridian_code,'spleen_st');assert.equal(independent.selection_source,'daily');
 assert.equal(daily.buildMeridianLineCare({theme:{}}),null);
});
test('completed history changes only near-best choices; same-day and unchecked rows do not affect selection',()=>{
 const t=theme(),ranks=daily.rankDailyMeridianLines({theme:t});
 const initial=daily.buildMeridianLineCare({theme:t});const old=history(initial,'2026-09-18');
 const next=daily.buildMeridianLineCare({theme:{...t,completed_care:[old]}});
 assert.notEqual(next.id,initial.id);assert.ok(ranks.find(x=>x.code===next.meridian_code).score>=ranks[0].score-2);
 assert.deepEqual(daily.buildMeridianLineCare({theme:{...t,completed_care:[history(initial,t.target_date),{...old,checked_at:null}]}}),initial);
 assert.deepEqual(next,daily.buildMeridianLineCare({theme:{...t,completed_care:[old]}}));
});
test('daily trigger, symptom and constitution change the ranking; Japanese legacy labels agree',()=>{
 const base={target_date:'2026-09-19',policies:[]};
 assert.equal(daily.rankDailyMeridianLines({theme:{...base,trigger_key:'damp',symptom_focus:'digestion'}})[0].code,'spleen_st');
 assert.equal(daily.rankDailyMeridianLines({theme:{...base,trigger_key:'cold',symptom_focus:'low_back_pain'}})[0].code,'kidney_bl');
 const en=daily.rankDailyMeridianLines({theme:{...base,sub_labels:['fluid_damp']}}),ja=daily.rankDailyMeridianLines({theme:{...base,sub_labels:['水滞']}});
 assert.deepEqual(en,ja);
});
test('30-day sequences use more than a fixed three motions while preserving forecast and point selection',()=>{
 for(const checked of [false,true]){
  const historyRows=[],lines=new Set(),motions=new Set();
  for(let day=1;day<=30;day++){
   const t=theme({target_date:`2026-09-${String(day).padStart(2,'0')}`,trigger_key:['damp','cold','pressure_down'][day%3],primary_meridian:checked?'kidney_bl':null,completed_care:historyRows});
   const care=daily.buildMeridianLineCare({theme:t});lines.add(care.meridian_code);motions.add(care.id);historyRows.push(history(care,t.target_date));
  }
  assert.ok(lines.size>=2);assert.ok(motions.size>=4,`${checked}: ${[...motions]}`);
 }
 const r=run(scenarios[2][1],1,'fatigue');const before=JSON.stringify(r.forecast);
 const args={forecast:r.forecast,riskContext:r.forecast.computed.radar_plan_meta.risk_context,mode:'today',targetDate:'2026-09-19',symptomFocus:'fatigue'};
 const p=ui.resolveDisplayedCarePlan(args),q=ui.resolveDisplayedCarePlan({...args,completedCare:[history(p.night_tsubo_set.line_care,'2026-09-18')]});
 assert.equal(JSON.stringify(r.forecast),before);assert.deepEqual(p.night_tsubo_set.points,q.night_tsubo_set.points);
});
