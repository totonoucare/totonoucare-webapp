import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createScenarioRunner, scenarios} from './helpers/forecast-scenarios.mjs';
const source = f => fs.readFile(new URL('../'+f,import.meta.url),'utf8');
const model=await import('data:text/javascript;base64,'+Buffer.from(await source('lib/mimoru/insightModel.js')).toString('base64'));
const chat=await import('data:text/javascript;base64,'+Buffer.from(await source('lib/mimoru/chatContext.js')).toString('base64'));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function injected(file,deps,names){const code=(await source(file)).replace(/^import[\s\S]*?;\n/gm,'').replaceAll('export ','');return new AsyncFunction(...Object.keys(deps),code+'\nreturn {'+names.join(',')+'};')(...Object.values(deps));}
const runner=await createScenarioRunner();
const {buildMimoruProfileContext,buildInsightGenerationInput}=await runner.load('lib/mimoru/explanationContext.js');
const {buildConnectionReference,SYMPTOM_CONNECTIONS,MIMORU_KNOWLEDGE_VERSION}=await runner.load('lib/mimoru/explanationKnowledge.js');
const {buildForecastReasoningContext}=await runner.load('lib/records/forecastReasoning.js');
const affinity=await runner.load('lib/radar_v1/personalizeForecastV2.js');
const ui=await runner.load('app/radar/utils.js');
const {buildDisplayedCareItems}=await runner.load('lib/radar_v1/careActionItems.js');
const {buildCareExplanationItems,buildResultCareExplanationInput}=await runner.load('lib/mimoru/careExplanationInput.js');
const {addDaysYmd}=await runner.load('lib/records/analysis.js');
const {buildCareExplanationTargets}=await runner.load('lib/radar_v1/careExplanationTargets.js');
const {buildResultCareExample}=await runner.load('lib/diagnosis/v2/resultCareExample.js');
const careCopy=item_key=>({item_key,reason:'本人の不調に合う狙い。',theory:'選ばれたケアの理論。',guidance:'取り入れる加減。',check:'前後の体感。'});
const {scoreDiagnosis}=await runner.load('lib/diagnosis/v2/scoring.js');
const {getQuestions}=await runner.load('lib/diagnosis/v2/questions.js');
const {validateDiagnosisAnswers}=await runner.load('lib/diagnosis/v2/validateAnswers.js');
const {SYMPTOM_LABELS}=await runner.load('lib/diagnosis/v2/labels.js');
const U='00000000-0000-4000-8000-000000000113',F='00000000-0000-4000-8000-000000000114',E='00000000-0000-4000-8000-000000000115';
const user={id:U},today='2026-09-11';
const error=(message,code,status=400)=>Object.assign(new Error(message),{code,status});
function dbRows(rows) {
 return { from(table) {
  const filters=[];
  return { select(){return this}, eq(k,v){filters.push([k,v]);return this},
   async maybeSingle(){return {data:(rows[table]||[]).find(x=>filters.every(([k,v])=>x[k]===v))||null};}
  };
 } };
}

const profile={...runner.profiles[2].constitution,symptom_focus:'headache'};
async function subjects(db,opts={}){return injected('lib/mimoru/subjects.js',{
 supabaseServer:db,loadRecordsProfile:async()=>opts.profile||profile,loadRecentCompletedCare:async()=>opts.completed||[],
 buildMimoruProfileContext,buildForecastReasoningContext,...affinity,scoreDiagnosis,validateDiagnosisAnswers,
 loadResultProfileState:async()=>({is_current:opts.current!==false}),hasValidGuestToken:async()=>opts.guestTokenValid===true,SYMPTOM_LABELS,...ui,buildDisplayedCareItems,buildCareExplanationItems,buildResultCareExplanationInput,buildCareExplanationTargets,buildResultCareExample,addDaysYmd,jstDateString:()=>today,
},['constitutionInput','normalizeInsightProfile','loadProfileConstitutionInput','loadResultSubject','loadForecastSubject']);}
const baseFns=await subjects(dbRows({}));
const base=baseFns.constitutionInput(profile);
const payload={care_example:base.care_example?careCopy(base.care_example.item_key):null,overview:'頭のつらさと、張り・余力のつながりを説明。',weather_connections:base.weather_affinity.map(x=>({key:x.key,explanation:'主訴に関わる負担を説明。'})),care_connections:base.constitution.care_preferences.map(x=>({key:x.key,explanation:'選定済みのケア方針の狙い。'}))};

