import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';
const {load}=await createScenarioRunner();
const d=await load('lib/radar_v1/careRules/drinkRules.js');
const byName=name=>d.DRINK_ITEMS.find(x=>x.name===name);
const names=c=>d.buildDrinkActionCard(c).items;

test('legacy ingredient scoring executes matching needs without a drink binding',async()=>{
 const source=await fs.readFile(new URL('../lib/radar_v1/careRules/foodIngredientRules.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function foodScore('),source.indexOf('function getBestFood('));
 const score=vm.runInNewContext(`(${fn.trim()})`);
 assert.equal(score({tags:['support_spleen']},{needs:['support_spleen'],anti:[],triggerKey:'default'}),4);
 assert.equal(score({tags:['support_spleen'],anti:['dry']},{needs:['support_spleen'],anti:['dry'],triggerKey:'dry'}),-4);
});
test('restored primary associations outweigh supporting drainage and digestion',()=>{
 const weight=(name,tag)=>d.DRINK_STRENGTH_WEIGHTS[byName(name).tagStrengths[tag]||byName(name).strength];
 for(const [name,tags] of [['はとむぎ茶',['support_spleen','drain_damp']],['とうもろこし茶',['support_spleen','digest','drain_damp']],['小豆茶',['drain_damp','support_spleen']],['黒豆茶',['kidney','blood','drain_damp']]])
  for(const tag of tags)assert.ok(byName(name).tags.includes(tag));
 assert.ok(weight('はとむぎ茶','drain_damp')>weight('とうもろこし茶','drain_damp'));
 assert.ok(weight('小豆茶','drain_damp')>weight('小豆茶','support_spleen'));
 assert.ok(weight('黒豆茶','blood')>weight('黒豆茶','drain_damp'));
 for(const name of ['水','コーヒー','デカフェコーヒー','ルイボスティー'])assert.equal(byName(name).strength,'weak');
 assert.equal(byName('ほうじ茶').natureRange,'平〜温');
});
test('representative contexts express each drink character in the main pair',()=>{
 assert.deepEqual(names({triggerKey:'damp',symptomFocus:'swelling',subLabels:['fluid_damp']}),['はとむぎ茶','小豆茶']);
 assert.deepEqual(names({triggerKey:'cold',symptomFocus:'digestion'}),['生姜湯','白湯']);
 assert.deepEqual(names({triggerKey:'heat'}),['緑茶','麦茶']);
 assert.equal(names({triggerKey:'dry',symptomFocus:'sleep'})[0],'ルイボスティー');
 assert.deepEqual(names({triggerKey:'default',symptomFocus:'fatigue',subLabels:['qi_deficiency']}),['黒豆茶','コーヒー']);
 const c={triggerKey:'cold',subLabels:['fluid_deficiency']};
 assert.ok(names(c).includes('ほうじ茶'));assert.ok(!names(c).includes('緑茶'));
 assert.match(d.buildDrinkFoodNatureReason(byName('ほうじ茶'),c),/冷え.*ほうじ茶/);
});
test('kuzu remains an optional third candidate while all main drink surfaces agree',()=>{
 for(const mode of ['today','tomorrow']){
  const c={triggerKey:'cold',symptomFocus:'digestion',mode};
  const rows=d.buildDrinkRecommendationRows(c);
  assert.equal(rows[2].name,'葛湯');
  assert.deepEqual(d.formatDrinkLeadNames(c),names(c));
  assert.ok(!names(c).includes('葛湯'));
  assert.equal(byName('葛湯').nature,null);
 }
});
