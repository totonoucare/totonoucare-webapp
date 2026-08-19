import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const radarPageSource = await readFile(
  new URL("../app/radar/page.js", import.meta.url),
  "utf8"
);

test("ケア方針欄は方針ピルと一文だけを表示する", () => {
  assert.match(radarPageSource, /今日のケア方針/);
  assert.match(radarPageSource, /明日のケア方針/);
  assert.match(radarPageSource, /safeArray\(carePolicies\?\.policies\)/);
  assert.match(radarPageSource, /carePolicies\?\.summary \|\| careStrategyLead/);

  assert.doesNotMatch(radarPageSource, />体質の土台</);
  assert.doesNotMatch(radarPageSource, />この日の現れ方</);
  assert.doesNotMatch(radarPageSource, /careFoundationText/);
  assert.doesNotMatch(radarPageSource, /careManifestationText/);
});

test("体調の現れ方は出やすいサインと各ケアタブで具体化する", () => {
  assert.match(radarPageSource, /bodySigns\.map/);
  assert.match(
    radarPageSource,
    /lifestylePlan\.forecast_insight \|\| lifestylePlan\.lead/
  );
  assert.match(radarPageSource, /food\.recommendation \|\| food\.focus/);
});
