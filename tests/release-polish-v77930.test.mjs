import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

async function importSource(relativePath) {
  const text = await source(relativePath);
  return import(`data:text/javascript;base64,${Buffer.from(text).toString("base64")}`);
}

test("体質チェックの説明は約5分の共通コピーへ統一する", async () => {
  const copy = await importSource("lib/diagnosis/v2/uiCopy.js");
  const home = await source("app/HomeClient.jsx");
  const check = await source("app/check/page.js");

  assert.equal(copy.CONSTITUTION_CHECK_DURATION_LABEL, "約5分");
  assert.match(copy.CONSTITUTION_CHECK_INTRO, /約5分の質問から/);
  assert.match(copy.CONSTITUTION_CHECK_INTRO, /暮らす・食べる・ほぐす/);
  assert.doesNotMatch(`${home}\n${check}`, /4〜6分|全15〜19問|基本14問/);
  assert.match(check, /途中保存OK/);
});

test("予報とショップは同じ環境調整Action ID許可リストを使う", async () => {
  const context = await importSource("lib/care-navi/lifestyleShopContext.js");
  const page = await source("app/care-navi/page.js");
  const route = await source("app/api/care-navi/rakuten/route.js");

  assert.equal(context.normalizeLifestyleShopActionKey("tool-work-height"), "tool-work-height");
  assert.equal(context.normalizeLifestyleShopActionKey("tension-screen-head-up"), "");
  assert.equal(context.normalizeLifestyleShopActionKey("body-anything"), "");
  assert.match(page, /normalizeLifestyleShopActionKey\(nextLifestyleActionKey\)/);
  assert.match(route, /normalizeLifestyleShopActionKey\(lifestyleActionKey\)/);
  for (const actionKey of context.LIFESTYLE_SHOP_ACTION_KEYS) {
    assert.match(route, new RegExp(`"${actionKey}"`), actionKey);
  }
});

test("楽天候補は一語一致を通さず、代替商品を残した複数語一致にする", async () => {
  const intent = await importSource("lib/care-navi/rakutenSearchIntent.js");
  const route = await source("app/api/care-navi/rakuten/route.js");

  assert.equal(
    intent.matchesRakutenKeywordIntent("高さ調整できるタブレット用スタンド", "スマホ タブレット 書見台 スタンド 高さ調整"),
    true
  );
  assert.equal(
    intent.matchesRakutenKeywordIntent("人気のスマホケース", "スマホ タブレット 書見台 スタンド 高さ調整"),
    false
  );
  assert.equal(intent.matchesRakutenKeywordIntent("睡眠用の遮光アイマスク", "アイマスク 耳栓 睡眠"), true);
  assert.equal(intent.matchesRakutenKeywordIntent("睡眠サプリ", "アイマスク 耳栓 睡眠"), false);
  assert.equal(intent.matchesRakutenKeywordIntent("カフェインレスの黒豆茶", "黒豆茶 ノンカフェイン"), true);
  assert.match(route, /url\.searchParams\.set\("field", "1"\)/);
  assert.match(route, /matchesPlanKeywordIntent/);
});

test("ショップ検索は表示対象だけを遅延実行し、429を即時再試行しない", async () => {
  const page = await source("app/care-navi/page.js");

  assert.match(page, /RAKUTEN_SEARCH_DEBOUNCE_MS = 600/);
  assert.match(page, /viewMode === "single" \? \[singleCategory\] : CATEGORY_ORDER/);
  assert.match(page, /mapWithConcurrency\([\s\S]*?rakutenCategoryKeys,[\s\S]*?2,/);
  assert.match(page, /const retryable = !rateLimited/);
  assert.match(page, /RAKUTEN_RATE_LIMITED/);
  assert.doesNotMatch(page, /Promise\.all\(\s*CATEGORY_ORDER\.map\(\(categoryKey\) => searchCategory/);
  assert.match(page, /mibyo-care-navi-rakuten-cache-v3/);
  assert.match(page, /RAKUTEN_CACHE_ENTRY_LIMIT = 8/);
});

test("出やすいサインは意味が重なる時だけ1〜2件へまとめる", async () => {
  const signs = await importSource("lib/radar_v1/bodySignInsights.js");
  const radar = await source("app/radar/utils.js");
  const radarPage = await source("app/radar/page.js");

  const similar = signs.selectDistinctBodySigns([
    "湿気の日は、胃腸まわりが重く感じやすい",
    "余力を温存しようとして、胃腸のもたれを長く残しやすい",
    "湿気が多い日は、全身の重だるさが出やすい",
  ]);
  assert.equal(similar.length, 1);

  const distinct = signs.selectDistinctBodySigns([
    "乾燥する日は、胃腸のリズムが乱れやすい",
    "胃腸まわりに重さを抱え、食後のもたれが残りやすい",
    "目・のど・肌の乾きが、疲れやこわばりに変わりやすい",
  ]);
  assert.equal(distinct.length, 3);

  const grounded = signs.buildGroundedBodySignDetails({
    weatherKey: "damp",
    symptomFocus: "digestion",
    signal: 1,
    targetDate: "2026-08-21",
    constitutionContext: {
      constitution_context: {
        core_code: "brake_batt_small",
        sub_labels: ["fluid_damp"],
        manifestation: { reaction_direction: "brake" },
      },
    },
  });
  const selected = signs.selectDistinctBodySigns([
    ...grounded,
    "湿気が多い日は、全身の重だるさが出やすい",
  ]);
  assert.ok(selected.length >= 1 && selected.length <= 2);
  assert.doesNotMatch(radar, /湿気を含んだ服を着たような重さ/);
  assert.match(radar, /selectDistinctBodySigns\(\[\.\.\.groundedDetails, weatherSign\], 3\)/);
  assert.match(radarPage, /const showBodySignNumbers = bodySigns\.length > 1/);
  assert.match(radarPage, /\{showBodySignNumbers \? \(/);
});
