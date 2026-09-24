"use client";
import {isLikelyNewSupabaseUser} from './metaRegistration';
export {isLikelyNewSupabaseUser} from './metaRegistration';
const PIXEL='1506940704023332',SRC='https://connect.facebook.net/en_US/fbevents.js';
const ATTR='mibyo_campaign_attribution_v1',PREFIX='mibyo_meta_v75:',ATTEMPT='mibyo_check_attempt_v75';
const KEYS=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'];
const inBrowser=()=>typeof window!=='undefined'&&typeof document!=='undefined';
const memory=new Set(),flights=new Map();
let ready=null,attemptMemory=null;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function get(key){try{return window.sessionStorage.getItem(key);}catch{return null;}}
function put(key,value){try{value===null?window.sessionStorage.removeItem(key):window.sessionStorage.setItem(key,value);}catch{}}
export function captureCampaignAttribution(){
 if(!inBrowser())return {};
 try{
  const url=new URL(window.location.href),old=JSON.parse(get(ATTR)||'{}'),captured={};
  for(const key of KEYS){const value=url.searchParams.get(key);if(value)captured[key]=value.slice(0,500);}
  if(Object.keys(captured).length){const data={...old,...captured,captured_at:new Date().toISOString()};put(ATTR,JSON.stringify(data));return data;}
  return old;
 }catch{return {};}
}
function allowedPath(){const p=window.location.pathname;return ['/check','/check/run','/auth/callback'].includes(p)&&!(p==='/auth/callback'&&(window.location.search||window.location.hash));}
async function ensureReady(){
 try{
  if(!inBrowser()||!allowedPath())return false;
  if(ready)return await ready;
  ready=(async()=>{
   captureCampaignAttribution();
   if(!window.fbq){const q=function(){if(q.callMethod)q.callMethod.apply(q,arguments);else q.queue.push(arguments);};q.queue=[];q.push=q;q.loaded=true;q.version='2.0';window.fbq=q;if(!window._fbq)window._fbq=q;}
   if(!window.__mibyoMetaPixelInitialized){
    window.fbq('set','autoConfig',false,PIXEL);
    window.fbq('init',PIXEL);
    window.__mibyoMetaPixelInitialized=true;
   }
   if(!document.querySelector(`script[src="${SRC}"]`)){const s=document.createElement('script');s.async=true;s.src=SRC;s.referrerPolicy='origin';document.head.appendChild(s);}
   const until=Date.now()+1500;
   while(Date.now()<until){if(window.fbq?.callMethod)return true;await sleep(50);}
   return false;
  })();
  const ok=await ready;if(!ok)ready=null;return ok;
 }catch{ready=null;return false;}
}
async function once(command,name,key){
 if(!inBrowser())return false;
 const guard=PREFIX+key;if(memory.has(guard)||get(guard)==='1')return false;
 if(flights.has(guard))return flights.get(guard);
 const task=(async()=>{try{
  if(!await ensureReady()||!allowedPath())return false;
  // Only the allowlisted event name is sent; no health/form/result/account values.
  window.fbq(command,name);memory.add(guard);put(guard,'1');return true;
 }catch{return false;}})();
 flights.set(guard,task);try{return await task;}finally{flights.delete(guard);}
}
export function trackMetaPageViewOnce(key='pageview'){return once('track','PageView',key);}
export function trackMetaCustomEventOnce(name,key=name){if(!['CheckStart','CheckComplete'].includes(name))return Promise.resolve(false);return once('trackCustom',name,key);}
export function trackMetaStandardEventOnce(name,key=name){if(name!=='CompleteRegistration')return Promise.resolve(false);return once('track',name,key);}
function attemptId(){
 if(!inBrowser())return null;
 if(attemptMemory)return attemptMemory;
 attemptMemory=get(ATTEMPT);
 if(!attemptMemory){attemptMemory=window.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;put(ATTEMPT,attemptMemory);}
 return attemptMemory;
}
export function trackCheckStart(){try{const id=attemptId();return id?trackMetaCustomEventOnce('CheckStart',`start:${id}`):Promise.resolve(false);}catch{return Promise.resolve(false);}}
export async function trackCheckComplete(){
 try{const id=attemptId();if(!id)return false;await trackCheckStart();const sent=await trackMetaCustomEventOnce('CheckComplete',`complete:${id}`);if(sent)await sleep(250);return sent;}catch{return false;}
}
export function finishCheckAttempt(){attemptMemory=null;put(ATTEMPT,null);}
export async function trackCompleteRegistrationIfNew(user,accessToken){
 try{
  if(!inBrowser()||!accessToken||!isLikelyNewSupabaseUser(user))return false;
  if(!await ensureReady()||window.location.pathname!=='/auth/callback')return false;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),1500);
  let result;
  try{const r=await fetch('/api/tracking/registration',{method:'POST',headers:{Authorization:`Bearer ${accessToken}`},signal:controller.signal});result=r.ok?await r.json():null;}finally{clearTimeout(timeout);}
  if(!result?.send)return false;
  const sent=await trackMetaStandardEventOnce('CompleteRegistration',`registration:${user.id}`);
  // Give the browser transport a brief opportunity before a full navigation.
  if(sent)await sleep(250);
  return sent;
 }catch{return false;}
}
