// Real PostgreSQL semantics in a disposable WASM database; no network or Supabase.
// PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node --test tests/recheck-confirmation-v779106.integration.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createScenarioRunner } from "./helpers/forecast-scenarios.mjs";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const { load } = await createScenarioRunner();
const { scoreDiagnosis, buildConstitutionProfilePayload } = await load("lib/diagnosis/v2/scoring.js");
const { QUESTIONS_V2_BASE } = await load("lib/diagnosis/v2/questions.js");
const root = path.resolve(import.meta.dirname, "..");
const U="00000000-0000-4000-8000-000000000001", A="00000000-0000-4000-8000-000000000011", B="00000000-0000-4000-8000-000000000012", C="00000000-0000-4000-8000-000000000013";
const answers={...Object.fromEntries(QUESTIONS_V2_BASE.map(q=>[q.key,"never"])),reaction_tiebreak:"brake",symptom_focus:"fatigue"};
async function setup(type="text[]") {
  const db=new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE diagnosis_events(id uuid PRIMARY KEY,user_id uuid,answers jsonb,computed jsonb);
    CREATE TABLE constitution_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,source_event_id uuid,
      created_at timestamptz DEFAULT now(),symptom_focus text,answers jsonb,thermo int,resilience int,is_mixed boolean,qi int,blood int,fluid int,
      primary_meridian text,secondary_meridian text,core_code text,sub_labels text[],engine_version text,notes jsonb,
      ai_explain_text text,ai_explain_model text,ai_explain_created_at timestamptz);
    CREATE TABLE constitution_profiles(user_id uuid PRIMARY KEY,latest_event_id uuid,symptom_focus text,active_symptom_focus text,
      qi int,blood int,fluid int,cold_heat int,resilience int,primary_meridian text,secondary_meridian text,organs ${type},
      answers jsonb,computed jsonb,thermo int,is_mixed boolean,core_code text,sub_labels text[],engine_version text,version text);
    CREATE TABLE diagnosis_guest_access(event_id uuid PRIMARY KEY,claimed_at timestamptz,updated_at timestamptz);
  `);
  for(const file of ["20261001_atomic_body_lines_v77990.sql","20261027_confirm_constitution_update_v779106.sql"])await db.exec(await fs.readFile(path.join(root,"supabase/migrations",file),"utf8"));
  return db;
}
async function row(db,table,id,key="id") { return (await db.query(`SELECT to_jsonb(t) j FROM ${table} t WHERE ${key}=$1`,[id])).rows[0]?.j; }
async function seed(db,id,overrides={}) {
  const a={...answers,...overrides};
  await db.query("INSERT INTO diagnosis_events VALUES ($1,null,$2,$3)",[id,JSON.stringify(a),JSON.stringify(scoreDiagnosis(a))]);
  await db.query("INSERT INTO diagnosis_guest_access(event_id) VALUES ($1)",[id]);
}
async function adopt(db,id,confirm=false,snapshot=null) {
  const d=snapshot||await row(db,"diagnosis_events",id),computed=scoreDiagnosis(d.answers);
  return (await db.query("SELECT attach_diagnosis_v779106($1,$2,$3,$4,$5,$6,$7,$8) result",[
    id,U,d.user_id,JSON.stringify(d.answers),JSON.stringify(d.computed),
    JSON.stringify({...computed,answers:d.answers,notes:{source_event_id:id}}),
    JSON.stringify(buildConstitutionProfilePayload(U,d.answers)),confirm,
  ])).rows[0].result;
}

for(const type of ["text[]","jsonb"]) test(`first adoption, blocked recheck, explicit replacement, retry (${type})`,async()=>{
  const db=await setup(type);
  try {
    await seed(db,A);const ceA=await adopt(db,A);
    const current=await row(db,"constitution_profiles",U,"user_id");
    assert.equal(current.latest_event_id,ceA);
    await seed(db,B,{fatigue_easy:"almost_always",recovery_lag:"almost_always"});
    await assert.rejects(adopt(db,B),e=>e.code==="P0106");
    assert.deepEqual(await row(db,"constitution_profiles",U,"user_id"),current);
    assert.equal((await row(db,"diagnosis_events",B)).user_id,null);
    assert.equal((await db.query("SELECT count(*)::int n FROM constitution_events")).rows[0].n,1);
    assert.equal((await row(db,"diagnosis_guest_access",B,"event_id")).claimed_at,null);
    const ceB=await adopt(db,B,true);
    assert.equal((await row(db,"constitution_profiles",U,"user_id")).latest_event_id,ceB);
    assert.equal((await row(db,"constitution_events",ceB)).source_event_id,B);
    assert.equal((await row(db,"diagnosis_events",B)).user_id,U);
    assert.equal((await row(db,"diagnosis_events",A)).user_id,U);
    assert.equal(await adopt(db,B),ceB);
    assert.equal((await db.query("SELECT count(*)::int n FROM constitution_events")).rows[0].n,2);
    // Once another check was adopted, replaying the first check needs consent again.
    await assert.rejects(adopt(db,A),e=>e.code==="P0106");
  } finally { await db.close(); }
});

test("two completed first-check candidates cannot both auto-adopt",async()=>{
  const db=await setup();try{
    await seed(db,A);await seed(db,B);await adopt(db,A);
    await assert.rejects(adopt(db,B),e=>e.code==="P0106");
    const sql=await fs.readFile(path.join(root,"supabase/migrations/20261027_confirm_constitution_update_v779106.sql"),"utf8");
    assert.ok(sql.indexOf("PERFORM pg_advisory_xact_lock")<sql.indexOf("SELECT e.source_event_id"));
    // PGlite uses one connection. The per-account transaction-lock ordering is
    // also checked above; this is not a multi-connection stress test.
  }finally{await db.close();}
});

test("pending body-line editing leaves the adopted profile unchanged",async()=>{
  const db=await setup();try{
    await seed(db,A);await adopt(db,A);await seed(db,B);
    const current=await row(db,"constitution_profiles",U,"user_id"),pending=await row(db,"diagnosis_events",B);
    const result=(await db.query("SELECT save_diagnosis_body_lines_v77990($1,$2,$3,$4,$5,$6) result",[B,null,JSON.stringify(pending.answers),JSON.stringify(pending.computed),"E","none"])).rows[0].result;
    assert.equal(result.profile_updated,false);
    assert.deepEqual(await row(db,"constitution_profiles",U,"user_id"),current);
    await assert.rejects(adopt(db,B),e=>e.code==="P0106");
    await adopt(db,B,true);
    assert.equal((await row(db,"constitution_profiles",U,"user_id")).primary_meridian,"lung_li");
  }finally{await db.close();}
});

test("an injected confirmed-save failure rolls back history, ownership and profile",async()=>{
  const db=await setup();try{
    await seed(db,A);await adopt(db,A);await seed(db,B);
    const current=await row(db,"constitution_profiles",U,"user_id");
    await db.exec(`CREATE FUNCTION fail_claim() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$;
      CREATE TRIGGER fail_claim BEFORE UPDATE ON diagnosis_guest_access FOR EACH ROW EXECUTE FUNCTION fail_claim();`);
    await assert.rejects(adopt(db,B,true),/injected failure/);
    assert.deepEqual(await row(db,"constitution_profiles",U,"user_id"),current);
    assert.equal((await row(db,"diagnosis_events",B)).user_id,null);
    assert.equal((await db.query("SELECT count(*)::int n FROM constitution_events")).rows[0].n,1);
  }finally{await db.close();}
});

test("profile without a linked event still requires confirmation; role permissions remain private",async()=>{
  const db=await setup();try{
    await seed(db,C);await db.query("INSERT INTO constitution_profiles(user_id) VALUES($1)",[U]);
    await assert.rejects(adopt(db,C),e=>e.code==="P0106");
    await adopt(db,C,true);
    const p=(await db.query("SELECT has_function_privilege('anon','public.attach_diagnosis_v779106(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean)','EXECUTE') a,has_function_privilege('authenticated','public.attach_diagnosis_v779106(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean)','EXECUTE') b,has_function_privilege('service_role','public.attach_diagnosis_v779106(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean)','EXECUTE') c")).rows[0];
    assert.deepEqual(p,{a:false,b:false,c:true});
    // Re-running this migration is safe and does not alter saved rows.
    const before=await row(db,"constitution_profiles",U,"user_id");
    await db.exec(await fs.readFile(path.join(root,"supabase/migrations/20261027_confirm_constitution_update_v779106.sql"),"utf8"));
    assert.deepEqual(await row(db,"constitution_profiles",U,"user_id"),before);
  }finally{await db.close();}
});