test('insight cache is order independent and invalidates each meaningful subject input',()=>{
 const key=model.insightKey('constitution',base,'test-model');assert.equal(key,model.insightKey('constitution',JSON.parse(JSON.stringify(base)),'test-model'));
 assert.equal(model.insightKey('x',{a:1,b:2},'m'),model.insightKey('x',{b:2,a:1},'m'));
 for(const changed of [{...base,constitution:{...base.constitution,symptom_focus:{code:'sleep'}}},baseFns.constitutionInput({...profile,split_scores:{...profile.split_scores,qi:{deficiency:45,stagnation:55}}})])assert.notEqual(key,model.insightKey('constitution',changed,'test-model'));
 for(const field of ['target_date','mode','lifestyle_scene','selected_care'])assert.notEqual(model.insightKey('forecast',{...base,[field]:'a'},'m'),model.insightKey('forecast',{...base,[field]:'b'},'m'));
 assert.equal(model.insightKey('forecast',{...base,forecast_revision:'a'},'m'),model.insightKey('forecast',{...base,forecast_revision:'b'},'m'));
});
test('all six interpreted scores survive while raw answers, user identity and coordinates are excluded',()=>{
 const interpreted=base.constitution.material_pattern_summary.all_ranked_patterns;
 assert.equal(interpreted.length,6);assert.ok(interpreted.every(x=>Number.isFinite(x.score)));
 const cleaned=baseFns.constitutionInput({...profile,user_id:U,answers:{private:'secret'},lat:35.1,lon:135.1,email:'private@example.invalid'});
 assert.deepEqual(cleaned,base);assert.doesNotMatch(JSON.stringify(cleaned),/secret|private@|35\.1|135\.1/);
});
test('cache input agrees between freshly scored results and the stored compact profile',()=>{
 const compact={...profile,axes:Object.fromEntries(Object.entries(profile.axes).filter(([k])=>!['reaction_resolution'].includes(k))),engine_version:'v2',updated_at:'2026-09-10'};
 assert.deepEqual(baseFns.constitutionInput(compact),base);
});
test('structured explanations require the exact weather and care anchors',()=>{
 assert.deepEqual(model.validateInsight('constitution',payload,base),payload);
 assert.throws(()=>model.validateInsight('constitution',{...payload,weather_connections:[...payload.weather_connections,{key:'invented',explanation:'x'}]},base));
 assert.throws(()=>model.validateInsight('constitution',{...payload,care_connections:payload.care_connections.map(()=>payload.care_connections[0])},base));
 assert.throws(()=>model.validateInsight('forecast',{daily_summary:'x',care_rationale:'x'},base));
 assert.throws(()=>model.validateInsight('constitution',{...payload,overview:'x'.repeat(1001)},base));
 assert.equal(model.insightSchema('constitution',base).additionalProperties,false);
});

test('all nine complaints use the same six-material reference and include the stomach lubrication pathway',()=>{
 assert.equal(Object.keys(SYMPTOM_CONNECTIONS).length,9);
 for(const key of Object.keys(SYMPTOM_LABELS)){
  const ref=buildConnectionReference(key);
  assert.equal(ref.version,MIMORU_KNOWLEDGE_VERSION);
  assert.equal(Object.keys(ref.materials).length,6);
  assert.equal(Object.keys(ref.symptom.paths).length,6);
  assert.ok(ref.sources.length>0);
 }
 const stomach=buildConnectionReference('digestion');
 assert.match(stomach.symptom.paths.fluid_deficiency,/潤|受け入れ/);
 assert.match(stomach.symptom.paths.blood_stasis,/同じ場所/);
 assert.ok(stomach.writing_examples.some(x=>x.context.includes('胃腸')));
});

