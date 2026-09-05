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

const provenance = await importSource("lib/records/displayedCareProvenance.js");

test("旧sourceの強いusage_noteをAI入力時に安全な説明へ置き換える", () => {
  const saved = {
    source: "saved_at_record_from_radar_rules",
    exact_visible_items: [{ label: "白湯を飲む" }],
    usage_note: "体調予報画面で実際に表示したケア",
  };
  const normalized = provenance.normalizeDisplayedCareForAi(saved);

  assert.notEqual(normalized, saved);
  assert.equal(saved.usage_note, "体調予報画面で実際に表示したケア");
  assert.equal(normalized.source, saved.source);
  assert.deepEqual(normalized.exact_visible_items, saved.exact_visible_items);
  assert.match(normalized.usage_note, /初回記録時に同じルールで再構成した参考ケア/);
  assert.match(normalized.usage_note, /本人が当時閲覧・実行した事実とは扱わない/);
});

test("現行sourceと由来不明sourceも閲覧・実行の事実へ変換しない", () => {
  const current = provenance.normalizeDisplayedCareForAi({
    source: "reconstructed_from_complete_risk_context",
  });
  assert.match(current.usage_note, /現在の体調予報画面と同じ計算/);
  assert.match(current.usage_note, /本人が閲覧・実行した事実とは扱わず/);

  const unknown = provenance.normalizeDisplayedCareForAi({ source: "future_unknown_source" });
  assert.match(unknown.usage_note, /由来を確認できない参考ケア/);
  assert.match(unknown.usage_note, /本人が画面で閲覧・実行した事実とは扱わない/);
});

test("ライブ相談専用promptにもsource別の出自ルールが入る", async () => {
  const promptModule = await importSource("lib/records/aiPrompts.js");
  const live = String(promptModule.LIVE_SUPPORT_INSTRUCTIONS);

  assert.match(live, /reconstructed_from_complete_risk_context/);
  assert.match(live, /reconstructed_at_first_record_save／旧saved_at_record_from_radar_rules/);
  assert.match(live, /どちらも閲覧・実行事実ではない。欠損・不明は推測しない/);
  assert.doesNotMatch(live, /displayed_careはアプリが提示した案/);
});

test("共通知識・全AI経路・スナップショットがv49の出自契約を使う", async () => {
  const [context, snapshot, analysisRoute, chatRoute, liveRoute] = await Promise.all([
    source("lib/records/aiContext.js"),
    source("lib/radar_v1/displayedCareSnapshot.js"),
    source("app/api/records/analysis/route.js"),
    source("app/api/records/chat/route.js"),
    source("app/api/records/live-chat/route.js"),
  ]);

  assert.match(context, /records_product_context_v15_care_provenance_complete_2026-09-05/);
  assert.match(context, /normalizeDisplayedCareForAi\(saved\)/);
  assert.match(context, /sourceが閲覧事実を保証しない基礎ケア案/);
  assert.doesNotMatch(context, /表示済みケアは土台/);
  assert.doesNotMatch(context, /アプリが表示したケアとミモルの応用案/);
  assert.match(snapshot, /displayedCareUsageNote\(source\)/);
  assert.match(analysisRoute, /records_analysis_v19_care_provenance_complete_2026-09-05/);
  assert.match(chatRoute, /records_chat_v20_care_provenance_complete_2026-09-05/);
  assert.match(liveRoute, /records_live_support_v20_care_provenance_complete_2026-09-05/);
});
