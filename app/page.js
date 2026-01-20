"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoading(false);
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

  return (
    <div className="card">
      <h1>ととのうケアナビ（Web版）</h1>
      <p className="small">
        体質チェック → 結果 → 登録（マジックリンク）→ ケアガイド まで。
      </p>

      <hr />

      {loading ? (
        <p className="small">読み込み中…</p>
      ) : session ? (
        <div className="card">
          <div className="small">ログイン中</div>
          <div style={{ fontWeight: 700 }}>{session.user?.email}</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn primary" href="/guide">
              ケアガイドへ
            </a>
            <a className="btn" href="/check">
              体質チェック
            </a>
            <button className="btn" onClick={logout}>
              ログアウト
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="small">未ログイン</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn primary" href="/check">
              体質チェックを開始
            </a>
            <a className="btn" href="/signup">
              ログイン / 登録
            </a>
            <a className="btn" href="/guide">
              ガイドを見る（ログイン必須）
            </a>
          </div>
        </div>
      )}

      <hr />

      <p className="small">
        ※ 現在はプロトタイプです。ガイド内容・保存データ・権限設計は順次アップデートします。
      </p>
    </div>
  );
}
