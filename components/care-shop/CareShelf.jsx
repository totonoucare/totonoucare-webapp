"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getTemporaryResult, temporaryHeaders } from "@/lib/guestExperienceClient";
import { getJstTodayTomorrow, getRiskContext, resolveDisplayedCarePlan } from "@/app/radar/utils";
import { recipeMaterials, shelfFromPlan } from "@/lib/care-shop/recipeShelf";
import { trackV126 } from "@/lib/experienceFunnelV126";
import s from "./shelf.module.css";

const categories = [
  ["eat","食材・お茶","sasaeru"],["point","ツボケアの道具","meguraseru"],["live","暮らしのケア用品","nukumeru"],
];
export default function CareShelf({ recipe, mode, from, onBrowse, onSave, saved, saving }) {
  const selected = recipeMaterials(recipe).length ? recipe : "";
  const [names,setNames] = useState([]);
  const [loaded,setLoaded] = useState(false);
  const [items,setItems] = useState({});
  useEffect(()=>{
    if(selected) return;
    const controller=new AbortController();
    async function load(){
      const { data }=await supabase.auth.getSession();
      const token=data?.session?.access_token;
      if (!token && !getTemporaryResult()) return;
      const {today}=getJstTodayTomorrow();
      const response=await fetch((token?"/api/radar/v1/forecast":"/api/guest/forecast")+"?date="+today,{
        headers:token?{Authorization:"Bearer "+token}:temporaryHeaders(),cache:"no-store",signal:controller.signal});
      if(!response.ok) return;
      const bundle=await response.json();
      if(!bundle.forecast || (bundle.target_date || bundle.forecast.target_date)!==today) return;
      const plan=resolveDisplayedCarePlan({forecast:bundle.forecast,riskContext:getRiskContext(bundle),mode:"today",targetDate:today,storedCarePlan:bundle.care_plan});
      if(!controller.signal.aborted) setNames(shelfFromPlan(plan));
    }
    load().catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLoaded(true);});
    return ()=>controller.abort();
  },[selected]);
  const choices=selected?[selected]:names;
  const rows=[];
  for(const name of choices) for(const m of recipeMaterials(name)) {
    if(rows.length<3 && !rows.some(row=>row.id===m.id)) rows.push({...m,recipe:name});
  }
  const ids=rows.map(row=>row.id).join(",");
  useEffect(()=>{
    if(!ids) return;
    const controller=new AbortController();
    async function load(id){
      let list=[];
      try {
        const res=await fetch("/api/care-navi/rakuten",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({material:id}),signal:controller.signal});
        if(res.ok) list=(await res.json()).items || [];
      } catch {}
      if(!controller.signal.aborted) setItems(old=>({...old,[id]:list}));
    }
    ids.split(",").forEach(load);
    trackV126("shop_shelf_view",{category:"eat",mode,source:from});
    return ()=>controller.abort();
  },[ids,mode,from]);
  const outbound=()=>trackV126("shop_outbound",{category:"eat",mode,source:from});
  return <div className={s.shelf}>
    <section className={s.feature}>
      <div className={s.intro}><p>{selected ? (mode==="tomorrow"?"明日":"今日")+"の食べるケア" : "食べるケア"}</p>
      <h2>{selected ? selected+"の材料" : names.length?"今日のケアで使うもの":"食材とケア用品"}</h2></div>
      {rows.length>0 && <small className={s.disclosure}>広告・紹介リンクを含みます</small>}
      {rows.map(m=>{
        const item=items[m.id]?.[0];
        return <article key={m.id} className={s.card}>
          <div className={s.caption}><strong>{m.label}</strong><span>{m.recipe}に</span></div>
          {item ? <div className={s.product}>
            {item.imageUrl && <img src={item.imageUrl} alt="" width="84" height="84" loading="lazy"/>}
            <div><p>{item.displayTitle}</p><b>{item.price.toLocaleString("ja-JP")}円</b>
            <div className={s.actions}><a href={item.itemUrl} target="_blank" rel="sponsored noopener noreferrer" onClick={outbound}>楽天で見る ↗</a>
              <button aria-label={saved(item)?"保存済み":"気になるに保存"} aria-pressed={saved(item)} disabled={saving} onClick={()=>onSave(item)}>{saved(item)?"♥":"♡"}</button></div></div>
          </div> : items[m.id] ? <a className={s.compare} onClick={outbound} target="_blank" rel="sponsored noopener noreferrer" href={"https://search.rakuten.co.jp/search/mall/"+encodeURIComponent(m.query)+"/"}>{m.label}を楽天で探す ↗</a> :
            <small role="status">商品を確認中…</small>}
        </article>;
      })}
      {!rows.length && (loaded ? <Link className={s.compare} href="/radar">自分の予報とケアを見る →</Link> : <small role="status">今日の予報を確認中…</small>)}
    </section>
    <section className={s.browse}><h3>目的から探す</h3>
      {categories.map(([key,label,icon])=><button key={key} onClick={()=>onBrowse(key)}><img alt="" width="34" height="34" src={"/illust/policy/policy-"+icon+".svg"}/><span>{label}</span><i>›</i></button>)}
      <button className={s.guided} onClick={()=>onBrowse("guided")}><span>今の悩みから探す<small>ケア用品・サプリ・漢方薬</small></span><i>›</i></button>
    </section>
  </div>;
}
