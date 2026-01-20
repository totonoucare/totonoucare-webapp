"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsub = null;

    (async () => {
      try {
        setError("");

        if (!supabase) {
          setSession(null);
          return;
        }

        // ✅ 5秒で諦めてUIを進める（固まらない）
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          "getSession timeout"
        );

        setSession(data.session || null);

        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
          setSession(newSession);
        });
        unsub = sub?.subscription;
      } catch (e) {
        console.error(e);
        setError(`セッション取得に失敗: ${e?.message || String(e)}`);
        setSession(null);
      } finally {
        // ✅ 何があっても読み込み解除
        setLoading(false);
      }
    })();

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch {}
    };
  }, []);

  async function logout() {
    try {
      if (!supabase) return;
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e) {
      console.error(e);
      alert("ログアウトに失敗しました");
    }
  }

  return (
    <div className="card">
      <h1>ととのうケアナビ（Web版）</h1>
      <p className="small">体質チェック → 結果 → 登録（マジックリンク）→ ケアガイド まで。</p>

      <hr />

      {loading ? (
        <p className="small">読み込み中…</p>
      ) : error ? (
        <div className="card">
          <div className="small" style={{ marginBottom: 8 }}>
            {error}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn" href="/debug/env">debug/envを見る</a>
            <button className="btn" onClick={() => window.location.reload()}>
              リロード
            </button>
          </div>
        </div>
      ) : session ? (
        <div className="card">
          <div className="small">ログイン中</div>
          <div style={{ fontWeight: 700 }}>{session.user?.email}</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn primary" href="/guide">ケアガイドへ</a>
            <a className="btn" href="/check">体質チェック（再）</a>
            <a className="btn" href="/history">履歴一覧</a>
            <button className="btn" onClick={logout}>ログアウト</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="small">未ログイン</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn primary" href="/check">体質チェックを開始</a>
            <a className="btn" href="/signup">ログイン / 登録</a>
            <a className="btn" href="/guide">ガイドを見る（ログイン必須）</a>
          </div>
        </div>
      )}

      <hr />

      <p className="small">※ 現在はプロトタイプです。ガイド内容・保存データ・権限設計は順次アップデートします。</p>
    </div>
  );
}
