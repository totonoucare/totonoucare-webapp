import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");

async function source(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("safeLocalPath rejects external and malformed redirects", async () => {
  const moduleUrl = pathToFileURL(path.join(root, "lib/safeReturnPath.js")).href;
  const { safeLocalPath } = await import(moduleUrl);

  assert.equal(safeLocalPath("/radar?tab=tomorrow#care"), "/radar?tab=tomorrow#care");
  assert.equal(safeLocalPath("//evil.example/path", "/radar"), "/radar");
  assert.equal(safeLocalPath("https://evil.example", "/radar"), "/radar");
  assert.equal(safeLocalPath("/\\evil.example", "/radar"), "/radar");
  assert.equal(safeLocalPath("/radar\nLocation: https://evil.example", "/radar"), "/radar");
});

test("diagnosis answers are required, allow-listed, and sanitized", async () => {
  const questionsUrl = pathToFileURL(path.join(root, "lib/diagnosis/v2/questions.js")).href;
  const validatorUrl = pathToFileURL(path.join(root, "lib/diagnosis/v2/validateAnswers.js")).href;
  const { getQuestions } = await import(questionsUrl);
  const { validateDiagnosisAnswers } = await import(validatorUrl);

  const answers = {};
  for (let pass = 0; pass < 4; pass += 1) {
    for (const question of getQuestions(answers)) {
      if (answers[question.key] !== undefined) continue;
      const first = question.options[0].value;
      answers[question.key] = question.type === "multi" ? [first] : first;
    }
  }
  answers.untrusted_extra = { nested: ["not", "scored"] };

  const valid = validateDiagnosisAnswers(answers);
  assert.equal(valid.ok, true);
  assert.equal(valid.answers.symptom_focus, "fatigue");
  assert.equal(Object.hasOwn(valid.answers, "untrusted_extra"), false);

  assert.equal(validateDiagnosisAnswers({}).ok, false);
  assert.equal(
    validateDiagnosisAnswers({ ...answers, symptom_focus: "not_a_real_symptom" }).ok,
    false
  );
});

test("database migrations align digestion and install distributed rate limiting", async () => {
  const symptomMigration = await source(
    "supabase/migrations/20260818_align_symptom_focus_constraints_v77929.sql"
  );
  const rateMigration = await source(
    "supabase/migrations/20260818_add_public_api_rate_limits_v77929.sql"
  );

  assert.match(symptomMigration, /constitution_events_symptom_focus_check/);
  assert.match(symptomMigration, /'digestion'::text/);
  assert.match(rateMigration, /create table if not exists public\.api_rate_limits/i);
  assert.match(rateMigration, /security definer/i);
  assert.match(rateMigration, /grant execute[\s\S]+service_role/i);
});

test("public endpoints use the shared limiter and diagnosis validates before scoring", async () => {
  const routes = [
    "app/api/diagnosis/v2/submit/route.js",
    "app/api/radar/v1/forecast/public/route.js",
    "app/api/care-navi/rakuten/route.js",
    "app/api/care-navi/click/route.js",
  ];

  for (const route of routes) {
    assert.match(await source(route), /enforcePublicApiRateLimit/);
  }

  const diagnosis = await source(routes[0]);
  assert.ok(
    diagnosis.indexOf("validateDiagnosisAnswers") < diagnosis.indexOf("scoreDiagnosis(answers)")
  );
});

test("forecast and notification cron jobs expose stable cursor pagination", async () => {
  const files = [
    "lib/radar_v1/radarRepo.js",
    "lib/radar_v1/runRadarSnapshotCron.js",
    "lib/push/pushRepo.js",
    "lib/push/runRadarNotificationCron.js",
  ];
  for (const file of files) {
    const text = await source(file);
    assert.match(text, /cursor/);
    assert.match(text, /nextCursor|next_cursor/);
  }

  assert.match(await source(".github/workflows/radar-forecast-snapshots.yml"), /has_more/);
  assert.match(await source(".github/workflows/radar-notifications.yml"), /has_more/);
});
