import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("使い方ガイドはトリセツ・予報・対策ケア・記録分析の役割を分ける", async () => {
  const text = await source("app/guide/GuideClient.jsx");
  assert.match(text, /label: "トリセツ", sub: "自分の体質を知る"/);
  assert.match(text, /label: "体調予報", sub: "今日・明日のゆらぎを見る"/);
  assert.match(text, /label: "対策ケア", sub: "先回りして整える"/);
  assert.match(text, /label: "記録・相談", sub: "実感を残し、AIや人に相談", Icon: IconPencil/);
});

test("使い方ガイドのユーザー表示は対策ケアへ統一する", async () => {
  const guide = await source("app/guide/GuideClient.jsx");
  const page = await source("app/guide/page.js");
  assert.match(guide, /対策ケアのカード/);
  assert.match(guide, /その場で「やってみた」/);
  assert.match(guide, /体調予報と対策ケア/);
  assert.match(page, /対策ケアで先回りする/);
  assert.doesNotMatch(guide, /Daily Care/);
  assert.doesNotMatch(page, /Daily Care/);
});

test("使い方ガイドは現行4タブ構成を使う", async () => {
  const text = await source("app/guide/GuideClient.jsx");
  assert.match(text, /基本の流れ/);
  assert.match(text, /予報・ケア/);
  assert.match(text, /記録・相談/);
  assert.match(text, /MYケア/);
  assert.doesNotMatch(text, /①トリセツ/);
});

test("前夜・当日・提案以外のケア説明を自然な文脈にする", async () => {
  const text = await source("app/guide/GuideClient.jsx");
  assert.match(text, /前日に表示された「明日に向けた今夜のケア」/);
  assert.match(text, /前夜の「明日に向けたケア」/);
  assert.match(text, /提案以外のケアをした日は/);
  assert.doesNotMatch(text, /前日の明日カード/);
  assert.doesNotMatch(text, /昨晩の明日ケア/);
  assert.doesNotMatch(text, /やったケアを記録/);
});

test("ガイド用の記録アイコンとして鉛筆を提供する", async () => {
  const guideIcons = await source("components/illust/icons/guide.jsx");
  const appIcons = await source("components/illust/icons/app.jsx");
  assert.match(guideIcons, /IconPencil/);
  assert.match(appIcons, /export function IconPencil/);
  assert.match(appIcons, /pencil: IconPencil/);
});
