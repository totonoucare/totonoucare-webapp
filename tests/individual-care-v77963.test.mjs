import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';
const {load}=await createScenarioRunner();
const a=await load('lib/records/analysis.js'), actions=await load('lib/radar_v1/careActionItems.js'), daily=await load('lib/radar_v1/careRules/dailyCareV2.js');
const source=await fs.readFile(new URL('../lib/radar_v1/careRules/dailyCareV2.js',import.meta.url),'utf8');
const catalog=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {MERIDIAN_LINE_CARE};').toString('base64'));
const action=(id,mode='today',timing)=>({id,user_id:'u1',target_date:'2026-09-19',source_mode:mode,domain:'live',kind:'lifestyle_step',item_key:id,label:id,timing_relation:mode==='tomorrow'?'previous_night':'same_day_before',item_snapshot:{meta:{rule_id:id,...(timing?{timing_source:'individual',symptom_timing:timing}:{})}}});
test('calendar provenance and old bulk answers do not imply individually confirmed symptom timing',()=>{
 for(const mode of ['today','tomorrow'])assert.equal(a.actionSymptomTiming(action('old',mode)),'unknown');
 const before=action('a','today','before_peak'),after=action('b','today','after_symptom');
 assert.equal(a.aggregateActionTiming([before,after]),'mixed');
 assert.equal(a.aggregateActionTiming([before,action('old')]),'unknown');
 assert.equal(a.actionSymptomTiming(action('night','tomorrow','after_symptom')),'after_symptom');
 const row={date:'2026-09-19',care_actions:[action('old','tomorrow')],forecast:{signal:1},review:{condition_level:2,prevent_level:1,care_timing:'before_peak'}};
 const summary=a.buildRecordsSummary([row]);
 assert.equal(summary.previous_night_care_days,1);assert.equal(summary.before_peak_care_days,0);
 const ai=JSON.stringify(a.trimRecordForAi(row));
 assert.match(ai,/legacy_bulk_or_calendar/);assert.doesNotMatch(ai,/"symptom_timing":"before_peak"/);
});
async function handler(rows,reviewRows=[]) {
 class Query {
  constructor(table){this.rows=table==='radar_care_actions'?rows:reviewRows;this.filters=[];this.updateValue=null;}
  select(){return this;} eq(k,v){this.filters.push(r=>r[k]===v);return this;} order(){return this;} limit(){return this;}
  update(value){this.updateValue=value;return this;}
  execute(){const found=this.rows.filter(r=>this.filters.every(f=>f(r)));if(this.updateValue)found.forEach(r=>Object.assign(r,this.updateValue));return {data:found,error:null};}
  async maybeSingle(){const result=this.execute();return {...result,data:result.data[0]||null};}
  async single(){return this.maybeSingle();}
  then(resolve,reject){return Promise.resolve(this.execute()).then(resolve,reject);}
 }
 let s=await fs.readFile(new URL('../app/api/radar/care-actions/route.js',import.meta.url),'utf8');
 s=s.replace(/import[\s\S]*?from\s+["'][^"']+["'];\s*/g,'').replace(/export /g,'');
 const deps={NextResponse:{json:(body,init)=>Response.json(body,init)},RECORDS_EDIT_LOOKBACK_DAYS:7,requireUser:async()=>({user:{id:'u1'}}),supabaseServer:{from:table=>new Query(table)},jstDateString:()=> '2026-09-19',addDaysYmd:a.addDaysYmd,buildActionTags:a.buildActionTags,isMissingRecordsSchemaError:()=>false,...actions,aggregateActionTiming:a.aggregateActionTiming,ACTION_SYMPTOM_TIMINGS:a.ACTION_SYMPTOM_TIMINGS,getRecordsAccess:async()=>({records_write_enabled:true})};
 return new Function(...Object.keys(deps),s+';return PATCH;')(...Object.values(deps));
}
const request=body=>({json:async()=>body});
test('actual PATCH isolates action, user and date, preserves metadata, supports previous-night answers and rejects bulk updates',async()=>{
 const rows=[action('a'),action('b','today','after_symptom'),action('c','tomorrow'),{...action('foreign'),user_id:'u2'}];
 const patch=await handler(rows,[{user_id:'u1',target_date:'2026-09-19',id:'review',manual_prevent_level:0}]);
 for(const [id,timing] of [['a','before_peak'],['c','after_symptom']])assert.equal((await patch(request({id,target_date:'2026-09-19',symptom_timing:timing}))).status,200);
 assert.equal(a.actionSymptomTiming(rows[0]),'before_peak');assert.equal(a.actionSymptomTiming(rows[1]),'after_symptom');assert.equal(rows[0].item_snapshot.meta.rule_id,'a');
 assert.equal(rows[2].timing_relation,'previous_night');assert.equal(a.actionSymptomTiming(rows[2]),'after_symptom');
 assert.equal((await patch(request({id:'foreign',target_date:'2026-09-19',symptom_timing:'before_peak'}))).status,404);assert.equal(a.actionSymptomTiming(rows[3]),'unknown');
 assert.equal((await patch(request({target_date:'2026-09-19',timing_relation:'same_day_before'}))).status,400);
 for(const date of ['2026-09-20','2026-09-01'])assert.equal((await patch(request({id:'a',target_date:date,symptom_timing:'before_peak'}))).status,400);
});
const plan=(extras={})=>daily.enhanceDailyCarePlan({mode:'today',targetDate:'2026-09-19',symptomFocus:'sleep',triggerKey:'damp',forecast:{signal:1},riskContext:{constitution_context:{core_code:'brake_batt_small',sub_labels:['fluid_damp','qi_deficiency']}},...extras}).lifestyle_plan;
const shown=p=>[p.primary_action,...p.alternatives].filter(Boolean);
test('scene selection gates narrow candidates and keeps tool slots tied to visible care',()=>{
 for(const mode of ['today','tomorrow'])for(const scene of daily.LIFESTYLE_SCENES)for(const symptomFocus of ['sleep','fatigue','digestion','neck_shoulder','headache','dizziness','low_back_pain','swelling','mood']){
  const p=plan({mode,lifestyleScene:scene.key,symptomFocus}),visible=shown(p).filter(x=>!x.restricted);
  assert.ok(visible.filter(x=>x.equipment).length<=1);assert.ok(visible.filter(x=>!x.equipment).length<=1);
  if(visible.length===2)assert.equal(visible[0].equipment,null);
  for(const x of shown(p))assert.ok(x.selected_because.some(y=>y.axis==='symptom'&&y.key===symptomFocus));
  if(scene.key==='general')for(const x of shown(p))assert.doesNotMatch(x.id,/facing-layout|foot-support|arm-support|screen-height|phone-thumb/);
  if(p.shop_context)assert.ok(visible.some(x=>x.id===p.shop_context.action_id&&x.equipment));
 }
 assert.ok(shown(plan({lifestyleScene:'screen',symptomFocus:'dizziness'})).some(x=>x.id==='tool-screen-height'));
 assert.equal(plan({symptomFocus:'dizziness'}).no_suggestion,true);
});
test('tomorrow either chooses another fitting action or explicitly labels shared care',()=>{
 let changed=0,shared=0;
 for(const symptomFocus of ['sleep','fatigue','neck_shoulder','low_back_pain','swelling','headache','mood'])for(const triggerKey of ['damp','heat','cold','pressure_down']){
  const today=plan({symptomFocus,triggerKey}),tomorrow=plan({symptomFocus,triggerKey,mode:'tomorrow',targetDate:'2026-09-20',avoidLifestyleIds:today.step_ids});
  for(const x of shown(tomorrow))if(today.step_ids.includes(x.id)){shared++;assert.match(x.continuity_note,/今日と共通/);}else changed++;
 }
 assert.ok(changed>0);assert.ok(shared>0);
});
test('all 18 movement IDs have local accessible diagrams',async()=>{
 const moves=Object.values(catalog.MERIDIAN_LINE_CARE).flat();assert.equal(moves.length,18);assert.equal(new Set(moves.map(x=>x.id)).size,18);
 for(const move of moves){const svg=await fs.readFile(new URL('../public/care-movements/'+move.id+'.svg',import.meta.url),'utf8');assert.match(svg,/<svg[^>]*viewBox="0 0 480 300"/);assert.match(svg,/<title id="title">.+<\/title>/);assert.match(svg,/aria-labelledby="title desc"/);assert.doesNotMatch(svg,/<script/);}
});
