import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("DB constraint accepts the V2 trigger_dir contract", async () => {
  const migration = await source(
    "supabase/migrations/20260725_expand_radar_forecasts_trigger_dir_v778252.sql"
  );
  assert.match(migration, /drop constraint if exists radar_forecasts_trigger_dir_check/);
  assert.match(migration, /trigger_dir in \('up', 'down', 'change', 'none'\)/);
  assert.match(migration, /not valid/);
  assert.match(migration, /validate constraint radar_forecasts_trigger_dir_check/);
});

test("saveForecast persists the real V2 direction without a lossy code projection", async () => {
  const repo = await source("lib/radar_v1/radarRepo.js");
  const personalized = await source("lib/radar_v1/personalizeForecastV2.js");
  assert.match(repo, /trigger_dir: radarPlan\.forecast\.trigger_dir/);
  assert.doesNotMatch(repo, /projectForecastStorageCompat|forecast_storage_compat/);
  assert.match(personalized, /exact === "temp_shift".*trigger_dir: "change"/);
});

test("rollback refuses to discard already-saved change or none semantics", async () => {
  const rollback = await source(
    "supabase/migrations/20260725_rollback_radar_forecasts_trigger_dir_v778252.sql"
  );
  assert.match(rollback, /trigger_dir not in \('up', 'down'\)/);
  assert.match(rollback, /rollback stopped/);
  assert.match(rollback, /raise exception/);
});

test("post-migration check exposes the constraint values and temp_shift snapshots", async () => {
  const check = await source(
    "supabase/checks/20260725_check_radar_forecasts_trigger_dir_v778252.sql"
  );
  assert.match(check, /pg_get_constraintdef/);
  assert.match(check, /unsupported_rows/);
  assert.match(check, /forecast_snapshot,personal_main_trigger_exact/);
  assert.match(check, /trigger_dir = 'change'/);
});
