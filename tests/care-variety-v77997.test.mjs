import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';
const {load}=await createScenarioRunner();
const rotation=await load('lib/radar_v1/pointRotation.js');
const today=await load('lib/radar_v1/careRules/todayTsuboRules.js');
const daily=await load('lib/radar_v1/careRules/dailyCareV2.js');
const ui=await load('app/radar/utils.js');
const records=await load('lib/radar_v1/careActionItems.js');
const preferences=await load('lib/radar_v1/lifestyleScenePreference.js');
const {ADDITIONAL_LIFESTYLE_CANDIDATES:newActions}=await load('lib/radar_v1/careRules/lifestyleCandidatesV97.js');
const date='2026-10-14';
const done=(code,target_date='2026-10-13',extras={})=>({domain:'loosen',target_date,checked_at:target_date+'T12:00:00+09:00',item_snapshot:{meta:{point_code:code}},...extras});
const rows=[['A',10],['B',9.5],['C',9],['D',7]].map(([code,score])=>({point:{code},score}));
const choose=(extras={})=>rotation.selectMatchedPointCandidate({candidates:rows,targetDate:date,contextKey:'test',...extras});
function within(basis){assert.ok(basis.score>=basis.best_score-basis.near_tie_delta-1e-9);}

test('point rotation uses only the close-fit band and narrows it for a high-load day',()=>{
 const seen=new Set(),high=new Set();
 for(let day=1;day<=14;day++) {
  const targetDate=`2026-10-${String(day).padStart(2,'0')}`;
  const normal=choose({targetDate}),strong=choose({targetDate,signal:2});
  within(normal.basis);within(strong.basis);seen.add(normal.point.code);high.add(strong.point.code);
  assert.deepEqual(normal,choose({targetDate}));
 }
 assert.deepEqual([...seen].sort(),['A','B','C']);assert.deepEqual([...high].sort(),['A','B']);
 assert.equal(choose({candidates:[rows[0],rows[3]]}).point.code,'A');
 for(const targetDate of [null,'bad','2026-02-30'])assert.equal(choose({targetDate}).point.code,'A');
 assert.equal(rotation.shiftPointDate('2026-03-01',-1),'2026-02-28');
});

test('only completed previous-day points affect rotation; checks today never reshuffle today',()=>{
 const eligible=[done('A'),done('B')];
 const ignored=[done('C',date),done('C','2026-10-15'),done('C','2026-10-09'),done('C','2026-10-13',{checked_at:null}),done('C','2026-10-13',{domain:'live'}),done('C','invalid')];
 assert.equal(choose({completedCare:eligible}).point.code,'C');
 assert.deepEqual(choose(),choose({completedCare:ignored}));
 assert.deepEqual(choose({completedCare:eligible}),choose({completedCare:[...eligible,...ignored]}));
 const exhausted=choose({completedCare:[...eligible,done('C')]});within(exhausted.basis);assert.notEqual(exhausted.point.code,'D');
});

test('today accepts the canonical damp label and the old alias without double counting',()=>{
 const input={symptomFocus:'fatigue',triggerKey:'damp',signal:1,targetDate:date,coreCode:'brake_batt_small'};
 const canonical=today.buildTodayTsuboPoints({...input,subLabels:['fluid_damp','qi_deficiency']});
 for(const subLabels of [['dampness','qi_deficiency'],[{code:'fluid_damp'},'qi_deficiency'],['dampness','fluid_damp','qi_deficiency']]) {
  assert.deepEqual(today.buildTodayTsuboPoints({...input,subLabels}),canonical);
 }
 assert.equal(canonical.length,3);assert.equal(new Set(canonical.map(p=>p.code)).size,3);
 canonical.forEach(p=>within(p.care_selection_basis));
 const bridge=today.buildTodayTsuboPoints({symptomFocus:'neck_shoulder',triggerKey:'none',primaryMeridian:'heart_si',targetDate:date,signal:1});
 assert.ok(bridge.some(p=>p.code==='SI3')); // The catalog already declares SI3's neck/shoulder fit.
});

