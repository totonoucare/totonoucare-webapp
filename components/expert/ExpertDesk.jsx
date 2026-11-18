"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExpertAvatar } from "@/components/records/ExpertConsultPreview";
import AppShell from "@/components/layout/AppShell";
import CheckoutButton from "@/components/billing/CheckoutButton";
import { supabase } from "@/lib/supabaseClient";
import styles from "./expert.module.css";

const statusLabel = turns => ({ 1:"返信待ち", 2:"回答あり", 3:"追加質問・返信待ち", 4:"完了" })[turns];
const dateLabel = value => new Intl.DateTimeFormat("ja-JP", { timeZone:"Asia/Tokyo", month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date(value));

async function callExpert(path, options = {}, endpoint = "/api/expert") {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("ログインしてください。");
  const response = await fetch(endpoint + path, { ...options, cache:"no-store",
    headers:{ Authorization:"Bearer " + data.session.access_token, "Content-Type":"application/json" } });
  const json = await response.json();
  if (!response.ok) throw Object.assign(new Error(json.error), { status:response.status });
  return json;
}

export function ManagementLink({ userId }) {
  const [allowed, setAllowed] = useState("");
  useEffect(() => {
    if (!userId) return;
    let active = true;
    callExpert("?role=1").then(r => { if (active && r.staff) setAllowed(userId); }).catch(() => {});
    return () => { active = false; };
  }, [userId]);
  return userId && allowed === userId ? <Link className={styles.portal} href="/expert/manage">相談管理を開く <span>→</span></Link> : null;
}

export function ExpertEntry() {
  return <Link href="/expert" className={styles.portal}><span><small>鍼灸師に聞く</small><strong>専門家に質問</strong></span><span>質問・返信を見る →</span></Link>;
}

function Conversation({ manage, initial }) {
  const [id,setId] = useState(initial);
  const [filter,setFilter] = useState("pending");
  const [offset,setOffset] = useState(0);
  const [revision,reload] = useState(0);
  const [payload,setPayload] = useState(null);
  const [error,setError] = useState("");
  const [draft,setDraft] = useState("");
  const [sending,setSending] = useState(false);
  const pending = useRef(null);
  const lock = useRef(false);
  const isNew = id === "new";
  const query = new URLSearchParams({ manage:manage ? "1":"0", filter, offset:String(offset) });
  if (id && !isNew) query.set("thread",id);
  const path = "?" + query;
  useEffect(() => {
    const controller = new AbortController();
    setPayload(null); setError("");
    async function load() {
      const url = new URL(window.location.href);
      const sessionId = url.searchParams.get("session_id");
      if (!manage && url.searchParams.get("checkout") === "success" && sessionId) {
        await callExpert("", {method:"POST",body:JSON.stringify({session_id:sessionId}),signal:controller.signal}, "/api/stripe/checkout/confirm");
        url.searchParams.delete("session_id");
        url.searchParams.delete("checkout");
        window.history.replaceState(window.history.state,"",url);
      }
      return callExpert(path,{signal:controller.signal});
    }
    load().then(r => { if (!controller.signal.aborted) setPayload(r); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  },[path,revision,isNew]);
  function open(next) {
    setId(next); setPayload(null); setDraft(""); setError(""); pending.current=null;
    const url=new URL(window.location.href);
    if(next && next!=="new") url.searchParams.set("thread",next); else url.searchParams.delete("thread");
    window.history.replaceState(window.history.state,"",url);
  }
  async function send(e) {
    e.preventDefault();
    const body=draft.trim();
    if(!body || lock.current) return;
    lock.current=true; setSending(true); setError("");
    if (pending.current?.body !== body) pending.current={body,requestId:crypto.randomUUID()};
    try {
      const r=await callExpert("",{method:"POST",body:JSON.stringify({ ...pending.current, manage, expectedTurns:isNew ? 0:t.turns, thread:isNew ? null:id })});
      open(r.threadId); reload(n=>n+1);
    } catch(e) { setError(e.message); }
    finally { lock.current=false; setSending(false); }
  }
  const t=payload?.thread;
  const canWrite=isNew ? payload?.accepting && payload.entitled && payload.available>0 : t && (manage ? t.turns%2===1 : t.turns===2);
  const refresh=<button className={styles.quiet} onClick={()=>reload(n=>n+1)} disabled={sending}>更新</button>;
  return <main className={styles.desk}>
    <div className={styles.heading}>{!manage && <ExpertAvatar className={styles.portrait}/>}<div><p>{manage?"未病レーダー 運営":"鍼灸師・小川亮太"}</p><h2>{manage?"相談管理":"専門家に質問"}</h2></div>{refresh}</div>
    {id ? <button className={styles.back} disabled={sending} onClick={()=>open("")}>← 相談一覧</button> : null}
    {error && <p role="alert" className={styles.alert}>{error}</p>}
    {!payload && !error && <p role="status">読み込み中…</p>}
    {!id && !manage && payload && <section className={styles.invite}><h3>セルフケアで迷ったら</h3>
      <p>体質トリセツの読み方や、ケアを試して気になったことを質問できます。小川が原則24時間以内に返信します。</p>
      <footer><span>{payload.entitled ? "今月あと"+payload.available+"件" : "月額580円プラン"}</span><span>月2件 · 各2往復まで</span></footer>
      {!payload.accepting ? <p>現在、質問受付の準備中です。</p> : payload.entitled ? <button className={styles.primary} disabled={!payload.available} onClick={()=>open("new")}>質問を書く</button> :
        <CheckoutButton returnPath="/expert">月額580円で利用する</CheckoutButton>}
    </section>}
    {!id && manage && <div className={styles.filters}>{[["pending","返信待ち"],["all","すべて"]].map(([key,label])=><button key={key} aria-pressed={filter===key} onClick={()=>{setFilter(key);setOffset(0);}}>{label}</button>)}</div>}
    {!id && payload && <section className={styles.list}><h3>{manage && filter==="pending"?"返信を待っている相談":"相談履歴"}</h3>
      {!payload.threads.length && <p>{manage?"該当する相談はありません。":"質問を送ると、ここに返信が届きます。"}</p>}
      {payload.threads.map(row=><button key={row.id} onClick={()=>open(row.id)}>
        <div><span className={styles.tag}>{statusLabel(row.turns)}</span> <time>{dateLabel(row.updated_at)}</time></div>
        <strong>{row.title}</strong><span aria-hidden="true"> ›</span></button>)}
      {(offset>0 || payload.more) && <footer><button disabled={!offset} onClick={()=>setOffset(n=>n-20)}>前へ</button><button disabled={!payload.more} onClick={()=>setOffset(n=>n+20)}>次へ</button></footer>}
    </section>}
    {t && <section className={styles.messages}><header><h3>質問と返信</h3><span className={styles.tag}>{statusLabel(t.turns)}</span></header>
      {payload.messages.map(m=><article key={m.turn} data-role={m.turn%2?"customer":"expert"}>
        <small>{m.turn%2 ? (manage?"利用者":"あなた") : "小川亮太 · 鍼灸師"} <time>{dateLabel(m.created_at)}</time></small><p>{m.body}</p></article>)}
      {t.turns===4 && <small>この相談は完了しました。</small>}</section>}
    {canWrite && <form onSubmit={send} className={styles.form}><label htmlFor="expert-body">{manage?"返信を書く":isNew?"質問を書く":"追加で質問する"}</label>
      <textarea id="expert-body" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1600} rows={5} disabled={sending}
        placeholder={manage?"返信内容を入力":"気になっていることを、そのままお書きください。"} />
      <footer><small>{draft.length} / 1600</small><button className={styles.primary} disabled={sending || !draft.trim()}>{sending?"送信中…":"送信する"}</button></footer></form>}
  </main>;
}

export default function ExpertDesk({manage=false}) {
  const [user,setUser]=useState(undefined);
  const [initial,setInitial]=useState("");
  useEffect(()=>{
    setInitial(new URLSearchParams(location.search).get("thread") || "");
    if(!supabase){setUser(null);return;}
    const {data}=supabase.auth.onAuthStateChange((_,session)=>setUser(session?.user?.id || null));
    return ()=>data.subscription.unsubscribe();
  },[]);
  const url=(manage?"/expert/manage":"/expert")+(initial?"?thread="+encodeURIComponent(initial):"");
  return <AppShell wide={manage} title={manage?"相談管理":"専門家に質問"} subtitle="未病レーダー">
    {user ? <Conversation key={user} manage={manage} initial={initial}/> : user===null ?
      <Link className={styles.portal} href={"/signup?next="+encodeURIComponent(url)}>ログインして開く →</Link> : <p>ログイン状態を確認中…</p>}
  </AppShell>;
}
