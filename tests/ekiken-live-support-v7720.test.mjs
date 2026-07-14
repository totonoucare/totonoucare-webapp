import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("EKIKEN is named consistently as the care navigation AI", async () => {
  const live = await source("components/records/LiveSupportPanel.jsx");
  const radar = await source("app/radar/page.js");
  const guide = await source("app/guide/GuideClient.jsx");
  assert.match(live, /EKIKEN_DISPLAY_NAME/);
  assert.match(radar, /ケアナビAI：EKIKEN/);
  assert.match(guide, /EKIKEN（エキケン）/);
});

test("bottom navigation exposes records and consultation as a primary destination", async () => {
  const nav = await source("components/nav/BottomTabs.js");
  assert.match(nav, /pathname\.startsWith\("\/records"\)/);
  assert.match(nav, /"記録・相談"/);
  assert.match(nav, /\/records\?tab=consult/);
});

test("consultation tab keeps live EKIKEN support and professional consultation separate", async () => {
  const records = await source("components/records/RecordsPageClient.jsx");
  assert.match(records, /LiveSupportPanel/);
  assert.match(records, /ExpertConsultPreview/);
  assert.match(records, /tab === "consult"/);
});

test("live support context uses today tomorrow three detailed days and fourteen day summary", async () => {
  const route = await source("app/api/records/live-chat/route.js");
  assert.match(route, /addDaysYmd\(today, -13\)/);
  assert.match(route, /addDaysYmd\(today, 1\)/);
  assert.match(route, /last_3_days/);
  assert.match(route, /last_14_days_summary/);
  assert.match(route, /limit: 16/);
});

test("live support and period review use separate thread kinds and prompt roles", async () => {
  const route = await source("app/api/records/live-chat/route.js");
  const prompts = await source("lib/records/aiPrompts.js");
  const migration = await source("supabase/migrations/20260714_add_ekiken_live_support_v7720.sql");
  assert.match(route, /LIVE_SUPPORT_THREAD_KIND/);
  assert.match(prompts, /LIVE_SUPPORT_INSTRUCTIONS/);
  assert.match(prompts, /期間振り返りチャットとは別の会話/);
  assert.match(migration, /thread_kind in \('period_review', 'live_support'\)/);
  assert.match(migration, /records_ai_threads_one_active_live_support_idx/);
});

test("live support preserves medical safety boundaries", async () => {
  const prompts = await source("lib/records/aiPrompts.js");
  const route = await source("app/api/records/live-chat/route.js");
  assert.match(prompts, /診断、治療、症状の原因特定/);
  assert.match(prompts, /薬・漢方・サプリ/);
  assert.match(prompts, /urgent/);
  assert.match(route, /isUrgentText\(message\)/);
  assert.match(route, /isProfessionalText\(message\)/);
});

test("home provides direct contextual shortcuts to EKIKEN consultation", async () => {
  const home = await source("app/HomeClient.jsx");
  assert.match(home, /function EkikenHomeCard/);
  assert.match(home, /今の調子を話してみる/);
  assert.match(home, /tab=consult/);
});


test("period review endpoints cannot read or delete live support threads", async () => {
  const chat = await source("app/api/records/chat/route.js");
  const threads = await source("app/api/records/threads/route.js");
  assert.match(chat, /thread_kind", "period_review"/);
  assert.match(chat, /thread_kind: "period_review"/);
  assert.match(threads, /thread_kind", "period_review"/);
});
