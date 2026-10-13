import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const policy = await import('data:text/javascript;base64,' + Buffer.from(
  readFileSync(new URL('../lib/push/notificationPolicy.js', import.meta.url),'utf8')
).toString('base64'));
const cronSource = readFileSync(new URL('../lib/push/runRadarNotificationCron.js', import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export async function','async function');
function harness({score=4,minScore=4,access=true,existingLog=null}={}) {
  const logs=[],sends=[],generationCalls=[];
  const ctx=vm.createContext({
    resolveNotificationMinScore:policy.resolveNotificationMinScore,
    getNotificationTargetDate:()=> '2026-10-08',
    getNotificationTargetsPage:async()=>({items:[{user_id:'u',min_score:minScore}],hasMore:false,nextCursor:null}),
    getRecordsAccess:async()=>({notifications_enabled:access}),
    getNotificationLog:async()=>existingLog,
    getActivePushSubscriptions:async()=>[{endpoint:'test-endpoint'}],
    getPrimaryRadarLocation:async()=>({id:'location'}),
    ensureForecastBundle:async args=>{generationCalls.push(args);return {forecast:{id:'f',score_display_0_10:score,score_0_10:Math.round(score),vendor_meta:{snapshot_generation_slot:'evening_tomorrow'}}};},
    buildRadarPushPayload:()=>({title:'予報',body:'テスト'}),
    stripPushTimeSeconds:v=>v,
    sendWebPush:async args=>{sends.push(args);},
    insertNotificationLog:async args=>{logs.push(args);},
    deactivatePushSubscriptionByEndpoint:async()=>{throw new Error('unexpected deactivation');},
  });
  vm.runInContext(cronSource+'\nglobalThis.run=runRadarNotificationCron;',ctx);
  return {run:ctx.run,logs,sends,generationCalls};
}
test('absent/invalid thresholds use 4; valid explicit settings remain supported',()=>{
 for(const value of [undefined,null,'',NaN,'broken',-1,11]) assert.equal(policy.resolveNotificationMinScore(value),4);
 assert.equal(policy.DEFAULT_NOTIFICATION_MIN_SCORE,4);
 for(const value of [0,4,6,7,'4']) assert.equal(policy.resolveNotificationMinScore(value),Number(value));
});
for(const kind of ['morning','night']) {
 for(const score of [3.9,4,4.1,6,7]) test(`${kind}: displayed score ${score} uses inclusive 4-point boundary`,async()=>{
  const h=harness({score}),r=await h.run({kind});
  assert.equal(r.failed,0);
  if(score<4) {
   assert.equal(r.skipped,1);assert.equal(h.sends.length,0);
   assert.equal(h.logs[0].status,'skipped_low_score');assert.equal(h.logs[0].payload.min_score,4);
  } else {
   assert.equal(r.sent,1);assert.equal(h.sends.length,1);assert.equal(h.logs[0].status,'sent');
  }
 });
}
test('null or missing saved threshold also uses 4',async()=>{
 for(const minScore of [null,undefined,'']) {
  const h=harness({minScore,score:3.9}),r=await h.run({kind:'morning'});
  assert.equal(r.skipped,1);assert.equal(h.sends.length,0);
 }
});
test('duplicate daily log suppresses a second notification',async()=>{
 const h=harness({existingLog:{status:'sent'}}),r=await h.run({kind:'night'});
 assert.equal(r.skipped,1);assert.equal(h.sends.length,0);assert.equal(h.generationCalls.length,0);
});
test('access requirement still applies',async()=>{
 const h=harness({access:false}),r=await h.run({kind:'morning'});
 assert.equal(r.skipped,1);assert.equal(h.sends.length,0);
});
test('dry run does not send or write a sent log',async()=>{
 const h=harness(),r=await h.run({kind:'night',dryRun:true});
 assert.equal(r.sent,1);assert.equal(h.sends.length,0);assert.equal(h.logs.length,0);
});

// Exercise the actual subscription registration function and its settings write.
const repoSource=readFileSync(new URL('../lib/push/pushRepo.js', import.meta.url),'utf8')
 .replace(/^import[\s\S]*?;\r?\n/gm,'').replace(/^export /gm,'');
test('new push registration saves threshold 4 without changing enabled flags',async()=>{
 const writes=[];
 const ctx=vm.createContext({DEFAULT_NOTIFICATION_MIN_SCORE:4,createAdminClient:()=>({from:table=>({upsert:row=>{writes.push({table,row});return {select:()=>({single:async()=>({data:row,error:null})})};}})})});
 vm.runInContext(repoSource+'\nglobalThis.register=upsertPushSubscription;',ctx);
 await ctx.register({userId:'u',subscription:{endpoint:'test',keys:{p256dh:'key',auth:'auth'}}});
 const settings=writes.find(w=>w.table==='notification_settings').row;
 assert.equal(settings.min_score,4);assert.equal(settings.enabled,true);assert.equal(settings.night_enabled,true);assert.equal(settings.morning_enabled,true);
});

const apiSource=readFileSync(new URL('../app/api/push/settings/route.js',import.meta.url),'utf8')
 .replace(/^import[\s\S]*?;\r?\n/gm,'').replace(/^export /gm,'');
test('settings GET returns the 4-point default when no row exists',async()=>{
 const ctx=vm.createContext({Response,DEFAULT_NOTIFICATION_MIN_SCORE:4,requireUser:async()=>({user:{id:'u'}}),getNotificationSettings:async()=>null});
 vm.runInContext(apiSource+'\nglobalThis.get=GET;',ctx);
 const result=await (await ctx.get({})).json();
 assert.equal(result.settings.min_score,4);assert.equal(result.settings.enabled,false);
});
