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
const homeSource = await readSource("../app/HomeClient.jsx");
const publicRouteSource = await readSource("../app/api/radar/v1/forecast/public/route.js");
const personalizeSource = await readSource("../lib/radar_v1/personalizeForecastV2.js");

function weatherFactor(key) {
  return {
    key,
    exact: key,
    careKey: key,
    label: key === "heat" ? "高温" : "湿気",
  };
}

test("body signs stay stable on reload and rotate only the weather-symptom observations on the next day", () => {
  const factors = [weatherFactor("heat")];
  const first = radarUtils.getForecastBodySigns(
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
  const nextDay = radarUtils.getForecastBodySigns(
    factors,
    1,
    "mood",
    "today",
    "2026-07-29",
  );

  assert.deepEqual(reload, first);
  assert.equal(first[0], "熱が上にこもって、消耗やそわつきが出やすい");
  assert.equal(nextDay[0], first[0]);
  assert.notDeepEqual(nextDay.slice(1), first.slice(1));
  assert.doesNotMatch(JSON.stringify([...first, ...nextDay]), /胃腸|気分に.*湿気/);
});

test("stable-mode observation points also rotate without changing the weather premise", () => {
  const factors = [weatherFactor("damp")];
  const first = radarUtils.getForecastBodySigns(
    factors,
    0,
    "fatigue",
    "tomorrow",
    "2026-07-28",
  );
  const nextDay = radarUtils.getForecastBodySigns(
    factors,
    0,
    "fatigue",
    "tomorrow",
    "2026-07-29",
  );

  assert.equal(first[0], "湿気を含んだ服を着たような重さが、少し出るかも");
  assert.equal(nextDay[0], first[0]);
  assert.notDeepEqual(nextDay.slice(1), first.slice(1));
});

test("public demo discloses its neutral reference constitution instead of claiming weather-only output", () => {
  assert.match(homeSource, /参考体質で見る体調予報デモ/);
  assert.match(homeSource, /反応の偏りと余力を中間に置いた仮の体質で試算しています/);
  assert.doesNotMatch(homeSource, /天気だけで見る体調予報デモ|天気要素だけで表示しています/);
  assert.match(homeSource, /今日は守りモード/);
  assert.doesNotMatch(homeSource, /今日は警戒の日/);
  assert.match(homeSource, /target_date: json\.target_date/);
  assert.match(homeSource, /buildGuestSignHints\(pf, pf\?\.target_date/);
  assert.match(publicRouteSource, /reference_profile: publicForecast\.reference_profile/);
  assert.match(personalizeSource, /kind: "neutral_reference"/);
  assert.match(personalizeSource, /reserve_level: "standard"/);
  assert.match(personalizeSource, /affinity_policy: "flat_midpoint"/);
});
