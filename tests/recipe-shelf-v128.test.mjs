import test from "node:test";
import assert from "node:assert/strict";
import { recipeMaterials, materialFor, materialMatch, shelfFromPlan } from "../lib/care-shop/recipeShelf.js";
import { DRINK_EXPLANATIONS } from "../lib/radar_v1/careRules/drinkExplanations.js";
test("every shoppable drink has a known ingredient and an ordinary cup of water has no product link",()=>{
 for(const name of Object.keys(DRINK_EXPLANATIONS)) {
  const rows=recipeMaterials(name);
  assert.equal(rows.length>0,!["水","白湯"].includes(name),name);
  for(const row of rows) assert.ok(row.query && row.label);
 }
 assert.deepEqual(recipeMaterials("なつめ龍眼茶").map(x=>x.label),["なつめ","龍眼肉"]);
 for(const key of ["constructor","__proto__","not-a-product"]) {
   assert.equal(materialFor(key),null);assert.deepEqual(recipeMaterials(key),[]);
 }
});
test("shelf reads the displayed drink rows and distinguishes food from plants and products for other uses",()=>{
 assert.deepEqual(shelfFromPlan({night_food:{action_cards:[{key:"drink",items:["白湯","菊花クコ茶"]}]}}),["菊花クコ茶"]);
 assert.equal(materialMatch("jujube","なつめ 苗木"),false);
 assert.equal(materialMatch("longan","食品用 乾燥龍眼肉"),true);
 assert.equal(materialMatch("corn","とうもろこしのひげ茶"),false);
});
