import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';
const {load}=await createScenarioRunner();
const d=await load('lib/radar_v1/careRules/drinkRules.js');
const {cleanDrinkSelectionBasis}=await load('lib/radar_v1/drinkSelectionSnapshot.js');
const context={triggerKey:'damp',symptomFocus:'swelling',subLabels:['fluid_damp'],targetDate:'2026-09-21',mode:'today'};
test('API snapshot preserves drink evidence as JSON and leaves food evidence compatible',()=>{
 const src=fs.readFileSync(new URL('../app/api/radar/care-actions/route.js',import.meta.url),'utf8');
 const compact=src.slice(src.indexOf('function compact('),src.indexOf('function withinEditWindow('));
 const clean=src.slice(src.indexOf('function cleanSnapshot('),src.indexOf('function allowedCardTargetDate('));
 const fn=vm.runInNewContext(`${compact}\n${clean}\ncleanSnapshot`,{cleanDrinkSelectionBasis});
 const card=d.buildDrinkActionCard(context).item_details[0];
 const result=fn({meta:{record_semantics:'drink_consumed',consumed_name:card.consumed_name,selection_reason:card.public_reason,selection_basis:card.selection_basis}},{label:'test'});
 assert.deepEqual(result.meta.selection_basis.matched_context,card.selection_basis.matched_context.map(x=>({...x,tags:x.tags||[]})));
 for(const key of ['target_date','symptom_focus','trigger_key','strength','reason'])assert.equal(result.meta.selection_basis[key],card.selection_basis[key]);
 assert.equal(result.meta.selection_reason,card.public_reason);
 assert.ok(!JSON.stringify(result).includes('[object Object]'));
 const food=fn({meta:{record_semantics:'ingredient_consumed',selection_basis:{matched_context:'胃腸の働き'}}},{label:'test'});
 assert.equal(food.meta.selection_basis.matched_context,'胃腸の働き');
});
test('drink evidence rejects malformed weights and bounds arrays; legacy strings are tolerated',()=>{
 const clean=cleanDrinkSelectionBasis({matched_context:[{source:'weather',key:'damp',weight:3,tags:['drain_damp']},{weight:Infinity},{weight:-1},null],tag_strengths:{drain_damp:'weak',invalid:'huge'}});
 assert.equal(clean.matched_context.length,1);
 assert.deepEqual(clean.tag_strengths,{drain_damp:'weak'});
 assert.deepEqual(cleanDrinkSelectionBasis({matched_context:'old'}).matched_context,[]);
});
test('near-score drinks vary across dates but remain stable within target date',()=>{
 const c={triggerKey:'default',symptomFocus:'fatigue',subLabels:['qi_deficiency']};
 const pairs=new Set();
 for(let n=1;n<=14;n++){
  const targetDate=`2026-09-${String(n).padStart(2,'0')}`;
  const a=d.buildDrinkActionCard({...c,targetDate,mode:'today'});
  const ranked=d.DRINK_ITEMS.map(x=>d.scoreDrink(x,{...c,targetDate})).filter(x=>x._eligible);
  assert.ok(ranked.find(x=>x.name===a.items[0])._score>=Math.max(...ranked.map(x=>x._score))-1.5);
  assert.deepEqual(a.items,d.buildDrinkActionCard({...c,targetDate,mode:'tomorrow'}).items);
  assert.deepEqual(a.items,d.buildDrinkActionCard({...c,targetDate}).items);
  pairs.add(a.items.join(','));
 }
 assert.ok(pairs.size>1);
});
test('rotation respects thermal/caffeine restrictions, distinct pairs, snack exclusion and record timing',()=>{
 for(const triggerKey of ['cold','heat','damp'])for(const mode of ['today','tomorrow'])for(let n=1;n<=7;n++){
  const c={triggerKey,mode,symptomFocus:'sleep',targetDate:`2026-09-0${n}`};
  const card=d.buildDrinkActionCard(c);
  assert.equal(new Set(card.items).size,2);
  for(const x of card.item_details){
   const model=d.DRINK_ITEMS.find(y=>y.name===x.label);
   assert.ok(d.scoreDrink(model,c)._eligible);assert.equal(model.caffeine,false);assert.notEqual(x.label,'葛湯');
   assert.equal(x.recordable,mode==='today');assert.equal(x.selection_basis.target_date,c.targetDate);
  }
 }
});
test('corn tea and swelling copy avoid duplicated endings and food-therapy wording',()=>{
 const c={triggerKey:'damp',subLabels:['fluid_damp']};
 const text=d.buildDrinkFoodNatureReason(d.DRINK_ITEMS.find(x=>x.name==='とうもろこし茶'),c);
 assert.ok((text.match(/取り入れます/g)||[]).length<2);
 for(const name of ['はとむぎ茶','小豆茶']){
  const text=d.buildDrinkFoodNatureReason(d.DRINK_ITEMS.find(x=>x.name===name),context);
  assert.equal((text.match(/食養生/g)||[]).length,0);
  assert.match(text,/水分の偏り/);
 }
});