test('generation receives the product explanation, complaint reference, examples and all six scores together',async()=>{
 const db=memoryDb();let request;
 const api=await service(db,async input=>{request=input;return {data:payload}});
 await api.ensureInsight(args);
 const input=JSON.parse(request.input);
 assert.equal(input.kind,'constitution');
 assert.equal(input.explanation_reference.symptom.label,buildConnectionReference('headache').symptom.label);
 assert.ok(input.explanation_reference.writing_examples.length>0);
 assert.ok(input.product_context.weather_model.personalization);
 assert.ok(input.writing_guide.includes('体の働き'));
 assert.deepEqual(input.constitution,base.constitution);
 assert.equal(input.constitution.material_pattern_summary.all_ranked_patterns.length,6);
 assert.equal(input.constitution.material_pattern_summary.score_scale,'0_100');
 assert.deepEqual(input.constitution.care_selection.selected.map(x=>x.key),input.constitution.care_preferences.map(x=>x.key));
 assert.doesNotMatch(request.instructions,/仮説として説明|医療的.*断定|診断.*しない|改善が保証|uncertainty_note/);
 const required=model.insightSchema('constitution',base).required;
 assert.deepEqual(required,['overview','weather_connections','care_connections','care_example']);
 assert.deepEqual(model.insightSchema('forecast',base).required,['daily_summary','care_rationale','care_invitation','item_reasons']);
});

