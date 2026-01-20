"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const resultId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    return url.searchParams.get("result") || "";
  }, []);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [session, setSession] = useState(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
    })();
  }, []);

  async function handleSendLink(e) {
    e.preventDefault();
    setStatus({ state: "loading", message: "送信中…" });

    if (!supabase) {
      setStatus({
        state: "error",
        message:
          "Supabaseが初期化できていません（環境変数が反映されてない可能性）。",
      });
      return;
    }

    try {
      const origin = window.location.origin;

      const emailRedirectTo = resultId
        ? `${origin}/auth/callback?result=${encodeURIComponent(resultId)}`
        : `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });

      if (error) throw error;

      setStatus({
        state: "sent",
        message:
          "マジックリンクを送信しました。受信メールのリンクを開いてログインしてください（迷惑メールも確認）。",
      });
    } catch (err) {
      console.error(err);
      setStatus({
        state: "error",
        message: "送信に失敗しました: " + (err?.message || JSON.stringify(err)),
      });
    }
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="card">
      <h1>ログイン / 登録（マジックリンク）</h1>
      <p className="small">
        パスワード不要。メールに届くリンクを開くだけでログインできます。
      </p>

      {session ? (
        <>
          <hr />
          <div className="card">
            <div className="small">すでにログイン中</div>
            <div style={{ fontWeight: 700 }}>{session.user?.email}</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <a className="btn primary" href={resultId ? `/guide?result=${encodeURIComponent(resultId)}` : "/guide"}>
                ケアガイドへ
              </a>
              <button className="btn" onClick={logout}>
                ログアウト
              </button>
            </div>
          </div>
          <hr />
          <a className="btn" href="/">
            トップへ戻る
          </a>
        </>
      ) : (
        <>
          {resultId ? (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="small">引き継ぐ結果ID</div>
              <div style={{ fontWeight: 700 }}>{resultId}</div>
            </div>
          ) : (
            <div className="small" style={{ marginTop: 12 }}>
              ※ 結果IDなしの通常ログインも可能です
            </div>
          )}

          <hr />

          <form onSubmit={handleSendLink}>
            <div className="label">メールアドレス</div>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status.state === "loading" || status.state === "sent"}
            />

            <div style={{ marginTop: 16 }}>
              <button
                className="btn primary"
                type="submit"
                disabled={status.state === "loading" || status.state === "sent"}
              >
                マジックリンクを送る
              </button>
            </div>

            {status.message ? (
              <div className="small" style={{ marginTop: 10 }}>
                {status.message}
              </div>
            ) : null}
          </form>

          <hr />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn" href="/">
              トップへ戻る
            </a>
            <a className="btn" href="/check">
              体質チェックへ
            </a>
          </div>
        </>
      )}
    </div>
  );
}
