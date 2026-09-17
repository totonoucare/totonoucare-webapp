import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createScenarioRunner} from './helpers/forecast-scenarios.mjs';
import {buildGuidedSearchResult} from '../lib/care-shop/guidedEngine.js';

const {load}=await createScenarioRunner();
const tools=await load('lib/care-navi/pointTools.js');
const fit=await load('lib/care-navi/lifestyleProductFit.js');
const lifestyle=await load('lib/care-navi/lifestyleShopContext.js');
const intent=await load('lib/care-navi/rakutenSearchIntent.js');
const dependencies={...tools,...fit,...lifestyle,...intent,enforcePublicApiRateLimit:async()=>null};
const source=await fs.readFile(new URL('../app/api/care-navi/rakuten/route.js',import.meta.url),'utf8');
const route=new Function(...Object.keys(dependencies),source.replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];/gm,'').replace(/export (const|async function|function) /g,'$1 ')+'\nreturn {buildQueryPlans,isAcceptableRakutenItem,normalizeRakutenItem,selectBalancedItems};')(...Object.values(dependencies));
const context=tools.pointToolContext([{code:'LI11',source:'mtest'}],true);
const plan=(pointContext,policyKeys=['nukumeru'])=>route.buildQueryPlans({category:'point',policyKeys,symptomKey:'neck_shoulder',lifeKeys:[],priceBand:'all',pointContext,limit:12});

