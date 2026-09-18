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
  assert.match(radarPageSource, /carePlan\?\.care_theme\?\.selection_reason/);

  assert.doesNotMatch(radarPageSource, />体質の土台</);
  assert.doesNotMatch(radarPageSource, />この日の現れ方</);
  assert.doesNotMatch(radarPageSource, /careFoundationText/);
  assert.doesNotMatch(radarPageSource, /careManifestationText/);
});

test("見立ては予報に置き、ケアタブは具体案から始める", () => {
  assert.match(radarPageSource, /selectedIsToday \? "今日の見立て" : "明日の見立て"/);
  assert.match(radarPageSource, /\{forecastModeLead\}/);
  assert.doesNotMatch(radarPageSource, /bodySigns\.map|出やすいサイン/);
  assert.doesNotMatch(radarPageSource, /lifestylePlan\.forecast_insight|lifestyleContextChips|foodContextChips/);
  assert.match(radarPageSource, /itemDetail\.focus_ingredients/);
});