test('actual today wrapper uses the actual secondary weather factor and never invents pressure down',()=>{
 for(const trigger of ['cold','heat','dry','damp','none','temp_shift'])for(const secondary of [null,'dry']) {
  const forecast={target_date:date,signal:1,personal_main_trigger_exact:trigger,personal_secondary_trigger_exact:secondary};
  const riskContext={constitution_context:{symptom_focus:'neck_shoulder',sub_labels:['qi_stagnation'],core_code:'accel_batt_standard'}};
  const factors=ui.getForecastTriggerFactors(forecast);
  const main=factors[0]?.careKey||trigger,second=factors[1]?.careKey||null;
  const actual=ui.buildTodayCarePlan({forecast,riskContext}).night_tsubo_set.points;
  const expected=today.buildTodayTsuboPoints({symptomFocus:'neck_shoulder',triggerKey:main,fallbackTriggerKey:second&&second!==main?second:null,signal:1,subLabels:['qi_stagnation'],coreCode:'accel_batt_standard',targetDate:date});
  assert.deepEqual(actual.map(p=>({code:p.code,basis:p.care_selection_basis})),expected.map(p=>({code:p.code,basis:p.care_selection_basis})),`${trigger}/${secondary}`);
 }
});

function lifestyle({symptom='fatigue',mode='tomorrow',targetDate=date,scene='general',trigger='cold'}={}) {
 return daily.enhanceDailyCarePlan({mode,targetDate,lifestyleScene:scene,symptomFocus:symptom,triggerKey:trigger,forecast:{target_date:targetDate,signal:1},riskContext:{constitution_context:{core_code:'brake_batt_small',sub_labels:['qi_deficiency','fluid_damp']}}}).lifestyle_plan;
}
const visible=plan=>[plan.primary_action,...plan.alternatives].filter(Boolean);

test('new lifestyle actions have concrete instructions, own reasons and symptom/scene limits',()=>{
 assert.equal(newActions.length,5);assert.equal(new Set(newActions.map(row=>row.id)).size,5);
 for(const action of newActions) {
  for(const field of ['text','reason','felt_sense','reset','scene'])assert.ok(action[field],`${action.id}/${field}`);
  assert.equal(action.shop_eligible,false);assert.equal(action.effort,'low');assert.ok(action.symptoms.length>0);
  assert.ok(action.scenes.length>0);assert.deepEqual(action.modes,['today','tomorrow']);
 }
 assert.deepEqual(newActions.find(row=>row.id==='posture-aftermeal-space').symptoms,['digestion']);
 assert.equal(lifestyle({symptom:'dizziness'}).no_suggestion,true);
 for(const mode of ['today','tomorrow'])for(const symptom of ['fatigue','digestion','neck_shoulder','swelling']) {
  const seen=new Set();
  for(let day=1;day<=14;day++) {
   const plan=lifestyle({mode,symptom,targetDate:`2026-10-${String(day).padStart(2,'0')}`});
   seen.add(plan.primary_action.id);
   const common=visible(plan).filter(row=>!row.restricted);
   assert.ok(common.length<=2);assert.equal(new Set(common.map(row=>row.id)).size,common.length);
   for(const action of common) {
    assert.ok(action.selected_because.some(row=>row.axis==='symptom'&&row.key===symptom));
    const score=Object.values(action.score_breakdown).reduce((sum,n)=>sum+Number(n||0),0);
    const best=Math.max(plan.selection_basis.body_score,plan.selection_basis.environment_score);
    assert.ok(score>=best-plan.selection_basis.near_tie_delta-1e-9,`${action.id}: ${score}/${best}`);
   }
  }
  assert.ok(seen.size>=2,`${mode}/${symptom}: ${[...seen]}`);
 }
});

test('lifestyle recording keeps each action’s reason and stable identity when order changes',()=>{
 const a={id:'a',label:'Aの一手',reason:'Aを選んだ理由'},b={id:'b',label:'Bの一手',reason:'Bを選んだ理由'};
 const items=(primary,secondary)=>records.buildDisplayedCareItems({lifestylePlan:{primary_action:primary,alternatives:[secondary],steps:[primary.label,secondary.label],step_ids:[primary.id,secondary.id],lead:'主案の理由'},sourceMode:'today'}).filter(row=>row.kind==='lifestyle_step');
 const first=items(a,b),second=items(b,a);
 for(const item of first) {
  const other=second.find(row=>row.meta.rule_id===item.meta.rule_id);
  assert.equal(item.item_key,other.item_key);assert.equal(item.detail,other.detail);
  assert.equal(item.detail,item.meta.rule_id==='a'?a.reason:b.reason);
 }
});

