// Browser regression with synthetic identities, replies and marketplace results.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
const {chromium} = await import(process.env.MIBYO_QA_PLAYWRIGHT || "playwright");
const origin="http://127.0.0.1:3128";
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p","3128"],{stdio:"ignore"});
const threadId="39094a2d-c416-4342-a280-54caaeceac55";
const user={id:"49985f64-6e43-4998-8468-eafa60ddbd88",email:"fixture@example.invalid",aud:"authenticated",role:"authenticated"};
const exp=Math.floor(Date.now()/1000)+3600;
const payload=Buffer.from(JSON.stringify({sub:user.id,exp,role:user.role})).toString("base64url");
const session={access_token:"eyJhbGciOiJIUzI1NiJ9."+payload+".mock",refresh_token:"fixture",token_type:"bearer",expires_in:3600,expires_at:exp,user};
const date=new Date().toISOString(),messages=[],errors=[];
const record=()=>({id:threadId,title:messages[0]?.body,turns:messages.length,created_at:date,updated_at:date});
let browser;
try {
  for(let attempt=0;attempt<100;attempt++){try{if((await fetch(origin+"/expert")).ok)break;}catch{}await wait(200);}
  const shell=process.env.MIBYO_QA_CHROMIUM_PACKAGE ? (await import(process.env.MIBYO_QA_CHROMIUM_PACKAGE)).default:null;
  const launch=async()=>chromium.launch({executablePath:process.env.MIBYO_QA_CHROMIUM || (shell?await shell.executablePath():"/usr/bin/chromium"),args:shell?.args || ["--no-sandbox"]});
  for(const width of [390,820]){
    browser=await launch();
    messages.length=0;
    const ctx=await browser.newContext({viewport:{width,height:width===390?844:1180},reducedMotion:"reduce"});
    await ctx.addInitScript(s=>localStorage.setItem("sb-test-project-auth-token",JSON.stringify(s)),session);
    await ctx.route("https://test-project.supabase.co/**",r=>r.fulfill({json:user}));
    const materials=new Set();let entitled=false;
    await ctx.route("**/api/**",async r=>{
      const req=r.request(),url=new URL(req.url());
      if(url.pathname==="/api/expert"){
        if(req.method()==="POST"){
          const input=req.postDataJSON();assert.equal(input.expectedTurns,messages.length);
          messages.push({body:input.body,turn:messages.length+1,created_at:date});
          return r.fulfill({json:{threadId}});
        }
        if(url.searchParams.has("thread"))return r.fulfill({json:{thread:record(),messages}});
        return r.fulfill({json:{accepting:true,entitled,available:2,threads:messages.length?[record()]:[],more:false}});
      }
      if(url.pathname==="/api/care-navi/rakuten"){
        const m=req.postDataJSON().material;materials.add(m);
        return r.fulfill({json:{items:m==="jujube"?[{title:"乾燥なつめ",displayTitle:"乾燥なつめ",price:680,itemUrl:"https://item.rakuten.co.jp/demo/1",itemCode:"demo:1"}]:[]}});
      }
      return r.fulfill({json:{ok:true,data:{}}});
    });
    const p=await ctx.newPage();p.setDefaultTimeout(9000);
    p.on("pageerror",e=>errors.push(e.message));
    await p.goto(origin+"/expert");
    await p.getByRole("button",{name:"月額580円で利用する"}).waitFor();
    entitled=true;await p.getByRole("button",{name:"更新",exact:true}).click();
    await p.getByRole("button",{name:"質問を書く"}).click();
    const box=p.getByRole("textbox");
    await box.fill("今日のセルフケアについて");await box.press("Enter");await box.pressSequentially("test");
    assert.match(await box.inputValue(),/\ntest$/);assert.equal(messages.length,0);
    await p.getByRole("button",{name:"送信する"}).click();
    await p.getByText("返信待ち",{exact:true}).waitFor();
    await p.goto(origin+"/expert/manage?thread="+threadId);
    await p.getByLabel("返信を書く").fill("お返事です。");await p.getByRole("button",{name:"送信する"}).click();
    await p.getByText("回答あり",{exact:true}).waitFor();
    await p.goto(origin+"/expert?thread="+threadId);await p.getByLabel("追加で質問する").fill("続きです。");
    await p.getByRole("button",{name:"送信する"}).click();await p.getByText("追加質問・返信待ち",{exact:true}).waitFor();
    await p.goto(origin+"/expert/manage?thread="+threadId);
    await p.getByLabel("返信を書く").fill("最後のお返事です。");await p.getByRole("button",{name:"送信する"}).click();
    await p.getByText("この相談は完了しました。").waitFor();assert.equal(messages.length,4);
    await p.goto(origin+"/care-navi?"+new URLSearchParams({recipe:"なつめ龍眼茶",mode:"tomorrow",from:"forecast"}));
    await p.getByText("明日の食べるケア",{exact:true}).waitFor();
    await p.getByText("乾燥なつめ",{exact:true}).waitFor();await p.getByRole("link",{name:/龍眼肉を楽天で探す/}).waitFor();
    assert.deepEqual([...materials].filter(Boolean).sort(),["jujube","longan"]);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(process.env.MIBYO_QA_SCREEN_DIR)await p.screenshot({path:process.env.MIBYO_QA_SCREEN_DIR+"/shop-"+width+".png"});
    await browser.close();browser=null;console.log("PASS",width,"px: premium access, newline, four message conversation, tomorrow ingredient link and marketplace fallback");
  }
  assert.deepEqual(errors,[]);
} finally {await browser?.close();server.kill();}