// Exercise the actual JSX page's selection functions, without a browser/login.
const {transform}=createRequire(import.meta.url)('next/dist/build/swc');
const pageSource=await fs.readFile(new URL('../app/care-navi/page.js',import.meta.url),'utf8');
const compiled=await transform(pageSource.replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];/gm,'')+'\nexport {buildPolicySetDefinitions,itemMatchesSlot,scoreKitCandidate,buildPointUseGuide,fallbackSearchQuery};',{filename:'shop.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true}},module:{type:'commonjs'}});
const labels=await load('lib/diagnosis/v2/labels.js');
const pageDeps={...dependencies,...labels,IconCare:()=>null,IconFood:()=>null,IconKarte:()=>null,IconLifestyle:()=>null,IconTsubo:()=>null};
const shop={};
new Function('exports',...Object.keys(pageDeps),compiled.code)(shop,...Object.values(pageDeps));

test('ラインケアの対象ツボだけにシール鍼を案内する',()=>{
  assert.deepEqual(tools.pointToolKinds(context),['moxa','stick','seal']);
  assert.deepEqual(tools.pointToolKinds(tools.pointToolContext([{code:'ST36',source:'tcm'}],true)),['moxa','stick']);
  assert.ok(!tools.pointToolKinds({}).includes('seal'));
  assert.deepEqual(tools.normalizePointToolContext({codes:['LI4'],lineCodes:['ST36','LI4']}).lineCodes,[]);
});
test('頭頸部・未知のツボ・小さな指先には道具案内を追加しない',()=>{
  for(const code of ['GB20','BL2','GV20','UNKNOWN1','HT9','PC9','ST45','BL67']) assert.deepEqual(tools.pointToolGuides({code,source:'mtest'},true),[]);
});
test('温める方針の有無にかかわらずお灸を最初に案内する',()=>{
  assert.equal(tools.pointToolGuides({code:'ST36',source:'tcm'},false)[0].kind,'moxa');
  assert.ok(tools.pointToolGuides({code:'ST36',source:'tcm'},true).some(x=>x.kind==='moxa'));
});
test('API検索3枠はツボに対応した道具を優先し、余計な検索を増やさない',()=>{
  const rows=plan(context);
  assert.deepEqual(rows.map(x=>x.pointToolKind),['moxa','stick','seal']);
  assert.ok(rows.every(x=>x.reason.includes('曲池')));
  assert.ok(!plan(tools.pointToolContext([{code:'ST36',source:'tcm'}],false)).some(x=>x.pointToolKind === 'seal'));
  assert.ok(!plan(null,['yurumeru']).some(x=>x.pointToolKind==='seal'));
});
test('家庭用シール鍼を取り込み、業務用鍼・別の商品を除外する',()=>{
  const seal=plan(context).find(x=>x.pointToolKind==='seal');
  const good={itemName:'家庭用 鍼シール 一般医療機器',itemCaption:'貼付する前に確認。傷口には使用しない。'};
  assert.equal(route.isAcceptableRakutenItem(good,seal),true);
  assert.equal(route.isAcceptableRakutenItem({itemName:'円皮鍼 医療従事者専用'},seal),false);
  assert.equal(route.isAcceptableRakutenItem({itemName:'家庭用 マッサージガン'},seal),false);
});
test('商品の医療機器表示で適合するお灸を誤除外しない',()=>{
  const moxa=plan(context).find(x=>x.pointToolKind==='moxa');
  assert.equal(route.isAcceptableRakutenItem({itemName:'お灸 ソフト 低温 管理医療機器'},moxa),true);
  assert.equal(route.isAcceptableRakutenItem({itemName:'低温 ソフト ネックピロー'},moxa),false);
});
test('商品名を優先して判別し、検索語だけで別商品をツボ道具にしない',()=>{
  assert.equal(tools.pointToolKind({title:'フォームローラー',query:'ツボ押し棒'}),'');
});
test('悩み検索はツボ道具を候補にしつつ、商品名の指定を優先する',()=>{
  const input={concerns:['neck_shoulder'],scope:'selfcare',duration:'weeks',intensity:'moderate',thermal:'cold',moisture:'neutral',reserve:'normal',response:'warm_better',ageBand:'adult',pregnancy:'no',medication:'no',freeText:''};
  const first=buildGuidedSearchResult(input).groups[0].candidates;
  assert.ok(first.some(x=>x.id==='care-rounded-tsubo-stick'));
  assert.equal(buildGuidedSearchResult({...input,freeText:'フォームローラーを探している'}).groups[0].candidates[0].id,'care-soft-foam-roller');
  assert.equal(buildGuidedSearchResult({...input,freeText:'ネックピローを探している'}).groups[0].candidates[0].id,'care-neck-heat-wrap');
  assert.ok(!buildGuidedSearchResult({...input,thermal:'heat',response:'cool_better'}).groups[0].candidates.some(x=>x.id==='care-fireless-moxa'));
});
test('通常ケアとラインケアで同じツボを選んでもライン由来を保持する',async()=>{
  const {composeTsuboSet}=await load('lib/radar_v1/composeTsuboSet.js');
  const set=composeTsuboSet({tcmPoints:{points:[{code:'LI11',name_ja:'曲池'}]},mtestPoint:{point:{code:'LI11',name_ja:'曲池'}},riskContext:{}});
  assert.equal(set.points.length,1);
  assert.ok(tools.pointToolKinds(tools.pointToolContext(set.points)).includes('seal'));
});
test('セットの部位制約でも汎用ツボ道具を受け入れ、機械より優先する',()=>{
  const definitions=shop.buildPolicySetDefinitions({mode:'steady',policyKeys:['nukumeru','yurumeru'],symptomKey:'neck_shoulder',lifeKeys:[],triggerFactors:[],profileLike:{},pointContext:context});
  const slot=definitions[0].slots.find(x=>x.category==='point');
  const stick={category:'point',title:'丸い先端のツボ押し棒',productRole:'tsubo_support'};
  const seal={category:'point',title:'家庭用 鍼シール 一般医療機器',productRole:'tsubo_support'};
  const machine={category:'point',title:'首 肩 マッサージガン',productRole:'neck_shoulder_release'};
  assert.equal(shop.itemMatchesSlot(stick,slot),true);
  assert.equal(shop.itemMatchesSlot(seal,slot),true);
  assert.ok(shop.scoreKitCandidate(stick,slot,{mode:'steady'})>shop.scoreKitCandidate(machine,slot,{mode:'steady'}));
  assert.match(shop.buildPointUseGuide(seal,slot,{}),/曲池.*ラインケア/);
  assert.equal(shop.itemMatchesSlot(seal,{...slot,pointToolContext:{codes:['ST36'],lineCodes:[],warming:false}}),false);
  assert.equal(shop.itemMatchesSlot({category:'point',title:'お灸 ソフト 管理医療機器'},{...slot,pointToolContext:{codes:['ST36'],warming:false}}),true);
});

test('お腹の気海・中脘にはお灸を案内する',()=>{
  for (const code of ['CV6','CV12']) {
    const ctx=tools.pointToolContext([{code,source:'tcm'}]);
    assert.deepEqual(tools.pointToolKinds(ctx),['moxa']);
    assert.equal(tools.pointToolGuides({code})[0].kind,'moxa');
    const rows=plan(ctx,['yurumeru']);
    assert.equal(rows[0].pointToolKind,'moxa');
    assert.match(rows[0].reason,new RegExp(tools.pointToolName(code)));
  }
});
test('セット候補はお灸をツボ押し棒より先にする',()=>{
  const definitions=shop.buildPolicySetDefinitions({mode:'steady',policyKeys:['yurumeru'],symptomKey:'neck_shoulder',lifeKeys:[],triggerFactors:[],profileLike:{},pointContext:context});
  const slot=definitions[0].slots.find(x=>x.category==='point');
  const common={category:'point',productRole:'tsubo_support'};
  assert.ok(shop.scoreKitCandidate({...common,title:'お灸 ソフト'},slot,{mode:'steady'}) > shop.scoreKitCandidate({...common,title:'ツボ押し棒'},slot,{mode:'steady'}));
});

test('APIの商品件数を絞るときもお灸を残す',()=>{
 const items=[{title:'お灸',itemCode:'m',sourceKey:'point_care',pointToolKind:'moxa',score:1}, ...Array.from({length:25},(_,i)=>({title:'棒'+i,itemCode:'s'+i,sourceKey:'point_care',pointToolKind:'stick',score:100}))];
 const selected=route.selectBalancedItems(items,[],{displayLimit:8,totalLimit:24});
 assert.equal(selected[0].pointToolKind,'moxa');
});

test('道具対象外のツボへ商品取得失敗時のお灸検索を出さない',()=>{
 assert.equal(shop.fallbackSearchQuery([], 'point', {codes:['GB20']}),'');
 assert.match(shop.fallbackSearchQuery([], 'point', {codes:['CV12']}),/お灸/);
 assert.match(shop.fallbackSearchQuery([], 'point'),/お灸/);
});
test('手足と頭のツボが混在しても道具の対象名を区別する',()=>{
 const context={codes:['GB20','CV12','LI11','ST45'],lineCodes:['LI11','ST45']};
 assert.deepEqual(tools.pointToolTargetNames(context),['中脘','曲池']);
 const rows=tools.pointToolQueryRows(context);
 assert.ok(rows.every(row=>!row.reason.includes('風池')&&!row.reason.includes('厲兌')));
 assert.ok(rows.find(row=>row.pointToolKind==='moxa').reason.includes('中脘'));
 assert.ok(!rows.find(row=>row.pointToolKind==='stick').reason.includes('中脘'));
});
