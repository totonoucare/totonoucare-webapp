'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabaseClient';
import {SURVEYS,dayKey,summarizeExperience,surveyEligible,isQuietExperiencePath} from '@/lib/experience/policy';
const Context=createContext(null),pendingKey='mibyo-result-feedback-pending-v73';
const readPending=()=>{try{return sessionStorage.getItem(pendingKey);}catch{return null;}};
const writePending=value=>{try{value==null?sessionStorage.removeItem(pendingKey):sessionStorage.setItem(pendingKey,value);}catch{}};
export function useExperience(){return useContext(Context);}
export function useExperienceSlot(id,eligible,priority){
 const c=useExperience(),register=c?.register;
 useEffect(()=>{if(!register)return;register(id,eligible,priority);return()=>register(id,false,priority);},[register,id,eligible,priority]);
 return {allowed:c?.slot?.id===id&&!c?.blocked,finish:c?.finish,ready:c?.hardwareReady||false};
}
function busyScreen(inputUntil){
 const editing=document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
 const dialog=[...document.querySelectorAll('[role="dialog"],[aria-modal="true"],[data-experience-block]')].some(el=>!el.closest('[data-experience]')&&el.getClientRects().length);
 const consulting=window.location.pathname==='/records'&&new URLSearchParams(window.location.search).get('tab')==='consult';
 return Boolean(editing||dialog||consulting||Date.now()<inputUntil||document.visibilityState!=='visible');
}
export default function ExperienceProvider({children}){
 const pathname=usePathname(),router=useRouter();
 const [user,setUser]=useState(null),[data,setData]=useState(null),[slot,setSlot]=useState(null),[requests,setRequests]=useState({});
 const [pulse,setPulse]=useState(0),[blocked,setBlocked]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const session=useRef(null),queue=useRef(Promise.resolve()),pending=useRef([]),boundary=useRef(0),closedBoundary=useRef(-1),cooldown=useRef(0),epoch=useRef(0),sent=useRef(new Set());
 const inputUntil=useRef(0),lastKind=useRef(null),slotRef=useRef(null);slotRef.current=slot;
 const refresh=useCallback(async()=>{
  const s=session.current;if(!s)return;const n=++epoch.current;
  try{const res=await fetch('/api/experience',{headers:{Authorization:`Bearer ${s.access_token}`},cache:'no-store'});const json=await res.json();
   if(session.current?.user.id===s.user.id&&n===epoch.current)setData(res.ok?json.data:null);
  }catch{if(n===epoch.current)setData(null);}
 },[]);
 const send=useCallback(body=>{
  const uid=session.current?.user.id;
  const task=async()=>{
   const s=session.current;if(!s||s.user.id!==uid)throw Error('ログインを確認してください');
   const res=await fetch('/api/experience',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.access_token}`},body:JSON.stringify(body)});
   const json=await res.json();if(!res.ok)throw Error(json.error||'保存できませんでした');
   if(session.current?.user.id!==uid)throw Error('ログインが切り替わりました');
   await refresh();return json;
  };
  const result=queue.current.then(task,task);queue.current=result.catch(()=>{});return result;
 },[refresh]);
 const signal=useCallback(detail=>{
  if(!session.current){pending.current.push(detail);pending.current=pending.current.slice(-10);return;}
  const {feature,mode}=detail;boundary.current++;lastKind.current=feature;setPulse(x=>x+1);
  if(feature==='record')inputUntil.current=0;
  const events=[];
  if(['forecast','care','record','analysis','consult','shop','feedback'].includes(feature))events.push({type:'use',id:feature});
  if(feature==='forecast')events.push({type:'milestone',id:'forecast'});
  if(feature==='care')events.push({type:'milestone',id:'care_viewed'});
  if(feature==='care_recorded'){events.push({type:'use',id:'care'});events.push({type:'milestone',id:'care_recorded',mode});}
  for(const event of events){const key=`${session.current.user.id}|${event.type}:${event.id}:${dayKey()}`;if(sent.current.has(key))continue;sent.current.add(key);send(event).catch(()=>sent.current.delete(key));}
  if(feature==='record')refresh();
 },[send,refresh]);
 useEffect(()=>{
  if(!supabase)return;let live=true,authChanged=false;
  const change=s=>{
   if(!live)return;const changed=session.current?.user.id!==s?.user.id;session.current=s;
   if(changed){epoch.current++;setUser(s?.user||null);setData(null);setSlot(null);setError('');setBusy(false);queue.current=Promise.resolve();sent.current.clear();closedBoundary.current=-1;cooldown.current=0;lastKind.current=null;inputUntil.current=0;}
   if(s){refresh();pending.current.splice(0).forEach(signal);const a=readPending();if(a)send({type:'survey',id:'result',answer:a}).then(()=>writePending(null)).catch(()=>{});}
  };
  supabase.auth.getSession().then(({data})=>{if(!authChanged)change(data.session);}).catch(()=>{});
  const {data:listener}=supabase.auth.onAuthStateChange((_event,s)=>{authChanged=true;setTimeout(()=>change(s),0);});
  return()=>{live=false;listener.subscription.unsubscribe();};
 },[refresh,send,signal]);
 useEffect(()=>{const fn=e=>signal(e.detail||{});window.addEventListener('mibyo-experience',fn);return()=>window.removeEventListener('mibyo-experience',fn);},[signal]);
 useEffect(()=>{
  boundary.current++;lastKind.current=null;inputUntil.current=0;setPulse(x=>x+1);
  if(slotRef.current){cooldown.current=Date.now()+120000;closedBoundary.current=boundary.current;}
  setSlot(null);setError('');refresh();if(pathname==='/care-navi')signal({feature:'shop'});
 },[pathname,refresh,signal]);
 useEffect(()=>{
  const update=()=>{setBlocked(busyScreen(inputUntil.current));setPulse(x=>x+1);};
  const pointer=e=>{if(e.target.closest?.('[data-experience-form]')){inputUntil.current=Date.now()+180000;update();}};
  document.addEventListener('pointerdown',pointer);document.addEventListener('focusin',update);document.addEventListener('visibilitychange',update);
  const timer=setInterval(update,1000);update();
  return()=>{clearInterval(timer);document.removeEventListener('pointerdown',pointer);document.removeEventListener('focusin',update);document.removeEventListener('visibilitychange',update);};
 },[]);
 const summary=useMemo(()=>summarizeExperience(data?.rows||[]),[data]);
 const hardwareReady=Boolean(data&&summary.map['milestone:care_viewed']);
 const register=useCallback((id,eligible,priority)=>setRequests(old=>old[id]?.eligible===eligible&&old[id]?.priority===priority?old:{...old,[id]:{eligible,priority}}),[]);
 const finish=useCallback(()=>{const current=slotRef.current;cooldown.current=Date.now()+120000;closedBoundary.current=boundary.current;if(current?.kind==='hardware')send({type:'hardware',id:current.id}).catch(()=>{});setSlot(null);setError('');},[send]);
 useEffect(()=>{
  if(!user||!data||slot||blocked||isQuietExperiencePath(pathname)||Date.now()<cooldown.current||boundary.current<=closedBoundary.current)return;
  const map=summary.map,candidates=[];
  if(pathname==='/radar'&&map['milestone:forecast']&&!map['guide:forecast'])candidates.push({id:'forecast',kind:'guide',priority:100,title:'あなたの体調予報です',text:'体質と、この地域の天気を合わせた予報です。下の対策ケアで、食事や過ごし方を確認できます。',button:'ケアを見る'});
  if(pathname==='/radar'&&map['milestone:care_recorded']&&!map['guide:care']){const tomorrow=map['milestone:care_recorded'].payload?.mode==='tomorrow';candidates.push({id:'care',kind:'guide',priority:90,title:'ケアを記録しました',text:tomorrow?'今夜のケアを、明日に向けた記録として残しました。明日の体調と合わせて振り返れます。':'今日の体調も残すと、あとでケアと一緒に振り返れます。',button:tomorrow?null:'体調を記録する'});}
  if(data.access?.analysis_enabled&&data.recordDays>=3&&pathname==='/records'&&!map['guide:reflection']&&new URLSearchParams(window.location.search).get('tab')!=='analysis')candidates.push({id:'reflection',kind:'guide',priority:95,title:'3日分の体調記録がそろいました',text:'ミモルと、予報・体調・試したケアを振り返れます。',button:'振り返りを見る'});
  if(['care','care_recorded','record'].includes(lastKind.current))for(const id of ['barrier','value'])if(surveyEligible(id,data))candidates.push({id,kind:'survey',priority:id==='barrier'?75:70});
  if(hardwareReady)for(const [id,r] of Object.entries(requests)){const prior=data.rows.some(row=>row.event_key.startsWith(`hardware:${id}:`)&&Date.now()-Date.parse(row.created_at)<14*86400000);if(r.eligible&&!prior)candidates.push({id,kind:'hardware',priority:r.priority});}
  const candidate=candidates.sort((a,b)=>b.priority-a.priority)[0];if(!candidate)return;
  const timer=setTimeout(()=>{if(busyScreen(inputUntil.current))return;setSlot(candidate);if(candidate.kind==='guide')send({type:'guide',id:candidate.id}).catch(()=>{});},500);
  return()=>clearTimeout(timer);
 },[pulse,user,data,slot,blocked,pathname,summary,requests,hardwareReady,send]);
 useEffect(()=>{if(slot?.kind==='hardware'&&!requests[slot.id]?.eligible)finish();},[slot,requests,finish]);
 const answer=async(id,choice)=>{setBusy(true);setError('');try{await send({type:'survey',id,answer:choice});finish();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const close=()=>slot?.kind==='survey'?answer(slot.id,'skip'):finish();
 const go=()=>{const id=slot?.id;finish();if(id==='forecast')document.getElementById('daily-care-section')?.scrollIntoView({behavior:'smooth',block:'start'});if(id==='care')router.push('/records');if(id==='reflection')router.push('/records?tab=analysis');};
 return <Context.Provider value={{user,data,slot,blocked,hardwareReady,register,finish,send,refresh}}>{children}
 {slot&&slot.kind!=='hardware'&&!blocked&&!isQuietExperiencePath(pathname)?<aside data-experience role="region" aria-label={slot.kind==='survey'?'使ってみた感想':'使い方の案内'} className="fixed inset-x-0 z-[85] mx-auto max-w-md px-4" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 96px)'}}>
 <div className="max-h-[65vh] overflow-y-auto rounded-3xl border border-[#CFE7DE] bg-white p-5 shadow-xl">
 <div className="flex items-start justify-between gap-3"><p className="text-sm font-bold text-[#24564C]">{slot.kind==='survey'?'使ってみて、教えてください':slot.title}</p><button type="button" disabled={busy} onClick={close} aria-label="案内を閉じる" className="px-2">×</button></div>
 {slot.kind==='survey'?<><p className="my-3 font-bold">{SURVEYS[slot.id].question}</p><div className="grid gap-2">{SURVEYS[slot.id].options.map(([key,label])=><button type="button" disabled={busy} key={key} onClick={()=>answer(slot.id,key)} className="rounded-xl border border-[#DCE7DE] px-3 py-2 text-left text-sm disabled:opacity-50">{label}</button>)}</div><button type="button" onClick={close} disabled={busy} className="mt-3 text-sm text-slate-500">スキップ</button></>:<><p className="my-3 text-sm leading-6">{slot.text}</p><div className="flex gap-3">{slot.button?<button type="button" onClick={go} className="rounded-full bg-[#2F816E] px-4 py-2 text-sm font-bold text-white">{slot.button}</button>:null}<button type="button" onClick={finish} className="px-3 py-2 text-sm text-slate-500">{slot.button?'あとで':'閉じる'}</button></div></>}
 {error?<p role="alert" className="mt-2 text-sm text-red-700">{error}。もう一度お試しください。</p>:null}</div></aside>:null}
 </Context.Provider>;
}
export function ResultFeedback(){
 const c=useExperience();const [answer,setAnswer]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const handled=c?.data?.rows?.some(row=>row.event_key==='survey:result');
 useEffect(()=>{setAnswer(readPending());setError('');},[c?.user?.id]);
 if(handled||answer==='skip')return null;
 async function submit(choice){setBusy(true);setError('');try{if(c?.user)await c.send({type:'survey',id:'result',answer:choice});else writePending(choice);setAnswer(choice);}catch{setError('回答を保存できませんでした。もう一度お試しください。');}finally{setBusy(false);}}
 return <section className="my-5 rounded-2xl bg-white p-4 ring-1 ring-[#DCE7DE]" aria-label="体質チェックの感想">{answer?<p className="text-sm text-[#24564C]">ありがとうございます。{!c?.user?'回答は、この端末から登録・ログインしたときに送信します。':'改善に役立てます。'}</p>:<><p className="mb-3 text-sm font-bold">{SURVEYS.result.question}</p><div className="grid gap-2">{SURVEYS.result.options.map(([key,label])=><button type="button" disabled={busy} key={key} onClick={()=>submit(key)} className="rounded-xl border px-3 py-2 text-left text-sm">{label}</button>)}</div><button type="button" disabled={busy} onClick={()=>submit('skip')} className="mt-2 text-xs text-slate-500">回答せず閉じる</button>{error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}</>}</section>;
}
