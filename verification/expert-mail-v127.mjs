// Exercise notification delivery without connecting to a database or a mail provider.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const code=(await readFile(new URL("../lib/expertServer.js",import.meta.url),"utf8")).replace(/^import.*?;\s*/,"").replaceAll("export ","");
const sent=[], marked=[], rows=[{id:"message-1",thread_id:"thread-1",turn:1,expert_threads_v127:{turns:1}}];
let status=503;
const environment={env:{EXPERT_SPACE:"test",EXPERT_MAIL_FROM:"notify@example.invalid",EXPERT_APP_URL:"https://test.example.invalid",RESEND_API_KEY:"fixture"}};
const db={from(){
  const query={select(){return this},eq(){return this},in(){return this},is(){return this},order(){return this},limit(){return this},
    then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject)},
    update(){return {eq:async(_,id)=>{marked.push(id);return {error:null}}}}};
  return query;
}};
const deliver=new Function("db","process","fetch",code+"; return deliverExpertNotices;")(db,environment,async(url,options)=>{sent.push(options);return {ok:status===200};});
await assert.rejects(deliver("thread-1"),/mail_delivery/);
assert.deepEqual(marked,[]);
status=200;await deliver("thread-1");
const mail=JSON.parse(sent[1].body);
assert.deepEqual(mail.to,["totonoucare@gmail.com"]);
assert.equal(mail.text,"相談管理で内容を確認して返信してください。\n\nhttps://test.example.invalid/expert/manage?thread=thread-1");
assert.ok(mail.subject.includes("テスト"));
assert.equal(sent[0].headers["Idempotency-Key"],sent[1].headers["Idempotency-Key"]);
rows[0].expert_threads_v127.turns=2;await deliver();
assert.equal(sent.length,2);assert.deepEqual(marked,["message-1","message-1"]);
console.log("PASS notification recipient, text, environment link, retry key, stale notification and provider failure");
