import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("ガイドはAI分析の価値を自分に合う整え方として伝える", async () => {
  const guide = await source("app/guide/GuideClient.jsx");
  const page = await source("app/guide/page.js");
  assert.match(guide, /自分に合う整え方が見えてくる/);
  assert.match(guide, /どんな日に何をすると過ごしやすかったか/);
  assert.match(guide, /次に試して確かめたいこと/);
  assert.match(page, /記録から自分に合う整え方を探す/);
  assert.doesNotMatch(guide, /title="AIは似た予報条件を比べる"/);
});

test("オンライン相談はAI分析の延長ではなく国家資格者の別サービスとして表示する", async () => {
  const guide = await source("app/guide/GuideClient.jsx");
  const expert = await source("components/records/ExpertConsultPreview.jsx");
  const records = await source("components/records/RecordsPageClient.jsx");
  assert.match(guide, /国家資格者によるオンライン相談/);
  assert.match(guide, /AI分析の続きではありません/);
  assert.match(expert, /セルフケアだけでは足りない不調を、オンラインで相談/);
  assert.match(expert, /AI分析を使っていなくても相談できます/);
  assert.match(records, /label: "オンライン相談", short: "相談"/);
  assert.doesNotMatch(records, /AI分析・相談/);
  assert.doesNotMatch(records, /専門家相談/);
});

test("オンライン相談はアプリ記録を事前情報として使い実践支援を説明する", async () => {
  const expert = await source("components/records/ExpertConsultPreview.jsx");
  assert.match(expert, /アプリの記録が相談前の情報になります/);
  assert.match(expert, /舌・姿勢・動作などを参考に確認/);
  assert.match(expert, /市販灸・円皮鍼・ツボ/);
  assert.match(expert, /相談後のケアプラン/);
  assert.match(expert, /医療機関での診断・治療に代わるものではありません/);
});

test("オンライン相談の関心イベントは独立サービスとして保存する", async () => {
  const route = await source("app/api/records/expert-interest/route.js");
  assert.match(route, /licensed_professional_self_care_consultation/);
  assert.match(route, /records_online_consultation_preview/);
  assert.doesNotMatch(route, /ai_bundle/);
  assert.doesNotMatch(route, /google_meet/);
});
