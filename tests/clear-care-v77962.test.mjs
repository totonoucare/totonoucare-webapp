import test from 'node:test';
import assert from 'node:assert/strict';
import fs from './helpers/rule-read.mjs';
import {createScenarioRunner,scenarios} from './helpers/forecast-scenarios.mjs';
const {load,run}=await createScenarioRunner();
const daily=await load('lib/radar_v1/careRules/dailyCareV2.js');
const actions=await load('lib/radar_v1/careActionItems.js');
const snapshot=await load('lib/radar_v1/displayedCareSnapshot.js');
const source=await fs.readFile(new URL('../lib/radar_v1/careRules/dailyCareV2.js',import.meta.url),'utf8');
const catalog=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {ENVIRONMENT_ADJUSTMENT_CANDIDATES,BODY_MECHANICS_LIFESTYLE_CANDIDATES};').toString('base64'));
const candidates=[...catalog.ENVIRONMENT_ADJUSTMENT_CANDIDATES,...catalog.BODY_MECHANICS_LIFESTYLE_CANDIDATES];
const page=await fs.readFile(new URL('../app/radar/page.js',import.meta.url),'utf8');
const shop=await fs.readFile(new URL('../app/care-navi/page.js',import.meta.url),'utf8');

test('curated catalog has concrete actions and checks; withdrawn instructions never return',()=>{
 assert.equal(candidates.length,17);assert.equal(candidates.filter(x=>x.conditional).length,4);
 for(const x of candidates){assert.ok(x.text.length<=75,x.id);assert.ok(x.felt_sense);assert.ok(x.scene);assert.doesNotMatch(x.text,/後頭部|みぞおち|内くるぶし|リモコン|明朝最初/);}
 assert.equal(new Set(candidates.map(x=>x.id)).size,candidates.length);
});

test('both date modes cover all symptom focuses with relevant, reproducible care',()=>{
 const symptoms=['fatigue','sleep','digestion','neck_shoulder','low_back_pain','swelling','headache','dizziness','mood'];
 for(const mode of ['today','tomorrow'])for(const symptomFocus of symptoms)for(const trigger of ['none','damp','heat','dry','cold','pressure_down','pressure_up','temp_shift']){
  const input={mode,lifestyleScene:symptomFocus === "dizziness" ? "screen" : "general",targetDate:'2026-09-19',symptomFocus,triggerKey:trigger,forecast:{signal:1},riskContext:{constitution_context:{core_code:'brake_batt_small',sub_labels:['fluid_damp','qi_deficiency']}}};
  const p=daily.enhanceDailyCarePlan(input),a=p.lifestyle_plan.primary_action;
  assert.ok(a,`${mode}/${symptomFocus}/${trigger}`);
  assert.ok(a.selected_because.some(x=>x.axis==='symptom'&&x.key===symptomFocus));
  assert.deepEqual(p,daily.enhanceDailyCarePlan(input));
  assert.equal(p.lifestyle_plan.forecast_insight,'');
  assert.ok(p.care_theme.selection_reason.endsWith('方針です。'));
  if(trigger==='none')assert.doesNotMatch(p.care_theme.selection_reason,/今日の湿気|明日の湿気|気圧変化/);
  if(symptomFocus==='dizziness')assert.doesNotMatch(a.id,/stand|walk|stairs|bath/);
 }
});

test('food adoption records preserve their meaning through API cleaning, identity, and snapshots',async()=>{
 const p=run(scenarios[2][1],1,'fatigue').care;
 const item=actions.buildDisplayedCareItems({food:p.night_food}).find(x=>x.kind==='food_choice_item');
 assert.match(item.label,/を食べた$/);
 assert.equal(item.meta.record_semantics,'ingredient_consumed');
 assert.ok(item.meta.meal_example);assert.ok(item.meta.consumed_id);assert.equal(item.meta.consumed_name+"を食べた",item.label);
 const api=await fs.readFile(new URL('../app/api/radar/care-actions/route.js',import.meta.url),'utf8');
 const block=api.slice(api.indexOf('function cleanSnapshot('),api.indexOf('\nasync function ',api.indexOf('function cleanSnapshot(')));
 const clean=new Function('compact',block+';return cleanSnapshot;')((v,n)=>String(v||'').trim().slice(0,n));
 const saved=clean(item,{canonicalKey:item.canonical_key,label:item.label,detail:item.detail,kind:item.kind,domain:item.domain,sourceMode:'today',entryOrigin:'daily_care_card'});
 assert.equal(saved.meta.record_semantics,item.meta.record_semantics);
 assert.equal(saved.meta.consumed_name,item.meta.consumed_name);
 assert.deepEqual(saved.meta.selection_basis.functions,item.meta.selection_basis.functions);
 const row={...item,canonical_key:undefined,item_snapshot:{...saved,canonical_key:undefined}};
 assert.equal(actions.canonicalCareActionKey(row),item.canonical_key);
 const legacy={domain:'eat',kind:'food_choice_item',label:item.meta.meal_example,meta:{card_key:'choice'}};
 assert.notEqual(actions.canonicalCareActionKey(legacy),item.canonical_key);
 assert.equal(actions.normalizeCareAction({...legacy,source_mode:'today'}).label,item.meta.meal_example);
 const visible=snapshot.buildDisplayedCareSnapshot({carePlan:p}).exact_visible_items.find(x=>x.kind==='food_choice_item');
 assert.equal(visible.label,`${item.meta.consumed_name}の提案`);assert.equal(visible.canonical_key,item.canonical_key);
});

test('tabs start with food; category deep links and date switches keep user intent',()=>{
 assert.match(page,/\[careTab, setCareTab\] = useState\("eat"\)/);
 assert.match(page,/key: "eat", label: "食べる"[\s\S]*key: "loosen", label: "ほぐす"[\s\S]*key: "live", label: "暮らす"/);
 assert.match(shop,/\[singleCategory, setSingleCategory\] = useState\("eat"\)/);
 assert.match(shop,/\[viewMode, setViewMode\] = useState\("single"\)/);
 assert.match(shop,/setSingleCategory\(nextCategory\)/);
 assert.equal((page.match(/setCareTab\(/g)||[]).length,0); // Tab changes use onChange; no date-load reset.
 assert.doesNotMatch(page,/できそうなケアを一つ|foodContextChips|lifestyleContextChips|lifestylePlan\.forecast_insight/);
 assert.match(page,/carePlan\?\.care_theme\?\.selection_reason/);
});
