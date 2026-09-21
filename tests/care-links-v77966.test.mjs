import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from './helpers/rule-read.mjs';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';
const {load}=await createScenarioRunner();
const daily=await load('lib/radar_v1/careRules/dailyCareV2.js');
const actions=await load('lib/radar_v1/careActionItems.js');
const ai=await load('lib/records/aiContext.js');
const shop=await load('lib/care-navi/lifestyleShopContext.js');
let route=await readFile(new URL('../app/api/radar/care-actions/route.js',import.meta.url),'utf8');
route=route.replace(/import[\s\S]*?from\s+["'][^"']+["'];\s*/g,'').replace(/export /g,'');
const clean=new Function('RECORDS_EDIT_LOOKBACK_DAYS',route+';return cleanSnapshot;')(7);
test('actual API sanitizer preserves daily line provenance across JSON persistence and rejects unbounded extra metadata',()=>{
 const care=daily.buildMeridianLineCare({theme:{target_date:'2026-09-19',trigger_key:'damp',symptom_focus:'fatigue',sub_labels:['fluid_damp'],policies:[]}});
 const item=actions.buildDisplayedCareItems({tsuboSet:{line_care:care}}).find(x=>x.kind==='tsubo_line_care');
 const saved=JSON.parse(JSON.stringify(clean(item,{canonicalKey:'test',domain:'loosen',sourceMode:'today'})));
 for(const key of ['meridian_code','line_group_id','selection_source','selection_reason','selection_basis'])assert.deepEqual(saved.meta[key],item.meta[key],key);
 for(const source of ['check','daily','combined'])assert.equal(clean({meta:{selection_source:source}},{}).meta.selection_source,source);
 const bad=clean({meta:{meridian_code:'fake',selection_source:'fake',selection_reason:'x'.repeat(999),selection_basis:{checked_rank:99,constitution:'yes',unexpected:'secret'}}},{});
 assert.equal(bad.meta.meridian_code,null);assert.equal(bad.meta.selection_source,null);assert.equal(bad.meta.selection_reason.length,240);assert.equal(bad.meta.selection_basis.checked_rank,null);assert.equal(bad.meta.selection_basis.constitution,false);assert.equal(bad.meta.selection_basis.unexpected,undefined);
});
test('AI context never reuses a saved care snapshot from the opposite mode or an unknown legacy mode',()=>{
 for(const mode of ['today','tomorrow']){
  const saved={display_mode:mode,source:'reconstructed_at_first_record_save',marker:'saved'};
  const row={forecast:{displayed_care:saved}};
  assert.equal(ai.buildDisplayedCareContext(row,{}, {mode}).marker,'saved');
  assert.equal(ai.buildDisplayedCareContext(row,{}, {mode:mode==='today'?'tomorrow':'today'}),null);
 }
 assert.equal(ai.buildDisplayedCareContext({forecast:{displayed_care:{marker:'legacy'}}},{}),null);
});
test('every scene and forecast mode links only a visible equipment care to a shop-supported action',()=>{
 for(const mode of ['today','tomorrow'])for(const scene of daily.LIFESTYLE_SCENES)for(const symptomFocus of ['sleep','fatigue','digestion','neck_shoulder','headache','dizziness','low_back_pain','swelling','mood'])for(const triggerKey of ['damp','dry','cold','heat','pressure_up','pressure_down']){
  const p=daily.enhanceDailyCarePlan({mode,lifestyleScene:scene.key,targetDate:'2026-09-19',symptomFocus,triggerKey,forecast:{signal:1},riskContext:{constitution_context:{core_code:'brake_batt_small',sub_labels:['fluid_damp','qi_deficiency']}}}).lifestyle_plan;
  if(!p.shop_context)continue;
  const c=p.shop_context;
  assert.ok([p.primary_action,...p.alternatives].some(x=>x&&!x.restricted&&x.equipment&&x.id===c.action_id));
  assert.equal(shop.normalizeLifestyleShopActionKey(c.action_id),c.action_id);
  assert.equal(shop.normalizeLifestyleShopItemRole(c.item_role),c.item_role);
 }
});
