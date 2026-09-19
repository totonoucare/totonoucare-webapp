import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const babel=require('next/dist/compiled/babel/bundle.js');
const {transform}=require('next/dist/build/swc');
const source=await readFile(new URL('../app/radar/page.js',import.meta.url),'utf8');
const ast=babel.parser().parse(source,{sourceType:'module',plugins:['jsx']});
const declarations=new Map();
babel.traverse().default(ast,{VariableDeclaration(p){for(const d of p.node.declarations)if(d.id.type==='Identifier')declarations.set(d.id.name,source.slice(p.node.start,p.node.end));}});

test('forecast page has no unresolved identifiers beyond browser globals',()=>{
 const allowed=new Set(['window','URLSearchParams','fetch','clearTimeout','clearInterval','setTimeout','setInterval','console','navigator']);
 const missing=new Set();
 babel.traverse().default(ast,{ReferencedIdentifier(p){if(!p.scope.hasBinding(p.node.name)&&!allowed.has(p.node.name))missing.add(p.node.name)}});
 assert.deepEqual([...missing],[]);
});
function count(actions,mode){
 return new Function('careActions','careSourceMode','useMemo','safeArray',declarations.get('currentCareActionKeys')+'\n'+declarations.get('checkedCareCount')+'\nreturn checkedCareCount;')(actions,mode,fn=>fn(),v=>Array.isArray(v)?v:[]);
}
test('guide count follows recorded action keys and selected source mode',()=>{
 const rows=[{source_mode:'today',canonical_key:'a'},{source_mode:'today',item_key:'a'},{source_mode:'today',item_key:'b'},{source_mode:'tomorrow',item_key:'c'},{source_mode:'today'}];
 assert.equal(count([], 'today'),0);
 assert.equal(count(rows,'today'),2);
 assert.equal(count(rows,'tomorrow'),1);
 assert.equal(count(rows.filter(x=>(x.canonical_key||x.item_key)!=='a'),'today'),1);
});
async function compile(code,filename){
 const compiled=await transform(code,{filename,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}});
 const mod={exports:{}};new Function('module','exports','require','React',compiled.code)(mod,mod.exports,require,React);return mod.exports;
}
const avatarSource=await readFile(new URL('../components/illust/home/HeroGuideBot.jsx',import.meta.url),'utf8');
const {GuideBotAvatar}=await compile(avatarSource,'HeroGuideBot.jsx');
const begin=source.indexOf('<div className="mt-3 flex items-center gap-2 rounded-[18px]');
const end=source.indexOf('\n\n            {careActionError',begin);
assert.ok(begin>=0&&end>begin);
const fragment=source.slice(begin,end).trim();
const {Guide}=await compile('export function Guide({checkedCareCount,selectedIsToday,GuideBotAvatar}) { return ('+fragment+'); }','Guide.jsx');
test('actual guide markup renders avatar and text for today/tomorrow, before/after recording',()=>{
 for(const selectedIsToday of [true,false])for(const checkedCareCount of [0,2]){
  const html=renderToStaticMarkup(React.createElement(Guide,{checkedCareCount,selectedIsToday,GuideBotAvatar}));
  assert.match(html,/<svg/);assert.match(html,/ミモル/);
  if(checkedCareCount)assert.ok(html.includes(`${selectedIsToday?'今日':'明日'}に向けたケアを2件記録しました。`));
  else assert.ok(html.includes(selectedIsToday?'やってみた':'今夜取り入れたケア'));
 }
});
