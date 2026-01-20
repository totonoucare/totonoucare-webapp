"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HistoryPage() {
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setMsg("Supabaseが初期化できていません（環境変数未反映）。");
          setLoading(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        const s = data.session || null;
        setSession(s);

        if (!s) {
          setLoading(false);
          return;
        }

        const userId = s.user?.id;
        const res = await fetch(`/api/assessments/list?user_id=${encodeURIComponent(userId)}&limit=50`);
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setMsg(json?.error || "履歴の取得に失敗しました。");
          setLoading(false);
          return;
        }

        setRows(Array.isArray(json?.data) ? json.data : []);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setMsg("読み込み中にエラーが発生しました。");
        setLoading(false);
      }
    })();

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });
      return () => sub?.subscription?.unsubscribe?.();
    }
  }, []);

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="card">
        <h1>履歴</h1>
        <p className="small">読み込み中…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card">
        <h1>履歴</h1>
        <p className="small">履歴はログイン後に利用できます。</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <a className="btn primary" href="/signup">ログイン / 登録</a>
          <a className="btn" href="/check">体質チェックへ</a>
          <a className="btn" href="/">トップへ</a>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>履歴</h1>
      <p className="small">ログイン中：{session.user?.email}</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <a className="btn primary" href="/check">新しくチェックする</a>
        <a className="btn" href="/guide">ケアガイド</a>
        <a className="btn" href="/">トップ</a>
        <button className="btn" onClick={logout}>ログアウト</button>
      </div>

      <hr />

      {msg ? <p className="small">{msg}</p> : null}

      {rows.length === 0 ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>まだ履歴がありません</h2>
          <p className="small">体質チェックを行うと、ここに記録が残ります。</p>
          <a className="btn primary" href="/check">体質チェックへ</a>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => {
            const payload = r.payload || {};
            const type = payload.type || r.result_type || "（不明）";
            const symptom = payload?.answers?.symptom || r.symptom || "（未選択）";
            const created = r.created_at ? new Date(r.created_at).toLocaleString("ja-JP") : "—";

            return (
              <div className="card" key={r.id}>
                <div className="small">作成日時：{created}</div>
                <div style={{ fontWeight: 700, marginTop: 6 }}>
                  {type} / {symptom}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <a className="btn primary" href={`/guide?result=${encodeURIComponent(r.id)}`}>
                    この結果でガイドを見る
                  </a>
                  <a className="btn" href={`/result/${encodeURIComponent(r.id)}`}>
                    結果を見る
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