test('v115 saved explanations are regenerated under the new input contract and then reused',async()=>{
 const {createHash}=await import('node:crypto');
 const oldKey=createHash('sha256').update(model.stableJson({kind:args.kind,input:args.input,model:'test-model',version:'mimoru_care_evidence_v3_20261107'})).digest('hex');
 const db=memoryDb();db.rows.push({user_id:U,cache_key:oldKey,state:'ready',payload:{overview:'旧文',uncertainty_note:'旧補足'}});
 let calls=0;const api=await service(db,async()=>{calls++;return {data:payload}});
 const first=await api.ensureInsight(args);assert.equal(first.insight.overview,payload.overview);assert.equal(calls,1);
 await api.ensureInsight(args);assert.equal(calls,1);assert.equal(db.rows.length,2);
});
test('server reconstructs the exact care identities for today and tomorrow across all symptoms and scenes',async()=>{
 const generatedKeys=new Map();
 const raw=runner.run(scenarios[3][1],2,'headache').forecast;
 const current={...raw,id:F,user_id:U,target_date:today,created_at:'2026-09-11T00:00:00Z'};
 const tomorrow={...current,id:E,target_date:addDaysYmd(today,1)};
 for(const symptom_focus of Object.keys(SYMPTOM_LABELS))for(const lifestyleScene of ['general','desk','screen','carry','sleep'])for(const mode of ['today','tomorrow']){
  const target=mode==='today'?current:tomorrow;
  const subjectFns=await subjects(dbRows({radar_forecasts:[current,tomorrow]}),{profile:{...profile,symptom_focus}});
  const actual=await subjectFns.loadForecastSubject({user,forecastId:target.id,mode,lifestyleScene});
  const prior=mode==='tomorrow'?ui.resolveDisplayedCarePlan({forecast:current,riskContext:ui.getRiskContext({forecast:current}),mode:'today',targetDate:today,symptomFocus:symptom_focus,completedCare:[],lifestyleScene}):null;
  const expected=ui.resolveDisplayedCarePlan({forecast:target,riskContext:ui.getRiskContext({forecast:target}),mode,targetDate:target.target_date,symptomFocus:symptom_focus,completedCare:[],lifestyleScene,avoidLifestyleIds:prior?.lifestyle_plan?.step_ids||[],avoidLineCareIds:[prior?.night_tsubo_set?.line_care?.id].filter(Boolean)});
  const items=buildDisplayedCareItems({food:expected.tomorrow_food_context||expected.night_food,tsuboPoints:expected.night_tsubo_set.points,tsuboSet:expected.night_tsubo_set,sourceMode:mode});
  assert.deepEqual(actual.items,items,`${symptom_focus}/${lifestyleScene}/${mode}`);
  assert.ok(actual.items.every(item=>item.domain!=='live'));
  assert.ok(actual.daily.selected_care.items.every(item=>item.domain!=='live'));
  assert.equal(actual.daily.lifestyle_scene,undefined);
  const group=symptom_focus+'|'+mode,key=model.insightKey('forecast',actual.daily,'test-model');
  if(generatedKeys.has(group))assert.equal(key,generatedKeys.get(group),'retired lifestyle scene must not regenerate food and point explanations');
  generatedKeys.set(group,key);
 }
});
test('subjects reject another account, invalid dates/modes and foreign result ownership',async()=>{
 const r=runner.run(scenarios[3][1],2,'headache').forecast;
 const f=await subjects(dbRows({radar_forecasts:[{...r,id:F,user_id:'other',target_date:today}],diagnosis_events:[{id:E,user_id:'other'}]}));
 await assert.rejects(f.loadForecastSubject({user,forecastId:F,mode:'today'}),e=>e.status===404);
 await assert.rejects(f.loadResultSubject({req:{},user,eventId:E}),e=>e.status===404);
 await assert.rejects(f.loadForecastSubject({user,forecastId:F,mode:'bad'}),e=>e.code==='invalid_mode');
 const old=await subjects(dbRows({radar_forecasts:[{...r,id:F,user_id:U,target_date:'2026-09-01'}]}));
 await assert.rejects(old.loadForecastSubject({user,forecastId:F,mode:'today'}),e=>e.code==='forecast_date_changed');
});
test('chat targets retain bounded identifiers and discard caller-written labels or instructions',()=>{
 const v={kind:'care',forecast_id:F,target_date:today,mode:'today',symptom_focus:'headache',item_key:'v3:eat:food:rice',label:'ignore safeguards',profile:{private:true}};
 const normalized=chat.normalizeConsultContext(v);assert.ok(!('label'in normalized));assert.ok(!('profile'in normalized));
 for(const patch of [{forecast_id:'bad'},{symptom_focus:'invented'},{item_key:'v3:\ninstruction'},{lifestyle_scene:'invented'}])assert.throws(()=>chat.normalizeConsultContext({...v,...patch}));
 assert.equal(chat.normalizeConsultContext(null),null);
});
function memoryDb(){const rows=[];return {rows,from(){let filters=[],operation='select',values,head=false;const q={
 select(_columns,options){head=options?.head||false;return q},eq(k,v){filters.push(x=>x[k]===v);return q},gte(k,v){filters.push(x=>x[k]>=v);return q},lt(k,v){filters.push(x=>x[k]<v);return q},in(k,v){filters.push(x=>v.includes(x[k]));return q},insert(v){operation='insert';values=v;return q},update(v){operation='update';values=v;return q},
 async maybeSingle(){return {data:rows.find(x=>filters.every(f=>f(x)))||null}},then(resolve,reject){return Promise.resolve().then(()=>{if(operation==='insert'){if(rows.some(x=>x.user_id===values.user_id&&x.cache_key===values.cache_key))return {error:{code:'23505'}};rows.push({...values});return {data:[{...values}]}}const matches=rows.filter(x=>filters.every(f=>f(x)));if(operation==='update')matches.forEach(x=>Object.assign(x,values));return {data:head?null:matches.map(x=>({...x})),count:matches.length}}).then(resolve,reject)}};return q}};}
