import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';

const {load}=await createScenarioRunner();
const food=await load('lib/radar_v1/careRules/foodTcm.js');
const copy=await load('lib/radar_v1/careRules/foodExplanations.js');
const drinks=await load('lib/radar_v1/careRules/drinkRules.js');
const recipes=await load('lib/radar_v1/careRules/foodCombinationRecipes.js');
const actions=await load('lib/radar_v1/careActionItems.js');
const policy=await load('lib/push/notificationPolicy.js');
const {cleanDrinkSelectionBasis}=await load('lib/radar_v1/drinkSelectionSnapshot.js');
const model=name=>drinks.DRINK_ITEMS.find(item=>item.name===name);
const options={mode:'today',targetDate:'2026-10-15',subLabels:['fluid_damp'],symptomFocus:'fatigue',theme:{trigger_key:'damp',signal:1,policies:[{key:'nagasu'}]}};

test('81 foods have reusable explanations; taste names are not a mandatory display template',()=>{
  const foods=food.FOOD_ITEMS.filter(item=>item.role!=='drink');
  assert.equal(foods.length,81);
  assert.equal(Object.keys(copy.FOOD_EXPLANATIONS).length,81);
  for(const item of foods){
    const text=copy.foodTheoryText(item.name);
    assert.ok(text.length>=30&&text.length<=240,item.name);
    assert.doesNotMatch(text,/専門家確認前|TODO|五味では|臨床効果|たんぱく質|ビタミン/);
  }
  assert.match(copy.foodTheoryText('しそ'),/香り.*巡り/);
  assert.match(copy.foodTheoryText('生姜'),/辛味.*冷え/);
  assert.match(copy.foodTheoryText('鶏肉'),/温め/);
});

test('the original 14 drink identities are retained and eight food-material blends/flowers are added',()=>{
  const legacy=['水','白湯','麦茶','ほうじ茶','緑茶','コーヒー','デカフェコーヒー','ルイボスティー','はとむぎ茶','とうもろこし茶','小豆茶','黒豆茶','生姜湯','葛湯'];
  assert.equal(drinks.DRINK_ITEMS.length,22);
  legacy.forEach((name,i)=>assert.equal(model(name).id,`drink-${i+1}`));
  for(const item of drinks.DRINK_ITEMS){
    assert.ok(item.theory&&item.howTo&&item.ingredients.length,item.name);
    assert.doesNotMatch(JSON.stringify(item),/専門家確認前/);
  }
  assert.equal(drinks.DRINK_ITEMS.filter(item=>!item.tags.includes('snack')).length,21);
  assert.match(model('ジャスミン花茶').ingredients.join(' '),/茶葉なし/);
  assert.equal(model('ジャスミン花茶').caffeine,false);
  assert.match(model('とうもろこし茶').ingredients.join(' '),/実/);
  assert.doesNotMatch(model('とうもろこし茶').ingredients.join(' '),/ひげ/);
  assert.match(model('マイカイ花茶').ingredients.join(' '),/Rosa rugosa/);
});

test('coffee wakefulness and generic aroma do not become constitution or fatigue evidence',()=>{
  for(const name of ['コーヒー','デカフェコーヒー']){
    const item=model(name);
    assert.ok(!item.tags.includes('move_qi')&&!item.tags.includes('wake'));
    for(const subLabels of [['qi_stagnation'],['blood_stasis'],['qi_deficiency']]){
      const scored=drinks.scoreDrink(item,{triggerKey:'default',subLabels,symptomFocus:'fatigue'});
      assert.ok(!scored._matches.some(match=>match.source==='constitution'||match.source==='symptom'));
    }
  }
  assert.ok(!model('とうもろこし茶').tags.includes('digest'));
  assert.ok(!model('生姜湯').tags.includes('support_spleen'));
  assert.ok(!model('ルイボスティー').tags.includes('calm'));
});

