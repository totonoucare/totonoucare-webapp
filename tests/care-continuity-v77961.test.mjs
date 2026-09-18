import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenarioRunner, scenarios } from './helpers/forecast-scenarios.mjs';
const {run,load}=await createScenarioRunner();
const ui=await load('app/radar/utils.js');
const daily=await load('lib/radar_v1/careRules/dailyCareV2.js');
const actions=await load('lib/radar_v1/careActionItems.js');
const input=run(scenarios[2][1],1,'fatigue');
function care(date,completedCare=[],r=input,symptom='fatigue') {
 return ui.resolveDisplayedCarePlan({forecast:{...r.forecast,target_date:date},riskContext:r.forecast.computed.radar_plan_meta.risk_context,mode:'today',targetDate:date,symptomFocus:symptom,completedCare});
}
function rows(plan,date) {
 return actions.buildDisplayedCareItems({lifestylePlan:plan.lifestyle_plan,food:plan.night_food,tsuboPoints:plan.night_tsubo_set.points,tsuboSet:plan.night_tsubo_set}).filter(i=>i.kind==='lifestyle_step'&&i.meta.order===1||i.kind==='food_choice_item'||i.domain==='loosen').map(i=>({...i,target_date:date,checked_at:date+'T12:00:00+09:00',item_snapshot:{...i}}));
}

test('continuity uses only completed earlier days within the window',()=>{
 const done=rows(care('2026-09-10'),'2026-09-10');
 const mixed=[...done,...done.map(x=>({...x,checked_at:null})),...done.map(x=>({...x,target_date:'2026-09-11'})),...done.map(x=>({...x,target_date:'2026-08-01'}))];
 assert.equal(daily.recentCompletedCare(mixed,'2026-09-11').length,done.length);
 assert.deepEqual(care('2026-09-11',done),care('2026-09-11',mixed));
 assert.deepEqual(care('2026-09-11'),care('2026-09-11',done.map(x=>({...x,checked_at:null}))));
});

test('recent setup is deprioritized when a suitable alternate exists; points preserve selection',()=>{
 const history=rows(care('2026-09-10'),'2026-09-10');
 const fresh=care('2026-09-11'); const personalized=care('2026-09-11',history);
 assert.notEqual(personalized.lifestyle_plan.primary_action.id,history.find(x=>x.domain==='live').meta.rule_id);
 assert.deepEqual(personalized.night_tsubo_set.points,fresh.night_tsubo_set.points);
 assert.deepEqual(personalized.night_tsubo_set.line_care,fresh.night_tsubo_set.line_care);
 assert.equal(fresh.night_tsubo_set.continuity_note,'');
 assert.match(personalized.night_tsubo_set.continuity_note,/ケアした記録/);
 assert.deepEqual(personalized,care('2026-09-11',history));
 assert.ok(!JSON.stringify(personalized).includes('checked_at'));
});

test('recording this day does not change this day’s selected care',()=>{
 const initial=care('2026-09-11');
 assert.deepEqual(initial,care('2026-09-11',rows(initial,'2026-09-11')));
 assert.equal(initial.lifestyle_plan.primary_action.label,actions.buildDisplayedCareItems({lifestylePlan:initial.lifestyle_plan})[0].label);
});

for(const length of [14,30]) test(`${length}-day changing-weather sequences keep forecast and point rules stable, with usable care choices`,()=>{
 const weather=[0,1,2,5,14,10,7,0,2,3,14,10,9,13];
 for(const [profile,symptom] of [[1,'fatigue'],[2,'neck_shoulder'],[1,'headache']]) {
  const history=[],life=new Set(),food=new Set(); let repeatMeals=0,previous='';
  for(let d=0;d<length;d++) {
   const date=new Date(Date.UTC(2026,8,1+d)).toISOString().slice(0,10);
   const r=run(scenarios[weather[d%weather.length]][1],profile,symptom);
   const untouched=JSON.stringify(r.forecast);
   const base=care(date,[],r,symptom), plan=care(date,history,r,symptom);
   assert.equal(JSON.stringify(r.forecast),untouched);
   assert.deepEqual(plan.night_tsubo_set.points,base.night_tsubo_set.points);
   assert.deepEqual(plan.night_tsubo_set.line_care,base.night_tsubo_set.line_care);
   const primary=plan.lifestyle_plan.primary_action;
   if(primary) {assert.ok(primary.short_action);assert.ok(primary.felt_sense);life.add(primary.id);}
   assert.ok(plan.night_food.practical_tip);
   const meal=plan.night_food.primary_action;assert.ok(meal.label);food.add(meal.id);
   if(meal.id===previous) repeatMeals++;previous=meal.id;
   history.push(...rows(plan,date));
  }
  assert.ok(life.size>=3,`${profile}/${symptom}: lifestyle ${life.size}`);
  assert.ok(food.size>=4,`${profile}/${symptom}: food ${food.size}`);
  assert.ok(repeatMeals<=Math.floor(length/4),`${profile}/${symptom}: repeated meals ${repeatMeals}`);
 }
});