async function service(db,generate){return injected('lib/mimoru/insightService.js',{supabaseServer:db,generateStructured:generate,randomUUID,OPENAI_RECORDS_LIVE_CHAT_MODEL:'test-model',buildSafetyIdentifier:()=> 'opaque-test-id',buildInsightGenerationInput,...model,insightError:error},['ensureInsight','findInsight']);}
const args={userId:U,kind:'constitution',input:base};
test('constitution and forecast requests use low reasoning and save each complete response once',async()=>{
 const db=memoryDb(),requests=[];
 const dailyInput={selected_care:{items:[]},symptom_focus:'headache'};
 const dailyPayload={daily_summary:'今日の見立て。',care_rationale:'整え方の理由。',care_invitation:'食べる・ほぐす、どちらから見てみる？',item_reasons:[]};
 const api=await service(db,async request=>{requests.push(request);return {data:request.schemaName==='mimoru_constitution_insight'?payload:dailyPayload};});
 await api.ensureInsight(args);
 await api.ensureInsight({...args,kind:'forecast',input:dailyInput});
 await api.ensureInsight({...args,kind:'forecast',input:dailyInput});
 assert.equal(requests.length,2);assert.ok(requests.every(x=>x.reasoning.effort==='low'));
 assert.equal(requests[0].max_output_tokens,5000);assert.equal(requests[1].max_output_tokens,12000);
 assert.ok(db.rows.every(x=>x.state==='ready'&&x.prompt_version===model.INSIGHT_VERSION));
});
test('concurrent tabs and retries share one saved generation; another user receives an independent cache',async()=>{
 const db=memoryDb();let calls=0;const api=await service(db,async()=>{calls++;await new Promise(r=>setTimeout(r,15));return {data:payload,model:'test-model'}});
 const values=await Promise.all(Array.from({length:6},()=>api.ensureInsight(args)));assert.ok(values.every(x=>x.state==='ready'));assert.equal(calls,1);
 await api.ensureInsight(args);assert.equal(calls,1);
 await api.ensureInsight({...args,userId:E});assert.equal(calls,2);assert.equal(db.rows.length,2);
});
test('failed generation saves a retry lease and never exposes partial text',async()=>{
 const db=memoryDb();let calls=0;const api=await service(db,async()=>{calls++;throw Object.assign(new Error('provider details private'),{code:'mock_failure'})});
 await assert.rejects(api.ensureInsight(args),e=>e.code==='insight_generation_failed'&&!e.message.includes('private'));
 assert.equal(db.rows[0].state,'failed');assert.equal(db.rows[0].payload,undefined);
 await assert.rejects(api.ensureInsight(args),e=>e.code==='insight_backoff');assert.equal(calls,1);
});
test('a cross-process active lease returns pending and a stale worker cannot overwrite a new claim',async()=>{
 const db=memoryDb();let release;const gate=new Promise(r=>release=r);const first=await service(db,async()=>{await gate;return {data:payload}});
 const p=first.ensureInsight(args);while(!db.rows.length)await new Promise(r=>setTimeout(r,1));
 const second=await service(db,async()=>{throw Error('must not generate')});assert.deepEqual(await second.ensureInsight(args),{state:'pending'});
 db.rows[0].generation_token=randomUUID();release();await assert.rejects(p,e=>e.code==='insight_generation_failed');assert.equal(db.rows[0].payload,undefined);
});
test('insight daily limit preserves ready explanations without spending chat quota',async()=>{
 const db=memoryDb();for(let i=0;i<model.INSIGHT_DAILY_LIMIT;i++)db.rows.push({user_id:U,cache_key:String(i),updated_at:new Date().toISOString()});
 const api=await service(db,async()=>{throw Error('must not generate')});await assert.rejects(api.ensureInsight(args),e=>e.code==='insight_daily_limit');
 db.rows[0]={...db.rows[0],cache_key:model.insightKey(args.kind,args.input,'test-model'),state:'ready',payload};assert.equal((await api.ensureInsight(args)).state,'ready');
});
async function route({userValue=user,consent=true,access=true,subjectError=null,guest=null,resultRequested=false}={}){let calls=0;
 const f=await injected('app/api/mimoru/insights/route.js',{
 requireGuestExperience:async()=>{if(!guest)throw error("check required","guest_expired",401);return guest},
 guestConsentIsActive:()=>consent,
 guestConstitution:async()=>({profile,base,eventId:E,resultExplanationRequested:resultRequested}),
 NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})},requireUser:async()=>({user:userValue}),hasActiveAiConsent:async()=>consent,getRecordsAccess:async()=>({personalized_forecast_enabled:access}),enforcePublicApiRateLimit:async()=>null,insightError:error,
 loadResultSubject:async()=>{if(subjectError)throw subjectError;return {profile,base,eventId:E,resultExplanationRequested:resultRequested}},loadForecastSubject:async()=>({profile,base,daily:{mode:'today'},forecastId:F,targetDate:today}),
 ensureInsight:async()=>{calls++;return {state:'ready',insight:payload}},
 },['POST']);return {post:async body=>f.POST({text:async()=>typeof body==='string'?body:JSON.stringify(body)}),calls:()=>calls};}
