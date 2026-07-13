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
