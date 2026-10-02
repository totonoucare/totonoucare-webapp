import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = p => fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
function telemetry(host='mibyo-radar.totonoucare.com') {
 const store=new Map(), sent=[];
 const ctx=vm.createContext({window:{location:{hostname:host}},sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789abc'},fetch:(_u,o)=>{sent.push(JSON.parse(o.body));return Promise.resolve({});}});
 vm.runInContext(read('lib/funnelEvents.js').replaceAll('export ','')+'\n'+read('lib/funnelClient.js').replace(/^import .*;\n/,'').replaceAll('export ',''),ctx);
 return {ctx,store,sent};
}
test('signup revisits preserve visit and chronological auth/save events',()=>{
 const {ctx,sent}=telemetry();vm.runInContext('trackSignupEntry();trackFunnel("signup_result_return_click");trackSignupEntry();trackSignupEntry();trackFunnel("signup_google_start");trackFunnel("auth_success","google");trackFunnel("result_save_success");trackFunnel("radar_view")',ctx);
 assert.deepEqual(sent.map(x=>x.event),['signup_view','signup_result_return_click','signup_revisit','signup_revisit','signup_google_start','auth_success','result_save_success','radar_view']);assert.equal(new Set(sent.map(x=>x.visit_id)).size,1);
});
test('v83 first view marker recognized and preview deduplicates',()=>{
 const {ctx,store,sent}=telemetry();store.set('funnel_once:signup_view:','1');vm.runInContext('trackSignupEntry();trackFunnel("signup_forecast_preview_view");trackFunnel("signup_forecast_preview_view")',ctx);assert.deepEqual(sent.map(x=>x.event),['signup_revisit','signup_forecast_preview_view']);
});
test('v84 CTA location and current tab remain independent; development excluded',()=>{
 const {ctx,sent}=telemetry();vm.runInContext('trackFunnel("signup_cta_click","care","floating_save");trackFunnel("floating_save_close","compat");trackFunnel("signup_header_back_click")',ctx);assert.equal(sent[0].source,'care');assert.equal(sent[0].cta_location,'floating_save');assert.equal(sent.length,3);
 const dev=telemetry('totonoucare-webapp.vercel.app');vm.runInContext('trackSignupEntry();trackSignupEntry()',dev.ctx);assert.equal(dev.sent.length,0);
});
test('denied storage does not interrupt authentication',()=>{const {ctx}=telemetry();ctx.sessionStorage.getItem=()=>{throw Error('denied')};assert.doesNotThrow(()=>vm.runInContext('trackSignupEntry()',ctx));});
const source=read('lib/signupForecastPreview.js').replaceAll('export ','');
test('JST tomorrow handles midnight and month boundary',()=>{const ctx=vm.createContext({});vm.runInContext(source,ctx);assert.equal(vm.runInContext('tomorrowJstDate(Date.parse("2026-09-30T15:00:00Z"))',ctx),'2026-10-02');assert.equal(vm.runInContext('tomorrowJstDate(Date.parse("2026-09-30T14:59:59Z"))',ctx),'2026-10-01');});
test('Reference preview API uses Tokyo tomorrow and rejects stale or failed forecasts',async()=>{
 let url;const ctx=vm.createContext({fetch:async u=>{url=u;return {ok:true,json:async()=>({ok:true,core_code:'brake_batt_small',target_date:'2026-09-29',forecast:{score_display_0_10:5.9,signal:1}})}}});vm.runInContext(source,ctx);await vm.runInContext('loadSignupForecastPreview(undefined,Date.parse("2026-09-28T00:00:00Z"))',ctx);assert.equal(url,'/api/radar/v1/forecast/public?lat=35.68944&lon=139.69167&date=2026-09-29');
 ctx.fetch=async()=>({ok:true,json:async()=>({ok:true,target_date:'2026-09-28',forecast:{score_0_10:5,signal:1}})});await assert.rejects(vm.runInContext('loadSignupForecastPreview(undefined,Date.parse("2026-09-28T00:00:00Z"))',ctx));ctx.fetch=async()=>{throw Error('offline')};await assert.rejects(vm.runInContext('loadSignupForecastPreview()',ctx));
});
test('exposure only for visible card in foreground, once',()=>{
 let callback,change,count=0;const doc={visibilityState:'hidden',addEventListener:(_e,cb)=>change=cb,removeEventListener:()=>{}};
 const ctx=vm.createContext({document:doc,IntersectionObserver:class{constructor(cb){callback=cb}observe(){}disconnect(){}},report:()=>count++});vm.runInContext(source+'\nvar cleanup=observeForecastPreview({},report)',ctx);callback([{isIntersecting:true,intersectionRatio:1}]);assert.equal(count,0);callback([{isIntersecting:false,intersectionRatio:0}]);doc.visibilityState='visible';change();assert.equal(count,0);callback([{isIntersecting:true,intersectionRatio:.5}]);callback([{isIntersecting:true,intersectionRatio:1}]);assert.equal(count,1);vm.runInContext('cleanup()',ctx);
});
test('signup preview retired; shared home strip, entry replay guard and v84 CTA handlers retained',()=>{
 const signup=read('app/signup/SignupClient.js'),home=read('app/HomeClient.jsx'),result=read('app/result/[id]/page.js');assert.doesNotMatch(signup,/SignupForecastPreview/);assert.match(signup,/signupEntryTracked\.current/);assert.match(signup,/event\.persisted/);assert.match(home,/headerLeft=\{<Button[^\n]*使い方/);assert.match(home,/headerRight=\{<Button[^\n]*ログイン/);assert.match(home,/<HomeHeaderMenu/);for(const loc of ['floating_save','overview_footer','compat_footer','care_footer'])assert.ok(result.includes(loc));for(const p of ['app/HomeClient.jsx','components/forecast/SignupForecastPreview.jsx'])assert.ok(read(p).includes('HomeForecastStrip'));
});