test('HTTP endpoint enforces authentication, consent, entitlement and stale symptom before generation',async()=>{
 for(const [opts,status,body] of [[{userValue:null},401,{kind:'result'}],[{consent:false},403,{kind:'result'}],[{access:false},403,{kind:'forecast'}],[{},409,{kind:'result',symptom_focus:'sleep'}],[{subjectError:error('not found','subject_not_found',404)},404,{kind:'result'}]]){
  const api=await route(opts);assert.equal((await api.post(body)).status,status);assert.equal(api.calls(),0);
 }
 const api=await route();assert.equal((await api.post({kind:'result',symptom_focus:'headache',profile:{spoof:true}})).status,200);assert.equal(api.calls(),1);
 assert.equal((await api.post('x'.repeat(2049))).status,413);assert.equal((await api.post('{')).status,400);
});

test('the final check action enables only this result for a guest or authenticated owner', async () => {
  for (const identity of [{ userValue: null, guest: { id: E } }, { userValue: user }]) {
    const api = await route({ ...identity, consent: false, resultRequested: true });
    assert.equal((await api.post({ kind: 'result', result_id: E })).status, 200);
    assert.equal((await api.post({ kind: 'forecast' })).status, 403);
    assert.equal(api.calls(), 1);
    const old = await route({ ...identity, consent: false });
    assert.equal((await old.post({ kind: 'result', result_id: E, resultExplanationRequested: true })).status, 403);
    assert.equal(old.calls(), 0);
  }
});