test('all drink contexts keep two distinct suitable drinks, with evidence-backed reasons and correct timing',()=>{
  const labels=[[],['qi_deficiency'],['qi_stagnation'],['fluid_damp'],['fluid_deficiency'],['cold_pattern','heat_pattern']];
  for(const subLabels of labels)for(const triggerKey of ['default','cold','heat','damp','dry','pressure_up','pressure_down','temp_shift'])
  for(const symptomFocus of ['fatigue','sleep','digestion','mood','swelling','headache','dizziness'])for(const mode of ['today','tomorrow']){
    const context={subLabels,triggerKey,symptomFocus,mode,targetDate:'2026-10-15'};
    const card=drinks.buildDrinkActionCard(context);
    assert.equal(card.items.length,2,JSON.stringify(context));
    assert.equal(new Set(card.items).size,2);
    const pair=card.items.map(model);
    assert.ok(!pair[0].familyKeys.some(key=>pair[1].familyKeys.includes(key)));
    for(const detail of card.item_details){
      const item=model(detail.label),scored=drinks.scoreDrink(item,context);
      assert.ok(scored._eligible&&!item.tags.includes('snack'));
      if(symptomFocus==='sleep')assert.equal(item.caffeine,false);
      assert.equal(detail.recordable,mode==='today');
      assert.ok(detail.public_reason.length<=110);
      assert.notEqual(detail.public_reason,detail.theory_details[0].text);
      assert.ok(detail.how_to&&detail.caffeine_label);
      assert.ok(detail.selection_basis.reason_key==='everyday'||scored._matches.some(match=>match.key===detail.selection_basis.reason_key));
      assert.equal(detail.selection_basis.theory,detail.theory_details[0].text);
      assert.equal(detail.selection_basis.target_date,context.targetDate);
    }
  }
});

test('a constitution-only thermal signal never claims observed hot or cold weather',()=>{
  for(const [label,weather] of [['cold_pattern','冷え'],['heat_pattern','暑さ']]){
    const context={triggerKey:'pressure_up',subLabels:[label],targetDate:'2026-10-15'};
    for(const detail of drinks.buildDrinkActionCard(context).item_details){
      assert.ok(!detail.public_reason.includes(`今日の${weather}`),detail.public_reason);
    }
  }
});

test('the same target day keeps the drink choice across today and tomorrow views',()=>{
  for(let day=1;day<=14;day++){
    const targetDate=`2026-10-${String(day).padStart(2,'0')}`;
    const context={targetDate,triggerKey:'damp',subLabels:['fluid_damp'],symptomFocus:'swelling'};
    assert.deepEqual(drinks.buildDrinkActionCard({...context,mode:'today'}).items,drinks.buildDrinkActionCard({...context,mode:'tomorrow'}).items);
  }
});

test('recipes may include additional foods; their thermal eligibility is checked',()=>{
  assert.equal(recipes.FOOD_COMBINATION_RECIPES.length,106);
  assert.ok(recipes.FOOD_COMBINATION_RECIPES.filter(item=>item.additional_foods?.length).length>=10);
  for(const trigger_key of ['cold','heat','damp','dry']){
    const opt={...options,theme:{...options.theme,trigger_key}};
    const eligible=new Set(food.rankTcmFoods(opt).map(item=>item.name));
    for(const combo of food.rankFoodCombinations(opt))for(const name of combo.additional_foods||[])assert.ok(eligible.has(name));
  }
  const combo=food.rankFoodCombinations({...options,theme:{trigger_key:'cold'}}).find(item=>item.foods.some(f=>f.name==='鯖')&&item.foods.some(f=>f.name==='しそ'));
  assert.ok(combo);
  const detail=food.foodCombinationDetail(combo,options);
  assert.match(detail.meal_example,/混ぜごはん/);
  assert.ok(detail.additional_foods.includes('ごはん'));
  assert.equal(detail.theory_details.length,3);
});

const h=(type,props,...children)=>typeof type==='function'?type({...props,children}):({type,props:props||{},children:children.flat(Infinity).filter(value=>value!==null&&value!==false&&value!==undefined)});
const nodes=(tree,type)=>!tree||typeof tree!=='object'?[]:[...(tree.type===type?[tree]:[]),...tree.children.flatMap(child=>nodes(child,type))];
const text=tree=>typeof tree==='string'?tree:tree&&typeof tree==='object'?tree.children.map(text).join(''):'';
async function component(name,deps={}){
  const source=await fs.readFile(new URL(`../app/radar/${name}.jsx`,import.meta.url),'utf8');
  return new Function('h',...Object.keys(deps),source.replace(/^import .*;\r?\n/gm,'').replace('export default function','function')+`\nreturn ${name};`)(h,...Object.values(deps));
}
const CareTheoryDetails=await component('CareTheoryDetails');
const FoodCard=await component('FoodCombinationCard',{CareTheoryDetails});
const DrinkCard=await component('DrinkCareCard',{CareTheoryDetails});

