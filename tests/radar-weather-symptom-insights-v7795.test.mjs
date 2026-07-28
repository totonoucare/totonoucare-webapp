import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

async function importText(source) {
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

async function importRadarUtils() {
  const pressureSource = await readSource("../lib/radar_v1/pressureResponse.js");
  let source = await readSource("../app/radar/utils.js");
  source = source
    .replace(
      'import { flattenRadarLocationPresets } from "@/lib/radar_v1/locationPresets";',
      "const flattenRadarLocationPresets = () => [];",
    )
    .replace(
      'import { getLifestylePlan as getLifestylePlanFromRules } from "@/lib/radar_v1/careRules/lifestyleRules";',
      "const getLifestylePlanFromRules = () => ({});",
    )
    .replace(
      'import { buildTodayCarePlanCore } from "@/lib/radar_v1/careRules/todayCarePlan";',
      "const buildTodayCarePlanCore = () => null;",
    )
    .replace(/import \{[\s\S]*?\} from "@\/lib\/radar_v1\/pressureResponse";/, "");
  return importText(`${pressureSource.replaceAll("export ", "")}\n${source}`);
}

const radarUtils = await importRadarUtils();

const WEATHER_MARKERS = {
  damp: /湿気|湿った|水分/,
  pressure_down: /気圧/,
  pressure_up: /気圧/,
  temp_shift: /寒暖差|暖かさと冷え|気温/,
  cold: /冷え|体温/,
  heat: /暑さ|熱/,
  dry: /乾いた|乾き|うるおい/,
};

const SYMPTOMS = [
  "fatigue",
  "sleep",
  "digestion",
  "neck_shoulder",
  "low_back_pain",
  "swelling",
  "headache",
  "dizziness",
  "mood",
];

function weatherFactor(key) {
  return {
    key,
    exact: key,
    careKey: key,
    physical_exact: key,
    response_direction: key.startsWith("pressure_") ? "balanced" : null,
  };
}

test("second and third signs are grounded in both the main weather stress and selected symptom", () => {
  for (const [weatherKey, marker] of Object.entries(WEATHER_MARKERS)) {
    for (const symptom of SYMPTOMS) {
      const signs = radarUtils.getForecastBodySigns(
        [weatherFactor(weatherKey)],
        1,
        symptom,
        "today",
        "2026-07-28",
      );

      assert.equal(signs.length, 3, `${weatherKey} × ${symptom}`);
      assert.match(signs[1], marker, `${weatherKey} × ${symptom} second sign`);
      assert.match(signs[2], marker, `${weatherKey} × ${symptom} third sign`);
    }
  }
});

test("weather-symptom insights stay stable on reload and move to a new observation the next day", () => {
  const factors = [weatherFactor("heat")];
  const today = radarUtils.getForecastBodySigns(
    factors,
    1,
    "mood",
    "today",
    "2026-07-28",
  );
  const reload = radarUtils.getForecastBodySigns(
    factors,
    1,
    "mood",
    "today",
    "2026-07-28",
  );
  const tomorrow = radarUtils.getForecastBodySigns(
    factors,
    1,
    "mood",
    "today",
    "2026-07-29",
  );

  assert.deepEqual(reload, today);
  assert.equal(tomorrow[0], today[0]);
  assert.notDeepEqual(tomorrow.slice(1), today.slice(1));
  assert.match(today[1], /暑さ|熱/);
  assert.match(today[1], /気分|気持ち|刺激|焦り|考え|疲れ/);
});

test("stable forecasts soften the intersection without losing the weather connection", () => {
  const signs = radarUtils.getForecastBodySigns(
    [weatherFactor("damp")],
    0,
    "digestion",
    "tomorrow",
    "2026-07-28",
  );

  assert.match(signs[1], /湿気|湿った|水分/);
  assert.match(signs[2], /湿気|湿った|水分/);
  assert.match(`${signs[1]} ${signs[2]}`, /かも/);
});

test("mood insights never borrow digestion as an unselected condition", () => {
  for (const weatherKey of Object.keys(WEATHER_MARKERS)) {
    const signs = radarUtils.getForecastBodySigns(
      [weatherFactor(weatherKey)],
      1,
      "mood",
      "today",
      "2026-07-28",
    );
    assert.doesNotMatch(signs.slice(1).join(" "), /胃腸|食後|お腹/);
  }
});

test("neutral pressure rewriting never creates the duplicated phrase 変わる変化", () => {
  for (const weatherKey of ["pressure_down", "pressure_up"]) {
    const signs = radarUtils.getForecastBodySigns(
      [weatherFactor(weatherKey)],
      1,
      "headache",
      "today",
      "2026-07-29",
    );
    assert.doesNotMatch(signs.join(" "), /変わる変化/);
    assert.match(signs.slice(1).join(" "), /気圧/);
  }
});
