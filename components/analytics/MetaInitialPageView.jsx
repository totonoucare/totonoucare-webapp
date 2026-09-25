'use client';
import {useEffect} from 'react';
import {trackAppInitialPageView} from '@/lib/metaPixel';
export default function MetaInitialPageView(){
 useEffect(()=>{
  trackAppInitialPageView();
  const ready=()=>trackAppInitialPageView();
  window.addEventListener('mibyo-auth-url-ready',ready);
  return()=>window.removeEventListener('mibyo-auth-url-ready',ready);
 },[]);
 return null;
}
