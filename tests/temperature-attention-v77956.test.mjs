import assert from 'node:assert/strict';
import test from 'node:test';
import {createScenarioRunner, ramp} from './helpers/forecast-scenarios.mjs';

const {run, load} = await createScenarioRunner();
const ui = await load('app/radar/utils.js');

function temperature(result) {
  return result.forecast.meta.effective_weather_groups.temperature;
}

test('夏：夕方の大きな降温より、暑さが増す昼の注意時間を選ぶ', () => {
  const x = run(h => ({t:27+ramp(h,9,3,5)-ramp(h,15,3,8), d:14}),1,'fatigue',false);
  assert.equal(x.score,39);
  assert.ok(x.weather.channel_peaks.temp_down.strength > x.weather.channel_peaks.temp_up.strength);
  const group = temperature(x);
  assert.equal(group.direction,'mixed');
  assert.equal(group.attention_direction,'up');
  assert.equal(group.peak_start,'12:00');
  assert.equal(group.peak_end,'15:00');
  const card = ui.getForecastWeatherLoadGroups(x.forecast).find(g => g.group === 'temperature');
  assert.equal(card.peakStart,'12:00');
  assert.equal(card.detailLabel,'寒暖差');
});

test('冬：冷え込みが強まる夜の時間を選ぶ', () => {
  const x = run(h => ({t:14+ramp(h,6,3,8)-ramp(h,16,4,10),d:5}),1,'fatigue',false);
  assert.equal(x.score,39);
  assert.equal(temperature(x).attention_direction,'down');
  assert.equal(temperature(x).peak_start,'20:00');
  assert.equal(temperature(x).peak_end,'23:00');
});

test('日中の急な冷え込みにも追従し、夜へ固定しない', () => {
  const x = run(h => ({t:23-ramp(h,8,3,13),d:5}),1,'fatigue',false);
  assert.equal(x.score,70);
  assert.equal(temperature(x).attention_direction,'down');
  assert.equal(temperature(x).peak_start,'11:00');
});

test('一定で快適な気温には注意時間を表示しない', () => {
  const x = run(() => ({t:24,r:55}),1,'fatigue',false);
  assert.equal(x.score,0);
  const card = ui.getForecastWeatherLoadGroups(x.forecast).find(g => g.group === 'temperature');
  assert.equal(card.peakStart,null);
  assert.equal(card.peakEnd,null);
});

test('一定の暑さ・寒さは各環境負担の時間を維持する', () => {
  for (const t of [5,35]) {
    const x = run(() => ({t,r:55}),1,'fatigue',false);
    const group = temperature(x);
    assert.equal(group.event_key,t===5?'cold':'heat');
    assert.equal(group.peak_start,x.weather.channel_peaks[group.event_key].start);
    assert.equal(group.peak_end,x.weather.channel_peaks[group.event_key].end);
  }
});