test('scene preference survives reopening, is scoped to the account and tolerates blocked storage',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 preferences.saveLifestyleScenePreference(storage,'u1','desk');preferences.saveLifestyleScenePreference(storage,'u2','sleep');
 preferences.saveLifestyleScenePreference(storage,null,'screen');
 assert.equal(preferences.readLifestyleScenePreference(storage,'u1'),'desk');assert.equal(preferences.readLifestyleScenePreference(storage,'u2'),'sleep');
 assert.equal(preferences.readLifestyleScenePreference(storage,null),'screen');assert.equal(preferences.readLifestyleScenePreference(storage,'u3'),'general');
 preferences.saveLifestyleScenePreference(storage,'u1','bad');assert.equal(preferences.readLifestyleScenePreference(storage,'u1'),'desk');
 const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 assert.equal(preferences.readLifestyleScenePreference(denied,'u1'),'general');assert.doesNotThrow(()=>preferences.saveLifestyleScenePreference(denied,'u1','desk'));
});

const pickSource=await fs.readFile(new URL('../lib/radar_v1/pickTcmPoints.js',import.meta.url),'utf8');
const pressure=await load('lib/radar_v1/pressureResponse.js');
async function picker({points,history=[],historyError=null,masterError=null}) {
 const calls=[];
 class Query {
  constructor(table){this.table=table;this.filters=[];calls.push({table,filters:this.filters});}
  select(){return this;}eq(key,value){this.filters.push(['eq',key,value]);return this;}gte(key,value){this.filters.push(['gte',key,value]);return this;}lt(key,value){this.filters.push(['lt',key,value]);return this;}not(key,op,value){this.filters.push(['not',key,op,value]);return this;}order(){return this;}limit(){return this;}
  then(resolve,reject){const error=this.table==='radar_tsubo_points'?masterError:historyError;return Promise.resolve({data:this.table==='radar_tsubo_points'?points.filter(p=>p.is_active):history,error}).then(resolve,reject);}
 }
 const dependencies={createClient:()=>({from:table=>new Query(table)}),...rotation,...pressure};
 const stripped=pickSource.replace(/import[\s\S]*?from\s+["'][^"']+["'];\s*/g,'').replace(/export /g,'');
 const pick=new Function(...Object.keys(dependencies),stripped+';return pickTcmPoints;')(...Object.values(dependencies));
 return {pick,calls};
}
const point=(code,extras={})=>({code,is_active:true,point_region:'limb',meridian_code:'st',tcm_actions:['tonify_qi'],tags_symptom:['fatigue'],organ_focus:['spleen'],tags_trigger:['cold'],tags_sub:['qi_deficiency'],...extras});
const pool=[...['ST36','ST37','ST38','ST39'].map(code=>point(code)),point('M1',{mtest_block:'mtest',tcm_actions:['tonify_qi','support_kidney']}),point('CV12',{point_region:'abdomen'}),point('INACTIVE',{is_active:false})];
const diff={primary_actions:['tonify_qi'],secondary_actions:['tonify_qi'],organ_focus:['spleen'],primary_label:'qi_deficiency',need_abdomen:false};
const risk={target:{signal:1},summary:{main_trigger_exact:'cold'},constitution_context:{symptom_focus:'fatigue',core_code:'brake_batt_small',sub_labels:['qi_deficiency']}};
async function withFakeEnv(fn) {
 const original=[process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY];
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture';
 try{return await fn();}finally {for(const [i,key] of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].entries()) {if(original[i]===undefined)delete process.env[key];else process.env[key]=original[i];}}
}

