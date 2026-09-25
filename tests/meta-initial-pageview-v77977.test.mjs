import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const source=await readFile(new URL('../lib/metaPixel.js',import.meta.url),'utf8');
function load(window,document){return new Function('window','document',source.replace(/export /g,'')+';return {trackAppInitialPageView,captureCampaignAttribution};')(window,document);}
function browser(path,storage=new Map()){
 const scripts=[],w={location:{pathname:path,href:'https://mibyo-radar.totonoucare.com'+path,search:'',hash:''},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
 const d={querySelector:()=>scripts[0],createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}};
 return {w,d,scripts,storage,api:load(w,d)};
}
const events=b=>b.w.fbq?.queue.filter(x=>x[0]==='track').map(x=>Array.from(x))||[];
test('all direct application entries send exactly one standard PageView',()=>{
 for(const path of ['/','/check','/check/run','/result/abc','/radar','/records','/signup','/settings','/care-navi','/auth/callback']){
  const b=browser(path);assert.equal(b.api.trackAppInitialPageView(),true,path);assert.deepEqual(events(b),[['track','PageView']]);assert.equal(b.w.fbq.disablePushState,true);assert.equal(b.scripts.length,1);
 }
});
test('SPA changes, Strict Mode and separately evaluated modules cannot duplicate PageView',()=>{
 const b=browser('/check');b.api.trackAppInitialPageView();
 for(const path of ['/check/run','/result/a','/radar','/records']){b.w.location.pathname=path;b.api.trackAppInitialPageView();load(b.w,b.d).trackAppInitialPageView();}
 assert.equal(events(b).length,1);assert.equal(b.scripts.length,1);
});
test('new document sends PageView even with same sessionStorage',()=>{
 const b=browser('/radar');b.api.trackAppInitialPageView();const c=browser('/records',b.storage);c.api.trackAppInitialPageView();assert.equal(events(c).length,1);
});
test('delayed SDK preserves queue and sends no other event types',()=>{
 const b=browser('/records');b.api.trackAppInitialPageView();const delivered=[];
 b.w.fbq.callMethod=(...a)=>delivered.push(a);for(const a of b.w.fbq.queue.splice(0))b.w.fbq.callMethod(...a);
 b.w.location.pathname='/care-navi';b.api.trackAppInitialPageView();assert.deepEqual(delivered.filter(a=>a[0]==='track'),[['track','PageView']]);assert.ok(!delivered.some(a=>a[0]==='trackCustom'));
});
test('attribution captured on any first entry, maintained through navigation',()=>{
 const b=browser('/records');b.w.location.href+='?utm_source=meta&utm_campaign=ad1&fbclid=click1';b.api.trackAppInitialPageView();b.w.location.href='https://mibyo-radar.totonoucare.com/radar';
 const a=b.api.captureCampaignAttribution();assert.equal(a.utm_source,'meta');assert.equal(a.fbclid,'click1');assert.equal(a.utm_campaign,'ad1');
});
test('pixel, DOM, storage errors are isolated and SSR does nothing',()=>{
 assert.equal(load(undefined,undefined).trackAppInitialPageView(),false);
 const b=browser('/');b.w.fbq=()=>{throw Error('pixel')};assert.equal(b.api.trackAppInitialPageView(),false);
 const c=browser('/');c.w.sessionStorage.getItem=()=>{throw Error('storage')};assert.equal(c.api.trackAppInitialPageView(),true);
 const e=browser('/');e.d.head.appendChild=()=>{throw Error('blocked')};assert.equal(e.api.trackAppInitialPageView(),false);
});
test('authentication callback defers same single PageView until credentials removed',()=>{
 const b=browser('/auth/callback');b.w.location.search='?code=secret';assert.equal(b.api.trackAppInitialPageView(),false);assert.equal(b.scripts.length,0);
 b.w.location.search='';b.api.trackAppInitialPageView();b.api.trackAppInitialPageView();assert.equal(events(b).length,1);
});
test('only common root calls tracker; obsolete registration endpoint removed',async()=>{
 const root=await readFile(new URL('../app/layout.js',import.meta.url),'utf8');assert.match(root,/<MetaInitialPageView \/>/);
 for(const path of ['app/check/page.js','app/check/run/page.js','app/auth/callback/AuthCallbackClient.js']){
  const s=await readFile(new URL('../'+path,import.meta.url),'utf8');assert.doesNotMatch(s,/trackCheck|trackCompleteRegistration|trackMetaPageViewOnce/);
 }
 await assert.rejects(access(new URL('../app/api/tracking/registration/route.js',import.meta.url)));
 assert.doesNotMatch(source,/CheckStart|CheckComplete|CompleteRegistration|trackCustom/);
});
