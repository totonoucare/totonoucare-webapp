// Each row identifies one shelf item, the marketplace query, and a title match.
const materials = {
  barley:["麦茶","麦茶","麦茶"], hojicha:["ほうじ茶","ほうじ茶 茶葉","ほうじ茶|焙じ茶"],
  green:["緑茶","緑茶 茶葉","緑茶|煎茶"], coffee:["コーヒー豆","コーヒー豆","コーヒー豆|珈琲豆"],
  decaf:["デカフェ","デカフェ コーヒー","デカフェ|カフェインレス"],
  rooibos:["ルイボス","ルイボスティー","ルイボス"], hatomugi:["はとむぎ茶","はとむぎ茶","はとむぎ|ハトムギ"],
  corn:["とうもろこし茶","とうもろこし茶 実","とうもろこし|コーン茶"],
  azuki:["小豆茶","小豆茶","小豆茶|あずき茶"], blackbean:["黒豆茶","黒豆茶","黒豆茶"],
  ginger:["しょうが","乾燥 生姜 食用","しょうが|生姜"], kudzu:["葛粉","本葛粉","本葛|葛粉"],
  rose:["マイカイ花","マイカイ花 食用","マイカイ|玫瑰|ハマナス"], peel:["陳皮","陳皮 食用","陳皮"],
  jasmine:["ジャスミン花","ジャスミン 花 食用","ジャスミン"],
  chrysanthemum:["菊花","菊花茶 食用","菊花"], goji:["クコの実","クコの実","クコ|枸杞"],
  jujube:["なつめ","乾燥 なつめ","なつめ|ナツメ|棗"], longan:["龍眼肉","乾燥 龍眼肉","龍眼|竜眼|ロンガン"],
};
const recipes = {
  麦茶:["barley"],ほうじ茶:["hojicha"],緑茶:["green"],コーヒー:["coffee"],デカフェコーヒー:["decaf"],
  ルイボスティー:["rooibos"],はとむぎ茶:["hatomugi"],とうもろこし茶:["corn"],小豆茶:["azuki"],黒豆茶:["blackbean"],
  生姜湯:["ginger"],葛湯:["kudzu"],マイカイ花茶:["rose"],陳皮しょうが茶:["peel","ginger"],ジャスミン花茶:["jasmine"],
  菊花クコ茶:["chrysanthemum","goji"],なつめ龍眼茶:["jujube","longan"],しょうがなつめ茶:["ginger","jujube"],はとむぎ小豆茶:["hatomugi","azuki"],
  "ルイボス＋マイカイ花":["rooibos","rose"],
};
export function materialFor(id) {
  if (!Object.hasOwn(materials,id)) return null;
  const [label,query,pattern]=materials[id];
  return {id,label,query,pattern};
}
export function recipeMaterials(name) {
  return Object.hasOwn(recipes,name) ? recipes[name].map(materialFor) : [];
}
export function shelfFromPlan(plan) {
  const food=plan?.tomorrow_food_context || plan?.night_food;
  const drink=food?.action_cards?.find(row=>row.key==="drink");
  return [...new Set((drink?.items || []).filter(name=>recipeMaterials(name).length))].slice(0,3);
}
export function materialMatch(id,title) {
  const material=materialFor(id);
  if(!material || !new RegExp(material.pattern,"i").test(title)) return false;
  if(/苗木|観賞|観葉|造花|芳香剤|シャンプー|ボディソープ|入浴剤|ペット用|医薬品|サプリ|カプセル|湯呑|茶こし/.test(title)) return false;
  if(id==="corn" && /ひげ|ヒゲ|鬚/.test(title)) return false;
  if(id==="jasmine" && /緑茶|烏龍|ウーロン|香水/.test(title)) return false;
  return true;
}

export function materialsForDays(days) {
  const materialsById = new Map();
  for (const { day, recipes } of days) {
    for (const recipe of new Set(recipes)) {
      for (const material of recipeMaterials(recipe)) {
        if (!materialsById.has(material.id)) materialsById.set(material.id, { ...material, uses: [] });
        materialsById.get(material.id).uses.push({ day, recipe });
      }
    }
  }
  return Array.from(materialsById.values());
}
