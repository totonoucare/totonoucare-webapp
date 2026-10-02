import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const route=read('app/api/radar/v1/forecast/preview/route.js').replace(/^import .*;\n/gm,'').replaceAll('export ','');
const resultId='12345678-1234-1234-1234-123456789abc';
function harness({status=200,result,limited=null}={}) {
 let weatherCalls=0,received;
 const ctx=vm.createContext({Response,URL,enforcePublicApiRateLimit:async()=>limited,readDiagnosis:async()=>Response.json({data:result || {computed:{core_code:'brake_batt_small',axes:{reserve_score:-1}},answers:{env_sensitivity:3},symptom_focus:'fatigue'}},{status}),tomorrowJstDate:()=> '2026-09-30',fetchMetnoLocationForecast:async coords=>{weatherCalls++;assert.deepEqual(JSON.parse(JSON.stringify(coords)),{lat:35.68944,lon:139.69167});return {data:{}}},normalizeMetnoForTargetDate:()=>({points:[1],previousNightBridgePoints:[0]}),buildWeatherStressV2:()=>({damp:1}),personalizeForecastV2:args=>{received=args.constitution;return {score_0_10:7,signal:2,trigger_factors:[{exact:'damp'}]}},getCoreLabel:()=>({title:'ハリネズミ型'})});vm.runInContext(route,ctx);return {run:async(id=resultId)=>ctx.GET({url:'https://example.test/api/preview?result='+id}),weatherCalls:()=>weatherCalls,received:()=>received};
}
test('guest access denial stops before weather loading or personal computation',async()=>{const h=harness({status:403});const r=await h.run();assert.equal(r.status,403);assert.equal(h.weatherCalls(),0);assert.equal(h.received(),undefined);});
test('invalid ID and rate limiting do not compute a forecast',async()=>{let h=harness();assert.equal((await h.run('bad')).status,400);assert.equal(h.weatherCalls(),0);h=harness({limited:Response.json({}, {status:429})});assert.equal((await h.run()).status,429);assert.equal(h.weatherCalls(),0);});
test('actual computed constitution and matching animal flow through, private response and no answers exposed',async()=>{const h=harness();const r=await h.run();const b=await r.json();assert.equal(b.core_code,'brake_batt_small');assert.equal(b.core_title,'ハリネズミ型');assert.equal(h.received().computed.axes.reserve_score,-1);assert.equal(b.forecast.score_0_10,7);assert.equal(b.answers,undefined);assert.equal(b.computed,undefined);assert.equal(r.headers.get('cache-control'),'private, no-store');});
test('missing or outdated check result never falls back to neutral constitution',async()=>{const h=harness({result:{retake_required:true}});assert.equal((await h.run()).status,409);assert.equal(h.weatherCalls(),0);assert.doesNotMatch(route,/personalizePublicForecastV2/);});
test('reference preview module retained for compatibility; signup no longer mounts it',()=>{const ui=read('components/forecast/SignupForecastPreview.jsx'),signup=read('app/signup/SignupClient.js');assert.doesNotMatch(ui,/coreCode=/);assert.match(ui,/参考体質での予報例/);assert.doesNotMatch(signup,/SignupForecastPreview/);});
test('same weather produces constitution-dependent scores with the existing production model',async()=>{
 const model=await import('data:text/javascript;base64,'+Buffer.from(read('lib/radar_v1/personalizeForecastV2.js')).toString('base64'));
 const weatherStress={event_strengths:{pressure_shift:.5,temperature_shift:.4,damp:.65,heat:.3,cold:0,dry:0},moisture_state:'damp',pressure_direction:'down'};
 const a=model.personalizeForecastV2({weatherStress,constitution:{core_code:'brake_batt_small',computed:{axes:{reaction_score:-.8,reserve_score:-1},score_scale:'0_100',material_scores:{fluid_damp:90,qi_deficiency:90},env:{sensitivity:3,vectors:['humidity']}}}});
 const b=model.personalizeForecastV2({weatherStress,constitution:{core_code:'accel_batt_large',computed:{axes:{reaction_score:.8,reserve_score:1},score_scale:'0_100',material_scores:{fluid_damp:10,qi_deficiency:10},env:{sensitivity:0,vectors:[]}}}});
 assert.ok(a.score_precise_0_10>b.score_precise_0_10);console.log('personal preview fixture scores /100:',a.score_precise_0_10*10,b.score_precise_0_10*10);
});
