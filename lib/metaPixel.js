"use client";
const PIXEL='1506940704023332',SRC='https://connect.facebook.net/en_US/fbevents.js';
const ATTR='mibyo_campaign_attribution_v1';
const KEYS=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'];
const inBrowser=()=>typeof window!=='undefined'&&typeof document!=='undefined';
export function captureCampaignAttribution(){
 if(!inBrowser())return {};
 try{
  const url=new URL(window.location.href),raw=window.sessionStorage.getItem(ATTR);
  const parsed=raw?JSON.parse(raw):{};
  const old=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  const captured={};
  for(const key of KEYS){const value=url.searchParams.get(key);if(value)captured[key]=value.slice(0,500);}
  if(Object.keys(captured).length){const data={...old,...captured,captured_at:new Date().toISOString()};window.sessionStorage.setItem(ATTR,JSON.stringify(data));return data;}
  return old;
 }catch{return {};}
}
export function trackAppInitialPageView(){
 try{
  if(!inBrowser())return false;
  captureCampaignAttribution();
  if(window.__mibyoInitialPageViewQueued)return false;
  // Authentication callback first consumes and removes credentials from its URL.
  if(window.location.pathname==='/auth/callback'&&(window.location.search||window.location.hash))return false;
  window.__mibyoMetaTrackingVersion='v7.79.77';
  if(!window.fbq){
   const q=function(){if(q.callMethod)q.callMethod.apply(q,arguments);else q.queue.push(arguments);};
   q.queue=[];q.push=q;q.loaded=true;q.version='2.0';window.fbq=q;if(!window._fbq)window._fbq=q;
  }
  // Disable SDK-generated virtual PageViews, in addition to automatic events.
  window.fbq.disablePushState=true;
  if(!window.__mibyoMetaPixelInitialized){
   window.fbq('set','autoConfig',false,PIXEL);
   window.fbq('init',PIXEL);
   window.__mibyoMetaPixelInitialized=true;
  }
  if(!document.querySelector(`script[src="${SRC}"]`)){
   const script=document.createElement('script');script.async=true;script.src=SRC;script.referrerPolicy='origin';document.head.appendChild(script);
  }
  window.fbq('track','PageView');
  // Window lifetime = browser document; survives component remounts and SPA navigation.
  window.__mibyoInitialPageViewQueued=true;
  return true;
 }catch{return false;}
}
