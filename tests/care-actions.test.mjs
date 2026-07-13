import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/radar_v1/careActionItems.js", import.meta.url), "utf8");
const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const { buildDisplayedCareItems, summarizeCareActions } = module;

test("Daily Care items preserve concrete food candidates instead of only a broad category", () => {
  const items = buildDisplayedCareItems({
    sourceMode: "tomorrow",
    food: {
      title: "湿気の日の食養生",
      action_cards: [
        { key: "drink", label: "飲むなら", body: "冷やしすぎずに", items: ["ほうじ茶", "温かい麦茶"] },
        { key: "caution", label: "控えたいこと", body: "冷たい物を重ねない", items: ["氷入り飲料"] },
      ],
    },
  });

  const drinks = items.filter((item) => item.kind === "food_drink_item");
  assert.deepEqual(drinks.map((item) => item.label), ["ほうじ茶", "温かい麦茶"]);
  assert.ok(drinks.every((item) => item.source_mode === "tomorrow"));
  assert.equal(items.find((item) => item.kind === "food_caution")?.label, "控えたいこと");
});

test("care action summary separates previous-night and same-day actions", () => {
  const summary = summarizeCareActions([
    { source_mode: "tomorrow", domain: "eat", item_key: "a", label: "ほうじ茶", timing_relation: "previous_night" },
    { source_mode: "today", domain: "loosen", item_key: "b", label: "内関のツボケア", timing_relation: "same_day_before" },
  ]);

  assert.equal(summary.count, 2);
  assert.equal(summary.previous_night_count, 1);
  assert.equal(summary.same_day_count, 1);
  assert.deepEqual(summary.domains, ["eat", "loosen"]);
});

test("care action IDs stay stable when display order changes", () => {
  const first = buildDisplayedCareItems({
    sourceMode: "today",
    tsuboPoints: [
      { code: "PC6", name_ja: "内関" },
      { code: "ST36", name_ja: "足三里" },
    ],
  });
  const reordered = buildDisplayedCareItems({
    sourceMode: "today",
    tsuboPoints: [
      { code: "ST36", name_ja: "足三里" },
      { code: "PC6", name_ja: "内関" },
    ],
  });

  const firstByCode = Object.fromEntries(first.map((item) => [item.meta.point_code, item.item_key]));
  const reorderedByCode = Object.fromEntries(reordered.map((item) => [item.meta.point_code, item.item_key]));
  assert.equal(firstByCode.PC6, reorderedByCode.PC6);
  assert.equal(firstByCode.ST36, reorderedByCode.ST36);
  assert.match(firstByCode.PC6, /^v3:loosen:point:/);
});



test("lifestyle care identity stays stable when explanatory copy changes", () => {
  const first = buildDisplayedCareItems({
    sourceMode: "today",
    lifestylePlan: {
      title: "湿気の日",
      lead: "今日はためこまないようにします",
      steps: ["首元を冷やさない"],
    },
  });
  const rewritten = buildDisplayedCareItems({
    sourceMode: "today",
    lifestylePlan: {
      title: "湿気の日の整え方",
      lead: "説明文だけを新しくしました",
      steps: ["首元を冷やさない"],
    },
  });

  assert.equal(first[0].item_key, rewritten[0].item_key);
  assert.match(first[0].item_key, /^v3:live:step:/);
});

test("legacy order-based keys normalize to the same canonical care identity", () => {
  const summary = summarizeCareActions([
    {
      source_mode: "tomorrow",
      domain: "loosen",
      item_key: "loosen:point:0:old",
      kind: "tsubo_point",
      label: "内関のツボケア",
      item_snapshot: { meta: { point_code: "PC6", point_name: "内関" } },
      timing_relation: "previous_night",
    },
    {
      source_mode: "today",
      domain: "loosen",
      item_key: "loosen:point:2:different-old",
      kind: "tsubo_point",
      label: "内関のツボケア",
      item_snapshot: { meta: { point_code: "PC6", point_name: "内関" } },
      timing_relation: "same_day_after",
    },
  ]);

  assert.equal(summary.actions[0].canonical_key, summary.actions[1].canonical_key);
});

test("legacy food and lifestyle snapshots match current displayed IDs", () => {
  const displayed = buildDisplayedCareItems({
    sourceMode: "today",
    lifestylePlan: { title: "湿気の日", lead: "ためこまない", steps: ["首元を冷やさない"] },
    food: {
      title: "湿気の日の食養生",
      action_cards: [
        { key: "drink", label: "飲むなら", body: "冷やしすぎずに", items: ["ほうじ茶"] },
        { key: "caution", label: "控えたいこと", body: "冷たい物を重ねない", items: ["氷入り飲料"] },
      ],
    },
  });

  const legacy = summarizeCareActions([
    {
      source_mode: "today",
      domain: "live",
      item_key: "live:step:0:old",
      kind: "lifestyle_step",
      label: "首元を冷やさない",
      detail: "ためこまない",
      item_snapshot: { kind: "lifestyle_step", detail: "ためこまない", meta: { plan_title: "湿気の日" } },
    },
    {
      source_mode: "today",
      domain: "eat",
      item_key: "eat:drink_item:0:old",
      kind: "food_drink_item",
      label: "ほうじ茶",
      detail: "冷やしすぎずに",
      item_snapshot: { kind: "food_drink_item", detail: "冷やしすぎずに", meta: { card_key: "drink" } },
    },
    {
      source_mode: "today",
      domain: "eat",
      item_key: "eat:caution:1:old",
      kind: "food_caution",
      label: "控えたいこと",
      detail: "冷たい物を重ねない",
      item_snapshot: { kind: "food_caution", detail: "冷たい物を重ねない", meta: { card_key: "caution", items: ["氷入り飲料"] } },
    },
  ]);

  const displayedKeys = new Set(displayed.map((item) => item.item_key));
  legacy.actions.forEach((item) => assert.ok(displayedKeys.has(item.canonical_key), item.label));
});

test("legacy duplicate rows with the same source and canonical care count once", () => {
  const summary = summarizeCareActions([
    {
      id: "old-1",
      target_date: "2026-07-10",
      source_mode: "today",
      domain: "loosen",
      item_key: "loosen:point:0:old",
      kind: "tsubo_point",
      label: "内関のツボケア",
      item_snapshot: { meta: { point_code: "PC6", point_name: "内関" } },
      timing_relation: "same_day_before",
      updated_at: "2026-07-10T08:00:00Z",
    },
    {
      id: "old-2",
      target_date: "2026-07-10",
      source_mode: "today",
      domain: "loosen",
      item_key: "loosen:point:2:old",
      kind: "tsubo_point",
      label: "内関のツボケア",
      item_snapshot: { meta: { point_code: "PC6", point_name: "内関" } },
      timing_relation: "same_day_after",
      updated_at: "2026-07-10T18:00:00Z",
    },
  ]);

  assert.equal(summary.count, 1);
  assert.equal(summary.actions[0].id, "old-2");
  assert.equal(summary.actions[0].timing_relation, "same_day_after");
});
