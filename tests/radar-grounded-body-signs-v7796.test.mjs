import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

async function importText(source) {
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const bodySignSource = await readSource("../lib/radar_v1/bodySignInsights.js");
const bodySigns = await importText(bodySignSource);
const radarPageSource = await readSource("../app/radar/page.js");
const radarUtilsSource = await readSource("../app/radar/utils.js");

const WEATHER_MARKERS = {
  damp: /湿気/,
  pressure_down: /気圧/,
  pressure_up: /気圧/,
  temp_shift: /寒暖差/,
  cold: /低温/,
  heat: /高温/,
  dry: /乾燥/,
};

const SYMPTOM_MARKERS = {
  fatigue: /疲れ|だるさ|消耗|眠気|集中|動き出し|余力/,
  sleep: /眠|寝|休|目覚め|夜/,
  digestion: /胃腸|お腹|食後|食べ|食事/,
  neck_shoulder: /首肩|肩|首元/,
  low_back_pain: /腰|下半身|立ち上がり/,
  swelling: /むくみ|顔|脚|足元|足首/,
  headache: /頭|のぼせ|ぼんやり/,
  dizziness: /ふわつき|揺れ|立ち上が|足取り|動き出し|体より先に頭/,
  mood: /気分|気持ち|焦り|落ち着|刺激|集中|考え|始める/,
};

const SYMPTOMS = Object.keys(SYMPTOM_MARKERS);
const CORE_CODES = [
  "accel_batt_small",
  "accel_batt_standard",
  "accel_batt_large",
  "brake_batt_small",
  "brake_batt_standard",
  "brake_batt_large",
];

function context(coreCode, subLabels = []) {
  return {
    constitution_context: {
      core_code: coreCode,
      sub_labels: subLabels,
      manifestation: {
        reaction_direction: coreCode.startsWith("accel") ? "accel" : "brake",
      },
    },
  };
}

test("wolf × damp × neck/shoulder produces short grounded signs", () => {
  const details = bodySigns.buildGroundedBodySignDetails({
    weatherKey: "damp",
    symptomFocus: "neck_shoulder",
    signal: 1,
    targetDate: "2026-07-29",
    constitutionContext: context("accel_batt_standard"),
  });

  assert.deepEqual(details, [
    "湿気の日は、肩まわりがすっきりしにくい",
    "動けてしまうぶん、首肩の力みを後から自覚しやすい",
  ]);
  assert.doesNotMatch(details.join(" "), /画面から顔|目や肩甲骨|首そのものより|肩を回した時より/);
});

test("every weather × symptom pair keeps both selected grounds without crossing domains", () => {
  for (const [weatherKey, weatherMarker] of Object.entries(WEATHER_MARKERS)) {
    for (const symptomFocus of SYMPTOMS) {
      const [weatherSymptom, constitutionSymptom] = bodySigns.buildGroundedBodySignDetails({
        weatherKey,
        symptomFocus,
        signal: 1,
        targetDate: "2026-07-30",
        constitutionContext: context("accel_batt_standard"),
      });

      assert.match(weatherSymptom, weatherMarker, `${weatherKey} × ${symptomFocus}: weather`);
      assert.match(weatherSymptom, SYMPTOM_MARKERS[symptomFocus], `${weatherKey} × ${symptomFocus}: symptom`);
      assert.match(constitutionSymptom, SYMPTOM_MARKERS[symptomFocus], `${weatherKey} × ${symptomFocus}: constitution`);
      assert.ok(weatherSymptom.length <= 34, `${weatherKey} × ${symptomFocus}: weather copy too long`);
      assert.ok(constitutionSymptom.length <= 38, `${weatherKey} × ${symptomFocus}: constitution copy too long`);
    }
  }
});

test("all six core types produce an axis/reserve-specific sign for every symptom", () => {
  for (const coreCode of CORE_CODES) {
    for (const symptomFocus of SYMPTOMS) {
      const details = bodySigns.buildGroundedBodySignDetails({
        weatherKey: "damp",
        symptomFocus,
        signal: 1,
        targetDate: "2026-07-29",
        constitutionContext: context(coreCode),
      });
      assert.equal(details.length, 2, `${coreCode} × ${symptomFocus}`);
      assert.match(details[1], SYMPTOM_MARKERS[symptomFocus], `${coreCode} × ${symptomFocus}: symptom`);
      if (coreCode.startsWith("accel")) {
        assert.match(details[1], /動け|動き|忙し|区切り|頑張|進め|休む前/, `${coreCode}: accel/reserve`);
      } else {
        assert.match(details[1], /守り|余力|動きを小さく|切り替え|ペース|リズム|崩れにくい|重さ|ゆっくり/, `${coreCode}: brake/reserve`);
      }
    }
  }
});

test("an explicit response direction overrides the core axis, including balanced", () => {
  const accelContextWithBrakeResponse = context("accel_batt_standard");
  accelContextWithBrakeResponse.constitution_context.manifestation.reaction_direction = "brake";
  const brakeSign = bodySigns.buildGroundedBodySignDetails({
    weatherKey: "pressure_down",
    symptomFocus: "neck_shoulder",
    signal: 1,
    targetDate: "2026-07-29",
    constitutionContext: accelContextWithBrakeResponse,
  })[1];
  assert.match(brakeSign, /重さ|重だるさ|動きを小さく/);
  assert.doesNotMatch(brakeSign, /力みを後から|張りへ気づき|こわばりをため/);

  const brakeContextWithBalancedResponse = context("brake_batt_small");
  brakeContextWithBalancedResponse.constitution_context.manifestation.reaction_direction = "balanced";
  const balancedSign = bodySigns.buildGroundedBodySignDetails({
    weatherKey: "pressure_up",
    symptomFocus: "neck_shoulder",
    signal: 1,
    targetDate: "2026-07-29",
    constitutionContext: brakeContextWithBalancedResponse,
  })[1];
  assert.equal(balancedSign, "首肩の張りと重さの両方に気づきやすい");
});

test("actual sublabels may add a relevant insight but unrelated sublabels cannot leak other symptoms", () => {
  const dates = ["2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01"];
  const outputs = dates.map((targetDate) =>
    bodySigns.buildGroundedBodySignDetails({
      weatherKey: "damp",
      symptomFocus: "neck_shoulder",
      signal: 1,
      targetDate,
      constitutionContext: context("accel_batt_standard", ["qi_stagnation", "fluid_damp"]),
    })[1]
  );

  assert.ok(outputs.some((text) => /緊張|水分/.test(text)));
  assert.doesNotMatch(outputs.join(" "), /胃腸|食後|腰|むくみ|ふわつき/);
});

test("same date is stable while adjacent dates rotate within grounded candidates", () => {
  const input = {
    weatherKey: "heat",
    symptomFocus: "mood",
    signal: 1,
    constitutionContext: context("accel_batt_standard", ["qi_stagnation"]),
  };
  const today = bodySigns.buildGroundedBodySignDetails({ ...input, targetDate: "2026-07-28" });
  const reload = bodySigns.buildGroundedBodySignDetails({ ...input, targetDate: "2026-07-28" });
  const tomorrow = bodySigns.buildGroundedBodySignDetails({ ...input, targetDate: "2026-07-29" });

  assert.deepEqual(reload, today);
  assert.notDeepEqual(tomorrow, today);
});

test("stable forecasts soften both grounded details", () => {
  const details = bodySigns.buildGroundedBodySignDetails({
    weatherKey: "damp",
    symptomFocus: "digestion",
    signal: 0,
    targetDate: "2026-07-28",
    constitutionContext: context("brake_batt_small", ["qi_deficiency"]),
  });

  assert.equal(details.length, 2);
  details.forEach((text) => assert.match(text, /かも$/));
});

test("mood and neck/shoulder signs do not invent the rejected conditions", () => {
  for (const weatherKey of Object.keys(WEATHER_MARKERS)) {
    const mood = bodySigns.buildGroundedBodySignDetails({
      weatherKey,
      symptomFocus: "mood",
      signal: 1,
      targetDate: "2026-07-28",
      constitutionContext: context("accel_batt_standard"),
    });
    const neck = bodySigns.buildGroundedBodySignDetails({
      weatherKey,
      symptomFocus: "neck_shoulder",
      signal: 1,
      targetDate: "2026-07-28",
      constitutionContext: context("accel_batt_standard"),
    });
    assert.doesNotMatch(mood.join(" "), /胃腸|食後|お腹|気分に湿気/);
    assert.doesNotMatch(neck.join(" "), /画面から顔|目や肩甲骨|首そのものより|肩を回した時より/);
  }
});

test("radar page passes the current risk context into the sign generator", () => {
  assert.match(radarPageSource, /getForecastBodySigns\([\s\S]*?activeTargetDate,\s*riskContext\s*\)/);
  assert.match(radarPageSource, /\[triggerFactors,[^\]]*activeTargetDate,\s*riskContext\]/);
  assert.match(radarUtilsSource, /buildGroundedBodySignDetails/);
  assert.doesNotMatch(
    radarUtilsSource,
    /RADAR_NARRATIVE_WEATHER_INSIGHT_CONTEXTS|RADAR_NARRATIVE_SYMPTOM_OBSERVATIONS|SYMPTOM_WEATHER_BODY_SIGN_LABELS/
  );
});
