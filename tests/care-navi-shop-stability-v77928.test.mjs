import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { scorePartnerOffers } from "../lib/care-navi/partnerOffers.js";

const page = await readFile(new URL("../app/care-navi/page.js", import.meta.url), "utf8");
const route = await readFile(new URL("../app/api/care-navi/rakuten/route.js", import.meta.url), "utf8");

test("shop search waits for profile and URL context instead of searching the fatigue default", () => {
  assert.match(page, /if \(loading \|\| !urlContextReady\)/);
  assert.match(page, /setUrlContextReady\(true\)/);
  assert.match(page, /readRakutenResultCache\(rakutenSearchSignature\)/);
  assert.match(page, /RAKUTEN_CACHED_RESULT/);
});

test("Rakuten search is bounded, timed out, cached and retried only once by the client", () => {
  assert.match(route, /safeCategory === "eat" \? 4 : 3/);
  assert.match(route, /allSettledWithConcurrency\([\s\S]*?plans,[\s\S]*?2,/);
  assert.match(route, /RAKUTEN_FETCH_TIMEOUT_MS = 6500/);
  assert.match(route, /RAKUTEN_RESULT_CACHE_TTL_MS = 10 \* 60 \* 1000/);
  assert.match(route, /status: "unavailable"[\s\S]*?retryable: true/);
  assert.match(page, /attempt === 0/);
});

test("fallback products are disclosed and are not silently presented as a live personalized search", () => {
  assert.match(page, /登録済みの定番候補を表示しています/);
  assert.match(page, /自動で一度試し直しました/);
  assert.match(route, /status: "not_configured"/);
  assert.doesNotMatch(page, /未病レーダーセレクト|あなたへのおすすめ3アイテム/);
});

test("set completion and the single shelf both reuse slot meaning and body-area checks", () => {
  assert.match(page, /slots\.some\(\(slot\) => itemMatchesSlot\(item, slot\)\)/);
  assert.match(page, /itemMatchesSlot\(candidate, slot\)/);
  assert.match(page, /合わない商品を足して3点へ見せるより/);
});

test("high-commitment partner products are softened until the user selects the high price band", () => {
  const input = {
    category: "live",
    policyKeys: ["shizumeru", "yurumeru"],
    symptomKey: "neck_shoulder",
    symptomLabel: "首肩",
    profile: {},
    environmentMode: "shelf",
    triggerFactors: [{ key: "heat", label: "高温" }],
    seasonKey: "summer",
    seasonLabel: "夏",
    lifeKeys: ["screen", "tense"],
    limit: 12,
  };
  const all = scorePartnerOffers({ ...input, priceBand: "all" });
  const deep = scorePartnerOffers({ ...input, priceBand: "deep" });
  const allNell = all.find((item) => item.title === "NELLマットレス");
  const deepNell = deep.find((item) => item.title === "NELLマットレス");
  assert.ok(allNell && deepNell);
  assert.ok(allNell.score < deepNell.score);
  assert.equal(allNell.requestedPriceBand, "all");
  assert.equal(deepNell.requestedPriceBand, "deep");
});

test("point partner products do not cross from neck and hand care into digestion or low-back shelves", () => {
  const common = {
    category: "point",
    policyKeys: ["yurumeru", "meguraseru"],
    symptomLabel: "気になる不調",
    profile: {},
    environmentMode: "shelf",
    triggerFactors: [],
    seasonKey: "autumn",
    seasonLabel: "秋",
    lifeKeys: [],
    priceBand: "all",
    limit: 12,
  };
  assert.equal(scorePartnerOffers({ ...common, symptomKey: "digestion" }).length, 0);
  assert.equal(scorePartnerOffers({ ...common, symptomKey: "low_back_pain" }).length, 0);
  const neckItems = scorePartnerOffers({ ...common, symptomKey: "neck_shoulder" });
  assert.ok(neckItems.length > 0);
  assert.ok(neckItems.every((item) => item.productRole !== "hand_release"));
});

test("Rakuten titles receive a user-facing display title without changing the original title", () => {
  assert.match(route, /displayTitle: buildRakutenDisplayTitle\(title\)/);
  assert.match(page, /item\.displayTitle \|\| cleanProductDisplayTitle\(item\.title\)/);
  assert.match(route, /送料無料\|クーポン\|ポイント/);
});