test('check submission persists the explicit result request and the owned result reads it back', async () => {
  const { completeConstitutionCheck } = await runner.load('lib/completeConstitutionCheck.js');
  const answers = {};
  for (const question of getQuestions(answers)) {
    answers[question.key] = question.type === 'multi' ? [question.options[0].value] : question.options[0].value;
  }
  for (const question of getQuestions(answers)) {
    answers[question.key] ??= question.type === 'multi' ? [question.options[0].value] : question.options[0].value;
  }
  for (const requested of [true, false]) {
    let saved;
    const { POST } = await injected('app/api/diagnosis/v2/submit/route.js', {
      NextResponse: { json: body => ({ ok: true, json: async () => body }) },
      requireUser: async () => ({ user: null }), enforcePublicApiRateLimit: async () => null,
      validateDiagnosisAnswers, scoreDiagnosis, createGuestToken: () => 'test-cookie',
      hashGuestToken: () => 'test-hash', getGuestTokenExpiry: () => new Date(), setGuestTokenCookie() {},
      supabaseServer: { rpc: async () => ({}), from: table => ({
        insert: rows => {
          if (table !== 'diagnosis_events') return {};
          saved = { ...rows[0], id: E, created_at: new Date().toISOString() };
          return { select: () => ({ single: async () => ({ data: { id: E } }) }) };
        },
      }) },
    }, ['POST']);
    const id = await completeConstitutionCheck({ answers, requestResultExplanation: requested }, (_, options) =>
      POST({ headers: new Headers(options.headers), json: async () => JSON.parse(options.body) }));
    assert.equal(id, E);
    const db = dbRows({ diagnosis_events: [saved] });
    const guest = await subjects(db, { guestTokenValid: true });
    assert.equal((await guest.loadResultSubject({ req: {}, user: null, eventId: id })).resultExplanationRequested, requested);
    const stranger = await subjects(db);
    await assert.rejects(stranger.loadResultSubject({ req: {}, user: null, eventId: id }), err => err.status === 404);
    saved.user_id = U;
    const member = await subjects(db, { current: false });
    assert.equal((await member.loadResultSubject({ req: {}, user, eventId: id })).resultExplanationRequested, requested);
    const changedSymptom = await subjects(db, { profile: { symptom_focus: answers.symptom_focus === 'sleep' ? 'fatigue' : 'sleep' } });
    assert.equal((await changedSymptom.loadResultSubject({ req: {}, user, eventId: id })).resultExplanationRequested, false);
  }
});

 test('failed insights have a bounded retry budget even when the short lease has expired',async()=>{
 const db=memoryDb();db.rows.push({user_id:U,cache_key:model.insightKey(args.kind,args.input,'test-model'),state:'failed',lease_until:new Date(Date.now()-1000).toISOString(),updated_at:new Date().toISOString(),generation_attempts:3,attempts_window_started_at:new Date().toISOString()});
 const api=await service(db,async()=>{throw Error('must not generate')});await assert.rejects(api.ensureInsight(args),e=>e.code==='insight_retry_limit');
 });
 test('care resolver rejects forged identity or target date before using cached explanations',async()=>{
 const request={kind:'care',forecast_id:F,target_date:today,mode:'today',symptom_focus:'headache',item_key:'v3:live:step:valid'};
 const resolver=await injected('lib/mimoru/consultContextServer.js',{normalizeConsultContext:chat.normalizeConsultContext,insightError:error,SYMPTOM_LABELS,
 loadResultSubject:async()=>({profile,base}),loadForecastSubject:async()=>({targetDate:today,base,daily:{},items:[{item_key:request.item_key,label:'実際のケア',detail:'確認済みの内容',domain:'live',kind:'step'}]}),readConstitutionInsight:async()=>null,findInsight:async()=>({row:null}),constitutionInput:baseFns.constitutionInput},['resolveConsultContext']);
 await assert.rejects(resolver.resolveConsultContext({user,requested:{...request,item_key:'v3:live:step:forged'}}),e=>e.code==='care_context_changed');
 await assert.rejects(resolver.resolveConsultContext({user,requested:{...request,target_date:'2026-09-12'}}),e=>e.code==='target_date_mismatch');
 const resolved=await resolver.resolveConsultContext({user,requested:{...request,label:'caller label'}});assert.equal(resolved.selected_care.label,'実際のケア');assert.equal(resolved.label,today+'の「実際のケア」');
 });

 test('a legacy profile without a complaint can continue general chat without requesting a new insight',async()=>{
 const f=await injected('lib/mimoru/consultContextServer.js',{SYMPTOM_LABELS,constitutionInput:()=>{throw Error('should not require a check')},readConstitutionInsight:async()=>null},['sharedConstitutionContext']);
 assert.equal(await f.sharedConstitutionContext(U,{core_code:'brake_batt_small',symptom_focus:null}),null);
 });

 test('selected forecast chat keeps its saved constitution and rejects a replaced weather revision',async()=>{
 const raw={...runner.run(scenarios[3][1],2,'headache').forecast,id:F,user_id:U,target_date:today,updated_at:'2026-09-11T00:00:00Z'};
 const f=await subjects(dbRows({radar_forecasts:[raw]}),{profile:{...profile,core_code:'brake_batt_small'}});
 const selected=await f.loadForecastSubject({user,forecastId:F,mode:'today',forChat:true,symptomFocus:'headache',forecastRevision:raw.updated_at});
 assert.equal(selected.base.constitution.core.code,profile.core_code);
 await assert.rejects(f.loadForecastSubject({user,forecastId:F,mode:'today',forChat:true,forecastRevision:'2026-09-10T00:00:00Z'}),e=>e.code==='forecast_revision_changed');
 });

 test('individual care reasons stay attached to every selected item and reject foreign or repeated identities',()=>{
 const input={selected_care:{items:[{item_key:'v3:eat:drink:tea'},{item_key:'v3:loosen:point:st36'}]}};
 const value={daily_summary:'今日の備え。',care_rationale:'胃腸をいたわる狙い。',care_invitation:'どれから見てみる？',item_reasons:[{...careCopy('v3:loosen:point:st36'),reason:'胃腸の働きを助けるツボ。'},{...careCopy('v3:eat:drink:tea'),reason:'食事と合わせて取り入れる一杯。'}]};
 const actual=model.validateInsight('forecast',value,input);assert.deepEqual(actual.item_reasons.map(x=>x.item_key),input.selected_care.items.map(x=>x.item_key));
 assert.throws(()=>model.validateInsight('forecast',{...value,item_reasons:[value.item_reasons[0],value.item_reasons[0]]},input));
 assert.throws(()=>model.validateInsight('forecast',{...value,item_reasons:[{item_key:'foreign',reason:'x'},value.item_reasons[0]]},input));
 assert.throws(()=>model.validateInsight('forecast',{...value,item_reasons:[]},input));
 assert.equal(model.insightSchema('forecast',{selected_care:{items:[]}}).properties.item_reasons.maxItems,0);
 });


