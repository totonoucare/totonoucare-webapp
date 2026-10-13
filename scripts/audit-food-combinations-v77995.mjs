// Read-only local scenario audit. No Supabase, accounts, or production writes.
import path from 'node:path';
import {createScenarioRunner,scenarios} from '../tests/helpers/forecast-scenarios.mjs';
const runner=await createScenarioRunner();
const food=await runner.load('lib/radar_v1/careRules/foodTcm.js');
const recipes=await runner.load('lib/radar_v1/careRules/foodCombinationRecipes.js');
const daily=await runner.load('lib/radar_v1/careRules/dailyCareV2.js');
const drinks=await runner.load('lib/radar_v1/careRules/drinkRules.js');
const baselineIndex=process.argv.indexOf('--baseline');
const baseline=baselineIndex>=0?await createScenarioRunner(path.resolve(process.argv[baselineIndex+1])):null;
const oldFood=baseline?await baseline.load('lib/radar_v1/careRules/foodTcm.js'):null;
const labels=['qi_deficiency','qi_stagnation','blood_deficiency','blood_stasis','fluid_deficiency','fluid_damp'];
const labelSets=[[],...labels.map(x=>[x]),...labels.flatMap((x,i)=>labels.slice(i+1).map(y=>[x,y]))];
const triggers=['none','pressure_down','pressure_up','temp_shift','damp','dry','cold','heat'];
const symptoms=[null,'fatigue','sleep','digestion','neck_shoulder','low_back_pain','swelling','headache','dizziness','mood'];
function options(subLabels,trigger,symptom,signal,date='2026-10-13'){
 const theme=daily.buildDailyCareTheme({targetDate:date,triggerKey:trigger,signal,symptomFocus:symptom,
  riskContext:{constitution_context:{sub_labels:subLabels,core_code:'accel_batt_standard',symptom_focus:symptom}}});
 return {theme,subLabels,symptomFocus:symptom,targetDate:date};
}
let contexts=0;const selectedFoods=new Set(),primaryRecipes=new Set(),strongWeatherMissing=[];
for(const subLabels of labelSets)for(const trigger of triggers)for(const symptom of symptoms)for(const signal of [0,1,2]){
 const opts=options(subLabels,trigger,symptom,signal),selected=food.selectFoodCombinations(opts);
 selected.forEach(c=>c.foods.forEach(f=>selectedFoods.add(f.name)));primaryRecipes.add(selected[0].id);
 if(signal===2&&['cold','heat','damp','dry'].includes(trigger)&&!selected[0].evidence.some(e=>e.source==='weather'))strongWeatherMissing.push({subLabels,trigger,symptom});
 contexts++;
}
const comparisons=[];
for(const [name,subLabels,trigger,symptom] of [
 ['気滞・頭痛・寒さ',['qi_stagnation'],'cold','headache'],
 ['気虚・疲れ・気圧低下',['qi_deficiency'],'pressure_down','fatigue'],
 ['痰湿＋津液不足・疲れ・乾燥',['fluid_damp','fluid_deficiency'],'dry','fatigue'],
]){
 const rows=[];
 for(let i=0;i<14;i++){
  const date=new Date(Date.UTC(2026,9,13+i)).toISOString().slice(0,10),opts=options(subLabels,trigger,symptom,1,date);
  const selected=food.selectFoodCombinations(opts)[0];
  rows.push({date,previous_food:oldFood?oldFood.selectTcmFoods(opts)[0].name:null,combination:selected.name,recipe:selected.title,format:selected.format,reason:food.foodCombinationDetail(selected,opts).public_reason});
 }
 comparisons.push({name,previous_unique_foods:oldFood?new Set(rows.map(r=>r.previous_food)).size:null,new_unique_combinations:new Set(rows.map(r=>r.combination)).size,formats:[...new Set(rows.map(r=>r.format))],rows});
}
let forecastChecks=0,forecastChanges=0;
if(baseline)for(let p=0;p<runner.profiles.length;p++)for(const [,fn]of scenarios){
 const old=baseline.run(fn,p,'fatigue',false).forecast,next=runner.run(fn,p,'fatigue',false).forecast;
 const fields=['score_precise_0_10','signal','personal_main_trigger_exact','personal_secondary_trigger_exact'];
 if(fields.some(key=>old[key]!==next[key]))forecastChanges++;
 forecastChecks++;
}
const inventory=food.FOOD_ITEMS.filter(f=>f.role!=='drink');
console.log(JSON.stringify({scope:'synthetic local scenarios; no user counts or clinical-effect validation',version:recipes.FOOD_COMBINATION_VERSION,
 inventory_count:inventory.length,drink_count:drinks.DRINK_ITEMS.length,recipe_count:recipes.FOOD_COMBINATION_RECIPES.length,
 catalog_ingredient_coverage:new Set(recipes.FOOD_COMBINATION_RECIPES.flatMap(r=>r.foods)).size,
 contexts,selected_ingredient_count:selectedFoods.size,unselected_ingredients:inventory.filter(f=>!selectedFoods.has(f.name)).map(f=>f.name),
 primary_recipe_count:primaryRecipes.size,strong_weather_without_matching_evidence:strongWeatherMissing,
 forecast_checks:forecastChecks,forecast_score_or_trigger_changes:forecastChanges,comparisons},null,2));
