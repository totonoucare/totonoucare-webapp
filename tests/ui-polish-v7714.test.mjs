import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("記録済みケア一覧は長いdetail本文を表示しない", async () => {
  const text = await source("components/records/DailyRecordCard.jsx");
  assert.match(text, /\{item\.label\}/);
  assert.doesNotMatch(text, /item\.detail \? <div/);
});

test("AI分析更新上限は分析カード内の専用noticeとして扱う", async () => {
  const text = await source("components/records/AiAnalysisPanel.jsx");
  assert.match(text, /loadError\?\.code === "daily_analysis_limit"/);
  assert.match(text, /\{analysisNotice\}/);
  assert.match(text, /setAnalysisNotice\(""\)/);
});

test("いたわりは通常サイズの目を維持し、守りは自然な旧表情を使う", async () => {
  const text = await source("components/illust/home/HeroGuideBot.jsx");
  const itawari = text.slice(text.indexOf("Number(signal) === 1"), text.indexOf("Number(signal) === 2"));
  assert.doesNotMatch(itawari, /ellipse cx="44"/);
  assert.match(itawari, /M86 39 Q90 44\.5 86 49/);
  assert.match(text, /M40 51 Q44 48 48 51/);
  assert.match(text, /M72 51 Q76 48 80 51/);
});

test("記録・分析ボタンは20px SVG鉛筆を使う", async () => {
  const text = await source("app/radar/page.js");
  assert.match(text, /className="h-\[20px\] w-\[20px\]"/);
  assert.doesNotMatch(text, /recorded \? "✓" : "✎"/);
});
