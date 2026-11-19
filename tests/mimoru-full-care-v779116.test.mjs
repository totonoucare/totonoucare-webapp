import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createScenarioRunner,scenarios} from './helpers/forecast-scenarios.mjs';
const runner=await createScenarioRunner();
const {buildDisplayedCareItems}=await runner.load('lib/radar_v1/careActionItems.js');
const {buildCareExplanationTargets,foodExplanationTarget}=await runner.load('lib/radar_v1/careExplanationTargets.js');
const {buildCareExplanationItems,buildResultCareExplanationInput}=await runner.load('lib/mimoru/careExplanationInput.js');
const {LINE_ACTION_FACTS,lineCareFacts,pointCareFacts}=await runner.load('lib/mimoru/careKnowledge.js');
const {buildResultCareExample}=await runner.load('lib/diagnosis/v2/resultCareExample.js');
const {resolveDisplayedCarePlan,getRiskContext}=await runner.load('app/radar/utils.js');
const {SYMPTOM_LABELS}=await runner.load('lib/diagnosis/v2/labels.js');
const {getCareMovementImage}=await runner.load('lib/radar_v1/careMovementImages.js');
const model=await import('data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../lib/mimoru/insightModel.js',import.meta.url))).toString('base64'));
const copy=item_key=>({item_key,reason:'この体質と不調に合わせた理由。',theory:'提示したケアの固有の働き。',guidance:'提示した手順に沿った加減。',check:'前後の体感。'});

test('all 22 illustrated actions have region-specific facts; palm and dorsal forearm are separate channels',()=>{
 assert.equal(Object.keys(LINE_ACTION_FACTS).length,22);
 for(const id of Object.keys(LINE_ACTION_FACTS)){
  const fact=lineCareFacts(id);
  assert.ok(fact.region&&fact.relation&&fact.channels.every(row=>row.course&&row.functions.length));
  assert.ok(getCareMovementImage(id).src);
 }
 assert.deepEqual(lineCareFacts('line-pc-sj-inner-forearm-stroke').channels.map(x=>x.code),['pc']);
 assert.deepEqual(lineCareFacts('line-pc-sj-outer-forearm-stroke').channels.map(x=>x.code),['te']);
 assert.match(lineCareFacts('line-heart-si-little-finger-stroke').channels.find(x=>x.code==='si').course,/肩甲骨.*首/);
 assert.equal(lineCareFacts('invented'),null);
 const point=pointCareFacts({code:'SI3',name_ja:'後渓',meridian_code:'heart_si',tcm_actions:[]});
 assert.equal(point.channel.code,'si');
 assert.ok(point.point_properties.roles.some(x=>x.includes('督脈')));
 assert.ok(pointCareFacts({code:'PC6'}).point_properties.actions.includes('和胃降逆'));
});

test('360 profile/complaint/scene/date-mode combinations cover every preview and preserve recording identities',()=>{
 let cases=0,previews=0,maxTargets=0;
 for(let profile=0;profile<4;profile++) for(const symptom of Object.keys(SYMPTOM_LABELS)) for(const scene of ['general','desk','screen','carry','sleep']) for(const mode of ['today','tomorrow']){
  const forecast=runner.run(scenarios[profile===2?13:9][1],profile,symptom).forecast;
  const care=resolveDisplayedCarePlan({forecast,riskContext:getRiskContext({forecast}),mode,targetDate:'2026-11-10',symptomFocus:symptom,lifestyleScene:scene});
  const food=care.tomorrow_food_context||care.night_food||{},tsuboSet=care.night_tsubo_set||{};
  const items=buildDisplayedCareItems({food,tsuboPoints:tsuboSet.points,tsuboSet,sourceMode:mode});
  const before=JSON.stringify({items,food,tsuboSet});
  const targets=buildCareExplanationTargets({items,food,sourceMode:mode});
  assert.deepEqual(targets.filter(x=>x.recordable).map(x=>x.item_key),items.map(x=>x.item_key));
  assert.equal(new Set(targets.map(x=>x.item_key)).size,targets.length);
  for(const card of food.action_cards||[]){
   if(card.proposal) assert.equal(foodExplanationTarget(targets,card).kind,'food_proposal');
   if(card.key==='caution')continue;
   for(let i=0;i<(card.items||[]).length;i++){
    const target=foodExplanationTarget(targets,card,i);assert.ok(target,`${mode}/${card.key}/${i}`);
    if(card.item_details?.[i]?.recordable===false){assert.equal(target.recordable,false);assert.equal(target.canonical_key,undefined);previews++;}
   }
  }
  const input=buildCareExplanationItems({items:targets,food,lifestylePlan:care.lifestyle_plan,tsuboSet});
  assert.deepEqual(input.map(x=>x.item_key),targets.map(x=>x.item_key));
  for(const row of input.filter(x=>x.kind==='tsubo_line_care')){
   assert.ok(row.care_facts);assert.equal(row.characteristics,undefined);
   assert.doesNotMatch(JSON.stringify(row.care_facts),/腕まで張る|腕へ残る|肩で息/);
  }
  const request={selected_care:{items:input}};
  const output={daily_summary:'対象日の説明。',care_rationale:'選ばれた方針。',care_invitation:'どれから見てみる？',item_reasons:input.map(x=>copy(x.item_key)).reverse()};
  const checked=model.validateInsight('forecast',output,request);
  assert.deepEqual(checked.item_reasons.map(x=>x.item_key),targets.map(x=>x.item_key));
  assert.equal(JSON.stringify({items,food,tsuboSet}),before);
  maxTargets=Math.max(maxTargets,targets.length);cases++;
 }
 assert.equal(cases,360);assert.ok(previews>0);assert.ok(maxTargets>=15);
});

