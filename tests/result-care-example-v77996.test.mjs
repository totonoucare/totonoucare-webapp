import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createScenarioRunner } from "./helpers/forecast-scenarios.mjs";

const { load, profiles } = await createScenarioRunner();
const { buildResultCareExample, resultCareExampleDate } = await load("lib/diagnosis/v2/resultCareExample.js");
const care = await load("lib/diagnosis/v2/carePreferences.js");
const tcm = await load("lib/radar_v1/careRules/foodTcm.js");
const recipes = await load("lib/radar_v1/careRules/foodCombinationRecipes.js");
const symptoms = ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"];
const options = (profile = profiles[1], symptomKey = "fatigue") => ({
  answers: profile.answer,
  computed: profile.constitution,
  symptomKey,
  createdAt: "2026-10-12T15:30:00Z",
});

test("loading and obsolete results do not get a neutral care example", () => {
  assert.equal(buildResultCareExample(), null);
  assert.equal(buildResultCareExample({ answers: { symptom_focus: "fatigue" }, computed: {} }), null);
});

test("diagnosis time uses JST and missing timestamps use a fixed date", () => {
  assert.equal(resultCareExampleDate("2026-10-12T14:59:59Z"), "2026-10-12");
  assert.equal(resultCareExampleDate("2026-10-12T15:00:00Z"), "2026-10-13");
  assert.equal(resultCareExampleDate("2026-10-13T00:00:00+09:00"), "2026-10-13");
  for (const value of [null, undefined, "", "not-a-date"]) assert.equal(resultCareExampleDate(value), "2026-08-31");
});

test("all 36 constitution/symptom cases use a genuine two-food recipe without changing the diagnosis", () => {
  for (const profile of profiles) for (const symptom of symptoms) {
    const input = options(profile, symptom);
    const before = JSON.stringify(input);
    const example = buildResultCareExample(input);
    assert.equal(JSON.stringify(input), before, profile.name + "/" + symptom);
    assert.equal(example.focus_ingredients.length, 2);
    assert.equal(new Set(example.focus_ingredients).size, 2);
    assert.ok(recipes.FOOD_COMBINATION_RECIPES.some((recipe) => recipe.title === example.meal_example && recipe.foods.every((name) => example.focus_ingredients.includes(name))));
    assert.ok(example.preparation.length > 8);
    assert.ok(example.short_reason.length > 8 && example.short_reason.length < 100);
    assert.ok(example.selection_basis.evidence.length);
  }
});

test("weather sensitivity answers never become actual weather evidence or a forecast", () => {
  const input = options();
  input.answers = { ...input.answers, env_sensitivity: "almost_always", env_vectors: ["humidity_up", "dryness_up"], trigger_key: "damp" };
  const example = buildResultCareExample(input);
  assert.equal(example.selection_basis.signal, 0);
  assert.equal(example.selection_basis.source_scores.weather, 0);
  assert.ok(example.selection_basis.evidence.every((evidence) => evidence.source !== "weather"));
  assert.ok(example.reasons.every((reason) => reason.label !== "天気"));
  assert.doesNotMatch(example.public_reason, /今日の|明日の|気圧|湿気への備え/);
  assert.match(example.basis_label, /体質チェック/);
});

test("the same result stays stable across viewing days and explicit preferences preserve its choice", () => {
  const input = options();
  const before = buildResultCareExample(input);
  const originalNow = Date.now;
  try {
    Date.now = () => Date.parse("2028-01-01T00:00:00Z");
    assert.deepEqual(buildResultCareExample(input), before);
    Date.now = () => Date.parse("2029-07-01T00:00:00Z");
    assert.deepEqual(buildResultCareExample(input), before);
  } finally { Date.now = originalNow; }
  const carePreferences = care.buildBaseCarePreferences(input);
  assert.deepEqual(buildResultCareExample({ ...input, carePreferences }), before);
});

