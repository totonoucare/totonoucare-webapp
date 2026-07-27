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

function weatherFactor(key) {
  return {
    key,
    exact: key,
    careKey: key,
    label: key === "heat" ? "高温" : "湿気",
  };
}

test("mood signs do not invent stomach symptoms or emotional humidity", () => {
  assert.deepEqual(
    radarUtils.getForecastBodySigns([weatherFactor("heat")], 1, "mood", "today"),
    [
      "熱が上にこもって、消耗やそわつきが出やすい",
      "気持ちの切り替えに時間がかかりやすい",
      "疲れているのに、焦りや落ち着かなさが先に出やすい",
    ],
  );

  const stable = radarUtils.getForecastBodySigns(
    [weatherFactor("heat")],
    0,
    "mood",
    "today",
  );
  assert.doesNotMatch(JSON.stringify(stable), /胃腸|気分に.*湿気/);
  assert.match(JSON.stringify(stable), /気持ちの切り替え/);
});

test("body sign cards contain observations, not unrelated care conditions", () => {
  const symptomKeys = [
    "fatigue",
    "sleep",
    "neck_shoulder",
    "low_back_pain",
    "swelling",
    "headache",
    "dizziness",
    "mood",
  ];

  for (const symptom of symptomKeys) {
    const signs = radarUtils.getForecastBodySigns(
      [weatherFactor("heat")],
      1,
      symptom,
      "today",
    );
    assert.equal(signs.length, 3);
    assert.doesNotMatch(JSON.stringify(signs), /胃腸が重い日は|冷たい・甘い・脂っこい|空腹・急な動き/);
  }

  const sleepSigns = radarUtils.getForecastBodySigns(
    [weatherFactor("heat")],
    1,
    "sleep",
    "today",
  );
  assert.doesNotMatch(JSON.stringify(sleepSigns), /夕方以降の光や画面/);
  assert.match(JSON.stringify(sleepSigns), /頭の働きが静まりにくい/);
});

test("damp mood copy describes felt heaviness without assuming digestion trouble", () => {
  const lead = radarUtils.getForecastModeLead(
    [weatherFactor("damp")],
    1,
    "today",
    "mood",
  );
  assert.match(lead, /体の重さに気分が引っぱられやすい/);
  assert.doesNotMatch(lead, /胃腸|気分に湿気/);
});

test("user-facing forecast and care copy excludes the audited opaque metaphors", async () => {
  const paths = [
    "../app/radar/utils.js",
    "../lib/radar_v1/careRules/lifestyleRules.js",
    "../lib/radar_v1/careRules/foodIngredientRules.js",
    "../lib/radar_v1/careRules/todayTsuboRules.js",
    "../lib/radar_v1/careRules/dailyCareV2.js",
    "../lib/radar_v1/explainPointSelection.js",
  ];
  const combined = (await Promise.all(paths.map(readSource))).join("\n");
  assert.doesNotMatch(
    combined,
    /気分にも湿気|胃腸の重さが、気分|水を含んだスポンジ|体の入口|閉店準備|回収され|水袋|下半身の渋滞|省エネ運転|体力のバッテリー|上半身の逃げ道|力みの出口|熱の出口|水はけのスイッチ|重いタブ/,
  );
});
