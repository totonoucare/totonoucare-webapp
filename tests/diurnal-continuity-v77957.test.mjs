import assert from 'node:assert/strict';
import test from 'node:test';
import {createScenarioRunner, ramp} from './helpers/forecast-scenarios.mjs';

const runner = await createScenarioRunner();
const {buildWeatherStressV2} = await runner.load('lib/radar_v1/weatherStressV2.js');
const {personalizeForecastV2} = await runner.load('lib/radar_v1/personalizeForecastV2.js');
function score(end, {full=false, down=false, profile=1}={}) {
  const points=Array.from({length:full?24:4},(_,i)=>{
    const h=full?i:end-3+i;
    return {
      ts:new Date(Date.parse('2026-09-11T00:00:00+09:00')+h*3600000).toISOString(),
      temp_c:down?18-ramp(h,end-3,3,3):27+ramp(h,end-3,3,3),
      humidity_pct:45, pressure_hpa:1012,
    };
  });
  const weather=buildWeatherStressV2({points});
  return Math.round(personalizeForecastV2({weatherStress:weather,constitution:runner.profiles[profile].constitution}).score_precise_0_10*10);
}

test('夕方へ1時間ずらした同じ昇温で、旧19点の段差を再発させない',()=>{
  const values=[14,15,16,17,18].map(end=>score(end));
  for(let i=1;i<values.length;i++){
    assert.ok(values[i]>=values[i-1]);
    assert.ok(values[i]-values[i-1]<=8, JSON.stringify(values));
  }
  assert.equal(score(12),25); // Ordinary daytime discount retained.
  assert.equal(score(20),44); // Unexpected evening warming still counts fully.
});

test('朝・夕・日付境界の前後1分で、表示点数が急変しない（4体質・昇温／降温）',()=>{
  for(const down of [false,true]) for(const end of [0,4.5,5,5.5,6,6.5,7,7.5,8,8.5,13.5,14,15,15.5,16,17,17.5,24]) for(let profile=0;profile<4;profile++){
    const delta=Math.abs(score(end-1/60,{down,profile})-score(end+1/60,{down,profile}));
    assert.ok(delta<=1,JSON.stringify({down,end,profile,delta}));
  }
});

test('24時間の天気でも夕方の点数変化が段階的になる',()=>{
  const values=[14,15,16,17,18].map(end=>score(end,{full:true}));
  for(let i=1;i<values.length;i++) assert.ok(Math.abs(values[i]-values[i-1])<=8,JSON.stringify(values));
});

test('気温一定の気圧・湿度・暑さの負担は時刻移動で変化しない',()=>{
  for(const [temp,humidity] of [[24,55],[35,70],[5,60]]) {
    const results=[0,6,12].map(offset=>{
      const points=Array.from({length:24},(_,h)=>({ts:new Date(Date.parse('2026-09-11T00:00:00+09:00')+(h+offset)*3600000).toISOString(),temp_c:temp,humidity_pct:humidity,pressure_hpa:1012-ramp(h,8,6,5)}));
      return personalizeForecastV2({weatherStress:buildWeatherStressV2({points}),constitution:runner.profiles[1].constitution}).score_precise_0_10;
    });
    assert.equal(results[0],results[1]);
    assert.equal(results[1],results[2]);
  }
});