test("cold, heat and mixed constitution keep the catalog's food-nature exclusions", () => {
  for (const thermal of ["cold", "heat", "mixed"]) {
    const input = options(profiles[2]);
    input.computed = { ...input.computed, axes: { ...input.computed.axes, thermo_answer: thermal } };
    const example = buildResultCareExample(input);
    for (const ingredient of example.selection_basis.ingredients) {
      if (thermal === "cold") assert.ok(!["寒", "涼"].includes(ingredient.nature));
      if (thermal === "heat") assert.ok(!["温", "熱"].includes(ingredient.nature));
      if (thermal === "mixed") assert.equal(ingredient.nature, "平");
    }
  }
});

test("split-score profiles and missing timestamps remain supported", () => {
  const input = options();
  input.computed = { ...input.computed };
  delete input.computed.material_scores;
  input.createdAt = null;
  const example = buildResultCareExample(input);
  assert.equal(example.selection_basis.target_date, "2026-08-31");
  assert.ok(example.selection_basis.evidence.some((evidence) => evidence.source === "constitution"));
});

test("changing the current symptom can change the example without altering the saved constitution", () => {
  const profile = profiles[0];
  const before = JSON.stringify(profile.constitution);
  const choices = symptoms.map((symptom) => buildResultCareExample(options(profile, symptom)).id);
  assert.ok(new Set(choices).size > 1);
  assert.equal(JSON.stringify(profile.constitution), before);
});

test("every ingredient's cited function is present in the shared food catalog", () => {
  for (const profile of profiles) for (const symptom of symptoms) {
    const example = buildResultCareExample(options(profile, symptom));
    for (const evidence of example.selection_basis.evidence) for (const match of evidence.matched_foods) {
      const food = tcm.FOOD_ITEMS.find((item) => item.id === match.id);
      assert.ok(food);
      for (const functionName of match.functions) assert.ok(food.tcm.functions.includes(functionName));
    }
  }
});

const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter((child) => child !== null && child !== false) });
async function loadComponent(name) {
  const source = await fs.readFile(new URL(`../components/diagnosis/${name}.jsx`, import.meta.url), "utf8");
  return new Function("h", "IconFood", source.replace(/^import[^\n]+\n/gm, "").replace("export default function", "function") + `\nreturn ${name};`)(h, () => null);
}
const ExampleCard = await loadComponent("ResultCareExample");
const PolicyCard = await loadComponent("ResultCarePolicyCard");
function nodes(tree) { return !tree || typeof tree !== "object" ? [] : [tree, ...tree.children.flatMap(nodes)]; }
function textContent(tree) { return tree == null ? "" : typeof tree === "object" ? tree.children.map(textContent).join("") : String(tree); }

test("the concrete example shows the real recipe and reasoning without recording controls", () => {
  const example = buildResultCareExample(options());
  const tree = ExampleCard({ example });
  const text = textContent(tree);
  for (const name of example.focus_ingredients) assert.ok(text.includes(name));
  assert.ok(text.includes(example.meal_example));
  assert.ok(text.includes(example.preparation));
  assert.ok(text.includes(example.short_reason));
  assert.equal(nodes(tree).filter((node) => node.type === "button" || node.type === "input").length, 0);
  const details = nodes(tree).filter((node) => node.type === "details");
  assert.equal(details.length, 1);
  assert.ok(!details[0].props.open);
  assert.equal(ExampleCard({ example: null }), null);
});

test("all seven policy cards retain the full explanation in a closed detail and use a full-width short paragraph", () => {
  for (const item of Object.values(care.CARE_POLICY_DEFINITIONS)) {
    const tree = PolicyCard({ item });
    const details = tree.children.find((node) => node.type === "details");
    const paragraph = tree.children.find((node) => node.type === "p");
    assert.ok(details && paragraph);
    assert.ok(!details.props.open);
    assert.ok(textContent(details).includes(item.body));
    assert.ok(textContent(paragraph).length < item.body.length);
    assert.ok(nodes(tree).some((node) => node.props.className?.includes("h-12 w-12")));
  }
});
