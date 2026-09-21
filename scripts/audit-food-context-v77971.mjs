import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {createScenarioRunner}=await import(root+'/tests/helpers/forecast-scenarios.mjs');
const {load}=await createScenarioRunner(root);
const drinks=await load('lib/radar_v1/careRules/drinkRules.js');
const daily=await load('lib/radar_v1/careRules/dailyCareV2.js');
const codes=['qi_deficiency','qi_stagnation','blood_deficiency','blood_stasis','fluid_damp','fluid_deficiency'];
const profiles=[[],...codes.map(x=>[x]),...codes.flatMap((x,i)=>codes.slice(i+1).map(y=>[x,y])),['cold_pattern'],['heat_pattern'],['cold_pattern','heat_pattern']];
const symptoms=[null,'fatigue','sleep','digestion','neck_shoulder','low_back_pain','swelling','headache','dizziness','mood'];
const triggers=['default','heat','cold','damp','dry','pressure_down','pressure_up','temp_shift'];
const exposure=Object.fromEntries(drinks.DRINK_ITEMS.map(d=>[d.name,0]));const samples={},violations=[];let count=0,maxPublic=0,maxBody=0;
for(const subLabels of profiles)for(const symptomFocus of symptoms)for(const triggerKey of triggers)for(const secondaryKey of [null,...triggers.filter(x=>x!=='default'&&x!==triggerKey)])for(const mode of ['today','tomorrow']){
 const targetDate=mode==='today'?'2026-09-21':'2026-09-22';
 const theme=daily.buildDailyCareTheme({mode,targetDate,triggerKey,secondaryKey,subLabels,symptomFocus,signal:1});
 const plan=daily.enhanceFoodContext({theme,subLabels,symptomFocus,mode,targetDate});count++;
 const ctx={subLabels,symptomFocus,triggerKey:theme.trigger_key,secondaryKey:theme.secondary_trigger_key,mode};
 const flags=drinks.drinkContextFlags(ctx);
 for(const c of plan.action_cards){
  if(c.body){
   maxBody=Math.max(maxBody,c.body.length);
   const text=c.body;
   const fail=why=>{if(violations.length<30)violations.push({why,ctx,label:c.key,text});};
   if(text.length>130||text.split('。').filter(Boolean).length>2)fail('body length');
   if(/(?:今日|明日)の暑さ/.test(text)&&!flags.keys.includes('heat'))fail('caution heat source');
   if(/(?:今日|明日)の湿気/.test(text)&&!flags.keys.includes('damp'))fail('caution damp source');
   if(/(?:今日|明日)の乾燥/.test(text)&&!flags.keys.includes('dry'))fail('caution dry source');
   if(mode==='today'&&/明日/.test(text))fail('caution date');
   if(/胃腸の不調/.test(text)&&symptomFocus!=='digestion')fail('caution symptom');
  }
  for(const d of c.item_details||[]){
   maxPublic=Math.max(maxPublic,d.public_reason.length);
   const text=d.public_reason;
   const fail=why=>{if(violations.length<30)violations.push({why,ctx,label:d.label,text});};
   if(text.length>110||text.split('。').filter(Boolean).length>2)fail('length');
   if(/食後の重さが気になる|便が硬くなり|食べすぎでお腹|冷えやすいお腹|ほてりが気になる/.test(text))fail('unreported symptom');
   if(/(?:今日|明日)の暑さ/.test(text)&&!flags.keys.includes('heat'))fail('heat source');
   if(/(?:今日|明日)の湿気/.test(text)&&!flags.keys.includes('damp'))fail('damp source');
   if(/(?:今日|明日)の乾燥/.test(text)&&!flags.keys.includes('dry'))fail('dry source');
   if(/頭痛が気になる/.test(text)&&symptomFocus!=='headache')fail('headache source');
   if(/めまいが気になる/.test(text)&&symptomFocus!=='dizziness')fail('dizziness source');
   if(/胃腸の(?:不調|調子に合わせ)/.test(text)&&symptomFocus!=='digestion')fail('digestion source');
   if(c.key==='drink'){
    if(d.label==='葛湯')fail('snack in main drinks');
    if(c.items.length!==2||new Set(c.items).size!==2)fail('main pair count');
    if(d.selection_basis.target_date!==targetDate)fail('target date');
    if(d.selection_basis.symptom_focus!==(symptomFocus||null))fail('current symptom');
    if(d.recordable!==(mode==='today'))fail('record timing');
    if(/https?:|健脾|利水|補腎|養血|抽出|強度/.test(text))fail('internal vocabulary');
    exposure[d.label]++;
    const model=drinks.DRINK_ITEMS.find(x=>x.name===d.label);
    if((flags.hasCold&&['涼','寒'].includes(model.nature))||(flags.hasHeat&&['温','熱'].includes(model.nature)))fail('thermal');
    if(symptomFocus==='sleep'&&model.caffeine)fail('caffeine');
    if(!samples[d.label])samples[d.label]={ctx,public_reason:text,component:d.reasons[1].text};
   }
  }
 }
}
const result={contexts:count,profiles:profiles.length,exposure,maxPublic,maxBody,violations,samples};
const output=process.argv[2]||path.join(root,'docs/FOOD_CONTEXT_MATRIX_V77971.json');
fs.writeFileSync(output,JSON.stringify(result,null,2));
if(violations.length)process.exitCode=1;
console.log(JSON.stringify({...result,samples:undefined}));
