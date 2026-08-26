import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

async function importRadarUtils() {
  const pressureSource = await readFile(path.join(root, "lib/radar_v1/pressureResponse.js"), "utf8");
  let source = await readFile(path.join(root, "app/radar/utils.js"), "utf8");
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
    .replace(
      'import { buildDailyCareTheme } from "@/lib/radar_v1/careRules/dailyCareV2";',
      "const buildDailyCareTheme = () => ({});",
    )
    .replace(
      /import \{[\s\S]*?\} from "@\/lib\/radar_v1\/bodySignInsights";/,
      "const buildGroundedBodySignDetails = () => []; const selectDistinctBodySigns = (items) => items.filter(Boolean);",
    )
    .replace(/import \{[\s\S]*?\} from "@\/lib\/radar_v1\/pressureResponse";/, "");

  const prepared = `${pressureSource.replaceAll("export ", "")}\n${source}`;
  return import(`data:text/javascript;base64,${Buffer.from(prepared).toString("base64")}`);
}

const radarUtils = await importRadarUtils();

function dampFactor() {
  return {
    key: "damp",
    careKey: "damp",
    label: "湿気",
    exact: "humidity",
  };
}

function weatherGroups({ damp = 0.72, heat = 0.42, pressure = 0.38 } = {}) {
  return [
    { group: "moisture", detailLabel: "湿気", load: damp },
    { group: "temperature", detailLabel: "高温", load: heat },
    { group: "pressure", detailLabel: "気圧変動", load: pressure },
  ];
}

test("予報カードのタイトルは体調予報へ統一する", () => {
  assert.equal(radarUtils.buildScoreCardTitle("today", "2026-08-26"), "今日の体調予報");
  assert.equal(radarUtils.buildScoreCardTitle("tomorrow", "2026-08-27"), "明日の体調予報");
  assert.doesNotMatch(radarUtils.buildScoreCardTitle("today", "2026-08-26"), /ゆらぎ/);
});

test("明日の見立ては数値差と天気要因の差から全文を組み直す", () => {
  const lower = radarUtils.getForecastModeLead(
    [dampFactor()],
    1,
    "tomorrow",
    "fatigue",
    {
      currentScore: 4.4,
      todayScore: 6.1,
      currentWeatherGroups: weatherGroups({ pressure: 0.24 }),
      todayWeatherGroups: weatherGroups({ pressure: 0.45 }),
    },
  );
  const higher = radarUtils.getForecastModeLead(
    [dampFactor()],
    1,
    "tomorrow",
    "fatigue",
    {
      currentScore: 7.1,
      todayScore: 6.1,
      currentWeatherGroups: weatherGroups({ heat: 0.58 }),
      todayWeatherGroups: weatherGroups({ heat: 0.4 }),
    },
  );
  const similar = radarUtils.getForecastModeLead(
    [dampFactor()],
    1,
    "tomorrow",
    "fatigue",
    {
      currentScore: 6.4,
      todayScore: 6.1,
      currentWeatherGroups: weatherGroups(),
      todayWeatherGroups: weatherGroups(),
    },
  );

  assert.match(lower, /^明日は今日より警戒度が下がる見込み。/);
  assert.match(lower, /湿気の負担は続きますが、気圧変動は弱まる見込みです。/);
  assert.match(lower, /今夜は/);
  assert.match(higher, /^明日は今日より警戒度が高まる見込み。/);
  assert.match(higher, /高温は今日より強まる見込みです。/);
  assert.match(similar, /^明日の警戒度は今日とほぼ同じ。/);
  assert.match(similar, /湿気の負担は明日も続く見込みです。/);
  assert.doesNotMatch(similar, /出やすい日|なりやすい日/);
  assert.doesNotMatch(lower, /明日は明日は/);
});

test("今日の見立てと比較データ欠損時は従来どおり成立する", async () => {
  const today = radarUtils.getForecastModeLead(
    [dampFactor()],
    1,
    "today",
    "fatigue",
    { currentScore: 4.4, todayScore: 6.1 },
  );
  const tomorrowWithoutComparison = radarUtils.getForecastModeLead(
    [dampFactor()],
    1,
    "tomorrow",
    "fatigue",
  );
  const page = await readFile(path.join(root, "app/radar/page.js"), "utf8");
  const gauge = await readFile(path.join(root, "app/radar/ForecastGauge.jsx"), "utf8");

  assert.match(today, /^今日は/);
  assert.match(tomorrowWithoutComparison, /^明日は/);
  assert.match(page, /todayComparisonBundle/);
  assert.match(page, /currentScore: currentForecastScore/);
  assert.match(page, /todayScore: todayComparisonScore/);
  assert.match(page, /currentWeatherGroups: currentWeatherLoadGroups/);
  assert.match(page, /todayWeatherGroups: todayComparisonWeatherLoadGroups/);
  assert.doesNotMatch(page, /体調ゆらぎ予報/);
  assert.match(gauge, /<tspan fontSize="34">\{animatedIndex\}<\/tspan>/);
  assert.match(gauge, /<tspan dx="5" fontSize="18" fontWeight="900">\/ 100<\/tspan>/);
});
