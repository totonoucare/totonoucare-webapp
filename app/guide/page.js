"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GuidePage() {
  const [session, setSession] = useState(null);
  const [ent, setEnt] = useState([]);
  const [cards, setCards] = useState([]);
  const [msg, setMsg] = useState("読み込み中…");

  async function authedFetch(path, opts = {}) {
    if (!supabase) throw new Error("supabase not ready");
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("not logged in");

    const res = await fetch(path, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setMsg("Supabaseが初期化できていません（環境変数未反映）。");
          return;
        }
        const { data } = await supabase.auth.getSession();
        const s = data.session || null;
        setSession(s);
        if (!s) {
          setMsg("ログイン後に利用できます。");
          return;
        }

        const entJson = await authedFetch("/api/entitlements/me");
        setEnt(entJson.data || []);

        const cardsJson = await authedFetch("/api/guide/cards");
        setCards(cardsJson.data || []);
        setMsg("");
      } catch (e) {
        console.error(e);
        setMsg(e?.message || "読み込みに失敗しました。");
      }
    })();

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });
      return () => sub?.subscription?.unsubscribe?.();
    }
  }, []);

  const hasGuide = ent.some((x) => x.product === "guide_all_access");

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!session) {
    return (
      <main style={{ padding: 16 }}>
        <h1>ととのうケアガイド</h1>
        <p>{msg}</p>
        <p>
          <a href="/signup">メールでログイン</a> ／ <a href="/check">体質チェックへ</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 900 }}>
      <h1>ととのうケアガイド</h1>
      <p style={{ opacity: 0.8 }}>ログイン中：{session.user?.email}</p>

      <p>
        <a href="/radar">未病レーダー</a> ／ <a href="/check">体質チェック</a> ／{" "}
        <button onClick={logout}>ログアウト</button>
      </p>

      <hr />

      {!hasGuide ? (
        <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h2>買い切りで全解放（300円想定）</h2>
          <p>
            いまは導線未実装です（後でStripe導線）。現在は「サンプルのみ」表示します。
          </p>
        </section>
      ) : null}

      <h2>{hasGuide ? "全カード一覧" : "サンプルカード"}</h2>

      {msg ? <p>{msg}</p> : null}

      <div style={{ display: "grid", gap: 12 }}>
        {cards.map((c) => (
          <div key={c.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{c.kind}</div>
            <h3 style={{ marginTop: 6 }}>{c.title}</h3>
            {c.illustration_url ? <img src={c.illustration_url} alt="" style={{ maxWidth: "100%" }} /> : null}
            <ul>
              {(c.body_steps || []).slice(0, 6).map((s, i) => (
                <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
