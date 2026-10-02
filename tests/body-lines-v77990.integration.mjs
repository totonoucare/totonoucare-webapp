// Disposable PostgreSQL WASM tests; never connects to Supabase.
// PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node --test tests/body-lines-v77990.integration.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import {scoreDiagnosis,buildConstitutionProfilePayload} from '../lib/diagnosis/v2/scoring.js';
import {QUESTIONS_V2_BASE} from '../lib/diagnosis/v2/questions.js';
import {validateDiagnosisAnswers} from '../lib/diagnosis/v2/validateAnswers.js';
import {personalizeForecastV2} from '../lib/radar_v1/personalizeForecastV2.js';
import {selectMtestLine} from '../lib/radar_v1/selectMtestLine.js';
const root=path.resolve(import.meta.dirname,'..');
const migration=await fs.readFile(path.join(root,'supabase/migrations/20261001_atomic_body_lines_v77990.sql'),'utf8');
const U='00000000-0000-0000-0000-000000000001',A='00000000-0000-0000-0000-000000000011',B='00000000-0000-0000-0000-000000000012';
const answers={...Object.fromEntries(QUESTIONS_V2_BASE.map(q=>[q.key,'never'])),reaction_tiebreak:'brake',symptom_focus:'fatigue'};
async function setup(organsType='text[]'){
 const db=new PGlite();await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE TABLE diagnosis_events(id uuid PRIMARY KEY,user_id uuid,answers jsonb,computed jsonb);
 CREATE TABLE constitution_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,source_event_id uuid,
 created_at timestamptz DEFAULT now(),symptom_focus text,answers jsonb,thermo int,resilience int,is_mixed boolean,qi int,blood int,fluid int,
 primary_meridian text,secondary_meridian text,core_code text,sub_labels text[],engine_version text,notes jsonb,
 ai_explain_text text,ai_explain_model text,ai_explain_created_at timestamptz);
 CREATE TABLE constitution_profiles(user_id uuid PRIMARY KEY,latest_event_id uuid,symptom_focus text,active_symptom_focus text,
 qi int,blood int,fluid int,cold_heat int,resilience int,primary_meridian text,secondary_meridian text,organs ${organsType},
 answers jsonb,computed jsonb,thermo int,is_mixed boolean,core_code text,sub_labels text[],engine_version text,version text);
 CREATE TABLE diagnosis_guest_access(event_id uuid PRIMARY KEY,claimed_at timestamptz,updated_at timestamptz);
 `);await db.exec(migration);return db;
}
async function get(db,table,id,key='id'){return (await db.query(`SELECT to_jsonb(t) j FROM ${table} t WHERE ${key}=$1`,[id])).rows[0]?.j}
async function seed(db,id=A){await db.query('INSERT INTO diagnosis_events VALUES ($1,null,$2,$3)',[id,JSON.stringify(answers),JSON.stringify(scoreDiagnosis(answers))]);await db.query('INSERT INTO diagnosis_guest_access(event_id) VALUES ($1)',[id]);}
async function attach(db,id=A,snapshot=null){const d=snapshot||await get(db,'diagnosis_events',id),computed=scoreDiagnosis(d.answers),event={...computed,answers:d.answers,notes:{source_event_id:id}},profile=buildConstitutionProfilePayload(U,d.answers);
 return (await db.query('SELECT attach_diagnosis_v77990($1,$2,$3,$4,$5,$6,$7) result',[id,U,d.user_id,JSON.stringify(d.answers),JSON.stringify(d.computed),JSON.stringify(event),JSON.stringify(profile)])).rows[0].result;
}
async function save(db,id=A,primary='E',secondary='none',snapshot=null){const d=snapshot||await get(db,'diagnosis_events',id);return (await db.query('SELECT save_diagnosis_body_lines_v77990($1,$2,$3,$4,$5,$6) result',[id,d.user_id,JSON.stringify(d.answers),JSON.stringify(d.computed),primary,secondary])).rows[0].result}
const withoutLines=x=>{const y=structuredClone(x);delete y.primary_meridian;delete y.secondary_meridian;return y};
for(const type of ['text[]','jsonb'])test(`latest add/change/clear preserves scores, focus and selection (${type})`,async()=>{
 const db=await setup(type);try{await seed(db);await attach(db);await db.query("UPDATE constitution_profiles SET active_symptom_focus='sleep'");const before=await get(db,'constitution_profiles',U,'user_id');
 for(const [primary,secondary,pLine,sLine]of [['E','A','lung_li','kidney_bl'],['B','B','spleen_st',null],['none','A',null,null]]){
 const saved=await save(db,A,primary,secondary),p=await get(db,'constitution_profiles',U,'user_id'),d=await get(db,'diagnosis_events',A),e=await get(db,'constitution_events',p.latest_event_id);
 assert(saved.profile_updated);assert.equal(p.primary_meridian,pLine);assert.equal(p.secondary_meridian,sLine);assert.deepEqual(p.organs,pLine?[pLine]:[]);assert.deepEqual(p.answers,d.answers);assert.deepEqual(e.answers,d.answers);assert.deepEqual(p.computed,d.computed);
 assert.deepEqual(withoutLines(p.computed),withoutLines(before.computed));assert.equal(p.core_code,before.core_code);assert.deepEqual(p.sub_labels,before.sub_labels);assert.equal(p.active_symptom_focus,'sleep');
 if(!sLine)assert.equal(selectMtestLine({primary_meridian:p.primary_meridian,secondary_meridian:p.secondary_meridian,weatherStress:{}}).selected_line,pLine);
 }
 }finally{await db.close()}
});
test('historical edit preserves current profile, including latest attachment',async()=>{const db=await setup();try{await seed(db);await attach(db);const old=await get(db,'diagnosis_events',A);await seed(db,B);await attach(db,B);const current=await get(db,'constitution_profiles',U,'user_id');const r=await save(db,A,'E','none',old);assert.equal(r.profile_updated,false);assert.deepEqual(await get(db,'constitution_profiles',U,'user_id'),current);assert.equal((await get(db,'diagnosis_events',A)).computed.primary_meridian,'lung_li')}finally{await db.close()}});
test('stale line writes and attachment snapshots conflict without overwrite',async()=>{const db=await setup();try{await seed(db);const guest=await get(db,'diagnosis_events',A);await save(db,A,'E');await assert.rejects(attach(db,A,guest),e=>e.code==='40001');await attach(db);await assert.rejects(save(db,A,'A','none',guest),e=>e.code==='40001');const current=await get(db,'diagnosis_events',A);await save(db,A,'B');await assert.rejects(save(db,A,'F','none',current),e=>e.code==='40001');assert.equal((await get(db,'diagnosis_events',A)).computed.primary_meridian,'spleen_st')}finally{await db.close()}});
test('failure after profile write rolls back every table',async()=>{const db=await setup();try{await seed(db);await attach(db);const p=await get(db,'constitution_profiles',U,'user_id'),d=await get(db,'diagnosis_events',A),e=await get(db,'constitution_events',p.latest_event_id);await db.exec(`CREATE FUNCTION fail_save() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$;CREATE TRIGGER fail_save BEFORE UPDATE ON diagnosis_events FOR EACH ROW EXECUTE FUNCTION fail_save();`);await assert.rejects(save(db));assert.deepEqual(await get(db,'constitution_profiles',U,'user_id'),p);assert.deepEqual(await get(db,'diagnosis_events',A),d);assert.deepEqual(await get(db,'constitution_events',p.latest_event_id),e)}finally{await db.close()}});
test('attachment failure does not leave partial event or profile',async()=>{const db=await setup();try{await seed(db);await db.exec(`CREATE FUNCTION fail_claim() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$;CREATE TRIGGER fail_claim BEFORE UPDATE ON diagnosis_guest_access FOR EACH ROW EXECUTE FUNCTION fail_claim();`);await assert.rejects(attach(db));assert.equal((await db.query('SELECT count(*)::int n FROM constitution_events')).rows[0].n,0);assert.equal(await get(db,'constitution_profiles',U,'user_id'),undefined);assert.equal((await get(db,'diagnosis_events',A)).user_id,null)}finally{await db.close()}});
test('invalid inputs, wrong owner and inconsistent linked answers are rejected',async()=>{const db=await setup();try{await seed(db);await assert.rejects(save(db,A,'invalid'),e=>e.code==='22023');await attach(db);const d=await get(db,'diagnosis_events',A);await assert.rejects(save(db,A,'A','none',{...d,user_id:B}),e=>e.code==='40001');await db.exec(`UPDATE constitution_profiles SET answers=answers || '{"fatigue_easy":"often"}'::jsonb`);await assert.rejects(save(db),e=>e.code==='22023');assert.equal((await get(db,'diagnosis_events',A)).computed.primary_meridian,null);
 const perms=await db.query("SELECT has_function_privilege('anon','public.save_diagnosis_body_lines_v77990(uuid,uuid,jsonb,jsonb,text,text)','EXECUTE') a,has_function_privilege('authenticated','public.attach_diagnosis_v77990(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb)','EXECUTE') b");assert.equal(perms.rows[0].a,false);assert.equal(perms.rows[0].b,false);
 }finally{await db.close()}});
async function patchRoute(db,authorized=true,guest=true){const source=await fs.readFile(path.join(root,'app/api/diagnosis/v2/events/[id]/route.js'),'utf8');const body=source.replace(/^import[\s\S]*?;\n/gm,'').replaceAll('export ','');
 const sb={auth:{getUser:async()=>({data:{user:authorized?{id:U}:null}})},from(table){let id;return {select(){return this},eq(k,v){id=v;return this},single:async()=>({data:await get(db,table,id),error:null})}},rpc:async(name,args)=>{try{const data=(await db.query(`SELECT ${name}($1,$2,$3,$4,$5,$6) result`,[args.p_event_id,args.p_expected_user_id,JSON.stringify(args.p_expected_answers),JSON.stringify(args.p_expected_computed),args.p_primary,args.p_secondary])).rows[0].result;return {data}}catch(e){return {error:{code:e.code,message:e.message}}}}};
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;return new AsyncFunction('NextResponse','supabaseServer','scoreDiagnosis','validateDiagnosisAnswers','hasValidGuestToken',body+'\nreturn PATCH;')({json:(data,options)=>({data,status:options?.status||200})},sb,scoreDiagnosis,validateDiagnosisAnswers,async()=>guest);
}
test('API authorizes saves and returns stored scores without recomputation',async()=>{const db=await setup();try{await seed(db);await attach(db);const req={headers:{get:()=> 'Bearer test'},json:async()=>({body_line_primary:'E'})};let patch=await patchRoute(db,false);assert.equal((await patch(req,{params:{id:A}})).status,403);patch=await patchRoute(db,true);const r=await patch(req,{params:{id:A}});assert.equal(r.status,200);assert.equal(r.data.data.computed.primary_meridian,'lung_li');assert.deepEqual(r.data.data.computed.material_scores,scoreDiagnosis(answers).material_scores)}finally{await db.close()}});
test('real attachment API calls atomic RPC and guest denial cannot write',async()=>{
 const db=await setup();try{await seed(db);const src=await fs.readFile(path.join(root,'app/api/diagnosis/v2/events/[id]/attach/route.js'),'utf8');const body=src.replace(/^import[\s\S]*?;\n/gm,'').replaceAll('export ','');
 const sb={auth:{getUser:async()=>({data:{user:{id:U}}})},from(table){let id;return {select(){return this},eq(k,v){id=v;return this},single:async()=>({data:await get(db,table,id)})}},rpc:async(name,a)=>({data:(await db.query(`SELECT ${name}($1,$2,$3,$4,$5,$6,$7) result`,[a.p_event_id,a.p_user_id,a.p_expected_user_id,JSON.stringify(a.p_expected_answers),JSON.stringify(a.p_expected_computed),JSON.stringify(a.p_event_payload),JSON.stringify(a.p_profile_payload)])).rows[0].result})};
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const load=guest=>new AsyncFunction('NextResponse','supabaseServer','buildConstitutionProfilePayload','scoreDiagnosis','validateDiagnosisAnswers','clearGuestTokenCookie','hasValidGuestToken',body+'\nreturn POST;')({json:(data,o)=>({data,status:o?.status||200})},sb,buildConstitutionProfilePayload,scoreDiagnosis,validateDiagnosisAnswers,()=>{},async()=>guest);
 const req={headers:{get:()=> 'Bearer test'}};assert.equal((await (await load(false))(req,{params:{id:A}})).status,403);assert.equal((await get(db,'diagnosis_events',A)).user_id,null);
 const r=await (await load(true))(req,{params:{id:A}});assert.equal(r.status,200);assert.equal((await get(db,'constitution_profiles',U,'user_id')).latest_event_id,r.data.data.latest_event_id);assert.equal((await get(db,'diagnosis_events',A)).user_id,U);
 }finally{await db.close()}
});
test('organs correction leaves forecast profile and M-test point selection identical',async()=>{
 const src=await fs.readFile(path.join(root,'lib/radar_v1/profileRepo.js'),'utf8');const shape=new Function('createClient',src.replace(/^import[\s\S]*?;\n/gm,'').replaceAll('export ','')+'\nreturn shapeRadarProfile;')(()=>{throw Error('Network forbidden')});
 const pointSrc=await fs.readFile(path.join(root,'lib/radar_v1/selectMtestPoint.js'),'utf8');const selectPoint=new Function('getMtestPointsByLine',pointSrc.replace(/^import[\s\S]*?;\n/gm,'').replaceAll('export ','')+'\nreturn selectMtestPoint;')(async({line})=>[{code:line+'-test',mtest_block:line,mtest_meridian_side:1,mtest_role:'mother',name_ja:'test point'}]);
 for(const primary_meridian of ['lung_li','kidney_bl']){const raw={...buildConstitutionProfilePayload(U,answers),primary_meridian,organs:[]};const before=shape(raw),after=shape({...raw,organs:[primary_meridian]});const {raw:rawBefore,...selectedBefore}=before,{raw:rawAfter,...selectedAfter}=after;assert.deepEqual(selectedBefore,selectedAfter);const weather={event_strengths:{pressure_shift:.4,temperature_shift:.2,cold:.2,heat:.1,damp:.4,dry:.1},meta:{}};assert.deepEqual(personalizeForecastV2({weatherStress:weather,constitution:before}),personalizeForecastV2({weatherStress:weather,constitution:after}));
 const weatherStress={main_trigger:'pressure',trigger_dir:'down'},line=selectMtestLine({...before,weatherStress});assert.equal(line.selected_line,primary_meridian);const a=await selectPoint({selectedLine:line.selected_line,motherChild:{mode:'mother'},weatherStress});const b=await selectPoint({selectedLine:selectMtestLine({...after,weatherStress}).selected_line,motherChild:{mode:'mother'},weatherStress});assert.deepEqual(a,b);assert.equal(a.point.code,primary_meridian+'-test');}
});
test('targeted repair only changes organs and can be repeated safely',async()=>{const db=await setup();try{
 await seed(db);const ce=await attach(db);await save(db,A,'E');await db.exec(`CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,created_at timestamptz);INSERT INTO auth.users VALUES('${U}','2026-09-26T00:00:00+09');UPDATE constitution_profiles SET organs=ARRAY[]::text[];`);
 const before=await get(db,'constitution_profiles',U,'user_id');const hash=(await db.query("SELECT md5('movement-audit:'||$1) h",[U])).rows[0].h;
 let sql=await fs.readFile(path.join(root,'maintenance/repair_organs_two_users_v77990.sql'),'utf8');
 sql=sql.replaceAll('6c71a627939147954a93c7b612c4f003',hash).replaceAll('33044886-f776-40b0-a8eb-f3b70c2cd974',ce).replaceAll('e2504f24-b181-4836-9cb1-d36d72b6139d',A);
 await db.exec(sql);const after=await get(db,'constitution_profiles',U,'user_id');assert.deepEqual(after,{...before,organs:['lung_li']});await db.exec(sql);assert.deepEqual(await get(db,'constitution_profiles',U,'user_id'),after);
 }finally{await db.close()}});