test('result care input uses the exact illustrated action and carries no old generic symptom story',()=>{
 for(const profile of runner.profiles) for(const symptom of Object.keys(SYMPTOM_LABELS)){
  const example=buildResultCareExample({computed:profile.constitution,answers:profile.answer,symptomKey:symptom,createdAt:'2026-11-06T15:30:00Z'});
  const input=buildResultCareExplanationInput(example);
  assert.equal(input.item_key,example.id);assert.equal(input.action,example.action);assert.ok(input.care_facts);
  assert.equal(input.selection_evidence.trigger_key,null);assert.equal(input.selection_evidence.signal,0);
  assert.equal(input.public_reason,undefined);assert.equal(input.short_reason,undefined);
  assert.equal(input.check_prompt,undefined);
 }
});

test('full care validation rejects missing fields, overlong output and mismatched result or forecast targets',()=>{
 const example=buildResultCareExample({computed:runner.profiles[1].constitution,symptomKey:'neck_shoulder'});
 const input={constitution:{care_preferences:[{key:'sasaeru'}]},weather_affinity:[{key:'cold'}],care_example:buildResultCareExplanationInput(example)};
 const value={overview:'体質と不調のつながり。',weather_connections:[{key:'cold',explanation:'天気のつながり。'}],care_connections:[{key:'sasaeru',explanation:'方針のつながり。'}],care_example:copy(example.id)};
 assert.deepEqual(model.validateInsight('constitution',value,input),value);
 assert.throws(()=>model.validateInsight('constitution',{...value,care_example:copy('foreign')},input),/foreign_result/);
 const daily={selected_care:{items:[{item_key:'a'},{item_key:'b'}]}};
 const payload={daily_summary:'日々の説明。',care_rationale:'方針。',care_invitation:'案内。',item_reasons:[copy('a'),copy('b')]};
 for(const field of ['reason','theory','guidance','check']){
  const broken=structuredClone(payload);delete broken.item_reasons[0][field];
  assert.throws(()=>model.validateInsight('forecast',broken,daily),field);
  const result=structuredClone(value);delete result.care_example[field];assert.throws(()=>model.validateInsight('constitution',result,input),field);
 }
 for(const rows of [[copy('a')],[copy('a'),copy('a')],[copy('a'),copy('foreign')]]) assert.throws(()=>model.validateInsight('forecast',{...payload,item_reasons:rows},daily));
 const tooLong=structuredClone(payload);tooLong.item_reasons[0].theory='長'.repeat(241);assert.throws(()=>model.validateInsight('forecast',tooLong,daily));
 const schema=model.insightSchema('forecast',daily);
 assert.deepEqual(schema.properties.item_reasons.items.required,['item_key','reason','theory','guidance','check']);
 assert.deepEqual(schema.properties.item_reasons.items.properties.item_key.enum,['a','b']);
});

test('plain-language insights use a new cache version and hash every care text input',()=>{
 assert.equal(model.INSIGHT_VERSION,'mimoru_plain_language_v9_20261120');
 const base={care_example:{item_key:'one',care_facts:{version:'v1'}}};
 const key=model.insightKey('constitution',base,'m');
 assert.notEqual(key,model.insightKey('constitution',{care_example:{item_key:'two',care_facts:{version:'v1'}}},'m'));
 assert.notEqual(key,model.insightKey('constitution',{care_example:{item_key:'one',care_facts:{version:'v2'}}},'m'));
 assert.doesNotMatch(model.INSIGHT_INSTRUCTIONS,/医療的.*断定|診断.*しない|仮説として説明|改善が保証/);
});
