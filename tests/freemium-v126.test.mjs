import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RECORDS_POLICY } from '../lib/records/policy.js';
import { resolveRecordsAccess, getRegistrationTrialWindow } from '../lib/records/accessPolicy.js';
import { cleanV126Metric } from '../lib/experienceFunnelV126Policy.js';
const root = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const ID='00000000-0000-4000-8000-000000000126';
const U='00000000-0000-4000-8000-000000000127';
async function injected(path, values, exports) {
 const text=(await read(path)).replace(/^import[\s\S]*?;\n/gm,'').replace(/export /g,'');
 return new Function(...Object.keys(values),text+'\nreturn {'+exports.join(',')+'};')(...Object.values(values));
}
function guestDb({owner=null,expired=false,claimed=null,error=null}={}) {
 const queries=[];
 return {queries,from(table) { const filters=[];queries.push({table,filters});return {
  select(){return this},eq(k,v){filters.push([k,v]);return this},async maybeSingle(){return {error,data:table==='diagnosis_events'?{id:ID,user_id:owner,created_at:'2026-11-17T00:00:00Z'}:{result_id:ID,expires_at:new Date(Date.now()+(expired?-1:1)*3600000).toISOString(),claimed_by:claimed}}}
 };}};
}
async function guestApi(db, valid=true) {
 return injected('lib/guestExperienceServer.js', {createHash,supabaseServer:db,hasValidGuestToken:async()=>valid,
  RECORDS_AI_CONSENT_VERSION:'test', nowJstParts:()=>({isoDate:'2026-11-17'}),toJstISODate:d=>new Date(d.getTime()+9*3600000).toISOString().slice(0,10)},
 ['requireGuestExperience','guestForecastId','currentGuestDates','guestConsentIsActive']);
}
test('v126 basic features remain free after any registration date; analysis needs entitlement',()=>{
 assert.equal(RECORDS_POLICY.subscription.trial.enabled,false);
 assert.equal(RECORDS_POLICY.ai.beta.enabled,false);
 for(const now of ['2026-11-17','2030-01-01']) {
  const trial=getRegistrationTrialWindow(Date.parse(now),{userCreatedAt:now});
  assert.equal(trial.active,false);assert.equal(trial.eligible,false);
  const a=resolveRecordsAccess({beta:{active:false},trial});
  for(const name of ['personalized_forecast_enabled','care_enabled','records_write_enabled','notifications_enabled','consult_enabled'])assert.equal(a[name],true,name);
  assert.equal(a.analysis_enabled,false);assert.equal(a.analysis_history_enabled,true);assert.equal(a.consult_requires_subscription,false);
 }
 const paid=resolveRecordsAccess({beta:{active:false},entitlement:{product:'radar_subscription'}});
 assert.equal(paid.analysis_enabled,true);
});
test('guest forecast authorization requires both a valid private cookie and an unclaimed result',async()=>{
 for(const settings of [{owner:U},{expired:true},{claimed:U}]) {
  const db=guestDb(settings),api=await guestApi(db);
  await assert.rejects(api.requireGuestExperience({headers:{get:()=>ID}}),e=>e.status===401);
 }
 const db=guestDb(),api=await guestApi(db,false);
 await assert.rejects(api.requireGuestExperience({headers:{get:()=>ID}}),e=>e.status===401);
 assert.equal(db.queries.length,0);
 const valid=await guestApi(guestDb());assert.equal((await valid.requireGuestExperience({headers:{get:()=>ID}})).id,ID);
 await assert.rejects(valid.requireGuestExperience({headers:{get:()=>"forged"}}),e=>e.status===401);
});
test('missing guest schema fails closed and does not fabricate membership',async()=>{
 const api=await guestApi(guestDb({error:{code:'42P01'}}));
 await assert.rejects(api.requireGuestExperience({headers:{get:()=>ID}}),e=>e.status===503&&e.code==='guest_schema_required');
});
test('concurrent temporary forecast requests use one deterministic id per result and date',async()=>{
 const api=await guestApi(guestDb());
 const a=api.guestForecastId(ID,'2026-11-17');
 assert.match(a,/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.equal(a,api.guestForecastId(ID,'2026-11-17'));
 assert.notEqual(a,api.guestForecastId(ID,'2026-11-18'));
 assert.notEqual(a,api.guestForecastId(U,'2026-11-17'));
 assert.deepEqual(api.currentGuestDates(),{today:'2026-11-17',tomorrow:'2026-11-18'});
});
test('temporary client state survives storage denial in memory and never writes localStorage',async()=>{
 const sent=[];const events=[];
 const storage={getItem(){throw Error('denied')},setItem(){throw Error('denied')},removeItem(){throw Error('denied')}};
 const api=await injected('lib/guestExperienceClient.js',{sessionStorage:storage,window:{dispatchEvent:e=>events.push(e.type)},Event:class {constructor(type){this.type=type}},setPendingDiagnosisAttach:v=>sent.push(v)},
 ['getTemporaryResult','setTemporaryResult','temporaryHeaders','temporarySignupHref','clearTemporaryResult']);
 assert.equal(api.getTemporaryResult(),null);api.setTemporaryResult(ID);
 assert.equal(api.getTemporaryResult(),ID);assert.equal(api.temporaryHeaders()['X-Mibyo-Guest-Result'],ID);
 assert.match(api.temporarySignupHref('/radar?date=2026-11-18'),/result=/);
 assert.equal(sent[0].resultId,ID);api.clearTemporaryResult();assert.equal(api.getTemporaryResult(),null);
 assert.doesNotMatch(await read('lib/guestExperienceClient.js'),/localStorage/);
});
test('temporary result cookies are session cookies with bounded server validity',async()=>{
 const cookies=[];
 const api=await injected('lib/diagnosisGuestAccess.js',{crypto:{},process:{env:{NODE_ENV:'production'}}},['setGuestTokenCookie','getGuestTokenExpiry']);
 api.setGuestTokenCookie({cookies:{set:(...args)=>cookies.push(args)}},ID,'private-secret');
 assert.equal(cookies[0][2].httpOnly,true);assert.equal(cookies[0][2].secure,true);assert.equal(cookies[0][2].sameSite,'lax');
 assert.equal('maxAge' in cookies[0][2],false);
 const ttl=api.getGuestTokenExpiry().getTime()-Date.now();assert.ok(ttl>43199000&&ttl<=43200000);
});
test('v126 analytics accept guests but discard health data and client-supplied identity',()=>{
 const input={event:'forecast_display',event_id:ID,visit_id:U,user_id:ID,email:'private@example.invalid',detail:{mode:'today',symptom:'headache',coordinates:[34,135]}};
 const clean=cleanV126Metric(input);assert.deepEqual(clean,{event:'forecast_display',event_id:ID,visit_id:U,detail:{mode:'today'}});
 assert.equal(cleanV126Metric({...input,event:'arbitrary'}),null);
 assert.equal(cleanV126Metric({...input,detail:{mode:'yesterday'}}),null);
});
test('guest AI cache is isolated and ready results do not spend another generation budget',async()=>{
 let generation=0,limited=0;const tables=[];
 const row={state:'ready',payload:{overview:'saved'},model:'test',generated_at:'2026-11-17'};
 const db={from(table){tables.push(table);return {select(){return this},eq(){return this},async maybeSingle(){return {data:table==='mimoru_guest_insights_v126'?row:null}}}}};
 const api=await injected('lib/mimoru/insightService.js',{supabaseServer:db,OPENAI_RECORDS_LIVE_CHAT_MODEL:'test',insightKey:()=> 'x'.repeat(64),enforcePublicApiRateLimit:async()=>{limited++;return null},generateStructured:()=>{generation++},insightError:(m,c,s)=>Object.assign(Error(m),{code:c,status:s})},['ensureInsight']);
 const value=await api.ensureInsight({userId:ID,kind:'constitution',input:{},guest:true,guestRequest:{}});
 assert.equal(value.state,'ready');assert.equal(generation,0);assert.equal(limited,0);assert.deepEqual(tables,['mimoru_guest_insights_v126']);
});
test('new anonymous generation observes a shared daily budget before contacting OpenAI',async()=>{
 let called=0;
 const db={from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:null}}}}};
 const api=await injected('lib/mimoru/insightService.js',{supabaseServer:db,OPENAI_RECORDS_LIVE_CHAT_MODEL:'test',insightKey:()=> 'x'.repeat(64),enforcePublicApiRateLimit:async()=>({status:429}),generateStructured:()=>{called++},insightError:(m,c,s)=>Object.assign(Error(m),{code:c,status:s})},['ensureInsight']);
 await assert.rejects(api.ensureInsight({userId:ID,kind:'constitution',input:{},guest:true,guestRequest:{}}),e=>e.status===429);
 assert.equal(called,0);
});
test('the check/forecast/signup flow contains no anonymous Supabase user creation or changed login provider',async()=>{
 const texts=await Promise.all(['lib/guestExperienceClient.js','lib/guestExperienceServer.js','app/check/run/page.js','app/signup/SignupClient.js'].map(read));
 assert.doesNotMatch(texts.join('\n'),/signInAnonymously|auth\.admin\.createUser/);
 assert.match(texts[3],/provider: "google"/);assert.match(texts[3],/signInWithOtp/);assert.match(texts[3],/verifyOtp/);
 assert.doesNotMatch(await read('app/api/stripe/checkout/route.js'),/trial_period_days|trial_end:/);
});
test('Trisetsu care-example logic and v124 care balance are retained',async()=>{
 for (const file of ['lib/diagnosis/v2/resultCareExample.js','app/radar/utils.js','lib/radar_v1/careRules/dailyCareV2.js']) {
  const old=await readFile(new URL('../../ui-v125/mibyo-radar-v7.79.125/'+file,root),'utf8').catch(()=>null);
  // The release verifier compares every runtime byte to the actual v124/v125 archives.
  if (old !== null) {
    const careLogic = text => file === 'app/radar/utils.js' ? text.slice(text.indexOf('export function compareIsoDate')) : text;
    assert.equal(careLogic(await read(file)), careLogic(old));
  }
 }
});
test('saving the temporary experience transfers only ready AI outputs and the adopted region; retry is idempotent',async()=>{
 const writes=[],locations=[];
 const guest={result_id:ID,claimed_by:null,location:{lat:34,lon:135,label:'大阪'},ai_consented_at:'2026-11-17T00:00:00Z',ai_consent_version:'test'};
 const ready={cache_key:'a'.repeat(64),kind:'constitution',target_date:null,symptom_focus:'neck_shoulder',prompt_version:'v',model:'test',payload:{overview:'cached'},generated_at:'2026-11-17T00:00:00Z'};
 const db={from(table){return {select(){return this},eq(){return this},is(){return this},async maybeSingle(){return {data:guest}},upsert(rows,options){writes.push({table,rows,options});return Promise.resolve({error:null})},update(row){guest.claimed_by=row.claimed_by;return this},then(resolve){resolve({data:table==='mimoru_guest_insights_v126'?[ready]:null,error:null})}}}};
 const api=await injected('lib/saveGuestExperience.js',{supabaseServer:db,randomUUID:()=>U,RECORDS_AI_CONSENT_VERSION:'test',upsertPrimaryRadarLocation:async x=>locations.push(x)},['saveGuestExperience']);
 await api.saveGuestExperience({resultId:ID,userId:U,isCurrent:true});
 assert.equal(locations.length,1);assert.equal(locations[0].userId,U);assert.equal(locations[0].lat,34);
 const output=writes.find(x=>x.table==='mimoru_insights');assert.equal(output.rows[0].user_id,U);assert.equal(output.rows[0].forecast_id,null);assert.equal(output.rows[0].input_tokens,0);assert.deepEqual(output.rows[0].payload,ready.payload);assert.equal(output.options.ignoreDuplicates,true);
 assert.equal(writes.find(x=>x.table==='records_ai_consents').options.ignoreDuplicates,true);
 await api.saveGuestExperience({resultId:ID,userId:U,isCurrent:true});assert.equal(locations.length,1);assert.equal(writes.length,2);
});
test('saving a historical result preserves the existing forecast region and rejects another claimant',async()=>{
 let locations=0;const guest={claimed_by:null,location:{lat:34,lon:135}};
 const db={from(table){return {select(){return this},eq(){return this},is(){return this},async maybeSingle(){return {data:guest}},update(row){guest.claimed_by=row.claimed_by;return this},then(resolve){resolve({data:table==='mimoru_guest_insights_v126'?[]:null,error:null})}}}};
 const api=await injected('lib/saveGuestExperience.js',{supabaseServer:db,randomUUID:()=>U,RECORDS_AI_CONSENT_VERSION:'test',upsertPrimaryRadarLocation:async()=>locations++},['saveGuestExperience']);
 await api.saveGuestExperience({resultId:ID,userId:U,isCurrent:false});assert.equal(locations,0);
 await assert.rejects(api.saveGuestExperience({resultId:ID,userId:ID,isCurrent:true}),/already_claimed/);
});
