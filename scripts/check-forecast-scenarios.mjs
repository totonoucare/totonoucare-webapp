import fs from 'node:fs/promises';
import path from 'node:path';
import {createScenarioRunner, scenarios, appRoot} from '../tests/helpers/forecast-scenarios.mjs';

// node scripts/check-forecast-scenarios.mjs [baseline-source-directory]
// Uses synthetic hourly observations and actual application functions. No APIs.
const current = await createScenarioRunner();
const baseline = process.argv[2] ? await createScenarioRunner(path.resolve(process.argv[2])) : null;
const results=[];
for(const [name, fn] of scenarios) {
  const entries=current.profiles.map((_,i)=>{
    const r=current.run(fn,i);
    return {profile:r.profile, score:r.score, previous_score:baseline?.run(fn,i,'fatigue',false).score ?? null,
      primary:r.primary, signal:r.signal, lead:r.lead, tomorrow_lead:r.tomorrowLead,
      lifestyle:r.care.lifestyle_plan?.primary_action,
      food_reason:r.care.night_food_reason,
      tsubo:r.care.night_tsubo_set?.points.map(p=>({code:p.code,reason:p.explanation?.selection_reason})),
      cautions:r.weather.environmental_cautions};
  });
  results.push({scenario:name,entries});
}
await fs.mkdir(path.join(appRoot,'verification'),{recursive:true});
await fs.writeFile(path.join(appRoot,'verification/forecast-scenarios.json'),JSON.stringify(results,null,2)+'\n');
const table=results.map(r=>`| ${r.scenario} | ${r.entries.map(e=>e.previous_score==null?e.score:`${e.previous_score} → **${e.score}**`).join(' | ')} |`).join('\n');
const examples=[0,2,3,10,15].map(i=>{
  const r=results[i],e=r.entries[1];
  return `### ${r.scenario}（体質B）\n\n- 今日：${e.lead}\n- 明日：${e.tomorrow_lead}\n- 暮らす：${e.lifestyle?.label || ''}\n- 選定理由：${e.lifestyle?.why_today || ''}\n- 食べる：${e.food_reason}\n`;
}).join('\n');
const md=`# v7.79.55 仮想気象・体質の確認\n\n本表はアプリの実関数から算出した、設計上の体調警戒度（0〜100）です。体調との一致やケアの効果を実証した数値ではありません。\n\n気象22条件×体質4種類＝88通り。相対湿度を一定にして気温が変わるケースは、水分量も変わります。露点を固定したケースを別に用意しています。全て日本時間の24時間分の仮想観測値で、個人データや有料APIは使用していません。\n\n## 点数\n\n${baseline?'セル内は v54 → v55。':''}\n\n| 気象条件 | A：感受性低め | B：疲労・冷え・湿気 | C：緊張・熱・乾き | D：感受性高め・余力小 |\n|---|---:|---:|---:|---:|\n${table}\n\n## 体質の作り方\n\n実際の体質チェックの採点関数に仮想回答を渡しています。Aは環境への敏感さを低く、Bは疲労・回復遅れ・重さ・冷えと湿気への敏感さ、Cは緊張・乾き・熱、Dは疲労・回復遅れと気圧・寒暖差への敏感さを高くしています。全回答は tests/helpers/forecast-scenarios.mjs にあります。\n\n## 表示例\n\n${examples}\n## 検証範囲\n\n追加テストでは、気圧変化量と速度、温度の改善方向、露点固定、暑さ27〜40℃を0.1℃刻みにした連続性、無負担日の説明、旧版予報のAI説明、版が異なる記録の比較分離、予報キャッシュの更新範囲を確認します。\n\n実際のOpenAI応答と、本番アカウント・実機の表示は未検証です。AI出力の文章品質は更新した指示と入力の整合性まで確認しており、生成結果を保証するものではありません。\n`;
await fs.writeFile(path.join(appRoot,'verification/forecast-scenarios.md'),md);
console.log(table);
