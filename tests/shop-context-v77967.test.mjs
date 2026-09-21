import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';
const {load}=await createScenarioRunner();
const shop=await load('lib/care-navi/lifestyleShopQueries.js'),context=await load('lib/care-navi/lifestyleShopContext.js'),point=await load('lib/care-navi/pointTools.js');
const page=await readFile(new URL('../app/care-navi/page.js',import.meta.url),'utf8');
const source=page.slice(page.indexOf('function fallbackSearchQuery('),page.indexOf('function SearchDiscoveryLink('));
const fallback=new Function('lifestyleShopQuery','safeArray','pointToolQueryRows','pickCandidates',source+';return fallbackSearchQuery;')(shop.lifestyleShopQuery,x=>Array.isArray(x)?x:[],point.pointToolQueryRows,()=>[{query:'general'}]);
test('all approved lifestyle contexts keep the same query when products cannot be fetched, including role override',()=>{
 for(const key of context.LIFESTYLE_SHOP_ACTION_KEYS){
  const row=shop.lifestyleShopQuery(key,'');assert.ok(row?.keyword);
  assert.equal(fallback([],'live',null,key,''),row.keyword);
 }
 assert.equal(fallback([],'live',null,'tool-work-height','screen_height'),'タブレット 書見台 スタンド 高さ調整');
 assert.equal(shop.lifestyleShopQuery('injected arbitrary query',''),null);
 assert.equal(fallback([],'live',null,'injected arbitrary query',''),'general');
});
test('food fallback follows the passed product role and point fallback keeps point-tool screening',()=>{
 assert.equal(fallback([],'eat',null,'','',{productRoleKeys:['prepared_meal']}),'冷凍 弁当');
 assert.equal(fallback([],'eat',null,'','',{productRoleKeys:['daily_tea']}),'薬膳茶 和漢茶');
 const p=point.normalizePointToolContext({codes:'LI4',lineCodes:'',warming:false});
 assert.equal(fallback([],'point',p),point.pointToolQueryRows(p)[0]?.keyword||'');
});
