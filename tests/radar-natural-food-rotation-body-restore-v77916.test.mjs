import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "./helpers/rule-read.mjs";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const foodRulesSource = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");
const radarUtilsSource = await readFile(new URL("../app/radar/utils.js", import.meta.url), "utf8");
const explainPointSource = await readFile(new URL("../lib/radar_v1/explainPointSelection.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);

function build({
  trigger,
  symptomFocus,
  coreCode,
  reactionDirection,
  date = "2026-08-05",
  mode = "today",
} = {}) {
  const brake = reactionDirection === "brake";
  return daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast: {
      target_date: date,
      signal: 1,
      score_display_0_10: 5.4,
      personal_main_trigger_exact: trigger,
      reaction_direction: reactionDirection,
    },
    riskContext: {
      summary: { main_trigger_exact: trigger, reaction_direction: reactionDirection },
      target: { signal: 1 },
      constitution_context: {
        core_code: coreCode,
        sub_labels: brake
          ? ["fluid_damp", "qi_deficiency"]
          : ["qi_stagnation", "fluid_deficiency"],
        symptom_focus: symptomFocus,
        manifestation: { reaction_direction: reactionDirection },
        axes: {
          yin_yang_score: reactionDirection === "accel" ? 0.8 : -0.8,
          drive_score: brake ? -0.7 : 0.7,
          obstruction_score: 0.45,
        },
        split_scores: {
          qi: { deficiency: brake ? 3 : 0.4, stagnation: brake ? 0.4 : 3 },
          blood: { deficiency: 0.4, stasis: 0.7 },
          fluid: { deficiency: brake ? 0.2 : 2, damp: brake ? 4 : 0.2 },
        },
      },
    },
    mode,
    targetDate: date,
    symptomFocus,
  });
}

const triggers = ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"];
const symptoms = ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"];
const profiles = [
  ["brake_batt_small", "brake"],
  ["brake_batt_large", "brake"],
  ["accel_batt_small", "accel"],
  ["accel_batt_large", "accel"],
];

test("身体の使い方5件は、抽象トレーニング化する前の実用動作へ戻す（v7.79.62仕様）", () => {
assert.match(dailySource,/かかとの少し前あたりに体重を乗せ/);
assert.match(dailySource,/両足裏を床につけ、お尻を左右に小さく動かし/);
assert.doesNotMatch(dailySource,/後頭部を1cm|tension-walk-center-first|tension-screen-head-up/);
});

test("ユーザー向け文言へ、意味の曖昧なAI比喩を戻さない", () => {
  const audited = [dailySource, foodRulesSource, radarUtilsSource, explainPointSource].join("\n");
  assert.doesNotMatch(
    audited,
    /刺激で押|カフェインだけで押|濃い味で押|押すより|押し切|胃腸へ荷物|静かな燃料|動き出す燃料|回復に使う火|湿った荷物|材料不足|余力の反動|胃腸の交通整理|体の起動|前のめりを足さ|熱と刺激を三重|体の上側へ|食べもので正解|軽く流れる食べ方|首本人|苦味で[^\n"]*沈|香りでめぐらせる|乾きに刺激を足す|内側からこわばりを足す/
  );
  assert.match(foodRulesSource, /辛い物や食べすぎを避け/);
  assert.match(dailySource, /カフェインだけで乗り切ろうとしない/);
  assert.match(dailySource, /豆腐と卵をスープにすると/);
});

test("同じ条件の今日と明日で、252通りすべて主献立を重複させない", () => {
  let same = 0;
  let total = 0;
  for (const trigger of triggers) {
    for (const symptomFocus of symptoms) {
      for (const [coreCode, reactionDirection] of profiles) {
        const today = build({ trigger, symptomFocus, coreCode, reactionDirection });
        const tomorrow = build({
          trigger,
          symptomFocus,
          coreCode,
          reactionDirection,
          date: "2026-08-06",
          mode: "tomorrow",
        });
        const todayId = today.night_food.primary_action.id;
        const tomorrowId = tomorrow.night_food.primary_action.id;
        total += 1;
        if (todayId === tomorrowId) same += 1;
        assert.notEqual(todayId, tomorrowId, `${trigger}/${symptomFocus}/${coreCode}`);
      }
    }
  }
  assert.equal(total, 252);
  assert.equal(same, 0);
});

test("似た天気が続いても、主献立は隣接日で重ならず6日間に3種類以上出す", () => {
  for (const trigger of triggers) {
    for (const symptomFocus of symptoms) {
      for (const [coreCode, reactionDirection] of profiles) {
        const ids = Array.from({ length: 6 }, (_, offset) => {
          const date = `2026-08-${String(5 + offset).padStart(2, "0")}`;
          return build({
            trigger,
            symptomFocus,
            coreCode,
            reactionDirection,
            date,
          }).night_food.primary_action.id;
        });
        for (let index = 1; index < ids.length; index += 1) {
          assert.notEqual(ids[index], ids[index - 1], `${trigger}/${symptomFocus}/${coreCode}/${ids.join(" -> ")}`);
        }
        assert.ok(new Set(ids).size >= 3, `${trigger}/${symptomFocus}/${coreCode}/${ids.join(" -> ")}`);
      }
    }
  }
});

test("献立ローテーションは再読込で安定し、既存食材の安定IDを使う", () => {
  for (const trigger of triggers) {
    const args = {
      trigger,
      symptomFocus: "neck_shoulder",
      coreCode: "accel_batt_large",
      reactionDirection: "accel",
      date: "2026-08-08",
    };
    const first = build(args).night_food.primary_action.id;
    const second = build(args).night_food.primary_action.id;
    assert.equal(first, second, trigger);
    assert.match(first, /^food-\d{3}$/, `${trigger}/${first}`);
    assert.doesNotMatch(first, /^(damp|heat|dry|cold|pd|pu|base)-/, `${trigger}/${first}`);
  }
});
