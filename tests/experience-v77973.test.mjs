import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const src=await readFile(new URL('../lib/experience/policy.js',import.meta.url),'utf8');
const p=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const now=Date.parse('2026-09-30T03:00:00Z');
const rows=[28,29,30].map(d=>({event_key:`use:care:2026-09-${d}`,created_at:`2026-09-${d}T03:00:00Z`}));
const beta={rows,access:{mode:'beta',trial_days_remaining:1},now};
test('JST day boundary determines unique usage days',()=>{
 assert.equal(p.dayKey(Date.parse('2026-09-29T15:00:00Z')),'2026-09-30');
 assert.equal(p.summarizeExperience([...rows,{event_key:'use:forecast:2026-09-30'}],now).activeDays,3);
});
test('beta users may answer value but never the trial-ending question',()=>{assert.equal(p.surveyEligible('value',beta),true);assert.equal(p.surveyEligible('barrier',beta),false);});
test('actual trial has a 1–5 day window',()=>{
 for(const n of [0,1,5,6,14])assert.equal(p.surveyEligible('barrier',{...beta,access:{mode:'trial',trial_days_remaining:n}}),n>=1&&n<=5);
});
test('two usage days do not count as three even after a long absence',()=>assert.equal(p.surveyEligible('value',{...beta,rows:rows.slice(0,2)}),false));
test('answers and skips remain handled across beta to trial',()=>{
 for(const answer of ['skip','care'])assert.equal(p.surveyEligible('value',{...beta,access:{mode:'trial'},rows:[...rows,{event_key:'survey:value',payload:{answer},created_at:'2026-09-01T00:00:00Z'}]}),false);
});
test('AI feedback suppresses the same day; general surveys have a two-day gap',()=>{
 assert.equal(p.surveyEligible('value',{...beta,rows:[...rows,{event_key:'use:feedback:2026-09-30'}]}),false);
 assert.equal(p.surveyEligible('value',{...beta,rows:[...rows,{event_key:'survey:result',created_at:'2026-09-29T03:00:00Z'}]}),false);
});
test('paid/free users are not asked trial surveys; invalid IDs rejected',()=>{
 for(const mode of ['free','entitled','expired'])assert.equal(p.surveyEligible('value',{...beta,access:{mode}}),false);
 assert.equal(p.surveyEligible('constructor',beta),false);
});
const api=(await readFile(new URL('../app/api/experience/route.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export /g,'');
function harness({user={id:'user-a'},events=rows,access={mode:'beta'},failure=false}={}){
 const writes=[],filters=[];
 const db={from(table){const q={select(){return q},eq(k,v){filters.push([table,k,v]);return q},order(){return q},or(){return q},limit(){return q},not(){return q},gte(){return q},lte(){return q},then(resolve){return Promise.resolve({data:table==='app_experience_events'?events:[],error:failure?new Error('database'):null}).then(resolve)},upsert(row,options){writes.push({row,options});return Promise.resolve({error:failure?new Error('database'):null})}};return q}};
 const mod=new Function('NextResponse','requireUser','supabaseServer','getRecordsAccess','SURVEYS','GUIDE_IDS','FEATURE_IDS','dayKey','summarizeExperience','surveyEligible',api+';return {GET,POST};')({json:(body,options)=>({body,...options})},async()=>({user}),db,async()=>access,p.SURVEYS,p.GUIDE_IDS,p.FEATURE_IDS,p.dayKey,p.summarizeExperience,p.surveyEligible);
 return {...mod,writes,filters};
}
const req=body=>({json:async()=>body});
test('API rejects anonymous writes and unknown options',async()=>{
 assert.equal((await harness({user:null}).POST(req({type:'use',id:'care'}))).status,401);
 for(const body of [{type:'use',id:'secret'},{type:'survey',id:'result',answer:'secret'},{type:'survey',id:'constructor',answer:'secret'}])assert.equal((await harness().POST(req(body))).status,400);
});
test('API stores authenticated owner and only allowlisted payload',async()=>{
 const h=harness();assert.equal((await h.POST(req({type:'use',id:'care',user_id:'victim',privateText:'secret'}))).status,200);
 assert.equal(h.writes[0].row.user_id,'user-a');assert.equal(h.writes[0].row.payload.privateText,undefined);assert.equal(h.writes[0].options.ignoreDuplicates,true);
});
test('API suppresses duplicate answer and fails honestly when DB unavailable',async()=>{
 const h=harness({events:[{event_key:'survey:result',payload:{answer:'skip'}}]});assert.equal((await h.POST(req({type:'survey',id:'result',answer:'discovery'}))).status,200);assert.equal(h.writes.length,0);
 assert.equal((await harness({failure:true}).POST(req({type:'survey',id:'result',answer:'discovery'}))).status,503);
});
test('API checks survey eligibility independently from client',async()=>{
 const h=harness({events:[],access:{mode:'beta'}});assert.equal((await h.POST(req({type:'survey',id:'barrier',answer:'price'}))).status,409);assert.equal(h.writes.length,0);
});
