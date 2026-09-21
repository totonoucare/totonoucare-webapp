const fs=require('fs'),assert=require('assert/strict');
const base=require('path').resolve(__dirname,'../..');
const qaModules=process.env.EXPERIENCE_QA_MODULES;
if(!qaModules)throw Error('Set EXPERIENCE_QA_MODULES to a directory with react 18, react-dom 18, jsdom 22 and @sinonjs/fake-timers 11');
const React=require(qaModules+'/react');
const {JSDOM}=require(qaModules+'/jsdom');
const {act}=React;
const swc=require(base+'/node_modules/next/dist/build/swc');
const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test/radar',pretendToBeVisual:true});
Object.assign(global,{window:dom.window,document:dom.window.document,sessionStorage:dom.window.sessionStorage,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=require(qaModules+'/react-dom/client');
let path='/radar',authCallback,rows=[],posts=[],uid='a',ctx;
const s=()=>({user:{id:uid},access_token:'token-'+uid});
const mockSupabase={auth:{getSession:async()=>({data:{session:s()}}),onAuthStateChange:cb=>{authCallback=cb;return {data:{subscription:{unsubscribe(){}}}}}}};
global.fetch=async(url,opts={})=>{
 if(opts.method==='POST'){let b=JSON.parse(opts.body);posts.push(b);let key=b.type==='milestone'?`milestone:${b.id}`:b.type==='use'?`use:${b.id}:2026-09-21`:`${b.type}:${b.id}`;
 if(!rows.some(r=>r.event_key===key))rows.push({event_key:key,payload:b,created_at:'2026-09-21T00:00:00Z'});
 return {ok:true,json:async()=>({data:{saved:true}})};}
 return {ok:true,json:async()=>({data:{rows:[...rows],access:{mode:'beta',analysis_enabled:true},recordDays:0}})};
};
function load(code,filename,imports={}){
 const out=swc.transformSync(code,{filename,jsc:{parser:{syntax:'ecmascript',jsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
 const m={exports:{}};new Function('require','module','exports',out.code)(name=>imports[name]||require(name==='react'?qaModules+'/react':name==='react/jsx-runtime'?qaModules+'/react/jsx-runtime':name),m,m.exports);return m.exports;
}
const policy=load(fs.readFileSync(base+'/lib/experience/policy.js','utf8'),'policy.js');
const mod=load(fs.readFileSync(base+'/components/experience/ExperienceProvider.jsx','utf8'),'provider.jsx',{'next/navigation':{usePathname:()=>path,useRouter:()=>({push(){}})},'@/lib/supabaseClient':{supabase:mockSupabase},'@/lib/experience/policy':policy});
const clock=require(qaModules+'/@sinonjs/fake-timers').install({now:Date.parse('2026-09-21T03:00:00Z'),toFake:['Date','setTimeout','clearTimeout','setInterval','clearInterval']});
function Probe(){ctx=mod.useExperience();mod.useExperienceSlot('pwa',true,20);return React.createElement('input',{id:'editing'})}
const root=createRoot(document.getElementById('root'));
async function tick(n){await act(async()=>{await clock.tickAsync(n)})}
async function render(){await act(async()=>root.render(React.createElement(mod.default,null,React.createElement(Probe))))}
async function signal(feature){await act(async()=>{window.dispatchEvent(new window.CustomEvent('mibyo-experience',{detail:{feature}}))})}
(async()=>{
 await render();await tick(10);await signal('forecast');
 await act(async()=>document.getElementById('editing').focus());await tick(1600);assert.equal(document.querySelector('aside'),null,'no prompt while editing');
 await act(async()=>document.getElementById('editing').blur());await tick(1000);await tick(600);assert.match(document.body.textContent,/あなたの体調予報です/);
 await act(async()=>document.querySelector('[aria-label="案内を閉じる"]').click());await tick(3000);assert.equal(document.querySelector('aside'),null,'no immediate chaining');
 await tick(120000);assert.equal(document.querySelector('aside'),null,'new boundary required');
 await signal('care');await tick(600);assert.equal(document.querySelector('aside'),null,'guide once only');
 // A different account must not inherit the handled flag.
 rows=[];uid='b';await act(async()=>authCallback('SIGNED_IN',s()));await tick(10);await signal('forecast');await tick(600);assert.match(document.body.textContent,/あなたの体調予報です/);
 // External modal hides the card; it must not prevent normal app rendering.
 const dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.getClientRects=()=>[{}];document.body.append(dialog);await tick(1000);assert.equal(document.querySelector('aside'),null);dialog.remove();
 await act(async()=>root.unmount());clock.uninstall();console.log('UI lifecycle: 7 assertions passed (mock DOM; no live backend).');
})().catch(e=>{clock.uninstall();console.error(e);process.exitCode=1});
