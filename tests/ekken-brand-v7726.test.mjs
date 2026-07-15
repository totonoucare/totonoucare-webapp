import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("visible care navigation AI branding uses Ekken", async () => {
  const [support, prompts, context, guide, radar] = await Promise.all([
    read("lib/records/liveSupport.js"),
    read("lib/records/aiPrompts.js"),
    read("lib/records/aiContext.js"),
    read("app/guide/GuideClient.jsx"),
    read("app/radar/page.js"),
  ]);
  const joined = [support, prompts, context, guide, radar].join("\n");
  assert.match(support, /Ekken/);
  assert.match(support, /エッケン/);
  assert.match(prompts, /ケアナビAI Ekken（エッケン）/);
  assert.match(context, /name: "Ekken"/);
  assert.match(guide, /Ekken（エッケン）/);
  assert.match(radar, /ケアナビAI Ekken/);
  assert.doesNotMatch(joined, /Ekiken|エキケン/);
});