test('tomorrow rotates close candidates while preserving active/classic/region and uniqueness constraints',()=>withFakeEnv(async()=>{
 const {pick}=await picker({points:pool}),seen=new Set();
 for(let day=1;day<=14;day++) {
  const input={differentiation:diff,riskContext:risk,targetDate:`2026-10-${String(day).padStart(2,'0')}`,completedCare:[]};
  const result=await pick(input);assert.deepEqual(result,await pick(input));assert.equal(result.points.length,2);
  assert.equal(new Set(result.points.map(p=>p.code)).size,2);result.points.forEach(p=>{assert.equal(p.point_region,'limb');assert.ok(!p.mtest_block);assert.ok(p.is_active);});
  seen.add(result.points[0].code);within(result.meta.selection_debug.primary_limb.rotation_basis);
 }
 assert.ok(seen.size>=3);
 const abdomen=await pick({differentiation:{...diff,need_abdomen:true},riskContext:risk,targetDate:date,completedCare:[]});
 assert.equal(abdomen.points[0].point_region,'abdomen');assert.equal(abdomen.points[1].point_region,'limb');
 const fallback=await picker({points:pool.filter(p=>p.mtest_block)});
 assert.equal((await fallback.pick({differentiation:diff,riskContext:risk})).points[0].code,'M1');
}));

test('tomorrow history reads only the user’s previous three days, degrades gracefully, and master errors stay fatal',()=>withFakeEnv(async()=>{
 const first=await picker({points:pool});const base=await first.pick({differentiation:diff,riskContext:risk,targetDate:date,completedCare:[]});
 const used=base.points[0].code;
 const {pick,calls}=await picker({points:pool,history:[done(used)]});
 const result=await pick({differentiation:diff,riskContext:risk,targetDate:date,userId:'user-1'});
 assert.notEqual(result.points[0].code,used);assert.equal(result.meta.history_status,'loaded');
 const query=calls.find(row=>row.table==='radar_care_actions');
 assert.deepEqual(query.filters,[['eq','user_id','user-1'],['eq','domain','loosen'],['gte','target_date','2026-10-11'],['lt','target_date',date],['not','checked_at','is',null]]);
 const unavailable=await picker({points:pool,historyError:{message:'table unavailable'}});
 const fallback=await unavailable.pick({differentiation:diff,riskContext:risk,targetDate:date,userId:'user-1'});
 assert.deepEqual(fallback.points,base.points);assert.equal(fallback.meta.history_status,'unavailable');
 const fatal=await picker({points:pool,masterError:{message:'master failed'}});
 await assert.rejects(fatal.pick({differentiation:diff,riskContext:risk,targetDate:date,userId:'user-1'}),/master failed/);
}));

test('actual forecast generator passes the target date and account to tomorrow selection',async()=>{
 const source=await fs.readFile(new URL('../lib/radar_v1/buildFastRadarBundle.js',import.meta.url),'utf8');
 const calls=[];
 const context={tcm_context:diff,mtest_context:{selected_line:'spleen_st',mode:'mother'},summary:{main_trigger:'temp'},weather_context:{},meta:{}};
 const dependencies={
  fetchMetnoLocationForecast:async()=>({data:{},meta:{}}),
  normalizeMetnoForTargetDate:()=>({points:[{ts:'2026-10-14T12:00:00+09:00'}],previousNightBridgePoints:[]}),
  buildWeatherStress:()=>({}),buildWeatherStressV2:()=>({}),RADAR_WEATHER_MODEL_VERSION:'fixture',
  getRadarConstitutionProfile:async()=>({core_code:'brake_batt_small'}),getReviewFeedback:async()=>null,
  buildRiskContext:()=>context,pickTcmPoints:async input=>{calls.push(input);return {points:[],meta:{}};},
  selectMtestPoint:async()=>null,buildRadarPlan:()=>({}),getPreviousMtestPointCode:async()=>null,
  nowJstParts:()=>({isoDate:'2026-10-13'}),toJstISODate:value=>value.toISOString().slice(0,10),
 };
 const stripped=source.replace(/import[\s\S]*?from\s+["'][^"']+["'];\s*/g,'').replace(/export /g,'');
 const generate=new Function(...Object.keys(dependencies),stripped+';return buildFastRadarBundle;')(...Object.values(dependencies));
 await generate({userId:'user-1',targetDate:date,location:{lat:35,lon:139}});
 assert.deepEqual(calls,[{differentiation:diff,riskContext:context,targetDate:date,userId:'user-1'}]);
});
