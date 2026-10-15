import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createScenarioRunner} from '../tests/helpers/forecast-scenarios.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {load}=await createScenarioRunner(root);
const food=await load('lib/radar_v1/careRules/foodTcm.js');
const copy=await load('lib/radar_v1/careRules/foodExplanations.js');
const drink=await load('lib/radar_v1/careRules/drinkRules.js');
const recipes=await load('lib/radar_v1/careRules/foodCombinationRecipes.js');
const inventory=food.FOOD_ITEMS.filter(item=>item.role!=='drink');
const exposure=Object.fromEntries(drink.DRINK_ITEMS.map(item=>[item.name,0]));
const examples={},violations=[];
const labels=[[],...['qi_deficiency','qi_stagnation','blood_deficiency','blood_stasis','fluid_damp','fluid_deficiency'].map(code=>[code]),['cold_pattern','heat_pattern']];
const symptoms=[null,'fatigue','sleep','digestion','swelling','mood','neck_shoulder','headache','dizziness'];
const triggers=['default','cold','heat','damp','dry','pressure_up','pressure_down','temp_shift'];
let contexts=0,maxReason=0;
for(const subLabels of labels)for(const symptomFocus of symptoms)for(const triggerKey of triggers)for(const mode of ['today','tomorrow'])for(let day=1;day<=7;day++){
  const context={subLabels,symptomFocus,triggerKey,mode,targetDate:`2026-10-${String(day).padStart(2,'0')}`};
  const card=drink.buildDrinkActionCard(context);contexts++;
  if(!card||card.items.length!==2||new Set(card.items).size!==2)violations.push({kind:'pair',context});
  for(const detail of card?.item_details||[]){
    const item=drink.DRINK_ITEMS.find(item=>item.name===detail.label);
    exposure[item.name]++;examples[item.name]||={context,reason:detail.public_reason};
    maxReason=Math.max(maxReason,detail.public_reason.length);
    if(!drink.scoreDrink(item,context)._eligible||item.tags.includes('snack'))violations.push({kind:'eligibility',name:item.name,context});
    if(!detail.theory_details[0]?.text||!detail.how_to||!detail.caffeine_label)violations.push({kind:'content',name:item.name,context});
    if(detail.recordable!==(mode==='today'))violations.push({kind:'timing',name:item.name,context});
  }
}
const missingFoods=inventory.filter(item=>!copy.foodTheoryText(item.name)).map(item=>item.name);
const report={scope:'Synthetic context coverage; counts are generated proposals, not user counts or clinical outcomes.',
  food_version:food.FOOD_TCM_VERSION,drink_version:drink.DRINK_MODEL_VERSION,contexts,
  food_count:inventory.length,drink_count:drink.DRINK_ITEMS.length,normal_drink_count:drink.DRINK_ITEMS.filter(item=>!item.tags.includes('snack')).length,
  recipe_count:recipes.FOOD_COMBINATION_RECIPES.length,recipes_with_explicit_additional_foods:recipes.FOOD_COMBINATION_RECIPES.filter(item=>item.additional_foods?.length).length,
  food_explanations:Object.keys(copy.FOOD_EXPLANATIONS).length,missingFoods,maximum_short_reason_length:maxReason,exposure,examples,violations};
await fs.mkdir(path.join(root,'verification'),{recursive:true});
await fs.writeFile(path.join(root,'verification/food-drink-explanations-v779100.json'),JSON.stringify(report,null,2)+'\n');

const cell=value=>String(value??'').replaceAll('|','／').replaceAll('\n',' ');
let md='# 食材・飲み物の表示文一覧 v7.79.100\n\n';
md+='常時表示は「今回選んだ短い理由」と取り入れ方。開閉欄は「東洋医学での考え方」。理由は実際の選定根拠から作り、以下の解説を共通データとして使います。\n\n';
md+='## 食材81種類\n\n食材の採用属性と選定係数を保ち、説明に役立つ食性・味・香りを使っています。作用を採用していない食材は、料理の中での役目を説明しています。\n\n|食材|採用食性|解説|\n|---|---|---|\n';
for(const item of inventory)md+=`|${cell(item.name)}|${cell(item.tcm.nature)}|${cell(copy.foodTheoryText(item.name))}|\n`;
md+='\n## 飲料22項目（通常の飲料21＋補食の葛湯1）\n\n選定理由の例は検証条件で実際に主案へ選ばれた際の文章です。カフェインの有無は、この表の指定原料を使う場合の表示です。茶葉入り・別原料入りの市販ブレンドとは区別します。\n\n|飲料|指定原料|選定理由の例|東洋医学での考え方|飲み方|カフェイン|\n|---|---|---|---|---|---|\n';
for(const item of drink.DRINK_ITEMS)md+=`|${cell(item.name)}|${cell(item.ingredients.join('・'))}|${cell(examples[item.name]?.reason||item.note)}|${cell(item.theory)}|${cell(item.howTo)}|${cell(drink.buildDrinkComponentReason(item))}|\n`;
md+='\n## 料理例\n\n提案の主役は2食材。ごはんや野菜などを自然に加えられる料理例を用意しています。追加食材を明示した料理は、その食材の寒熱の適合も確認します。\n\n|主役の組み合わせ|料理例|一緒に使うもの|作り方|\n|---|---|---|---|\n';
for(const recipe of recipes.FOOD_COMBINATION_RECIPES.filter(item=>item.additional_foods?.length))md+=`|${cell(recipe.foods.join('＋'))}|${cell(recipe.title)}|${cell(recipe.additional_foods.join('・'))}|${cell(recipe.preparation)}|\n`;
await fs.mkdir(path.join(root,'docs'),{recursive:true});
await fs.writeFile(path.join(root,'docs/FOOD_DRINK_EXPLANATIONS_V779100.md'),md);
console.log(JSON.stringify({...report,examples:undefined,exposure:undefined}));
if(missingFoods.length||violations.length)process.exitCode=1;
