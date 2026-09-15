import assert from 'node:assert/strict';
import test from 'node:test';
import {createScenarioRunner, scenarios, ramp} from './helpers/forecast-scenarios.mjs';
const {run, load} = await createScenarioRunner();

test('負担ゼロで気圧を補完せず、予報からケアまで普段の不調に基づく', () => {
  for(let i=0;i<4;i++) {
    const r=run(()=>({}),i);
    assert.equal(r.score,0); assert.equal(r.primary,'none');
    assert.match(r.lead,/目立った気象負担はありません/);
    assert.equal(r.care.care_theme.trigger_key,'none');
    assert.doesNotMatch(r.lead,/気圧|崩れにく/);
    assert.doesNotMatch(r.care.night_tsubo_set.points.map(p=>p.explanation.selection_reason).join(''),/天気の変化で|気圧/);
  }
});
test('小・中・大の気圧低下を分け、敏感な体質では大変化が守りに達する', () => {
  for(let i=0;i<4;i++) {
    const values=[2,5,10].map(p=>run(h=>({p:1012-ramp(h,8,6,p)}),i).score);
    assert.ok(values[0]<values[1] && values[1]<values[2]);
    assert.ok(values[0]<30); assert.ok(values[2]-values[0]>35);
    if(i>0) assert.ok(values[2]>=70 && values[2]<95);
  }
});
test('同じ気圧変化量でも急な変化を強く扱い、上昇・低下を表示し分ける', () => {
  for(let i=0;i<4;i++) {
    const quick=run(scenarios[3][1],i), slow=run(scenarios[5][1],i), up=run(scenarios[4][1],i);
    assert.ok(quick.score>slow.score);
    assert.equal(up.primary,'pressure_up'); assert.equal(quick.primary,'pressure_down');
    assert.match(up.lead,/気圧上昇/); assert.match(quick.lead,/気圧低下/);
  }
});
test('複合負荷は強い単独負荷を上回り、極端な暑さ寒さは上限付近へ届く', () => {
  for(let i=0;i<4;i++) {
    const combo=run(scenarios[15][1],i);
    assert.ok(combo.score>run(scenarios[3][1],i).score);
    assert.ok(combo.score>run(scenarios[10][1],i).score);
    assert.ok(combo.score>=80 && combo.score<100);
    assert.ok(run(scenarios[11][1],i).score>=95);
    assert.ok(run(scenarios[20][1],i).score>=95);
  }
});
test('暑さの点数が連続的に変わり、33℃をまたいで急に跳ねない', () => {
  for(let i=0;i<4;i++) {
    const scores=Array.from({length:131},(_,n)=>run(()=>({t:27+n/10,r:75}),i,'fatigue',false).score);
    for(let j=1;j<scores.length;j++) {
      assert.ok(scores[j]>=scores[j-1],`${i}: ${j}`);
      assert.ok(scores[j]-scores[j-1]<=3,`${i}: ${j}`);
    }
  }
});
test('快適域へ戻る気温変化と、湿度一定による水分量変化を区別する', () => {
  for(let i=0;i<4;i++) {
    assert.ok(run(scenarios[8][1],i).score<run(scenarios[7][1],i).score);
    assert.ok(run(scenarios[18][1],i).score<20);
    assert.ok(run(scenarios[16][1],i).score<run(scenarios[7][1],i).score);
  }
});
test('蒸し暑い日の備えと、明日のための前夜の行動を明示する', () => {
  const r=run(scenarios[10][1],1);
  assert.ok(r.weather.environmental_cautions.some(c=>c.key==='humid_heat'));
  assert.match(r.lead,/蒸し暑|涼しい/); assert.match(r.tomorrowLead,/今夜は/);
  assert.doesNotMatch(r.lead,/大きく崩れにく/);
});
test('88通りの予報・暮らす・食べる・ほぐすが欠落せず有限な値を返す', () => {
  for(const [name,fn] of scenarios) for(let i=0;i<4;i++) {
    const r=run(fn,i);
    assert.ok(Number.isFinite(r.score) && r.score>=0 && r.score<=100,name);
    assert.ok(r.lead && r.tomorrowLead && r.care.lifestyle_plan.primary_action && r.care.night_food && r.care.night_tsubo_set.points.length,name);
    assert.doesNotMatch(r.lead+r.tomorrowLead,/undefined|NaN/);
  }
});
test('AI説明は保存時の式を維持し、現行式を過去の予報へ当てはめない', async () => {
  const {buildForecastReasoningContext}=await load('lib/records/forecastReasoning.js');
  const old=buildForecastReasoningContext({reason_trace:{forecast_model_version:'radar_forecast_v2_2026-07-28_moisture_state_direction'}});
  const current=buildForecastReasoningContext({reason_trace:{forecast_model_version:'radar_forecast_v2_2026-09-11_load_anchors'}});
  assert.match(old.personalization.formula,/共通分0\.38/);
  assert.match(current.personalization.formula,/共通分0\.50/);
});
