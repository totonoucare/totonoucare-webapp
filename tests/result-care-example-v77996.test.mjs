import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createScenarioRunner } from "./helpers/forecast-scenarios.mjs";

const { load, profiles } = await createScenarioRunner();
const { buildResultCareExample, resultCareExampleDate } = await load("lib/diagnosis/v2/resultCareExample.js");
const care = await load("lib/diagnosis/v2/carePreferences.js");
const daily = await load("lib/radar_v1/careRules/dailyCareV2.js");
const images = await load("lib/radar_v1/careMovementImages.js");
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

test("all 36 constitution/symptom cases reuse the genuine line-care selector without changing the diagnosis", () => {
  for (const profile of profiles) for (const symptom of symptoms) {
    const input = options(profile, symptom);
    const before = JSON.stringify(input);
    const example = buildResultCareExample(input);
    assert.equal(JSON.stringify(input), before, profile.name + "/" + symptom);
    const preferences = care.buildBaseCarePreferences(input);
    const selected = daily.buildMeridianLineCare({theme:{
      mode:"today", target_date:resultCareExampleDate(input.createdAt), trigger_key:"none",
      secondary_trigger_key:null, signal:0,
      stimulus:input.computed.core_code.includes("batt_small")?"弱め・短め":"軽く一度",
      sub_labels:input.computed.sub_labels, symptom_focus:symptom, policies:preferences.items,
      primary_meridian:input.computed.primary_meridian, secondary_meridian:input.computed.secondary_meridian,
    }});
    assert.equal(example.id,selected.id);assert.equal(example.title,selected.title);
    assert.equal(example.action,selected.action);assert.equal(example.public_reason,selected.reason);
    assert.deepEqual(example.image,images.getCareMovementImage(selected.id));
    assert.equal(example.kind,"line_care");assert.equal(example.selection_basis.symptom,symptom);
    assert.ok(example.check_prompt.length>8);assert.ok(example.guidance.includes("痛み"));
  }
});

test("weather sensitivity answers never become actual weather evidence or a forecast", () => {
  const input = options();
  input.answers = { ...input.answers, env_sensitivity: "almost_always", env_vectors: ["humidity_up", "dryness_up"], trigger_key: "damp" };
  const example = buildResultCareExample(input);
  assert.equal(example.selection_basis.signal, 0);
  assert.equal(example.selection_basis.weather, null);
  assert.equal(example.selection_basis.trigger_key, null);
  assert.equal(example.selection_basis.secondary_trigger_key, null);
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

test("small-reserve constitution gets gentle guidance without assuming weather or heat load", () => {
  for (const profile of profiles) {
    const example=buildResultCareExample(options(profile));
    if(profile.constitution.core_code.includes("batt_small"))assert.match(example.guidance,/弱め・短め/);
    else assert.match(example.guidance,/軽く1セット/);
    assert.doesNotMatch(example.guidance,/今日は|今夜|汗ばむ|乾燥/);
  }
});

test("split-score profiles and missing timestamps remain supported", () => {
  const input = options();
  input.computed = { ...input.computed };
  delete input.computed.material_scores;
  input.createdAt = null;
  const example = buildResultCareExample(input);
  assert.equal(example.selection_basis.target_date, "2026-08-31");
  assert.equal(example.selection_basis.constitution, true);
});

test("changing the current symptom can change the example without altering the saved constitution", () => {
  const profile = profiles[0];
  const before = JSON.stringify(profile.constitution);
  const choices = symptoms.map((symptom) => buildResultCareExample(options(profile, symptom)).id);
  assert.ok(new Set(choices).size > 1);
  assert.equal(JSON.stringify(profile.constitution), before);
});

test("all selected action images exist in the shared collection", async () => {
  const seen=new Set();
  for (const profile of profiles) for (const symptom of symptoms) {
    const example=buildResultCareExample(options(profile,symptom));
    assert.match(example.image.src,/^\/care-movements\/line-[a-z-]+\.webp$/);
    if(!seen.has(example.image.src))await fs.access(new URL("../public"+example.image.src,import.meta.url));
    seen.add(example.image.src);
  }
  assert.ok(seen.size>=4);
});

test("answered burden lines participate in selection; unanswered lines stay unasserted",()=>{
  const input=options(profiles[1],"digestion");
  input.computed={...input.computed,primary_meridian:"spleen_st",secondary_meridian:null};
  const checked=buildResultCareExample(input);
  assert.equal(checked.meridian_code,"spleen_st");assert.equal(checked.selection_basis.checked_rank,1);
  assert.match(checked.short_reason,/選んだ負担ライン/);
  input.computed={...input.computed,primary_meridian:null};
  const unchecked=buildResultCareExample(input);assert.equal(unchecked.selection_basis.checked_rank,null);
  assert.doesNotMatch(unchecked.short_reason,/選んだ負担ライン/);
  assert.equal(buildResultCareExample({...input,symptomKey:"obsolete_unknown"}),null);
});

const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter((child) => child !== null && child !== false) });
async function loadComponent(name) {
  const source = await fs.readFile(new URL(`../components/diagnosis/${name}.jsx`, import.meta.url), "utf8");
  return new Function("h", "IconBody", source.replace(/^import[^\n]+\n/gm, "").replace("export default function", "function") + `\nreturn ${name};`)(h, () => null);
}
const ExampleCard = await loadComponent("ResultCareExample");
const PolicyCard = await loadComponent("ResultCarePolicyCard");
function nodes(tree) { return !tree || typeof tree !== "object" ? [] : [tree, ...tree.children.flatMap(nodes)]; }
function textContent(tree) { return tree == null ? "" : typeof tree === "object" ? tree.children.map(textContent).join("") : String(tree); }

test("the concrete example shows one illustrated action and its own guidance without recording controls", () => {
  const example = buildResultCareExample(options());
  const tree = ExampleCard({ example });
  const text = textContent(tree);
  for(const value of [example.title,example.action,example.short_reason,example.check_prompt,example.guidance])assert.ok(text.includes(value));
  assert.equal(nodes(tree).filter((node) => node.type === "button" || node.type === "input").length, 0);
  assert.equal(nodes(tree).filter((node) => node.type === "img").length,1);
  const image=nodes(tree).find(node=>node.type==="img");
  assert.equal(image.props.src,example.image.src);assert.match(image.props.alt,/動作図/);
  assert.equal(tree.props["aria-label"],"あなたに合うほぐすケアの例");
  assert.doesNotMatch(text,/料理例|食材を選んだ理由|食事で取り入れるなら/);
  const details = nodes(tree).filter((node) => node.type === "details");
  assert.equal(details.length, 1);assert.ok(!details[0].props.open);
  assert.ok(textContent(details[0]).includes(example.public_reason));
  for(const value of [example.short_reason,example.public_reason,example.check_prompt])assert.ok(textContent(details[0]).includes(value));
  const alwaysVisible={...tree,children:tree.children.filter(node=>node.type!=="details")};
  assert.ok(textContent(alwaysVisible).includes(example.guidance));
  assert.ok(!textContent(alwaysVisible).includes(example.short_reason));
  assert.ok(!textContent(alwaysVisible).includes(example.check_prompt));
  assert.equal(nodes(tree).filter(node=>node.type==="h3"&&textContent(node)===example.title).length,1);
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
