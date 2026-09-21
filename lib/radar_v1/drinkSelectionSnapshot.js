// Preserve drink selection evidence as structured, bounded JSON at the API boundary.
const text = (value, size=100) => typeof value === 'string' ? value.trim().slice(0,size) || null : null;
const list = value => Array.isArray(value) ? value.map(x=>text(x,40)).filter(Boolean).slice(0,12) : [];
const level = value => ['weak','medium','strong'].includes(value) ? value : null;
export function cleanDrinkSelectionBasis(value={}) {
 const strengths = value.tag_strengths && typeof value.tag_strengths==='object' && !Array.isArray(value.tag_strengths)
  ? Object.fromEntries(Object.entries(value.tag_strengths).slice(0,16).filter(([k,v])=>/^[a-z_]{1,40}$/.test(k)&&level(v)).map(([k,v])=>[k,v])) : {};
 return {
  version:text(value.version,60),nature:text(value.nature,10),review:text(value.review,30),
  inference_basis:text(value.inference_basis,240),inferred_tags:list(value.inferred_tags),
  strength:level(value.strength),tag_strengths:strengths,nature_range:text(value.nature_range,30),
  served_warm:value.served_warm===true,reason:text(value.reason,240),reason_key:text(value.reason_key,60),
  matched_context:Array.isArray(value.matched_context) ? value.matched_context.slice(0,24)
   .filter(x=>x&&typeof x==='object'&&!Array.isArray(x)&&typeof x.weight==='number'&&Number.isFinite(x.weight)&&x.weight>=0&&x.weight<=100)
   .map(x=>({source:text(x.source,30),key:text(x.key,60),tags:list(x.tags),weight:x.weight})) : [],
  target_date:typeof value.target_date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.target_date)?value.target_date:null,
  symptom_focus:text(value.symptom_focus,40),trigger_key:text(value.trigger_key,40),secondary_trigger_key:text(value.secondary_trigger_key,40),
 };
}
