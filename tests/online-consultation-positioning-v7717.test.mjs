import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("ガイドは振り返りの価値を自分に合う整え方として伝える", async () => {
  const guide = await source("app/guide/GuideClient.jsx");
  const page = await source("app/guide/page.js");
  assert.match(guide, /自分に合う整え方が見えてくる/);
  assert.match(guide, /どんな日に何をすると過ごしやすかったか/);
  assert.match(guide, /次に試して確かめたいこと/);
  assert.match(page, /記録から自分に合う整え方を探す/);
  assert.doesNotMatch(guide, /title="AIは似た予報条件を比べる"/);
});

test("鍼灸師との実践相談は準備中で、予約・料金を発生させない", async () => {
  const guide = await source("app/guide/GuideClient.jsx");
  const expert = await source("components/records/ExpertConsultPreview.jsx");
  assert.match(guide, /鍼灸師（国家資格者）/);
  assert.match(expert, /準備中/);
  assert.match(expert, /予約や料金は発生しません/);
  assert.match(expert, /expert-interest/);
  assert.match(expert, /共有したい記録/);
});

test("オンライン相談の関心イベントは独立サービスとして保存する", async () => {
  const route = await source("app/api/records/expert-interest/route.js");
  assert.match(route, /licensed_professional_self_care_consultation/);
  assert.match(route, /records_online_consultation_preview/);
  assert.doesNotMatch(route, /ai_bundle/);
  assert.doesNotMatch(route, /google_meet/);
});
