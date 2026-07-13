import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("使い方ガイドは予報・ケア・記録・分析の流れを案内する", async () => {
  const text = await source("app/guide/GuideClient.jsx");
  assert.match(text, /予報を見て、ケアを試し/);
  assert.match(text, /Daily Careカードの「やってみた」/);
  assert.match(text, /夜に実感を残す/);
  assert.match(text, /固定された予報を物差し/);
});

test("使い方ガイドは現行4タブ構成を使う", async () => {
  const text = await source("app/guide/GuideClient.jsx");
  assert.match(text, /基本の流れ/);
  assert.match(text, /予報・ケア/);
  assert.match(text, /記録・分析/);
  assert.match(text, /MYケア/);
  assert.doesNotMatch(text, /①トリセツ/);
});

test("ガイドmetadataとHowToはDaily Careと分析まで含む", async () => {
  const text = await source("app/guide/page.js");
  assert.match(text, /Daily Careの実行記録/);
  assert.match(text, /実感を記録する/);
  assert.match(text, /記録とAI分析で振り返る/);
});
