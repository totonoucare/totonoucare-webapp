import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("商品カードと楽天の検索ページ導線を分ける", async () => {
  const page = await source("app/care-navi/page.js");
  const partnerOffers = await source("lib/care-navi/partnerOffers.js");
  const singleShelf = page.slice(
    page.indexOf("function buildSingleShelfItems"),
    page.indexOf("function completeCareSetWithMatchingItems")
  );

  assert.match(page, /function SearchDiscoveryLink/);
  assert.match(page, /個別商品を取得できませんでした/);
  assert.match(page, /楽天市場で候補を検索する/);
  assert.doesNotMatch(singleShelf, /source:\s*["']fallback["']/);
  assert.doesNotMatch(partnerOffers, /summer-cool-pillow|夏の夜も涼しく眠れる枕|coreda\.jp/);
});

test("食べる検索は飲み物一辺倒を避ける", async () => {
  const route = await source("app/api/care-navi/rakuten/route.js");
  const diversityRows = route.slice(
    route.indexOf("const EAT_POLICY_DIVERSITY_ROWS"),
    route.indexOf("const FOOD_COMMERCE_QUERY_ROWS")
  );

  assert.match(diversityRows, /nutrition_support/);
  assert.match(diversityRows, /ingredient/);
  assert.match(diversityRows, /supplement/);
  assert.match(diversityRows, /yakuzenIngredient/);
  assert.match(route, /countPlansByIntent\(plans, "warm_drink"\) >= 1/);
  assert.match(route, /function diversifyEatItems/);
  assert.match(route, /初期表示では飲み物を最大2件/);
  assert.match(route, /yakuzenIngredient: 3/);
  assert.match(route, /supplement: 2/);
});

test("ショップの商品説明と検索エラー詳細は初期表示を短くする", async () => {
  const page = await source("app/care-navi/page.js");

  assert.match(page, /line-clamp-2[\s\S]*?item\.reason/);
  assert.match(page, /line-clamp-2[\s\S]*?item\.useGuide/);
  assert.match(page, /<summary className="cursor-pointer font-black">状況の詳細<\/summary>/);
});

test("AI・相談は要点を先に出し、同意と安全情報を必要時に開ける", async () => {
  const analysis = await source("components/records/AiAnalysisPanel.jsx");
  const live = await source("components/records/LiveSupportPanel.jsx");
  const expert = await source("components/records/ExpertConsultPreview.jsx");
  const paywall = await source("components/billing/SubscriptionPaywall.jsx");

  assert.match(analysis, /<details[\s\S]*?AIへのデータ共有：同意済み/);
  assert.match(analysis, /<details[\s\S]*?AI相談の範囲/);
  assert.match(live, /<details[\s\S]*?AIへのデータ共有：同意済み/);
  assert.match(live, /<details[\s\S]*?AI相談の範囲/);
  assert.match(expert, /<details[\s\S]*?相談でできること/);
  assert.match(expert, /<details[\s\S]*?利用上の注意/);
  assert.match(paywall, /<details[\s\S]*?利用できる内容/);

  // 畳んでも、同意範囲と医療安全の正本は削除しない。
  assert.match(live, /記録メモや会話欄に自分で入力した内容/);
  assert.match(expert, /医療機関での診断・治療に代わるものではありません/);
});