test('actual drink card shows short reason and caffeine outside a closed theory section',()=>{
  const detail=drinks.buildDrinkActionCard({triggerKey:'damp',subLabels:['fluid_damp'],targetDate:'2026-10-15'}).item_details[0];
  const tree=DrinkCard({label:detail.label,detail,action:h('button',{},'飲んだ')});
  const folds=nodes(tree,'details');assert.equal(folds.length,1);assert.ok(!folds[0].props.open);
  assert.equal(text(nodes(folds[0],'summary')[0]),'東洋医学での考え方');
  assert.ok(!text(folds[0]).includes(detail.public_reason));
  assert.ok(tree.children.some(child=>text(child)===detail.public_reason));
  assert.ok(tree.children.some(child=>text(child)===detail.how_to));
  assert.ok(tree.children.some(child=>text(child)===detail.caffeine_label));
  assert.equal(nodes(tree,'button').length,1);
  assert.equal(CareTheoryDetails({details:[]}),null);
});

test('actual food card orders ingredient names, short reason, recipe, theory and individual records',()=>{
  const card=food.buildTcmFoodPlan(options).action_cards.find(card=>card.key==='choice');
  const tree=FoodCard({card,actions:[{},{}],renderAction:()=>h('button',{},'食べた')});
  assert.equal(tree.children[0].type,'h3');
  assert.equal(text(tree.children[1]),card.proposal.public_reason);
  assert.ok(text(tree.children[2]).includes(card.proposal.meal_example));
  assert.equal(tree.children[3].type,'details');assert.ok(!tree.children[3].props.open);
  assert.ok(!text(tree).includes('今回選んだ理由'));
  assert.equal(nodes(tree,'button').length,2);
});

test('food and drink records preserve the displayed explanation revision and theory through the API boundary',async()=>{
  const drinkCard=drinks.buildDrinkActionCard({triggerKey:'damp',targetDate:options.targetDate,subLabels:options.subLabels});
  const plan=food.buildTcmFoodPlan({...options,drinkCard});
  const items=actions.buildDisplayedCareItems({food:plan,sourceMode:'today'});
  const source=await fs.readFile(new URL('../app/api/radar/care-actions/route.js',import.meta.url),'utf8');
  const block=source.slice(source.indexOf('function cleanSnapshot('),source.indexOf('\nasync function ',source.indexOf('function cleanSnapshot(')));
  const clean=new Function('compact','cleanDrinkSelectionBasis',block+';return cleanSnapshot;')((v,n)=>String(v||'').trim().slice(0,n),cleanDrinkSelectionBasis);
  for(const semantic of ['ingredient_consumed','drink_consumed']){
    const item=items.find(item=>item.meta.record_semantics===semantic);
    const saved=clean(item,{domain:'eat',canonicalKey:item.canonical_key});
    assert.equal(saved.meta.selection_reason,item.meta.selection_reason);
    assert.equal(saved.meta.selection_basis.theory,item.meta.selection_basis.theory);
    assert.equal(saved.meta.selection_basis.content_version,item.meta.selection_basis.content_version);
    assert.equal(saved.meta.consumed_id,item.meta.consumed_id);
  }
});

test('notification settings display the public scale while preserving the internal threshold',async()=>{
  assert.equal(policy.DEFAULT_NOTIFICATION_MIN_SCORE,4);
  assert.equal(policy.notificationThresholdLabel(),'体調警戒度が40点以上（いたわり以上）');
  assert.equal(policy.notificationThresholdLabel(6),'体調警戒度が60点以上');
  for(const value of [null,'',undefined,'bad',40])assert.equal(policy.notificationThresholdLabel(value),'体調警戒度が40点以上（いたわり以上）');
  for(const file of ['app/settings/page.js','components/pwa/PushNotificationPrompt.jsx']){
    const source=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');
    assert.doesNotMatch(source,/体調警戒度が4点|\$\{minScore\}点|\{minScore\}点/);
    assert.match(source,/notificationThresholdLabel\(/);
  }
});
