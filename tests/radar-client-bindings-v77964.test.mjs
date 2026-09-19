import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=require('next/dist/compiled/babel/bundle');
const {parse}=bundle.parser(), traverse=bundle.traverse().default;
const globals=new Set(['undefined','NaN','Infinity','console','Math','Number','String','Boolean','Object','Array','Map','Set','Date','JSON','Promise','Error','URL','URLSearchParams','RegExp','Intl','window','document','navigator','localStorage','sessionStorage','fetch','setTimeout','clearTimeout','setInterval','clearInterval','encodeURIComponent','decodeURIComponent','parseInt','parseFloat','isNaN','process','AbortController']);
export function unbound(source){
 const ast=parse(source,{sourceType:'module',plugins:['jsx']});const result=new Set();
 traverse(ast,{ReferencedIdentifier(path){const name=path.node.name;if(!path.scope.hasBinding(name)&&!globals.has(name))result.add(name);}});
 return [...result].sort();
}
test('radar page and care-record components have no unresolved JS or JSX bindings',async()=>{
 for(const file of ['app/radar/page.js','app/radar/CareStepCard.jsx','components/records/DailyRecordCard.jsx','components/records/RecordsPageClient.jsx']){
  const s=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');assert.deepEqual(unbound(s),[],file);
 }
});
test('regression guard detects missing component import and missing count definition',()=>{
 assert.deepEqual(unbound('const Demo=()=> <GuideBotAvatar mood={checkedCareCount>0?"complete":"normal"}/>;'),['GuideBotAvatar','checkedCareCount']);
});
