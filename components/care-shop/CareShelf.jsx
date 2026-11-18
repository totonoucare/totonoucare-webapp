"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getJstTodayTomorrow } from "@/app/radar/utils";
import { materialsForDays, recipeMaterials } from "@/lib/care-shop/recipeShelf";
import { recipesForForecast } from "@/lib/care-shop/forecastRecipes";
import { trackV126 } from "@/lib/experienceFunnelV126";
import { IconFood, IconTsubo, IconLifestyle } from "@/components/illust/icons/app";
import s from "./shelf.module.css";

const categories = [
  {key: "eat", label: "食材・お茶", Icon: IconFood, tone: "bg-[#FFF4DB] text-[#885B17]"},
  {key: "point", label: "ツボケアの道具", Icon: IconTsubo, tone: "bg-[#F3EBF5] text-[#795780]"},
  {key: "live", label: "暮らしのケア用品", Icon: IconLifestyle, tone: "bg-[#E7F3ED] text-[#367960]"},
];
export default function CareShelf({ todayBundle, tomorrowBundle, loading, recipe, mode, from, onBrowse, onSave, saved, saving }) {
  const selected = recipeMaterials(recipe).length ? recipe : "";
  const [items,setItems] = useState({});
  const { today, tomorrow } = getJstTodayTomorrow();
  const rows = useMemo(() => {
    if (selected) return materialsForDays([{ day: mode, recipes: [selected] }]);
    return materialsForDays([
      { day: "today", recipes: recipesForForecast(todayBundle, "today", today) },
      { day: "tomorrow", recipes: recipesForForecast(tomorrowBundle, "tomorrow", tomorrow) },
    ]);
  }, [selected, mode, todayBundle, tomorrowBundle, today, tomorrow]);
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
      <h2>{selected ? selected+"の材料" : rows.length?"ケアに使う食材とお茶":"食材とケア用品"}</h2></div>
      {rows.length>0 && <small className={s.disclosure}>広告・紹介リンクを含みます</small>}
      {rows.map(m=>{
        const item=items[m.id]?.[0];
        return <article key={m.id} className={s.card}>
          <div className={s.caption}><strong>{m.label}</strong></div>
          <div className={s.uses}>{[...new Set(m.uses.map(u => u.recipe))].map(name => {
            const days = m.uses.filter(u => u.recipe === name).map(u => u.day === "today" ? "今日" : "明日");
            return <p key={name}>{!selected && <small>{days.join("・")}</small>}{name}に使う</p>;
          })}</div>
          {item ? <div className={s.product}>
            {item.imageUrl && <img src={item.imageUrl} alt="" width="84" height="84" loading="lazy"/>}
            <div><p>{item.displayTitle}</p><b>{item.price.toLocaleString("ja-JP")}円</b>
            <div className={s.actions}><a href={item.itemUrl} target="_blank" rel="sponsored noopener noreferrer" onClick={outbound}>楽天で見る ↗</a>
              <button aria-label={saved(item)?"保存済み":"気になるに保存"} aria-pressed={saved(item)} disabled={saving} onClick={()=>onSave(item)}>{saved(item)?"♥":"♡"}</button></div></div>
          </div> : items[m.id] ? <a className={s.compare} onClick={outbound} target="_blank" rel="sponsored noopener noreferrer" href={"https://search.rakuten.co.jp/search/mall/"+encodeURIComponent(m.query)+"/"}>{m.label}を楽天で探す ↗</a> :
            <small role="status">商品を確認中…</small>}
        </article>;
      })}
      {!rows.length && (!loading ? <Link className={s.compare} href="/radar">自分の予報とケアを見る →</Link> : <small role="status">予報を確認中…</small>)}
    </section>
    <section className={s.browse}><h3>目的から探す</h3>
      {categories.map(({key, label, Icon, tone}) => (
        <button key={key} onClick={() => onBrowse(key)}>
          <Icon className={`h-10 w-10 shrink-0 rounded-xl p-2 ${tone}`} />
          <span>{label}</span><i aria-hidden="true">›</i>
        </button>
      ))}
      <button className={s.guided} onClick={()=>onBrowse("guided")}><span>今の悩みから探す<small>ケア用品・サプリ・漢方薬</small></span><i>›</i></button>
    </section>
  </div>;
}
