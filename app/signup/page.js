"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const resultId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    return url.searchParams.get("result") || "";
  }, []);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });

  async function handleSendLink(e) {
    e.preventDefault();
    setStatus({ state: "loading", message: "送信中…" });

    try {
      const origin = window.location.origin;

      // マジックリンクを踏んだ後に戻る先（ここが超重要）
      const emailRedirectTo = resultId
        ? `${origin}/auth/callback?result=${encodeURIComponent(resultId)}`
        : `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo
        }
      });

      if (error) throw error;

      setStatus({
        state: "sent",
        message:
          "マジックリンクを送信しました。受信したメールのリンクを開いてください（迷惑メールも確認）。"
      });
    } catch (err) {
      console.error(err);
      setStatus({
        state: "error",
        message: "送信に失敗しました: " + (err?.message || JSON.stringify(err))
      });
    }
  }

  return (
    <div className="card">
      <h1>無料登録（マジックリンク）</h1>
      <p className="small">
        入力したメールアドレスにログイン用リンクを送ります。パスワード不要です。
      </p>

      {resultId ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="small">引き継ぐ結果ID</div>
          <div style={{ fontWeight: 700 }}>{resultId}</div>
        </div>
      ) : (
        <div className="small" style={{ marginTop: 12 }}>
          ※ 結果IDなしの通常登録も可能です
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

      <div className="small">
        受信したリンクを開くとログイン完了→ケアガイドへ移動します。
      </div>
    </div>
  );
}
