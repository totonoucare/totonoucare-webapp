import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("visible care navigation AI branding uses ミモル while legacy internal exports stay compatible", async () => {
  const [support, prompts, context, guide, radar] = await Promise.all([
    read("lib/records/liveSupport.js"),
    read("lib/records/aiPrompts.js"),
    read("lib/records/aiContext.js"),
    read("app/guide/GuideClient.jsx"),
    read("app/radar/page.js"),
  ]);
  const joined = [support, prompts, context, guide, radar].join("\n");
  assert.match(support, /EKIKEN_NAME = "ミモル"/);
  assert.match(support, /EKIKEN_DISPLAY_NAME = EKIKEN_NAME/);
  assert.match(prompts, /ケアナビAI ミモル/);
  assert.match(context, /name: "ミモル"/);
  assert.match(guide, /ケアナビAI ミモル/);
  assert.match(radar, /ケアナビAI ミモル/);
  assert.doesNotMatch(joined, /Ekiken|エキケン/);
});