test('36 result/forecast base inputs share the same saved-check date and exact illustrated example',async()=>{
 for(const data of runner.profiles) for(const symptom_focus of Object.keys(SYMPTOM_LABELS)){
  const answers={...data.answer,symptom_focus};
  for(const q of getQuestions(answers)){
   const allowed=q.options.map(x=>x.value);
   if(q.type==='multi'&&(!answers[q.key]?.length||answers[q.key].some(x=>!allowed.includes(x))))answers[q.key]=[allowed.includes('none')?'none':allowed[0]];
   else if(q.type!=='multi'&&!allowed.includes(answers[q.key]))answers[q.key]=allowed[0];
  }
  const validated=validateDiagnosisAnswers(answers);assert.equal(validated.ok,true);
  const computed=scoreDiagnosis(validated.answers);
  const current={...computed,latest_event_id:E};
  const db=dbRows({diagnosis_events:[{id:E,user_id:U,answers,created_at:'2026-10-12T15:30:00Z'}]});
  const f=await subjects(db,{profile:current});
  const result=await f.loadResultSubject({req:{},user,eventId:E});
  const shared=await f.loadProfileConstitutionInput(U,current);
  assert.deepEqual(shared,result.base,`${data.name}/${symptom_focus}`);
  const expected=buildResultCareExample({answers:validated.answers,computed,symptomKey:symptom_focus,createdAt:'2026-10-12T15:30:00Z'});
  assert.equal(shared.care_example.item_key,expected.id);
  assert.equal(shared.care_example.action,expected.action);
  assert.equal(shared.care_example.selection_evidence.target_date,'2026-10-13');
  assert.doesNotMatch(JSON.stringify(shared),/"(?:latest_event_id|user_id|answers)":/);
 }
});

test('chat questions on tomorrow previews use their authoritative text target and preserve the non-recordable status',async()=>{
 const request={kind:'care',forecast_id:F,target_date:today,mode:'tomorrow',symptom_focus:'headache',item_key:'v3:eat:explanation_preview:abc'};
 const target={item_key:request.item_key,label:'明日の食材',domain:'eat',kind:'food_choice_item',recordable:false};
 const explanation=careCopy(target.item_key);
 const resolver=await injected('lib/mimoru/consultContextServer.js',{normalizeConsultContext:chat.normalizeConsultContext,insightError:error,SYMPTOM_LABELS,
 loadResultSubject:async()=>({profile,base}),loadForecastSubject:async()=>({targetDate:today,base,daily:{selected_care:{items:[target]}},items:[],explanationItems:[target]}),readConstitutionInsight:async()=>payload,findInsight:async()=>({row:{state:'ready',payload:{item_reasons:[explanation]}}})},['resolveConsultContext']);
 const resolved=await resolver.resolveConsultContext({user,requested:request});
 assert.equal(resolved.selected_care.recordable,false);
 assert.deepEqual(resolved.selected_care.explanation,explanation);
 await assert.rejects(resolver.resolveConsultContext({user,requested:{...request,item_key:'v3:eat:explanation_preview:forged'}}),e=>e.code==='care_context_changed');
});
