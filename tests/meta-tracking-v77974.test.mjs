import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const regSrc=await readFile(new URL('../lib/metaRegistration.js',import.meta.url),'utf8');
const reg=await import('data:text/javascript;base64,'+Buffer.from(regSrc).toString('base64'));
const metaSrc=await readFile(new URL('../lib/metaPixel.js',import.meta.url),'utf8');
const clean=metaSrc.replace(/^import .*;\n/gm,'').replace(/^export \{.*;\n/gm,'').replace(/export /g,'');
const now=Date.parse('2026-09-25T01:00:00Z');
const fresh={id:'a',created_at:'2026-09-25T00:00:00Z',email_confirmed_at:'2026-09-25T00:05:00Z'};
test('existing confirmed accounts are not new; future/invalid/missing times rejected',()=>{
 assert.equal(reg.isLikelyNewSupabaseUser(fresh,{now}),true);
 assert.equal(reg.isLikelyNewSupabaseUser({...fresh,created_at:'2026-08-01T00:00:00Z',email_confirmed_at:'2026-08-01T00:05:00Z',last_sign_in_at:'2026-09-25T00:50:00Z'},{now}),false);
 for(const created_at of ['bad','2026-09-26T00:00:00Z'])assert.equal(reg.isLikelyNewSupabaseUser({...fresh,created_at},{now}),false);
});
function browser({throwPixel=false,throwStorage=false,claim=true,path='/check/run'}={}){
 const calls=[],storage=new Map();let requests=0;
 const fbq=(...args)=>{if(throwPixel)throw Error('pixel failure');calls.push(args)};fbq.callMethod=()=>{};
 const window={location:{pathname:path,href:'https://mibyo-radar.totonoucare.com'+path},fbq,crypto:{randomUUID:()=>String(Math.random())},sessionStorage:{getItem:k=>{if(throwStorage)throw Error('storage denied');return storage.get(k)},setItem:(k,v)=>{if(throwStorage)throw Error('storage denied');storage.set(k,v)},removeItem:k=>storage.delete(k)}};
 const document={querySelector:()=>true};
 const api=new Function('window','document','isLikelyNewSupabaseUser','fetch',clean+';return {trackCheckStart,trackCheckComplete,finishCheckAttempt,trackCompleteRegistrationIfNew,trackMetaPageViewOnce};')(window,document,()=>true,async()=>{requests++;return {ok:true,json:async()=>({send:claim})}});
 return {...api,calls,window,get requests(){return requests}};
}
test('start/completion share attempt; repeated clicks deduplicate; next attempt counts again',async()=>{
 const b=browser();await Promise.all([b.trackCheckStart(),b.trackCheckStart()]);await b.trackCheckComplete();await b.trackCheckComplete();
 assert.equal(b.calls.filter(x=>x[1]==='CheckStart').length,1);assert.equal(b.calls.filter(x=>x[1]==='CheckComplete').length,1);
 b.finishCheckAttempt();await b.trackCheckStart();await b.trackCheckComplete();assert.equal(b.calls.filter(x=>x[1]==='CheckComplete').length,2);
 assert.deepEqual(b.calls[0],['set','autoConfig',false,'1506940704023332']);
});
test('tracking and storage exceptions never reject the user action',async()=>{
 const b=browser({throwPixel:true});assert.equal(await b.trackCheckStart(),false);assert.equal(await b.trackCheckComplete(),false);
 const c=browser({throwStorage:true});await c.trackCheckStart();await c.trackCheckStart();assert.equal(c.calls.filter(x=>x[1]==='CheckStart').length,1);
});
test('private routes do not dispatch queued events; server denied claim sends no registration',async()=>{
 const b=browser({path:'/records'});assert.equal(await b.trackCheckStart(),false);assert.equal(b.calls.length,0);
 const c=browser({path:'/auth/callback',claim:false});assert.equal(await c.trackCompleteRegistrationIfNew(fresh,'token'),false);assert.equal(c.calls.filter(x=>x[1]==='CompleteRegistration').length,0);
});
test('registration dispatch requires server claim and pixel readiness',async()=>{
 const b=browser({path:'/auth/callback'});assert.equal(await b.trackCompleteRegistrationIfNew(fresh,'token'),true);assert.equal(b.requests,1);
 const c=browser({path:'/auth/callback',throwPixel:true});assert.equal(await c.trackCompleteRegistrationIfNew(fresh,'token'),false);assert.equal(c.requests,0);
});
const route=(await readFile(new URL('../app/api/tracking/registration/route.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export /g,'');
test('server atomically claims once across simultaneous authenticated requests',async()=>{
 const seen=new Set();let owner;
 const db={from(){return {upsert(row){owner=row.user_id;return {select:async()=>{
 const key=row.user_id+row.event_key;const duplicate=seen.has(key);seen.add(key);
 return {data:duplicate?[]:[{event_key:row.event_key}]};
 }}}};}};

 const POST=new Function('NextResponse','requireUser','supabaseServer','isLikelyNewSupabaseUser',route+';return POST;')({json:(body,opts)=>({body,...opts})},async()=>({user:fresh}),db,()=>true);
 const result=await Promise.all([POST({}),POST({})]);assert.equal(result.filter(r=>r.body.send).length,1);assert.equal(owner,'a');
});
test('callback awaits bounded tracking, completed check leaves pixel document',async()=>{
 const callback=await readFile(new URL('../app/auth/callback/AuthCallbackClient.js',import.meta.url),'utf8');
 assert.match(callback,/await trackCompleteRegistrationIfNew\(session.user, session.access_token\)/);
 const run=await readFile(new URL('../app/check/run/page.js',import.meta.url),'utf8');assert.match(run,/await trackCheckComplete\(\)/);assert.match(run,/window.location.assign\(`/);
});
test('delayed pixel is awaited before sending; blocked pixel times out without claim',async()=>{
 const b=browser();delete b.window.fbq.callMethod;
 const promise=b.trackCheckStart();assert.equal(b.calls.filter(x=>x[1]==='CheckStart').length,0);
 setTimeout(()=>{b.window.fbq.callMethod=()=>{}},70);assert.equal(await promise,true);
 const c=browser({path:'/auth/callback'});delete c.window.fbq.callMethod;
 assert.equal(await c.trackCompleteRegistrationIfNew(fresh,'token'),false);assert.equal(c.requests,0);
});
