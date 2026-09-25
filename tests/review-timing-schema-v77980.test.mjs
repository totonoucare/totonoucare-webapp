import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('lib/records/analysis.js');
const aggregate=new Function(source.slice(0,source.indexOf('export function recordCareTiming')).replaceAll('export ','')+';return aggregateActionTiming;')();
const sql=read('supabase/migrations/20260925_expand_review_care_timing_v77980.sql');
const accepted=[...sql.matchAll(/'([^']+)'/g)].map(x=>x[1]);
const action=t=>({item_snapshot:{meta:{timing_source:'individual',symptom_timing:t}}});
test('all aggregate timing outputs satisfy the updated review constraint',()=>{
 for(const a of ['before_peak','after_symptom','mixed','unknown','no_symptoms']){
  assert.ok(accepted.includes(aggregate([action(a)])));
  for(const b of ['before_peak','after_symptom','mixed','unknown','no_symptoms'])assert.ok(accepted.includes(aggregate([action(a),action(b)])));
 }
 assert.equal(aggregate([action('no_symptoms')]),'no_symptoms');
 assert.equal(aggregate([action('no_symptoms'),action('after_symptom')]),'unknown');
});
