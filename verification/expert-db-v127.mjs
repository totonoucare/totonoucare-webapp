const { PGlite } = await import(process.env.MIBYO_QA_PGLITE || "@electric-sql/pglite");
import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
import {randomUUID as uuid} from "node:crypto";
const db = new PGlite(), user=uuid(), other=uuid(), op=uuid();
await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key)");
await db.query("insert into auth.users values ($1),($2),($3)",[user,other,op]);
const sql=await readFile(new URL("../supabase/migrations/20261118_expert_v127.sql",import.meta.url),"utf8");
await db.exec(sql);await db.exec(sql);
const send=async({space="test",actor=user,staff=false,paid=true,thread=null,key=uuid(),body="テスト質問",expected=0}={})=>
 (await db.query("select expert_send_v127($1,$2,$3,$4,$5,$6,$7,$8) as id",[space,actor,staff,paid,thread,key,body,expected])).rows[0].id;
for(const role of ["anon","authenticated"]){
 await db.exec("set role "+role);
 for(const t of ["expert_threads_v127","expert_messages_v127"]) await assert.rejects(db.query("select * from "+t),e=>e.code==="42501");
 await assert.rejects(send(),e=>e.code==="42501");await db.exec("reset role");
}
await db.exec("set role service_role");
await assert.rejects(send({paid:false}),/paid_required/);
const key=uuid(), first=await send({key});
assert.equal(await send({key}),first);
await assert.rejects(send({key,body:"別の質問"}),/duplicate_request/);
await send();await assert.rejects(send(),/month_limit/);
await assert.rejects(send({thread:first,actor:other}),/thread_missing/);
await assert.rejects(send({thread:first,actor:op,staff:true,space:"live",expected:1}),/thread_missing/);
await assert.rejects(send({thread:first,expected:1}),/turn_conflict/);
await send({actor:op,staff:true,thread:first,expected:1});
await send({paid:false,thread:first,expected:2});
await assert.rejects(send({actor:op,staff:true,thread:first,expected:1}),/turn_conflict/);
await send({actor:op,staff:true,thread:first,expected:3});
await assert.rejects(send({thread:first,expected:4}),/turn_conflict/);
await send({space:"live"});
assert.equal((await db.query("select count(*)::int as n from expert_messages_v127 where thread_id=$1",[first])).rows[0].n,4);
await db.close();console.log("PASS migration twice, role isolation, paid/month limits, idempotency, ownership, environment isolation, four turns and stale writes");
