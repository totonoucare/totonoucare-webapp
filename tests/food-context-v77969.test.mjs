import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';
const {load}=await createScenarioRunner();
const tcm=await load('lib/radar_v1/careRules/foodTcm.js');
const ui=await load('app/radar/utils.js');
const options={subLabels:['fluid_damp','blood_stasis'],symptomFocus:'headache',theme:{trigger_key:'pressure_down',policies:[{key:'yurumeru'},{key:'nagasu'}]}};
test('pressure and damp constitution do not invent humid weather or digestive complaint',()=>{
 const plan=tcm.buildTcmFoodPlan({...options,targetDate:'2026-09-22',mode:'tomorrow'});
 assert.doesNotMatch(plan.subtraction_action.reason,/湿気/);
 for(const f of tcm.rankTcmFoods(options).filter(x=>x.matches[0]?.key==='健脾')){
  const d=tcm.tcmFoodDetail(f,{targetDate:'2026-09-22'});
  assert.doesNotMatch(d.public_reason,/食後の重さ|胃腸の不調/);
  assert.match(d.public_reason,/消化・吸収.*重だるさ/);
  assert.ok(d.public_reason.length<=100);
 }
});
test('displayed tomorrow caution uses tomorrow trigger, even when stored care was dry',()=>{
 const riskContext={summary:{main_trigger_exact:'heat'},constitution_context:{sub_labels:[],symptom_focus:'headache'},target:{target_date:'2026-09-22',signal:1}};
 const plan=ui.resolveDisplayedCarePlan({forecast:{target_date:'2026-09-22',signal:1},riskContext,mode:'tomorrow',targetDate:'2026-09-22',storedCarePlan:{care_theme:{trigger_key:'dry'}}});
 assert.equal(plan.care_theme.trigger_key,'heat');
 assert.equal(plan.tomorrow_food_context.subtraction_action.id,'night-hot');
});
test('30-day matched-food rotation includes multiple main proteins without forcing them daily',()=>{
 let proteinDays=0;const names=new Set();const all=new Set();
 for(let day=1;day<=30;day++){
  const targetDate=`2026-09-${String(day).padStart(2,'0')}`;
  const foods=tcm.selectTcmFoods({...options,targetDate});
  assert.equal(new Set(foods.map(f=>f.id)).size,3);
  assert.ok(foods.every(f=>f.eligible&&f.matches.length));
  if(foods[0].role==='protein')proteinDays++;
  foods.forEach(f=>{all.add(f.name);if(f.role==='protein')names.add(f.name)});
 }
 assert.ok(names.size>=3,[...names].join(','));assert.ok(proteinDays>0&&proteinDays<30);assert.ok(all.size>=10);
 console.log('v69 rotation',JSON.stringify({proteinDays,proteinNames:[...names],uniqueFoods:all.size}));
});
test('warming and sweating no longer unconditional in result and AI context',async()=>{
 const labels=await fs.readFile(new URL('../lib/diagnosis/v2/labels.js',import.meta.url),'utf8');
 const ai=await fs.readFile(new URL('../lib/records/constitutionReasoning.js',import.meta.url),'utf8');
 assert.doesNotMatch(labels,/汗をかく習慣|温めながら軽く動かす/);
 assert.match(labels,/冷えを伴うとき/);assert.match(ai,/冷えを伴う場合/);
});
