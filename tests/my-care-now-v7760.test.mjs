import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/care-navi/page.js", import.meta.url), "utf8");
const radar = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const nav = await readFile(new URL("../components/nav/BottomTabs.js", import.meta.url), "utf8");

test("bottom navigation names the feature Shop", () => {
  assert.match(nav, /item\("care", "ショップ"/);
  assert.doesNotMatch(nav, /item\("care", "MYケア"/);
  assert.ok(nav.indexOf('item("records"') < nav.indexOf('item("care"'));
});

test("purchased items move to 対策ケア for actual use recording", () => {
  assert.match(page, /購入した商品は「購入済み」にすると、体調予報の対策ケア/);
  assert.match(radar, /PurchasedCareItemsPanel/);
  assert.match(radar, /owned_care_item/);
  assert.match(radar, /今日取り入れた/);
  assert.match(radar, /今日使った/);
  assert.match(radar, /\/api\/radar\/care-actions/);
});

test("care sets keep category variety without forcing an unrelated third item", () => {
  assert.match(page, /completeCareSetWithMatchingItems/);
  assert.match(page, /itemMatchesSlot\(candidate, slot\)/);
  assert.match(page, /safeArray\(card\?\.items\)\.length >= 2/);
  assert.match(page, /おすすめの組み合わせ・\{items\.length\}点/);
  assert.doesNotMatch(page, /completeThreeCategorySet|card\?\.items\?\.length === 3|あなたへのおすすめ3アイテム/);
  assert.doesNotMatch(page, /まず1つなら|一緒にそろえるなら/);
});
