import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../lib/radar_v1/runRadarSnapshotCron.js', import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').replace('export async function','async function');
function harness({profiles={ready:{}},bundleError=false}={}) {
  const reads=[],calls=[];
  const ctx=vm.createContext({
    nowJstParts:()=>({isoDate:'2026-10-04'}), addDaysJST:()=> '2026-10-05',
    listPrimaryRadarLocationsPageForForecastCron:async()=>({items:[{user_id:'missing',id:'a'},{user_id:'ready',id:'b'}],hasMore:true,nextCursor:'ready'}),
    getRadarConstitutionProfile:async({userId})=>{reads.push(userId); if(profiles[userId] instanceof Error) throw profiles[userId]; return profiles[userId]??null;},
    ensureForecastBundle:async args=>{calls.push(args);if(bundleError)throw new Error('weather unavailable');return {cached:!args.force,forecast:{id:'f',score_0_10:3}};},
  });
  vm.runInContext(source+'\nglobalThis.run = runRadarSnapshotCron;',ctx);
  return {run:ctx.run,reads,calls,profiles};
}
test('missing profiles skip both dates; ready user generates; pagination remains intact',async()=>{
 const h=harness(),r=await h.run();
 assert.equal(r.generated,2);assert.equal(r.skipped_no_profile,2);assert.equal(r.skipped,2);assert.equal(r.failed,0);assert.equal(r.processed,4);
 assert.equal(r.has_more,true);assert.equal(r.next_cursor,'ready');
 assert.equal(h.calls.length,2);assert.ok(h.calls.every(x=>x.userId==='ready'));
 assert.equal(h.reads.length,2);
});
test('profile saved later becomes eligible on next invocation',async()=>{
 const h=harness();await h.run();h.profiles.missing={};
 const r=await h.run();assert.equal(r.generated,4);assert.equal(r.skipped,0);
});
test('database error stays failed while other users continue',async()=>{
 const h=harness({profiles:{missing:new Error('database unavailable'),ready:{}}}),r=await h.run();
 assert.equal(r.failed,2);assert.equal(r.generated,2);assert.equal(r.skipped_no_profile,0);
 assert.ok(r.details.filter(x=>x.status==='failed').every(x=>x.error==='database unavailable'));
});
test('generation error stays failed',async()=>{
 const r=await harness({bundleError:true}).run();assert.equal(r.failed,2);assert.equal(r.skipped_no_profile,2);
});
test('dry run checks eligibility without generating or writing',async()=>{
 const h=harness(),r=await h.run({dryRun:true});assert.equal(h.calls.length,0);assert.equal(r.skipped,4);assert.equal(r.skipped_no_profile,2);assert.equal(r.failed,0);
});
test('existing cache behavior and generation arguments preserved',async()=>{
 const h=harness(),r=await h.run({force:false,dates:'2026-10-05',generationSlot:'evening_tomorrow'});
 assert.equal(r.cached,1);assert.equal(r.skipped_no_profile,1);assert.equal(h.calls[0].force,false);assert.equal(h.calls[0].generationSlot,'evening_tomorrow');
});
