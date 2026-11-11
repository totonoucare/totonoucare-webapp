// Selection roles use the catalog's reviewed functions. A culinary companion
// and the temperature at which a drink is served have their own roles.
export const FOOD_CARE_POLICY_VERSION = "food_policy_v118_20261111";
export const FOOD_POLICY_FUNCTIONS = {
  sasaeru: ["補気", "健脾"], nukumeru: ["温中", "散寒"],
  uruosu: ["養血", "生津", "滋陰", "潤燥", "潤肺", "潤腸"], nagasu: ["健脾", "利水"],
  meguraseru: ["理気", "活血"], yurumeru: ["理気", "和胃"], shizumeru: ["清熱", "安神", "平肝"],
};
const LABELS = { sasaeru:"ささえる", nukumeru:"ぬくめる", uruosu:"うるおす", nagasu:"ながす", meguraseru:"めぐらせる", yurumeru:"ゆるめる", shizumeru:"しずめる" };
const PURPOSES = { sasaeru:"食事から力を得て体を働かせること", nukumeru:"冷えで鈍る働きを温めて助けること", uruosu:"不足しやすい潤いを補うこと", nagasu:"水分を運び、余分な水分をためにくくすること", meguraseru:"気や血の滞りを動かすこと", yurumeru:"胸やお腹の張りつめた状態をほどくこと", shizumeru:"熱や高ぶりを落ち着けること" };
const DRINK_FUNCTIONS = { support:["補気"], support_spleen:["健脾"], blood:["養血"], warm:["温中"],
  moisten:["滋陰"], drain_damp:["利水"], move_qi:["理気"], move_blood:["活血"], digest:["和胃"],
  clear_heat:["清熱"], cool:["清熱"], calm:["安神"] };
const list=value=>Array.isArray(value)?value:[];

export function foodCarePolicy(functions, policies = []) {
  for(const [index,policy] of list(policies).entries()){
    const key=typeof policy==="string"?policy:policy?.key;
    const matched=list(functions).filter(value=>FOOD_POLICY_FUNCTIONS[key]?.includes(value));
    if(matched.length)return { key,label:LABELS[key],rank:index+1,
      mechanism:`${[...new Set(matched)].join("・")}という食養生上の働きから、${PURPOSES[key]}を担当する。`,version:FOOD_CARE_POLICY_VERSION };
  }
  return null;
}

export function drinkCarePolicy(drink, policies = []) {
  // Generic hydration, aroma, caffeine and low stimulus do not acquire a
  // traditional function just because a matching policy is on the screen.
  return foodCarePolicy(list(drink?.tags).flatMap(tag=>DRINK_FUNCTIONS[tag]||[]),policies);
}
